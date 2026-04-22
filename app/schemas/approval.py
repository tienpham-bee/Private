import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.approval import ApprovalAction


class ApproveRequest(BaseModel):
    reviewer_id: uuid.UUID


class RejectRequest(BaseModel):
    reviewer_id: uuid.UUID
    feedback: str


class RevisionRequest(BaseModel):
    reviewer_id: uuid.UUID
    feedback: str


class EditAndApproveRequest(BaseModel):
    reviewer_id: uuid.UUID
    edited_body_text: str


class ApprovalRecordResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    reviewer_id: uuid.UUID
    action: ApprovalAction
    feedback: str | None
    edited_body_text: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
