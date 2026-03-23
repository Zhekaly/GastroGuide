# Pydantic-схемы для AI-чата.
# Описывают входящее сообщение пользователя,
# историю диалога, координаты и ответ AI.

from pydantic import BaseModel, Field
from typing import Literal
from uuid import UUID


class AIMessage(BaseModel):
    role: Literal["user", "ai"]
    text: str


class AIRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list[AIMessage] = []
    session_id: UUID | None = None

    lat: float | None = None
    lng: float | None = None
    radius: int = Field(default=2000, ge=1, le=10000)


class AIResponse(BaseModel):
    response: str