"""
billing/views/stripe_webhook_view.py

POST /api/billing/webhooks/stripe/

Receives and verifies Stripe webhook events, then delegates to the
stripe_service handlers.

Stripe webhook verification requires:
    settings.STRIPE_WEBHOOK_SECRET = whsec_...  (from Stripe Dashboard → Webhooks)

Events handled:
    checkout.session.completed  → mark invoice paid, activate subscription
    customer.subscription.updated → update subscription status
    customer.subscription.deleted → cancel subscription
    invoice.payment_succeeded   → logged (for Stripe-managed subscriptions)
    invoice.payment_failed      → logged
"""
from __future__ import annotations

import json
import logging

import stripe
from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def stripe_billing_webhook(request: HttpRequest) -> HttpResponse:
    """
    Entry point for Stripe webhook events targeting platform billing.

    Stripe signs every webhook payload with HMAC-SHA256. We verify the
    signature before processing to prevent replay / forgery attacks.
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    stripe_secret_key = getattr(settings, "STRIPE_SECRET_KEY", None)

    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook signature")
        return HttpResponse("Webhook secret not configured", status=503)

    if not stripe_secret_key:
        logger.error("STRIPE_SECRET_KEY is not set")
        return HttpResponse("Stripe not configured", status=503)

    # Verify signature using the Stripe library
    try:
        client = stripe.StripeClient(api_key=stripe_secret_key)
        event = client.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        logger.warning("Stripe webhook: invalid payload")
        return HttpResponse("Invalid payload", status=400)
    except stripe.SignatureVerificationError:
        logger.warning("Stripe webhook: invalid signature (possible forgery attempt)")
        return HttpResponse("Invalid signature", status=400)

    event_type = event.type
    event_data = event.data.object  # underlying Stripe object dict
    stripe_event_id = event.id

    logger.info("Stripe billing webhook received: %s (event_id=%s)", event_type, stripe_event_id)

    from apps.billing.services import stripe_service

    try:
        if event_type == "checkout.session.completed":
            # Attach the event ID so we can use it for idempotency
            session_dict = dict(event_data)
            session_dict["_stripe_event_id"] = stripe_event_id
            stripe_service.handle_checkout_completed(session_dict)

        elif event_type == "customer.subscription.updated":
            stripe_service.handle_subscription_updated(dict(event_data))

        elif event_type == "customer.subscription.deleted":
            stripe_service.handle_subscription_deleted(dict(event_data))

        elif event_type in ("invoice.payment_succeeded", "invoice.payment_failed"):
            # These are fired for Stripe-managed subscriptions — log only for now
            logger.info(
                "Stripe billing webhook: %s received for customer %s",
                event_type,
                event_data.get("customer"),
            )

        else:
            # Unhandled event type — acknowledge receipt to avoid Stripe retries
            logger.debug("Stripe billing webhook: unhandled event type %s", event_type)

    except Exception:
        logger.exception(
            "Unhandled exception in Stripe billing webhook for event %s (%s)",
            event_type,
            stripe_event_id,
        )
        # Return 200 to prevent Stripe from retrying — the error is logged for investigation
        return HttpResponse("Internal error (logged)", status=200)

    return HttpResponse("OK", status=200)
