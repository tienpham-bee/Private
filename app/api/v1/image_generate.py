import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.image_asset import ImageAsset
from app.schemas.image_asset import ImageAssetResponse, ImageGenerateRequest
from app.services.gemini_image_client import gemini_image_client

router = APIRouter()


@router.post("/images/generate", response_model=ImageAssetResponse, status_code=201)
async def generate_image(
    data: ImageGenerateRequest, db: AsyncSession = Depends(get_db)
):
    """Generate an image using Gemini Nano Banana 2 and save it."""
    try:
        result = gemini_image_client.generate_image(
            prompt=data.prompt,
            model=data.model,
            campaign_id=str(data.campaign_id) if data.campaign_id else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tạo ảnh: {str(e)}",
        )

    # Save to DB
    asset = ImageAsset(
        campaign_id=data.campaign_id,
        content_piece_id=data.content_piece_id,
        prompt=data.prompt,
        model=result["model"],
        file_path=result["file_path"],
        file_url=result["file_url"],
        file_size=result["file_size"],
        width=result["width"],
        height=result["height"],
        mime_type=result["mime_type"],
        extra_data={"response_text": result.get("response_text")},
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
    """List generated images (gallery)."""
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
    """Serve the actual image file."""
    asset = await db.get(ImageAsset, image_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

    file_path = Path(asset.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File ảnh không tồn tại trên server")

    return FileResponse(
        path=str(file_path),
        media_type=asset.mime_type,
        filename=file_path.name,
    )


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(image_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    asset = await db.get(ImageAsset, image_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")

    # Delete local file
    file_path = Path(asset.file_path)
    if file_path.exists():
        file_path.unlink()

    await db.delete(asset)
    await db.commit()
