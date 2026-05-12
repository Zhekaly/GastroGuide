# Pydantic-схемы admin аналитики AI.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AdminAISessionItem(BaseModel):
    id: UUID
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    title: str
    preview: str | None
    message_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAIMessageItem(BaseModel):
    id: int
    session_id: UUID
    role: str
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminAITopPrompt(BaseModel):
    text: str
    count: int


class AdminAIAnalyticsResponse(BaseModel):
    total_sessions: int
    empty_sessions: int
    total_messages: int
    user_messages: int
    ai_messages: int
    top_prompts: list[AdminAITopPrompt]
