import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content_pieces.id"), unique=True)
    platform_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("platform_accounts.id")
    )
    scheduled_at: Mapped[datetime] = mapped_column(index=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
