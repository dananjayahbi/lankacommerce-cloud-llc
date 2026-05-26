"""
apps/webstore/views/tenant_views.py

Tenant admin API stub views — all return HTTP 501 Not Implemented.
These stubs ensure URLs are routable during Phase 1.
Real implementations are added in Phase 3 (tenant admin API).

Endpoint group: /api/webstore/...  (JWT auth required — staff/owner)
"""

from django.http import HttpResponse


def _not_implemented(request, *args, **kwargs) -> HttpResponse:
    return HttpResponse(status=501)


# -------------------------------------------------------------------
# Webstore management
# -------------------------------------------------------------------

def webstore_config(request) -> HttpResponse:
    return _not_implemented(request)


def webstore_setup(request) -> HttpResponse:
    return _not_implemented(request)


def webstore_settings(request) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Theme store / installation
# -------------------------------------------------------------------

def theme_list(request) -> HttpResponse:
    return _not_implemented(request)


def theme_install(request, theme_id: str) -> HttpResponse:
    return _not_implemented(request)


def theme_purchase(request, theme_id: str) -> HttpResponse:
    return _not_implemented(request)


def my_themes(request) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Block library
# -------------------------------------------------------------------

def block_list(request) -> HttpResponse:
    return _not_implemented(request)


def block_schema(request, block_type: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Menus
# -------------------------------------------------------------------

def menu_list_create(request) -> HttpResponse:
    return _not_implemented(request)


def menu_detail(request, menu_id: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Collections
# -------------------------------------------------------------------

def collection_list_create(request) -> HttpResponse:
    return _not_implemented(request)


def collection_detail(request, collection_id: str) -> HttpResponse:
    return _not_implemented(request)


def collection_products(request, collection_id: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Pages
# -------------------------------------------------------------------

def page_list_create(request) -> HttpResponse:
    return _not_implemented(request)


def page_detail(request, page_id: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Orders (admin view)
# -------------------------------------------------------------------

def order_list(request) -> HttpResponse:
    return _not_implemented(request)


def order_detail(request, order_id: str) -> HttpResponse:
    return _not_implemented(request)


def order_status_update(request, order_id: str) -> HttpResponse:
    return _not_implemented(request)


def order_fulfill(request, order_id: str) -> HttpResponse:
    return _not_implemented(request)


# -------------------------------------------------------------------
# Customers (admin view)
# -------------------------------------------------------------------

def customer_list(request) -> HttpResponse:
    return _not_implemented(request)


def customer_detail(request, customer_id: str) -> HttpResponse:
    return _not_implemented(request)
