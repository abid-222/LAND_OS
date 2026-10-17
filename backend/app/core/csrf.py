import secrets

from fastapi import HTTPException, Request, status

EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/password/reset-request",
    "/api/v1/auth/password/reset-confirm",
    "/api/v1/auth/refresh",
    "/api/v1/scan/qr",
    "/api/v1/search",
    "/api/v1/guide/ask",
    "/api/v1/guide/query",
}


def generate_csrf_token() -> str:
    """Generates cryptographically random URL-safe CSRF token."""
    return secrets.token_urlsafe(32)


def verify_csrf(request: Request):
    """
    Validates CSRF protection for cookie-authenticated state-changing requests.
    If the client sends authentication via cookies for POST/PUT/PATCH/DELETE,
    verifies that the X-CSRF-Token header matches the landos_csrf_token cookie.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    path = request.url.path
    if path in EXEMPT_PATHS or any(path.endswith(p) for p in EXEMPT_PATHS):
        return

    # Check if request is authenticated via cookie
    has_auth_cookie = "landos_access_token" in request.cookies

    if has_auth_cookie:
        csrf_cookie = request.cookies.get("landos_csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")

        if (
            not csrf_cookie
            or not csrf_header
            or not secrets.compare_digest(csrf_cookie, csrf_header)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF protection error: Invalid or missing CSRF token header.",
            )
