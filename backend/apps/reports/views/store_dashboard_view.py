from datetime import date, timedelta, datetime, timezone as dt_timezone

from django.db.models import Sum, Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale, SaleStatus, Shift, ShiftStatus
from apps.catalog.models import ProductVariant


def _ok(data):
    return Response({"success": True, "data": data})


class StoreDashboardView(APIView):
    """
    GET /api/reports/store-dashboard/

    Returns key metrics for the tenant store owner / manager dashboard:
      - today's revenue, transaction count, average basket
      - low stock alert count
      - open shift count
      - recent 5 completed sales
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = str(request.user.tenant_id)

        # ── Date boundaries (UTC) ─────────────────────────────────────────────
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=dt_timezone.utc
        )
        today_end = today_start + timedelta(days=1)

        # ── Today's sales aggregate ───────────────────────────────────────────
        today_qs = Sale.objects.filter(
            tenant_id=tenant_id,
            status=SaleStatus.COMPLETED,
            completed_at__gte=today_start,
            completed_at__lt=today_end,
        )
        today_agg = today_qs.aggregate(
            revenue=Sum("total_amount"),
            count=Count("id"),
        )
        today_revenue = float(today_agg["revenue"] or 0)
        today_count = today_agg["count"] or 0
        today_avg_basket = round(today_revenue / today_count, 2) if today_count else 0

        # ── Yesterday's revenue (for comparison) ──────────────────────────────
        yesterday_start = today_start - timedelta(days=1)
        yesterday_revenue = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status=SaleStatus.COMPLETED,
                completed_at__gte=yesterday_start,
                completed_at__lt=today_start,
            ).aggregate(revenue=Sum("total_amount"))["revenue"]
            or 0
        )
        yesterday_revenue = float(yesterday_revenue)

        # Revenue delta percent (handle div-by-zero)
        if yesterday_revenue:
            revenue_delta_pct = round(
                ((today_revenue - yesterday_revenue) / yesterday_revenue) * 100, 1
            )
        else:
            revenue_delta_pct = None  # No comparison possible

        # ── Low stock alerts ──────────────────────────────────────────────────
        from django.db.models import F as DjangoF
        low_stock_count = ProductVariant.objects.filter(
            product__tenant_id=tenant_id,
            product__deleted_at__isnull=True,
            stock_quantity__lte=DjangoF("low_stock_threshold"),
        ).count()

        # ── Open shifts ───────────────────────────────────────────────────────
        open_shifts = Shift.objects.filter(
            tenant_id=tenant_id,
            status=ShiftStatus.OPEN,
        ).count()

        # ── Recent 5 sales ────────────────────────────────────────────────────
        recent_sales = list(
            Sale.objects.filter(
                tenant_id=tenant_id,
                status=SaleStatus.COMPLETED,
            )
            .order_by("-completed_at")
            .values(
                "id",
                "total_amount",
                "payment_method",
                "completed_at",
            )[:5]
        )
        for s in recent_sales:
            s["id"] = str(s["id"])
            if s["completed_at"]:
                s["completed_at"] = s["completed_at"].isoformat()

        return _ok(
            {
                "today": {
                    "revenue": today_revenue,
                    "transaction_count": today_count,
                    "avg_basket": today_avg_basket,
                    "revenue_delta_pct": revenue_delta_pct,
                },
                "low_stock_count": low_stock_count,
                "open_shifts": open_shifts,
                "recent_sales": recent_sales,
            }
        )

