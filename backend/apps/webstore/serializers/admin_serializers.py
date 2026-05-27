"""
apps/webstore/serializers/admin_serializers.py

Serializers for the SuperAdmin webstore management API (Phase 9).

Security contract:
  - All serializers are used exclusively on /api/webstore/admin/* endpoints
    which require IsSuperAdmin permission.
  - slug is validated for uniqueness and URL-safety.
  - default_config and global_settings_schema are validated as structured JSON.
  - schema arrays for WebstoreBlock are validated against the allowed setting types.
  - No field uses "__all__" – fields are always explicit.
"""

import json
import re

from django.db.models import Count
from django.utils.text import slugify
from rest_framework import serializers

from apps.webstore.models import (
    TenantThemeConfig,
    WebstoreBlock,
    WebstoreTheme,
)

# ---------------------------------------------------------------------------
# Allowed setting types (17 types supported by the block schema engine)
# ---------------------------------------------------------------------------

ALLOWED_SETTING_TYPES = {
    "text",
    "textarea",
    "richtext",
    "number",
    "range",
    "checkbox",
    "select",
    "radio",
    "color",
    "image_picker",
    "url",
    "video_url",
    "font_picker",
    "collection",
    "product",
    "blog",
    "page",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _validate_slug(value: str) -> str:
    """Validates lowercase, hyphen-separated URL-safe slug."""
    if not _SLUG_RE.match(value):
        raise serializers.ValidationError(
            "Slug must be lowercase letters, numbers, and hyphens only "
            "(no spaces or underscores). Example: 'my-theme'."
        )
    return value


def _validate_default_config(value) -> dict:
    """
    Validates that default_config has the required top-level keys:
    global_settings, layout, templates.
    """
    if not isinstance(value, dict):
        raise serializers.ValidationError(
            "default_config must be a JSON object (dict), not a list or string."
        )
    required_keys = {"global_settings", "layout", "templates"}
    missing = required_keys - set(value.keys())
    if missing:
        raise serializers.ValidationError(
            f"default_config is missing required top-level keys: {sorted(missing)}. "
            "Required: global_settings, layout, templates."
        )
    if not isinstance(value.get("global_settings"), dict):
        raise serializers.ValidationError(
            "default_config.global_settings must be a JSON object."
        )
    if not isinstance(value.get("layout"), dict):
        raise serializers.ValidationError(
            "default_config.layout must be a JSON object."
        )
    if not isinstance(value.get("templates"), dict):
        raise serializers.ValidationError(
            "default_config.templates must be a JSON object."
        )
    return value


def _validate_block_schema(value) -> list:
    """
    Validates that a block schema is a JSON array where each element has:
      - id   (string)
      - type (one of ALLOWED_SETTING_TYPES)
      - label (string)
      - options array for select/radio
      - min, max, step for range
    """
    if not isinstance(value, list):
        raise serializers.ValidationError(
            "schema must be a JSON array of setting definition objects."
        )
    if not value:
        raise serializers.ValidationError(
            "schema must contain at least one setting definition object."
        )
    for idx, setting in enumerate(value):
        prefix = f"schema[{idx}]"
        if not isinstance(setting, dict):
            raise serializers.ValidationError(
                f"{prefix}: each setting must be a JSON object."
            )
        for required_field in ("id", "type", "label"):
            if required_field not in setting:
                raise serializers.ValidationError(
                    f"{prefix}: missing required field '{required_field}'."
                )
            if not isinstance(setting[required_field], str) or not setting[required_field].strip():
                raise serializers.ValidationError(
                    f"{prefix}.{required_field}: must be a non-empty string."
                )
        setting_type = setting["type"]
        if setting_type not in ALLOWED_SETTING_TYPES:
            raise serializers.ValidationError(
                f"{prefix}.type: '{setting_type}' is not a supported setting type. "
                f"Allowed: {sorted(ALLOWED_SETTING_TYPES)}."
            )
        if setting_type in ("select", "radio"):
            if "options" not in setting or not isinstance(setting["options"], list) or not setting["options"]:
                raise serializers.ValidationError(
                    f"{prefix}: type '{setting_type}' requires a non-empty 'options' array."
                )
            for opt_idx, opt in enumerate(setting["options"]):
                if not isinstance(opt, dict) or "value" not in opt or "label" not in opt:
                    raise serializers.ValidationError(
                        f"{prefix}.options[{opt_idx}]: each option must have 'value' and 'label'."
                    )
        if setting_type == "range":
            for range_field in ("min", "max", "step"):
                if range_field not in setting:
                    raise serializers.ValidationError(
                        f"{prefix}: type 'range' requires '{range_field}'."
                    )
                if not isinstance(setting[range_field], (int, float)):
                    raise serializers.ValidationError(
                        f"{prefix}.{range_field}: must be a number."
                    )
    return value


# ---------------------------------------------------------------------------
# WebstoreTheme Admin Serializers
# ---------------------------------------------------------------------------


class WebstoreThemeAdminListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the theme list endpoint.
    Includes tenant_count as an annotated field.
    """

    tenant_count = serializers.IntegerField(read_only=True, default=0)
    price = serializers.DecimalField(
        source="price_lkr", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = WebstoreTheme
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "description",
            "version",
            "version_number",
            "is_free",
            "price",
            "is_published",
            "is_default",
            "preview_image_url",
            "tenant_count",
            "created_at",
            "updated_at",
        ]


class WebstoreThemeAdminDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for theme create/update/retrieve.
    """

    price = serializers.DecimalField(
        source="price_lkr",
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    tenant_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreTheme
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "description",
            "version",
            "version_number",
            "author",
            "is_free",
            "price",
            "is_published",
            "is_default",
            "preview_image_url",
            "preview_images",
            "supported_sections",
            "global_settings_schema",
            "default_config",
            "tenant_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "version_number", "created_at", "updated_at"]

    def get_tenant_count(self, obj) -> int:
        return TenantThemeConfig.objects.filter(theme=obj).values("tenant").distinct().count()

    def validate_slug(self, value: str) -> str:
        value = value.lower().strip()
        _validate_slug(value)
        qs = WebstoreTheme.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"A theme with slug '{value}' already exists."
            )
        return value

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Price must be 0 or greater.")
        return value

    def validate_default_config(self, value):
        return _validate_default_config(value)

    def validate_preview_images(self, value) -> list:
        """Ensure preview_images is a list of {url, label} objects."""
        if not isinstance(value, list):
            raise serializers.ValidationError("preview_images must be a JSON array.")
        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"preview_images[{idx}]: each item must be a JSON object."
                )
            if "url" not in item or not isinstance(item["url"], str) or not item["url"].strip():
                raise serializers.ValidationError(
                    f"preview_images[{idx}]: missing or blank 'url' field."
                )
            if "label" not in item or not isinstance(item["label"], str):
                raise serializers.ValidationError(
                    f"preview_images[{idx}]: missing 'label' field (string expected)."
                )
        return value

    def validate_global_settings_schema(self, value):
        if value:
            _validate_block_schema(value)
        return value

    def validate(self, data):
        is_free = data.get("is_free", getattr(self.instance, "is_free", True))
        price = data.get("price_lkr", getattr(self.instance, "price_lkr", 0))
        if not is_free and (price is None or price <= 0):
            raise serializers.ValidationError(
                {"price": "Price must be greater than 0 for paid themes."}
            )
        return data

    def create(self, validated_data):
        if not validated_data.get("slug") and validated_data.get("name"):
            validated_data["slug"] = slugify(validated_data["name"])
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# WebstoreBlock Admin Serializers
# ---------------------------------------------------------------------------


class WebstoreBlockAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for block definition create/update/retrieve.
    """

    class Meta:
        model = WebstoreBlock
        fields = [
            "id",
            "type",
            "name",
            "description",
            "react_component_key",
            "schema",
            "nested_blocks_schema",
            "preview_image_url",
            "is_premium",
            "is_published",
            "version",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_schema(self, value):
        return _validate_block_schema(value)

    def validate_nested_blocks_schema(self, value):
        if value:
            _validate_block_schema(value)
        return value

    def validate_type(self, value: str) -> str:
        qs = WebstoreBlock.objects.filter(type=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"A block with type '{value}' already exists."
            )
        return value


# ---------------------------------------------------------------------------
# Tenant install list (used by admin-theme-tenants endpoint)
# ---------------------------------------------------------------------------


class ThemeTenantInstallSerializer(serializers.Serializer):
    """Read-only representation of a tenant that has installed a theme."""

    tenant_id = serializers.UUIDField(source="tenant.id")
    tenant_name = serializers.CharField(source="tenant.name")
    tenant_slug = serializers.CharField(source="tenant.slug")
    config_status = serializers.CharField(source="status")
    installed_at = serializers.DateTimeField(source="created_at")
    published_at = serializers.DateTimeField(allow_null=True)


# ---------------------------------------------------------------------------
# Stats serializer
# ---------------------------------------------------------------------------


class WebstoreStatsSerializer(serializers.Serializer):
    """Read-only platform-wide webstore statistics."""

    total_enabled_webstores = serializers.IntegerField()
    total_tenants = serializers.IntegerField()
    total_orders_today = serializers.IntegerField()
    total_revenue_today = serializers.DecimalField(max_digits=16, decimal_places=2)
    top_themes = serializers.ListField(child=serializers.DictField())
