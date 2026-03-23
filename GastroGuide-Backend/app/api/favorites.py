# API endpoints для работы с избранными заведениями пользователя.
# Файл отвечает за получение списка избранного,
# добавление ресторана в избранное и удаление из избранного.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.favorite import FavoriteResponse
from app.schemas.restaurant import RestaurantShortResponse

router = APIRouter(prefix="/api/v1/favorites", tags=["Favorites"])


@router.get("", response_model=list[RestaurantShortResponse])
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    favorites = (
        db.query(Restaurant)
        .join(Favorite, Favorite.restaurant_id == Restaurant.id)
        .filter(Favorite.user_id == current_user.id)
        .all()
    )

    return favorites


@router.post("/{restaurant_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    existing_favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user.id,
            Favorite.restaurant_id == restaurant_id,
        )
        .first()
    )

    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant already in favorites",
        )

    favorite = Favorite(
        user_id=current_user.id,
        restaurant_id=restaurant_id,
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return favorite


@router.delete("/{restaurant_id}")
def remove_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user.id,
            Favorite.restaurant_id == restaurant_id,
        )
        .first()
    )

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    db.delete(favorite)
    db.commit()

    return {"deleted": True}