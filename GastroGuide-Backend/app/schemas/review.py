# Pydantic-схемы для отзывов.
# Используются для создания, обновления
# и возврата отзывов по ресторанам.

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=3, max_length=1000)

class ReviewUpdateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=3, max_length=1000)


class ReviewResponse(BaseModel):
    id: int
    restaurant_id: int
    user_id: int | None
    author_name: str | None
    rating: int
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)