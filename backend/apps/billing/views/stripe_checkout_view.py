"""
billing/views/stripe_checkout_view.py

Two endpoints:
    POST /api/billing/stripe/checkout/
        Creates a Stripe Checkout Session for the current (or newest open) invoice.
        Returns {stripe_checkout_url, session_id}.

    POST /api/billing/stripe/portal/
        Creates a Stripe Billing Portal session so the tenant can manage
        payment methods and view receipts. Returns {portal_url}.
"""
from __future__ import annotations

import logging

from django.conf import settings
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class StripeCheckoutView(APIView):
    """
    Create a Stripe Checkout Session for the authenticated tenant's open invoice.

    Request body (optional):
        plan_id       — if provided, creates a new subscription + invoice first
        billing_cycle — "monthly" | "annual"  (default: monthly)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def post(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        from apps.billing.models import Invoice, InvoiceStatus, Subscription, SubscriptionPlan
        from apps.billing.services.stripe_service import create_checkout_session
        from apps.tenants.models import Tenant

        # Resolve tenant + user
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return _error("tenant_not_found", "Tenant not found.", 404)

        user = request.user

        # Optional: switch plan before checkout
        plan_id = request.data.get("plan_id")
        billing_cycle = request.data.get("billing_cycle", "monthly")

        if plan_id:
            # Same logic as CheckoutInitiateView — create subscription + invoice
            try:
                new_plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            except SubscriptionPlan.DoesNotExist:
                return _error("plan_not_found", "Subscription plan not found.", 404)

            from django.utils import timezone
            from datetime import timedelta

            # Get or create the subscription
            subscription, _ = Subscription.objects.get_or_create(
                tenant=tenant,
                defaults={"plan": new_plan, "status": "PENDING"},
            )
            if subscription.plan != new_plan:
                subscription.plan = new_plan
                subscription.status = "PENDING"
                subscription.save(update_fields=["plan", "status", "updated_at"])

            # Determine price for this billing cycle
            from decimal import Decimal
            price = (
                new_plan.annual_price
                if billing_cycle == "annual"
                else new_plan.monthly_price
            )

            # Create or retrieve an open invoice
            now = timezone.now()
            invoice, created = Invoice.objects.get_or_create(
                subscription=subscription,
                status=InvoiceStatus.OPEN,
                defaults={
                    "tenant": tenant,
                    "invoice_number": f"INV-{now.strftime('%Y%m%d%H%M%S')}",
                    "amount": Decimal(str(price)),
                    "billing_period_start": now,
                    "billing_period_end": now + timedelta(
                        days=365 if billing_cycle == "annual" else 30
                    ),
                },
            )
        else:
            # Find the latest open invoice for this tenant
            try:
                subscription = Subscription.objects.get(tenant=tenant)
            except Subscription.DoesNotExist:
                return _error(
                    "no_subscription",
                    "No active subscription found. Please select a plan.",
                    404,
                )

            invoice = (
                Invoice.objects.filter(
                    subscription=subscription,
                    status=InvoiceStatus.OPEN,
                )
                .order_by("-created_at")
                .first()
            )
            if not invoice:
                return _error(
                    "no_open_invoice",
                    "No open invoice found. Your subscription may already be active.",
                    404,
                )

        # Build redirect URLs
        app_url = getattr(settings, "FRONTEND_APP_URL", "http://localhost:3000")
        success_url = (
            f"{app_url}/store/billing?payment=success"
            "&session_id={CHECKOUT_SESSION_ID}"
        )
        cancel_url = f"{app_url}/store/billing?payment=cancelled"

        try:
            checkout_url = create_checkout_session(
                invoice=invoice,
                tenant=tenant,
                user=user,
                success_url=success_url,
                cancel_url=cancel_url,
            )
        except RuntimeError as exc:
            logger.error("Stripe checkout session creation failed: %s", exc)
            return _error("stripe_not_configured", str(exc), 503)
        except Exception as exc:
            logger.exception("Unexpected error creating Stripe Checkout Session")
            return _error("stripe_error", f"Payment gateway error: {exc}", 500)

        return _ok({"stripe_checkout_url": checkout_url})


class StripePortalView(APIView):
    """
    Create a Stripe Billing Portal session for the authenticated tenant.
    Returns {portal_url}.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def post(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        from apps.billing.models import Subscription
        from apps.billing.services.stripe_service import create_portal_session

        try:
            subscription = Subscription.objects.get(tenant_id=tenant_id)
        except Subscription.DoesNotExist:
            return _error("no_subscription", "No subscription found.", 404)

        if not subscription.stripe_customer_id:
            return _error(
                "no_stripe_customer",
                "No Stripe customer found for this account. "
                "Please complete a Stripe payment first.",
                404,
            )

        app_url = getattr(settings, "FRONTEND_APP_URL", "http://localhost:3000")
        return_url = f"{app_url}/store/billing"

        try:
            portal_url = create_portal_session(
                stripe_customer_id=subscription.stripe_customer_id,
                return_url=return_url,
            )
        except Exception as exc:
            logger.exception("Stripe portal session creation failed")
            return _error("stripe_error", f"Payment gateway error: {exc}", 500)

        return _ok({"portal_url": portal_url})


class StripePublishableKeyView(APIView):
    """
    GET /api/billing/stripe/config/
    Returns the Stripe publishable key for the frontend.
    This is safe to expose publicly.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        pk = getattr(settings, "STRIPE_PUBLISHABLE_KEY", "")
        if not pk:
            return _error("stripe_not_configured", "Stripe is not configured.", 503)
        return _ok({"publishable_key": pk})
