import httpx

from app.models.platform_account import PlatformAccount, PlatformEnum
from app.publishers.base import BasePublisher
from app.publishers.facebook import FacebookPublisher
from app.publishers.instagram import InstagramPublisher
from app.publishers.threads import ThreadsPublisher
from app.publishers.tiktok import TikTokPublisher

PUBLISHER_MAP: dict[PlatformEnum, type[BasePublisher]] = {
    PlatformEnum.FACEBOOK: FacebookPublisher,
    PlatformEnum.INSTAGRAM: InstagramPublisher,
    PlatformEnum.THREADS: ThreadsPublisher,
    PlatformEnum.TIKTOK: TikTokPublisher,
}


def get_publisher(
    platform: PlatformEnum,
    account: PlatformAccount,
    http_client: httpx.AsyncClient,
) -> BasePublisher:
    cls = PUBLISHER_MAP.get(platform)
    if not cls:
        raise ValueError(f"No publisher for platform: {platform}")
    return cls(account=account, http_client=http_client)
