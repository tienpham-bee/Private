import logging
import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content import ContentPiece, ContentStatus, ContentType
from app.services.llm_client import LLMClient, llm_client

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

TEMPLATE_MAP = {
    ContentType.SOCIAL_POST: "social_post.txt",
    ContentType.VIDEO_SCRIPT: "video_script.txt",
    ContentType.IMAGE_AD: "ad_copy.txt",
    ContentType.CAPTION: "caption.txt",
}

SYSTEM_PROMPT = (
    "You are an expert marketing copywriter specializing in mobile game advertising. "
    "Always respond with valid JSON only. No additional text outside the JSON."
)


class ContentGenerator:
    def __init__(self, client: LLMClient | None = None):
        self.llm = client or llm_client
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(PROMPTS_DIR)),
            autoescape=False,
        )

    async def generate_content(
        self,
        db: AsyncSession,
        campaign: Campaign,
        brand: BrandProfile,
        content_type: ContentType,
        platform: str,
        num_variations: int = 1,
        instructions: str | None = None,
    ) -> list[ContentPiece]:
        template_file = TEMPLATE_MAP.get(content_type)
        if not template_file:
            raise ValueError(f"Unsupported content type: {content_type}")

        template = self.jinja_env.get_template(template_file)

        prompt = template.render(
            game_name=brand.game_name,
            tone_of_voice=brand.tone_of_voice,
            target_audience=brand.target_audience,
            brand_guidelines=brand.brand_guidelines,
            sample_posts=brand.sample_posts,
            platform=platform,
            campaign_description=campaign.description,
            num_variations=num_variations,
            instructions=instructions,
        )

        system = brand.system_prompt_override or SYSTEM_PROMPT

        # Choose model based on content complexity
        model = None
        if content_type == ContentType.VIDEO_SCRIPT:
            model = "claude-opus-4-6"

        result = self.llm.generate_json(
            system_prompt=system,
            user_prompt=prompt,
            model=model,
        )

        # Create content pieces from LLM response
        variant_group = uuid.uuid4() if num_variations > 1 else None
        pieces = []

        if content_type == ContentType.SOCIAL_POST:
            posts = result.get("posts", [])
            for i, post in enumerate(posts):
                piece = ContentPiece(
                    campaign_id=campaign.id,
                    content_type=content_type,
                    platform=platform,
                    status=ContentStatus.PENDING_REVIEW,
                    body_text=post.get("body_text", ""),
                    hashtags=post.get("hashtags", []),
                    variant_group=variant_group,
                    variant_label=chr(65 + i) if variant_group else None,
                    prompt_used=prompt,
                    llm_model=model or self.llm.default_model,
                )
                db.add(piece)
                pieces.append(piece)

        elif content_type == ContentType.VIDEO_SCRIPT:
            piece = ContentPiece(
                campaign_id=campaign.id,
                content_type=content_type,
                platform=platform,
                status=ContentStatus.PENDING_REVIEW,
                script_json=result,
                body_text=result.get("title", ""),
                prompt_used=prompt,
                llm_model=model or self.llm.default_model,
            )
            db.add(piece)
            pieces.append(piece)

        elif content_type == ContentType.IMAGE_AD:
            variations = result.get("variations", [])
            for i, variation in enumerate(variations):
                piece = ContentPiece(
                    campaign_id=campaign.id,
                    content_type=content_type,
                    platform=platform,
                    status=ContentStatus.PENDING_REVIEW,
                    body_text=variation.get("body_text", ""),
                    template_params=variation,
                    variant_group=variant_group,
                    variant_label=chr(65 + i) if variant_group else None,
                    prompt_used=prompt,
                    llm_model=model or self.llm.default_model,
                )
                db.add(piece)
                pieces.append(piece)

        elif content_type == ContentType.CAPTION:
            captions = result.get("captions", [])
            for i, caption in enumerate(captions):
                piece = ContentPiece(
                    campaign_id=campaign.id,
                    content_type=content_type,
                    platform=platform,
                    status=ContentStatus.PENDING_REVIEW,
                    body_text=caption.get("text", ""),
                    hashtags=caption.get("hashtags", []),
                    variant_group=variant_group,
                    variant_label=chr(65 + i) if variant_group else None,
                    prompt_used=prompt,
                    llm_model=model or self.llm.default_model,
                )
                db.add(piece)
                pieces.append(piece)

        await db.commit()
        for piece in pieces:
            await db.refresh(piece)

        logger.info(
            "Generated %d content pieces for campaign %s on %s",
            len(pieces), campaign.id, platform,
        )
        return pieces


content_generator = ContentGenerator()
