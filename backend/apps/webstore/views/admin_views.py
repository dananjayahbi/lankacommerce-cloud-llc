"""
apps/webstore/views/admin_views.py

SuperAdmin webstore management API — Phase 9 full implementation.

Endpoint group: /api/webstore/admin/...  (SUPER_ADMIN role required)

All write operations require IsSuperAdmin permission (not just IsAuthenticated).
JSON schema fields are validated structurally before persistence.
Theme version_number increments on every published-theme config update.
Audit entries are written via apps.accounts.models.AuditLog.
"""

import copy
import logging
from datetime import date

from django.db import transaction
from django.db.models import Count, F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.models import AuditLog
from apps.accounts.permissions import IsSuperAdmin
from apps.webstore.models import (
    TenantThemeConfig,
    TenantWebstore,
    ThemeConfigStatus,
    WebstoreBlock,
    WebstoreOrder,
    WebstoreTheme,
)
from apps.webstore.serializers.admin_serializers import (
    ThemeTenantInstallSerializer,
    WebstoreBlockAdminSerializer,
    WebstoreStatsSerializer,
    WebstoreThemeAdminDetailSerializer,
    WebstoreThemeAdminListSerializer,
    _validate_default_config,
)

logger = logging.getLogger(__name__)

_AUTH = [JWTAuthentication]
_PERMS = [IsAuthenticated, IsSuperAdmin]


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class StandardResultsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _audit(request: Request, action: str, detail: str, entity_id=None, entity_type: str = "WebstoreTheme") -> None:
    """Write an audit log entry. Failure is logged but never raised."""
    try:
        AuditLog.objects.create(
            actor_id=request.user.pk,
            actor_role=getattr(request.user, "role", ""),
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            after={"detail": detail},
            ip_address=_get_client_ip(request) or None,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write audit log for action '%s': %s", action, exc)


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _maybe_bump_version(theme: WebstoreTheme, old_config: dict, request: Request) -> None:
    """
    If the theme is published and its default_config has changed, increment
    version_number and write an audit log entry recording the old config for
    rollback reference.
    """
    if not theme.is_published:
        return
    if theme.default_config == old_config:
        return

    # Atomic increment — safe under concurrent requests
    WebstoreTheme.objects.filter(pk=theme.pk).update(
        version_number=F("version_number") + 1,
    )
    theme.refresh_from_db(fields=["version_number"])

    _audit(
        request,
        "theme_config_version_bump",
        (
            f"Theme '{theme.name}' (id={theme.pk}) version_number bumped to "
            f"{theme.version_number}. Old default_config snapshot recorded."
        ),
        entity_id=theme.pk,
    )
    # Second audit entry carries the old config snapshot for rollback reference
    try:
        AuditLog.objects.create(
            actor_id=request.user.pk,
            actor_role=getattr(request.user, "role", ""),
            entity_type="WebstoreTheme",
            entity_id=theme.pk,
            action="theme_config_snapshot",
            before={"theme_id": str(theme.pk), "old_config": old_config},
            after={"theme_id": str(theme.pk), "version_number": theme.version_number},
            ip_address=_get_client_ip(request) or None,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write config snapshot audit log: %s", exc)


# ---------------------------------------------------------------------------
# Theme Management
# ---------------------------------------------------------------------------


class ThemeListCreateView(APIView):
    """
    GET  /api/webstore/admin/themes/  — paginated list of all themes
    POST /api/webstore/admin/themes/  — create a new theme
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        qs = (
            WebstoreTheme.objects
            .annotate(tenant_count=Count("tenant_configs__tenant", distinct=True))
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter == "published":
            qs = qs.filter(is_published=True)
        elif status_filter == "draft":
            qs = qs.filter(is_published=False)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = WebstoreThemeAdminListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @transaction.atomic
    def post(self, request: Request) -> Response:
        serializer = WebstoreThemeAdminDetailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        theme = serializer.save()
        _audit(request, "theme_create", f"Created theme '{theme.name}' (slug={theme.slug})", entity_id=theme.pk)
        return Response(
            WebstoreThemeAdminDetailSerializer(theme).data,
            status=status.HTTP_201_CREATED,
        )


class ThemeDetailView(APIView):
    """
    GET   /api/webstore/admin/themes/<id>/  — theme detail
    PUT   /api/webstore/admin/themes/<id>/  — full update
    PATCH /api/webstore/admin/themes/<id>/  — partial update
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_theme(self, theme_id):
        try:
            return WebstoreTheme.objects.get(pk=theme_id)
        except WebstoreTheme.DoesNotExist:
            return None

    def get(self, request: Request, theme_id) -> Response:
        theme = self._get_theme(theme_id)
        if theme is None:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(WebstoreThemeAdminDetailSerializer(theme).data)

    @transaction.atomic
    def put(self, request: Request, theme_id) -> Response:
        theme = self._get_theme(theme_id)
        if theme is None:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = WebstoreThemeAdminDetailSerializer(theme, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        old_config = copy.deepcopy(theme.default_config)
        updated = serializer.save()
        _maybe_bump_version(updated, old_config, request)
        return Response(WebstoreThemeAdminDetailSerializer(updated).data)

    @transaction.atomic
    def patch(self, request: Request, theme_id) -> Response:
        theme = self._get_theme(theme_id)
        if theme is None:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = WebstoreThemeAdminDetailSerializer(
            theme, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        old_config = copy.deepcopy(theme.default_config)
        updated = serializer.save()
        _maybe_bump_version(updated, old_config, request)
        return Response(WebstoreThemeAdminDetailSerializer(updated).data)


class ThemePublishView(APIView):
    """PATCH /api/webstore/admin/themes/<id>/publish/"""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    @transaction.atomic
    def patch(self, request: Request, theme_id) -> Response:
        try:
            theme = WebstoreTheme.objects.get(pk=theme_id)
        except WebstoreTheme.DoesNotExist:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)

        errors = {}
        if not theme.preview_images and not theme.preview_image_url:
            errors["preview_images"] = (
                "At least one preview image is required before publishing."
            )
        if not theme.default_config:
            errors["default_config"] = "A valid default_config is required before publishing."
        else:
            from rest_framework import serializers as drf_serializers
            try:
                _validate_default_config(theme.default_config)
            except drf_serializers.ValidationError as exc:
                errors["default_config"] = str(exc.detail)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        theme.is_published = True
        theme.save(update_fields=["is_published", "updated_at"])
        _audit(request, "theme_publish", f"Published theme '{theme.name}' (id={theme.pk})", entity_id=theme.pk)
        return Response({"detail": "Theme published.", "is_published": True})


class ThemeUnpublishView(APIView):
    """PATCH /api/webstore/admin/themes/<id>/unpublish/"""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    @transaction.atomic
    def patch(self, request: Request, theme_id) -> Response:
        try:
            theme = WebstoreTheme.objects.get(pk=theme_id)
        except WebstoreTheme.DoesNotExist:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)

        # Guard: warn if tenants have this theme as their ACTIVE config
        active_tenant_count = TenantThemeConfig.objects.filter(
            theme=theme,
            status=ThemeConfigStatus.ACTIVE,
        ).count()
        if active_tenant_count > 0 and not request.data.get("force"):
            return Response(
                {
                    "detail": (
                        f"{active_tenant_count} tenant(s) currently have this theme as their "
                        "active storefront config. Their storefronts will fall back to the "
                        "platform default theme. Send {\"force\": true} to proceed anyway."
                    ),
                    "active_tenant_count": active_tenant_count,
                },
                status=status.HTTP_409_CONFLICT,
            )

        theme.is_published = False
        theme.save(update_fields=["is_published", "updated_at"])
        _audit(request, "theme_unpublish", f"Unpublished theme '{theme.name}' (id={theme.pk})", entity_id=theme.pk)
        return Response({"detail": "Theme unpublished.", "is_published": False})


class ThemeTenantsView(APIView):
    """GET /api/webstore/admin/themes/<id>/tenants/"""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request, theme_id) -> Response:
        try:
            theme = WebstoreTheme.objects.get(pk=theme_id)
        except WebstoreTheme.DoesNotExist:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)

        configs = (
            TenantThemeConfig.objects
            .filter(theme=theme, status__in=[ThemeConfigStatus.ACTIVE, ThemeConfigStatus.DRAFT])
            .select_related("tenant")
            .order_by("-created_at")
        )
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(configs, request)
        serializer = ThemeTenantInstallSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ThemeForceUpdateTenantsView(APIView):
    """
    PATCH /api/webstore/admin/themes/<id>/force-update-tenants/

    Creates a new DRAFT TenantThemeConfig from the theme's current default_config
    for every tenant currently using this theme.  Irreversible — requires
    {"confirm": true} in the request body.
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    @transaction.atomic
    def patch(self, request: Request, theme_id) -> Response:
        if not request.data.get("confirm"):
            return Response(
                {
                    "detail": (
                        "This operation is irreversible. "
                        'Send {"confirm": true} to proceed.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            theme = WebstoreTheme.objects.get(pk=theme_id)
        except WebstoreTheme.DoesNotExist:
            return Response({"detail": "Theme not found."}, status=status.HTTP_404_NOT_FOUND)

        if not theme.is_published:
            return Response(
                {"detail": "Cannot force-update tenants for an unpublished theme."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_ids = (
            TenantThemeConfig.objects
            .filter(theme=theme, status__in=[ThemeConfigStatus.ACTIVE, ThemeConfigStatus.DRAFT])
            .values_list("tenant_id", flat=True)
            .distinct()
        )

        updated = 0
        for tenant_id in tenant_ids:
            TenantThemeConfig.objects.filter(
                tenant_id=tenant_id,
                theme=theme,
                status=ThemeConfigStatus.DRAFT,
            ).update(status=ThemeConfigStatus.ARCHIVED)
            TenantThemeConfig.objects.create(
                tenant_id=tenant_id,
                theme=theme,
                status=ThemeConfigStatus.DRAFT,
                config=copy.deepcopy(theme.default_config),
            )
            updated += 1

        _audit(request, "theme_force_update_tenants",
            f"Force-created {updated} DRAFT configs for theme '{theme.name}' (id={theme.pk})",
            entity_id=theme.pk,
        )
        return Response(
            {"detail": f"Created fresh DRAFT configs for {updated} tenant(s)."},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Block Definition Management
# ---------------------------------------------------------------------------


class BlockListCreateView(APIView):
    """
    GET  /api/webstore/admin/blocks/  — list all block definitions
    POST /api/webstore/admin/blocks/  — create a new block definition
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        qs = WebstoreBlock.objects.all()
        status_filter = request.query_params.get("status")
        if status_filter == "published":
            qs = qs.filter(is_published=True)
        elif status_filter == "unpublished":
            qs = qs.filter(is_published=False)

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = WebstoreBlockAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @transaction.atomic
    def post(self, request: Request) -> Response:
        serializer = WebstoreBlockAdminSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        block = serializer.save()
        _audit(request, "block_create", f"Created block '{block.name}' (type={block.type})", entity_id=block.pk, entity_type="WebstoreBlock")
        return Response(
            WebstoreBlockAdminSerializer(block).data,
            status=status.HTTP_201_CREATED,
        )


class BlockDetailView(APIView):
    """
    GET   /api/webstore/admin/blocks/<id>/  — block detail
    PUT   /api/webstore/admin/blocks/<id>/  — full update
    PATCH /api/webstore/admin/blocks/<id>/  — partial update
    """

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def _get_block(self, block_id):
        try:
            return WebstoreBlock.objects.get(pk=block_id)
        except WebstoreBlock.DoesNotExist:
            return None

    def get(self, request: Request, block_id) -> Response:
        block = self._get_block(block_id)
        if block is None:
            return Response({"detail": "Block not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(WebstoreBlockAdminSerializer(block).data)

    @transaction.atomic
    def put(self, request: Request, block_id) -> Response:
        block = self._get_block(block_id)
        if block is None:
            return Response({"detail": "Block not found."}, status=status.HTTP_404_NOT_FOUND)
        if block.is_published:
            logger.warning(
                "SuperAdmin updating schema of published block '%s' (type=%s). "
                "Existing tenant configs may have missing settings handled by configMerger.",
                block.name, block.type,
            )
        serializer = WebstoreBlockAdminSerializer(block, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        _audit(request, "block_update", f"Updated block '{updated.name}' (type={updated.type})", entity_id=updated.pk, entity_type="WebstoreBlock")
        return Response(WebstoreBlockAdminSerializer(updated).data)

    @transaction.atomic
    def patch(self, request: Request, block_id) -> Response:
        block = self._get_block(block_id)
        if block is None:
            return Response({"detail": "Block not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = WebstoreBlockAdminSerializer(block, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = serializer.save()
        _audit(request, "block_update", f"Patched block '{updated.name}' (type={updated.type})", entity_id=updated.pk, entity_type="WebstoreBlock")
        return Response(WebstoreBlockAdminSerializer(updated).data)


class BlockPublishView(APIView):
    """PATCH /api/webstore/admin/blocks/<id>/publish/"""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    @transaction.atomic
    def patch(self, request: Request, block_id) -> Response:
        try:
            block = WebstoreBlock.objects.get(pk=block_id)
        except WebstoreBlock.DoesNotExist:
            return Response({"detail": "Block not found."}, status=status.HTTP_404_NOT_FOUND)
        block.is_published = True
        block.save(update_fields=["is_published", "updated_at"])
        _audit(request, "block_publish", f"Published block '{block.name}' (type={block.type})", entity_id=block.pk, entity_type="WebstoreBlock")
        return Response({"detail": "Block published.", "is_published": True})


# ---------------------------------------------------------------------------
# Platform-wide Statistics
# ---------------------------------------------------------------------------


class WebstoreStatsView(APIView):
    """GET /api/webstore/admin/stats/"""

    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        today = date.today()

        total_enabled = TenantWebstore.objects.filter(is_enabled=True).count()
        total_tenants = TenantWebstore.objects.count()

        # Dynamic import removed — WebstoreOrder is now imported at module level
        orders_today = WebstoreOrder.objects.filter(created_at__date=today).count()
        revenue_today = (
            WebstoreOrder.objects
            .filter(created_at__date=today, payment_status="paid")
            .aggregate(total=Sum("total"))["total"]
        ) or 0

        top_themes = (
            TenantThemeConfig.objects
            .values("theme__id", "theme__name", "theme__slug")
            .annotate(install_count=Count("tenant", distinct=True))
            .order_by("-install_count")[:5]
        )
        top_themes_data = [
            {
                "theme_id": str(t["theme__id"]),
                "theme_name": t["theme__name"],
                "theme_slug": t["theme__slug"],
                "install_count": t["install_count"],
            }
            for t in top_themes
        ]

        data = {
            "total_enabled_webstores": total_enabled,
            "total_tenants": total_tenants,
            "total_orders_today": orders_today,
            "total_revenue_today": revenue_today,
            "top_themes": top_themes_data,
        }
        return Response(WebstoreStatsSerializer(data).data)


# ---------------------------------------------------------------------------
# URL-level function references (Django URLconf expects callables)
# ---------------------------------------------------------------------------

theme_list_create = ThemeListCreateView.as_view()
theme_detail = ThemeDetailView.as_view()
theme_publish = ThemePublishView.as_view()
theme_unpublish = ThemeUnpublishView.as_view()
theme_tenants = ThemeTenantsView.as_view()
theme_force_update_tenants = ThemeForceUpdateTenantsView.as_view()

block_list_create = BlockListCreateView.as_view()
block_detail = BlockDetailView.as_view()
block_publish = BlockPublishView.as_view()

webstore_stats = WebstoreStatsView.as_view()
