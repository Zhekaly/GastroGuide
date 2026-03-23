# Pydantic-схемы для акций заведений.
# Используются для валидации и возврата данных по offers.

from pydantic import BaseModel, ConfigDict, Field


class OfferResponse(BaseModel):
    id: int
    restaurantId: int = Field(validation_alias="restaurant_id")
    title: str
    description: str
    discount: str
    expires: str
    emoji: str
    color: str

    model_config = ConfigDict(from_attributes=True)