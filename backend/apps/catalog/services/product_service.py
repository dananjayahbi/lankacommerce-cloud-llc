"""
Product service layer for the catalog app.

Encapsulates all business logic for Category, Brand, Product, and
ProductVariant operations. Views must never write directly to catalog
models — they always go through this module.

Important security note: all write functions receive tenant_id from the
verified JWT (via the view layer). Tenant IDs from request bodies are
never trusted.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import AuditLog
from apps.catalog.exceptions import ConflictError, NotFoundError
from apps.catalog.models import (
    Brand,
    Category,
    Product,
    ProductVariant,
)


# ─────────────────────────────────────────────────────────────────
# Internal audit helper
# ─────────────────────────────────────────────────────────────────

def _log(
    *,
    actor_id: Any,
    tenant_id: Any,
    action: str,
    entity_type: str,
    entity_id: Any,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    AuditLog.objects.create(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=before,
        after=after,
    )


# ═════════════════════════════════════════════════════════════════
# Category services
# ═════════════════════════════════════════════════════════════════

def get_all_categories(tenant_id: Any, *, include_deleted: bool = False):
    """Return a queryset of categories for *tenant_id*.

    By default soft-deleted records are excluded. Pass
    ``include_deleted=True`` to include them.
    """
    qs = Category.objects.filter(tenant_id=tenant_id).select_related("parent")
    if not include_deleted:
        qs = qs.filter(deleted_at__isnull=True)
    return qs.order_by("sort_order", "name")


def get_category_tree(tenant_id: Any):
    """Return all non-deleted categories for *tenant_id* with parent pre-fetched."""
    return (
        Category.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        .select_related("parent")
        .order_by("sort_order", "name")
    )


def get_category_by_id(tenant_id: Any, category_id: Any) -> Category:
    """Fetch a single active category. Raises ``NotFoundError`` if absent."""
    try:
        return Category.objects.get(
            pk=category_id, tenant_id=tenant_id, deleted_at__isnull=True
        )
    except Category.DoesNotExist:
        raise NotFoundError(f"Category {category_id} not found.")


def create_category(tenant_id: Any, actor_id: Any, data: dict) -> Category:
    """Create a new category. Raises ``ConflictError`` on duplicate name."""
    name = data["name"]
    if Category.objects.filter(
        tenant_id=tenant_id, name=name, deleted_at__isnull=True
    ).exists():
        raise ConflictError(f"A category named '{name}' already exists.")

    category = Category.objects.create(
        tenant_id=tenant_id,
        name=name,
        description=data.get("description"),
        parent_id=data.get("parent_id"),
        sort_order=data.get("sort_order", 0),
    )
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="CATEGORY_CREATED",
        entity_type="Category",
        entity_id=category.id,
        after={"name": category.name},
    )
    return category


def update_category(
    tenant_id: Any, category_id: Any, actor_id: Any, data: dict
) -> Category:
    """Update mutable fields on a category."""
    category = get_category_by_id(tenant_id, category_id)
    old_name = category.name
    for field in ("name", "description", "parent_id", "sort_order"):
        if field in data:
            setattr(category, field, data[field])
    category.save()
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="CATEGORY_UPDATED",
        entity_type="Category",
        entity_id=category.id,
        before={"name": old_name},
        after={"name": category.name},
    )
    return category


def soft_delete_category(tenant_id: Any, category_id: Any, actor_id: Any) -> None:
    """Soft-delete a category. Raises ``ConflictError`` if active products exist."""
    category = get_category_by_id(tenant_id, category_id)
    if Product.objects.filter(
        category_id=category_id, deleted_at__isnull=True
    ).exists():
        raise ConflictError(
            "Cannot delete this category while active products are assigned to it."
        )
    category.deleted_at = timezone.now()
    category.save(update_fields=["deleted_at"])
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="CATEGORY_DELETED",
        entity_type="Category",
        entity_id=category.id,
    )


# ═════════════════════════════════════════════════════════════════
# Brand services
# ═════════════════════════════════════════════════════════════════

def get_all_brands(tenant_id: Any):
    """Return all active brands for *tenant_id*, ordered by name."""
    return Brand.objects.filter(
        tenant_id=tenant_id, deleted_at__isnull=True
    ).order_by("name")


def get_brand_by_id(tenant_id: Any, brand_id: Any) -> Brand:
    """Fetch a single active brand. Raises ``NotFoundError`` if absent."""
    try:
        return Brand.objects.get(
            pk=brand_id, tenant_id=tenant_id, deleted_at__isnull=True
        )
    except Brand.DoesNotExist:
        raise NotFoundError(f"Brand {brand_id} not found.")


def create_brand(tenant_id: Any, actor_id: Any, data: dict) -> Brand:
    """Create a new brand. Raises ``ConflictError`` on duplicate name."""
    name = data["name"]
    if Brand.objects.filter(
        tenant_id=tenant_id, name=name, deleted_at__isnull=True
    ).exists():
        raise ConflictError(f"A brand named '{name}' already exists.")

    brand = Brand.objects.create(
        tenant_id=tenant_id,
        name=name,
        logo_url=data.get("logo_url"),
    )
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="BRAND_CREATED",
        entity_type="Brand",
        entity_id=brand.id,
        after={"name": brand.name},
    )
    return brand


def update_brand(
    tenant_id: Any, brand_id: Any, actor_id: Any, data: dict
) -> Brand:
    """Update mutable fields on a brand."""
    brand = get_brand_by_id(tenant_id, brand_id)
    old_name = brand.name
    for field in ("name", "logo_url"):
        if field in data:
            setattr(brand, field, data[field])
    brand.save()
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="BRAND_UPDATED",
        entity_type="Brand",
        entity_id=brand.id,
        before={"name": old_name},
        after={"name": brand.name},
    )
    return brand


def soft_delete_brand(tenant_id: Any, brand_id: Any, actor_id: Any) -> None:
    """Soft-delete a brand. Raises ``ConflictError`` if active products exist."""
    brand = get_brand_by_id(tenant_id, brand_id)
    if Product.objects.filter(
        brand_id=brand_id, deleted_at__isnull=True
    ).exists():
        raise ConflictError(
            "Cannot delete this brand while active products are assigned to it."
        )
    brand.deleted_at = timezone.now()
    brand.save(update_fields=["deleted_at"])
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="BRAND_DELETED",
        entity_type="Brand",
        entity_id=brand.id,
    )


# ═════════════════════════════════════════════════════════════════
# Product listing & retrieval
# ═════════════════════════════════════════════════════════════════

def get_all_products(tenant_id: Any, filters: dict | None = None):
    """Return an annotated queryset of active products for *tenant_id*.

    Supported filter keys (all optional):
      - ``category_id``
      - ``brand_id``
      - ``gender``
      - ``is_archived``
      - ``search`` — case-insensitive name contains
      - ``tags``   — list of tags that must all be present (JSONField __contains)
    """
    filters = filters or {}
    qs = Product.objects.filter(
        tenant_id=tenant_id, deleted_at__isnull=True
    ).select_related("category", "brand")

    if "category_id" in filters:
        qs = qs.filter(category_id=filters["category_id"])
    if "brand_id" in filters:
        qs = qs.filter(brand_id=filters["brand_id"])
    if "gender" in filters:
        qs = qs.filter(gender=filters["gender"])
    if "is_archived" in filters:
        qs = qs.filter(is_archived=filters["is_archived"])
    if "search" in filters:
        qs = qs.filter(name__icontains=filters["search"])
    if "tags" in filters and filters["tags"]:
        # JSONField __contains checks that the stored list is a superset of the argument.
        qs = qs.filter(tags__contains=filters["tags"])

    return qs.annotate(
        variant_count=Count(
            "variants",
            filter=Q(variants__deleted_at__isnull=True),
        )
    )


def get_product_by_id(tenant_id: Any, product_id: Any) -> Product:
    """Fetch a single active product with variants pre-fetched.

    Raises ``NotFoundError`` if the product does not exist or belongs to a
    different tenant.
    """
    try:
        return (
            Product.objects.filter(
                pk=product_id, tenant_id=tenant_id, deleted_at__isnull=True
            )
            .prefetch_related("variants")
            .get()
        )
    except Product.DoesNotExist:
        raise NotFoundError(f"Product {product_id} not found.")


# ═════════════════════════════════════════════════════════════════
# Product creation
# ═════════════════════════════════════════════════════════════════

def create_product(tenant_id: Any, actor_id: Any, data: dict) -> Product:
    """Create a new product.

    ``tenant_id`` is always sourced from the verified JWT — never from
    user-supplied request data.
    """
    # Validate that the category belongs to this tenant
    if not Category.objects.filter(
        pk=data["category_id"], tenant_id=tenant_id, deleted_at__isnull=True
    ).exists():
        raise NotFoundError("Category not found for this tenant.")

    product = Product.objects.create(
        tenant_id=tenant_id,
        name=data["name"],
        description=data.get("description"),
        category_id=data["category_id"],
        brand_id=data.get("brand_id"),
        gender=data.get("gender", "UNISEX"),
        tags=data.get("tags", []),
        tax_rule=data.get("tax_rule", "STANDARD_VAT"),
        is_archived=data.get("is_archived", False),
    )
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="PRODUCT_CREATED",
        entity_type="Product",
        entity_id=product.id,
        after={"name": product.name},
    )
    return product


def create_product_variants(
    tenant_id: Any, product_id: Any, variants_data: list[dict]
) -> list[ProductVariant]:
    """Bulk-create variants for a product.

    Raises ``NotFoundError`` if the product is not found.
    Raises ``ConflictError`` on intra-batch or database SKU conflicts.
    All variants are created in a single atomic transaction.
    """
    with transaction.atomic():
        # Confirm product belongs to this tenant
        try:
            product = Product.objects.get(
                pk=product_id, tenant_id=tenant_id, deleted_at__isnull=True
            )
        except Product.DoesNotExist:
            raise NotFoundError(f"Product {product_id} not found.")

        # Build SKU list — auto-generate if absent
        skus: list[str] = []
        for idx, vd in enumerate(variants_data):
            if vd.get("sku"):
                skus.append(vd["sku"])
            else:
                # Deterministic auto-SKU: first 8 chars of product name (uppercase) + index
                prefix = "".join(c for c in product.name.upper() if c.isalnum())[:8]
                skus.append(f"{prefix}-{idx + 1:03d}")

        # Check intra-batch duplicates
        if len(skus) != len(set(skus)):
            raise ConflictError("Duplicate SKUs found within the submitted batch.")

        # Check for existing DB conflicts
        if ProductVariant.objects.filter(
            tenant_id=tenant_id, sku__in=skus
        ).exists():
            raise ConflictError(
                "One or more SKUs in this batch already exist for this tenant."
            )

        instances = [
            ProductVariant(
                id=uuid.uuid4(),
                product=product,
                tenant_id=tenant_id,
                sku=sku,
                barcode=vd.get("barcode"),
                size=vd.get("size"),
                colour=vd.get("colour"),
                cost_price=vd["cost_price"],
                retail_price=vd["retail_price"],
                wholesale_price=vd.get("wholesale_price"),
                stock_quantity=vd.get("stock_quantity", 0),
                low_stock_threshold=vd.get("low_stock_threshold", 5),
                image_urls=vd.get("image_urls", []),
            )
            for sku, vd in zip(skus, variants_data)
        ]
        return ProductVariant.objects.bulk_create(instances)


# ═════════════════════════════════════════════════════════════════
# Product updates
# ═════════════════════════════════════════════════════════════════

def update_product(
    tenant_id: Any, product_id: Any, actor_id: Any, data: dict
) -> Product:
    """Update mutable fields on a product."""
    product = get_product_by_id(tenant_id, product_id)
    old_name = product.name
    updatable = (
        "name", "description", "category_id", "brand_id",
        "gender", "tags", "tax_rule",
    )
    for field in updatable:
        if field in data:
            setattr(product, field, data[field])
    product.save()
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="PRODUCT_UPDATED",
        entity_type="Product",
        entity_id=product.id,
        before={"name": old_name},
        after={"name": product.name},
    )
    return product


def update_product_variant(
    tenant_id: Any, variant_id: Any, actor_id: Any, data: dict
) -> ProductVariant:
    """Update mutable fields on a variant.

    Raises ``NotFoundError`` if the variant is not found or belongs to a
    different tenant.
    """
    try:
        variant = ProductVariant.objects.get(
            pk=variant_id, tenant_id=tenant_id, deleted_at__isnull=True
        )
    except ProductVariant.DoesNotExist:
        raise NotFoundError(f"Variant {variant_id} not found.")

    updatable = (
        "sku", "barcode", "size", "colour",
        "cost_price", "retail_price", "wholesale_price",
        "low_stock_threshold", "image_urls",
    )
    changed_fields = []
    for field in updatable:
        if field in data:
            setattr(variant, field, data[field])
            changed_fields.append(field)

    changed_fields.append("updated_at")
    variant.save(update_fields=changed_fields)
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="VARIANT_UPDATED",
        entity_type="ProductVariant",
        entity_id=variant.id,
    )
    return variant


# ═════════════════════════════════════════════════════════════════
# Soft delete & archive
# ═════════════════════════════════════════════════════════════════

def soft_delete_product(
    tenant_id: Any, product_id: Any, actor_id: Any
) -> None:
    """Soft-delete a product and all its non-deleted variants atomically."""
    product = get_product_by_id(tenant_id, product_id)
    now = timezone.now()
    with transaction.atomic():
        ProductVariant.objects.filter(
            product_id=product_id, deleted_at__isnull=True
        ).update(deleted_at=now)
        product.deleted_at = now
        product.save(update_fields=["deleted_at"])
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="PRODUCT_DELETED",
        entity_type="Product",
        entity_id=product.id,
    )


def archive_product(
    tenant_id: Any, product_id: Any, actor_id: Any
) -> Product:
    """Set ``is_archived=True`` on a product."""
    product = get_product_by_id(tenant_id, product_id)
    product.is_archived = True
    product.save(update_fields=["is_archived", "updated_at"])
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="PRODUCT_ARCHIVED",
        entity_type="Product",
        entity_id=product.id,
    )
    return product


def unarchive_product(
    tenant_id: Any, product_id: Any, actor_id: Any
) -> Product:
    """Set ``is_archived=False`` on a product."""
    product = get_product_by_id(tenant_id, product_id)
    product.is_archived = False
    product.save(update_fields=["is_archived", "updated_at"])
    _log(
        actor_id=actor_id,
        tenant_id=tenant_id,
        action="PRODUCT_UNARCHIVED",
        entity_type="Product",
        entity_id=product.id,
    )
    return product
