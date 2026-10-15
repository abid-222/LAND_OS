"""
Request Timeout Middleware for Bangladesh LandOS.
Enforces default 5s request timeout across non-streaming endpoints.
"""

import asyncio
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    """
    Aborts requests exceeding default timeout (5.0 seconds).
    Exempts Server-Sent Events (SSE) and documentation/metrics endpoints.
    """

    def __init__(self, app: ASGIApp, timeout_seconds: float = 5.0):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Exempt SSE streaming endpoints, metrics, and docs from timeout
        if path.endswith("/events") or path.endswith("/metrics") or "/docs" in path:
            return await call_next(request)

        try:
            return await asyncio.wait_for(call_next(request), timeout=self.timeout_seconds)
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=504,
                content={
                    "detail": f"Request processing timed out (exceeded {self.timeout_seconds}s threshold)",
                    "path": path,
                },
            )
