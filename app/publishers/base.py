from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx

from app.models.platform_account import PlatformAccount


@dataclass
class PlatformPostResult:
    success: bool
    platform_post_id: str | None = None
    error_message: str | None = None
    raw_response: dict | None = None


class BasePublisher(ABC):
    def __init__(self, account: PlatformAccount, http_client: httpx.AsyncClient):
        self.account = account
        self.http = http_client

    @abstractmethod
    async def publish_text_post(self, text: str, hashtags: list[str]) -> PlatformPostResult:
        ...

    @abstractmethod
    async def publish_image_post(
        self, image_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        ...

    @abstractmethod
    async def publish_video(
        self, video_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        ...

    async def refresh_token_if_needed(self) -> None:
        """Override in subclass to implement token refresh logic."""
        pass
