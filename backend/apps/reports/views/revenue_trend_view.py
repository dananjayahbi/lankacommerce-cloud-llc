from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, ExtractHour
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale, Return


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


_TRUNC_FN = {
    "daily": TruncDay,
    "weekly": TruncWeek,
    "monthly": TruncMonth,
}


class RevenueTrendView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")
        granularity = request.query_params.get("granularity", "monthly")

        if granularity not in _TRUNC_FN:
            return _error("granularity must be one of: daily, weekly, monthly.", 400)

        if not from_date_str or not to_date_str:
            return _error("from_date and to_date are required.", 400)

        try:
            from_date = datetime.fromisoformat(from_date_str.replace("Z", "+00:00"))
            to_date = datetime.fromisoformat(to_date_str.replace("Z", "+00:00"))
        except ValueError:
            return _error("Invalid date format. Use ISO 8601.", 400)

        TruncFn = _TRUNC_FN[granularity]

        # ── Revenue buckets ───────────────────────────────────────────────────
        sale_qs = Sale.objects.filter(
            tenant_id=tenant_id,
            status="COMPLETED",
            created_at__gte=from_date,
            created_at__lte=to_date,
        )
        revenue_buckets = (
            sale_qs.annotate(bucket=TruncFn("created_at"))
            .values("bucket")
            .annotate(revenue=Sum("total_amount"), transactions=Count("id"))
            .order_by("bucket")
        )

        # ── Returns buckets ───────────────────────────────────────────────────
        returns_buckets = (
            Return.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=from_date,
                created_at__lte=to_date,
            )
            .annotate(bucket=TruncFn("created_at"))
            .values("bucket")
            .annotate(returns_total=Sum("refund_amount"))
            .order_by("bucket")
        )
        returns_map: dict = {
            r["bucket"]: r["returns_total"] or Decimal("0.00")
            for r in returns_buckets
        }

        # ── Merge ─────────────────────────────────────────────────────────────
        trend_buckets = []
        for row in revenue_buckets:
            bucket = row["bucket"]
            rev = row["revenue"] or Decimal("0.00")
            ret = returns_map.pop(bucket, Decimal("0.00"))
            trend_buckets.append({
                "bucket": bucket.isoformat() if bucket else None,
                "revenue": str(rev.quantize(Decimal("0.01"))),
                "returns": str(ret.quantize(Decimal("0.01")) if isinstance(ret, Decimal) else Decimal(str(ret)).quantize(Decimal("0.01"))),
                "transactions": row["transactions"],
            })
        # Buckets with returns but no revenue
        for bucket, ret in returns_map.items():
            trend_buckets.append({
                "bucket": bucket.isoformat() if bucket else None,
                "revenue": "0.00",
                "returns": str(ret.quantize(Decimal("0.01")) if isinstance(ret, Decimal) else Decimal(str(ret)).quantize(Decimal("0.01"))),
                "transactions": 0,
            })
        trend_buckets.sort(key=lambda x: x["bucket"] or "")

        # ── Summary stats ─────────────────────────────────────────────────────
        summary_agg = sale_qs.aggregate(
            total=Sum("total_amount"),
            count=Count("id"),
        )
        total_revenue = summary_agg["total"] or Decimal("0.00")
        total_transactions = summary_agg["count"] or 0

        total_returns = (
            Return.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=from_date,
                created_at__lte=to_date,
            )
            .aggregate(total=Sum("refund_amount"))["total"]
            or Decimal("0.00")
        )

        avg_order_value = (
            (total_revenue / Decimal(total_transactions)).quantize(Decimal("0.01"))
            if total_transactions > 0
            else Decimal("0.00")
        )
        return_rate = (
            round(float(total_returns / total_revenue * Decimal("100")), 2)
            if total_revenue > Decimal("0")
            else 0.0
        )

        # ── Peak hours ────────────────────────────────────────────────────────
        peak_hours_qs = (
            sale_qs.annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(revenue=Sum("total_amount"), transactions=Count("id"))
            .order_by("hour")
        )
        peak_hours = [
            {
                "hour": row["hour"],
                "revenue": str((row["revenue"] or Decimal("0.00")).quantize(Decimal("0.01"))),
                "transactions": row["transactions"],
            }
            for row in peak_hours_qs
        ]

        return _ok({
            "summary": {
                "totalRevenue": str(total_revenue.quantize(Decimal("0.01"))),
                "totalTransactions": total_transactions,
                "avgOrderValue": str(avg_order_value),
                "returnRate": return_rate,
            },
            "trendBuckets": trend_buckets,
            "peakHours": peak_hours,
        })
