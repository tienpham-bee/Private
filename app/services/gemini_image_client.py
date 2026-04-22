import io
import logging
import uuid
from datetime import datetime
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

GENERATED_IMAGES_DIR = Path(__file__).parent.parent.parent / "generated_images"
GENERATED_IMAGES_DIR.mkdir(exist_ok=True)

IMAGEN_MODELS = {
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-ultra-generate-001",
}

DEFAULT_MODEL = "gemini-3.1-flash-image-preview"


class GeminiImageClient:
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or settings.google_ai_api_key
        self._client: genai.Client | None = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=self._api_key)
        return self._client

    def _save_and_upload(self, image: Image.Image, campaign_id: str | None) -> dict:
        """Save PIL image to disk and upload to S3. Returns metadata dict."""
        if campaign_id:
            save_dir = GENERATED_IMAGES_DIR / str(campaign_id)
        else:
            save_dir = GENERATED_IMAGES_DIR / "standalone"
        save_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_id = uuid.uuid4().hex[:8]
        filename = f"{timestamp}_{file_id}.png"
        file_path = save_dir / filename

        image.save(str(file_path), format="PNG", optimize=True)
        file_size = file_path.stat().st_size
        width, height = image.size

        file_url = f"/generated_images/{save_dir.name}/{filename}"
        try:
            from app.services.s3_client import s3_client
            s3_key = f"generated/{save_dir.name}/{filename}"
            with open(file_path, "rb") as f:
                s3_client.client.put_object(
                    Bucket=settings.s3_bucket_name,
                    Key=s3_key,
                    Body=f.read(),
                    ContentType="image/png",
                )
            file_url = f"{settings.s3_public_url}/{settings.s3_bucket_name}/{s3_key}"
        except Exception as e:
            logger.warning("S3 upload skipped (using local): %s", e)

        return {
            "file_path": str(file_path),
            "file_url": file_url,
            "width": width,
            "height": height,
            "file_size": file_size,
            "mime_type": "image/png",
        }

    def generate_image(
        self,
        prompt: str,
        model: str = DEFAULT_MODEL,
        campaign_id: str | None = None,
    ) -> dict:
        logger.info("Generating image with %s: %.100s...", model, prompt)

        if model in IMAGEN_MODELS:
            image, response_text = self._generate_with_imagen(prompt, model)
        else:
            image, response_text = self._generate_with_gemini_native(prompt, model)

        result = self._save_and_upload(image, campaign_id)
        result["model"] = model
        result["response_text"] = response_text
        return result

    def generate_from_reference(
        self,
        prompt: str,
        reference_bytes: bytes,
        reference_mime: str = "image/png",
        model: str = DEFAULT_MODEL,
        campaign_id: str | None = None,
    ) -> dict:
        """Generate image guided by a reference image (image-to-image)."""
        logger.info("Generating image from reference with %s: %.80s...", model, prompt)

        if model in IMAGEN_MODELS:
            # Imagen doesn't support image-to-image via this SDK path, fall back to Gemini native
            model = DEFAULT_MODEL

        image_part = types.Part.from_bytes(data=reference_bytes, mime_type=reference_mime)
        response = self.client.models.generate_content(
            model=model,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_modalities=["Image", "Text"],
            ),
        )

        generated_image = None
        response_text = None
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                generated_image = Image.open(io.BytesIO(part.inline_data.data))
            elif part.text is not None:
                response_text = part.text

        if generated_image is None:
            raise ValueError(f"Gemini không trả về hình ảnh. Response: {response_text}")

        result = self._save_and_upload(generated_image, campaign_id)
        result["model"] = model
        result["response_text"] = response_text
        return result

    def generate_batch(
        self,
        prompt: str,
        count: int = 2,
        model: str = DEFAULT_MODEL,
        campaign_id: str | None = None,
    ) -> list[dict]:
        """Generate multiple images from the same prompt."""
        count = max(1, min(count, 4))
        results = []
        for i in range(count):
            logger.info("Batch generating %d/%d", i + 1, count)
            result = self.generate_image(prompt, model, campaign_id)
            results.append(result)
        return results

    def _generate_with_imagen(self, prompt: str, model: str) -> tuple[Image.Image, str | None]:
        response = self.client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1),
        )
        if not response.generated_images:
            raise ValueError("Imagen không trả về hình ảnh nào")
        img_data = response.generated_images[0]
        image = Image.open(io.BytesIO(img_data.image.image_bytes))
        return image, None

    def _generate_with_gemini_native(self, prompt: str, model: str) -> tuple[Image.Image, str | None]:
        response = self.client.models.generate_content(
            model=model,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["Image", "Text"],
            ),
        )

        image = None
        response_text = None
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image = Image.open(io.BytesIO(part.inline_data.data))
            elif part.text is not None:
                response_text = part.text

        if image is None:
            raise ValueError(f"Gemini không trả về hình ảnh. Response: {response_text}")

        return image, response_text


gemini_image_client = GeminiImageClient()
