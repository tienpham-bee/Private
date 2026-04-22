import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content import ContentPiece, ContentStatus, ContentType
from app.models.content_plan import ContentPlan, ContentPlanItem, ContentPlanItemStatus
from app.models.generation_conversation import (
    GenerationConversation,
    GenerationMessage,
    MessageRole,
)
from app.schemas.content import ContentResponse
from app.schemas.generation import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatResponse,
    InteractiveGenerateResponse,
)
from app.services.interactive_generator import interactive_generator

router = APIRouter()


class QuickGenerateRequest(BaseModel):
    platform: str
    content_type: str
    topic: str
    description: str | None = None
    brand_id: uuid.UUID | None = None
    campaign_id: uuid.UUID | None = None
    plan_item_id: uuid.UUID | None = None


@router.post("/generate/quick", response_model=InteractiveGenerateResponse)
async def quick_generate(data: QuickGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate content directly via Claude without needing a plan item in DB."""
    # Load brand: try specified brand_id → campaign's brand → first brand in DB
    brand = None
    if data.brand_id:
        brand = await db.get(BrandProfile, data.brand_id)
    if brand is None and data.campaign_id:
        campaign = await db.get(Campaign, data.campaign_id)
        if campaign:
            brand = await db.get(BrandProfile, campaign.brand_id)
    if brand is None:
        result = await db.execute(select(BrandProfile).limit(1))
        brand = result.scalar_one_or_none()
    if brand is None:
        raise HTTPException(
            status_code=400,
            detail="Chưa có thương hiệu nào trong hệ thống. Vui lòng tạo Brand Profile trước."
        )

    piece, conversation = await interactive_generator.generate_quick(
        db=db,
        platform=data.platform,
        content_type=data.content_type,
        topic=data.topic,
        description=data.description,
        brand=brand,
        campaign_id=data.campaign_id,
    )

    # Link to plan item if provided
    if data.plan_item_id:
        plan_item = await db.get(ContentPlanItem, data.plan_item_id)
        if plan_item:
            plan_item.content_piece_id = piece.id
            plan_item.status = ContentPlanItemStatus.GENERATED
            await db.commit()
            await db.refresh(piece)

    msg_query = (
        select(GenerationMessage)
        .where(
            GenerationMessage.conversation_id == conversation.id,
            GenerationMessage.role != MessageRole.SYSTEM,
        )
        .order_by(GenerationMessage.created_at)
    )
    messages = (await db.execute(msg_query)).scalars().all()

    return InteractiveGenerateResponse(
        content_piece=ContentResponse.model_validate(piece),
        conversation_id=conversation.id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )


@router.post("/plan-items/{item_id}/generate", response_model=InteractiveGenerateResponse)
async def generate_for_plan_item(
    item_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    item = await db.get(ContentPlanItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục kế hoạch")

    # Load plan → campaign → brand
    plan = await db.get(ContentPlan, item.plan_id)
    campaign = await db.get(Campaign, plan.campaign_id)
    brand = await db.get(BrandProfile, campaign.brand_id)

    # Generate
    piece, conversation = await interactive_generator.generate_for_plan_item(
        db, item, campaign, brand
    )

    # Load messages
    msg_query = (
        select(GenerationMessage)
        .where(
            GenerationMessage.conversation_id == conversation.id,
            GenerationMessage.role != MessageRole.SYSTEM,
        )
        .order_by(GenerationMessage.created_at)
    )
    messages = (await db.execute(msg_query)).scalars().all()

    return InteractiveGenerateResponse(
        content_piece=ContentResponse.model_validate(piece),
        conversation_id=conversation.id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )


@router.get("/content/{content_id}/conversation")
async def get_conversation(content_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    query = select(GenerationConversation).where(
        GenerationConversation.content_piece_id == content_id,
        GenerationConversation.is_active == True,
    )
    conversation = (await db.execute(query)).scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

    msg_query = (
        select(GenerationMessage)
        .where(
            GenerationMessage.conversation_id == conversation.id,
            GenerationMessage.role != MessageRole.SYSTEM,
        )
        .order_by(GenerationMessage.created_at)
    )
    messages = (await db.execute(msg_query)).scalars().all()

    return {
        "conversation_id": conversation.id,
        "messages": [ChatMessageResponse.model_validate(m) for m in messages],
    }


@router.post("/content/{content_id}/chat", response_model=ChatResponse)
async def chat_refine(
    content_id: uuid.UUID,
    data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    piece = await db.get(ContentPiece, content_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung")

    piece, assistant_msg = await interactive_generator.chat_refine(
        db, piece, data.message
    )

    return ChatResponse(
        content_piece=ContentResponse.model_validate(piece),
        message=ChatMessageResponse.model_validate(assistant_msg),
    )


@router.post("/content/{content_id}/approve-interactive", response_model=ContentResponse)
async def approve_interactive(
    content_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    piece = await db.get(ContentPiece, content_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung")

    piece.status = ContentStatus.APPROVED

    # Also update plan item if linked
    query = select(ContentPlanItem).where(ContentPlanItem.content_piece_id == content_id)
    plan_item = (await db.execute(query)).scalar_one_or_none()
    if plan_item:
        plan_item.status = ContentPlanItemStatus.APPROVED

    await db.commit()
    await db.refresh(piece)
    return piece


@router.post("/content/{content_id}/regenerate-fresh", response_model=InteractiveGenerateResponse)
async def regenerate_fresh(
    content_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    piece = await db.get(ContentPiece, content_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung")

    # Find plan item
    query = select(ContentPlanItem).where(ContentPlanItem.content_piece_id == content_id)
    plan_item = (await db.execute(query)).scalar_one_or_none()
    if not plan_item:
        raise HTTPException(status_code=400, detail="Nội dung không liên kết với kế hoạch")

    # Deactivate old conversation
    conv_query = select(GenerationConversation).where(
        GenerationConversation.content_piece_id == content_id,
        GenerationConversation.is_active == True,
    )
    old_conv = (await db.execute(conv_query)).scalar_one_or_none()
    if old_conv:
        old_conv.is_active = False

    # Unlink old content
    plan_item.content_piece_id = None
    plan_item.status = ContentPlanItemStatus.PENDING
    await db.flush()

    # Load context
    plan = await db.get(ContentPlan, plan_item.plan_id)
    campaign = await db.get(Campaign, plan.campaign_id)
    brand = await db.get(BrandProfile, campaign.brand_id)

    # Regenerate
    new_piece, conversation = await interactive_generator.generate_for_plan_item(
        db, plan_item, campaign, brand
    )

    # Load messages
    msg_query = (
        select(GenerationMessage)
        .where(
            GenerationMessage.conversation_id == conversation.id,
            GenerationMessage.role != MessageRole.SYSTEM,
        )
        .order_by(GenerationMessage.created_at)
    )
    messages = (await db.execute(msg_query)).scalars().all()

    return InteractiveGenerateResponse(
        content_piece=ContentResponse.model_validate(new_piece),
        conversation_id=conversation.id,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )
