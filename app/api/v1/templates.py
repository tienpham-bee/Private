import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content_template import ContentTemplate
from app.schemas.content_template import (
    ContentTemplateCreate,
    ContentTemplateResponse,
    ContentTemplateUpdate,
)

router = APIRouter()


@router.post("/templates", response_model=ContentTemplateResponse, status_code=201)
async def create_template(data: ContentTemplateCreate, db: AsyncSession = Depends(get_db)):
    # TODO: get created_by from auth context
    template = ContentTemplate(**data.model_dump(), created_by=uuid.uuid4())
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/templates", response_model=list[ContentTemplateResponse])
async def list_templates(
    content_type: str | None = None,
    platform: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentTemplate).where(ContentTemplate.is_active == True)
    if content_type:
        query = query.where(ContentTemplate.content_type == content_type)
    if platform:
        query = query.where(
            (ContentTemplate.platform == platform) | (ContentTemplate.platform.is_(None))
        )
    result = await db.execute(query.order_by(ContentTemplate.created_at.desc()))
    return result.scalars().all()


@router.get("/templates/{template_id}", response_model=ContentTemplateResponse)
async def get_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    template = await db.get(ContentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu")
    return template


@router.patch("/templates/{template_id}", response_model=ContentTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: ContentTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(ContentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    template = await db.get(ContentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu")
    template.is_active = False
    await db.commit()
