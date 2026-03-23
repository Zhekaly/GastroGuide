# Pydantic-схемы профиля пользователя.
# Используются для получения профиля, обновления данных
# и возврата статистики пользователя.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    city: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    city: str | None = Field(default=None, min_length=2, max_length=100)

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class ProfileStatsResponse(BaseModel):
    restaurants_count: int
    favorites_count: int
    top_restaurants_count: int