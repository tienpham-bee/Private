from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import (
    brand, campaigns, content, approval, schedule, publishing, platforms,
    templates, content_plan, generation, render, image_generate,
)
from app.config import settings


def create_app() -> FastAPI:
    application = FastAPI(
        title="AI Marketing Agent",
        description="Automated content creation and social media publishing for mobile games",
        version="0.1.0",
        debug=settings.debug,
    )

    cors_origins = (
        ["*"] if settings.cors_origins == "*"
        else [o.strip() for o in settings.cors_origins.split(",")]
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    prefix = "/api/v1"
    application.include_router(brand.router, prefix=prefix, tags=["Brand"])
    application.include_router(platforms.router, prefix=prefix, tags=["Platforms"])
    application.include_router(campaigns.router, prefix=prefix, tags=["Campaigns"])
    application.include_router(content.router, prefix=prefix, tags=["Content"])
    application.include_router(approval.router, prefix=prefix, tags=["Approval"])
    application.include_router(schedule.router, prefix=prefix, tags=["Schedule"])
    application.include_router(publishing.router, prefix=prefix, tags=["Publishing"])
    application.include_router(templates.router, prefix=prefix, tags=["Templates"])
    application.include_router(content_plan.router, prefix=prefix, tags=["Content Plan"])
    application.include_router(generation.router, prefix=prefix, tags=["Generation"])
    application.include_router(render.router, prefix=prefix, tags=["Render"])
    application.include_router(image_generate.router, prefix=prefix, tags=["Image Generation"])

    # Serve generated images as static files
    generated_dir = Path(__file__).parent.parent / "generated_images"
    generated_dir.mkdir(exist_ok=True)
    application.mount(
        "/generated_images",
        StaticFiles(directory=str(generated_dir)),
        name="generated_images",
    )

    return application


app = create_app()


@app.get("/health")
async def health_check():
    return {"status": "ok"}
