"""
Pure ASGI Request Timeout Middleware for Bangladesh LandOS.
Enforces per-route-class timeouts:
- 60s extended timeout for heavy operations: /documents, /scan, /ml, /reports, /buyer-reports, /namjari
- Exempt for streaming endpoints: SSE (/events), /metrics, /docs, /redoc, /openapi.json
- 15s standard timeout for typical API transactions
"""

import asyncio
import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestTimeoutMiddleware:
    """
    Pure ASGI Middleware that enforces safe per-route timeouts without BaseHTTPMiddleware streaming cancellation bugs.
    """

    def __init__(
        self,
        app: ASGIApp,
        default_timeout: float = 15.0,
        extended_timeout: float = 60.0,
        timeout_seconds: float | None = None,
    ):
        self.app = app
        self.default_timeout = timeout_seconds if timeout_seconds is not None else default_timeout
        self.extended_timeout = extended_timeout
        self.extended_prefixes = (
            "/api/v1/documents",
            "/api/v1/scan",
            "/api/v1/ml",
            "/api/v1/reports",
            "/api/v1/buyer-reports",
            "/api/v1/parcels",
            "/api/v1/namjari",
            "/api/v1/quality",
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # Exempt SSE streaming, metrics, and API documentation from timeout
        if (
            path.endswith("/events")
            or path.endswith("/metrics")
            or "/docs" in path
            or "/redoc" in path
            or "/openapi.json" in path
        ):
            await self.app(scope, receive, send)
            return

        # Determine route-class timeout threshold
        timeout = (
            self.extended_timeout
            if any(path.startswith(prefix) for prefix in self.extended_prefixes)
            else self.default_timeout
        )

        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await asyncio.wait_for(
                self.app(scope, receive, send_wrapper),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            if not response_started:
                body = json.dumps(
                    {
                        "detail": f"Request processing timed out (exceeded {timeout}s threshold).",
                        "path": path,
                    }
                ).encode("utf-8")
                await send(
                    {
                        "type": "http.response.start",
                        "status": 504,
                        "headers": [
                            (b"content-type", b"application/json"),
                            (b"content-length", str(len(body)).encode("utf-8")),
                        ],
                    }
                )
                await send(
                    {
                        "type": "http.response.body",
                        "body": body,
                    }
                )
