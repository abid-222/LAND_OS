import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.modules.admin.audit import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.documents.router import router as documents_router
from app.modules.guide.router import router as guide_router
from app.modules.health.router import router as health_router
from app.modules.map.router import router as map_router
from app.modules.quality.router import router as quality_router
from app.modules.review.router import router as review_router
from app.modules.search.router import router as search_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize logging
    logger = setup_logging(settings.LOG_LEVEL)
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] environment.")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scan-to-Search Digital Land Service and Document Intelligence Platform for Bangladesh",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware (strict allow-list from settings with credentials support)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-LandOS-MFA-Required"],
)

# API v1 Routers included directly with API_V1_PREFIX
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(search_router, prefix=settings.API_V1_PREFIX)
app.include_router(guide_router, prefix=settings.API_V1_PREFIX)
app.include_router(map_router, prefix=settings.API_V1_PREFIX)
app.include_router(review_router, prefix=settings.API_V1_PREFIX)
app.include_router(quality_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "api_docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


def export_openapi(output_path: str = "openapi.json"):
    """Utility function called by `make client` to export the OpenAPI specification."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    schema = app.openapi()
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    print(f"Exported OpenAPI specification to {output_path}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
