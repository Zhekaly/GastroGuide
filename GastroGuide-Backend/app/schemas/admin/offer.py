# Pydantic-схемы admin CRUD для акций.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminOfferCreate(BaseModel):
    restaurant_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=500)
    discount: str | None = Field(default=None, max_length=50)
    expires: str = Field(..., min_length=1, max_length=50)
    emoji: str = Field(default="🎁", max_length=20)
    color: str = Field(default="#E8420A", max_length=20)
    active: bool = True


class AdminOfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    discount: str | None = Field(default=None, max_length=50)
    expires: str | None = Field(default=None, min_length=1, max_length=50)
    emoji: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=20)
    active: bool | None = None


class AdminOfferResponse(BaseModel):
    id: int
    restaurant_id: int
    restaurant_name: str | None = None
    title: str
    description: str
    discount: str | None = None
    expires: str
    emoji: str
    color: str
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
