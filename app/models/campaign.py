import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brand_profiles.id"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CampaignStatus] = mapped_column(String(50), default=CampaignStatus.DRAFT)
    target_platforms: Mapped[list] = mapped_column(JSON, default=list)
    content_types: Mapped[list] = mapped_column(JSON, default=list)
    start_date: Mapped[date]
    end_date: Mapped[date]
    posting_frequency: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ab_test_enabled: Mapped[bool] = mapped_column(default=False)
    variations_per_piece: Mapped[int] = mapped_column(default=1)
    # Brief fields
    objectives: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    key_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_highlights: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
