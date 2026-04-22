import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import ContentPiece, ContentStatus, ContentType
from app.schemas.content import ContentResponse, ContentUpdateRequest

router = APIRouter()


@router.get("/content", response_model=list[ContentResponse])
async def list_content(
    campaign_id: uuid.UUID | None = None,
    status: ContentStatus | None = None,
    platform: str | None = None,
    content_type: ContentType | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentPiece)
    if campaign_id:
        query = query.where(ContentPiece.campaign_id == campaign_id)
    if status:
        query = query.where(ContentPiece.status == status)
    if platform:
        query = query.where(ContentPiece.platform == platform)
    if content_type:
        query = query.where(ContentPiece.content_type == content_type)

    query = query.order_by(ContentPiece.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/content/{content_id}", response_model=ContentResponse)
async def get_content(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.patch("/content/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: uuid.UUID,
    data: ContentUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(content, field, value)

    await db.commit()
    await db.refresh(content)
    return content


@router.post("/content/{content_id}/regenerate", status_code=202)
async def regenerate_content(
    content_id: uuid.UUID,
    feedback: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # TODO: dispatch Celery task for regeneration with feedback
    return {"message": "Regeneration triggered", "content_id": str(content_id)}
