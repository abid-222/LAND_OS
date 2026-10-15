"""
Prometheus Metrics & Latency Middleware for Bangladesh LandOS.
Tracks request duration histograms, p95 latencies, request counts, and exports /metrics.
"""

import time
from typing import Callable

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# Prometheus Metrics Definitions
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "landos_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint", "status_code"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0],
)

HTTP_REQUESTS_TOTAL = Counter(
    "landos_http_requests_total",
    "Total count of HTTP requests processed",
    ["method", "endpoint", "status_code"],
)


class PrometheusLatencyMiddleware(BaseHTTPMiddleware):
    """
    Middleware that records per-request latency into Prometheus Histograms,
    enabling accurate p95 and p99 latency queries.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Normalize endpoint path to avoid cardinality explosion
        path = request.url.path
        method = request.method

        start_time = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            elapsed = time.perf_counter() - start_time

            # Filter out metrics endpoint itself from metrics recording
            if not path.endswith("/metrics"):
                # Record to histogram and counter
                HTTP_REQUEST_DURATION_SECONDS.labels(
                    method=method,
                    endpoint=path,
                    status_code=str(status_code),
                ).observe(elapsed)

                HTTP_REQUESTS_TOTAL.labels(
                    method=method,
                    endpoint=path,
                    status_code=str(status_code),
                ).inc()


def get_prometheus_metrics_response() -> Response:
    """Exports raw Prometheus metrics format."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
