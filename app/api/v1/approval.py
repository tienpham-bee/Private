import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.approval import ApprovalAction, ApprovalRecord
from app.models.content import ContentPiece, ContentStatus
from app.schemas.approval import (
    ApprovalRecordResponse,
    ApproveRequest,
    EditAndApproveRequest,
    RejectRequest,
    RevisionRequest,
)
from app.schemas.content import ContentResponse

router = APIRouter()


@router.get("/approval/queue", response_model=list[ContentResponse])
async def get_approval_queue(
    platform: str | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentPiece).where(
        ContentPiece.status == ContentStatus.PENDING_REVIEW
    )
    if platform:
        query = query.where(ContentPiece.platform == platform)

    query = query.order_by(ContentPiece.created_at.asc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/approval/{content_id}/approve", response_model=ContentResponse)
async def approve_content(
    content_id: uuid.UUID,
    data: ApproveRequest,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Content is not pending review")

    record = ApprovalRecord(
        content_id=content_id,
        reviewer_id=data.reviewer_id,
        action=ApprovalAction.APPROVED,
    )
    db.add(record)
    content.status = ContentStatus.APPROVED
    await db.commit()
    await db.refresh(content)
    return content


@router.post("/approval/{content_id}/reject", response_model=ContentResponse)
async def reject_content(
    content_id: uuid.UUID,
    data: RejectRequest,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Content is not pending review")

    record = ApprovalRecord(
        content_id=content_id,
        reviewer_id=data.reviewer_id,
        action=ApprovalAction.REJECTED,
        feedback=data.feedback,
    )
    db.add(record)
    content.status = ContentStatus.REJECTED
    await db.commit()
    await db.refresh(content)
    return content


@router.post("/approval/{content_id}/request-revision", response_model=ContentResponse)
async def request_revision(
    content_id: uuid.UUID,
    data: RevisionRequest,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Content is not pending review")

    record = ApprovalRecord(
        content_id=content_id,
        reviewer_id=data.reviewer_id,
        action=ApprovalAction.REVISION_REQUESTED,
        feedback=data.feedback,
    )
    db.add(record)
    content.status = ContentStatus.REVISION_REQUESTED
    await db.commit()
    await db.refresh(content)

    # TODO: dispatch Celery task for regeneration with feedback
    return content


@router.post("/approval/{content_id}/edit-and-approve", response_model=ContentResponse)
async def edit_and_approve(
    content_id: uuid.UUID,
    data: EditAndApproveRequest,
    db: AsyncSession = Depends(get_db),
):
    content = await db.get(ContentPiece, content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Content is not pending review")

    record = ApprovalRecord(
        content_id=content_id,
        reviewer_id=data.reviewer_id,
        action=ApprovalAction.EDITED,
        edited_body_text=data.edited_body_text,
    )
    db.add(record)
    content.body_text = data.edited_body_text
    content.status = ContentStatus.APPROVED
    await db.commit()
    await db.refresh(content)
    return content


@router.get("/approval/{content_id}/history", response_model=list[ApprovalRecordResponse])
async def get_approval_history(
    content_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ApprovalRecord)
        .where(ApprovalRecord.content_id == content_id)
        .order_by(ApprovalRecord.created_at.desc())
    )
    return result.scalars().all()
