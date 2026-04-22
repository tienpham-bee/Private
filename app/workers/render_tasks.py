import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models.content import ContentPiece
from app.models.content_template import ContentTemplate
from app.services.image_renderer import image_renderer
from app.services.s3_client import s3_client
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Sync engine for Celery workers (cannot use asyncpg)
_sync_url = settings.database_url.replace("+asyncpg", "+psycopg2")
_sync_engine = create_engine(_sync_url)
_SyncSession = sessionmaker(bind=_sync_engine)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def render_content_image(self, content_id: str):
    """Render image for a content piece and upload to S3."""
    try:
        with _SyncSession() as session:
            piece = session.get(ContentPiece, content_id)
            if not piece:
                logger.error("ContentPiece not found: %s", content_id)
                return

            if not piece.template_id:
                logger.warning("No template assigned for content %s", content_id)
                return

            template = session.get(ContentTemplate, piece.template_id)
            if not template:
                logger.error("Template not found: %s", piece.template_id)
                return

            params = piece.template_params or {}
            png_bytes = image_renderer.render(template.structure, params)

            url = s3_client.upload_image(
                png_bytes, str(piece.campaign_id), str(piece.id)
            )

            piece.rendered_image_url = url
            session.commit()

            logger.info(
                "Rendered image for content %s, URL: %s", content_id, url
            )

    except Exception as exc:
        logger.error("Render failed for content %s: %s", content_id, exc)
        raise self.retry(exc=exc)
