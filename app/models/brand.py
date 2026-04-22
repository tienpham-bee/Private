import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_name: Mapped[str] = mapped_column(String(255))
    app_store_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    play_store_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tone_of_voice: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(Text)
    brand_guidelines: Mapped[dict] = mapped_column(JSON, default=dict)
    hashtags: Mapped[list] = mapped_column(JSON, default=list)
    sample_posts: Mapped[list] = mapped_column(JSON, default=list)
    system_prompt_override: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
