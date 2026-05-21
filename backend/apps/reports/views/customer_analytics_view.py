from decimal import Decimal
from datetime import datetime, timedelta

from django.db.models import Sum, Count, Min, Max, Q
from django.db.models.functions import TruncWeek
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale
from apps.crm.models import Customer


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


def _mask_phone(phone: str | None, role: str) -> str:
    """Mask phone for CASHIER/STOCK_CLERK roles; return full for MANAGER/OWNER/SUPER_ADMIN."""
    if not phone:
        return ""
    if role in ("MANAGER", "OWNER", "SUPER_ADMIN"):
        return phone
    # Mask all but last 4 digits
    visible = phone[-4:]
    return "*" * (len(phone) - 4) + visible


class CustomerAnalyticsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        user_role = getattr(request.user, "role", "CASHIER")
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")

        if not from_date_str or not to_date_str:
            return _error("from_date and to_date are required.", 400)

        try:
            from_date = datetime.fromisoformat(from_date_str.replace("Z", "+00:00"))
            to_date = datetime.fromisoformat(to_date_str.replace("Z", "+00:00"))
        except ValueError:
            return _error("Invalid date format. Use ISO 8601.", 400)

        today = now()
        churn_start = today - timedelta(days=365)
        churn_end = today - timedelta(days=60)

        # ── Top Customers ─────────────────────────────────────────────────────
        top_qs = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                created_at__gte=from_date,
                created_at__lte=to_date,
                customer__isnull=False,
            )
            .values("customer_id")
            .annotate(total_spend=Sum("total_amount"), visit_count=Count("id"))
            .order_by("-total_spend")[:50]
        )

        customer_ids = [row["customer_id"] for row in top_qs]
        customer_map = {
            str(c.id): c
            for c in Customer.objects.filter(id__in=customer_ids).only(
                "id", "name", "phone", "email"
            )
        }

        top_customers = []
        for row in top_qs:
            cid = str(row["customer_id"])
            c = customer_map.get(cid)
            total_spend = row["total_spend"] or Decimal("0.00")
            visit_count = row["visit_count"] or 1
            avg_spend = (total_spend / Decimal(visit_count)).quantize(Decimal("0.01"))
            top_customers.append({
                "customerId": cid,
                "name": c.name if c else "",
                "phone": _mask_phone(c.phone if c else None, user_role),
                "totalSpend": str(total_spend.quantize(Decimal("0.01"))),
                "visitCount": row["visit_count"],
                "avgSpendPerVisit": str(avg_spend),
            })

        # ── New vs Returning ───────────────────────────────────────────────────
        # Step 1: first-ever purchase date per customer for this tenant
        first_purchase_map = dict(
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                customer__isnull=False,
            )
            .values("customer_id")
            .annotate(first_purchase=Min("created_at"))
            .values_list("customer_id", "first_purchase")
        )

        # Step 2: sales within date range, grouped by week and customer
        weekly_qs = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                created_at__gte=from_date,
                created_at__lte=to_date,
                customer__isnull=False,
            )
            .annotate(week=TruncWeek("created_at"))
            .values("week", "customer_id")
            .distinct()
            .order_by("week")
        )

        # Step 3: bucket by week, classify new vs returning in Python
        week_data: dict = {}
        for row in weekly_qs:
            week = row["week"]
            cid = row["customer_id"]
            first = first_purchase_map.get(cid)
            if week not in week_data:
                week_data[week] = {"new": 0, "returning": 0}
            if first and first >= week:
                week_data[week]["new"] += 1
            else:
                week_data[week]["returning"] += 1

        new_vs_returning = [
            {
                "week": week.isoformat() if week else None,
                "new": counts["new"],
                "returning": counts["returning"],
            }
            for week, counts in sorted(week_data.items())
        ]

        # ── Churn Risk ────────────────────────────────────────────────────────
        churn_qs = (
            Customer.objects.filter(
                tenant_id=tenant_id,
                deleted_at__isnull=True,
                is_active=True,
            )
            .annotate(
                last_visit=Max("sales__created_at"),
            )
            .filter(
                last_visit__gte=churn_start,
                last_visit__lt=churn_end,
            )
            .only("id", "name", "phone", "total_spend")
            .order_by("last_visit")
        )

        churn_risk = []
        for c in churn_qs:
            last_visit = c.last_visit  # type: ignore[attr-defined]
            days_since = (today - last_visit).days if last_visit else 999
            risk_level = "at_risk" if days_since < 90 else "churned"
            churn_risk.append({
                "customerId": str(c.id),
                "name": c.name,
                "phone": _mask_phone(c.phone, user_role),
                "lastVisitDate": last_visit.isoformat() if last_visit else None,
                "daysSinceLastVisit": days_since,
                "lifetimeSpend": str(c.total_spend.quantize(Decimal("0.01"))),
                "riskLevel": risk_level,
            })

        return _ok({
            "topCustomers": top_customers,
            "newVsReturning": new_vs_returning,
            "churnRisk": churn_risk,
        })
