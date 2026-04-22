import uuid
from datetime import datetime

from pydantic import BaseModel


class ScheduleCreateRequest(BaseModel):
    content_id: uuid.UUID
    platform_account_id: uuid.UUID
    scheduled_at: datetime
    timezone: str = "UTC"


class ScheduleUpdateRequest(BaseModel):
    scheduled_at: datetime | None = None
    timezone: str | None = None


class ScheduleResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    platform_account_id: uuid.UUID
    scheduled_at: datetime
    timezone: str
    published_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
