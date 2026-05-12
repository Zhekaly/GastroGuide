# Pydantic-схемы admin системных операций: broken-detection, activity log.

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class BrokenRestaurantIssue(BaseModel):
    restaurant_id: int
    restaurant_name: str
    issues: list[str]


class AdminActivityLogItem(BaseModel):
    id: int
    admin_id: int | None
    admin_name: str | None = None
    action: str
    entity_type: str
    entity_id: str | None
    description: str | None
    payload: dict[str, Any] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
