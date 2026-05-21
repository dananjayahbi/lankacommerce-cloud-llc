import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import (
    Invoice,
    InvoiceStatus,
    Subscription,
    SubscriptionStatus,
)
from apps.billing.services.payhere_service import PayHereService

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class CheckoutInitiateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def post(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        plan_id = request.data.get("plan_id")
        if not plan_id:
            return _error("missing_plan_id", "plan_id is required.", 400)

        from apps.billing.models import SubscriptionPlan
        from apps.tenants.models import Tenant

        try:
            selected_plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return _error("plan_not_found", "Plan not found or inactive.", 404)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return _error("tenant_not_found", "Tenant not found.", 404)

        sub_status = getattr(tenant, "subscription_status", None)
        if sub_status in ("SUSPENDED", "CANCELLED"):
            return _error(
                "subscription_suspended",
                "Cannot initiate checkout while subscription is suspended or cancelled.",
            )

        subscription = (
            Subscription.objects.filter(tenant_id=tenant_id)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )

        now = timezone.now()
        if subscription and subscription.status == SubscriptionStatus.TRIAL:
            # Upgrade trial to selected plan and create pending invoice
            subscription.plan = selected_plan
            subscription.save(update_fields=["plan", "updated_at"])

            period_end = now + timedelta(days=30)
            invoice = Invoice.objects.create(
                subscription=subscription,
                tenant=tenant,
                invoice_number=PayHereService.generate_invoice_number(),
                amount=selected_plan.monthly_price,
                status=InvoiceStatus.PENDING,
                billing_period_start=now,
                billing_period_end=period_end,
                due_date=period_end + timedelta(days=7),
            )
        else:
            # Active or past due — create new invoice for next period
            if subscription:
                period_start = subscription.current_period_end or now
            else:
                period_start = now
            period_end = period_start + timedelta(days=30)
            invoice = Invoice.objects.create(
                subscription=subscription,
                tenant=tenant,
                invoice_number=PayHereService.generate_invoice_number(),
                amount=selected_plan.monthly_price,
                status=InvoiceStatus.PENDING,
                billing_period_start=period_start,
                billing_period_end=period_end,
                due_date=period_end + timedelta(days=7),
            )

        try:
            result = PayHereService.initiate_checkout(invoice.id, tenant_id, request.user)
        except Exception as exc:
            logger.exception("Checkout initiation failed: %s", exc)
            return _error("checkout_failed", str(exc), 500)

        return _ok(result)
