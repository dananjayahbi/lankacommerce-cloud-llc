"""
Sale service layer for the POS app.

All sale lifecycle operations — creating, retrieving, voiding, and
shift-level aggregation — are handled here.

Transaction safety
------------------
``create_sale`` and ``void_sale`` wrap all database writes in a single
``transaction.atomic()`` block with ``select_for_update()`` row locks.
This guarantees all-or-nothing semantics: no partial writes can reach the
database even if the process dies mid-operation.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.catalog.exceptions import ConflictError, NotFoundError
from apps.catalog.models import ProductVariant, StockMovementReason, TaxRule
from apps.catalog.services.audit_service import log_audit_event
from apps.catalog.services.inventory_service import adjust_stock
from apps.pos.models import (
    Payment,
    PaymentLegMethod,
    PaymentMethod,
    Sale,
    SaleLine,
    SaleStatus,
    Shift,
    ShiftStatus,
)
from apps.tenants.models import Tenant

# ──────────────────────────────────────────────────────────────────
# Tax rate map — keyed by TaxRule value strings
# ──────────────────────────────────────────────────────────────────

_TAX_RATES: dict[str, Decimal] = {
    TaxRule.STANDARD_VAT: Decimal("0.15"),   # 15 %
    TaxRule.REDUCED_VAT:  Decimal("0.025"),  # 2.5 % (SSCL equivalent)
    TaxRule.ZERO_RATED:   Decimal("0.00"),
    TaxRule.EXEMPT:       Decimal("0.00"),
}


# ──────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────

def _build_variant_description(variant: ProductVariant) -> str:
    """Assemble a human-readable description from size / colour attributes."""
    parts: list[str] = []
    if variant.size:
        parts.append(variant.size)
    if variant.colour:
        parts.append(variant.colour)
    return " / ".join(parts) if parts else variant.sku


def _compute_lines(
    lines: list[dict],
    variant_map: dict[str, ProductVariant],
) -> tuple[list[dict], Decimal, Decimal]:
    """
    Compute per-line financial figures.

    Returns (computed_lines, total_subtotal, total_tax).
    All monetary values are Decimal, rounded to 2 d.p. with ROUND_HALF_UP.
    """
    computed: list[dict] = []
    total_subtotal = Decimal("0.00")
    total_tax = Decimal("0.00")

    for line in lines:
        vid = str(line["variant_id"])
        qty = int(line["quantity"])
        disc_pct = Decimal(str(line.get("discount_percent", "0")))
        variant = variant_map[vid]

        unit_price = Decimal(str(variant.retail_price))
        line_total_before = (unit_price * Decimal(str(qty))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        disc_amount = (line_total_before * disc_pct / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        line_total_after = (line_total_before - disc_amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        tax_rate = _TAX_RATES.get(variant.product.tax_rule, Decimal("0.00"))
        line_tax = (line_total_after * tax_rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        total_subtotal += line_total_after
        total_tax += line_tax

        computed.append(
            {
                "variant": variant,
                "vid": vid,
                "qty": qty,
                "disc_pct": disc_pct,
                "unit_price": unit_price,
                "line_total_before": line_total_before,
                "disc_amount": disc_amount,
                "line_total_after": line_total_after,
                "product_name_snapshot": variant.product.name,
                "variant_description_snapshot": _build_variant_description(variant),
                "sku": variant.sku,
            }
        )

    return computed, total_subtotal, total_tax


def _resolve_variants(
    tenant_id: Any, lines: list[dict]
) -> dict[str, ProductVariant]:
    """
    Query variants with their products and return a variant_id → variant map.

    Raises NotFoundError for any missing, archived, or cross-tenant variant.
    """
    variant_map: dict[str, ProductVariant] = {}
    for line in lines:
        vid = str(line["variant_id"])
        if vid in variant_map:
            continue
        try:
            variant = ProductVariant.objects.select_related("product").get(
                id=vid, tenant_id=tenant_id, deleted_at__isnull=True
            )
        except ProductVariant.DoesNotExist:
            raise NotFoundError(f"Variant {vid} not found.")
        if variant.product.is_archived:
            raise NotFoundError(
                f"Variant {vid} belongs to an archived product and cannot be sold."
            )
        variant_map[vid] = variant
    return variant_map


def _persist_sale_lines(sale: Sale, computed_lines: list[dict]) -> None:
    """Bulk-create SaleLine records for a sale."""
    SaleLine.objects.bulk_create(
        [
            SaleLine(
                sale=sale,
                variant=cl["variant"],
                product_name_snapshot=cl["product_name_snapshot"],
                variant_description_snapshot=cl["variant_description_snapshot"],
                sku=cl["sku"],
                unit_price=cl["unit_price"],
                quantity=cl["qty"],
                discount_percent=cl["disc_pct"],
                discount_amount=cl["disc_amount"],
                line_total_before_discount=cl["line_total_before"],
                line_total_after_discount=cl["line_total_after"],
            )
            for cl in computed_lines
        ]
    )


# ══════════════════════════════════════════════════════════════════
# create_sale
# ══════════════════════════════════════════════════════════════════

def create_sale(
    tenant_id: Any,
    shift_id: Any,
    cashier_id: Any,
    lines: list[dict],
    discount_amount: Decimal = Decimal("0.00"),
    authorizing_manager_id: Any = None,
    payment_method: str | None = None,
    cash_received: Decimal | None = None,
    card_amount: Decimal | None = None,
    card_reference_number: str | None = None,
) -> Sale:
    """Create a completed sale with atomic stock deduction and payment records.

    ``lines`` is a list of dicts, each containing:
        - ``variant_id``: str / UUID
        - ``quantity``:   positive int
        - ``discount_percent``: Decimal, optional (default 0)

    Payment parameters:
        - ``cash_received``: Required for CASH and SPLIT methods.
        - ``card_amount``: Required for SPLIT method (card leg amount).
        - ``card_reference_number``: Optional terminal approval code for CARD legs.

    All writes execute inside a single ``transaction.atomic()`` block with
    ``select_for_update()`` locks on the shift and, via ``adjust_stock``,
    on each variant row.  Any failure rolls back the entire transaction.
    """
    with transaction.atomic():
        # ── 1. Validate and lock shift ────────────────────────────
        try:
            shift = Shift.objects.select_for_update().get(  # noqa: F841
                id=shift_id, tenant_id=tenant_id
            )
        except Shift.DoesNotExist:
            raise NotFoundError(f"Shift {shift_id} not found.")
        if shift.status != ShiftStatus.OPEN:
            raise ConflictError("Sales cannot be created against a closed shift.")

        # ── 2. Resolve variants (tenant-scoped, non-deleted, non-archived) ──
        variant_map = _resolve_variants(tenant_id, lines)

        # ── 3 & 4. Compute per-line and sale-level figures ────────
        computed_lines, total_subtotal, total_tax = _compute_lines(
            lines, variant_map
        )

        cart_discount = Decimal(str(discount_amount)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if cart_discount > total_subtotal:
            raise ConflictError(
                "Cart discount cannot exceed the sale subtotal."
            )
        total_amount = (total_subtotal - cart_discount + total_tax).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        # ── 5. Validate stock availability ────────────────────────
        try:
            tenant_obj = Tenant.objects.get(pk=tenant_id)
            allow_negative = tenant_obj.settings.get("allow_negative_stock", False)
        except Tenant.DoesNotExist:
            allow_negative = False

        if not allow_negative:
            for cl in computed_lines:
                v = cl["variant"]
                if v.stock_quantity < cl["qty"]:
                    raise ConflictError(
                        f"Insufficient stock for '{v.product.name}' "
                        f"(SKU: {v.sku}). "
                        f"Available: {v.stock_quantity}, "
                        f"Requested: {cl['qty']}."
                    )

        # ── 6. Compute change_given for CASH / SPLIT ──────────────
        change_given: Decimal | None = None
        if payment_method == PaymentMethod.CASH and cash_received is not None:
            change_given = (cash_received - total_amount).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        elif payment_method == PaymentMethod.SPLIT:
            # For SPLIT: cash leg = total - card_amount
            _card_amt = Decimal(str(card_amount or "0"))
            _cash_leg = (total_amount - _card_amt).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            _cash_recv = Decimal(str(cash_received or "0"))
            change_given = (_cash_recv - _cash_leg).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        # ── 7. Create Sale record ─────────────────────────────────
        sale = Sale.objects.create(
            tenant_id=tenant_id,
            shift_id=shift_id,
            cashier_id=cashier_id,
            subtotal=total_subtotal,
            discount_amount=cart_discount,
            tax_amount=total_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            total_amount=total_amount,
            change_given=change_given,
            payment_method=payment_method,
            authorizing_manager_id=authorizing_manager_id,
            status=SaleStatus.COMPLETED,
            completed_at=timezone.now(),
        )

        # ── 8. Create SaleLine records ────────────────────────────
        _persist_sale_lines(sale, computed_lines)

        # ── 9. Create Payment records ─────────────────────────────
        if payment_method == PaymentMethod.CASH:
            Payment.objects.create(
                sale=sale,
                method=PaymentLegMethod.CASH,
                amount=cash_received or total_amount,
            )
        elif payment_method == PaymentMethod.CARD:
            Payment.objects.create(
                sale=sale,
                method=PaymentLegMethod.CARD,
                amount=total_amount,
                card_reference_number=card_reference_number or None,
            )
        elif payment_method == PaymentMethod.SPLIT:
            _card_amt_d = Decimal(str(card_amount or "0")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            _cash_leg_d = (total_amount - _card_amt_d).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            Payment.objects.create(
                sale=sale,
                method=PaymentLegMethod.CARD,
                amount=_card_amt_d,
                card_reference_number=card_reference_number or None,
            )
            Payment.objects.create(
                sale=sale,
                method=PaymentLegMethod.CASH,
                amount=_cash_leg_d,
            )

        # ── 10. Deduct stock for every line ────────────────────────
        for cl in computed_lines:
            adjust_stock(
                tenant_id=tenant_id,
                variant_id=cl["vid"],
                actor_id=cashier_id,
                quantity_delta=-cl["qty"],
                reason=StockMovementReason.SALE,
                reference_id=sale.id,
            )

    # Return fully populated sale object
    return (
        Sale.objects.select_related("cashier", "authorizing_manager", "shift")
        .prefetch_related("lines__variant__product", "payments")
        .get(id=sale.id)
    )


# ══════════════════════════════════════════════════════════════════
# get_sale_by_id
# ══════════════════════════════════════════════════════════════════

def get_sale_by_id(tenant_id: Any, sale_id: Any) -> Sale:
    """Retrieve a single sale with all related data for detail/receipt views."""
    try:
        return (
            Sale.objects.select_related(
                "cashier", "authorizing_manager", "voided_by", "shift"
            )
            .prefetch_related("lines__variant__product", "payments")
            .get(id=sale_id, tenant_id=tenant_id)
        )
    except Sale.DoesNotExist:
        raise NotFoundError(f"Sale {sale_id} not found.")


# ══════════════════════════════════════════════════════════════════
# get_sales
# ══════════════════════════════════════════════════════════════════

def get_sales(
    tenant_id: Any, filters: dict | None = None
) -> tuple[list[Sale], int]:
    """Return a paginated, filtered list of sales for the tenant.

    ``filters`` may contain any combination of:
        shift_id, cashier_id, status (str or list), from_date, to_date,
        page (default 1), limit (default 20, max 100).

    Returns ``(sale_list, total_count)``.
    """
    if filters is None:
        filters = {}

    qs = Sale.objects.filter(tenant_id=tenant_id).select_related(
        "cashier", "authorizing_manager", "shift"
    )

    if filters.get("shift_id"):
        qs = qs.filter(shift_id=filters["shift_id"])
    if filters.get("cashier_id"):
        qs = qs.filter(cashier_id=filters["cashier_id"])
    if filters.get("status"):
        status_val = filters["status"]
        if isinstance(status_val, list):
            qs = qs.filter(status__in=status_val)
        else:
            qs = qs.filter(status=status_val)
    if filters.get("from_date"):
        qs = qs.filter(created_at__gte=filters["from_date"])
    if filters.get("to_date"):
        qs = qs.filter(created_at__lte=filters["to_date"])

    qs = qs.order_by("-created_at")

    page = max(1, int(filters.get("page", 1)))
    limit = min(100, max(1, int(filters.get("limit", 20))))

    total_count = qs.count()
    offset = (page - 1) * limit
    sale_list = list(qs[offset : offset + limit])

    return sale_list, total_count


# ══════════════════════════════════════════════════════════════════
# void_sale
# ══════════════════════════════════════════════════════════════════

def void_sale(tenant_id: Any, sale_id: Any, actor_id: Any) -> Sale:
    """Void a completed sale and restore stock for all lines.

    Raises:
        NotFoundError: sale or shift not found.
        ConflictError: sale is already voided, held (OPEN), or the shift is closed.
    """
    with transaction.atomic():
        # Lock the sale row to prevent concurrent void attempts
        try:
            sale = Sale.objects.select_for_update().get(
                id=sale_id, tenant_id=tenant_id
            )
        except Sale.DoesNotExist:
            raise NotFoundError(f"Sale {sale_id} not found.")

        if sale.status == SaleStatus.VOIDED:
            raise ConflictError("This sale has already been voided.")
        if sale.status == SaleStatus.OPEN:
            raise ConflictError(
                "Held sales cannot be voided — "
                "complete or discard the cart instead."
            )

        # Confirm shift is still open
        try:
            shift = Shift.objects.get(id=sale.shift_id)
        except Shift.DoesNotExist:
            raise NotFoundError(f"Shift for sale {sale_id} not found.")
        if shift.status != ShiftStatus.OPEN:
            raise ConflictError(
                "Cannot void a sale belonging to a closed shift."
            )

        # Mark the sale as voided
        Sale.objects.filter(id=sale_id).update(
            status=SaleStatus.VOIDED,
            voided_by_id=actor_id,
            voided_at=timezone.now(),
        )

        # Restore stock for every line
        for line in SaleLine.objects.filter(sale_id=sale_id):
            adjust_stock(
                tenant_id=tenant_id,
                variant_id=line.variant_id,
                actor_id=actor_id,
                quantity_delta=+line.quantity,
                reason=StockMovementReason.VOID_REVERSAL,
                reference_id=sale_id,
            )

    # Audit log (best-effort, outside the transaction so a log failure
    # never rolls back the void)
    log_audit_event(
        tenant_id=tenant_id,
        actor_id=actor_id,
        action="SALE_VOIDED",
        resource_type="Sale",
        resource_id=str(sale_id),
        after={"sale_id": str(sale_id), "voided_by": str(actor_id)},
    )

    return get_sale_by_id(tenant_id, sale_id)


# ══════════════════════════════════════════════════════════════════
# get_shift_sales
# ══════════════════════════════════════════════════════════════════

def get_shift_sales(tenant_id: Any, shift_id: Any) -> tuple[list[Sale], dict]:
    """Return all completed sales for a shift plus aggregated totals.

    Returns ``(sales_list, summary_dict)`` where *summary_dict* contains:
        total_sales_amount, cash_sum, card_sum, discount_sum, total_sales_count.
    """
    try:
        Shift.objects.get(id=shift_id, tenant_id=tenant_id)
    except Shift.DoesNotExist:
        raise NotFoundError(f"Shift {shift_id} not found.")

    qs = Sale.objects.filter(shift_id=shift_id, status=SaleStatus.COMPLETED)

    agg = qs.aggregate(
        total_sales_amount=Sum("total_amount"),
        cash_sum=Sum(
            "total_amount", filter=Q(payment_method=PaymentMethod.CASH)
        ),
        card_sum=Sum(
            "total_amount", filter=Q(payment_method=PaymentMethod.CARD)
        ),
        discount_sum=Sum("discount_amount"),
        total_sales_count=Count("id"),
    )

    zero = Decimal("0.00")
    summary = {
        "total_sales_amount": Decimal(
            str(agg["total_sales_amount"] or zero)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "cash_sum": Decimal(str(agg["cash_sum"] or zero)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
        "card_sum": Decimal(str(agg["card_sum"] or zero)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
        "discount_sum": Decimal(str(agg["discount_sum"] or zero)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
        "total_sales_count": agg["total_sales_count"] or 0,
    }

    sales = list(
        qs.select_related("cashier", "shift").prefetch_related(
            "lines__variant__product"
        )
    )
    return sales, summary


# ══════════════════════════════════════════════════════════════════
# hold_sale  (OPEN status — no stock deduction)
# ══════════════════════════════════════════════════════════════════

def hold_sale(
    tenant_id: Any,
    shift_id: Any,
    cashier_id: Any,
    lines: list[dict],
    discount_amount: Decimal = Decimal("0.00"),
    authorizing_manager_id: Any = None,
) -> Sale:
    """Create a held (OPEN) sale without touching stock.

    Held sales carry no financial commitment and no inventory impact.
    ``payment_method`` is always ``None``.  ``completed_at`` is not set.
    """
    with transaction.atomic():
        try:
            Shift.objects.select_for_update().get(
                id=shift_id, tenant_id=tenant_id
            )
        except Shift.DoesNotExist:
            raise NotFoundError(f"Shift {shift_id} not found.")

        variant_map = _resolve_variants(tenant_id, lines)
        computed_lines, total_subtotal, total_tax = _compute_lines(
            lines, variant_map
        )

        cart_discount = Decimal(str(discount_amount)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total_amount = (total_subtotal - cart_discount + total_tax).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        sale = Sale.objects.create(
            tenant_id=tenant_id,
            shift_id=shift_id,
            cashier_id=cashier_id,
            subtotal=total_subtotal,
            discount_amount=cart_discount,
            tax_amount=total_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            total_amount=total_amount,
            payment_method=None,
            authorizing_manager_id=authorizing_manager_id,
            status=SaleStatus.OPEN,
        )

        _persist_sale_lines(sale, computed_lines)

    return (
        Sale.objects.select_related("cashier", "authorizing_manager", "shift")
        .prefetch_related("lines__variant__product")
        .get(id=sale.id)
    )
