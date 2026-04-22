from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/marketing"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # AI
    anthropic_api_key: str = ""
    google_ai_api_key: str = ""

    # S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = "marketing-assets"
    s3_endpoint_url: str = "http://minio:9000"
    s3_public_url: str = "http://localhost:9000"

    # Facebook / Instagram / Threads
    facebook_app_id: str = ""
    facebook_app_secret: str = ""

    # TikTok
    tiktok_client_key: str = ""
    tiktok_client_secret: str = ""

    # Notifications
    slack_webhook_url: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # App
    secret_key: str = "change-me-to-a-random-string"
    debug: bool = False
    # CORS — dấu phẩy ngăn cách nhiều origin, ví dụ: https://app.vercel.app,https://custom-domain.com
    cors_origins: str = "*"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
