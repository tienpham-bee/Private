import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.models.content import ContentType


class ContentPlanStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ContentPlanItemStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    APPROVED = "approved"
    SKIPPED = "skipped"


class ContentPlan(Base):
    __tablename__ = "content_plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), unique=True)
    status: Mapped[ContentPlanStatus] = mapped_column(
        String(50), default=ContentPlanStatus.DRAFT
    )
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phases: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class ContentPlanItem(Base):
    __tablename__ = "content_plan_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content_plans.id"), index=True)
    order_index: Mapped[int] = mapped_column(default=0)
    phase: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    platform: Mapped[str] = mapped_column(String(50))
    content_type: Mapped[ContentType] = mapped_column(String(50))
    topic: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("content_templates.id"), nullable=True
    )
    status: Mapped[ContentPlanItemStatus] = mapped_column(
        String(50), default=ContentPlanItemStatus.PENDING
    )
    content_piece_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("content_pieces.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    @validates("suggested_date")
    def coerce_suggested_date(self, key: str, value: object) -> Optional[date]:
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None
        return value