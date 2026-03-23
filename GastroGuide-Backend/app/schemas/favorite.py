# Pydantic-схемы для избранных заведений пользователя.

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)