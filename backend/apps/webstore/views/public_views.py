"""
apps/webstore/views/public_views.py

Public storefront API views (Phase 2).
All endpoints are unauthenticated (permission_classes=[AllowAny]).
Tenant identity is resolved from the URL <slug> parameter — never from JWT.

Endpoint reference:
  GET  /api/webstore/public/<slug>/config/
  GET  /api/webstore/public/<slug>/products/
  GET  /api/webstore/public/<slug>/products/<handle>/
  GET  /api/webstore/public/<slug>/collections/
  GET  /api/webstore/public/<slug>/collections/<handle>/
  GET  /api/webstore/public/<slug>/pages/<handle>/
  GET  /api/webstore/public/<slug>/menus/<handle>/
  GET  /api/webstore/public/<slug>/search/

Performance constraints (met via select_related + prefetch_related):
  /config/                ≤ 3 DB queries
  /products/              ≤ 4 DB queries
  /products/<handle>/     ≤ 4 DB queries
  /collections/<handle>/  ≤ 5 DB queries
  /search/                ≤ 3 DB queries

Security:
  - AllowAny — no auth header required or processed on these views.
  - Password-protected stores: X-Store-Password header checked on catalog
    endpoints when TenantWebstore.is_password_protected=True.
  - Cache-Control headers set on /config/ for Next.js ISR revalidation.
"""

import math

from django.contrib.auth.hashers import check_password
from django.http import Http404, HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product
from apps.webstore.models import (
    TenantWebstore,
    WebstoreCollection,
    WebstoreMenu,
    WebstorePage,
)
from apps.webstore.serializers.public_serializers import (
    PublicCollectionDetailSerializer,
    PublicCollectionSummarySerializer,
    PublicMenuSerializer,
    PublicPageSerializer,
    PublicProductDetailSerializer,
    PublicProductSummarySerializer,
    PublicThemeSerializer,
)
from apps.webstore.services import storefront_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_webstore_or_404(tenant) -> TenantWebstore:
    """
    Returns the TenantWebstore for the tenant.
    Raises Http404 if the webstore record does not exist or is disabled,
    so that catalog endpoints return 404 when the store is not live.
    """
    try:
        webstore = tenant.webstore
    except TenantWebstore.DoesNotExist:
        raise Http404("Store not found")
    if not webstore.is_enabled:
        raise Http404("Store not found")
    return webstore


def _check_password_protection(request: Request, webstore: TenantWebstore) -> bool:
    """
    Returns True if the request may access a password-protected store.
    Reads the raw password from the X-Store-Password request header and
    verifies it against the stored hash via Django's check_password().
    Phase 10 will extend this with cookie-based session tokens.
    """
    if not webstore.is_password_protected:
        return True
    provided = request.headers.get("X-Store-Password", "")
    if not provided or not webstore.store_password_hash:
        return False
    return check_password(provided, webstore.store_password_hash)


def _pagination_meta(total: int, page: int, page_size: int) -> dict:
    total_pages = math.ceil(total / page_size) if page_size else 1
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def _parse_page_params(request: Request) -> tuple[int, int]:
    """Parses and clamps ?page and ?page_size query params."""
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = min(48, max(1, int(request.query_params.get("page_size", 24))))
    except (ValueError, TypeError):
        page_size = 24
    return page, page_size


# ---------------------------------------------------------------------------
# 4.1  Store config
# ---------------------------------------------------------------------------


class StoreConfigView(APIView):
    """
    GET /api/webstore/public/<slug>/config/

    Returns the full store configuration for the Next.js layout on every page
    render: active theme config, global settings and store state.

    When is_enabled=False: returns HTTP 200 with {is_enabled: false} so the
    Next.js component can render a "Coming Soon" page rather than a 404.

    Cache-Control: public, max-age=60, stale-while-revalidate=300 enables
    Next.js ISR revalidation without requiring explicit on-demand revalidation.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)

        store_data = storefront_service.get_active_store_config(tenant)
        webstore: TenantWebstore = store_data["webstore"]
        theme = store_data["theme"]
        config_data = store_data["config"]

        if not webstore.is_enabled:
            response = Response({"is_enabled": False})
            response["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
            return response

        payload = {
            "is_enabled": True,
            "is_password_protected": webstore.is_password_protected,
            # Tenant identity fields
            "tenant_name": tenant.name,
            "slug": tenant.slug,
            "logo_url": tenant.logo_url,
            "currency": tenant.settings.get("currency", "LKR"),
            "currency_symbol": tenant.settings.get("currency_symbol", "Rs"),
            # SEO / social
            "seo_title": webstore.seo_title or tenant.name,
            "seo_description": webstore.seo_description,
            "social_image_url": webstore.social_image_url,
            # Behaviour settings
            "customer_accounts": webstore.customer_accounts,
            "cart_settings": webstore.cart_settings,
            "theme_config": config_data,
            "theme": PublicThemeSerializer(theme).data if theme else None,
        }

        response = Response(payload)
        response["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return response


store_config = StoreConfigView.as_view()


# ---------------------------------------------------------------------------
# 4.2  Product list
# ---------------------------------------------------------------------------


class ProductListView(APIView):
    """
    GET /api/webstore/public/<slug>/products/

    Paginated, filtered and sorted product catalogue.
    Supports query params: collection, sort, search, page, page_size,
    min_price, max_price, category.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        webstore = _get_webstore_or_404(tenant)

        if not _check_password_protection(request, webstore):
            return Response({"detail": "Store is password protected."}, status=403)

        page, page_size = _parse_page_params(request)
        qp = request.query_params
        collection_handle = qp.get("collection")

        if collection_handle:
            try:
                collection = WebstoreCollection.objects.get(
                    tenant=tenant, handle=collection_handle, is_published=True
                )
            except WebstoreCollection.DoesNotExist:
                return Response({"detail": "Collection not found."}, status=404)

            products_qs, total = storefront_service.resolve_collection_products(
                collection=collection,
                tenant=tenant,
                page=page,
                page_size=page_size,
                sort=qp.get("sort"),
            )
            return Response(
                {
                    "products": PublicProductSummarySerializer(products_qs, many=True).data,
                    "meta": _pagination_meta(total, page, page_size),
                }
            )

        products_qs = storefront_service.get_storefront_products(
            tenant,
            category=qp.get("category"),
            search=qp.get("search"),
            sort=qp.get("sort", "newest"),
            min_price=qp.get("min_price"),
            max_price=qp.get("max_price"),
        )

        total = products_qs.count()
        offset = (page - 1) * page_size
        page_qs = products_qs[offset : offset + page_size]

        return Response(
            {
                "products": PublicProductSummarySerializer(page_qs, many=True).data,
                "meta": _pagination_meta(total, page, page_size),
            }
        )


product_list = ProductListView.as_view()


# ---------------------------------------------------------------------------
# 4.3  Product detail
# ---------------------------------------------------------------------------


class ProductDetailView(APIView):
    """
    GET /api/webstore/public/<slug>/products/<handle>/

    Full product detail with variants, images, options and related products.
    <handle> is the product UUID (the catalog Product model has no slug field).
    Returns 404 for archived/deleted products and for invalid UUID handles.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str, handle: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        webstore = _get_webstore_or_404(tenant)

        if not _check_password_protection(request, webstore):
            return Response({"detail": "Store is password protected."}, status=403)

        try:
            product = (
                Product.objects.filter(
                    id=handle,
                    tenant=tenant,
                    is_archived=False,
                    deleted_at=None,
                )
                .select_related("category", "brand")
                .prefetch_related("variants")
                .get()
            )
        except (Product.DoesNotExist, ValueError):
            # ValueError raised by Django when handle is not a valid UUID
            raise Http404("Product not found")

        return Response(PublicProductDetailSerializer(product).data)


product_detail = ProductDetailView.as_view()


# ---------------------------------------------------------------------------
# 4.4  Collection list
# ---------------------------------------------------------------------------


class CollectionListView(APIView):
    """
    GET /api/webstore/public/<slug>/collections/

    All published collections. Used by the Collections page and header nav.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        webstore = _get_webstore_or_404(tenant)

        if not _check_password_protection(request, webstore):
            return Response({"detail": "Store is password protected."}, status=403)

        collections = WebstoreCollection.objects.filter(
            tenant=tenant, is_published=True
        ).order_by("title")

        return Response(PublicCollectionSummarySerializer(collections, many=True).data)


collection_list = CollectionListView.as_view()


# ---------------------------------------------------------------------------
# 4.5  Collection detail + embedded products
# ---------------------------------------------------------------------------


class CollectionDetailView(APIView):
    """
    GET /api/webstore/public/<slug>/collections/<handle>/

    Collection metadata plus a paginated, sorted product list resolved from
    the collection's manual_product_ids (manual) or filter_rules (automated).
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str, handle: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        webstore = _get_webstore_or_404(tenant)

        if not _check_password_protection(request, webstore):
            return Response({"detail": "Store is password protected."}, status=403)

        try:
            collection = WebstoreCollection.objects.get(
                tenant=tenant, handle=handle, is_published=True
            )
        except WebstoreCollection.DoesNotExist:
            raise Http404("Collection not found")

        page, page_size = _parse_page_params(request)
        sort = request.query_params.get("sort")

        products_qs, total = storefront_service.resolve_collection_products(
            collection=collection,
            tenant=tenant,
            page=page,
            page_size=page_size,
            sort=sort,
        )

        return Response(
            {
                "collection": PublicCollectionDetailSerializer(collection).data,
                "products": PublicProductSummarySerializer(products_qs, many=True).data,
                "meta": _pagination_meta(total, page, page_size),
            }
        )


collection_detail = CollectionDetailView.as_view()


# ---------------------------------------------------------------------------
# 4.6  Static page
# ---------------------------------------------------------------------------


class PageDetailView(APIView):
    """
    GET /api/webstore/public/<slug>/pages/<handle>/

    Returns a single published static page by handle.
    body_html is returned as stored (sanitized with bleach on write in Phase 1).
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str, handle: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        _get_webstore_or_404(tenant)

        try:
            page = WebstorePage.objects.get(
                tenant=tenant, handle=handle, is_published=True
            )
        except WebstorePage.DoesNotExist:
            raise Http404("Page not found")

        return Response(PublicPageSerializer(page).data)


page_detail = PageDetailView.as_view()


# ---------------------------------------------------------------------------
# 4.7  Navigation menu
# ---------------------------------------------------------------------------


class MenuDetailView(APIView):
    """
    GET /api/webstore/public/<slug>/menus/<handle>/

    Returns a navigation menu by handle. items tree is returned as stored;
    resource_ids are NOT expanded to full objects (Phase 2 scope).
    Returns 404 when no menu exists for the handle.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str, handle: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        _get_webstore_or_404(tenant)

        try:
            menu = WebstoreMenu.objects.get(tenant=tenant, handle=handle)
        except WebstoreMenu.DoesNotExist:
            raise Http404("Menu not found")

        return Response(PublicMenuSerializer(menu).data)


menu_detail = MenuDetailView.as_view()


# ---------------------------------------------------------------------------
# 4.8  Product search
# ---------------------------------------------------------------------------


class SearchView(APIView):
    """
    GET /api/webstore/public/<slug>/search/?q=<query>

    icontains search across Product.name, Product.description and
    ProductVariant.sku. Returns the same product summary shape as /products/.
    Returns 400 when ?q is absent or blank.
    Returns empty results (not 404) when no products match.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        tenant = storefront_service.resolve_tenant(slug)
        webstore = _get_webstore_or_404(tenant)

        if not _check_password_protection(request, webstore):
            return Response({"detail": "Store is password protected."}, status=403)

        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "Search query is required."}, status=400)

        page, page_size = _parse_page_params(request)
        sort = request.query_params.get("sort", "newest")

        products_qs = storefront_service.get_storefront_products(
            tenant, search=query, sort=sort
        )

        total = products_qs.count()
        offset = (page - 1) * page_size
        page_qs = products_qs[offset : offset + page_size]

        return Response(
            {
                "products": PublicProductSummarySerializer(page_qs, many=True).data,
                "meta": _pagination_meta(total, page, page_size),
            }
        )


search = SearchView.as_view()


# ---------------------------------------------------------------------------
# Phase 8 stubs — consumer account & order creation
# ---------------------------------------------------------------------------


def customer_register(request, slug: str) -> HttpResponse:
    return HttpResponse(status=501)


def customer_login(request, slug: str) -> HttpResponse:
    return HttpResponse(status=501)


def order_create(request, slug: str) -> HttpResponse:
    return HttpResponse(status=501)


def order_status(request, slug: str, order_number: str) -> HttpResponse:
    return HttpResponse(status=501)
