# Pydantic-схемы категорий заведений.

from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    id: int
    label: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)