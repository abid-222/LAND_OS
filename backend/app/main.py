import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.csrf import verify_csrf
from app.core.logging import setup_logging
from app.core.metrics import PrometheusLatencyMiddleware, get_prometheus_metrics_response
from app.core.timeout import RequestTimeoutMiddleware
from app.modules.admin.audit import router as audit_router
from app.modules.admin.users import router as admin_users_router
from app.modules.alerts.router import alerts_router, parcels_alerts_router
from app.modules.auth.router import router as auth_router
from app.modules.consent.router import router as consent_router
from app.modules.documents.router import router as documents_router
from app.modules.feedback.router import router as feedback_router
from app.modules.guide.router import router as guide_router
from app.modules.health.router import router as health_router
from app.modules.map.router import router as map_router
from app.modules.ml.router import router as ml_router
from app.modules.notifications.router import router as notifications_router
from app.modules.quality.router import router as quality_router
from app.modules.records.router import router as records_router
from app.modules.reports.router import buyer_reports_router, parcels_reports_router
from app.modules.review.router import router as review_router
from app.modules.scan.router import router as scan_router
from app.modules.search.router import router as search_router

logger = logging.getLogger("landos.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize logging
    setup_logging(settings.LOG_LEVEL)
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] environment.")

    # Production Startup Security Guard
    if settings.ENVIRONMENT == "production":
        default_secret = "development_secret_key_change_in_production_min_32_bytes_long"
        if settings.SECRET_KEY == default_secret or len(settings.SECRET_KEY) < 32:
            logger.critical(
                "PRODUCTION STARTUP ABORTED: Insecure or default SECRET_KEY in production mode!"
            )
            raise RuntimeError(
                "Insecure or default SECRET_KEY in production mode. Refusing to start."
            )
        if settings.DEMO_PASSWORD == "Password123!":
            logger.warning(
                "PRODUCTION NOTICE: Default DEMO_PASSWORD detected; demo accounts disabled."
            )

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

# Request Timeout Middleware (per-route class threshold: 60s for heavy ops, 15s standard, exempting SSE streams)
app.add_middleware(RequestTimeoutMiddleware, default_timeout=15.0, extended_timeout=60.0)

# Prometheus p95 Latency & Request Monitoring Middleware
app.add_middleware(PrometheusLatencyMiddleware)

if settings.CORS_ORIGIN_REGEX:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-LandOS-MFA-Required", "X-CSRF-Token"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-LandOS-MFA-Required", "X-CSRF-Token"],
    )


@app.middleware("http")
async def security_and_csrf_middleware(request: Request, call_next):
    """
    Enforces Double Submit Cookie CSRF defense on state-changing requests,
    and applies standard OWASP security headers (CSP, Frame Options, etc.).
    """
    try:
        verify_csrf(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    response: Response = await call_next(request)

    # Security Headers (Requirement 2.3)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), geolocation=(), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https:;"
    )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Sanitizes unhandled exceptions to prevent stack trace leaks to clients (Requirement 5.1).
    """
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please contact technical administration."
        },
    )


# API v1 Routers included directly with API_V1_PREFIX
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_users_router, prefix=settings.API_V1_PREFIX)
app.include_router(scan_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(search_router, prefix=settings.API_V1_PREFIX)
app.include_router(records_router, prefix=settings.API_V1_PREFIX)
app.include_router(guide_router, prefix=settings.API_V1_PREFIX)
app.include_router(map_router, prefix=settings.API_V1_PREFIX)
app.include_router(review_router, prefix=settings.API_V1_PREFIX)
app.include_router(quality_router, prefix=settings.API_V1_PREFIX)
app.include_router(parcels_alerts_router, prefix=settings.API_V1_PREFIX)
app.include_router(alerts_router, prefix=settings.API_V1_PREFIX)
app.include_router(parcels_reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(buyer_reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(feedback_router, prefix=settings.API_V1_PREFIX)
app.include_router(consent_router, prefix=settings.API_V1_PREFIX)
app.include_router(ml_router, prefix=settings.API_V1_PREFIX)


@app.get(
    "/metrics", summary="Export Prometheus metrics and latency histograms", tags=["Observability"]
)
@app.get(
    f"{settings.API_V1_PREFIX}/metrics", summary="Export Prometheus metrics", tags=["Observability"]
)
async def prometheus_metrics():
    """Exports raw Prometheus metrics format with latency histograms for p95 computation."""
    return get_prometheus_metrics_response()


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "api_docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
        "metrics": "/metrics",
    }


def export_openapi(output_path: str = "openapi.json"):
    """Serializes complete OpenAPI 3.1.0 schema to disk for TypeScript contract codegen."""
    schema = app.openapi()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    print(f"Exported clean OpenAPI schema to {output_path}")


if __name__ == "__main__":
    export_openapi("openapi.json")
