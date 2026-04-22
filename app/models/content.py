import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContentType(str, enum.Enum):
    SOCIAL_POST = "social_post"
    VIDEO_SCRIPT = "video_script"
    IMAGE_AD = "image_ad"
    CAPTION = "caption"
    GOOGLE_APP_ASSET = "google_app_asset"


class ContentStatus(str, enum.Enum):
    GENERATING = "generating"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"


class ContentPiece(Base):
    __tablename__ = "content_pieces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    content_type: Mapped[ContentType] = mapped_column(String(50))
    platform: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[ContentStatus] = mapped_column(
        String(50), default=ContentStatus.GENERATING, index=True
    )

    # Text content
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hashtags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Video script
    script_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Image/banner
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("content_templates.id"), nullable=True
    )
    template_params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    rendered_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Media attachments
    media_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # A/B testing
    variant_group: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True, index=True)
    variant_label: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Generation metadata
    prompt_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    generation_params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
