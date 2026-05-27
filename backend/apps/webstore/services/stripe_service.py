"""
apps/webstore/services/stripe_service.py

Stripe payment service for per-tenant webstore checkout.

Flow
----
1. Frontend calls POST /api/webstore/public/{slug}/stripe/checkout-session/
   with the order payload (same shape as order_create).
2. This service:
   a. Creates the WebstoreOrder via the existing order_service (status=pending_payment)
   b. Creates a Stripe Checkout Session (mode=payment) with the order total
   c. Returns the Stripe checkout URL and the order number
3. Stripe redirects back to /checkout/success?order_number=...&session_id=...
4. Stripe fires a checkout.session.completed webhook →
   POST /api/webstore/webhooks/stripe/ → stripe_webstore_webhook_view
   → handle_checkout_completed() → marks order paid, deducts inventory

The existing PayHere checkout flow is untouched.

Settings required:
    STRIPE_SECRET_KEY          sk_...
    STRIPE_WEBHOOK_SECRET      whsec_...  (separate from billing webhook secret)
    or
    STRIPE_WEBSTORE_WEBHOOK_SECRET   whsec_...  (takes precedence if set)
"""
from __future__ import annotations

import logging
from decimal import Decimal

import stripe
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_stripe_client() -> stripe.StripeClient:
    """Return a configured StripeClient. Raises if secret key is not set."""
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured in Django settings.")
    return stripe.StripeClient(api_key=secret_key)


def create_webstore_checkout_session(
    order,
    tenant_slug: str,
    tenant_name: str,
    currency: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a Stripe Checkout Session (mode=payment) for a webstore order.

    Parameters
    ----------
    order        : WebstoreOrder (already created, status=pending_payment)
    tenant_slug  : str
    tenant_name  : str
    currency     : ISO currency code, e.g. "LKR"
    success_url  : e.g. "https://<slug>.lankacommerce.com/checkout/success?order_number=WS-0001&session_id={CHECKOUT_SESSION_ID}"
    cancel_url   : e.g. "https://<slug>.lankacommerce.com/checkout?cancelled=1"

    Returns
    -------
    str  Stripe Checkout Session URL
    """
    client = _get_stripe_client()
    amount_in_smallest_unit = int(Decimal(str(order.total_amount)) * 100)

    # Build line items from the order's line_items JSON for better Stripe receipts
    line_items = []
    order_lines = order.line_items or []
    if order_lines:
        for item in order_lines[:20]:  # Stripe has a max line item limit
            item_total = int(
                Decimal(str(item.get("total_price", item.get("unit_price", 0)))) * 100
            )
            line_items.append({
                "price_data": {
                    "currency": currency.lower(),
                    "product_data": {
                        "name": item.get("product_title", item.get("name", "Product")),
                        "description": item.get("variant_title", None) or None,
                    },
                    "unit_amount": int(
                        Decimal(str(item.get("unit_price", 0))) * 100
                    ),
                },
                "quantity": int(item.get("quantity", 1)),
            })
    else:
        # Fallback: single line item for the total
        line_items = [
            {
                "price_data": {
                    "currency": currency.lower(),
                    "product_data": {
                        "name": f"Order {order.order_number}",
                        "description": f"Purchase from {tenant_name}",
                    },
                    "unit_amount": amount_in_smallest_unit,
                },
                "quantity": 1,
            }
        ]

    shipping_email = (
        getattr(order, "customer_email", None)
        or (order.shipping_address or {}).get("email")
    )

    session_params: dict = {
        "mode": "payment",
        "line_items": line_items,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "tenant_slug": tenant_slug,
        },
        "payment_intent_data": {
            "metadata": {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "tenant_slug": tenant_slug,
            },
        },
    }

    if shipping_email:
        session_params["customer_email"] = shipping_email

    session = client.checkout.sessions.create(params=session_params)

    # Persist the Stripe session ID on the order for reconciliation
    order.payment_reference = session.id
    order.payment_gateway = "stripe"
    order.save(update_fields=["payment_reference", "payment_gateway", "updated_at"])

    logger.info(
        "Created Stripe Checkout Session %s for order %s (tenant=%s)",
        session.id,
        order.order_number,
        tenant_slug,
    )
    return session.url


def handle_webstore_checkout_completed(session_data: dict, stripe_event_id: str) -> None:
    """
    Handle checkout.session.completed webhook for a webstore order.

    Marks the order as paid, deducts inventory, and sends the confirmation email.
    Idempotent — safe to call multiple times for the same session.

    We do NOT call confirm_order_payment() directly because that function
    hardcodes payment_gateway="payhere". Instead we replicate its logic while
    setting payment_gateway="stripe".
    """
    from apps.webstore.models import WebstoreOrder
    from apps.webstore.services import order_service

    order_id = session_data.get("metadata", {}).get("order_id")
    order_number = session_data.get("metadata", {}).get("order_number")
    stripe_session_id = session_data.get("id")

    if not order_id and not order_number:
        logger.warning(
            "Stripe webstore webhook: no order metadata in session %s",
            stripe_session_id,
        )
        return

    try:
        if order_id:
            order = WebstoreOrder.objects.get(id=order_id)
        else:
            order = WebstoreOrder.objects.get(order_number=order_number)
    except WebstoreOrder.DoesNotExist:
        logger.error(
            "Stripe webstore webhook: order not found. id=%s number=%s session=%s",
            order_id,
            order_number,
            stripe_session_id,
        )
        return

    # Idempotency guard
    if order.payment_status == "paid":
        logger.debug(
            "Stripe webstore webhook: order %s already paid — skipping",
            order.order_number,
        )
        return

    # Delegate to confirm_order_payment with "stripe" gateway, then fix gateway field
    updated_order = order_service.confirm_order_payment(
        order=order,
        payment_id=stripe_session_id,
        payhere_amount="0",  # amount already on order, this param is legacy/unused for totals
    )

    # Correct the gateway label that confirm_order_payment overwrites with "payhere"
    if updated_order.payment_gateway != "stripe":
        updated_order.payment_gateway = "stripe"
        updated_order.save(update_fields=["payment_gateway", "updated_at"])

    logger.info(
        "Stripe webstore checkout completed for order %s (session=%s)",
        order.order_number,
        stripe_session_id,
    )
