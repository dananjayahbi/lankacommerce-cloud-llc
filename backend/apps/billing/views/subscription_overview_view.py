import logging

from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import Invoice, InvoiceStatus, Subscription
from apps.billing.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class SubscriptionOverviewView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        subscription = SubscriptionService.get_subscription_for_tenant(tenant_id)
        if not subscription:
            return _error("no_subscription", "No subscription found for this tenant.", 404)

        now = timezone.now()
        days_remaining = (
            max((subscription.current_period_end - now).days, 0)
            if subscription.current_period_end
            else 0
        )

        sub_data = {
            "subscription_id": str(subscription.id),
            "plan_name": subscription.plan.name,
            "plan_monthly_price": str(subscription.plan.monthly_price),
            "plan_annual_price": str(subscription.plan.annual_price),
            "plan_features": subscription.plan.features or [],
            "status": subscription.status,
            "trial_ends_at": subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "cancelled_at": subscription.cancelled_at.isoformat() if subscription.cancelled_at else None,
            "days_remaining": days_remaining,
        }

        # Last 6 invoices
        invoices = (
            Invoice.objects.filter(tenant_id=tenant_id)
            .select_related("subscription__plan")
            .order_by("-created_at")[:6]
        )
        invoices_data = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "amount": str(inv.amount),
                "status": inv.status,
                "billing_period_start": inv.billing_period_start.isoformat(),
                "billing_period_end": inv.billing_period_end.isoformat(),
                "due_date": inv.due_date.isoformat(),
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            }
            for inv in invoices
        ]

        # Pending invoice for checkout link
        pending_invoice = (
            Invoice.objects.filter(tenant_id=tenant_id, status=InvoiceStatus.PENDING)
            .order_by("-created_at")
            .first()
        )

        return _ok({
            "subscription": sub_data,
            "invoices": invoices_data,
            "pending_invoice_id": str(pending_invoice.id) if pending_invoice else None,
        })
