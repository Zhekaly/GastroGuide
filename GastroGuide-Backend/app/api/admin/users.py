# Admin управление пользователями: список, блокировка, смена роли.

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin, log_admin_action
from app.core.database import get_db
from app.models.ai_chat_session import AIChatSession
from app.models.favorite import Favorite
from app.models.review import Review
from app.models.user import User
from app.schemas.admin.common import MessageResponse, PaginatedResponse
from app.schemas.admin.user import AdminUserListItem, AdminUserUpdateRequest


router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin · Users"])


def _build_user_item(user: User, favorites: int, reviews: int, sessions: int) -> AdminUserListItem:
    return AdminUserListItem(
        id=user.id,
        name=user.name,
        email=user.email,
        city=user.city,
        role=user.role,
        is_active=user.is_active,
        favorites_count=favorites,
        reviews_count=reviews,
        ai_sessions_count=sessions,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=PaginatedResponse[AdminUserListItem])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    q: str | None = Query(default=None),
    role: str | None = Query(default=None, pattern="^(user|admin)$"),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active.is_(is_active))

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    user_ids = [u.id for u in users]
    if not user_ids:
        return PaginatedResponse[AdminUserListItem].build(items=[], total=total, page=page, page_size=page_size)

    fav_counts = dict(
        db.query(Favorite.user_id, func.count(Favorite.id))
        .filter(Favorite.user_id.in_(user_ids))
        .group_by(Favorite.user_id)
        .all()
    )
    rev_counts = dict(
        db.query(Review.user_id, func.count(Review.id))
        .filter(Review.user_id.in_(user_ids))
        .group_by(Review.user_id)
        .all()
    )
    sess_counts = dict(
        db.query(AIChatSession.user_id, func.count(AIChatSession.id))
        .filter(AIChatSession.user_id.in_(user_ids))
        .group_by(AIChatSession.user_id)
        .all()
    )

    items = [
        _build_user_item(
            u,
            fav_counts.get(u.id, 0),
            rev_counts.get(u.id, 0),
            sess_counts.get(u.id, 0),
        )
        for u in users
    ]

    return PaginatedResponse[AdminUserListItem].build(
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/{user_id}", response_model=AdminUserListItem)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    favorites = db.query(func.count(Favorite.id)).filter(Favorite.user_id == user_id).scalar() or 0
    reviews = db.query(func.count(Review.id)).filter(Review.user_id == user_id).scalar() or 0
    sessions = db.query(func.count(AIChatSession.id)).filter(AIChatSession.user_id == user_id).scalar() or 0

    return _build_user_item(user, favorites, reviews, sessions)


@router.patch("/{user_id}", response_model=AdminUserListItem)
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and payload.role and payload.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Нельзя забрать у себя роль admin",
        )
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Нельзя заблокировать самого себя",
        )

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(user, field, value)

    db.add(user)
    db.flush()
    log_admin_action(
        db, admin,
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        description=f"Обновлён пользователь '{user.email}'",
        payload={"changed": list(updates.keys())},
    )
    db.commit()
    db.refresh(user)

    favorites = db.query(func.count(Favorite.id)).filter(Favorite.user_id == user_id).scalar() or 0
    reviews = db.query(func.count(Review.id)).filter(Review.user_id == user_id).scalar() or 0
    sessions = db.query(func.count(AIChatSession.id)).filter(AIChatSession.user_id == user_id).scalar() or 0

    return _build_user_item(user, favorites, reviews, sessions)


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    email = user.email
    db.delete(user)
    db.flush()
    log_admin_action(
        db, admin,
        action="user.delete",
        entity_type="user",
        entity_id=user_id,
        description=f"Удалён пользователь '{email}'",
    )
    db.commit()
    return MessageResponse(message=f"User '{email}' deleted")
