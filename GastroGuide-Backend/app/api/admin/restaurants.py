# Admin CRUD для ресторанов: создание, редактирование, скрытие, удаление, bulk-операции.

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import inspect as sa_inspect, or_
from sqlalchemy.orm import Session, selectinload

from app.api.admin.deps import (
    check_restaurant_access,
    get_current_admin,
    get_current_admin_or_moderator,
    log_admin_action,
)
from app.core.database import get_db
from app.models.category import Category
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.admin.common import PaginatedResponse, MessageResponse
from app.schemas.admin.restaurant import (
    AdminBulkActionRequest,
    AdminRestaurantCreate,
    AdminRestaurantListItem,
    AdminRestaurantResponse,
    AdminRestaurantUpdate,
)
from app.services.opening_hours_service import (
    apply_dynamic_open_status,
    apply_dynamic_open_status_to_restaurants,
)
from app.services.rating_service import recalculate_restaurant_rating


router = APIRouter(prefix="/api/v1/admin/restaurants", tags=["Admin · Restaurants"])


def _serialize_response(restaurant: Restaurant) -> AdminRestaurantResponse:
    apply_dynamic_open_status(restaurant)
    # Используем ORM-mapper, а не __table__.columns: у некоторых колонок Python-атрибут
    # отличается от имени в БД (например price_range ↔ "priceRange", created_at ↔ "createdAt").
    # column_attrs.key всегда даёт Python-имя.
    mapper = sa_inspect(Restaurant)
    payload: dict[str, Any] = {
        prop.key: getattr(restaurant, prop.key) for prop in mapper.column_attrs
    }
    payload["category_label"] = (
        restaurant.category.label if restaurant.category else None
    )
    payload["menu"] = sorted(restaurant.menu, key=lambda m: (m.sort_order, m.id))
    payload["open"] = restaurant.open
    return AdminRestaurantResponse.model_validate(payload)


@router.get("", response_model=PaginatedResponse[AdminRestaurantListItem])
def list_restaurants(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
    q: str | None = Query(default=None, description="Поиск по названию/типу/адресу"),
    category_id: int | None = Query(default=None),
    is_hidden: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
):
    query = db.query(Restaurant).options(selectinload(Restaurant.category))

    # Модератор видит только свои заведения.
    if actor.is_moderator:
        moderated_ids = [r.id for r in actor.moderated_restaurants]
        if not moderated_ids:
            return PaginatedResponse[AdminRestaurantListItem].build(
                items=[], total=0, page=page, page_size=page_size
            )
        query = query.filter(Restaurant.id.in_(moderated_ids))

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Restaurant.name.ilike(like),
                Restaurant.type.ilike(like),
                Restaurant.address.ilike(like),
                Restaurant.description.ilike(like),
            )
        )

    if category_id is not None:
        query = query.filter(Restaurant.category_id == category_id)

    if is_hidden is not None:
        query = query.filter(Restaurant.is_hidden.is_(is_hidden))

    total = query.count()

    restaurants = (
        query.order_by(Restaurant.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    apply_dynamic_open_status_to_restaurants(restaurants)

    items = [
        AdminRestaurantListItem.model_validate(
            {
                "id": r.id,
                "name": r.name,
                "type": r.type,
                "category_id": r.category_id,
                "category_label": r.category.label if r.category else None,
                "rating": r.rating,
                "reviews": r.reviews,
                "price": r.price,
                "is_hidden": r.is_hidden,
                "open": r.open,
                "lat": r.lat,
                "lng": r.lng,
                "photos": r.photos or [],
                "updated_at": r.updated_at,
            }
        )
        for r in restaurants
    ]

    return PaginatedResponse[AdminRestaurantListItem].build(
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/{restaurant_id}", response_model=AdminRestaurantResponse)
def get_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    check_restaurant_access(actor, restaurant_id)

    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant_id)
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    return _serialize_response(restaurant)


def _validate_category(db: Session, category_id: int | None) -> None:
    if category_id is None:
        return
    exists = db.query(Category.id).filter(Category.id == category_id).first()
    if not exists:
        raise HTTPException(status_code=400, detail=f"Category {category_id} not found")


@router.post("", response_model=AdminRestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    payload: AdminRestaurantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    _validate_category(db, payload.category_id)

    restaurant = Restaurant(
        name=payload.name,
        type=payload.type,
        category_id=payload.category_id,
        emoji=payload.emoji,
        color=payload.color,
        tag=payload.tag,
        rating=0.0,
        reviews=0,
        dist="0 м",
        time="0 мин",
        price=payload.price,
        open=True,
        is_hidden=payload.is_hidden,
        address=payload.address,
        phone=payload.phone,
        description=payload.description,
        hours=payload.hours,
        opens_at=payload.opens_at,
        closes_at=payload.closes_at,
        is_24_7=payload.is_24_7,
        lat=payload.lat,
        lng=payload.lng,
        features=payload.features,
        photos=payload.photos,
        price_range=payload.price_range,
    )

    db.add(restaurant)
    db.flush()

    log_admin_action(
        db, admin,
        action="restaurant.create",
        entity_type="restaurant",
        entity_id=restaurant.id,
        description=f"Создан ресторан '{restaurant.name}'",
    )

    db.commit()
    db.refresh(restaurant)

    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant.id)
        .first()
    )

    return _serialize_response(restaurant)


MODERATOR_FORBIDDEN_RESTAURANT_FIELDS = {"is_hidden", "category_id"}


@router.patch("/{restaurant_id}", response_model=AdminRestaurantResponse)
def update_restaurant(
    restaurant_id: int,
    payload: AdminRestaurantUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    check_restaurant_access(actor, restaurant_id)

    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant_id)
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    updates = payload.model_dump(exclude_unset=True, by_alias=False)

    if actor.is_moderator:
        forbidden = MODERATOR_FORBIDDEN_RESTAURANT_FIELDS & set(updates.keys())
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail=f"Модератор не может менять поля: {sorted(forbidden)}",
            )

    if "category_id" in updates:
        _validate_category(db, updates["category_id"])

    changed_fields: dict[str, Any] = {}

    for field, value in updates.items():
        target_field = "price_range" if field == "price_range" else field
        if getattr(restaurant, target_field) != value:
            changed_fields[target_field] = value
            setattr(restaurant, target_field, value)

    if not changed_fields:
        return _serialize_response(restaurant)

    db.add(restaurant)
    db.flush()

    log_admin_action(
        db, actor,
        action="restaurant.update",
        entity_type="restaurant",
        entity_id=restaurant.id,
        description=f"Обновлён ресторан '{restaurant.name}'",
        payload={"changed_fields": list(changed_fields.keys())},
    )

    db.commit()
    db.refresh(restaurant)

    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant.id)
        .first()
    )

    return _serialize_response(restaurant)


@router.post("/{restaurant_id}/toggle-visibility", response_model=AdminRestaurantResponse)
def toggle_visibility(
    restaurant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant_id)
        .first()
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant.is_hidden = not restaurant.is_hidden
    db.add(restaurant)

    log_admin_action(
        db, admin,
        action="restaurant.toggle_visibility",
        entity_type="restaurant",
        entity_id=restaurant.id,
        description=f"Ресторан '{restaurant.name}' теперь {'скрыт' if restaurant.is_hidden else 'виден'}",
        payload={"is_hidden": restaurant.is_hidden},
    )

    db.commit()
    db.refresh(restaurant)

    return _serialize_response(restaurant)


@router.delete("/{restaurant_id}", response_model=MessageResponse)
def delete_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    name = restaurant.name

    db.delete(restaurant)
    db.flush()

    log_admin_action(
        db, admin,
        action="restaurant.delete",
        entity_type="restaurant",
        entity_id=restaurant_id,
        description=f"Удалён ресторан '{name}'",
    )

    db.commit()

    return MessageResponse(message=f"Restaurant '{name}' deleted")


@router.post("/{restaurant_id}/recalculate-rating", response_model=AdminRestaurantResponse)
def recalculate_rating(
    restaurant_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    check_restaurant_access(actor, restaurant_id)

    restaurant = recalculate_restaurant_rating(db, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    log_admin_action(
        db, actor,
        action="restaurant.recalculate_rating",
        entity_type="restaurant",
        entity_id=restaurant_id,
        description=f"Пересчитан рейтинг ресторана '{restaurant.name}'",
        payload={"rating": restaurant.rating, "reviews": restaurant.reviews},
    )

    db.commit()

    restaurant = (
        db.query(Restaurant)
        .options(selectinload(Restaurant.menu), selectinload(Restaurant.category))
        .filter(Restaurant.id == restaurant_id)
        .first()
    )

    return _serialize_response(restaurant)


@router.post("/bulk", response_model=MessageResponse)
def bulk_action(
    request: AdminBulkActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    restaurants = (
        db.query(Restaurant).filter(Restaurant.id.in_(request.ids)).all()
    )

    affected = 0

    for restaurant in restaurants:
        if request.action == "hide":
            restaurant.is_hidden = True
        elif request.action == "show":
            restaurant.is_hidden = False
        elif request.action == "delete":
            db.delete(restaurant)
        elif request.action == "recalculate":
            recalculate_restaurant_rating(db, restaurant.id)
        else:
            continue
        affected += 1

    log_admin_action(
        db, admin,
        action=f"restaurant.bulk_{request.action}",
        entity_type="restaurant",
        description=f"Bulk {request.action} for {affected} restaurants",
        payload={"ids": request.ids, "affected": affected},
    )

    db.commit()
    return MessageResponse(message=f"{affected} restaurants affected by '{request.action}'")
