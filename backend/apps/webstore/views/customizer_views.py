"""
apps/webstore/views/customizer_views.py

Visual theme customizer API stub views — all return HTTP 501 Not Implemented.
These stubs ensure URLs are routable during Phase 1.
Real implementations are added in Phase 5 (visual theme customizer).

Endpoint group: /api/webstore/customizer/...  (JWT auth required — merchant)
"""

from django.http import HttpResponse


def _not_implemented(request, *args, **kwargs) -> HttpResponse:
    return HttpResponse(status=501)


def active_config(request) -> HttpResponse:
    """GET — returns full active TenantThemeConfig for customizer initialization."""
    return _not_implemented(request)


def draft_config(request) -> HttpResponse:
    """GET / PATCH — returns or partial-updates the draft TenantThemeConfig."""
    return _not_implemented(request)


def publish(request) -> HttpResponse:
    """POST — promotes DRAFT → ACTIVE (makes changes live)."""
    return _not_implemented(request)


def discard_draft(request) -> HttpResponse:
    """POST — resets DRAFT to match the current ACTIVE config."""
    return _not_implemented(request)
