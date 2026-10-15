"""
Public Reference Data Cache for Bangladesh LandOS.
Enforces rule: 'Redis-cache only public reference data'.
Never caches private, user-specific, case, or unverified document data.
"""

import json
import logging
import time
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger("landos.cache")

# Strict public whitelist prefixes
PUBLIC_WHITELIST_PREFIXES = (
    "public:map:parcels",
    "public:records",
    "public:mouzas",
    "public:quality:summary",
    "public:kb_articles",
)

# Local memory fallback cache (key -> value)
_memory_cache: dict[str, Any] = {}
_redis_offline_until: float = 0.0


def is_allowed_public_key(key: str) -> bool:
    """Verifies that key corresponds strictly to non-confidential public reference data."""
    return any(key.startswith(prefix) for prefix in PUBLIC_WHITELIST_PREFIXES)


async def get_cached_public_data(key: str) -> Optional[Any]:
    """Retrieves cached public reference data."""
    global _redis_offline_until
    if not is_allowed_public_key(key):
        logger.warning(f"Cache access rejected: '{key}' is not an authorized public reference key.")
        return None

    now = time.time()
    # Try Redis if not in backoff
    if now > _redis_offline_until:
        try:
            r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.1)
            raw = await r.get(key)
            await r.close()
            if raw:
                return json.loads(raw)
        except Exception as e:
            _redis_offline_until = now + 5.0
            logger.debug(f"Redis get notice (using fallback): {e}")

    # Fallback memory
    return _memory_cache.get(key)


async def set_cached_public_data(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    """Stores authorized public reference data into cache."""
    global _redis_offline_until
    if not is_allowed_public_key(key):
        logger.error(f"SECURITY ALERT: Attempted to cache unauthorized or private key: '{key}'")
        return False

    serialized = json.dumps(value, ensure_ascii=False)

    # Save to memory fallback
    _memory_cache[key] = value

    now = time.time()
    # Try Redis if not in backoff
    if now > _redis_offline_until:
        try:
            r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=0.1)
            await r.set(key, serialized, ex=ttl_seconds)
            await r.close()
            return True
        except Exception as e:
            _redis_offline_until = now + 5.0
            logger.debug(f"Redis set notice (cached in memory): {e}")
            return False

    return True
