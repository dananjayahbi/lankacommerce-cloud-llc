import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.billing.models import Invoice, InvoiceStatus

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class MetricsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)
        if getattr(request.user, "role", None) != "SUPER_ADMIN":
            return _error("forbidden", "Only Super Admins can view metrics.", 403)

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # MRR: sum of monthly_price for all ACTIVE subscriptions
        active_subs = (
            Subscription.objects.filter(status=SubscriptionStatus.ACTIVE)
            .select_related("plan")
        )
        mrr = sum(s.plan.monthly_price for s in active_subs)
        arr = mrr * 12

        active_subscribers = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).count()
        trial_subscribers = Subscription.objects.filter(status=SubscriptionStatus.TRIAL).count()

        trial_to_paid_last_30 = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            created_at__gte=thirty_days_ago,
        ).count()

        churned_last_30 = Subscription.objects.filter(
            status=SubscriptionStatus.CANCELLED,
            cancelled_at__gte=thirty_days_ago,
        ).count()

        denominator = active_subscribers + churned_last_30
        net_churn_rate = (
            round((churned_last_30 / denominator) * 100, 2) if denominator > 0 else 0.0
        )

        # Revenue by plan
        plans = SubscriptionPlan.objects.annotate(
            active_count=Count(
                "subscriptions",
                filter=Q(subscriptions__status=SubscriptionStatus.ACTIVE),
            )
        )
        revenue_by_plan = [
            {
                "plan_name": p.name,
                "active_count": p.active_count,
                "monthly_cumulative_revenue": str(p.monthly_price * p.active_count),
            }
            for p in plans
        ]

        # Tenants overview
        from apps.tenants.models import Tenant
        tenants = Tenant.objects.filter(deleted_at__isnull=True).prefetch_related(
            "billing_subscriptions__plan", "billing_invoices"
        )

        tenants_data = []
        for t in tenants:
            sub = (
                t.billing_subscriptions.order_by("-created_at").first()
            )
            last_paid = (
                t.billing_invoices.filter(status=InvoiceStatus.PAID)
                .order_by("-paid_at")
                .first()
            )
            tenants_data.append({
                "id": str(t.id),
                "name": t.name,
                "slug": t.slug,
                "subscription_status": t.subscription_status,
                "plan_name": sub.plan.name if sub else None,
                "last_payment_date": last_paid.paid_at.isoformat() if last_paid and last_paid.paid_at else None,
                "next_billing_date": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            })

        return _ok({
            "mrr": str(mrr),
            "arr": str(arr),
            "active_subscribers": active_subscribers,
            "trial_subscribers": trial_subscribers,
            "trial_to_paid_last_30_days": trial_to_paid_last_30,
            "churned_last_30_days": churned_last_30,
            "net_churn_rate": net_churn_rate,
            "revenue_by_plan": revenue_by_plan,
            "tenants": tenants_data,
            "computed_at": now.isoformat(),
        })
