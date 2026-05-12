# Pydantic-схемы admin CRUD для категорий.

from pydantic import BaseModel, ConfigDict, Field


class AdminCategoryCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=50)
    sort_order: int = 0


class AdminCategoryUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=50)
    sort_order: int | None = None


class AdminCategoryResponse(BaseModel):
    id: int
    label: str
    sort_order: int
    restaurants_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminCategoryReorderRequest(BaseModel):
    ordered_ids: list[int]
