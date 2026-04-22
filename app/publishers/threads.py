import logging

from app.publishers.base import BasePublisher, PlatformPostResult

logger = logging.getLogger(__name__)

THREADS_API_BASE = "https://graph.threads.net/v1.0"


class ThreadsPublisher(BasePublisher):
    @property
    def user_id(self) -> str:
        return self.account.platform_user_id

    @property
    def token(self) -> str:
        return self.account.access_token

    async def _create_container(self, params: dict) -> dict:
        resp = await self.http.post(
            f"{THREADS_API_BASE}/{self.user_id}/threads",
            params={"access_token": self.token},
            data=params,
        )
        return resp.json()

    async def _publish_container(self, container_id: str) -> dict:
        resp = await self.http.post(
            f"{THREADS_API_BASE}/{self.user_id}/threads_publish",
            params={"access_token": self.token},
            data={"creation_id": container_id},
        )
        return resp.json()

    async def publish_text_post(self, text: str, hashtags: list[str]) -> PlatformPostResult:
        full_text = text
        if hashtags:
            full_text += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        # Threads has 500 char limit
        if len(full_text) > 500:
            full_text = full_text[:497] + "..."

        container = await self._create_container({
            "media_type": "TEXT",
            "text": full_text,
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

    async def publish_image_post(
        self, image_url: str, caption: str, hashtags: list[str]
    ) -> PlatformPostResult:
        full_caption = caption
        if hashtags:
            full_caption += "\n\n" + " ".join(f"#{h}" for h in hashtags)

        container = await self._create_container({
            "media_type": "IMAGE",
            "image_url": image_url,
            "text": full_caption[:500],
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
            "media_type": "VIDEO",
            "video_url": video_url,
            "text": full_caption[:500],
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
