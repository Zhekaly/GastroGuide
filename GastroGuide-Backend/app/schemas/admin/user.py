# Pydantic-схемы admin управления пользователями.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserListItem(BaseModel):
    id: int
    name: str
    email: EmailStr
    city: str
    role: str
    is_active: bool
    favorites_count: int = 0
    reviews_count: int = 0
    ai_sessions_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, pattern="^(user|admin)$")
    is_active: bool | None = None
