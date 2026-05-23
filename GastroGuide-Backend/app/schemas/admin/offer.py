# Pydantic-схемы admin CRUD для акций.

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Время суток в формате HH:MM (24h). Бизнес-логика: акции с дневным циклом
# (например, Happy Hour действует до 19:00 каждый день).
_TIME_HHMM = re.compile(r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
_TIME_ERROR = "Время должно быть в формате HH:MM, например 21:00"


def _validate_hhmm(value: str | None) -> str | None:
    if value is None:
        return value
    if not _TIME_HHMM.match(value):
        raise ValueError(_TIME_ERROR)
    return value


class AdminOfferCreate(BaseModel):
    restaurant_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=500)
    discount: str | None = Field(default=None, max_length=50)
    expires: str = Field(..., min_length=1, max_length=50)
    emoji: str = Field(default="🎁", max_length=20)
    color: str = Field(default="#E8420A", max_length=20)
    active: bool = True

    @field_validator("expires")
    @classmethod
    def _expires_format(cls, v: str) -> str:
        return _validate_hhmm(v)


class AdminOfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    discount: str | None = Field(default=None, max_length=50)
    expires: str | None = Field(default=None, min_length=1, max_length=50)
    emoji: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=20)
    active: bool | None = None

    @field_validator("expires")
    @classmethod
    def _expires_format(cls, v: str | None) -> str | None:
        return _validate_hhmm(v)


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
