import uuid
from datetime import datetime

from pydantic import BaseModel


class ImageGenerateRequest(BaseModel):
    prompt: str
    campaign_id: uuid.UUID | None = None
    content_piece_id: uuid.UUID | None = None
    model: str = "gemini-3.1-flash-image-preview"


class ImageAssetResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID | None
    content_piece_id: uuid.UUID | None
    prompt: str
    model: str
    file_path: str
    file_url: str
    file_size: int | None
    width: int | None
    height: int | None
    mime_type: str
    extra_data: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
