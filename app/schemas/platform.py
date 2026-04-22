import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.platform_account import PlatformEnum


class PlatformAccountCreate(BaseModel):
    platform: PlatformEnum
    account_name: str
    platform_user_id: str
    access_token: str
    refresh_token: str | None = None
    token_expires_at: datetime | None = None
    brand_id: uuid.UUID
    meta: dict | None = None


class PlatformAccountUpdate(BaseModel):
    account_name: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    token_expires_at: datetime | None = None
    is_active: bool | None = None
    meta: dict | None = None


class PlatformAccountResponse(BaseModel):
    id: uuid.UUID
    platform: PlatformEnum
    account_name: str
    platform_user_id: str
    brand_id: uuid.UUID
    is_active: bool
    token_expires_at: datetime | None
    meta: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
