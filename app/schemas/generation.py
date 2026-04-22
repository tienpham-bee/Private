import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.content import ContentResponse


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    content_snapshot: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InteractiveGenerateResponse(BaseModel):
    content_piece: ContentResponse
    conversation_id: uuid.UUID
    messages: list[ChatMessageResponse]


class ChatResponse(BaseModel):
    content_piece: ContentResponse
    message: ChatMessageResponse
