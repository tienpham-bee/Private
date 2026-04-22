import logging
import uuid

import boto3
from botocore.config import Config as BotoConfig

from app.config import settings

logger = logging.getLogger(__name__)


class S3Client:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                config=BotoConfig(signature_version="s3v4"),
            )
            # Ensure bucket exists
            try:
                self._client.head_bucket(Bucket=settings.s3_bucket_name)
            except Exception:
                try:
                    self._client.create_bucket(Bucket=settings.s3_bucket_name)
                    logger.info("Created S3 bucket: %s", settings.s3_bucket_name)
                except Exception as e:
                    logger.warning("Could not create bucket: %s", e)
        return self._client

    def upload_image(
        self,
        image_bytes: bytes,
        campaign_id: str | uuid.UUID,
        content_id: str | uuid.UUID,
        suffix: str = ".png",
    ) -> str:
        key = f"renders/{campaign_id}/{content_id}{suffix}"

        self.client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=image_bytes,
            ContentType="image/png",
        )

        url = f"{settings.s3_public_url}/{settings.s3_bucket_name}/{key}"
        logger.info("Uploaded image to S3: %s", url)
        return url

    def delete_image(
        self,
        campaign_id: str | uuid.UUID,
        content_id: str | uuid.UUID,
        suffix: str = ".png",
    ) -> None:
        key = f"renders/{campaign_id}/{content_id}{suffix}"
        self.client.delete_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
        )
        logger.info("Deleted image from S3: %s", key)


s3_client = S3Client()
