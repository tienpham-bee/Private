import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.content import ContentStatus, ContentType


class ContentGenerateRequest(BaseModel):
    content_type: ContentType
    platform: str
    num_variations: int = 1
    instructions: str | None = None


class ContentUpdateRequest(BaseModel):
    body_text: str | None = None
    hashtags: list[str] | None = None
    script_json: dict | None = None
    media_urls: list[str] | None = None


class ContentResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID | None
    content_type: ContentType
    platform: str
    status: ContentStatus
    body_text: str | None
    hashtags: list | None
    script_json: dict | None
    template_id: str | None
    rendered_image_url: str | None
    media_urls: list | None
    variant_group: uuid.UUID | None
    variant_label: str | None
    llm_model: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
