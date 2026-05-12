# Admin системные операции:
# - детектирование "битых" ресторанов
# - просмотр activity log
# - глобальный поиск
# - пересчёт всех рейтингов

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin, log_admin_action
from app.core.database import engine, get_db
from app.core.db_maintenance import sync_id_sequences
from app.models.activity_log import ActivityLog
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User
from app.models.ai_chat_session import AIChatSession
from app.schemas.admin.common import MessageResponse, PaginatedResponse
from app.schemas.admin.system import (
    AdminActivityLogItem,
    BrokenRestaurantIssue,
)
from app.services.opening_hours_service import parse_hours_range
from app.services.rating_service import recalculate_all_restaurants


router = APIRouter(prefix="/api/v1/admin/system", tags=["Admin · System"])


@router.get("/broken-restaurants", response_model=list[BrokenRestaurantIssue])
def detect_broken_restaurants(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    restaurants = db.query(Restaurant).all()
    results: list[BrokenRestaurantIssue] = []

    for restaurant in restaurants:
        issues: list[str] = []

        if restaurant.lat is None or restaurant.lng is None:
            issues.append("missing_coordinates")

        if not restaurant.photos:
            issues.append("missing_photos")

        if not restaurant.description or not restaurant.description.strip():
            issues.append("empty_description")

        menu_exists = (
            db.query(MenuItem.id).filter(MenuItem.restaurant_id == restaurant.id).first()
        )
        if not menu_exists:
            issues.append("missing_menu")

        has_dynamic_hours = (
            restaurant.is_24_7
            or (restaurant.opens_at is not None and restaurant.closes_at is not None)
        )
        if not has_dynamic_hours:
            parsed = parse_hours_range(restaurant.hours or "")
            if parsed is None:
                issues.append("invalid_working_hours")

        if issues:
            results.append(
                BrokenRestaurantIssue(
                    restaurant_id=restaurant.id,
                    restaurant_name=restaurant.name,
                    issues=issues,
                )
            )

    return results


@router.post("/recalculate-all-ratings", response_model=MessageResponse)
def recalculate_all(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    affected = recalculate_all_restaurants(db)
    db.commit()
    return MessageResponse(message=f"Пересчитано рейтингов: {affected}")


@router.post("/reset-sequences")
def reset_sequences(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Сбрасывает PostgreSQL sequences к COALESCE(MAX(id), 1) для всех таблиц
    с auto-increment колонкой `id`. Применять после ручного импорта данных,
    когда вставляли строки с явным id и счётчик отстал.
    """
    result = sync_id_sequences(engine)

    log_admin_action(
        db=db,
        admin=admin,
        action="system.reset_sequences",
        entity_type="system",
        description="Reset PostgreSQL id sequences",
        payload={"result": result},
    )
    db.commit()

    return {
        "message": "Sequences synchronized",
        "result": result,
    }


@router.get("/activity-log", response_model=PaginatedResponse[AdminActivityLogItem])
def activity_log(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
):
    query = db.query(ActivityLog, User.name.label("admin_name")).outerjoin(
        User, User.id == ActivityLog.admin_id
    )

    if action:
        query = query.filter(ActivityLog.action == action)

    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)

    total = query.count()

    rows = (
        query.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AdminActivityLogItem(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=admin_name,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            description=log.description,
            payload=log.payload,
            created_at=log.created_at,
        )
        for log, admin_name in rows
    ]
    return PaginatedResponse[AdminActivityLogItem].build(
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    like = f"%{q}%"

    restaurants = (
        db.query(Restaurant.id, Restaurant.name, Restaurant.type)
        .filter(or_(Restaurant.name.ilike(like), Restaurant.type.ilike(like)))
        .limit(20)
        .all()
    )

    users = (
        db.query(User.id, User.name, User.email)
        .filter(or_(User.name.ilike(like), User.email.ilike(like)))
        .limit(20)
        .all()
    )

    reviews = (
        db.query(Review.id, Review.restaurant_id, Review.rating, Review.text)
        .filter(or_(Review.text.ilike(like), Review.author_name.ilike(like)))
        .limit(20)
        .all()
    )

    menu_items = (
        db.query(MenuItem.id, MenuItem.restaurant_id, MenuItem.name)
        .filter(MenuItem.name.ilike(like))
        .limit(20)
        .all()
    )

    sessions = (
        db.query(AIChatSession.id, AIChatSession.user_id, AIChatSession.title)
        .filter(AIChatSession.title.ilike(like))
        .limit(20)
        .all()
    )

    return {
        "restaurants": [
            {"id": r.id, "name": r.name, "type": r.type} for r in restaurants
        ],
        "users": [{"id": u.id, "name": u.name, "email": u.email} for u in users],
        "reviews": [
            {
                "id": rv.id,
                "restaurant_id": rv.restaurant_id,
                "rating": rv.rating,
                "text": rv.text[:120],
            }
            for rv in reviews
        ],
        "menu_items": [
            {"id": m.id, "restaurant_id": m.restaurant_id, "name": m.name}
            for m in menu_items
        ],
        "ai_sessions": [
            {"id": str(s.id), "user_id": s.user_id, "title": s.title}
            for s in sessions
        ],
    }
