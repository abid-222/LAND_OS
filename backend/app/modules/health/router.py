import datetime

from fastapi import APIRouter, Depends
from redis import asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/health", tags=["System Health & Telemetry"])


@router.get("/liveness", summary="Container liveness probe")
async def liveness():
    return {
        "status": "alive",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


@router.get("/readiness", summary="Service readiness probe checking DB and Redis")
async def readiness(db: AsyncSession = Depends(get_db)):
    db_healthy = False
    redis_healthy = False
    details = {}

    # 1. Database check
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
        details["database"] = "connected"
    except Exception as e:
        details["database"] = f"unhealthy: {str(e)}"

    # 2. Redis check
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pong = await r.ping()
        await r.aclose()
        if pong:
            redis_healthy = True
            details["redis"] = "connected"
    except Exception as e:
        details["redis"] = f"unhealthy: {str(e)}"

    overall_status = "ready" if (db_healthy and redis_healthy) else "degraded"

    # In dev or standalone testing without redis/postgres running, provide graceful status
    return {
        "status": overall_status,
        "database_connected": db_healthy,
        "redis_connected": redis_healthy,
        "details": details,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


@router.get("", summary="Overall health status")
async def health(db: AsyncSession = Depends(get_db)):
    readiness_data = await readiness(db)
    return {
        "status": "healthy" if readiness_data["status"] == "ready" else "degraded",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "checks": readiness_data,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
