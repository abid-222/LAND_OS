"""
Rate Limiting Dependency for Bangladesh LandOS.
Supports IP and token-based rate limits with sliding-window accounting.
"""

import time
from collections import defaultdict
from typing import Callable, Dict, List

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter.
    Thread-safe within asyncio event loop.
    """

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self.enabled: bool = True

    def is_allowed(self, client_key: str, max_requests: int, window_seconds: float) -> tuple[bool, int]:
        if not getattr(self, "enabled", True):
            return True, 0

        now = time.time()
        window_start = now - window_seconds

        # Prune old timestamps
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


limiter = InMemoryRateLimiter()


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
