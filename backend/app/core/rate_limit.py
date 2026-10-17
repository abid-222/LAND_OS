"""
Rate Limiting Dependency for Bangladesh LandOS.
Supports IP and token-based rate limits with Redis distributed sliding-window
accounting, with automatic in-memory fallback when Redis is unreachable.
"""

import logging
import time
from collections import defaultdict
from typing import Any, Callable, Dict, List, Tuple, cast

import redis
from fastapi import HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger("landos.ratelimit")


class HybridRateLimiter:
    """
    Distributed Redis rate limiter with in-memory fallback.
    Thread-safe within asyncio event loop.
    """

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self.enabled: bool = True
        self._redis_client: redis.Redis | None = None
        self._redis_failed: bool = False

    def _get_redis(self) -> redis.Redis | None:
        if self._redis_failed:
            return None
        if self._redis_client is None:
            try:
                self._redis_client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=0.2,
                    socket_timeout=0.2,
                    decode_responses=True,
                )
                self._redis_client.ping()
            except Exception:
                self._redis_failed = True
                self._redis_client = None
        return self._redis_client

    def is_allowed(
        self, client_key: str, max_requests: int, window_seconds: float
    ) -> Tuple[bool, int]:
        if not getattr(self, "enabled", True):
            return True, 0

        now = time.time()

        # 1. Try Redis sliding window
        r = self._get_redis()
        if r is not None:
            try:
                redis_key = f"landos:ratelimit:{client_key}"
                pipe = r.pipeline()
                window_start = now - window_seconds
                pipe.zremrangebyscore(redis_key, 0, window_start)
                pipe.zadd(redis_key, {str(now): now})
                pipe.zcard(redis_key)
                pipe.expire(redis_key, int(window_seconds) + 1)
                results = pipe.execute()
                current_count = results[2]

                if current_count > max_requests:
                    # Get oldest timestamp in current window
                    raw_items = r.zrange(redis_key, 0, 0, withscores=True)
                    oldest_items = cast(Any, raw_items)
                    retry_after = (
                        max(1, int(oldest_items[0][1] + window_seconds - now))
                        if oldest_items
                        else int(window_seconds)
                    )
                    return False, retry_after
                return True, 0
            except Exception:
                # Mark redis as temporarily offline, fallback to memory
                self._redis_failed = True

        # 2. In-Memory Fallback
        window_start = now - window_seconds
        timestamps = self._requests[client_key]
        self._requests[client_key] = [t for t in timestamps if t > window_start]

        if len(self._requests[client_key]) >= max_requests:
            oldest = self._requests[client_key][0]
            retry_after = max(1, int(oldest + window_seconds - now))
            return False, retry_after

        self._requests[client_key].append(now)
        return True, 0

    def reset(self):
        self._requests.clear()
        r = self._get_redis()
        if r is not None:
            try:
                for k in r.scan_iter("landos:ratelimit:*"):
                    r.delete(k)
            except Exception:
                pass


limiter = HybridRateLimiter()


def rate_limit(requests: int = 60, window_seconds: int = 60) -> Callable:
    """
    FastAPI dependency factory enforcing rate limits per client IP / auth token.
    """

    async def dependency(request: Request):
        # Extract client key: auth token or IP address
        auth_header = request.headers.get("Authorization", "")
        token = request.cookies.get("landos_access_token") or (
            auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else ""
        )

        client_ip = request.client.host if request.client else "127.0.0.1"
        client_key = f"{token}:{client_ip}" if token else f"ip:{client_ip}"

        allowed, retry_after = limiter.is_allowed(client_key, requests, float(window_seconds))
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {requests} requests per {window_seconds}s.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
