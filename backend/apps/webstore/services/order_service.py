"""
apps/webstore/services/order_service.py

Central order service for Phase 8 — Checkout & Payment Flow.

PRICE INTEGRITY GUARANTEE:
  Every function here re-fetches product prices from ProductVariant.retail_price.
  The request payload's unit_price field (if present) is SILENTLY IGNORED.
  This prevents price-manipulation attacks where a client submits altered prices.

Functions:
  create_order           — Validate cart, compute totals, create WebstoreOrder
  confirm_order_payment  — Webhook callback; mark paid, deduct inventory (atomic)
  generate_order_number  — Sequential WS-XXXX with DB-level lock (no duplicates)
  fulfill_order          — Set fulfilled, send shipped email
  cancel_order           — Cancel (raises if order is paid without refund)

Security:
  - Prices: always re-fetched from DB (see above)
  - Duplicate webhook protection: idempotency check on payment_status before write
  - Order number generation: select_for_update() prevents race conditions
  - Stock deduction: wrapped in transaction.atomic() with inventory locking
"""

from __future__ import annotations

import logging
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import models, transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.catalog.models import ProductVariant, StockMovementReason, TaxRule
from apps.catalog.services.inventory_service import adjust_stock
from apps.pos.models import Sale, SaleLine, SaleStatus
from apps.promotions.models import Promotion, PromotionType
from apps.webstore.models import WebstoreCustomer, WebstoreOrder

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tax rate map (mirrors apps.pos.services.sale_service)
# ---------------------------------------------------------------------------

_TAX_RATES: dict[str, Decimal] = {
    TaxRule.STANDARD_VAT: Decimal("0.15"),
    TaxRule.REDUCED_VAT: Decimal("0.025"),
    TaxRule.ZERO_RATED: Decimal("0.00"),
    TaxRule.EXEMPT: Decimal("0.00"),
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _fetch_variants_from_db(
    tenant, line_items: list[dict]
) -> dict[str, ProductVariant]:
    """
    Re-fetch every variant from the database.

    SECURITY: This is the ONLY place where prices enter the order calculation
    pipeline. Client-submitted prices are never read.

    Raises:
        ValidationError: if any variant is missing, archived, or cross-tenant.
    """
    variant_map: dict[str, ProductVariant] = {}
    for item in line_items:
        vid = str(item["variant_id"])
        if vid in variant_map:
            continue
        try:
            v = ProductVariant.objects.select_related("product").get(
                id=vid,
                tenant=tenant,
                deleted_at__isnull=True,
            )
        except (ProductVariant.DoesNotExist, Exception):
            raise ValidationError(
                {"variant_id": f"Variant {vid} not found or unavailable."}
            )
        if v.product.is_archived:
            raise ValidationError(
                {"variant_id": f"'{v.product.name}' is no longer available."}
            )
        variant_map[vid] = v
    return variant_map


def _assert_stock_available(
    line_items: list[dict], variant_map: dict[str, ProductVariant]
) -> None:
    """
    Check stock availability for all requested line items.

    Raises:
        ValidationError: with structured out_of_stock list if any item is unavailable.
    """
    out_of_stock = []
    for item in line_items:
        vid = str(item["variant_id"])
        qty = int(item["quantity"])
        v = variant_map[vid]
        if v.stock_quantity < qty:
            out_of_stock.append(
                {"variant_id": vid, "name": v.product.name, "available": v.stock_quantity}
            )
    if out_of_stock:
        raise ValidationError(
            {
                "detail": "Some items are no longer available.",
                "out_of_stock": out_of_stock,
            }
        )


def _compute_line_items_and_totals(
    line_items: list[dict],
    variant_map: dict[str, ProductVariant],
) -> tuple[list[dict], Decimal, Decimal]:
    """
    Compute per-line financials and aggregate totals.

    Returns:
        (computed_lines, subtotal, tax_total)

    Prices come from variant.retail_price ONLY.
    """
    computed: list[dict] = []
    subtotal = Decimal("0.00")
    tax_total = Decimal("0.00")

    for item in line_items:
        vid = str(item["variant_id"])
        qty = int(item["quantity"])
        v = variant_map[vid]

        # SECURITY: retail_price from DB — never from request
        unit_price = Decimal(str(v.retail_price)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        line_total = (unit_price * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        tax_rate = _TAX_RATES.get(v.product.tax_rule, Decimal("0.00"))
        line_tax = (line_total * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        subtotal += line_total
        tax_total += line_tax

        variant_parts = [p for p in (v.colour, v.size) if p]
        variant_title = " / ".join(variant_parts) if variant_parts else v.sku
        image_url = v.image_urls[0] if v.image_urls else ""

        computed.append(
            {
                "product_id": str(v.product.id),
                "variant_id": vid,
                "title": v.product.name,
                "variant_title": variant_title,
                "sku": v.sku,
                "quantity": qty,
                "unit_price": str(unit_price),
                "total": str(line_total),
                "image_url": image_url,
                "requires_shipping": True,
            }
        )

    return computed, subtotal, tax_total


def _resolve_discount(tenant, code: str, subtotal: Decimal) -> tuple[Any | None, Decimal]:
    """
    Validate a discount code and compute the discount amount.

    Returns:
        (promo_or_None, discount_amount)

    Raises:
        ValidationError: if the code is invalid, expired, or inactive.
    """
    if not code:
        return None, Decimal("0.00")

    try:
        promo = Promotion.objects.get(
            tenant=tenant,
            promo_code__iexact=code.strip(),
            is_active=True,
            is_archived=False,
        )
    except Promotion.DoesNotExist:
        raise ValidationError({"discount_code": "Invalid or expired discount code."})

    now = timezone.now()
    if promo.starts_at and promo.starts_at > now:
        raise ValidationError({"discount_code": "Discount code is not yet active."})
    if promo.ends_at and promo.ends_at < now:
        raise ValidationError({"discount_code": "Discount code has expired."})
    if promo.max_uses is not None and promo.usage_count >= promo.max_uses:
        raise ValidationError({"discount_code": "This discount code has reached its usage limit."})

    value = Decimal(str(promo.value))
    if promo.type in (PromotionType.CART_PERCENTAGE,):
        discount = (subtotal * value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        # CART_FIXED, PROMO_CODE, or other types treated as fixed amount
        discount = min(value, subtotal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return promo, discount


def _create_webstore_pos_sale(order: WebstoreOrder, variant_map: dict[str, ProductVariant]) -> Sale:
    """
    Create a pos.Sale record for a confirmed webstore order, then deduct stock.

    This is a simplified Sale path for webstore orders:
      - shift is NULL (no physical POS shift)
      - cashier is NULL (no physical cashier)
      - sale_source = "webstore"
      - Inventory is deducted via adjust_stock (same path as POS)

    Must be called within an existing transaction.atomic() block.
    """
    from decimal import ROUND_HALF_UP, Decimal

    computed_lines = []
    for item in order.line_items:
        vid = item["variant_id"]
        v = variant_map[vid]
        unit_price = Decimal(str(item["unit_price"]))
        line_total = Decimal(str(item["total"]))
        computed_lines.append(
            {
                "variant": v,
                "vid": vid,
                "qty": int(item["quantity"]),
                "unit_price": unit_price,
                "line_total": line_total,
                "product_name_snapshot": item["title"],
                "variant_description_snapshot": item["variant_title"],
                "sku": item["sku"],
            }
        )

    # Build tax + subtotal from order financials
    sale = Sale.objects.create(
        tenant_id=str(order.tenant_id),
        shift=None,          # No physical shift for webstore
        cashier=None,        # No physical cashier for webstore
        sale_source="webstore",
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        total_amount=order.total,
        payment_method=None,
        status=SaleStatus.COMPLETED,
        completed_at=timezone.now(),
    )

    # Create SaleLines
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
                discount_percent=Decimal("0.00"),
                discount_amount=Decimal("0.00"),
                line_total_before_discount=cl["line_total"],
                line_total_after_discount=cl["line_total"],
            )
            for cl in computed_lines
        ]
    )

    # Deduct stock via the canonical adjust_stock path (with DB-level locking)
    for cl in computed_lines:
        adjust_stock(
            tenant_id=str(order.tenant_id),
            variant_id=cl["vid"],
            actor_id=None,  # Webstore sale — no staff actor
            quantity_delta=-cl["qty"],
            reason=StockMovementReason.SALE,
            note=f"Webstore order {order.order_number}",
            reference_id=sale.id,
        )

    return sale


def _send_order_confirmation_email(order: WebstoreOrder) -> None:
    """Send order confirmation email using Django's template engine + send_mail."""
    try:
        context = {
            "order": order,
            "tenant": order.tenant,
            "line_items": order.line_items,
        }
        html_body = render_to_string(
            "webstore/emails/order_confirmation.html", context
        )
        subject = f"Your order {order.order_number} is confirmed — {order.tenant.name}"
        send_mail(
            subject=subject,
            message=f"Your order {order.order_number} has been confirmed. Total: {order.total} {order.currency}.",
            from_email=None,  # Uses DEFAULT_FROM_EMAIL setting
            recipient_list=[order.customer_email],
            html_message=html_body,
            fail_silently=True,
        )
    except Exception:
        logger.exception(
            "Failed to send order confirmation email for %s", order.order_number
        )


def _send_order_shipped_email(order: WebstoreOrder) -> None:
    """Send order shipped / fulfillment email."""
    try:
        subject = f"Your order {order.order_number} has been shipped — {order.tenant.name}"
        body = (
            f"Great news! Your order {order.order_number} from {order.tenant.name} "
            f"has been shipped.\n\n"
        )
        if order.tracking_number:
            body += f"Tracking number: {order.tracking_number}\n"
            if order.tracking_carrier:
                body += f"Carrier: {order.tracking_carrier}\n"
        send_mail(
            subject=subject,
            message=body,
            from_email=None,
            recipient_list=[order.customer_email],
            fail_silently=True,
        )
    except Exception:
        logger.exception(
            "Failed to send shipped email for %s", order.order_number
        )


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def generate_order_number(tenant) -> str:
    """
    Generate the next sequential order number for a tenant.

    Format: WS-XXXX (e.g. WS-0001, WS-0042, WS-1234)

    Uses select_for_update() to acquire a row-level lock on the last order,
    preventing two concurrent orders from receiving the same number.

    Must be called within a transaction.atomic() block.
    """
    last = (
        WebstoreOrder.objects.select_for_update()
        .filter(tenant=tenant, order_number__startswith="WS-")
        .order_by("-created_at")
        .first()
    )
    if last is None:
        next_num = 1
    else:
        m = re.search(r"WS-(\d+)$", last.order_number)
        next_num = (int(m.group(1)) + 1) if m else 1

    return f"WS-{next_num:04d}"


def create_order(tenant, order_data: dict) -> WebstoreOrder:
    """
    Create a new WebstoreOrder with status=pending and payment_status=unpaid.

    PRICE INTEGRITY: All prices are re-fetched from ProductVariant.retail_price.
    Any unit_price submitted in order_data is silently ignored.

    Args:
        tenant: Tenant instance resolved from URL slug.
        order_data: {
            customer_email: str (required)
            customer_id: str | None  (optional, for logged-in consumers)
            line_items: [{variant_id, quantity}, ...]
            shipping_address: {first_name, last_name, address1, city, ...}
            billing_address: {...} | None
            same_as_shipping: bool
            discount_code: str | None
            notes: str | None
            shipping_method_id: str | None
        }

    Returns:
        Created WebstoreOrder instance.

    Raises:
        ValidationError: for any validation failure (stock, price, discount, etc.)
    """
    line_items = order_data.get("line_items") or []
    if not line_items:
        raise ValidationError({"line_items": "At least one item is required."})

    customer_email = (order_data.get("customer_email") or "").strip().lower()
    if not customer_email:
        raise ValidationError({"customer_email": "Email is required for checkout."})

    # Resolve optional logged-in consumer
    customer = None
    if order_data.get("customer_id"):
        try:
            customer = WebstoreCustomer.objects.get(
                id=order_data["customer_id"],
                tenant=tenant,
                deleted_at__isnull=True,
            )
        except (WebstoreCustomer.DoesNotExist, Exception):
            pass  # Treat as guest if customer not found

    # --- PRICE INTEGRITY: Re-fetch all prices from the database ---
    variant_map = _fetch_variants_from_db(tenant, line_items)

    # Validate stock availability
    _assert_stock_available(line_items, variant_map)

    # Compute line item financials from DB prices
    computed_lines, subtotal, tax_amount = _compute_line_items_and_totals(
        line_items, variant_map
    )

    # Shipping (Phase 8: basic flat-rate from TenantWebstore.shipping_methods)
    try:
        webstore = tenant.webstore
        shipping_methods = getattr(webstore, "shipping_methods", []) or []
        shipping_amount = Decimal("0.00")
        if shipping_methods and order_data.get("shipping_method_id"):
            for method in shipping_methods:
                if str(method.get("id")) == str(order_data["shipping_method_id"]):
                    shipping_amount = Decimal(str(method.get("price", "0"))).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                    break
    except Exception:
        shipping_amount = Decimal("0.00")

    # Validate and apply discount code against real subtotal
    _, discount_amount = _resolve_discount(
        tenant, order_data.get("discount_code", ""), subtotal
    )

    # Final total
    total = (subtotal - discount_amount + tax_amount + shipping_amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    if total <= Decimal("0.00"):
        raise ValidationError({"total": "Order total must be greater than zero."})

    # Billing address
    shipping_address = order_data.get("shipping_address") or {}
    if order_data.get("same_as_shipping"):
        billing_address = shipping_address
    else:
        billing_address = order_data.get("billing_address") or shipping_address

    with transaction.atomic():
        order_number = generate_order_number(tenant)
        order = WebstoreOrder.objects.create(
            tenant=tenant,
            order_number=order_number,
            customer=customer,
            customer_email=customer_email,
            subtotal=subtotal,
            shipping_amount=shipping_amount,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total=total,
            currency=tenant.settings.get("currency", "LKR"),
            status="pending",
            payment_status="unpaid",
            line_items=computed_lines,
            shipping_address=shipping_address,
            billing_address=billing_address,
            notes=order_data.get("notes", ""),
            discount_code=order_data.get("discount_code", ""),
        )

    return order


def confirm_order_payment(
    order: WebstoreOrder,
    payment_id: str,
    payhere_amount: str,
) -> WebstoreOrder:
    """
    Confirm payment for an order (called from the PayHere webhook handler).

    IDEMPOTENCY: If order.payment_status is already "paid", returns immediately
    without any writes — safe to call multiple times for the same order.

    Steps (atomic):
        1. Check idempotency guard
        2. Update payment status fields
        3. Create POS Sale + deduct inventory
        4. Link Sale to WebstoreOrder
        5. Send confirmation email

    Args:
        order:          WebstoreOrder instance
        payment_id:     PayHere transaction ID
        payhere_amount: Amount string from PayHere notification

    Returns:
        Updated WebstoreOrder.
    """
    # Idempotency: already processed
    if order.payment_status == "paid":
        return order

    # Re-fetch variant map from DB for inventory deduction
    line_items = order.line_items or []
    try:
        variant_map = _fetch_variants_from_db(order.tenant, line_items)
    except ValidationError:
        logger.error(
            "confirm_order_payment: could not re-fetch variants for order %s",
            order.order_number,
        )
        variant_map = {}

    with transaction.atomic():
        # Lock the order row to prevent concurrent webhook processing
        locked_order = WebstoreOrder.objects.select_for_update().get(pk=order.pk)

        # Double-check idempotency inside the lock
        if locked_order.payment_status == "paid":
            return locked_order

        # Update payment fields
        locked_order.payment_status = "paid"
        locked_order.status = "confirmed"
        locked_order.payment_reference = payment_id
        locked_order.payment_gateway = "payhere"
        locked_order.save(
            update_fields=[
                "payment_status",
                "status",
                "payment_reference",
                "payment_gateway",
                "updated_at",
            ]
        )

        # Increment promotion usage count if a discount code was applied
        if locked_order.discount_code:
            Promotion.objects.filter(
                tenant=locked_order.tenant,
                promo_code__iexact=locked_order.discount_code,
                is_active=True,
            ).update(usage_count=models.F("usage_count") + 1)

        # Deduct inventory and create POS Sale record (if variant map available)
        if variant_map:
            try:
                sale = _create_webstore_pos_sale(locked_order, variant_map)
                locked_order.pos_sale = sale
                locked_order.save(update_fields=["pos_sale"])
            except Exception:
                logger.exception(
                    "Failed to create POS sale for webstore order %s",
                    locked_order.order_number,
                )
                raise  # Re-raise to roll back the transaction

    # Send confirmation email (outside the transaction to avoid delay)
    _send_order_confirmation_email(locked_order)

    return locked_order


def fulfill_order(
    order: WebstoreOrder,
    tracking_number: str = "",
    tracking_carrier: str = "",
) -> WebstoreOrder:
    """
    Mark an order as fulfilled and send the shipped email.

    Args:
        order:            WebstoreOrder instance
        tracking_number:  Optional carrier tracking number
        tracking_carrier: Optional carrier name

    Returns:
        Updated WebstoreOrder.
    """
    order.fulfillment_status = "fulfilled"
    order.status = "shipped"
    if tracking_number:
        order.tracking_number = tracking_number
    if tracking_carrier:
        order.tracking_carrier = tracking_carrier
    order.save(
        update_fields=[
            "fulfillment_status",
            "status",
            "tracking_number",
            "tracking_carrier",
            "updated_at",
        ]
    )
    _send_order_shipped_email(order)
    return order


def cancel_order(order: WebstoreOrder) -> WebstoreOrder:
    """
    Cancel a pending / unpaid order.

    Raises:
        ValidationError: if the order is already paid — paid orders require
        a manual refund before they can be cancelled.

    Returns:
        Updated WebstoreOrder.
    """
    if order.payment_status == "paid":
        raise ValidationError(
            {
                "detail": (
                    "Cannot cancel a paid order. "
                    "Issue a refund first, then cancel."
                )
            }
        )
    order.status = "cancelled"
    order.save(update_fields=["status", "updated_at"])
    return order
