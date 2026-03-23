# Pydantic-схемы для заведений и меню.
# Используются для валидации и сериализации данных ресторанов,
# которые backend отправляет во frontend.

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MenuItemResponse(BaseModel):
    id: int
    restaurantId: int = Field(validation_alias="restaurant_id")
    name: str
    price: str
    emoji: str
    popular: bool

    model_config = ConfigDict(from_attributes=True)


class RestaurantResponse(BaseModel):
    id: int
    name: str
    type: str
    emoji: str
    color: str
    tag: str
    rating: float
    reviews: int
    dist: str
    time: str
    price: str
    open: bool
    address: str
    phone: str
    description: str
    hours: str
    lat: float
    lng: float
    features: list[str]
    photos: list[str]

    priceRange: int = Field(validation_alias="price_range")
    createdAt: datetime = Field(validation_alias="created_at")
    updatedAt: datetime = Field(validation_alias="updated_at")

    menu: list[MenuItemResponse] = []

    category_id: int | None = None

    model_config = ConfigDict(from_attributes=True)

class RestaurantShortResponse(BaseModel):
    id: int
    name: str
    type: str
    rating: float | None
    dist: str | None

    model_config = ConfigDict(from_attributes=True)