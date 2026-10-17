"""
Route Protection and Authorization Audit Test for Bangladesh LandOS.
Asserts that every endpoint in the API either:
1. Enforces an explicit authentication / RBAC dependency (e.g., require, get_current_user), OR
2. Is registered in the explicit, intentional PUBLIC_ROUTES allowlist.
Fails immediately if any newly added route lacks authorization protection and is not marked public.
"""

from typing import List, Set, Tuple

from fastapi.routing import APIRoute

from app.main import app

# Explicit list of endpoints intentionally accessible to unauthenticated citizens or external services
INTENTIONAL_PUBLIC_ROUTES: Set[Tuple[str, str]] = {
    # Documentation & System
    ("GET", "/"),
    ("GET", "/docs"),
    ("GET", "/redoc"),
    ("GET", "/docs/oauth2-redirect"),
    ("GET", "/api/v1/openapi.json"),
    ("GET", "/metrics"),
    ("GET", "/api/v1/metrics"),
    # Health checks
    ("GET", "/api/v1/health"),
    ("GET", "/api/v1/health/liveness"),
    ("GET", "/api/v1/health/readiness"),
    # Auth endpoints
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/refresh"),
    ("POST", "/api/v1/auth/password/reset-request"),
    ("POST", "/api/v1/auth/password/reset-confirm"),
    # Public Scan & QR verification
    ("POST", "/api/v1/scan/qr"),
    # Public Citizen Land Search & Record Details
    ("GET", "/api/v1/search"),
    ("POST", "/api/v1/search"),
    ("GET", "/api/v1/records/{record_id}"),
    # Public Citizen Legal Guide
    ("POST", "/api/v1/guide/query"),
    ("POST", "/api/v1/guide/ask"),
    # Public Cadastral Map Viewers
    ("GET", "/api/v1/map/parcels"),
    ("GET", "/api/v1/map/parcels/{synthetic_id}"),
    ("GET", "/api/v1/map/parcels/{synthetic_id}/summary"),
    # Public Buyer Due Diligence Reports
    ("POST", "/api/v1/parcels/{parcel_id}/buyer-report"),
    ("GET", "/api/v1/buyer-reports/{report_id}"),
    ("GET", "/api/v1/buyer-reports/{report_id}/print"),
    # Public ML Benchmarks & Simulation
    ("POST", "/api/v1/ml/extract"),
    ("POST", "/api/v1/ml/simulate-conflict"),
    ("POST", "/api/v1/ml/visual-forensics"),
    # Citizen Consent
    ("POST", "/api/v1/consent"),
    ("GET", "/api/v1/consent/latest"),
    # Public Quality Assessment & Summary
    ("GET", "/api/v1/quality/summary"),
    ("POST", "/api/v1/quality/score"),
    # Public Namjari Application Tracking (P4 track code)
    ("GET", "/api/v1/namjari/track/{tracking_code}"),
}


def _collect_all_routes() -> List[Tuple[str, str, APIRoute]]:
    collected = []
    for r in app.routes:
        if hasattr(r, "original_router"):
            prefix = getattr(r.include_context, "prefix", "")
            for sub in r.original_router.routes:
                if isinstance(sub, APIRoute):
                    path = prefix + sub.path
                    for method in sub.methods:
                        if method != "HEAD":
                            collected.append((method, path, sub))
        elif isinstance(r, APIRoute):
            for method in r.methods:
                if method != "HEAD":
                    collected.append((method, r.path, r))
    return collected


def _has_auth_protection(route: APIRoute) -> bool:
    """Checks whether an APIRoute enforces authentication or RBAC dependencies."""
    all_dependants = [route.dependant] + list(route.dependant.dependencies)

    for dep in all_dependants:
        # Check parameter / dependency name
        param_name = getattr(dep, "name", "") or ""
        if param_name in ("current_user", "user"):
            return True

        call = getattr(dep, "call", None)
        if call is not None:
            qualname = getattr(call, "__qualname__", "").lower()
            name = getattr(call, "__name__", "").lower()

            if any(
                k in qualname or k in name
                for k in ("require", "current_user", "auth", "rbac", "permission")
            ):
                return True

            # Inspect closure variables for Permission or Role
            closure = getattr(call, "__closure__", None)
            if closure:
                for cell in closure:
                    val = getattr(cell, "cell_contents", None)
                    val_str = str(val).lower()
                    if "permission." in val_str or "role." in val_str or "scope." in val_str:
                        return True

        # Check sub-dependencies
        for sub_dep in getattr(dep, "dependencies", []):
            sub_name = getattr(sub_dep, "name", "") or ""
            if sub_name in ("current_user", "user"):
                return True
            sub_call = getattr(sub_dep, "call", None)
            if sub_call is not None:
                sub_qname = getattr(sub_call, "__qualname__", "").lower()
                if any(
                    k in sub_qname
                    for k in ("require", "current_user", "auth", "rbac", "permission")
                ):
                    return True

    return False


def test_every_route_has_auth_or_is_explicitly_public():
    """
    Scans all registered routes. Ensures every route has security dependency or public marker.
    """
    all_routes = _collect_all_routes()
    assert len(all_routes) >= 60, f"Expected at least 60 routes, found {len(all_routes)}"

    unprotected_routes = []

    for method, path, route in all_routes:
        # Check if route is marked public
        if (method, path) in INTENTIONAL_PUBLIC_ROUTES:
            continue

        if not _has_auth_protection(route):
            unprotected_routes.append(f"{method} {path}")

    assert not unprotected_routes, (
        f"Found {len(unprotected_routes)} route(s) lacking authorization protection "
        f"and not listed in INTENTIONAL_PUBLIC_ROUTES:\n" + "\n".join(unprotected_routes)
    )
