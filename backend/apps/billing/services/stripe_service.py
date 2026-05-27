"""
billing/services/stripe_service.py

Stripe payment service for LankaCommerce platform subscriptions.

Responsibilities
----------------
* Create Stripe Checkout Sessions (mode=payment) for invoice payment
* Create Stripe Customer Portal sessions for subscription management
* Handle Stripe webhook events:
    - checkout.session.completed     → mark invoice paid
    - invoice.payment_succeeded      → (future: recurring billing)
    - customer.subscription.deleted  → (future: Stripe-managed subscriptions)

The existing PayHere service and webhook handler are kept untouched;
Stripe is added as an alternative path.

Settings required (Django settings / environment variables):
    STRIPE_SECRET_KEY         sk_...
    STRIPE_WEBHOOK_SECRET     whsec_...   (from Stripe Dashboard → Webhooks)
    STRIPE_PUBLISHABLE_KEY    pk_...      (used by frontend, stored in settings
                                          so it can be surfaced via an API endpoint)
"""
from __future__ import annotations

import logging

import stripe
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level Stripe config
# ---------------------------------------------------------------------------

def _get_stripe_client() -> stripe.StripeClient:
    """Return a configured StripeClient. Raises if secret key is not set."""
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured in Django settings.")
    return stripe.StripeClient(api_key=secret_key)


# ---------------------------------------------------------------------------
# Customer management
# ---------------------------------------------------------------------------

def get_or_create_stripe_customer(subscription, tenant, user) -> str:
    """
    Return the Stripe customer ID for the given subscription.
    Creates a new Stripe Customer if one does not exist yet.

    Parameters
    ----------
    subscription : billing.models.Subscription
    tenant       : tenants.models.Tenant
    user         : accounts.models.User  (the subscription owner)

    Returns
    -------
    str  Stripe customer ID (cus_...)
    """
    if subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    client = _get_stripe_client()
    customer = client.customers.create(params={
        "email": user.email,
        "name": getattr(tenant, "name", str(tenant)),
        "metadata": {
            "tenant_id": str(tenant.id),
            "subscription_id": str(subscription.id),
        },
    })

    # Persist immediately so repeated calls are idempotent
    subscription.stripe_customer_id = customer.id
    subscription.save(update_fields=["stripe_customer_id", "updated_at"])

    logger.info(
        "Created Stripe customer %s for tenant %s",
        customer.id,
        tenant.id,
    )
    return customer.id


# ---------------------------------------------------------------------------
# Checkout Session — invoice payment
# ---------------------------------------------------------------------------

def create_checkout_session(
    invoice,
    tenant,
    user,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Create a Stripe Checkout Session (mode=payment) for the given invoice.

    The session uses the invoice's amount and plan description as line items.
    On payment completion Stripe redirects to success_url with `?session_id={CHECKOUT_SESSION_ID}`.

    Parameters
    ----------
    invoice     : billing.models.Invoice
    tenant      : tenants.models.Tenant
    user        : accounts.models.User
    success_url : e.g. "https://app.lankacommerce.com/billing?payment=success&session_id={CHECKOUT_SESSION_ID}"
    cancel_url  : e.g. "https://app.lankacommerce.com/billing?payment=cancelled"

    Returns
    -------
    str  Stripe Checkout Session URL (https://checkout.stripe.com/...)
    """
    subscription = invoice.subscription
    customer_id = get_or_create_stripe_customer(subscription, tenant, user)
    client = _get_stripe_client()

    # Amount must be in the smallest currency unit (cents for USD, cents for LKR too)
    amount_in_smallest_unit = int(invoice.amount * 100)

    plan_name = getattr(getattr(subscription, "plan", None), "name", "Subscription")
    description = (
        f"{plan_name} - {invoice.billing_period_start.strftime('%B %Y')}"
        if hasattr(invoice, "billing_period_start") and invoice.billing_period_start
        else plan_name
    )

    session = client.checkout.sessions.create(params={
        "mode": "payment",
        "customer": customer_id,
        "line_items": [
            {
                "price_data": {
                    "currency": "lkr",
                    "product_data": {
                        "name": description,
                        "metadata": {
                            "invoice_id": str(invoice.id),
                            "invoice_number": invoice.invoice_number,
                        },
                    },
                    "unit_amount": amount_in_smallest_unit,
                },
                "quantity": 1,
            }
        ],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata": {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "tenant_id": str(tenant.id),
        },
        "payment_intent_data": {
            "metadata": {
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
            },
        },
    })

    logger.info(
        "Created Stripe Checkout Session %s for invoice %s",
        session.id,
        invoice.invoice_number,
    )
    return session.url


# ---------------------------------------------------------------------------
# Customer Portal — self-service subscription management
# ---------------------------------------------------------------------------

def create_portal_session(stripe_customer_id: str, return_url: str) -> str:
    """
    Create a Stripe Billing Portal session for the given customer.

    Returns the portal URL. The customer can manage payment methods,
    download receipts, and cancel future payments.
    """
    client = _get_stripe_client()
    session = client.billing_portal.sessions.create(params={
        "customer": stripe_customer_id,
        "return_url": return_url,
    })
    return session.url


# ---------------------------------------------------------------------------
# Webhook event handlers
# ---------------------------------------------------------------------------

def handle_checkout_completed(session_data: dict) -> None:
    """
    Handle `checkout.session.completed` webhook event.

    Marks the related Invoice as PAID and triggers the next invoice
    generation + PDF email (same as the PayHere webhook handler).
    """
    from django.utils import timezone

    from apps.billing.models import Invoice, InvoiceStatus, StripePaymentEvent, SubscriptionStatus
    from apps.billing.services.invoice_service import (
        auto_generate_next_invoice,
        generate_and_email_invoice_pdf,
    )

    invoice_id = session_data.get("metadata", {}).get("invoice_id")
    invoice_number = session_data.get("metadata", {}).get("invoice_number")
    stripe_session_id = session_data.get("id")
    stripe_event_id = session_data.get("_stripe_event_id", stripe_session_id)
    amount_total = session_data.get("amount_total", 0)  # in smallest unit
    currency = (session_data.get("currency") or "lkr").upper()

    if not invoice_id and not invoice_number:
        logger.warning(
            "Stripe checkout.session.completed has no invoice metadata: %s",
            stripe_session_id,
        )
        return

    try:
        if invoice_id:
            invoice = Invoice.objects.select_related(
                "subscription", "subscription__plan", "tenant"
            ).get(id=invoice_id)
        else:
            invoice = Invoice.objects.select_related(
                "subscription", "subscription__plan", "tenant"
            ).get(invoice_number=invoice_number)
    except Invoice.DoesNotExist:
        logger.error(
            "Stripe webhook: Invoice not found. id=%s number=%s session=%s",
            invoice_id,
            invoice_number,
            stripe_session_id,
        )
        return

    if invoice.status == InvoiceStatus.PAID:
        logger.info(
            "Stripe webhook: Invoice %s already paid, skipping.",
            invoice.invoice_number,
        )
        return

    # Mark invoice paid
    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = timezone.now()
    invoice.save(update_fields=["status", "paid_at", "updated_at"])

    # Record Stripe payment event (idempotent via unique stripe_event_id)
    StripePaymentEvent.objects.get_or_create(
        stripe_event_id=stripe_event_id,
        defaults={
            "invoice": invoice,
            "event_type": "checkout.session.completed",
            "stripe_session_id": stripe_session_id,
            "amount": amount_total / 100,
            "currency": currency,
            "processed": True,
            "raw_payload": session_data,
        },
    )

    # Activate subscription
    subscription = invoice.subscription
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.current_period_start = invoice.billing_period_start
    subscription.current_period_end = invoice.billing_period_end
    subscription.save(
        update_fields=[
            "status",
            "current_period_start",
            "current_period_end",
            "updated_at",
        ]
    )

    # Update tenant subscription_status if the model supports it
    try:
        tenant = invoice.tenant
        if hasattr(tenant, "subscription_status"):
            tenant.subscription_status = "ACTIVE"
            tenant.save(update_fields=["subscription_status"])
    except Exception:
        logger.exception("Failed to update tenant subscription_status for invoice %s", invoice.id)

    # Generate next invoice + send PDF
    try:
        auto_generate_next_invoice(subscription)
    except Exception:
        logger.exception("Failed to auto-generate next invoice for subscription %s", subscription.id)

    try:
        generate_and_email_invoice_pdf(invoice)
    except Exception:
        logger.exception("Failed to send invoice PDF for invoice %s", invoice.id)

    logger.info(
        "Stripe payment processed for invoice %s (session %s)",
        invoice.invoice_number,
        stripe_session_id,
    )


def handle_subscription_updated(stripe_sub: dict) -> None:
    """
    Handle `customer.subscription.updated` webhook.

    Updates the Subscription record with the latest Stripe subscription state.
    This is relevant when tenants switch to Stripe-managed recurring billing
    in the future.
    """
    from apps.billing.models import Subscription, SubscriptionStatus

    stripe_sub_id = stripe_sub.get("id")
    stripe_status = stripe_sub.get("status")

    try:
        subscription = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
    except Subscription.DoesNotExist:
        logger.warning(
            "Stripe subscription.updated: no local Subscription found for %s",
            stripe_sub_id,
        )
        return

    status_map = {
        "active": SubscriptionStatus.ACTIVE,
        "past_due": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELLED,
        "unpaid": SubscriptionStatus.SUSPENDED,
    }
    new_status = status_map.get(stripe_status)
    if new_status and subscription.status != new_status:
        subscription.status = new_status
        subscription.save(update_fields=["status", "updated_at"])
        logger.info(
            "Updated subscription %s status to %s via Stripe webhook",
            subscription.id,
            new_status,
        )


def handle_subscription_deleted(stripe_sub: dict) -> None:
    """Handle `customer.subscription.deleted` webhook."""
    from django.utils import timezone

    from apps.billing.models import Subscription, SubscriptionStatus

    stripe_sub_id = stripe_sub.get("id")
    try:
        subscription = Subscription.objects.get(stripe_subscription_id=stripe_sub_id)
    except Subscription.DoesNotExist:
        logger.warning(
            "Stripe subscription.deleted: no local Subscription found for %s",
            stripe_sub_id,
        )
        return

    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelled_at = timezone.now()
    subscription.save(update_fields=["status", "cancelled_at", "updated_at"])
    logger.info(
        "Subscription %s cancelled via Stripe subscription.deleted webhook",
        subscription.id,
    )
