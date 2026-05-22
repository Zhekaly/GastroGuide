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


class AdminMeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    city: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
