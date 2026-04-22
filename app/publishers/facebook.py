import logging

from app.publishers.base import BasePublisher, PlatformPostResult

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


class FacebookPublisher(BasePublisher):
    @property
    def page_id(self) -> str:
        return self.account.platform_user_id

    @property
    def token(self) -> str:
        return self.account.access_token

    async def publish_text_post(self, text: str, hashtags: list[str]) -> PlatformPostResult:
        full_text = text
        if hashtags:
            full_text += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        resp = await self.http.post(
            f"{GRAPH_API_BASE}/{self.page_id}/feed",
            params={"access_token": self.token},
            data={"message": full_text},
        )
        data = resp.json()

        if resp.status_code == 200 and "id" in data:
            return PlatformPostResult(
                success=True, platform_post_id=data["id"], raw_response=data
            )
        return PlatformPostResult(
            success=False,
            error_message=data.get("error", {}).get("message", str(data)),
            raw_response=data,
        )

    async def publish_image_post(
        self, image_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        resp = await self.http.post(
            f"{GRAPH_API_BASE}/{self.page_id}/photos",
            params={"access_token": self.token},
            data={"url": image_url, "message": full_caption},
        )
        data = resp.json()

        if resp.status_code == 200 and "id" in data:
            return PlatformPostResult(
                success=True, platform_post_id=data["id"], raw_response=data
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
            full_caption += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        resp = await self.http.post(
            f"{GRAPH_API_BASE}/{self.page_id}/videos",
            params={"access_token": self.token},
            data={"file_url": video_url, "description": full_caption},
        )
        data = resp.json()

        if resp.status_code == 200 and "id" in data:
            return PlatformPostResult(
                success=True, platform_post_id=data["id"], raw_response=data
            )
        return PlatformPostResult(
            success=False,
            error_message=data.get("error", {}).get("message", str(data)),
            raw_response=data,
        )
