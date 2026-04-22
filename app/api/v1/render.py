import io
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import ContentPiece
from app.models.content_template import ContentTemplate
from app.schemas.render import RenderRequest, RenderResponse, TemplatePreviewRequest
from app.services.image_renderer import image_renderer
from app.services.s3_client import s3_client

router = APIRouter()


@router.post("/content/{content_id}/render", response_model=RenderResponse)
async def render_content_image(
    content_id: uuid.UUID,
    data: RenderRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    piece = await db.get(ContentPiece, content_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung")

    if not piece.template_id:
        raise HTTPException(status_code=400, detail="Nội dung chưa gán template")

    template = await db.get(ContentTemplate, piece.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy template")

    params = (data.template_params if data and data.template_params else None) or piece.template_params or {}

    png_bytes = image_renderer.render(template.structure, params)
    url = s3_client.upload_image(png_bytes, str(piece.campaign_id), str(piece.id))

    piece.rendered_image_url = url
    await db.commit()

    return RenderResponse(content_id=str(content_id), rendered_image_url=url)


@router.get("/content/{content_id}/render/preview")
async def preview_content_image(
    content_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    piece = await db.get(ContentPiece, content_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung")

    if not piece.template_id:
        raise HTTPException(status_code=400, detail="Nội dung chưa gán template")

    template = await db.get(ContentTemplate, piece.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy template")

    params = piece.template_params or {}
    png_bytes = image_renderer.render(template.structure, params)

    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")


@router.post("/templates/{template_id}/preview")
async def preview_template(
    template_id: uuid.UUID,
    data: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(ContentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Không tìm thấy template")

    png_bytes = image_renderer.render(template.structure, data.template_params)

    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")
