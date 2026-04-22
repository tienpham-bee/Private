from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "ai_marketing",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "publish-due-content": {
        "task": "app.workers.publish_tasks.publish_due_content",
        "schedule": 60.0,
    },
    "collect-analytics": {
        "task": "app.workers.analytics_tasks.collect_all_metrics",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    "refresh-expiring-tokens": {
        "task": "app.workers.publish_tasks.refresh_expiring_tokens",
        "schedule": crontab(minute=0, hour=3),
    },
}

celery_app.autodiscover_tasks(["app.workers"])
