"""
apps/webstore/serializers/public_serializers.py

Read-only serializers for the public storefront API (Phase 2).
All fields are consumer-facing; no sensitive/internal data is exposed.

Catalog model field mapping (POS-first model → Storefront API):
  Product.name                    → title
  str(Product.id)                 → handle  (no slug field on Product)
  Product.is_archived=False       → treated as "active"
  Product.deleted_at=None         → treated as "published"
  ProductVariant.retail_price     → price
  ProductVariant.wholesale_price  → compare_at_price
  ProductVariant.image_urls[0]    → featured_image_url
  ProductVariant.{colour, size}   → attributes dict
"""

from rest_framework import serializers

from apps.catalog.models import Product, ProductVariant
from apps.webstore.models import (
    TenantWebstore,
    TenantThemeConfig,
    WebstoreCollection,
    WebstoreMenu,
    WebstorePage,
    WebstoreTheme,
)
from apps.webstore.services.collection_service import get_collection_product_count


# ---------------------------------------------------------------------------
# Variant serializer
# ---------------------------------------------------------------------------


class PublicVariantSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    price = serializers.DecimalField(
        source="retail_price", max_digits=14, decimal_places=2
    )
    compare_at_price = serializers.DecimalField(
        source="wholesale_price",
        max_digits=14,
        decimal_places=2,
        allow_null=True,
    )
    is_available = serializers.SerializerMethodField()
    attributes = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "title",
            "sku",
            "price",
            "compare_at_price",
            "stock_quantity",
            "is_available",
            "attributes",
        ]

    def get_title(self, obj: ProductVariant) -> str:
        parts = [p for p in (obj.colour, obj.size) if p]
        return " / ".join(parts) if parts else obj.sku

    def get_is_available(self, obj: ProductVariant) -> bool:
        return obj.stock_quantity > 0

    def get_attributes(self, obj: ProductVariant) -> dict:
        attrs = {}
        if obj.colour:
            attrs["colour"] = obj.colour
        if obj.size:
            attrs["size"] = obj.size
        return attrs


# ---------------------------------------------------------------------------
# Product summary (used in listing endpoints)
# ---------------------------------------------------------------------------


class PublicProductSummarySerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name")
    handle = serializers.SerializerMethodField()
    featured_image_url = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    compare_at_price_range = serializers.SerializerMethodField()
    variant_count = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "handle",
            "featured_image_url",
            "price_range",
            "compare_at_price_range",
            "variant_count",
            "available",
            "category",
            "tags",
        ]

    def _active_variants(self, obj: Product):
        """Returns active (non-deleted) variants from prefetch cache."""
        return [v for v in obj.variants.all() if v.deleted_at is None]

    def get_handle(self, obj: Product) -> str:
        # No slug field on the catalog Product; use UUID as stable handle.
        return str(obj.id)

    def get_featured_image_url(self, obj: Product):
        for variant in self._active_variants(obj):
            if variant.image_urls:
                return variant.image_urls[0]
        return None

    def get_price_range(self, obj: Product) -> dict:
        prices = [v.retail_price for v in self._active_variants(obj)]
        if not prices:
            return {"min": "0.00", "max": "0.00"}
        return {"min": str(min(prices)), "max": str(max(prices))}

    def get_compare_at_price_range(self, obj: Product):
        prices = [
            v.wholesale_price
            for v in self._active_variants(obj)
            if v.wholesale_price is not None
        ]
        if not prices:
            return None
        return {"min": str(min(prices)), "max": str(max(prices))}

    def get_variant_count(self, obj: Product) -> int:
        return len(self._active_variants(obj))

    def get_available(self, obj: Product) -> bool:
        return any(v.stock_quantity > 0 for v in self._active_variants(obj))

    def get_category(self, obj: Product):
        if not obj.category_id:
            return None
        cat = obj.category
        return {"name": cat.name, "handle": str(cat.id)}


# ---------------------------------------------------------------------------
# Product detail (used by the single-product endpoint)
# ---------------------------------------------------------------------------


class PublicProductDetailSerializer(PublicProductSummarySerializer):
    description = serializers.CharField(allow_null=True)
    images = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    seo_title = serializers.SerializerMethodField()
    seo_description = serializers.SerializerMethodField()
    related_products = serializers.SerializerMethodField()

    class Meta(PublicProductSummarySerializer.Meta):
        fields = PublicProductSummarySerializer.Meta.fields + [
            "description",
            "images",
            "variants",
            "options",
            "seo_title",
            "seo_description",
            "related_products",
        ]

    def get_images(self, obj: Product) -> list:
        seen_urls: set = set()
        result = []
        for variant in self._active_variants(obj):
            for url in variant.image_urls or []:
                if url not in seen_urls:
                    seen_urls.add(url)
                    result.append({"url": url, "alt": obj.name})
        return result

    def get_variants(self, obj: Product) -> list:
        return PublicVariantSerializer(self._active_variants(obj), many=True).data

    def get_options(self, obj: Product) -> list:
        colours: list = []
        sizes: list = []
        for v in self._active_variants(obj):
            if v.colour and v.colour not in colours:
                colours.append(v.colour)
            if v.size and v.size not in sizes:
                sizes.append(v.size)
        options = []
        if colours:
            options.append({"name": "Colour", "values": colours})
        if sizes:
            options.append({"name": "Size", "values": sizes})
        return options

    def get_seo_title(self, obj: Product) -> str:
        return obj.name

    def get_seo_description(self, obj: Product) -> str:
        return (obj.description or "")[:160]

    def get_related_products(self, obj: Product) -> list:
        related = (
            Product.objects.filter(
                tenant=obj.tenant,
                category=obj.category,
                is_archived=False,
                deleted_at=None,
            )
            .exclude(id=obj.id)
            .select_related("category")
            .prefetch_related("variants")[:4]
        )
        return PublicProductSummarySerializer(related, many=True).data


# ---------------------------------------------------------------------------
# Collection serializers
# ---------------------------------------------------------------------------


class PublicCollectionSummarySerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreCollection
        fields = [
            "id",
            "title",
            "handle",
            "description",
            "image_url",
            "product_count",
            "is_published",
        ]

    def get_description(self, obj: WebstoreCollection) -> str:
        return obj.description[:150] if obj.description else ""

    def get_product_count(self, obj: WebstoreCollection) -> int:
        return get_collection_product_count(obj)


class PublicCollectionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebstoreCollection
        fields = [
            "id",
            "title",
            "handle",
            "description",
            "image_url",
            "seo_title",
            "seo_description",
        ]


# ---------------------------------------------------------------------------
# Menu, Page, Theme, Store Config serializers
# ---------------------------------------------------------------------------


class PublicMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebstoreMenu
        fields = ["id", "title", "handle", "items"]


class PublicPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebstorePage
        fields = [
            "id",
            "title",
            "handle",
            "body_html",
            "seo_title",
            "seo_description",
            "updated_at",
        ]


class PublicThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebstoreTheme
        fields = ["id", "name", "slug", "version", "supported_sections"]


class PublicStoreConfigSerializer(serializers.Serializer):
    """
    Top-level response for GET /public/<slug>/config/.
    Composed manually from the service layer output dict.
    """

    is_enabled = serializers.BooleanField()
    is_password_protected = serializers.BooleanField()
    store_settings = serializers.DictField()
    theme_config = serializers.DictField()
    theme = PublicThemeSerializer()
