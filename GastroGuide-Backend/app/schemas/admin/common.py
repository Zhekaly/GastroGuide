# Общие admin Pydantic-схемы: пагинация и стандартные ответы.

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        return cls(items=items, total=total, page=page, page_size=page_size)


class MessageResponse(BaseModel):
    message: str


class BulkIdsRequest(BaseModel):
    ids: list[int]
