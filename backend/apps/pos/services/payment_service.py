"""
Payment service layer for the POS app.

Functions in this module create and query Payment records for completed sales.
All write functions must be called from within a ``transaction.atomic()`` block
managed by the caller (typically ``sale_service.create_sale``).

Never call these functions directly from views.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from apps.pos.models import Payment, PaymentLegMethod


# ══════════════════════════════════════════════════════════════════
# create_payment
# ══════════════════════════════════════════════════════════════════

def create_payment(
    sale,
    method: str,
    amount: Decimal,
    card_reference_number: str | None = None,
) -> Payment:
    """Create a single Payment leg record for a completed sale.

    Must be called from within a ``transaction.atomic()`` block.
    The caller controls the transaction boundary so that multiple legs
    in a split sale either all succeed or all roll back together.

    Args:
        sale: A ``Sale`` model instance (already persisted).
        method: One of ``PaymentLegMethod.CASH`` or ``PaymentLegMethod.CARD``.
        amount: A positive ``Decimal`` representing the tendered amount for
                this leg.
        card_reference_number: Optional terminal approval code for CARD legs.

    Raises:
        ValueError: If ``amount`` is zero or negative.
    """
    if amount <= Decimal("0"):
        raise ValueError(
            f"Payment amount must be greater than zero. Received: {amount}"
        )

    return Payment.objects.create(
        sale=sale,
        method=method,
        amount=amount,
        card_reference_number=card_reference_number,
    )


# ══════════════════════════════════════════════════════════════════
# get_payments_for_sale
# ══════════════════════════════════════════════════════════════════

def get_payments_for_sale(sale_id):
    """Return all Payment records for a given sale, ordered by created_at."""
    return Payment.objects.filter(sale_id=sale_id).order_by("created_at")


# ══════════════════════════════════════════════════════════════════
# compute_change
# ══════════════════════════════════════════════════════════════════

def compute_change(total_amount: Decimal, amount_paid: Decimal) -> Decimal:
    """Compute the change due to the customer.

    Pure function — no database interaction. Safe to call from any context.

    Args:
        total_amount: The total amount the customer owes.
        amount_paid: The total cash tendered by the customer.

    Returns:
        The change amount as a ``Decimal`` rounded to two decimal places.

    Raises:
        ValueError: If ``amount_paid`` is less than ``total_amount``.
    """
    if amount_paid < total_amount:
        raise ValueError(
            "Insufficient payment: amount_paid is less than total_amount."
        )
    return (amount_paid - total_amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
