from pydantic import BaseModel


class RenderRequest(BaseModel):
    template_params: dict | None = None


class RenderResponse(BaseModel):
    content_id: str
    rendered_image_url: str
    status: str = "rendered"


class TemplatePreviewRequest(BaseModel):
    template_params: dict
