# Pydantic-схемы admin управления пользователями.

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


UserRole = Literal["user", "admin", "moderator"]


class ModeratorRestaurantInfo(BaseModel):
    """Краткая инфо-сводка по заведению, которым управляет модератор."""

    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class AdminUserListItem(BaseModel):
    id: int
    name: str
    email: str
    city: str
    role: UserRole
    is_active: bool
    favorites_count: int = 0
    reviews_count: int = 0
    ai_sessions_count: int = 0
    moderated_restaurants: list[ModeratorRestaurantInfo] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(AdminUserListItem):
    """Полный ответ для карточки пользователя в админке."""

    pass


class AdminUserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None
    # None = не менять привязки; [] = убрать все; [1,2,3] = установить эти.
    moderated_restaurant_ids: list[int] | None = None
