# Pydantic-схемы аутентификации админ-панели.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class AdminTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AdminMeModeratorRestaurant(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class AdminMeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    city: str
    created_at: datetime
    is_admin: bool = False
    is_moderator: bool = False
    moderated_restaurants: list[AdminMeModeratorRestaurant] = []

    model_config = ConfigDict(from_attributes=True)
