# API endpoints профиля пользователя.
# Файл отвечает за получение профиля, обновление данных профиля
# и получение статистики пользователя.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.profile import (
    ProfileResponse,
    ProfileStatsResponse,
    ProfileUpdateRequest,
    ChangePasswordRequest,
)

from app.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/api/v1/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileResponse)
def get_profile_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=ProfileResponse)
def update_profile_me(
    request: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.name is not None:
        current_user.name = request.name

    if request.city is not None:
        current_user.city = request.city

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/stats", response_model=ProfileStatsResponse)
def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    restaurants_count = db.query(Restaurant).count()

    favorites_count = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .count()
    )

    top_restaurants_count = (
        db.query(Restaurant)
        .filter(Restaurant.rating >= 4.5)
        .count()
    )

    return ProfileStatsResponse(
        restaurants_count=restaurants_count,
        favorites_count=favorites_count,
        top_restaurants_count=top_restaurants_count,
    )

@router.patch("/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. проверка текущего пароля
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )

    # 2. НОВАЯ ПРОВЕРКА (добавляем)
    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен отличаться от текущего",
        )

    # 3. обновление пароля
    current_user.password_hash = get_password_hash(data.new_password)

    db.add(current_user)
    db.commit()

    return {"message": "Пароль обновлён"}