import asyncio
import logging

from app.publishers.base import BasePublisher, PlatformPostResult

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


class InstagramPublisher(BasePublisher):
    @property
    def ig_user_id(self) -> str:
        return self.account.platform_user_id

    @property
    def token(self) -> str:
        return self.account.access_token

    async def _create_container(self, params: dict) -> dict:
        resp = await self.http.post(
            f"{GRAPH_API_BASE}/{self.ig_user_id}/media",
            params={"access_token": self.token},
            data=params,
        )
        return resp.json()

    async def _publish_container(self, container_id: str) -> dict:
        resp = await self.http.post(
            f"{GRAPH_API_BASE}/{self.ig_user_id}/media_publish",
            params={"access_token": self.token},
            data={"creation_id": container_id},
        )
        return resp.json()

    async def _wait_for_container(self, container_id: str, max_wait: int = 60) -> bool:
        for _ in range(max_wait // 5):
            resp = await self.http.get(
                f"{GRAPH_API_BASE}/{container_id}",
                params={"fields": "status_code", "access_token": self.token},
            )
            data = resp.json()
            status = data.get("status_code")
            if status == "FINISHED":
                return True
            if status == "ERROR":
                return False
            await asyncio.sleep(5)
        return False

    async def publish_text_post(self, text: str, hashtags: list[str]) -> PlatformPostResult:
        # Instagram doesn't support text-only posts
        return PlatformPostResult(
            success=False,
            error_message="Instagram does not support text-only posts",
        )

    async def publish_image_post(
        self, image_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        container = await self._create_container({
            "image_url": image_url,
            "caption": full_caption,
        })

        if "id" not in container:
            return PlatformPostResult(
                success=False,
                error_message=container.get("error", {}).get("message", str(container)),
                raw_response=container,
            )

        result = await self._publish_container(container["id"])
        if "id" in result:
            return PlatformPostResult(
                success=True, platform_post_id=result["id"], raw_response=result
            )
        return PlatformPostResult(
            success=False,
            error_message=result.get("error", {}).get("message", str(result)),
            raw_response=result,
        )

    async def publish_video(
        self, video_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        container = await self._create_container({
            "media_type": "REELS",
            "video_url": video_url,
            "caption": full_caption,
        })

        if "id" not in container:
            return PlatformPostResult(
                success=False,
                error_message=container.get("error", {}).get("message", str(container)),
                raw_response=container,
            )

        # Wait for video processing
        ready = await self._wait_for_container(container["id"])
        if not ready:
            return PlatformPostResult(
                success=False, error_message="Video processing timed out"
            )

        result = await self._publish_container(container["id"])
        if "id" in result:
            return PlatformPostResult(
                success=True, platform_post_id=result["id"], raw_response=result
            )
        return PlatformPostResult(
            success=False,
            error_message=result.get("error", {}).get("message", str(result)),
            raw_response=result,
        )
