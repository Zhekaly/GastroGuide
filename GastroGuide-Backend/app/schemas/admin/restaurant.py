# Pydantic-схемы admin CRUD для ресторанов.

from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class AdminMenuItemPayload(BaseModel):
    id: int | None = None
    name: str = Field(..., min_length=1, max_length=255)
    price: str = Field(..., min_length=1, max_length=50)
    emoji: str = Field(default="🍽️", max_length=20)
    popular: bool = False
    sort_order: int = 0


class AdminRestaurantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., min_length=1, max_length=100)
    category_id: int | None = None

    emoji: str = Field(default="🍽️", max_length=20)
    color: str = Field(default="#E8420A", max_length=20)
    tag: str = Field(default="Ресторан", max_length=100)

    address: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=5000)

    hours: str = Field(..., min_length=1, max_length=100)
    opens_at: time | None = None
    closes_at: time | None = None
    is_24_7: bool = False

    lat: float
    lng: float

    price: str = Field(default="₸₸", max_length=20)
    price_range: int = Field(default=2, ge=1, le=4, alias="priceRange")

    features: list[str] = Field(default_factory=list)
    photos: list[str] = Field(default_factory=list)

    is_hidden: bool = False

    model_config = ConfigDict(populate_by_name=True)


class AdminRestaurantCreate(AdminRestaurantBase):
    pass


class AdminRestaurantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = Field(default=None, min_length=1, max_length=100)
    category_id: int | None = None

    emoji: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=20)
    tag: str | None = Field(default=None, max_length=100)

    address: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=1, max_length=5000)

    hours: str | None = Field(default=None, min_length=1, max_length=100)
    opens_at: time | None = None
    closes_at: time | None = None
    is_24_7: bool | None = None

    lat: float | None = None
    lng: float | None = None

    price: str | None = Field(default=None, max_length=20)
    price_range: int | None = Field(default=None, ge=1, le=4, alias="priceRange")

    features: list[str] | None = None
    photos: list[str] | None = None

    is_hidden: bool | None = None

    model_config = ConfigDict(populate_by_name=True)


class AdminRestaurantMenuItemResponse(BaseModel):
    id: int
    name: str
    price: str
    emoji: str
    popular: bool
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class AdminRestaurantResponse(BaseModel):
    id: int
    name: str
    type: str
    category_id: int | None
    category_label: str | None = None

    emoji: str
    color: str
    tag: str

    address: str
    phone: str
    description: str

    hours: str
    opens_at: time | None = None
    closes_at: time | None = None
    is_24_7: bool

    lat: float
    lng: float

    rating: float
    reviews: int

    price: str
    price_range: int = Field(serialization_alias="priceRange")

    features: list[str]
    photos: list[str]

    is_hidden: bool
    open: bool

    menu: list[AdminRestaurantMenuItemResponse] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AdminRestaurantListItem(BaseModel):
    id: int
    name: str
    type: str
    category_id: int | None
    category_label: str | None = None
    rating: float
    reviews: int
    price: str
    is_hidden: bool
    open: bool
    lat: float
    lng: float
    photos: list[str]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminBulkActionRequest(BaseModel):
    ids: list[int]
    action: str = Field(..., pattern="^(hide|show|delete|recalculate)$")
