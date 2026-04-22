import logging
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content_plan import ContentPlan, ContentPlanItem, ContentPlanStatus
from app.models.content_template import ContentTemplate
from app.services.llm_client import LLMClient, llm_client

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
SYSTEM_PROMPT = (
    "You are an expert marketing strategist. "
    "Always respond with valid JSON only. No additional text outside the JSON."
)


class ContentPlanGenerator:
    def __init__(self, client: LLMClient | None = None):
        self.llm = client or llm_client
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(PROMPTS_DIR)),
            autoescape=False,
        )

    async def generate_plan(
        self,
        db: AsyncSession,
        campaign: Campaign,
        brand: BrandProfile,
    ) -> ContentPlan:
        # Load available templates for this campaign's content types and platforms
        query = select(ContentTemplate).where(
            ContentTemplate.is_active == True,
            ContentTemplate.content_type.in_(campaign.content_types),
        )
        result = await db.execute(query)
        templates = result.scalars().all()

        # Render prompt
        template = self.jinja_env.get_template("content_plan.txt")
        prompt = template.render(
            game_name=brand.game_name,
            tone_of_voice=brand.tone_of_voice,
            target_audience=brand.target_audience,
            brand_guidelines=brand.brand_guidelines,
            campaign_name=campaign.name,
            objectives=campaign.objectives,
            key_message=campaign.key_message,
            product_highlights=campaign.product_highlights,
            target_platforms=campaign.target_platforms,
            start_date=str(campaign.start_date),
            end_date=str(campaign.end_date),
            posting_frequency=campaign.posting_frequency,
            ai_instructions=campaign.ai_instructions,
            templates=[
                {
                    "id": str(t.id),
                    "name": t.name,
                    "content_type": t.content_type,
                    "platform": t.platform,
                    "description": t.description,
                }
                for t in templates
            ],
        )

        # Call LLM
        data = self.llm.generate_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=prompt,
            max_tokens=2000,
        )

        # Delete any existing plan for this campaign (regardless of status)
        existing_query = select(ContentPlan).where(
            ContentPlan.campaign_id == campaign.id,
        )
        existing = (await db.execute(existing_query)).scalar_one_or_none()
        if existing:
            old_items_query = select(ContentPlanItem).where(
                ContentPlanItem.plan_id == existing.id
            )
            old_items = (await db.execute(old_items_query)).scalars().all()
            for item in old_items:
                await db.delete(item)
            await db.flush()  # delete items first
            await db.delete(existing)
            await db.flush()  # then delete plan

        # Create plan
        plan = ContentPlan(
            campaign_id=campaign.id,
            status=ContentPlanStatus.DRAFT,
            ai_reasoning=data.get("reasoning"),
            phases=data.get("phases", []),
        )
        db.add(plan)
        await db.flush()

        # Create items
        items = data.get("items", [])
        for i, item_data in enumerate(items):
            template_id = item_data.get("template_id")
            if template_id == "null" or template_id is None:
                template_id = None

            raw_date = item_data.get("suggested_date")
            if isinstance(raw_date, str):
                try:
                    raw_date = date.fromisoformat(raw_date)
                except ValueError:
                    raw_date = None

            plan_item = ContentPlanItem(
                plan_id=plan.id,
                order_index=i,
                phase=item_data.get("phase"),
                platform=item_data.get("platform", "facebook"),
                content_type=item_data.get("content_type", "social_post"),
                topic=item_data.get("topic", ""),
                description=item_data.get("description"),
                suggested_date=raw_date,
                template_id=template_id,
            )
            db.add(plan_item)

        await db.commit()
        await db.refresh(plan)

        logger.info(
            "Generated content plan with %d items for campaign %s",
            len(items), campaign.id,
        )
        return plan


content_plan_generator = ContentPlanGenerator()
