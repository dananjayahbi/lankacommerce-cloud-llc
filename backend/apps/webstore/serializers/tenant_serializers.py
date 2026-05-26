"""
apps/webstore/serializers/tenant_serializers.py

Serializers for the authenticated tenant admin webstore API (Phase 3).

Security contract:
  - ``tenant`` is NEVER accepted from request data; always injected in the
    view's ``perform_create`` / ``perform_update`` from ``request.user.tenant``.
  - ``store_password`` is write-only and hashed with Django's ``make_password``
    before saving to ``store_password_hash``.
  - ``body_html`` in WebstorePageSerializer is sanitized with ``bleach`` on
    every write.
  - No serializer uses ``fields = "__all__"`` — fields are always explicit.
"""

import bleach
from django.contrib.auth.hashers import make_password
from django.utils.text import slugify
from rest_framework import serializers

from apps.webstore.models import (
    TenantThemeConfig,
    TenantWebstore,
    WebstoreBlock,
    WebstoreCollection,
    WebstoreMenu,
    WebstorePage,
    WebstoreTheme,
)
from apps.webstore.services.collection_service import get_collection_product_count

# ---------------------------------------------------------------------------
# bleach configuration — used by WebstorePageSerializer
# ---------------------------------------------------------------------------

_ALLOWED_TAGS = [
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "u", "a", "ul", "ol", "li",
    "blockquote", "br", "hr", "img",
]

_ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "class"],
    "img": ["src", "alt", "width", "height", "class"],
    "*": ["class"],
}


def _sanitize_html(raw: str) -> str:
    """Strips unsafe HTML using bleach. Always re-sanitizes on every write."""
    return bleach.clean(
        raw,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        strip=True,
    )


# ---------------------------------------------------------------------------
# TenantWebstore
# ---------------------------------------------------------------------------


class TenantWebstoreSerializer(serializers.ModelSerializer):
    """
    Used for the webstore settings GET / PATCH.

    ``store_password`` is an inbound write-only field that maps to
    ``store_password_hash`` on the model.  The raw password is NEVER
    stored or returned.
    """

    store_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        min_length=4,
        max_length=128,
    )

    class Meta:
        model = TenantWebstore
        fields = [
            "id",
            "is_enabled",
            "is_password_protected",
            "store_password",          # write-only; never returned
            "seo_title",
            "seo_description",
            "social_image_url",
            "storefront_domain",
            "cart_settings",
            "customer_accounts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        is_protected = attrs.get(
            "is_password_protected",
            self.instance.is_password_protected if self.instance else False,
        )
        store_password = attrs.get("store_password", "")

        if is_protected and not store_password and not (
            self.instance and self.instance.store_password_hash
        ):
            raise serializers.ValidationError(
                {"store_password": ["A password is required when enabling password protection."]}
            )
        return attrs

    def validate_storefront_domain(self, value):
        """Domain must be globally unique across all tenants."""
        if not value:
            return value
        qs = TenantWebstore.objects.filter(storefront_domain=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This domain is already claimed by another store."
            )
        return value

    def _apply_password(self, validated_data: dict) -> dict:
        """Pop plain-text password and replace with a hashed value."""
        raw_password = validated_data.pop("store_password", None)
        if raw_password:
            validated_data["store_password_hash"] = make_password(raw_password)
        return validated_data

    def create(self, validated_data):
        validated_data = self._apply_password(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._apply_password(validated_data)
        return super().update(instance, validated_data)


# ---------------------------------------------------------------------------
# TenantThemeConfig — list (summary) and detail
# ---------------------------------------------------------------------------


class TenantThemeConfigListSerializer(serializers.ModelSerializer):
    """Summary view — no full config JSON."""

    theme_name = serializers.CharField(source="theme.name", read_only=True)

    class Meta:
        model = TenantThemeConfig
        fields = [
            "id",
            "theme_name",
            "status",
            "published_at",
            "updated_at",
        ]
        read_only_fields = fields


class TenantThemeConfigDetailSerializer(serializers.ModelSerializer):
    """Full detail view — includes the complete config JSON."""

    theme_id = serializers.UUIDField(source="theme.id", read_only=True)
    theme_name = serializers.CharField(source="theme.name", read_only=True)

    class Meta:
        model = TenantThemeConfig
        fields = [
            "id",
            "theme_id",
            "theme_name",
            "status",
            "config",
            "purchased_blocks",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# WebstoreTheme (read-only; browsing the theme marketplace)
# ---------------------------------------------------------------------------


class WebstoreThemeListSerializer(serializers.ModelSerializer):
    """Used for GET /api/webstore/themes/."""

    # Injected by the view via context["installed_theme_ids"]
    is_installed = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreTheme
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "version",
            "preview_image_url",
            "preview_images",
            "is_free",
            "price_lkr",
            "author",
            "is_installed",
        ]
        read_only_fields = fields

    def get_is_installed(self, obj: WebstoreTheme) -> bool:
        installed_ids = self.context.get("installed_theme_ids", set())
        return obj.pk in installed_ids


# ---------------------------------------------------------------------------
# WebstoreMenu
# ---------------------------------------------------------------------------


class WebstoreMenuSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreMenu
        fields = [
            "id",
            "title",
            "handle",
            "items",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_item_count(self, obj: WebstoreMenu) -> int:
        return len(obj.items or [])

    def validate_handle(self, value: str) -> str:
        """Enforce slug format and tenant-scoped uniqueness."""
        if not value:
            raise serializers.ValidationError("Handle cannot be blank.")
        slugified = slugify(value)
        if slugified != value:
            raise serializers.ValidationError(
                "Handle must be a valid slug (lowercase letters, numbers, hyphens only)."
            )

        tenant = self.context["request"].user.tenant
        qs = WebstoreMenu.objects.filter(tenant=tenant, handle=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A menu with this handle already exists for your store."
            )
        return value


class WebstoreMenuListSerializer(serializers.ModelSerializer):
    """Lightweight list view — excludes the full items tree."""

    item_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreMenu
        fields = [
            "id",
            "title",
            "handle",
            "item_count",
            "updated_at",
        ]
        read_only_fields = fields

    def get_item_count(self, obj: WebstoreMenu) -> int:
        return len(obj.items or [])


# ---------------------------------------------------------------------------
# WebstoreCollection
# ---------------------------------------------------------------------------


class WebstoreCollectionSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreCollection
        fields = [
            "id",
            "title",
            "handle",
            "description",
            "image_url",
            "collection_type",
            "filter_rules",
            "filter_conjunction",
            "manual_product_ids",
            "sort_order_type",
            "seo_title",
            "seo_description",
            "is_published",
            "published_at",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "product_count", "published_at", "created_at", "updated_at"]

    def get_product_count(self, obj: WebstoreCollection) -> int:
        return get_collection_product_count(obj)

    def validate_handle(self, value: str) -> str:
        """Auto-slugified handle with tenant-scoped uniqueness check."""
        if not value:
            raise serializers.ValidationError("Handle cannot be blank.")
        tenant = self.context["request"].user.tenant
        qs = WebstoreCollection.objects.filter(tenant=tenant, handle=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A collection with this handle already exists for your store."
            )
        return value

    def validate_filter_rules(self, value):
        """Verify each rule has the required keys for automated collections."""
        if not isinstance(value, list):
            raise serializers.ValidationError("filter_rules must be a list.")
        for rule in value:
            if not isinstance(rule, dict):
                raise serializers.ValidationError("Each filter rule must be an object.")
            if "field" not in rule or "relation" not in rule or "value" not in rule:
                raise serializers.ValidationError(
                    "Each filter rule must have 'field', 'relation', and 'value'."
                )
        return value

    def validate(self, attrs):
        collection_type = attrs.get(
            "collection_type",
            self.instance.collection_type if self.instance else "manual",
        )
        if collection_type == "manual" and attrs.get("filter_rules"):
            raise serializers.ValidationError(
                {"filter_rules": ["Filter rules are only valid for automated collections."]}
            )
        return attrs


class WebstoreCollectionListSerializer(serializers.ModelSerializer):
    """Lightweight list view."""

    product_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreCollection
        fields = [
            "id",
            "title",
            "handle",
            "collection_type",
            "product_count",
            "is_published",
            "created_at",
        ]
        read_only_fields = fields

    def get_product_count(self, obj: WebstoreCollection) -> int:
        return get_collection_product_count(obj)


# ---------------------------------------------------------------------------
# WebstorePage
# ---------------------------------------------------------------------------


class WebstorePageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebstorePage
        fields = [
            "id",
            "title",
            "handle",
            "body_html",
            "seo_title",
            "seo_description",
            "is_published",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "published_at", "created_at", "updated_at"]

    def validate_handle(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Handle cannot be blank.")
        tenant = self.context["request"].user.tenant
        qs = WebstorePage.objects.filter(tenant=tenant, handle=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A page with this handle already exists for your store."
            )
        return value

    def validate_body_html(self, value: str) -> str:
        """Sanitize HTML on every write to prevent stored XSS."""
        return _sanitize_html(value)


class WebstorePageListSerializer(serializers.ModelSerializer):
    """Lightweight list view — excludes body_html."""

    class Meta:
        model = WebstorePage
        fields = [
            "id",
            "title",
            "handle",
            "is_published",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# WebstoreBlock (read-only; block library)
# ---------------------------------------------------------------------------


class WebstoreBlockSerializer(serializers.ModelSerializer):
    # Injected by view via context["purchased_block_types"]
    is_unlocked = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreBlock
        fields = [
            "type",
            "name",
            "description",
            "schema",
            "nested_blocks_schema",
            "preview_image_url",
            "is_premium",
            "sort_order",
            "is_unlocked",
        ]
        read_only_fields = fields

    def get_is_unlocked(self, obj: WebstoreBlock) -> bool:
        if not obj.is_premium:
            return True
        purchased = self.context.get("purchased_block_types", set())
        return obj.type in purchased
