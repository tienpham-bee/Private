import uuid
from datetime import datetime

from pydantic import BaseModel


class BrandCreate(BaseModel):
    game_name: str
    app_store_url: str | None = None
    play_store_url: str | None = None
    tone_of_voice: str
    target_audience: str
    brand_guidelines: dict = {}
    hashtags: list[str] = []
    sample_posts: list[str] = []
    system_prompt_override: str | None = None


class BrandUpdate(BaseModel):
    game_name: str | None = None
    app_store_url: str | None = None
    play_store_url: str | None = None
    tone_of_voice: str | None = None
    target_audience: str | None = None
    brand_guidelines: dict | None = None
    hashtags: list[str] | None = None
    sample_posts: list[str] | None = None
    system_prompt_override: str | None = None


class BrandResponse(BaseModel):
    id: uuid.UUID
    game_name: str
    app_store_url: str | None
    play_store_url: str | None
    tone_of_voice: str
    target_audience: str
    brand_guidelines: dict
    hashtags: list
    sample_posts: list
    system_prompt_override: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
