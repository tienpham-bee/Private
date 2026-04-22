import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.content import ContentType


class ContentPlanItemCreate(BaseModel):
    phase: str | None = None
    platform: str
    content_type: ContentType
    topic: str
    description: str | None = None
    suggested_date: date | None = None
    template_id: uuid.UUID | None = None


class ContentPlanItemUpdate(BaseModel):
    topic: str | None = None
    description: str | None = None
    platform: str | None = None
    content_type: ContentType | None = None
    suggested_date: date | None = None
    template_id: uuid.UUID | None = None
    phase: str | None = None


class ContentPlanItemResponse(BaseModel):
    id: uuid.UUID
    order_index: int
    phase: str | None
    platform: str
    content_type: ContentType
    topic: str
    description: str | None
    suggested_date: date | None
    template_id: uuid.UUID | None
    status: str
    content_piece_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentPlanResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    status: str
    ai_reasoning: str | None
    phases: list[str] | None
    items: list[ContentPlanItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
