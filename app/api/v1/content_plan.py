import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content_plan import (
    ContentPlan,
    ContentPlanItem,
    ContentPlanStatus,
)
from app.schemas.content_plan import (
    ContentPlanItemCreate,
    ContentPlanItemResponse,
    ContentPlanItemUpdate,
    ContentPlanResponse,
)
from app.services.content_plan_generator import content_plan_generator

router = APIRouter()


async def _get_plan_with_items(
    campaign_id: uuid.UUID, db: AsyncSession
) -> ContentPlanResponse:
    query = select(ContentPlan).where(ContentPlan.campaign_id == campaign_id)
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Chưa có kế hoạch cho chiến dịch này")

    items_query = (
        select(ContentPlanItem)
        .where(ContentPlanItem.plan_id == plan.id)
        .order_by(ContentPlanItem.order_index)
    )
    items = (await db.execute(items_query)).scalars().all()

    return ContentPlanResponse(
        id=plan.id,
        campaign_id=plan.campaign_id,
        status=plan.status,
        ai_reasoning=plan.ai_reasoning,
        phases=plan.phases,
        items=[ContentPlanItemResponse.model_validate(item) for item in items],
        created_at=plan.created_at,
    )


@router.post("/campaigns/{campaign_id}/generate-plan", response_model=ContentPlanResponse)
async def generate_plan(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch")

    brand = await db.get(BrandProfile, campaign.brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy thương hiệu")

    await content_plan_generator.generate_plan(db, campaign, brand)
    return await _get_plan_with_items(campaign_id, db)


@router.get("/campaigns/{campaign_id}/plan", response_model=ContentPlanResponse)
async def get_plan(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_plan_with_items(campaign_id, db)


@router.patch("/campaigns/{campaign_id}/plan", response_model=ContentPlanResponse)
async def confirm_plan(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(ContentPlan).where(ContentPlan.campaign_id == campaign_id)
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Chưa có kế hoạch")

    plan.status = ContentPlanStatus.CONFIRMED
    await db.commit()
    return await _get_plan_with_items(campaign_id, db)


@router.post(
    "/campaigns/{campaign_id}/plan/items",
    response_model=ContentPlanItemResponse,
    status_code=201,
)
async def add_plan_item(
    campaign_id: uuid.UUID,
    data: ContentPlanItemCreate,
    db: AsyncSession = Depends(get_db),
):
    query = select(ContentPlan).where(ContentPlan.campaign_id == campaign_id)
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Chưa có kế hoạch")

    # Get max order_index
    max_query = (
        select(ContentPlanItem.order_index)
        .where(ContentPlanItem.plan_id == plan.id)
        .order_by(ContentPlanItem.order_index.desc())
        .limit(1)
    )
    max_idx = (await db.execute(max_query)).scalar() or -1

    item = ContentPlanItem(
        plan_id=plan.id,
        order_index=max_idx + 1,
        **data.model_dump(),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/plan-items/{item_id}", response_model=ContentPlanItemResponse)
async def update_plan_item(
    item_id: uuid.UUID,
    data: ContentPlanItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(ContentPlanItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/plan-items/{item_id}", status_code=204)
async def delete_plan_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    item = await db.get(ContentPlanItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục")
    await db.delete(item)
    await db.commit()
