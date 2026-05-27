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
from django.http import Http404
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
# Phase 8 — consumer account & order creation
# ---------------------------------------------------------------------------

import logging

from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny as _AllowAny

import jwt as pyjwt

from apps.webstore.models import WebstoreCustomer
from apps.webstore.serializers.order_serializers import (
    ConsumerLoginSerializer,
    ConsumerRegisterSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
)
from apps.webstore.services.consumer_auth_service import (
    decode_consumer_token,
    issue_consumer_tokens,
)
from apps.webstore.services.order_service import create_order
from apps.webstore.services.payhere_service import build_payment_initiation_data
from apps.webstore.throttling import (
    WebstoreLoginThrottle,
    WebstoreOrderThrottle,
    WebstoreRegisterThrottle,
)

_ph8_logger = logging.getLogger(__name__)


def _get_consumer_from_request(request, tenant):
    """
    Extract and validate a consumer JWT from the Authorization header.

    Returns the WebstoreCustomer instance or None if unauthenticated.
    Does NOT raise — unauthenticated consumers still access guest endpoints.
    """
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        payload = decode_consumer_token(token)
        return WebstoreCustomer.objects.get(
            id=payload["sub"],
            tenant=tenant,
            deleted_at__isnull=True,
            is_active=True,
        )
    except Exception:
        return None


@api_view(["POST"])
@permission_classes([_AllowAny])
@throttle_classes([WebstoreRegisterThrottle])
def customer_register(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/customers/register/

    Creates a new consumer account and returns JWT tokens.
    Enforces email uniqueness within the tenant.
    """
    tenant = storefront_service.resolve_tenant(slug)
    webstore = _get_webstore_or_404(tenant)

    # Require customer accounts to be enabled
    if webstore.customer_accounts == "disabled":
        return Response(
            {"detail": "Customer accounts are not enabled for this store."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ConsumerRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    d = serializer.validated_data
    email = d["email"]

    # Enforce email uniqueness within tenant
    if WebstoreCustomer.objects.filter(
        tenant=tenant, email=email, deleted_at__isnull=True
    ).exists():
        return Response(
            {"email": "An account with this email already exists."},
            status=status.HTTP_409_CONFLICT,
        )

    customer = WebstoreCustomer.objects.create(
        tenant=tenant,
        email=email,
        first_name=d.get("first_name", ""),
        last_name=d.get("last_name", ""),
        phone=d.get("phone", ""),
        password_hash=make_password(d["password"]),
        accepts_marketing=d.get("accepts_marketing", False),
    )

    tokens = issue_consumer_tokens(customer)

    return Response(
        {
            "customer": {
                "id": str(customer.id),
                "email": customer.email,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
            },
            "access": tokens["access"],
            "refresh": tokens["refresh"],
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([_AllowAny])
@throttle_classes([WebstoreLoginThrottle])
def customer_login(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/customers/login/

    Authenticates a consumer and returns JWT tokens.
    """
    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    serializer = ConsumerLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    d = serializer.validated_data
    email = d["email"]
    password = d["password"]

    try:
        from django.contrib.auth.hashers import check_password as _check_password

        customer = WebstoreCustomer.objects.get(
            tenant=tenant,
            email=email,
            deleted_at__isnull=True,
            is_active=True,
        )
    except WebstoreCustomer.DoesNotExist:
        return Response(
            {"detail": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from django.contrib.auth.hashers import check_password as _check_password

    if not _check_password(password, customer.password_hash):
        return Response(
            {"detail": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    customer.last_login_at = timezone.now()
    customer.save(update_fields=["last_login_at"])

    tokens = issue_consumer_tokens(customer)

    return Response(
        {
            "customer": {
                "id": str(customer.id),
                "email": customer.email,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
            },
            "access": tokens["access"],
            "refresh": tokens["refresh"],
        }
    )


@api_view(["POST"])
@permission_classes([_AllowAny])
@throttle_classes([WebstoreOrderThrottle])
def order_create(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/orders/

    Creates a new order. Prices are ALWAYS re-fetched from the database;
    any unit_price submitted by the client is silently ignored.

    Returns the new order + PayHere payment initiation data.
    """
    tenant = storefront_service.resolve_tenant(slug)
    webstore = _get_webstore_or_404(tenant)

    serializer = OrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    from django.core.exceptions import ValidationError as DjValidationError

    try:
        order = create_order(tenant, serializer.validated_data)
    except DjValidationError as exc:
        return Response(
            exc.message_dict if hasattr(exc, "message_dict") else {"detail": str(exc)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Build PayHere payment data (server-side hash, merchant_secret stays server-side)
    payhere_data = None
    try:
        payhere_data = build_payment_initiation_data(order, webstore, tenant)
    except Exception:
        _ph8_logger.exception("Failed to build PayHere data for order %s", order.order_number)

    return Response(
        {
            "order": OrderDetailSerializer(order).data,
            "payhere": payhere_data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([_AllowAny])
@throttle_classes([WebstoreOrderThrottle])
def stripe_order_checkout_session(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/stripe/checkout-session/

    Creates a WebstoreOrder (same as order_create) and immediately creates a
    Stripe Checkout Session for that order.

    Returns:
        {
          "order_number": "WS-0001",
          "stripe_checkout_url": "https://checkout.stripe.com/pay/cs_test_..."
        }

    The frontend should redirect the browser to stripe_checkout_url.
    On success Stripe redirects to the success_url with session_id appended.
    """
    from apps.webstore.services.stripe_service import create_webstore_checkout_session

    tenant = storefront_service.resolve_tenant(slug)
    webstore = _get_webstore_or_404(tenant)

    serializer = OrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    from django.core.exceptions import ValidationError as DjValidationError

    try:
        order = create_order(tenant, serializer.validated_data)
    except DjValidationError as exc:
        return Response(
            exc.message_dict if hasattr(exc, "message_dict") else {"detail": str(exc)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Build the Stripe checkout session
    from django.conf import settings as django_settings

    storefront_url = getattr(django_settings, "WEBSTORE_BASE_URL", "https://{slug}.lankacommerce.com")
    base_url = storefront_url.replace("{slug}", slug)

    success_url = (
        f"{base_url}/checkout/success"
        f"?order_number={order.order_number}"
        f"&session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel_url = f"{base_url}/checkout?cancelled=1"

    currency = getattr(webstore, "currency", "LKR") or "LKR"

    try:
        checkout_url = create_webstore_checkout_session(
            order=order,
            tenant_slug=slug,
            tenant_name=getattr(tenant, "name", slug),
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except RuntimeError as exc:
        _ph8_logger.error("Stripe not configured: %s", exc)
        return Response(
            {"detail": "Payment gateway (Stripe) is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        _ph8_logger.exception(
            "Failed to create Stripe checkout session for order %s",
            order.order_number,
        )
        return Response(
            {"detail": "Failed to initiate payment. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "order_number": order.order_number,
            "stripe_checkout_url": checkout_url,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([_AllowAny])
def order_status(request, slug: str, order_number: str) -> Response:
    """
    GET /api/webstore/public/<slug>/orders/<order_number>/

    Returns the current status of an order for client-side polling after
    the PayHere redirect. Used to detect payment_status == "paid".
    """
    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    try:
        from apps.webstore.models import WebstoreOrder

        order = WebstoreOrder.objects.get(
            tenant=tenant,
            order_number=order_number,
            deleted_at__isnull=True,
        )
    except Exception:
        return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(OrderDetailSerializer(order).data)


@api_view(["GET"])
@permission_classes([_AllowAny])
def consumer_order_list(request, slug: str) -> Response:
    """
    GET /api/webstore/public/<slug>/customers/orders/

    Returns the authenticated consumer's order history (newest first).
    Requires a valid consumer JWT in the Authorization header.
    """
    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    customer = _get_consumer_from_request(request, tenant)
    if customer is None:
        return Response(
            {"detail": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from apps.webstore.models import WebstoreOrder
    from apps.webstore.serializers.order_serializers import OrderSummarySerializer

    orders = (
        WebstoreOrder.objects.filter(
            tenant=tenant,
            customer=customer,
            deleted_at__isnull=True,
        )
        .order_by("-created_at")[:50]
    )

    return Response({"orders": OrderSummarySerializer(orders, many=True).data})


# ---------------------------------------------------------------------------
# Custom domain resolution  (Phase 10)
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([_AllowAny])
def resolve_domain(request) -> Response:
    """
    GET /api/webstore/resolve-domain/?domain=<hostname>

    Looks up TenantWebstore by storefront_domain and returns the tenant slug.
    Used by the Next.js middleware to map custom domains → tenant slugs.

    Returns:
      200  { "tenant_slug": "...", "tenant_id": "..." }   if found
      400  { "detail": "Missing domain parameter." }       if no domain param
      404  { "detail": "Domain not found." }               if not registered

    This endpoint is intentionally public — it only returns slugs, never
    sensitive data. Abuse is mitigated by CDN-level rate limiting.
    """
    domain = request.query_params.get("domain", "").strip().lower()
    if not domain:
        return Response(
            {"detail": "Missing domain parameter."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        webstore = TenantWebstore.objects.select_related("tenant").get(
            storefront_domain=domain,
            is_enabled=True,
        )
    except TenantWebstore.DoesNotExist:
        return Response({"detail": "Domain not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response(
        {
            "tenant_slug": webstore.tenant.slug,
            "tenant_id": str(webstore.tenant.id),
        }
    )


# ---------------------------------------------------------------------------
# Password-protected store verification  (Phase 10)
# ---------------------------------------------------------------------------


@api_view(["POST"])
@permission_classes([_AllowAny])
def verify_store_password(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/verify-password/

    Body: { "password": "<plain-text-password>" }

    Verifies the submitted password against the bcrypt hash stored in
    TenantWebstore.store_password_hash. Never returns the hash.

    Returns:
      200  { "verified": true }   on success
      401  { "verified": false }  on wrong password
      404                         if store is not password-protected or not found
    """
    tenant = storefront_service.resolve_tenant(slug)

    try:
        webstore = tenant.webstore
    except TenantWebstore.DoesNotExist:
        raise Http404("Store not found")

    if not webstore.is_password_protected:
        raise Http404("Store is not password protected")

    submitted = request.data.get("password", "")
    if not submitted or not isinstance(submitted, str):
        return Response(
            {"detail": "Missing password."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if webstore.store_password_hash and check_password(submitted, webstore.store_password_hash):
        return Response({"verified": True}, status=status.HTTP_200_OK)

    return Response({"verified": False}, status=status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Blog public views  (Phase 10)
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([_AllowAny])
def blog_list(request, slug: str) -> Response:
    """
    GET /api/webstore/public/<slug>/blog/

    Returns paginated list of published blog posts, sorted by published_at DESC.
    """
    from apps.webstore.models import WebstoreBlogPost

    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    page, page_size = _parse_page_params(request)

    qs = WebstoreBlogPost.objects.filter(
        tenant=tenant, is_published=True
    ).order_by("-published_at")

    total = qs.count()
    offset = (page - 1) * page_size
    posts = qs[offset: offset + page_size]

    data = [
        {
            "id": str(p.id),
            "title": p.title,
            "handle": p.handle,
            "author_name": p.author_name,
            "excerpt": p.excerpt,
            "featured_image_url": p.featured_image_url,
            "published_at": p.published_at,
            "tags": p.tags,
            "seo_title": p.seo_title or p.title,
            "seo_description": p.seo_description or p.excerpt,
        }
        for p in posts
    ]

    return Response({"posts": data, "meta": _pagination_meta(total, page, page_size)})


@api_view(["GET"])
@permission_classes([_AllowAny])
def blog_detail(request, slug: str, handle: str) -> Response:
    """
    GET /api/webstore/public/<slug>/blog/<handle>/

    Returns a single published blog post by handle.
    """
    from apps.webstore.models import WebstoreBlogPost

    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    try:
        post = WebstoreBlogPost.objects.get(
            tenant=tenant, handle=handle, is_published=True
        )
    except WebstoreBlogPost.DoesNotExist:
        raise Http404("Blog post not found")

    return Response(
        {
            "id": str(post.id),
            "title": post.title,
            "handle": post.handle,
            "author_name": post.author_name,
            "body_html": post.body_html,
            "excerpt": post.excerpt,
            "featured_image_url": post.featured_image_url,
            "published_at": post.published_at,
            "tags": post.tags,
            "seo_title": post.seo_title or post.title,
            "seo_description": post.seo_description or post.excerpt,
        }
    )


# ---------------------------------------------------------------------------
# Product reviews public views  (Phase 10)
# ---------------------------------------------------------------------------


@api_view(["GET", "POST"])
@permission_classes([_AllowAny])
def product_reviews(request, slug: str, handle: str) -> Response:
    """
    GET  /api/webstore/public/<slug>/products/<handle>/reviews/
    POST /api/webstore/public/<slug>/products/<handle>/reviews/

    GET:  Returns paginated list of approved reviews for a product.
    POST: Submit a new review. Requires reviewer_name, reviewer_email,
          rating (1-5), title, body.
    """
    from apps.webstore.models import WebstoreProductReview
    from apps.catalog.models import Product

    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    # Resolve product
    try:
        from django.core.validators import validate_uuid
        validate_uuid = __import__("uuid")
        product_uuid = str(validate_uuid.UUID(handle))
        product = Product.objects.get(id=product_uuid, tenant=tenant, is_archived=False, deleted_at=None)
    except Exception:
        raise Http404("Product not found")

    if request.method == "GET":
        page, page_size = _parse_page_params(request)
        qs = WebstoreProductReview.objects.filter(
            product=product, is_approved=True
        ).order_by("-created_at")
        total = qs.count()
        offset = (page - 1) * page_size
        reviews = qs[offset: offset + page_size]

        # Aggregate rating summary
        from django.db.models import Avg, Count
        summary = WebstoreProductReview.objects.filter(
            product=product, is_approved=True
        ).aggregate(avg_rating=Avg("rating"), total_count=Count("id"))

        data = [
            {
                "id": str(r.id),
                "reviewer_name": r.reviewer_name,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": r.created_at,
            }
            for r in reviews
        ]
        return Response(
            {
                "reviews": data,
                "meta": _pagination_meta(total, page, page_size),
                "summary": {
                    "average_rating": round(summary["avg_rating"] or 0, 1),
                    "total_reviews": summary["total_count"] or 0,
                },
            }
        )

    # POST — submit a review
    data = request.data
    required = ["reviewer_name", "reviewer_email", "rating", "title", "body"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return Response(
            {"detail": f"Missing fields: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    rating = data.get("rating")
    try:
        rating = int(rating)
        if not 1 <= rating <= 5:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {"detail": "Rating must be an integer between 1 and 5."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine if consumer is logged in and has a verified purchase
    customer = _get_consumer_from_request(request, tenant)
    is_verified = False
    if customer:
        from apps.webstore.models import WebstoreOrder
        is_verified = WebstoreOrder.objects.filter(
            tenant=tenant,
            customer=customer,
            status__in=["confirmed", "processing", "shipped", "delivered"],
            deleted_at__isnull=True,
        ).filter(
            # Check line_items JSON for this product (simple string search)
            line_items__contains=[{"product_id": str(product.id)}],
        ).exists()

    review = WebstoreProductReview.objects.create(
        tenant=tenant,
        product=product,
        customer=customer,
        reviewer_name=str(data["reviewer_name"])[:100],
        reviewer_email=str(data["reviewer_email"])[:254],
        rating=rating,
        title=str(data.get("title", ""))[:255],
        body=str(data.get("body", "")),
        is_approved=False,
        is_verified_purchase=is_verified,
    )

    return Response(
        {"id": str(review.id), "message": "Review submitted and pending approval."},
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# Analytics page view  (Phase 10)
# ---------------------------------------------------------------------------


@api_view(["POST"])
@permission_classes([_AllowAny])
def analytics_pageview(request, slug: str) -> Response:
    """
    POST /api/webstore/public/<slug>/analytics/pageview/

    Records an anonymous page view event.
    Body: { page_type, page_handle, referrer (optional), session_id (optional) }
    """
    from apps.webstore.models import WebstoreAnalyticsEvent
    import uuid as _uuid

    # Only record in production mode to avoid polluting with dev traffic
    analytics_enabled = request.query_params.get("force") == "1"
    # Actual production gate happens on the frontend; backend always stores
    # so the tenant gets accurate data regardless.

    tenant = storefront_service.resolve_tenant(slug)
    _get_webstore_or_404(tenant)

    data = request.data
    page_type = str(data.get("page_type", "unknown"))[:50]
    page_handle = str(data.get("page_handle", ""))[:200]

    session_id_raw = data.get("session_id")
    session_id = None
    if session_id_raw:
        try:
            session_id = _uuid.UUID(str(session_id_raw))
        except ValueError:
            pass

    WebstoreAnalyticsEvent.objects.create(
        tenant=tenant,
        event_type="pageview",
        page_type=page_type,
        page_handle=page_handle,
        session_id=session_id,
    )

    return Response({"recorded": True}, status=status.HTTP_201_CREATED)
