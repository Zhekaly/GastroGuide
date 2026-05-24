# Admin CRUD для пунктов меню.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.admin.deps import (
    check_restaurant_access,
    get_current_admin_or_moderator,
    log_admin_action,
)
from app.core.database import get_db
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.admin.common import MessageResponse
from app.schemas.admin.menu import (
    AdminMenuItemCreate,
    AdminMenuItemResponse,
    AdminMenuItemUpdate,
)


router = APIRouter(prefix="/api/v1/admin/menu-items", tags=["Admin · Menu"])


def _ensure_restaurant(db: Session, restaurant_id: int) -> Restaurant:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


@router.get("", response_model=list[AdminMenuItemResponse])
def list_menu_items(
    restaurant_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    query = db.query(MenuItem)

    if restaurant_id is not None:
        check_restaurant_access(actor, restaurant_id)
        query = query.filter(MenuItem.restaurant_id == restaurant_id)
    elif actor.is_moderator:
        moderated_ids = [r.id for r in actor.moderated_restaurants]
        if not moderated_ids:
            return []
        query = query.filter(MenuItem.restaurant_id.in_(moderated_ids))

    items = query.order_by(
        MenuItem.restaurant_id.asc(),
        MenuItem.sort_order.asc(),
        MenuItem.id.asc(),
    ).all()
    return [AdminMenuItemResponse.model_validate(m) for m in items]


@router.post("", response_model=AdminMenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    payload: AdminMenuItemCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    check_restaurant_access(actor, payload.restaurant_id)
    restaurant = _ensure_restaurant(db, payload.restaurant_id)

    item = MenuItem(
        restaurant_id=restaurant.id,
        name=payload.name,
        price=payload.price,
        emoji=payload.emoji,
        image_url=payload.image_url,
        popular=payload.popular,
        sort_order=payload.sort_order,
    )
    db.add(item)
    db.flush()

    log_admin_action(
        db, actor,
        action="menu.create",
        entity_type="menu_item",
        entity_id=item.id,
        description=f"Добавлено блюдо '{item.name}' в '{restaurant.name}'",
    )
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=AdminMenuItemResponse)
def update_menu_item(
    item_id: int,
    payload: AdminMenuItemUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    check_restaurant_access(actor, item.restaurant_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)

    db.add(item)
    db.flush()
    log_admin_action(
        db, actor,
        action="menu.update",
        entity_type="menu_item",
        entity_id=item.id,
        description=f"Обновлено блюдо '{item.name}'",
        payload={"changed": list(updates.keys())},
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", response_model=MessageResponse)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    check_restaurant_access(actor, item.restaurant_id)

    name = item.name
    db.delete(item)
    db.flush()
    log_admin_action(
        db, actor,
        action="menu.delete",
        entity_type="menu_item",
        entity_id=item_id,
        description=f"Удалено блюдо '{name}'",
    )
    db.commit()
    return MessageResponse(message=f"Menu item '{name}' deleted")
