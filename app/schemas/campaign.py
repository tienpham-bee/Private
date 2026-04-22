import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.campaign import CampaignStatus


class CampaignCreate(BaseModel):
    brand_id: uuid.UUID
    name: str
    description: str | None = None
    target_platforms: list[str]
    content_types: list[str]
    start_date: date
    end_date: date
    posting_frequency: dict | None = None
    ab_test_enabled: bool = False
    variations_per_piece: int = 1
    objectives: list[str] | None = None
    key_message: str | None = None
    product_highlights: list[str] | None = None
    ai_instructions: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: CampaignStatus | None = None
    target_platforms: list[str] | None = None
    content_types: list[str] | None = None
    start_date: date | None = None
    end_date: date | None = None
    posting_frequency: dict | None = None
    ab_test_enabled: bool | None = None
    variations_per_piece: int | None = None
    objectives: list[str] | None = None
    key_message: str | None = None
    product_highlights: list[str] | None = None
    ai_instructions: str | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    brand_id: uuid.UUID
    name: str
    description: str | None
    status: CampaignStatus
    target_platforms: list
    content_types: list
    start_date: date
    end_date: date
    posting_frequency: dict | None
    ab_test_enabled: bool
    variations_per_piece: int
    objectives: list | None
    key_message: str | None
    product_highlights: list | None
    ai_instructions: str | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
