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

# Directory to save generated images locally
GENERATED_IMAGES_DIR = Path(__file__).parent.parent.parent / "generated_images"
GENERATED_IMAGES_DIR.mkdir(exist_ok=True)

# Imagen models (use generate_images API)
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

    def generate_image(
        self,
        prompt: str,
        model: str = DEFAULT_MODEL,
        campaign_id: str | None = None,
    ) -> dict:
        """
        Generate an image using Google AI (Imagen or Gemini native).

        Returns:
            dict with keys: file_path, file_url, width, height, file_size, mime_type, model
        """
        logger.info("Generating image with %s: %.100s...", model, prompt)

        if model in IMAGEN_MODELS:
            image, response_text = self._generate_with_imagen(prompt, model)
        else:
            image, response_text = self._generate_with_gemini_native(prompt, model)

        # Save to local filesystem
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

        # Try S3 upload, fallback to local URL
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
            logger.info("Uploaded to S3: %s", file_url)
        except Exception as e:
            logger.warning("S3 upload skipped (using local): %s", e)

        result = {
            "file_path": str(file_path),
            "file_url": file_url,
            "width": width,
            "height": height,
            "file_size": file_size,
            "mime_type": "image/png",
            "model": model,
            "response_text": response_text,
        }

        logger.info(
            "Generated image %dx%d (%d bytes) saved to %s",
            width, height, file_size, file_path,
        )
        return result

    def _generate_with_imagen(self, prompt: str, model: str) -> tuple[Image.Image, str | None]:
        """Use the Imagen API (generate_images endpoint)."""
        response = self.client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
            ),
        )

        if not response.generated_images:
            raise ValueError("Imagen không trả về hình ảnh nào")

        img_data = response.generated_images[0]
        image = Image.open(io.BytesIO(img_data.image.image_bytes))
        return image, None

    def _generate_with_gemini_native(self, prompt: str, model: str) -> tuple[Image.Image, str | None]:
        """Use the Gemini native generation (generate_content with Image modality)."""
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
            raise ValueError(
                f"Gemini không trả về hình ảnh. Response: {response_text}"
            )

        return image, response_text


gemini_image_client = GeminiImageClient()
