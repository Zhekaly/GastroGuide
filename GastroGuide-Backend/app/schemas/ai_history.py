# Pydantic-схемы для истории AI-сессий и сообщений.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AIChatSessionCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class AIChatSessionResponse(BaseModel):
    id: UUID
    user_id: int
    title: str
    preview: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIChatMessageResponse(BaseModel):
    id: int
    session_id: UUID
    role: str
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)