"""
apps/webstore/services/theme_service.py

Service layer for all theme lifecycle operations:
  - install_theme     → creates a DRAFT TenantThemeConfig from a theme's default_config
  - publish_draft     → promotes DRAFT → ACTIVE, archives old ACTIVE (atomic)
  - discard_draft     → deletes the DRAFT config
  - update_draft_section        → partial-updates a single section in the DRAFT config
  - update_draft_global_settings → deep-merges global_settings into the DRAFT config

All public functions accept a tenant object and perform proper tenant isolation.
Multi-table mutations are wrapped in django.db.transaction.atomic().
"""

import copy
import logging
from datetime import timezone as dt_timezone

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.webstore.models import (
    TenantThemeConfig,
    ThemeConfigStatus,
    WebstoreTheme,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_draft(tenant) -> TenantThemeConfig:
    """Returns the DRAFT config for the tenant, or raises ValidationError."""
    config = TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.DRAFT
    ).first()
    if config is None:
        raise ValidationError("No draft theme config exists for this tenant.")
    return config


def _get_active(tenant) -> TenantThemeConfig | None:
    """Returns the ACTIVE config for the tenant, or None."""
    return TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.ACTIVE
    ).first()


def _deep_merge(base: dict, updates: dict) -> dict:
    """
    Recursively merges *updates* into *base*.

    Dict values are merged recursively; all other types are replaced.
    Returns a new dict (does not mutate either argument).
    """
    result = copy.deepcopy(base)
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def _dispatch_revalidation(tenant) -> None:
    """
    Delegates full-storefront cache revalidation to the revalidation service.
    Called via transaction.on_commit() so a failure never rolls back a publish.
    """
    from apps.webstore.services.revalidation_service import trigger_full_revalidation

    tenant_slug = getattr(tenant, "slug", str(tenant.pk))
    trigger_full_revalidation(tenant_slug)


def _try_invalidate_nextjs_cache(tenant) -> None:
    """Legacy shim — kept for backwards compatibility. Delegates to revalidation service."""
    _dispatch_revalidation(tenant)


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def install_theme(tenant, theme: WebstoreTheme) -> TenantThemeConfig:
    """
    Installs *theme* for *tenant* by deep-copying its ``default_config``
    into a new DRAFT ``TenantThemeConfig``.

    Raises ``ValidationError`` if a DRAFT already exists — the caller must
    discard or publish the existing draft before installing a new theme.
    """
    if TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.DRAFT
    ).exists():
        raise ValidationError(
            "You already have a draft theme config. "
            "Discard it or publish it before installing a new theme."
        )

    config_copy = copy.deepcopy(theme.default_config)
    draft = TenantThemeConfig.objects.create(
        tenant=tenant,
        theme=theme,
        status=ThemeConfigStatus.DRAFT,
        config=config_copy,
    )
    logger.info(
        "Installed theme '%s' as DRAFT (config_id=%s) for tenant %s",
        theme.name,
        draft.pk,
        tenant.pk,
    )
    return draft


@transaction.atomic
def publish_draft(tenant) -> TenantThemeConfig:
    """
    Promotes the DRAFT config to ACTIVE and archives any existing ACTIVE config.

    Steps (all inside a single DB transaction):
      1. Lock and fetch the DRAFT config.
      2. Archive all currently ACTIVE configs for this tenant.
      3. Promote DRAFT → ACTIVE.
      4. (Outside transaction) Attempt Next.js cache invalidation.

    Raises ``ValidationError`` if no DRAFT exists.
    """
    # Step 1 — lock the DRAFT to prevent concurrent publishes
    draft = (
        TenantThemeConfig.objects.select_for_update()
        .filter(tenant=tenant, status=ThemeConfigStatus.DRAFT)
        .first()
    )
    if draft is None:
        raise ValidationError("No draft to publish.")

    # Step 2 — archive all currently ACTIVE configs
    TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.ACTIVE
    ).update(status=ThemeConfigStatus.ARCHIVED)

    # Step 3 — promote DRAFT to ACTIVE
    now = timezone.now()
    draft.status = ThemeConfigStatus.ACTIVE
    draft.published_at = now
    draft.save(update_fields=["status", "published_at", "updated_at"])

    logger.info(
        "Published DRAFT → ACTIVE (config_id=%s) for tenant %s at %s",
        draft.pk,
        tenant.pk,
        now,
    )

    # Step 4 — cache invalidation (outside the transaction block so a failure
    # here never rolls back the publish)
    transaction.on_commit(lambda: _dispatch_revalidation(tenant))

    return draft


def discard_draft(tenant) -> None:
    """
    Deletes the DRAFT ``TenantThemeConfig`` for *tenant*.

    Raises ``ValidationError`` if no DRAFT exists.
    """
    draft = TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.DRAFT
    ).first()
    if draft is None:
        raise ValidationError("No draft to discard.")

    draft_id = draft.pk
    draft.delete()
    logger.info("Discarded DRAFT (config_id=%s) for tenant %s", draft_id, tenant.pk)


def update_draft_section(
    tenant, template: str, section_id: str, settings: dict
) -> TenantThemeConfig:
    """
    Merges *settings* into the specified section inside the DRAFT config.

    Uses ``select_for_update()`` to guard against simultaneous edits from
    multiple browser tabs.  Settings not included in the patch are preserved
    (merge, not replace).

    Raises ``ValidationError`` if no DRAFT exists or the section / template
    is not found.
    """
    with transaction.atomic():
        draft = (
            TenantThemeConfig.objects.select_for_update()
            .filter(tenant=tenant, status=ThemeConfigStatus.DRAFT)
            .first()
        )
        if draft is None:
            raise ValidationError("No draft config exists. Create a draft first.")

        config = copy.deepcopy(draft.config)

        # Navigate into config["templates"][template]["sections"][section_id]
        templates = config.setdefault("templates", {})
        tmpl = templates.setdefault(template, {"sections": {}, "order": []})
        sections = tmpl.setdefault("sections", {})

        if section_id not in sections:
            raise ValidationError(
                f"Section '{section_id}' not found in template '{template}'."
            )

        existing_settings = sections[section_id].get("settings", {})
        sections[section_id]["settings"] = _deep_merge(existing_settings, settings)

        draft.config = config
        draft.save(update_fields=["config", "updated_at"])

    return draft


def update_draft_global_settings(tenant, global_settings: dict) -> TenantThemeConfig:
    """
    Deep-merges *global_settings* into ``config["global_settings"]`` in the
    DRAFT config.  Individual leaf values (e.g. a single colour key) can be
    updated without wiping sibling keys.

    Raises ``ValidationError`` if no DRAFT exists.
    """
    with transaction.atomic():
        draft = (
            TenantThemeConfig.objects.select_for_update()
            .filter(tenant=tenant, status=ThemeConfigStatus.DRAFT)
            .first()
        )
        if draft is None:
            raise ValidationError("No draft config exists. Create a draft first.")

        config = copy.deepcopy(draft.config)
        existing_globals = config.get("global_settings", {})
        config["global_settings"] = _deep_merge(existing_globals, global_settings)

        draft.config = config
        draft.save(update_fields=["config", "updated_at"])

    return draft


def get_or_create_draft_from_active(tenant) -> TenantThemeConfig:
    """
    Returns the existing DRAFT, or creates one by deep-copying the current
    ACTIVE config.  Used by the customizer's draft-config GET endpoint.

    If neither an ACTIVE config nor a default theme exists, a ValidationError
    is raised.
    """
    draft = TenantThemeConfig.objects.filter(
        tenant=tenant, status=ThemeConfigStatus.DRAFT
    ).select_related("theme").first()
    if draft is not None:
        return draft

    active = (
        TenantThemeConfig.objects.select_related("theme")
        .filter(tenant=tenant, status=ThemeConfigStatus.ACTIVE)
        .first()
    )
    if active is None:
        # Fall back to the platform default theme
        default_theme = WebstoreTheme.objects.filter(is_default=True).first()
        if default_theme is None:
            default_theme = WebstoreTheme.objects.filter(is_published=True).first()
        if default_theme is None:
            raise ValidationError(
                "No active config and no default theme available."
            )
        config_copy = copy.deepcopy(default_theme.default_config)
        draft = TenantThemeConfig.objects.create(
            tenant=tenant,
            theme=default_theme,
            status=ThemeConfigStatus.DRAFT,
            config=config_copy,
        )
    else:
        config_copy = copy.deepcopy(active.config)
        draft = TenantThemeConfig.objects.create(
            tenant=tenant,
            theme=active.theme,
            status=ThemeConfigStatus.DRAFT,
            config=config_copy,
        )

    logger.info(
        "Auto-created DRAFT from ACTIVE (new config_id=%s) for tenant %s",
        draft.pk,
        tenant.pk,
    )
    return draft
