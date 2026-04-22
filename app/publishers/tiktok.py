import asyncio
import logging

from app.publishers.base import BasePublisher, PlatformPostResult

logger = logging.getLogger(__name__)

TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"


class TikTokPublisher(BasePublisher):
    @property
    def token(self) -> str:
        return self.account.access_token

    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json; charset=UTF-8",
        }

    async def publish_text_post(self, text: str, hashtags: list[str]) -> PlatformPostResult:
        # TikTok doesn't support text-only posts
        return PlatformPostResult(
            success=False,
            error_message="TikTok does not support text-only posts",
        )

    async def publish_image_post(
        self, image_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += " " + " ".join(f"#{h}" for h in hashtags)

        resp = await self.http.post(
            f"{TIKTOK_API_BASE}/post/publish/content/init/",
            headers=self.headers,
            json={
                "post_info": {
                    "title": full_caption[:150],
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "photo_images": [image_url],
                },
                "post_mode": "DIRECT_POST",
                "media_type": "PHOTO",
            },
        )
        data = resp.json()

        if data.get("error", {}).get("code") == "ok":
            publish_id = data.get("data", {}).get("publish_id")
            return PlatformPostResult(
                success=True, platform_post_id=publish_id, raw_response=data
            )
        return PlatformPostResult(
            success=False,
            error_message=data.get("error", {}).get("message", str(data)),
            raw_response=data,
        )

    async def publish_video(
        self, video_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += " " + " ".join(f"#{h}" for h in hashtags)

        # Step 1: Init video upload
        resp = await self.http.post(
            f"{TIKTOK_API_BASE}/post/publish/video/init/",
            headers=self.headers,
            json={
                "post_info": {
                    "title": full_caption[:150],
                    "privacy_level": "PUBLIC_TO_EVERYONE",
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": video_url,
                },
            },
        )
        data = resp.json()

        if data.get("error", {}).get("code") != "ok":
            return PlatformPostResult(
                success=False,
                error_message=data.get("error", {}).get("message", str(data)),
                raw_response=data,
            )

        publish_id = data.get("data", {}).get("publish_id")

        # Step 2: Poll for completion
        for _ in range(24):  # max 2 minutes
            await asyncio.sleep(5)
            status_resp = await self.http.post(
                f"{TIKTOK_API_BASE}/post/publish/status/fetch/",
                headers=self.headers,
                json={"publish_id": publish_id},
            )
            status_data = status_resp.json()
            status = status_data.get("data", {}).get("status")

            if status == "PUBLISH_COMPLETE":
                return PlatformPostResult(
                    success=True,
                    platform_post_id=publish_id,
                    raw_response=status_data,
                )
            if status in ("FAILED", "PUBLISH_FAILED"):
                return PlatformPostResult(
                    success=False,
                    error_message=f"TikTok publish failed: {status}",
                    raw_response=status_data,
                )

        return PlatformPostResult(
            success=False,
            error_message="TikTok publish timed out",
            raw_response=None,
        )
