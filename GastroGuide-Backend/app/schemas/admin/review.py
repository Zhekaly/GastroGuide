# Pydantic-схемы admin модерации отзывов.

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminReviewItem(BaseModel):
    id: int
    restaurant_id: int
    restaurant_name: str | None
    user_id: int | None
    author_name: str | None
    rating: int
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
