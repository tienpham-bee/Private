import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PlatformEnum(str, enum.Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    THREADS = "threads"
    TIKTOK = "tiktok"
    GOOGLE_APP_CAMPAIGNS = "google_app_campaigns"


class PlatformAccount(Base):
    __tablename__ = "platform_accounts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    platform: Mapped[PlatformEnum] = mapped_column(String(50), index=True)
    account_name: Mapped[str] = mapped_column(String(255))
    platform_user_id: Mapped[str] = mapped_column(String(255))
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brand_profiles.id"))
    is_active: Mapped[bool] = mapped_column(default=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
