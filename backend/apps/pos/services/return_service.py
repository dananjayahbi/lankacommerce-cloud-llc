"""
Return service layer for the POS app.

Handles return eligibility validation, proportional refund computation,
and atomic database writes for the full return lifecycle.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.catalog.models import StockMovementReason
from apps.catalog.services.inventory_service import adjust_stock
from apps.pos.models import (
    Return,
    ReturnLine,
    ReturnRefundMethod,
    ReturnStatus,
    Sale,
    SaleLine,
    StoreCredit,
)
from apps.tenants.models import Tenant

# ──────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────

RETURN_WINDOW_DAYS = 30


# ──────────────────────────────────────────────────────────────────
# get_remaining_returnable_qty
# ──────────────────────────────────────────────────────────────────

def get_remaining_returnable_qty(sale_line_id: Any) -> int:
    """Sum of ReturnLine quantities for COMPLETED returns on this SaleLine."""
    result = ReturnLine.objects.filter(
        original_sale_line_id=sale_line_id,
        return_record__status=ReturnStatus.COMPLETED,
    ).aggregate(total=Sum("quantity"))
    return int(result["total"] or 0)


# ──────────────────────────────────────────────────────────────────
# validate_return_eligibility
# ──────────────────────────────────────────────────────────────────

def validate_return_eligibility(
    tenant_id: Any,
    original_sale_id: Any,
    lines: list[dict],
) -> Sale:
    """
    Validate all preconditions for a return.

    Returns the Sale with prefetched lines on success.
    Raises ValueError on any violation.
    """
    # 1. Sale must exist in this tenant
    try:
        sale = Sale.objects.prefetch_related("lines").get(
            id=original_sale_id,
            tenant_id=tenant_id,
        )
    except Sale.DoesNotExist:
        raise ValueError(
            f"Sale {original_sale_id} not found in this tenant."
        )

    # 2. Must be COMPLETED
    if sale.status != "COMPLETED":
        raise ValueError(
            f"Only COMPLETED sales can be returned. "
            f"Sale {original_sale_id} has status '{sale.status}'."
        )

    # 3. Within return window
    sale_date = sale.created_at
    expiry_date = sale_date + timedelta(days=RETURN_WINDOW_DAYS)
    if timezone.now() > expiry_date:
        raise ValueError(
            f"Return window expired. Sale was created on "
            f"{sale_date.strftime('%Y-%m-%d')}; "
            f"returns must be made by {expiry_date.strftime('%Y-%m-%d')}."
        )

    # Build a lookup of SaleLines by ID for fast validation
    sale_line_map = {str(sl.id): sl for sl in sale.lines.all()}

    # 4 & 5. Validate each requested line
    for line in lines:
        sl_id = str(line["sale_line_id"])
        qty = int(line["quantity"])

        if sl_id not in sale_line_map:
            raise ValueError(
                f"SaleLine {sl_id} does not belong to sale {original_sale_id}."
            )

        if qty <= 0:
            raise ValueError(
                f"Return quantity must be greater than zero (line {sl_id})."
            )

        sale_line = sale_line_map[sl_id]
        already_returned = get_remaining_returnable_qty(sl_id)
        remaining = sale_line.quantity - already_returned

        if qty > remaining:
            raise ValueError(
                f"Return quantity {qty} for '{sale_line.product_name_snapshot}' "
                f"exceeds remaining returnable quantity of {remaining} "
                f"(original qty: {sale_line.quantity}, already returned: {already_returned})."
            )

    return sale


# ──────────────────────────────────────────────────────────────────
# compute_line_refund_amounts
# ──────────────────────────────────────────────────────────────────

def compute_line_refund_amounts(
    sale: Sale,
    return_lines: list[dict],
) -> tuple[list[dict], Decimal]:
    """
    Compute proportional refund for each return line.

    Returns (enriched_lines, grand_total_refund).
    """
    sale_line_map = {str(sl.id): sl for sl in sale.lines.all()}
    enriched: list[dict] = []
    grand_total = Decimal("0.00")

    for line in return_lines:
        sl_id = str(line["sale_line_id"])
        return_qty = Decimal(str(line["quantity"]))
        sale_line = sale_line_map[sl_id]
        orig_qty = Decimal(str(sale_line.quantity))
        line_total = Decimal(str(sale_line.line_total_after_discount))

        line_refund = (return_qty / orig_qty * line_total).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        grand_total += line_refund

        enriched.append(
            {
                "sale_line_id": sl_id,
                "variant_id": str(sale_line.variant_id),
                "quantity": int(return_qty),
                "unit_price": sale_line.unit_price,
                "line_refund_amount": line_refund,
                "product_name_snapshot": sale_line.product_name_snapshot,
                "variant_description_snapshot": sale_line.variant_description_snapshot,
            }
        )

    grand_total = grand_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return enriched, grand_total


# ──────────────────────────────────────────────────────────────────
# initiate_return
# ──────────────────────────────────────────────────────────────────

def initiate_return(tenant_id: Any, input_data: dict) -> Return:
    """
    Atomically create a Return record with all associated lines.

    input_data keys:
        initiated_by_id, authorized_by_id, original_sale_id, lines,
        refund_method, restock_items, reason, card_reversal_reference (optional)
    """
    with transaction.atomic():
        sale = validate_return_eligibility(
            tenant_id,
            input_data["original_sale_id"],
            input_data["lines"],
        )

        enriched_lines, grand_total = compute_line_refund_amounts(
            sale, input_data["lines"]
        )

        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            raise ValueError(f"Tenant {tenant_id} not found.")

        return_record = Return.objects.create(
            tenant=tenant,
            original_sale=sale,
            initiated_by_id=input_data["initiated_by_id"],
            authorized_by_id=input_data["authorized_by_id"],
            refund_method=input_data["refund_method"],
            refund_amount=grand_total,
            restock_items=input_data.get("restock_items", True),
            reason=input_data.get("reason", ""),
            status=ReturnStatus.COMPLETED,
            card_reversal_reference=input_data.get("card_reversal_reference") or "",
        )

        # Bulk create ReturnLines with is_restocked=False initially
        return_line_objs = ReturnLine.objects.bulk_create(
            [
                ReturnLine(
                    return_record=return_record,
                    original_sale_line_id=el["sale_line_id"],
                    variant_id=el["variant_id"],
                    product_name_snapshot=el["product_name_snapshot"],
                    variant_description_snapshot=el["variant_description_snapshot"],
                    quantity=el["quantity"],
                    unit_price=el["unit_price"],
                    line_refund_amount=el["line_refund_amount"],
                    is_restocked=False,
                )
                for el in enriched_lines
            ]
        )

        # Restock items per-line
        if input_data.get("restock_items", True):
            for rl, el in zip(return_line_objs, enriched_lines):
                adjust_stock(
                    tenant_id=tenant_id,
                    variant_id=el["variant_id"],
                    actor_id=input_data["initiated_by_id"],
                    quantity_delta=el["quantity"],
                    reason=StockMovementReason.SALE_RETURN,
                )
                ReturnLine.objects.filter(id=rl.id).update(is_restocked=True)

        # Create StoreCredit record if applicable
        if input_data["refund_method"] == ReturnRefundMethod.STORE_CREDIT:
            StoreCredit.objects.create(
                tenant=tenant,
                amount=grand_total,
                note=f"Return ref {return_record.id}",
            )

        # Load fully with related data
        return Return.objects.select_related(
            "original_sale",
            "initiated_by",
            "authorized_by",
        ).prefetch_related("lines").get(id=return_record.id)


# ──────────────────────────────────────────────────────────────────
# get_return_by_id
# ──────────────────────────────────────────────────────────────────

def get_return_by_id(tenant_id: Any, return_id: Any) -> Return:
    """
    Fetch a single Return with all related data.
    Raises Return.DoesNotExist if not found.
    """
    return Return.objects.select_related(
        "original_sale",
        "initiated_by",
        "authorized_by",
    ).prefetch_related("lines__variant").get(
        id=return_id,
        tenant_id=tenant_id,
    )


# ──────────────────────────────────────────────────────────────────
# get_returns
# ──────────────────────────────────────────────────────────────────

def get_returns(tenant_id: Any, filters: dict | None = None) -> dict:
    """
    Return a paginated list of Return records scoped to the tenant.

    Optional filters: original_sale_id, initiated_by_id, refund_method,
                      from_date, to_date, page, limit.
    """
    qs = Return.objects.select_related(
        "original_sale",
        "initiated_by",
        "authorized_by",
    ).prefetch_related("lines").filter(tenant_id=tenant_id)

    if filters:
        if filters.get("original_sale_id"):
            qs = qs.filter(original_sale_id=filters["original_sale_id"])
        if filters.get("initiated_by_id"):
            qs = qs.filter(initiated_by_id=filters["initiated_by_id"])
        if filters.get("refund_method"):
            qs = qs.filter(refund_method=filters["refund_method"])
        if filters.get("from_date"):
            qs = qs.filter(created_at__date__gte=filters["from_date"])
        if filters.get("to_date"):
            qs = qs.filter(created_at__date__lte=filters["to_date"])

    page = int((filters or {}).get("page", 1))
    limit = min(int((filters or {}).get("limit", 25)), 100)
    total = qs.count()
    offset = (page - 1) * limit
    data = list(qs[offset : offset + limit])

    return {
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
    }
