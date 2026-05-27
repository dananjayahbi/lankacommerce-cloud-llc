"""
apps/webstore/views/customizer_views.py

Visual theme customizer API — authenticated merchant endpoints that power
the live drag-and-drop theme editor (Phase 5).

All endpoints require:
  - JWTAuthentication
  - IsAuthenticated
  - HasWebstoreFeature

DRAFT config semantics:
  - The customizer always operates on the DRAFT config.
  - If no DRAFT exists, GET /draft-config/ auto-creates one from the ACTIVE.
  - PATCH /draft-config/ merges partial updates into the DRAFT.
  - POST /publish/ promotes DRAFT → ACTIVE (atomic, archives old ACTIVE).
  - POST /discard-draft/ deletes the DRAFT.
"""

import copy
import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.webstore.models import TenantThemeConfig, ThemeConfigStatus, WebstoreTheme
from apps.webstore.permissions import HasWebstoreFeature
from apps.webstore.serializers.tenant_serializers import TenantThemeConfigDetailSerializer
from apps.webstore.services import theme_service

logger = logging.getLogger(__name__)

_AUTH = [JWTAuthentication]
_PERMS = [IsAuthenticated, HasWebstoreFeature]


def _tenant(request: Request):
    return request.user.tenant


# ---------------------------------------------------------------------------
# Active config
# ---------------------------------------------------------------------------


class ActiveConfigView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        # Phase 9: ?theme_id=<uuid> returns the theme's default_config as a mock
        # TenantThemeConfig, enabling the merchant preview iFrame to render any
        # marketplace theme without the tenant installing it first.
        theme_id = request.query_params.get("theme_id")
        if theme_id:
            import uuid as _uuid
            try:
                theme_uuid = _uuid.UUID(str(theme_id))
            except (ValueError, AttributeError):
                return Response(
                    {"detail": "Invalid theme_id format. Must be a valid UUID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                preview_theme = WebstoreTheme.objects.get(pk=theme_uuid, is_published=True)
            except WebstoreTheme.DoesNotExist:
                return Response(
                    {"detail": "Theme not found or not published."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({
                "id": None,
                "theme_id": str(preview_theme.pk),
                "theme_name": preview_theme.name,
                "status": "PREVIEW",
                "config": preview_theme.default_config,
                "published_at": None,
                "created_at": None,
                "updated_at": None,
            })

        tenant = _tenant(request)
        cfg = (
            TenantThemeConfig.objects.select_related("theme")
            .filter(tenant=tenant, status=ThemeConfigStatus.ACTIVE)
            .first()
        )
        if cfg is None:
            # Fall back to default theme's config — never 404.
            default_theme = (
                WebstoreTheme.objects.filter(is_default=True).first()
                or WebstoreTheme.objects.filter(is_published=True).first()
            )
            if default_theme is None:
                return Response(
                    {"detail": "No active config and no default theme available."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response({
                "id": None,
                "theme_id": str(default_theme.pk),
                "theme_name": default_theme.name,
                "status": ThemeConfigStatus.ACTIVE,
                "config": default_theme.default_config,
                "published_at": None,
                "created_at": None,
                "updated_at": None,
            })
        return Response(TenantThemeConfigDetailSerializer(cfg).data)


active_config = ActiveConfigView.as_view()


# ---------------------------------------------------------------------------
# Draft config (GET / PATCH)
# ---------------------------------------------------------------------------


class DraftConfigView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def get(self, request: Request) -> Response:
        """
        Returns the DRAFT config.  Auto-creates one from the ACTIVE config if
        no DRAFT exists (the customizer always works on a DRAFT).
        """
        tenant = _tenant(request)
        try:
            draft = theme_service.get_or_create_draft_from_active(tenant)
        except ValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(TenantThemeConfigDetailSerializer(draft).data)

    def patch(self, request: Request) -> Response:
        """
        Partial update of the DRAFT config.  Supports three update modes:

          Mode 1 — Full config replacement:
            Body: ``{"config": {...}}``

          Mode 2 — Section-level update:
            Body: ``{"section_id": "...", "template": "index", "settings": {...}}``

          Mode 3 — Global settings update:
            Body: ``{"global_settings": {...}}``
        """
        tenant = _tenant(request)
        data = request.data

        try:
            if "config" in data:
                # Mode 1 — full replacement
                with transaction.atomic():
                    draft = (
                        TenantThemeConfig.objects.select_for_update()
                        .filter(tenant=tenant, status=ThemeConfigStatus.DRAFT)
                        .first()
                    )
                    if draft is None:
                        raise ValidationError("No draft config exists. Create a draft first.")
                    new_config = data["config"]
                    if not isinstance(new_config, dict):
                        return Response(
                            {"detail": "'config' must be a JSON object."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    draft.config = copy.deepcopy(new_config)
                    draft.save(update_fields=["config", "updated_at"])

            elif "section_id" in data and "template" in data:
                # Mode 2 — section-level update
                section_id = data.get("section_id")
                template = data.get("template")
                settings = data.get("settings", {})
                if not isinstance(settings, dict):
                    return Response(
                        {"detail": "'settings' must be a JSON object."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                draft = theme_service.update_draft_section(
                    tenant, template, section_id, settings
                )

            elif "global_settings" in data:
                # Mode 3 — global settings merge
                global_settings = data.get("global_settings")
                if not isinstance(global_settings, dict):
                    return Response(
                        {"detail": "'global_settings' must be a JSON object."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                draft = theme_service.update_draft_global_settings(
                    tenant, global_settings
                )

            else:
                return Response(
                    {
                        "detail": (
                            "Request body must include one of: 'config', "
                            "'section_id' + 'template' + 'settings', or 'global_settings'."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "status": "saved",
                "updated_at": draft.updated_at.isoformat(),
            }
        )


draft_config = DraftConfigView.as_view()


# ---------------------------------------------------------------------------
# Publish
# ---------------------------------------------------------------------------


class PublishView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def post(self, request: Request) -> Response:
        tenant = _tenant(request)
        try:
            published = theme_service.publish_draft(tenant)
        except ValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "status": "published",
                "config_id": str(published.pk),
                "published_at": published.published_at.isoformat(),
            }
        )


publish = PublishView.as_view()


# ---------------------------------------------------------------------------
# Discard draft
# ---------------------------------------------------------------------------


class DiscardDraftView(APIView):
    authentication_classes = _AUTH
    permission_classes = _PERMS

    def post(self, request: Request) -> Response:
        tenant = _tenant(request)
        try:
            theme_service.discard_draft(tenant)
        except ValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"status": "discarded"})


discard_draft = DiscardDraftView.as_view()

