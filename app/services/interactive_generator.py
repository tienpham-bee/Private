import json
import logging
import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.content import ContentPiece, ContentStatus, ContentType
from app.models.content_plan import ContentPlanItem, ContentPlanItemStatus
from app.models.content_template import ContentTemplate
from app.models.generation_conversation import (
    GenerationConversation,
    GenerationMessage,
    MessageRole,
)
from app.services.llm_client import LLMClient, llm_client

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class InteractiveContentGenerator:
    def __init__(self, client: LLMClient | None = None):
        self.llm = client or llm_client
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(PROMPTS_DIR)),
            autoescape=False,
        )

    def _build_system_prompt(
        self,
        brand: BrandProfile,
        campaign: Campaign,
        plan_item: ContentPlanItem,
        template: ContentTemplate | None,
    ) -> str:
        tmpl = self.jinja_env.get_template("interactive_system.txt")
        return tmpl.render(
            game_name=brand.game_name,
            tone_of_voice=brand.tone_of_voice,
            target_audience=brand.target_audience,
            brand_guidelines=brand.brand_guidelines,
            sample_posts=brand.sample_posts,
            campaign_name=campaign.name,
            key_message=campaign.key_message,
            product_highlights=campaign.product_highlights,
            platform=plan_item.platform,
            content_type=plan_item.content_type,
            topic=plan_item.topic,
            item_description=plan_item.description,
            template_structure=template.structure if template else None,
            example_output=template.example_output if template else None,
        )

    def _parse_content_response(self, text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)

    def _apply_to_content_piece(self, piece: ContentPiece, data: dict) -> None:
        if "body_text" in data:
            piece.body_text = data["body_text"]
        if "hashtags" in data:
            piece.hashtags = data["hashtags"]
        if "script_json" in data:
            piece.script_json = data["script_json"]
        # IMAGE_AD: store ad copy fields as template_params
        if piece.content_type == ContentType.IMAGE_AD:
            piece.template_params = {
                k: data[k]
                for k in ("headline", "subheadline", "cta_text", "body_text")
                if k in data
            }

    def _content_snapshot(self, piece: ContentPiece) -> dict:
        return {
            "body_text": piece.body_text,
            "hashtags": piece.hashtags,
            "script_json": piece.script_json,
            "template_params": piece.template_params,
        }

    def _trigger_render_if_image_ad(self, piece: ContentPiece) -> None:
        if piece.content_type == ContentType.IMAGE_AD and piece.template_id:
            try:
                from app.workers.render_tasks import render_content_image
                render_content_image.delay(str(piece.id))
                logger.info("Triggered render task for content %s", piece.id)
            except Exception as e:
                logger.warning("Could not trigger render task: %s", e)

    async def generate_for_plan_item(
        self,
        db: AsyncSession,
        plan_item: ContentPlanItem,
        campaign: Campaign,
        brand: BrandProfile,
    ) -> tuple[ContentPiece, GenerationConversation]:
        # Load template if assigned
        template = None
        if plan_item.template_id:
            template = await db.get(ContentTemplate, plan_item.template_id)

        # Build system prompt
        system_prompt = self._build_system_prompt(brand, campaign, plan_item, template)

        # Choose model
        model = None
        if plan_item.content_type == ContentType.VIDEO_SCRIPT:
            model = "claude-opus-4-6"

        # Generate initial content
        user_msg = f"Hãy tạo nội dung {plan_item.content_type} cho {plan_item.platform} về chủ đề: {plan_item.topic}"
        if plan_item.description:
            user_msg += f"\nChi tiết: {plan_item.description}"

        response_text = self.llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_msg,
            model=model,
        )

        data = self._parse_content_response(response_text)

        # Create ContentPiece
        piece = ContentPiece(
            campaign_id=campaign.id,
            content_type=plan_item.content_type,
            platform=plan_item.platform,
            status=ContentStatus.GENERATING,
            template_id=plan_item.template_id,
            prompt_used=system_prompt,
            llm_model=model or self.llm.default_model,
        )
        self._apply_to_content_piece(piece, data)
        piece.status = ContentStatus.PENDING_REVIEW
        db.add(piece)
        await db.flush()

        # Link to plan item
        plan_item.content_piece_id = piece.id
        plan_item.status = ContentPlanItemStatus.GENERATED

        # Create conversation
        conversation = GenerationConversation(
            content_piece_id=piece.id,
            plan_item_id=plan_item.id,
        )
        db.add(conversation)
        await db.flush()

        # Store messages
        sys_msg = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.SYSTEM,
            content=system_prompt,
        )
        user_message = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=user_msg,
        )
        assistant_message = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
            content_snapshot=self._content_snapshot(piece),
        )
        db.add_all([sys_msg, user_message, assistant_message])

        await db.commit()
        await db.refresh(piece)
        await db.refresh(conversation)

        logger.info("Generated content %s for plan item %s", piece.id, plan_item.id)
        self._trigger_render_if_image_ad(piece)
        return piece, conversation

    async def chat_refine(
        self,
        db: AsyncSession,
        content_piece: ContentPiece,
        user_message_text: str,
    ) -> tuple[ContentPiece, GenerationMessage]:
        # Find active conversation
        query = select(GenerationConversation).where(
            GenerationConversation.content_piece_id == content_piece.id,
            GenerationConversation.is_active == True,
        )
        conversation = (await db.execute(query)).scalar_one_or_none()
        if not conversation:
            raise ValueError("Không tìm thấy cuộc hội thoại cho nội dung này")

        # Load all messages
        msg_query = (
            select(GenerationMessage)
            .where(GenerationMessage.conversation_id == conversation.id)
            .order_by(GenerationMessage.created_at)
        )
        messages = (await db.execute(msg_query)).scalars().all()

        # Extract system prompt from first message
        system_prompt = ""
        api_messages = []
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            else:
                api_messages.append({"role": msg.role.value, "content": msg.content})

        # Add new user message
        api_messages.append({"role": "user", "content": user_message_text})

        # Choose model
        model = None
        if content_piece.content_type == ContentType.VIDEO_SCRIPT:
            model = "claude-opus-4-6"

        # Call LLM with full history
        response_text = self.llm.generate_with_history(
            system_prompt=system_prompt,
            messages=api_messages,
            model=model,
        )

        # Parse and apply
        data = self._parse_content_response(response_text)
        self._apply_to_content_piece(content_piece, data)

        # Store messages
        user_msg = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=user_message_text,
        )
        assistant_msg = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
            content_snapshot=self._content_snapshot(content_piece),
        )
        db.add_all([user_msg, assistant_msg])

        await db.commit()
        await db.refresh(content_piece)
        await db.refresh(assistant_msg)

        logger.info("Refined content %s via chat", content_piece.id)
        self._trigger_render_if_image_ad(content_piece)
        return content_piece, assistant_msg


    def _build_google_app_asset_prompt(self, brand: BrandProfile, topic: str, description: str | None) -> str:
        """Build prompt for Google App Campaign asset generation using Jinja2 template."""
        from jinja2 import Environment, FileSystemLoader
        prompts_dir = Path(__file__).parent.parent / "prompts"
        env = Environment(loader=FileSystemLoader(str(prompts_dir)))
        template = env.get_template("google_app_asset.txt")
        return template.render(
            game_name=brand.game_name,
            genre=getattr(brand, "genre", None),
            target_audience=brand.target_audience or "",
            tone_of_voice=brand.tone_of_voice or "",
            topic=topic,
            description=description,
            sample_posts=brand.sample_posts or [],
        )

    def _validate_google_app_assets(self, data: dict) -> dict:
        """Enforce Google's character limits on generated assets."""
        headlines = data.get("headlines", [])[:5]
        descriptions = data.get("descriptions", [])[:5]
        # Truncate if AI ignored limits
        headlines = [h[:30] for h in headlines]
        descriptions = [d[:90] for d in descriptions]
        # Pad to 5 if fewer generated
        while len(headlines) < 5:
            headlines.append(headlines[-1] if headlines else "")
        while len(descriptions) < 5:
            descriptions.append(descriptions[-1] if descriptions else "")
        return {
            "headlines": headlines,
            "descriptions": descriptions,
            "call_to_action": data.get("call_to_action", "DOWNLOAD"),
            "body_text": data.get("body_text", ""),
        }

    async def generate_quick(
        self,
        db: AsyncSession,
        platform: str,
        content_type: str,
        topic: str,
        description: str | None,
        brand: BrandProfile,
        campaign_id: uuid.UUID | None = None,
    ) -> tuple[ContentPiece, GenerationConversation]:
        """Generate content without a pre-existing plan item in DB."""

        # --- Google App Campaign special path ---
        if content_type == "google_app_asset":
            system_prompt = self._build_google_app_asset_prompt(brand, topic, description)
            user_msg = f"Tạo Google App Campaign assets cho chiến dịch: {topic}"
            if description:
                user_msg += f"\nChi tiết: {description}"

            response_text = self.llm.generate(
                system_prompt=system_prompt,
                user_prompt=user_msg,
            )
            raw = self._parse_content_response(response_text)
            data = self._validate_google_app_assets(raw)

            piece = ContentPiece(
                campaign_id=campaign_id,
                content_type=ContentType.GOOGLE_APP_ASSET,
                platform=platform,
                status=ContentStatus.GENERATING,
                prompt_used=system_prompt,
                llm_model=self.llm.default_model,
                body_text=data["body_text"],
                script_json={
                    "headlines": data["headlines"],
                    "descriptions": data["descriptions"],
                    "call_to_action": data["call_to_action"],
                },
            )
            piece.status = ContentStatus.PENDING_REVIEW
            db.add(piece)
            await db.flush()

            conversation = GenerationConversation(content_piece_id=piece.id, plan_item_id=None)
            db.add(conversation)
            await db.flush()
            db.add_all([
                GenerationMessage(conversation_id=conversation.id, role=MessageRole.SYSTEM, content=system_prompt),
                GenerationMessage(conversation_id=conversation.id, role=MessageRole.USER, content=user_msg),
                GenerationMessage(conversation_id=conversation.id, role=MessageRole.ASSISTANT, content=response_text, content_snapshot=self._content_snapshot(piece)),
            ])
            await db.commit()
            await db.refresh(piece)
            await db.refresh(conversation)
            logger.info("Generated Google App Assets %s for topic: %s", piece.id, topic)
            return piece, conversation

        # --- Standard social content path ---
        from jinja2 import Template

        system_prompt = (
            f'You are an expert marketing copywriter for "{brand.game_name}", a mobile game.\n'
            f"Brand voice: {brand.tone_of_voice}\n"
            f"Target audience: {brand.target_audience}\n"
            f"Platform: {platform}\n"
            f"Content type: {content_type}\n"
            f"Topic: {topic}\n"
        )
        if description:
            system_prompt += f"Details: {description}\n"
        if brand.sample_posts:
            system_prompt += "\nExample posts:\n" + "\n".join(f"- {p}" for p in brand.sample_posts[:2])

        if content_type == "image_ad":
            system_prompt += (
                '\n\nRules: Respond ONLY with valid JSON containing: '
                '"headline" (max 30 chars), "subheadline" (max 50 chars), '
                '"cta_text" (max 15 chars), "body_text" (max 90 chars), "hashtags" (array).'
            )
        else:
            system_prompt += (
                '\n\nRules: Respond ONLY with valid JSON containing: '
                '"body_text" (string), "hashtags" (array of strings).'
            )
            if content_type == "video_script":
                system_prompt += ' Also include "script_json" with scenes breakdown.'

        user_msg = f"Tạo nội dung {content_type} cho {platform} về: {topic}"
        if description:
            user_msg += f"\nChi tiết: {description}"

        model = "claude-opus-4-6" if content_type == "video_script" else None
        response_text = self.llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_msg,
            model=model,
        )

        data = self._parse_content_response(response_text)

        piece = ContentPiece(
            campaign_id=campaign_id,
            content_type=ContentType(content_type),
            platform=platform,
            status=ContentStatus.GENERATING,
            prompt_used=system_prompt,
            llm_model=model or self.llm.default_model,
        )
        self._apply_to_content_piece(piece, data)
        piece.status = ContentStatus.PENDING_REVIEW
        db.add(piece)
        await db.flush()

        # Conversation with no plan_item_id
        conversation = GenerationConversation(
            content_piece_id=piece.id,
            plan_item_id=None,
        )
        db.add(conversation)
        await db.flush()

        sys_msg = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.SYSTEM,
            content=system_prompt,
        )
        user_message = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=user_msg,
        )
        assistant_message = GenerationMessage(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
            content_snapshot=self._content_snapshot(piece),
        )
        db.add_all([sys_msg, user_message, assistant_message])
        await db.commit()
        await db.refresh(piece)
        await db.refresh(conversation)

        logger.info("Quick-generated content %s (%s/%s)", piece.id, platform, content_type)
        self._trigger_render_if_image_ad(piece)
        return piece, conversation


interactive_generator = InteractiveContentGenerator()
