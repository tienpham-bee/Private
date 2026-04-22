import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import ContentPiece, ContentStatus
from app.models.publish_log import PublishLog

router = APIRouter()


@router.post("/publish/{content_id}", status_code=202)
async def publish_now(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status not in (ContentStatus.APPROVED, ContentStatus.SCHEDULED):
        raise HTTPException(
            status_code=400, detail="Content must be approved or scheduled to publish"
        )

    # TODO: dispatch Celery task for immediate publishing
    return {"message": "Publishing triggered", "content_id": str(content_id)}


@router.post("/publish/retry/{content_id}", status_code=202)
async def retry_publish(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.FAILED:
        raise HTTPException(status_code=400, detail="Only failed content can be retried")

    # TODO: dispatch Celery task for retry
    return {"message": "Retry triggered", "content_id": str(content_id)}


@router.get("/publish/logs")
async def get_publish_logs(
    content_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(PublishLog)
    if content_id:
        query = query.where(PublishLog.content_id == content_id)
    if status:
        query = query.where(PublishLog.status == status)

    query = query.order_by(PublishLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()
