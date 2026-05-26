"""
apps/webstore/views/admin_views.py

SuperAdmin API stub views — all return HTTP 501 Not Implemented.
These stubs ensure URLs are routable during Phase 1.
Real implementations are added in Phase 9 (theme store & superadmin).

Endpoint group: /api/webstore/admin/...  (SUPER_ADMIN role required)
"""

from django.http import HttpResponse


def _not_implemented(request, *args, **kwargs) -> HttpResponse:
    return HttpResponse(status=501)


# -------------------------------------------------------------------
# Theme management (SuperAdmin)
# -------------------------------------------------------------------

def theme_list_create(request) -> HttpResponse:
    """GET list / POST create a platform theme."""
    return _not_implemented(request)


def theme_detail(request, theme_id: str) -> HttpResponse:
    """GET / PUT a specific platform theme."""
    return _not_implemented(request)


def theme_publish(request, theme_id: str) -> HttpResponse:
    """PATCH — toggle is_published on a platform theme."""
    return _not_implemented(request)


# -------------------------------------------------------------------
# Block management (SuperAdmin)
# -------------------------------------------------------------------

def block_list_create(request) -> HttpResponse:
    """GET list / POST create a platform block definition."""
    return _not_implemented(request)


def block_detail(request, block_id: str) -> HttpResponse:
    """GET / PUT a specific block definition."""
    return _not_implemented(request)


def block_publish(request, block_id: str) -> HttpResponse:
    """PATCH — toggle is_published on a block."""
    return _not_implemented(request)
