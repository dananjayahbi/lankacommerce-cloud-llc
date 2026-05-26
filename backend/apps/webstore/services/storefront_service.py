"""
apps/webstore/services/storefront_service.py

Service layer for the public storefront API (Phase 2).

Responsibilities:
  - Tenant resolution from URL slug (with status gating)
  - Active store config assembly (TenantWebstore + TenantThemeConfig + WebstoreTheme)
  - Filtered / sorted product queryset construction
  - Collection product resolution — both manual (ordered UUIDs) and automated
    (dynamic rule evaluation using Django Q objects for AND / OR conjunctions)
  - Default theme lookup

Catalog model field notes (POS-first model):
  - Product.is_archived=False / deleted_at=None  → "active & published"
  - ProductVariant.retail_price                  → storefront price
  - ProductVariant.wholesale_price               → compare_at_price
  - Category has no slug; filtered by name or id
  - Product has no slug; UUID used as storefront handle
"""

from django.db.models import Case, IntegerField, Q, When
from django.http import Http404

from apps.catalog.models import Product
from apps.tenants.models import Tenant, TenantStatus
from apps.webstore.models import (
    TenantThemeConfig,
    TenantWebstore,
    ThemeConfigStatus,
    WebstoreCollection,
    WebstoreTheme,
)

# ---------------------------------------------------------------------------
# Sort field map — translates public API sort param → Django ORM ordering
# ---------------------------------------------------------------------------

_SORT_MAP: dict[str, str] = {
    "newest": "-created_at",
    "price_asc": "variants__retail_price",
    "price_desc": "-variants__retail_price",
    "alpha_asc": "name",
    "alpha_desc": "-name",
    # No sales data in the catalog app; fall back to newest for best_selling.
    "best_selling": "-created_at",
}


# ---------------------------------------------------------------------------
# 6.1  Tenant resolution
# ---------------------------------------------------------------------------


def resolve_tenant(slug: str) -> Tenant:
    """
    Resolves an active Tenant from its URL slug.

    Raises Http404 (message: "Store not found") for:
      - Non-existent slugs
      - Soft-deleted tenants (deleted_at is set)
      - SUSPENDED or CANCELLED tenants
    """
    try:
        tenant = Tenant.objects.get(slug=slug, deleted_at=None)
    except Tenant.DoesNotExist:
        raise Http404("Store not found")

    if tenant.status in (TenantStatus.SUSPENDED, TenantStatus.CANCELLED):
        raise Http404("Store not found")

    return tenant


# ---------------------------------------------------------------------------
# 6.5  Default theme lookup
# ---------------------------------------------------------------------------


def get_default_theme() -> WebstoreTheme | None:
    """
    Returns the platform default theme (is_default=True).
    Falls back to the first published theme if no default is set.
    """
    theme = WebstoreTheme.objects.filter(is_default=True).first()
    if theme is None:
        theme = WebstoreTheme.objects.filter(is_published=True).first()
    return theme


# ---------------------------------------------------------------------------
# 6.2  Active store config assembly
# ---------------------------------------------------------------------------


def get_active_store_config(tenant: Tenant) -> dict:
    """
    Assembles the full store config dict for GET /public/<slug>/config/.

    Queries:
      Q1 — TenantWebstore (get_or_create, ≤ 2 queries)
      Q2 — TenantThemeConfig + WebstoreTheme via select_related (1 query)
      Q3 — fallback: WebstoreTheme.objects.filter(is_default=True) (0 if not needed)

    Total: ≤ 3 queries (matching the /config/ performance target).

    Safe fallback chain:
      1. Tenant's ACTIVE TenantThemeConfig
      2. Default platform theme's default_config
      3. Empty config dict (last resort, never raises)
    """
    # Q1: ensure TenantWebstore exists; create a disabled one if not
    webstore, _ = TenantWebstore.objects.get_or_create(
        tenant=tenant,
        defaults={"is_enabled": False},
    )

    # Q2: active theme config with theme pre-fetched in a single JOIN
    theme_config = (
        TenantThemeConfig.objects.select_related("theme")
        .filter(tenant=tenant, status=ThemeConfigStatus.ACTIVE)
        .first()
    )

    if theme_config is not None:
        theme = theme_config.theme
        config_data = theme_config.config
    else:
        # Q3 (conditional): fall back to default platform theme
        theme = get_default_theme()
        config_data = theme.default_config if theme else {}

    return {
        "webstore": webstore,
        "theme": theme,
        "config": config_data,
    }


# ---------------------------------------------------------------------------
# 6.3  Storefront product queryset
# ---------------------------------------------------------------------------


def get_storefront_products(tenant: Tenant, **filters):
    """
    Returns a filtered, sorted Product queryset for the storefront listing.

    Always applies:
      - tenant=tenant
      - is_archived=False
      - deleted_at=None

    Accepted filter kwargs:
      category  (str)  — category id (UUID) or name (case-insensitive)
      search    (str)  — icontains across name, description, variant SKU
      sort      (str)  — one of the _SORT_MAP keys; default "newest"
      min_price (str)  — variants__retail_price >= value
      max_price (str)  — variants__retail_price <= value

    Uses select_related + prefetch_related to satisfy the ≤ 4 query limit
    for the /products/ endpoint.
    """
    qs = (
        Product.objects.filter(
            tenant=tenant,
            is_archived=False,
            deleted_at=None,
        )
        .select_related("category", "brand")
        .prefetch_related("variants")
        .distinct()
    )

    # -- category --
    category = filters.get("category")
    if category:
        qs = qs.filter(
            Q(category__id=category) | Q(category__name__iexact=category)
        )

    # -- full-text search (icontains for SQLite dev compatibility) --
    search = filters.get("search")
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(description__icontains=search)
            | Q(variants__sku__icontains=search)
        ).distinct()

    # -- price range --
    min_price = filters.get("min_price")
    if min_price is not None:
        qs = qs.filter(variants__retail_price__gte=min_price).distinct()

    max_price = filters.get("max_price")
    if max_price is not None:
        qs = qs.filter(variants__retail_price__lte=max_price).distinct()

    # -- sort --
    sort = filters.get("sort", "newest")
    order_by = _SORT_MAP.get(sort, "-created_at")
    qs = qs.order_by(order_by)

    return qs


# ---------------------------------------------------------------------------
# Internal: automated collection rule → Q object
# ---------------------------------------------------------------------------


def _rule_to_q(rule: dict) -> Q:
    """
    Converts a single filter_rule dict to a Django Q object.

    Rule shape: {"field": str, "relation": str, "value": str}

    Supported field/relation combinations:
      vendor       / equals | contains  → brand__name
      product_type / equals             → gender__iexact OR tags__icontains
      category     / equals             → category__name__iexact | category__id
      price        / greater_than | less_than | equals → variants__retail_price
      tag          / contains | equals  → tags__icontains (JSONField)
    """
    field = rule.get("field", "")
    relation = rule.get("relation", "equals")
    value = rule.get("value", "")

    if field == "vendor":
        if relation == "contains":
            return Q(brand__name__icontains=value)
        return Q(brand__name__iexact=value)

    if field == "product_type":
        # Catalog has no product_type; map to gender or tags
        return Q(gender__iexact=value) | Q(tags__icontains=value)

    if field == "category":
        return Q(category__name__iexact=value) | Q(category__id=value)

    if field == "price":
        if relation == "greater_than":
            return Q(variants__retail_price__gt=value)
        if relation == "less_than":
            return Q(variants__retail_price__lt=value)
        return Q(variants__retail_price=value)

    if field == "tag":
        # tags is a JSONField (array of strings); __icontains works on the JSON text
        return Q(tags__icontains=value)

    # Unrecognised rule: exclude all (fail-safe)
    return Q(pk=None)


def _apply_collection_filter_rules(base_qs, filter_rules: list, conjunction: str):
    """
    Applies a list of filter rules to a queryset using AND or OR conjunction.

    - conjunction="AND": each rule is a separate .filter() chain (all must match)
    - conjunction="OR":  rules are combined with | into a single .filter() call
    """
    if not filter_rules:
        return base_qs

    if conjunction == "OR":
        combined_q = Q()
        for rule in filter_rules:
            combined_q |= _rule_to_q(rule)
        return base_qs.filter(combined_q).distinct()

    # AND — chain .filter() calls so each rule acts as a separate JOIN condition
    for rule in filter_rules:
        base_qs = base_qs.filter(_rule_to_q(rule))
    return base_qs.distinct()


# ---------------------------------------------------------------------------
# 6.4  Collection product resolution
# ---------------------------------------------------------------------------


def resolve_collection_products(
    collection: WebstoreCollection,
    tenant: Tenant,
    page: int = 1,
    page_size: int = 24,
    sort: str | None = None,
) -> tuple:
    """
    Returns (queryset_slice, total_count) for a collection's product list.

    Handles both manual and automated collection types.
    Base filters (is_archived, deleted_at, tenant) are always applied AFTER
    rule/manual resolution so deleted or archived products never leak through.

    Args:
        collection: The WebstoreCollection instance.
        tenant:     Resolved Tenant for base filter.
        page:       1-based page number.
        page_size:  Products per page.
        sort:       Optional sort override from the request query params.

    Returns:
        (qs_slice, total) — sliced queryset and the unsliced count.
    """
    base_qs = (
        Product.objects.filter(
            tenant=tenant,
            is_archived=False,
            deleted_at=None,
        )
        .select_related("category", "brand")
        .prefetch_related("variants")
        .distinct()
    )

    # ---- Manual collection -----------------------------------------------
    if collection.collection_type == "manual":
        ordered_ids = collection.manual_product_ids or []
        if not ordered_ids:
            return base_qs.none(), 0

        qs = base_qs.filter(id__in=ordered_ids)

        # Preserve explicit ordering when sort_order_type is "manual"
        if (sort is None or sort == "newest") and collection.sort_order_type == "manual":
            when_clauses = [When(id=pid, then=pos) for pos, pid in enumerate(ordered_ids)]
            qs = qs.annotate(
                manual_order=Case(*when_clauses, output_field=IntegerField())
            ).order_by("manual_order")
        else:
            effective_sort = sort or collection.sort_order_type
            qs = qs.order_by(_SORT_MAP.get(effective_sort, "-created_at"))

    # ---- Automated collection --------------------------------------------
    else:
        qs = _apply_collection_filter_rules(
            base_qs,
            collection.filter_rules,
            collection.filter_conjunction,
        )
        effective_sort = sort or collection.sort_order_type
        qs = qs.order_by(_SORT_MAP.get(effective_sort, "-created_at"))

    total = qs.count()
    offset = (page - 1) * page_size
    return qs[offset : offset + page_size], total
