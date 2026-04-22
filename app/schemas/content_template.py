import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.content import ContentType


class TemplateSectionSchema(BaseModel):
    name: str
    description: str
    char_limit: int | None = None


class ContentTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    content_type: ContentType
    platform: str | None = None
    structure: dict
    example_output: str | None = None


class ContentTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    structure: dict | None = None
    example_output: str | None = None
    is_active: bool | None = None


class ContentTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    content_type: ContentType
    platform: str | None
    structure: dict
    example_output: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
