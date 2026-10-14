from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    PROJECT_NAME: str = "Bangladesh LandOS"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json

            parsed = json.loads(v)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
            return [str(parsed)]
        elif isinstance(v, list):
            return [str(item) for item in v]
        return []

    # PostgreSQL Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://landos_user:landos_dev_password@localhost:5432/landos_db"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & Tokens
    SECRET_KEY: str = "development_secret_key_change_in_production_min_32_bytes_long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin"
    MINIO_SECRET_KEY: str = "minio_dev_password"
    MINIO_BUCKET: str = "landos-documents"
    MINIO_USE_SSL: bool = False

    # Observability
    LOG_LEVEL: str = "INFO"


settings = Settings()
