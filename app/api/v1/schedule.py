import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import ContentPiece, ContentStatus
from app.models.schedule import ScheduleEntry
from app.schemas.schedule import ScheduleCreateRequest, ScheduleResponse, ScheduleUpdateRequest

router = APIRouter()


@router.get("/schedule/calendar", response_model=list[ScheduleResponse])
async def get_calendar(
    start: date = Query(...),
    end: date = Query(...),
    platform: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ScheduleEntry).where(
        ScheduleEntry.scheduled_at >= datetime.combine(start, datetime.min.time()),
        ScheduleEntry.scheduled_at <= datetime.combine(end, datetime.max.time()),
    )
    if platform:
        query = query.join(ContentPiece).where(ContentPiece.platform == platform)

    result = await db.execute(query.order_by(ScheduleEntry.scheduled_at))
    return result.scalars().all()


@router.post("/schedule", response_model=ScheduleResponse, status_code=201)
async def create_schedule(data: ScheduleCreateRequest, db: AsyncSession = Depends(get_db)):
    content = await db.get(ContentPiece, data.content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.status != ContentStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Content must be approved before scheduling")

    entry = ScheduleEntry(**data.model_dump())
    db.add(entry)
    content.status = ContentStatus.SCHEDULED
    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/schedule/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: uuid.UUID,
    data: ScheduleUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(ScheduleEntry, schedule_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/schedule/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    entry = await db.get(ScheduleEntry, schedule_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    content = await db.get(ContentPiece, entry.content_id)
    if content:
        content.status = ContentStatus.APPROVED

    await db.delete(entry)
    await db.commit()
