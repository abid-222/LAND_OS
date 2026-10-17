from typing import List, Optional, Union

from pydantic import field_validator, model_validator
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
    CORS_ORIGIN_REGEX: Optional[str] = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            import json

            parsed = json.loads(v)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
            return [str(parsed)]
        elif isinstance(v, list):
            return [item for item in v]
        return []

    # Database (Defaults to SQLite for CI/local offline resilience; overridden by env/PostgreSQL in prod)
    DATABASE_URL: str = "sqlite+aiosqlite:///landos_dev.db"

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & Tokens
    SECRET_KEY: str = "development_secret_key_change_in_production_min_32_bytes_long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    ALLOW_DEV_MFA_BYPASS: bool = False

    # Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin"
    MINIO_SECRET_KEY: str = "minio_dev_password"
    MINIO_BUCKET: str = "landos-documents"
    MINIO_USE_SSL: bool = False
    STORAGE_LOCAL_DIR: str = "data/storage"

    # Map Tile Provider (Requirement 3.9)
    MAP_TILE_URL: str = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

    # Demo Credentials (Requirement 1.1)
    DEMO_PASSWORD: str = "Password123!"
    DEMO_MFA_SECRET: str = "JBSWY3DPEHPK3PXP"

    # Observability
    LOG_LEVEL: str = "INFO"

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        # Dev MFA bypass is strictly prohibited outside development environment
        if self.ENVIRONMENT != "development":
            self.ALLOW_DEV_MFA_BYPASS = False

        # In production cross-site cookie settings: default SameSite=None and Secure=True
        if self.ENVIRONMENT == "production":
            if self.COOKIE_SAMESITE == "lax":
                self.COOKIE_SAMESITE = "none"
            if not self.COOKIE_SECURE:
                self.COOKIE_SECURE = True
        return self


settings = Settings()
