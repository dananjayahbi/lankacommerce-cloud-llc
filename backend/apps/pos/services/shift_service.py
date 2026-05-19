"""
Shift service layer for the POS app.

Manages cashier work session lifecycle: opening a shift with a validated
opening float, closing a shift with computed cash reconciliation and an
immutable ShiftClosure record, and retrieving shift history.

Transaction safety
------------------
``close_shift`` wraps the ShiftClosure INSERT and Shift status UPDATE inside
a single ``transaction.atomic()`` block so both writes commit together or
roll back entirely.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.accounts.models import CustomUser, UserRole
from apps.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from apps.catalog.services.audit_service import log_audit_event
from apps.pos.models import (
    PaymentMethod,
    Sale,
    SaleStatus,
    Shift,
    ShiftClosure,
    ShiftStatus,
)


# ══════════════════════════════════════════════════════════════════
# open_shift
# ══════════════════════════════════════════════════════════════════

def open_shift(
    tenant_id: Any,
    cashier_id: Any,
    opening_float: Decimal,
) -> Shift:
    """Create a new OPEN shift for a cashier.

    A single ``INSERT`` is inherently atomic, so no ``transaction.atomic()``
    wrapper is needed here.

    Raises:
        ConflictError — if the cashier already has an OPEN shift in this tenant.
    """
    existing = Shift.objects.filter(
        tenant_id=tenant_id,
        cashier_id=cashier_id,
        status=ShiftStatus.OPEN,
    ).first()

    if existing:
        raise ConflictError(
            f"Cashier already has an open shift "
            f"(id={existing.id}, opened_at={existing.opened_at.isoformat()}). "
            "Close the existing shift before opening a new one."
        )

    shift = Shift.objects.create(
        tenant_id=tenant_id,
        cashier_id=cashier_id,
        status=ShiftStatus.OPEN,
        opening_float=opening_float.quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ),
    )
    return shift


# ══════════════════════════════════════════════════════════════════
# close_shift
# ══════════════════════════════════════════════════════════════════

def close_shift(
    tenant_id: Any,
    shift_id: Any,
    actor_id: Any,
    close_input: dict,
) -> tuple[Shift, ShiftClosure]:
    """Close an open shift and create an immutable ShiftClosure record.

    ``close_input`` must contain:
        - ``closing_cash_count``: Decimal — physical cash count at end of shift.
        - ``notes``: str | None — optional end-of-shift observations.

    Steps performed:
        1. Retrieve and validate the shift (exists, belongs to tenant, is OPEN).
        2. Authorise the actor (cashier may close own shift; manager/owner may
           close any shift within the tenant).
        3. Void any lingering OPEN (held) sales attached to this shift.
        4. Aggregate all COMPLETED sales for reconciliation figures.
        5. Atomically create ShiftClosure and mark the shift as CLOSED.

    Raises:
        NotFoundError         — shift does not exist or belongs to a different tenant.
        ConflictError         — shift has already been closed.
        PermissionDeniedError — cashier attempting to close another cashier's shift.
    """
    # ── 1. Retrieve and validate shift ────────────────────────────
    try:
        shift = Shift.objects.get(id=shift_id, tenant_id=tenant_id)
    except Shift.DoesNotExist:
        raise NotFoundError(f"Shift {shift_id} not found.")

    if shift.status == ShiftStatus.CLOSED:
        raise ConflictError(
            f"Shift {shift_id} has already been closed."
        )

    # ── 2. Authorisation ──────────────────────────────────────────
    if str(actor_id) != str(shift.cashier_id):
        try:
            actor = CustomUser.objects.get(id=actor_id, tenant_id=tenant_id)
        except CustomUser.DoesNotExist:
            raise PermissionDeniedError(
                "Actor not found in this tenant."
            )
        if actor.role == UserRole.CASHIER:
            raise PermissionDeniedError(
                "Cashiers may only close their own shift. "
                "A manager or owner is required to close another cashier's shift."
            )

    # ── 3. Void lingering OPEN (held) sales ───────────────────────
    held_sales = list(
        Sale.objects.filter(shift_id=shift_id, status=SaleStatus.OPEN)
    )
    voided_at = timezone.now()
    for sale in held_sales:
        Sale.objects.filter(id=sale.id).update(
            status=SaleStatus.VOIDED,
            voided_at=voided_at,
        )
        log_audit_event(
            tenant_id=tenant_id,
            actor_id=actor_id,
            action="NO_SALE_SHIFT_CLOSED",
            resource_type="Sale",
            resource_id=sale.id,
            after={"status": SaleStatus.VOIDED, "reason": "shift_closed"},
        )

    # ── 4. Aggregate COMPLETED sales ──────────────────────────────
    # NOTE (SubPhase 03.02): SPLIT payment sales are included in
    # total_sales_amount but are NOT decomposed into total_cash_amount /
    # total_card_amount here.  The per-method breakdown for split transactions
    # requires the PaymentDetail model introduced in SubPhase 03.02.  Until
    # then, total_cash_amount and total_card_amount will be understated when
    # split payments have occurred.  This is an acknowledged gap, not an
    # oversight — see SubPhase_03_02_Payments_And_Receipts for the resolution.
    agg = Sale.objects.filter(
        shift_id=shift_id,
        status=SaleStatus.COMPLETED,
    ).aggregate(
        total_sales_count=Count("id"),
        total_sales_amount=Sum("total_amount"),
        total_cash_amount=Sum(
            "total_amount", filter=Q(payment_method=PaymentMethod.CASH)
        ),
        total_card_amount=Sum(
            "total_amount", filter=Q(payment_method=PaymentMethod.CARD)
        ),
    )

    # ── 5. Compute closure fields ─────────────────────────────────
    closing_cash_count = Decimal(str(close_input["closing_cash_count"])).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    total_cash_amount = (agg["total_cash_amount"] or Decimal("0")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    total_card_amount = (agg["total_card_amount"] or Decimal("0")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    total_sales_amount = (agg["total_sales_amount"] or Decimal("0")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    total_sales_count = agg["total_sales_count"] or 0

    expected_cash = (shift.opening_float + total_cash_amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    cash_difference = (closing_cash_count - expected_cash).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    # Placeholders — return tracking is implemented in SubPhase 03.03
    total_returns_count = 0
    total_returns_amount = Decimal("0.00")

    # ── 6. Atomic write: create closure + update shift ────────────
    notes = close_input.get("notes")
    with transaction.atomic():
        closure = ShiftClosure.objects.create(
            shift=shift,
            closing_cash_count=closing_cash_count,
            expected_cash=expected_cash,
            cash_difference=cash_difference,
            total_sales_count=total_sales_count,
            total_sales_amount=total_sales_amount,
            total_returns_count=total_returns_count,
            total_returns_amount=total_returns_amount,
            total_cash_amount=total_cash_amount,
            total_card_amount=total_card_amount,
            closed_by_id=actor_id,
        )
        update_kwargs: dict = {
            "status": ShiftStatus.CLOSED,
            "closed_at": timezone.now(),
        }
        if notes is not None:
            update_kwargs["notes"] = notes
        Shift.objects.filter(id=shift_id).update(**update_kwargs)

    updated_shift = Shift.objects.select_related("cashier", "closure").get(
        id=shift_id
    )
    return updated_shift, closure


# ══════════════════════════════════════════════════════════════════
# get_current_shift
# ══════════════════════════════════════════════════════════════════

def get_current_shift(tenant_id: Any, cashier_id: Any) -> Shift | None:
    """Return the active OPEN shift for a cashier, or ``None``.

    Called on every POS page load to determine whether to display the terminal
    or the ShiftOpenModal fullscreen gate.  No related sale records are
    eager-loaded to keep the query lean.

    The composite index on ['cashier', 'status'] in ``Shift.Meta`` ensures
    this lookup is efficient even for cashiers with many historical shifts.
    """
    return Shift.objects.filter(
        tenant_id=tenant_id,
        cashier_id=cashier_id,
        status=ShiftStatus.OPEN,
    ).first()


# ══════════════════════════════════════════════════════════════════
# get_shift_by_id
# ══════════════════════════════════════════════════════════════════

def get_shift_by_id(tenant_id: Any, shift_id: Any) -> tuple[Shift, dict]:
    """Return a shift with closure data and a COMPLETED-sale summary.

    Raises:
        NotFoundError — shift does not exist or belongs to a different tenant.
    """
    try:
        shift = Shift.objects.select_related("cashier", "closure").get(
            id=shift_id, tenant_id=tenant_id
        )
    except Shift.DoesNotExist:
        raise NotFoundError(f"Shift {shift_id} not found.")

    summary = Sale.objects.filter(
        shift_id=shift_id, status=SaleStatus.COMPLETED
    ).aggregate(count=Count("id"), total=Sum("total_amount"))

    return shift, summary


# ══════════════════════════════════════════════════════════════════
# get_shifts
# ══════════════════════════════════════════════════════════════════

def get_shifts(
    tenant_id: Any,
    filters: dict | None = None,
) -> tuple[list, int]:
    """Return a paginated list of shifts for management history views.

    Optional filter keys:
        cashier_id, status, from_date, to_date,
        page (default 1), limit (default 20, max 100).

    Each shift in the result is annotated with ``sale_count`` (number of
    sales in that shift) so the list view avoids N+1 queries.
    """
    if filters is None:
        filters = {}

    qs = Shift.objects.filter(tenant_id=tenant_id).select_related("cashier")

    if filters.get("cashier_id"):
        qs = qs.filter(cashier_id=filters["cashier_id"])
    if filters.get("status"):
        qs = qs.filter(status=filters["status"])
    if filters.get("from_date"):
        qs = qs.filter(opened_at__gte=filters["from_date"])
    if filters.get("to_date"):
        qs = qs.filter(opened_at__lte=filters["to_date"])

    qs = qs.annotate(sale_count=Count("sales")).order_by("-opened_at")

    total = qs.count()
    page = max(1, int(filters.get("page", 1)))
    limit = min(100, max(1, int(filters.get("limit", 20))))
    offset = (page - 1) * limit

    return list(qs[offset: offset + limit]), total


# ══════════════════════════════════════════════════════════════════
# build_z_report_data
# ══════════════════════════════════════════════════════════════════

def build_z_report_data(tenant_id: Any, shift_id: Any) -> dict:
    """Aggregate all sales and returns for a shift and return a Z-Report dict."""
    from apps.pos.models import Return, ReturnRefundMethod, SaleLine

    try:
        shift = Shift.objects.select_related("cashier", "closure").get(
            pk=shift_id, tenant_id=tenant_id
        )
    except Shift.DoesNotExist as exc:
        raise NotFoundError("Shift not found.") from exc

    closure = getattr(shift, "closure", None)

    # ── Sales aggregates ───────────────────────────────────────────
    completed_sales = Sale.objects.filter(
        shift_id=shift_id, status=SaleStatus.COMPLETED
    )
    voided_sales_count = Sale.objects.filter(
        shift_id=shift_id, status=SaleStatus.VOIDED
    ).count()

    total_sales_count = completed_sales.count()
    total_sales_amount = completed_sales.aggregate(
        s=Sum("total_amount")
    )["s"] or Decimal("0")
    total_discount_amount = completed_sales.aggregate(
        s=Sum("cart_discount_amount")
    )["s"] or Decimal("0")

    # Payment method breakdown (via Payment model related to Sale)
    from apps.pos.models import Payment

    cash_sales = Payment.objects.filter(
        sale__shift_id=shift_id,
        sale__status=SaleStatus.COMPLETED,
        method=PaymentMethod.CASH,
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0")

    card_sales = Payment.objects.filter(
        sale__shift_id=shift_id,
        sale__status=SaleStatus.COMPLETED,
        method=PaymentMethod.CARD,
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0")

    # ── Returns aggregates ─────────────────────────────────────────
    # Returns within the shift window (opened_at to closed_at or now)
    window_start = shift.opened_at
    window_end = shift.closed_at if shift.closed_at else timezone.now()

    returns_qs = Return.objects.filter(
        tenant_id=tenant_id,
        created_at__gte=window_start,
        created_at__lte=window_end,
    )

    total_returns_count = returns_qs.count()
    total_refund_amount = returns_qs.aggregate(
        s=Sum("refund_amount")
    )["s"] or Decimal("0")
    cash_refund_amount = returns_qs.filter(
        refund_method=ReturnRefundMethod.CASH
    ).aggregate(s=Sum("refund_amount"))["s"] or Decimal("0")
    card_refund_amount = returns_qs.filter(
        refund_method=ReturnRefundMethod.CARD_REVERSAL
    ).aggregate(s=Sum("refund_amount"))["s"] or Decimal("0")
    credit_refund_amount = returns_qs.filter(
        refund_method=ReturnRefundMethod.STORE_CREDIT
    ).aggregate(s=Sum("refund_amount"))["s"] or Decimal("0")
    exchange_count = returns_qs.filter(
        refund_method=ReturnRefundMethod.EXCHANGE
    ).count()

    # ── Cash reconciliation ────────────────────────────────────────
    opening_float = Decimal(str(shift.opening_cash_float or "0"))
    expected_cash = opening_float + Decimal(str(cash_sales)) - Decimal(str(cash_refund_amount))

    actual_cash = None
    cash_difference = None
    if closure and closure.closing_cash_count is not None:
        actual_cash = Decimal(str(closure.closing_cash_count))
        cash_difference = actual_cash - expected_cash

    # ── Top products sold ──────────────────────────────────────────
    top_products = list(
        SaleLine.objects.filter(
            sale__shift_id=shift_id,
            sale__status=SaleStatus.COMPLETED,
        )
        .values("product_name_snapshot", "variant_description_snapshot")
        .annotate(total_qty=Sum("quantity"), total_revenue=Sum("line_total"))
        .order_by("-total_qty")[:10]
    )
    # Ensure Decimal values are string for JSON serialisation
    top_products_clean = [
        {
            "product_name_snapshot": p["product_name_snapshot"],
            "variant_description_snapshot": p["variant_description_snapshot"],
            "total_qty": int(p["total_qty"] or 0),
            "total_revenue": str(
                Decimal(str(p["total_revenue"] or "0")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
            ),
        }
        for p in top_products
    ]

    # ── Cashier name ───────────────────────────────────────────────
    cashier = shift.cashier
    cashier_name = (
        getattr(cashier, "get_full_name", lambda: "")()
        or getattr(cashier, "email", "Cashier")
    ) if cashier else "Cashier"

    def _d(val) -> str:
        return str(Decimal(str(val or "0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    return {
        "shift_id": str(shift.id),
        "shift_status": shift.status,
        "cashier_name": cashier_name,
        "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
        "closed_at": shift.closed_at.isoformat() if shift.closed_at else None,
        # Sales
        "total_sales_count": total_sales_count,
        "total_sales_amount": _d(total_sales_amount),
        "cash_sales_amount": _d(cash_sales),
        "card_sales_amount": _d(card_sales),
        "voided_sales_count": voided_sales_count,
        "total_discount_amount": _d(total_discount_amount),
        # Returns
        "total_returns_count": total_returns_count,
        "total_refund_amount": _d(total_refund_amount),
        "cash_refund_amount": _d(cash_refund_amount),
        "card_refund_amount": _d(card_refund_amount),
        "credit_refund_amount": _d(credit_refund_amount),
        "exchange_count": exchange_count,
        # Cash reconciliation
        "opening_float": _d(opening_float),
        "expected_cash_in_drawer": _d(expected_cash),
        "actual_cash_counted": _d(actual_cash) if actual_cash is not None else None,
        "cash_difference": _d(cash_difference) if cash_difference is not None else None,
        # Top products
        "top_products": top_products_clean,
    }
