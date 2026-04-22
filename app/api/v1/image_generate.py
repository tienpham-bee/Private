import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.image_asset import ImageAsset
from app.schemas.image_asset import (
    ImageAssetResponse,
    ImageBatchGenerateRequest,
    ImageGenerateRequest,
)
from app.services.gemini_image_client import DEFAULT_MODEL, gemini_image_client

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


async def _save_asset(db: AsyncSession, result: dict, prompt: str, campaign_id=None, content_piece_id=None, extra: dict | None = None) -> ImageAsset:
    asset = ImageAsset(
        campaign_id=campaign_id,
        content_piece_id=content_piece_id,
        prompt=prompt,
        model=result["model"],
        file_path=result["file_path"],
        file_url=result["file_url"],
        file_size=result["file_size"],
        width=result["width"],
        height=result["height"],
        mime_type=result["mime_type"],
        extra_data={**(extra or {}), "response_text": result.get("response_text")},
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.post("/images/generate", response_model=ImageAssetResponse, status_code=201)
async def generate_image(data: ImageGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate image from text prompt."""
    try:
        result = gemini_image_client.generate_image(
            prompt=data.prompt,
            model=data.model,
            campaign_id=str(data.campaign_id) if data.campaign_id else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo ảnh: {str(e)}")

    return await _save_asset(db, result, data.prompt, data.campaign_id, data.content_piece_id)


@router.post("/images/generate-from-reference", response_model=ImageAssetResponse, status_code=201)
async def generate_from_reference(
    prompt: str = Form(...),
    model: str = Form(default=DEFAULT_MODEL),
    campaign_id: str | None = Form(default=None),
    content_piece_id: str | None = Form(default=None),
    reference_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Generate image guided by a reference image (image-to-image)."""
    if reference_image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Chỉ hỗ trợ PNG, JPEG, WebP")

    ref_bytes = await reference_image.read()
    if len(ref_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Ảnh mẫu không được lớn hơn 10MB")

    try:
        result = gemini_image_client.generate_from_reference(
            prompt=prompt,
            reference_bytes=ref_bytes,
            reference_mime=reference_image.content_type or "image/png",
            model=model,
            campaign_id=campaign_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo ảnh từ mẫu: {str(e)}")

    cid = uuid.UUID(campaign_id) if campaign_id else None
    cpid = uuid.UUID(content_piece_id) if content_piece_id else None
    return await _save_asset(
        db, result, prompt, cid, cpid,
        extra={"mode": "reference", "reference_filename": reference_image.filename},
    )


@router.post("/images/{image_id}/variations", response_model=list[ImageAssetResponse], status_code=201)
async def create_variations(
    image_id: uuid.UUID,
    count: int = Query(default=2, ge=1, le=4),
    prompt: str | None = Query(default=None),
    model: str = Query(default=DEFAULT_MODEL),
    db: AsyncSession = Depends(get_db),
):
    """Create variations of an existing image."""
    source = await db.get(ImageAsset, image_id)
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh gốc")

    source_path = Path(source.file_path)
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="File ảnh gốc không tồn tại")

    variation_prompt = prompt or f"Tạo biến thể sáng tạo của ảnh này, giữ nguyên chủ đề: {source.prompt}"
    ref_bytes = source_path.read_bytes()

    assets = []
    for i in range(count):
        try:
            result = gemini_image_client.generate_from_reference(
                prompt=variation_prompt,
                reference_bytes=ref_bytes,
                reference_mime="image/png",
                model=model,
                campaign_id=str(source.campaign_id) if source.campaign_id else None,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi tạo biến thể {i+1}: {str(e)}")

        asset = await _save_asset(
            db, result, variation_prompt, source.campaign_id, source.content_piece_id,
            extra={"mode": "variation", "source_image_id": str(image_id)},
        )
        assets.append(asset)

    return assets


@router.post("/images/batch-generate", response_model=list[ImageAssetResponse], status_code=201)
async def batch_generate(data: ImageBatchGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate multiple images from the same prompt."""
    try:
        results = gemini_image_client.generate_batch(
            prompt=data.prompt,
            count=data.count,
            model=data.model,
            campaign_id=str(data.campaign_id) if data.campaign_id else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo batch ảnh: {str(e)}")

    assets = []
    for result in results:
        asset = await _save_asset(
            db, result, data.prompt, data.campaign_id, data.content_piece_id,
            extra={"mode": "batch"},
        )
        assets.append(asset)
    return assets


@router.post("/images/upload", response_model=ImageAssetResponse, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    prompt: str = Form(default=""),
    campaign_id: str | None = Form(default=None),
    content_piece_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Upload an existing image to the library without AI generation."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=422, detail="Chỉ hỗ trợ PNG, JPEG, WebP")

    from PIL import Image as PILImage
    import io as _io
    from datetime import datetime as _dt
    from app.services.gemini_image_client import GENERATED_IMAGES_DIR

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Ảnh không được lớn hơn 20MB")

    pil_img = PILImage.open(_io.BytesIO(file_bytes)).convert("RGBA")
    if pil_img.mode == "RGBA":
        background = PILImage.new("RGB", pil_img.size, (255, 255, 255))
        background.paste(pil_img, mask=pil_img.split()[3])
        pil_img = background

    cid_str = campaign_id or "standalone"
    save_dir = GENERATED_IMAGES_DIR / cid_str
    save_dir.mkdir(parents=True, exist_ok=True)

    timestamp = _dt.now().strftime("%Y%m%d_%H%M%S")
    import uuid as _uuid
    filename = f"{timestamp}_{_uuid.uuid4().hex[:8]}.png"
    file_path = save_dir / filename
    pil_img.save(str(file_path), format="PNG", optimize=True)

    file_size = file_path.stat().st_size
    width, height = pil_img.size
    file_url = f"/generated_images/{cid_str}/{filename}"

    try:
        from app.services.s3_client import s3_client
        from app.config import settings
        s3_key = f"generated/{cid_str}/{filename}"
        with open(file_path, "rb") as f:
            s3_client.client.put_object(
                Bucket=settings.s3_bucket_name,
                Key=s3_key,
                Body=f.read(),
                ContentType="image/png",
            )
        file_url = f"{settings.s3_public_url}/{settings.s3_bucket_name}/{s3_key}"
    except Exception as e:
        pass

    cid = uuid.UUID(campaign_id) if campaign_id else None
    cpid = uuid.UUID(content_piece_id) if content_piece_id else None
    asset = ImageAsset(
        campaign_id=cid,
        content_piece_id=cpid,
        prompt=prompt or f"Ảnh tải lên: {file.filename}",
        model="uploaded",
        file_path=str(file_path),
        file_url=file_url,
        file_size=file_size,
        width=width,
        height=height,
        mime_type="image/png",
        extra_data={"mode": "uploaded", "original_filename": file.filename},
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get("/images", response_model=list[ImageAssetResponse])
async def list_images(
    campaign_id: uuid.UUID | None = None,
    content_piece_id: uuid.UUID | None = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = select(ImageAsset)
    if campaign_id:
        query = query.where(ImageAsset.campaign_id == campaign_id)
    if content_piece_id:
        query = query.where(ImageAsset.content_piece_id == content_piece_id)
    query = query.order_by(ImageAsset.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/images/{image_id}", response_model=ImageAssetResponse)
async def get_image(image_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    asset = await db.get(ImageAsset, image_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    return asset


@router.get("/images/{image_id}/file")
async def get_image_file(image_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    asset = await db.get(ImageAsset, image_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

    file_path = Path(asset.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File ảnh không tồn tại trên server")

    return FileResponse(path=str(file_path), media_type=asset.mime_type, filename=file_path.name)


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(image_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    asset = await db.get(ImageAsset, image_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

    file_path = Path(asset.file_path)
    if file_path.exists():
        file_path.unlink()

    await db.delete(asset)
    await db.commit()
