"""
apps/webstore/services/collection_service.py

Service layer for webstore collection product resolution.

Supports two collection types:
  - "manual"    — products are an explicit ordered list of UUIDs
  - "automated" — products are resolved dynamically via filter_rules

The automated rule engine mirrors the one in storefront_service, but lives
here so the tenant admin API can also compute live product counts and
validate rule structure without duplicating logic.
"""

import logging

from django.db.models import Q, QuerySet

from apps.catalog.models import Product

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Rule → Q translation (mirrors storefront_service._rule_to_q)
# ---------------------------------------------------------------------------


def _rule_to_q(rule: dict) -> Q | None:
    """
    Converts a single filter_rule dict to a Django Q object.

    Rule shape: {"field": str, "relation": str, "value": str}

    Returns ``None`` for unrecognised field/relation combinations so callers
    can skip invalid rules gracefully.
    """
    field = rule.get("field", "")
    relation = rule.get("relation", "equals")
    value = rule.get("value", "")

    if not field or not value:
        return None

    if field == "vendor":
        if relation == "contains":
            return Q(brand__name__icontains=value)
        return Q(brand__name__iexact=value)

    if field == "product_type":
        # Catalog has no product_type field; map to gender or tags.
        return Q(gender__iexact=value) | Q(tags__icontains=value)

    if field == "category":
        return Q(category__name__iexact=value) | Q(category__id=value)

    if field == "price":
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        if relation == "greater_than":
            return Q(variants__retail_price__gt=numeric)
        if relation == "less_than":
            return Q(variants__retail_price__lt=numeric)
        return Q(variants__retail_price=numeric)

    if field == "tag":
        # tags is a JSONField (list of strings); icontains matches on the
        # serialised JSON text — sufficient for simple tag equality checks.
        if relation in ("contains", "equals"):
            return Q(tags__icontains=value)

    if field == "title":
        if relation == "contains":
            return Q(name__icontains=value)
        if relation == "starts_with":
            return Q(name__istartswith=value)
        return Q(name__iexact=value)

    logger.debug("Unrecognised collection filter rule: %s", rule)
    return None


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def resolve_automated_collection_products(collection) -> QuerySet:
    """
    Returns a filtered ``Product`` queryset for an *automated* collection.

    Always applies:
      - tenant isolation
      - is_archived=False
      - deleted_at=None

    Then applies all ``filter_rules`` combined according to
    ``filter_conjunction`` ("AND" / "OR").

    Calling code should call ``.distinct()`` if joining across multi-value
    relations (e.g. variants__retail_price) to avoid duplicate rows.

    Raises no exceptions for empty / invalid rules — falls back to an
    unfiltered (tenant-scoped) active product queryset.
    """
    base_qs = Product.objects.filter(
        tenant=collection.tenant,
        is_archived=False,
        deleted_at=None,
    ).select_related("category", "brand").prefetch_related("variants")

    rules = collection.filter_rules or []
    q_objects = [q for rule in rules if (q := _rule_to_q(rule)) is not None]

    if not q_objects:
        return base_qs.distinct()

    conjunction = collection.filter_conjunction  # "AND" or "OR"

    if conjunction == "OR":
        combined_q = q_objects[0]
        for q in q_objects[1:]:
            combined_q |= q
    else:  # default: AND
        combined_q = q_objects[0]
        for q in q_objects[1:]:
            combined_q &= q

    return base_qs.filter(combined_q).distinct()


def get_collection_product_count(collection) -> int:
    """
    Returns the product count for a collection without loading all records.

    For manual collections: ``len(manual_product_ids)``.
    For automated collections: efficient ``.count()`` on the resolved queryset.
    """
    if collection.collection_type == "manual":
        return len(collection.manual_product_ids or [])

    return resolve_automated_collection_products(collection).count()
