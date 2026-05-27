"""
apps/webstore/views/tenant_views.py

Tenant admin API — authenticated staff endpoints for managing a store's
webstore configuration, themes, content, and orders.

All views require:
  - JWTAuthentication
  - IsAuthenticated
  - HasWebstoreFeature   (plan feature gate)

Tenant isolation: every queryset is scoped to ``request.user.tenant``.
Multi-table writes are wrapped in ``transaction.atomic()``.
"""

import copy
import logging
import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpResponse
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.webstore.models import (
    TenantThemeConfig,
    TenantWebstore,
    ThemeConfigStatus,
    WebstoreBlock,
    WebstoreCollection,
    WebstoreMenu,
    WebstorePage,
    WebstoreTheme,
)
from apps.webstore.permissions import HasWebstoreFeature
from apps.webstore.serializers.tenant_serializers import (
    TenantThemeConfigDetailSerializer,
    TenantThemeConfigListSerializer,
    TenantWebstoreSerializer,
    WebstoreBlockSerializer,
    WebstoreCollectionListSerializer,
    WebstoreCollectionSerializer,
    WebstoreMenuListSerializer,
    WebstoreMenuSerializer,
    WebstorePageListSerializer,
    WebstorePageSerializer,
    WebstoreThemeListSerializer,
)
from apps.webstore.services import theme_service
from apps.webstore.services.collection_service import (
    resolve_automated_collection_products,
)

logger = logging.getLogger(__name__)

_AUTH = [JWTAuthentication]
_PERMS = [IsAuthenticated, HasWebstoreFeature]


def _tenant(request: Request):
    """Shortcut — returns the authenticated user's tenant."""
    return request.user.tenant


# ---------------------------------------------------------------------------
# Webstore management
# ---------------------------------------------------------------------------


class WebstoreConfigView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _build_response(self, tenant, webstore):
        """Build a flat response dict matching the frontend WebstoreConfig interface."""
        active_config = (
            TenantThemeConfig.objects.select_related("theme")
            .filter(tenant=tenant, status=ThemeConfigStatus.ACTIVE)
            .first()
        )
        draft_config = (
            TenantThemeConfig.objects.select_related("theme")
            .filter(tenant=tenant, status=ThemeConfigStatus.DRAFT)
            .first()
        )
        cart = webstore.cart_settings or {}
        active_theme = None
        if active_config:
            active_theme = {
                "id": str(active_config.theme.id),
                "theme_name": active_config.theme.name,
                "theme_version": active_config.theme.version,
                "preview_image_url": active_config.theme.preview_image_url or None,
            }
        return {
            "id": str(webstore.id),
            "slug": tenant.slug,
            "is_enabled": webstore.is_enabled,
            "is_password_protected": webstore.is_password_protected,
            "password_protected": webstore.is_password_protected,
            "seo_title": webstore.seo_title,
            "seo_description": webstore.seo_description,
            "social_image_url": webstore.social_image_url,
            "storefront_domain": webstore.storefront_domain,
            "custom_domain_verified": False,
            "customer_accounts": (webstore.customer_accounts or "optional").upper(),
            "require_login_for_cart": cart.get("require_login", False),
            "allow_order_notes": cart.get("enable_notes", False),
            "show_shipping_calculator": cart.get("enable_shipping_calculator", False),
            "active_theme": active_theme,
            "active_config_id": str(active_config.pk) if active_config else None,
            "draft_config_id": str(draft_config.pk) if draft_config else None,
        }

    def get(self, request: Request) -> Response:
        tenant = _tenant(request)
        try:
            webstore = TenantWebstore.objects.get(tenant=tenant)
        except TenantWebstore.DoesNotExist:
            return Response(
                {"detail": "Webstore not set up yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self._build_response(tenant, webstore))

    @transaction.atomic
    def patch(self, request: Request) -> Response:
        tenant = _tenant(request)
        try:
            webstore = TenantWebstore.objects.get(tenant=tenant)
        except TenantWebstore.DoesNotExist:
            return Response(
                {"detail": "Webstore not set up yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = request.data

        # Direct scalar fields
        for field in ("is_enabled", "seo_title", "seo_description",
                      "social_image_url", "storefront_domain"):
            if field in data:
                setattr(webstore, field, data[field])

        # Password protection
        if "is_password_protected" in data:
            webstore.is_password_protected = data["is_password_protected"]
        if "password_protected" in data:
            webstore.is_password_protected = data["password_protected"]
        if "store_password" in data and data["store_password"]:
            from django.contrib.auth.hashers import make_password
            webstore.store_password_hash = make_password(data["store_password"])

        # customer_accounts (frontend sends uppercase, store lowercase)
        if "customer_accounts" in data:
            webstore.customer_accounts = data["customer_accounts"].lower()

        # cart_settings sub-fields
        cart = webstore.cart_settings or {}
        if "require_login_for_cart" in data:
            cart["require_login"] = data["require_login_for_cart"]
        if "allow_order_notes" in data:
            cart["enable_notes"] = data["allow_order_notes"]
        if "show_shipping_calculator" in data:
            cart["enable_shipping_calculator"] = data["show_shipping_calculator"]
        webstore.cart_settings = cart

        webstore.save()
        return Response(self._build_response(tenant, webstore))


# Django URL conf expects plain functions; wire class-based views here.
webstore_config = WebstoreConfigView.as_view()


class WebstoreSetupView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    @transaction.atomic
    def post(self, request: Request) -> Response:
        tenant = _tenant(request)

        if TenantWebstore.objects.filter(tenant=tenant).exists():
            return Response(
                {
                    "detail": (
                        "Webstore is already set up. "
                        "Use PATCH /api/webstore/settings/ to update settings."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        seo_title = request.data.get("seo_title", "")
        seo_description = request.data.get("seo_description", "")
        theme_id = request.data.get("theme_id")

        # Resolve theme
        if theme_id:
            try:
                theme = WebstoreTheme.objects.get(pk=theme_id, is_published=True)
            except WebstoreTheme.DoesNotExist:
                return Response(
                    {"detail": "Theme not found or not published."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            theme = WebstoreTheme.objects.filter(is_default=True).first()
            if theme is None:
                theme = WebstoreTheme.objects.filter(is_published=True).first()

        # Create TenantWebstore
        webstore = TenantWebstore.objects.create(
            tenant=tenant,
            is_enabled=True,
            seo_title=seo_title,
            seo_description=seo_description,
        )

        # Install theme as ACTIVE config
        if theme:
            TenantThemeConfig.objects.create(
                tenant=tenant,
                theme=theme,
                status=ThemeConfigStatus.ACTIVE,
                config=copy.deepcopy(theme.default_config),
            )

        # Create two default menus
        WebstoreMenu.objects.create(
            tenant=tenant, title="Main Menu", handle="main-menu", items=[]
        )
        WebstoreMenu.objects.create(
            tenant=tenant, title="Footer", handle="footer", items=[]
        )

        return Response(
            TenantWebstoreSerializer(webstore).data,
            status=status.HTTP_201_CREATED,
        )


webstore_setup = WebstoreSetupView.as_view()


class WebstoreSettingsView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        try:
            webstore = TenantWebstore.objects.get(tenant=_tenant(request))
        except TenantWebstore.DoesNotExist:
            return Response(
                {"detail": "Webstore not set up yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TenantWebstoreSerializer(webstore).data)

    def patch(self, request: Request) -> Response:
        return self._update(request, partial=True)

    def put(self, request: Request) -> Response:
        return self._update(request, partial=False)

    def _update(self, request: Request, partial: bool) -> Response:
        try:
            webstore = TenantWebstore.objects.get(tenant=_tenant(request))
        except TenantWebstore.DoesNotExist:
            return Response(
                {"detail": "Webstore not set up yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TenantWebstoreSerializer(
            webstore, data=request.data, partial=partial, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


webstore_settings = WebstoreSettingsView.as_view()


# ---------------------------------------------------------------------------
# Theme store / installation
# ---------------------------------------------------------------------------


class ThemeListView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        qs = WebstoreTheme.objects.filter(is_published=True)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        is_free_param = request.query_params.get("is_free")
        if is_free_param is not None:
            qs = qs.filter(is_free=is_free_param.lower() == "true")

        # Pre-compute installed theme IDs for this tenant in a single query.
        tenant = _tenant(request)
        installed_ids = set(
            TenantThemeConfig.objects.filter(tenant=tenant)
            .values_list("theme_id", flat=True)
        )
        serializer = WebstoreThemeListSerializer(
            qs,
            many=True,
            context={"installed_theme_ids": installed_ids},
        )
        return Response(serializer.data)


theme_list = ThemeListView.as_view()


class ThemeInstallView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def post(self, request: Request, theme_id) -> Response:
        tenant = _tenant(request)
        try:
            theme = WebstoreTheme.objects.get(pk=theme_id, is_published=True)
        except WebstoreTheme.DoesNotExist:
            return Response(
                {"detail": "Theme not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not theme.is_free:
            # Check whether the tenant has purchased this theme.
            # A purchase is represented by any TenantThemeConfig with
            # a purchased_blocks entry — Phase 9 will implement proper
            # purchase tracking; for now we gate on existing installs.
            already_purchased = TenantThemeConfig.objects.filter(
                tenant=tenant, theme=theme
            ).exists()
            if not already_purchased:
                return Response(
                    {"detail": "This theme requires a purchase before installation."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            draft = theme_service.install_theme(tenant, theme)
        except ValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"id": str(draft.pk), "status": draft.status},
            status=status.HTTP_201_CREATED,
        )


theme_install = ThemeInstallView.as_view()


class ThemePurchaseView(APIView):
    """Placeholder — full implementation in Phase 9 (Theme Store / SuperAdmin)."""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def post(self, request: Request, theme_id) -> Response:
        return Response(
            {"detail": "Theme purchasing will be available in a future update."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


theme_purchase = ThemePurchaseView.as_view()


class MyThemesView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        configs = (
            TenantThemeConfig.objects.select_related("theme")
            .filter(tenant=_tenant(request))
            .order_by("-updated_at")
        )
        return Response(TenantThemeConfigListSerializer(configs, many=True).data)


my_themes = MyThemesView.as_view()


# ---------------------------------------------------------------------------
# Block library
# ---------------------------------------------------------------------------


class BlockListView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        qs = WebstoreBlock.objects.filter(is_published=True)

        block_type = request.query_params.get("type")
        if block_type:
            qs = qs.filter(type=block_type)

        # Determine which premium blocks the tenant has purchased.
        tenant = _tenant(request)
        active_config = (
            TenantThemeConfig.objects.filter(
                tenant=tenant, status=ThemeConfigStatus.ACTIVE
            ).first()
        )
        purchased_block_types: set = set()
        if active_config:
            purchased_block_types = set(
                (active_config.purchased_blocks or {}).keys()
            )

        serializer = WebstoreBlockSerializer(
            qs,
            many=True,
            context={"purchased_block_types": purchased_block_types},
        )
        return Response(serializer.data)


block_list = BlockListView.as_view()


class BlockSchemaView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request, block_type: str) -> Response:
        try:
            block = WebstoreBlock.objects.get(type=block_type, is_published=True)
        except WebstoreBlock.DoesNotExist:
            return Response(
                {"detail": "Block type not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(WebstoreBlockSerializer(block).data)


block_schema = BlockSchemaView.as_view()


# ---------------------------------------------------------------------------
# Menus
# ---------------------------------------------------------------------------


class MenuListCreateView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        menus = WebstoreMenu.objects.filter(tenant=_tenant(request)).order_by("title")
        return Response(WebstoreMenuListSerializer(menus, many=True).data)

    def post(self, request: Request) -> Response:
        serializer = WebstoreMenuSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(tenant=_tenant(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)


menu_list_create = MenuListCreateView.as_view()


class MenuDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_menu(self, request: Request, menu_id):
        try:
            return WebstoreMenu.objects.get(pk=menu_id, tenant=_tenant(request))
        except WebstoreMenu.DoesNotExist:
            return None

    def get(self, request: Request, menu_id) -> Response:
        menu = self._get_menu(request, menu_id)
        if menu is None:
            return Response(
                {"detail": "Menu not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(WebstoreMenuSerializer(menu).data)

    def put(self, request: Request, menu_id) -> Response:
        menu = self._get_menu(request, menu_id)
        if menu is None:
            return Response(
                {"detail": "Menu not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = WebstoreMenuSerializer(
            menu, data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, menu_id) -> Response:
        menu = self._get_menu(request, menu_id)
        if menu is None:
            return Response(
                {"detail": "Menu not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Safety check: warn if this menu handle is referenced in the active config.
        active_config = (
            TenantThemeConfig.objects.filter(
                tenant=_tenant(request), status=ThemeConfigStatus.ACTIVE
            ).first()
        )
        if active_config:
            config_json = str(active_config.config)
            if f'"{menu.handle}"' in config_json or f"'{menu.handle}'" in config_json:
                return Response(
                    {
                        "detail": (
                            f"Menu '{menu.handle}' is referenced in your active theme "
                            "config. Update your theme settings before deleting this menu."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        menu.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


menu_detail = MenuDetailView.as_view()


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------


class CollectionListCreateView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        collections = WebstoreCollection.objects.filter(
            tenant=_tenant(request)
        ).order_by("-created_at")
        return Response(
            WebstoreCollectionListSerializer(collections, many=True).data
        )

    def post(self, request: Request) -> Response:
        data = request.data.copy()
        # Auto-generate handle from title if not provided.
        if not data.get("handle") and data.get("title"):
            data["handle"] = slugify(data["title"])

        serializer = WebstoreCollectionSerializer(
            data=data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(tenant=_tenant(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)


collection_list_create = CollectionListCreateView.as_view()


class CollectionDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_collection(self, request: Request, collection_id):
        try:
            return WebstoreCollection.objects.get(
                pk=collection_id, tenant=_tenant(request)
            )
        except WebstoreCollection.DoesNotExist:
            return None

    def get(self, request: Request, collection_id) -> Response:
        from apps.webstore.serializers.public_serializers import PublicProductSummarySerializer  # noqa: PLC0415

        collection = self._get_collection(request, collection_id)
        if collection is None:
            return Response(
                {"detail": "Collection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        detail_data = WebstoreCollectionSerializer(collection).data

        # Attach first-page product list.
        if collection.collection_type == "manual":
            from apps.catalog.models import Product  # noqa: PLC0415
            product_qs = (
                Product.objects.filter(
                    pk__in=collection.manual_product_ids or [],
                    tenant=_tenant(request),
                    is_archived=False,
                    deleted_at=None,
                )
                .select_related("category", "brand")
                .prefetch_related("variants")
            )
        else:
            product_qs = resolve_automated_collection_products(collection)

        detail_data["products"] = PublicProductSummarySerializer(
            product_qs[:20], many=True
        ).data
        return Response(detail_data)

    def put(self, request: Request, collection_id) -> Response:
        collection = self._get_collection(request, collection_id)
        if collection is None:
            return Response(
                {"detail": "Collection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = request.data.copy()
        if not data.get("handle") and data.get("title"):
            data["handle"] = slugify(data["title"])
        serializer = WebstoreCollectionSerializer(
            collection, data=data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, collection_id) -> Response:
        collection = self._get_collection(request, collection_id)
        if collection is None:
            return Response(
                {"detail": "Collection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Warn if the collection is referenced in any menu item.
        menus = WebstoreMenu.objects.filter(tenant=_tenant(request))
        for menu in menus:
            if str(collection.pk) in str(menu.items):
                return Response(
                    {
                        "detail": (
                            f"Collection is referenced in menu '{menu.title}'. "
                            "Remove it from the menu before deleting."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


collection_detail = CollectionDetailView.as_view()


class CollectionProductsView(APIView):
    """PATCH — add / remove products from a manual collection."""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def patch(self, request: Request, collection_id) -> Response:
        try:
            collection = WebstoreCollection.objects.get(
                pk=collection_id, tenant=_tenant(request)
            )
        except WebstoreCollection.DoesNotExist:
            return Response(
                {"detail": "Collection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if collection.collection_type != "manual":
            return Response(
                {
                    "detail": (
                        "Products can only be manually managed on manual collections. "
                        "This is an automated collection."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        add_ids = request.data.get("add", [])
        remove_ids = request.data.get("remove", [])

        if not isinstance(add_ids, list) or not isinstance(remove_ids, list):
            return Response(
                {"detail": "'add' and 'remove' must be lists of product UUIDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current = list(collection.manual_product_ids or [])
        add_set = set(str(pid) for pid in add_ids)
        remove_set = set(str(pid) for pid in remove_ids)

        current = [pid for pid in current if pid not in remove_set]
        for pid in add_set:
            if pid not in current:
                current.append(pid)

        collection.manual_product_ids = current
        collection.save(update_fields=["manual_product_ids", "updated_at"])

        return Response(
            {"product_count": len(current), "manual_product_ids": current}
        )


collection_products = CollectionProductsView.as_view()


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------


class PageListCreateView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        pages = WebstorePage.objects.filter(
            tenant=_tenant(request)
        ).order_by("-updated_at")
        return Response(WebstorePageListSerializer(pages, many=True).data)

    def post(self, request: Request) -> Response:
        data = request.data.copy()
        if not data.get("handle") and data.get("title"):
            data["handle"] = slugify(data["title"])
        serializer = WebstorePageSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(tenant=_tenant(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)


page_list_create = PageListCreateView.as_view()


class PageDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_page(self, request: Request, page_id):
        try:
            return WebstorePage.objects.get(pk=page_id, tenant=_tenant(request))
        except WebstorePage.DoesNotExist:
            return None

    def get(self, request: Request, page_id) -> Response:
        page = self._get_page(request, page_id)
        if page is None:
            return Response(
                {"detail": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(WebstorePageSerializer(page).data)

    def put(self, request: Request, page_id) -> Response:
        page = self._get_page(request, page_id)
        if page is None:
            return Response(
                {"detail": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = request.data.copy()
        if not data.get("handle") and data.get("title"):
            data["handle"] = slugify(data["title"])
        serializer = WebstorePageSerializer(
            page, data=data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, page_id) -> Response:
        page = self._get_page(request, page_id)
        if page is None:
            return Response(
                {"detail": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        page.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


page_detail = PageDetailView.as_view()


# ---------------------------------------------------------------------------
# Orders / Customers — Phase 8 full implementation
# ---------------------------------------------------------------------------

from apps.webstore.models import WebstoreCustomer, WebstoreOrder
from apps.webstore.serializers.order_serializers import (
    OrderDetailSerializer,
    OrderFulfillSerializer,
    OrderSummarySerializer,
    WebstoreCustomerSummarySerializer,
)
from apps.webstore.services.order_service import fulfill_order


class OrderListView(APIView):
    """
    GET /api/webstore/orders/?status=<status>&payment_status=<ps>

    Returns paginated orders for the authenticated tenant.
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        tenant = _tenant(request)
        qs = WebstoreOrder.objects.filter(
            tenant=tenant, deleted_at__isnull=True
        ).order_by("-created_at")

        # Optional filters
        if order_status := request.query_params.get("status"):
            qs = qs.filter(status=order_status)
        if payment_status := request.query_params.get("payment_status"):
            qs = qs.filter(payment_status=payment_status)
        if fulfillment_status := request.query_params.get("fulfillment_status"):
            qs = qs.filter(fulfillment_status=fulfillment_status)

        # Pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 25))))
        except (TypeError, ValueError):
            page, page_size = 1, 25

        total = qs.count()
        offset = (page - 1) * page_size
        orders = qs[offset : offset + page_size]

        return Response(
            {
                "orders": OrderSummarySerializer(orders, many=True).data,
                "meta": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": max(1, (total + page_size - 1) // page_size),
                },
            }
        )


order_list = OrderListView.as_view()


class OrderDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_order(self, request: Request, order_id):
        try:
            return WebstoreOrder.objects.get(
                pk=order_id, tenant=_tenant(request), deleted_at__isnull=True
            )
        except WebstoreOrder.DoesNotExist:
            return None

    def get(self, request: Request, order_id) -> Response:
        order = self._get_order(request, order_id)
        if order is None:
            return Response(
                {"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(OrderDetailSerializer(order).data)


order_detail = OrderDetailView.as_view()


class OrderStatusUpdateView(APIView):
    """
    PATCH /api/webstore/orders/<uuid:order_id>/status/

    Allows tenant staff to manually update order status.
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def patch(self, request: Request, order_id) -> Response:
        try:
            order = WebstoreOrder.objects.get(
                pk=order_id, tenant=_tenant(request), deleted_at__isnull=True
            )
        except WebstoreOrder.DoesNotExist:
            return Response(
                {"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")
        valid_statuses = [
            "pending", "confirmed", "processing",
            "shipped", "delivered", "cancelled", "refunded",
        ]
        if new_status not in valid_statuses:
            return Response(
                {"status": f"Must be one of: {', '.join(valid_statuses)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderDetailSerializer(order).data)


order_status_update = OrderStatusUpdateView.as_view()


class OrderFulfillView(APIView):
    """
    POST /api/webstore/orders/<uuid:order_id>/fulfill/

    Marks an order as fulfilled and records tracking information.
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def post(self, request: Request, order_id) -> Response:
        try:
            order = WebstoreOrder.objects.get(
                pk=order_id, tenant=_tenant(request), deleted_at__isnull=True
            )
        except WebstoreOrder.DoesNotExist:
            return Response(
                {"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if order.fulfillment_status == "fulfilled":
            return Response(
                {"detail": "Order is already fulfilled."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = OrderFulfillSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        updated = fulfill_order(
            order,
            tracking_number=d.get("tracking_number", ""),
            tracking_carrier=d.get("tracking_carrier", ""),
        )
        return Response(OrderDetailSerializer(updated).data)


order_fulfill = OrderFulfillView.as_view()


class CustomerListView(APIView):
    """GET /api/webstore/customers/ — paginated consumer list for tenant admin."""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        tenant = _tenant(request)
        qs = WebstoreCustomer.objects.filter(
            tenant=tenant, deleted_at__isnull=True
        ).order_by("-created_at")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 25))))
        except (TypeError, ValueError):
            page, page_size = 1, 25

        total = qs.count()
        offset = (page - 1) * page_size
        customers = qs[offset : offset + page_size]

        return Response(
            {
                "customers": WebstoreCustomerSummarySerializer(customers, many=True).data,
                "meta": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": max(1, (total + page_size - 1) // page_size),
                },
            }
        )


customer_list = CustomerListView.as_view()


class CustomerDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request, customer_id) -> Response:
        try:
            customer = WebstoreCustomer.objects.get(
                pk=customer_id, tenant=_tenant(request), deleted_at__isnull=True
            )
        except WebstoreCustomer.DoesNotExist:
            return Response(
                {"detail": "Customer not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(WebstoreCustomerSummarySerializer(customer).data)


customer_detail = CustomerDetailView.as_view()




# ---------------------------------------------------------------------------
# Phase 10: Blog tenant admin views
# ---------------------------------------------------------------------------


class BlogListCreateView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        from apps.webstore.models import WebstoreBlogPost
        posts = WebstoreBlogPost.objects.filter(tenant=_tenant(request)).order_by("-created_at")
        data = [
            {
                "id": str(p.id),
                "title": p.title,
                "handle": p.handle,
                "author_name": p.author_name,
                "excerpt": p.excerpt,
                "featured_image_url": p.featured_image_url,
                "is_published": p.is_published,
                "published_at": p.published_at,
                "tags": p.tags,
                "seo_title": p.seo_title,
                "seo_description": p.seo_description,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
            }
            for p in posts
        ]
        return Response({"posts": data})

    def post(self, request: Request) -> Response:
        from apps.webstore.models import WebstoreBlogPost
        from django.utils.text import slugify as _slugify

        tenant = _tenant(request)
        d = request.data
        title = str(d.get("title", "")).strip()
        if not title:
            return Response({"detail": "title is required."}, status=status.HTTP_400_BAD_REQUEST)

        handle = str(d.get("handle", "") or _slugify(title))[:255]
        # Ensure handle uniqueness within tenant
        if WebstoreBlogPost.objects.filter(tenant=tenant, handle=handle).exists():
            handle = f"{handle}-{str(uuid.uuid4())[:8]}"

        post = WebstoreBlogPost.objects.create(
            tenant=tenant,
            title=title,
            handle=handle,
            author_name=str(d.get("author_name", ""))[:100],
            body_html=str(d.get("body_html", "")),
            excerpt=str(d.get("excerpt", ""))[:500],
            featured_image_url=str(d.get("featured_image_url", ""))[:200],
            tags=d.get("tags", []) if isinstance(d.get("tags"), list) else [],
            seo_title=str(d.get("seo_title", ""))[:60],
            seo_description=str(d.get("seo_description", ""))[:160],
            is_published=False,
        )
        return Response({"id": str(post.id), "handle": post.handle}, status=status.HTTP_201_CREATED)


blog_list_create = BlogListCreateView.as_view()


class BlogDetailView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_post(self, request, post_id):
        from apps.webstore.models import WebstoreBlogPost
        try:
            return WebstoreBlogPost.objects.get(pk=post_id, tenant=_tenant(request))
        except WebstoreBlogPost.DoesNotExist:
            return None

    def get(self, request: Request, post_id) -> Response:
        post = self._get_post(request, post_id)
        if not post:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "id": str(post.id),
            "title": post.title,
            "handle": post.handle,
            "author_name": post.author_name,
            "body_html": post.body_html,
            "excerpt": post.excerpt,
            "featured_image_url": post.featured_image_url,
            "is_published": post.is_published,
            "published_at": post.published_at,
            "tags": post.tags,
            "seo_title": post.seo_title,
            "seo_description": post.seo_description,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
        })

    def patch(self, request: Request, post_id) -> Response:
        post = self._get_post(request, post_id)
        if not post:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        d = request.data
        updatable = ["title", "author_name", "body_html", "excerpt", "featured_image_url", "seo_title", "seo_description"]
        for field in updatable:
            if field in d:
                setattr(post, field, d[field])
        if "tags" in d and isinstance(d["tags"], list):
            post.tags = d["tags"]
        post.save()
        return Response({"id": str(post.id)})

    def delete(self, request: Request, post_id) -> Response:
        post = self._get_post(request, post_id)
        if not post:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        tenant_slug = getattr(_tenant(request), "slug", None)
        post.delete()
        if tenant_slug:
            from apps.webstore.services.revalidation_service import trigger_blog_revalidation
            transaction.on_commit(lambda: trigger_blog_revalidation(tenant_slug))
        return Response(status=status.HTTP_204_NO_CONTENT)


blog_detail = BlogDetailView.as_view()


class BlogPublishView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def patch(self, request: Request, post_id) -> Response:
        from apps.webstore.models import WebstoreBlogPost
        from django.utils import timezone as _tz
        try:
            post = WebstoreBlogPost.objects.get(pk=post_id, tenant=_tenant(request))
        except WebstoreBlogPost.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "publish")
        if action == "unpublish":
            post.is_published = False
            post.save(update_fields=["is_published", "updated_at"])
        else:
            if not post.is_published:
                post.is_published = True
                post.published_at = _tz.now()
                post.save(update_fields=["is_published", "published_at", "updated_at"])

        tenant_slug = getattr(_tenant(request), "slug", None)
        if tenant_slug:
            from apps.webstore.services.revalidation_service import trigger_blog_revalidation
            transaction.on_commit(lambda: trigger_blog_revalidation(tenant_slug))

        return Response({"id": str(post.id), "is_published": post.is_published})


blog_publish = BlogPublishView.as_view()


# ---------------------------------------------------------------------------
# Phase 10: Product reviews moderation views
# ---------------------------------------------------------------------------


class ReviewListView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        from apps.webstore.models import WebstoreProductReview
        filter_status = request.query_params.get("status", "pending")
        qs = WebstoreProductReview.objects.filter(tenant=_tenant(request)).select_related("product")

        if filter_status == "pending":
            qs = qs.filter(is_approved=False)
        elif filter_status == "approved":
            qs = qs.filter(is_approved=True)

        qs = qs.order_by("-created_at")[:100]

        data = [
            {
                "id": str(r.id),
                "product_id": str(r.product_id),
                "product_name": r.product.name if r.product else "",
                "reviewer_name": r.reviewer_name,
                "rating": r.rating,
                "title": r.title,
                "body": r.body[:200],
                "is_approved": r.is_approved,
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": r.created_at,
            }
            for r in qs
        ]
        return Response({"reviews": data})


review_list = ReviewListView.as_view()


class ReviewApproveView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def patch(self, request: Request, review_id) -> Response:
        from apps.webstore.models import WebstoreProductReview
        try:
            review = WebstoreProductReview.objects.get(pk=review_id, tenant=_tenant(request))
        except WebstoreProductReview.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        review.is_approved = True
        review.save(update_fields=["is_approved"])
        return Response({"id": str(review.id), "is_approved": True})


review_approve = ReviewApproveView.as_view()


class ReviewRejectView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def patch(self, request: Request, review_id) -> Response:
        from apps.webstore.models import WebstoreProductReview
        try:
            review = WebstoreProductReview.objects.get(pk=review_id, tenant=_tenant(request))
        except WebstoreProductReview.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        review.is_approved = False
        review.save(update_fields=["is_approved"])
        return Response({"id": str(review.id), "is_approved": False})


review_reject = ReviewRejectView.as_view()


class ReviewDeleteView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def delete(self, request: Request, review_id) -> Response:
        from apps.webstore.models import WebstoreProductReview
        try:
            review = WebstoreProductReview.objects.get(pk=review_id, tenant=_tenant(request))
        except WebstoreProductReview.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


review_delete = ReviewDeleteView.as_view()


# ---------------------------------------------------------------------------
# Webstore stats endpoint  GET /api/webstore/stats/
# ---------------------------------------------------------------------------


class WebstoreStatsView(APIView):
    """Tenant-scoped stats for the webstore overview dashboard."""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        from apps.webstore.models import WebstoreOrder
        from django.db.models import Sum
        from django.utils import timezone as _tz
        import datetime

        tenant = _tenant(request)
        now = _tz.now()
        thirty_days_ago = now - datetime.timedelta(days=30)

        orders_qs = WebstoreOrder.objects.filter(
            tenant=tenant, deleted_at__isnull=True
        )

        orders_last_30 = orders_qs.filter(created_at__gte=thirty_days_ago).count()
        revenue_last_30 = (
            orders_qs.filter(
                created_at__gte=thirty_days_ago,
                payment_status="paid",
            ).aggregate(total=Sum("total"))["total"]
        ) or 0

        active_collections = WebstoreCollection.objects.filter(
            tenant=tenant, is_published=True
        ).count()

        published_pages = WebstorePage.objects.filter(
            tenant=tenant, is_published=True
        ).count()

        return Response(
            {
                "orders_last_30_days": orders_last_30,
                "revenue_last_30_days": float(revenue_last_30),
                "active_collections": active_collections,
                "published_pages": published_pages,
            }
        )


webstore_stats = WebstoreStatsView.as_view()


# ---------------------------------------------------------------------------
# Phase 10: Analytics tenant summary view
# ---------------------------------------------------------------------------


class AnalyticsSummaryView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        from apps.webstore.models import WebstoreAnalyticsEvent
        from django.db.models import Count
        from django.utils import timezone as _tz
        import datetime

        try:
            days = min(90, max(1, int(request.query_params.get("days", 30))))
        except (TypeError, ValueError):
            days = 30

        tenant = _tenant(request)
        since = _tz.now() - datetime.timedelta(days=days)

        qs = WebstoreAnalyticsEvent.objects.filter(
            tenant=tenant,
            event_type="pageview",
            created_at__gte=since,
        )

        total_views = qs.count()

        # Views by day (last N days)
        from django.db.models.functions import TruncDate
        views_by_day = list(
            qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Top 10 most viewed products
        top_products = list(
            qs.filter(page_type="product")
            .values("page_handle")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Views by page type
        by_page_type = list(
            qs.values("page_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Top 5 referrers — not stored in Phase 10 model, skip for now
        return Response(
            {
                "total_views": total_views,
                "days": days,
                "views_by_day": [
                    {"date": str(row["date"]), "count": row["count"]}
                    for row in views_by_day
                ],
                "top_products": [
                    {"handle": row["page_handle"], "views": row["count"]}
                    for row in top_products
                ],
                "by_page_type": [
                    {"page_type": row["page_type"], "count": row["count"]}
                    for row in by_page_type
                ],
            }
        )


analytics_summary = AnalyticsSummaryView.as_view()
