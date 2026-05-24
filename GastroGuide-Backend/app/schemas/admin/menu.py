# Pydantic-схемы admin CRUD для пунктов меню.

from pydantic import BaseModel, ConfigDict, Field


class AdminMenuItemCreate(BaseModel):
    restaurant_id: int
    name: str = Field(..., min_length=1, max_length=255)
    price: str = Field(..., min_length=1, max_length=50)
    emoji: str = Field(default="🍽️", max_length=20)
    image_url: str | None = Field(default=None, max_length=500)
    popular: bool = False
    sort_order: int = 0


class AdminMenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: str | None = Field(default=None, min_length=1, max_length=50)
    emoji: str | None = Field(default=None, max_length=20)
    image_url: str | None = Field(default=None, max_length=500)
    popular: bool | None = None
    sort_order: int | None = None


class AdminMenuItemResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    price: str
    emoji: str
    image_url: str | None = None
    popular: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)
