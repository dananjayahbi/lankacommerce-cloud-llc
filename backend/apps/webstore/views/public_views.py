"""
apps/webstore/views/public_views.py

Public storefront API stub views — all return HTTP 501 Not Implemented.
These stubs ensure URLs are routable during Phase 1.
Real implementations are added in Phase 2 (product APIs) and
Phase 7 (consumer storefront pages).

Endpoint group: GET /api/webstore/public/<slug>/...
"""

from django.http import HttpResponse


def _not_implemented(request, *args, **kwargs) -> HttpResponse:
    return HttpResponse(status=501)


# -------------------------------------------------------------------
# Store config (used by storefront on every page render)
# -------------------------------------------------------------------

def store_config(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Products
# -------------------------------------------------------------------

def product_list(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


def product_detail(request, slug: str, handle: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Collections
# -------------------------------------------------------------------

def collection_list(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


def collection_detail(request, slug: str, handle: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Pages
# -------------------------------------------------------------------

def page_detail(request, slug: str, handle: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Menus
# -------------------------------------------------------------------

def menu_detail(request, slug: str, handle: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Search
# -------------------------------------------------------------------

def search(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Consumer account (register / login)
# -------------------------------------------------------------------

def customer_register(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


def customer_login(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Orders (consumer-facing)
# -------------------------------------------------------------------

def order_create(request, slug: str) -> HttpResponse:
    return _not_implemented(request)


def order_status(request, slug: str, order_number: str) -> HttpResponse:
    return _not_implemented(request)
