from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Q, F
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale, SaleLine, Return, Expense


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class ProfitLossView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")

        if not from_date_str or not to_date_str:
            return _error("from_date and to_date are required.", 400)

        try:
            from_date = datetime.fromisoformat(from_date_str.replace("Z", "+00:00"))
            to_date = datetime.fromisoformat(to_date_str.replace("Z", "+00:00"))
        except ValueError:
            return _error("Invalid date format. Use ISO 8601.", 400)

        # ── Revenue ─────────────────────────────────────────────────────────
        sale_qs = Sale.objects.filter(
            tenant_id=tenant_id,
            status="COMPLETED",
            created_at__gte=from_date,
            created_at__lte=to_date,
        )
        total_revenue = sale_qs.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")

        # Payment method breakdown
        payment_breakdown = list(
            sale_qs.values("payment_method")
            .annotate(amount=Sum("total_amount"))
            .order_by("-amount")
        )
        payment_breakdown_out = [
            {"method": row["payment_method"] or "UNKNOWN", "amount": str(row["amount"])}
            for row in payment_breakdown
        ]

        # ── Returns ─────────────────────────────────────────────────────────
        total_returns = (
            Return.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=from_date,
                created_at__lte=to_date,
            )
            .aggregate(total=Sum("refund_amount"))["total"]
            or Decimal("0.00")
        )

        net_revenue = total_revenue - total_returns

        # ── COGS (via ProductVariant.cost_price joined to SaleLine.variant) ─
        # Note: SaleLine has no cost_price_snapshot; we join to the variant's
        # current cost_price as best available approximation.
        cogs_qs = (
            SaleLine.objects.filter(
                sale__tenant_id=tenant_id,
                sale__status="COMPLETED",
                sale__created_at__gte=from_date,
                sale__created_at__lte=to_date,
            )
            .annotate(line_cogs=F("variant__cost_price") * F("quantity"))
            .aggregate(total=Sum("line_cogs"))
        )
        total_cogs = cogs_qs["total"] or Decimal("0.00")

        gross_profit = net_revenue - total_cogs
        gross_margin = (
            (gross_profit / net_revenue * Decimal("100")).quantize(Decimal("0.01"))
            if net_revenue > Decimal("0")
            else Decimal("0.00")
        )

        # ── Expenses ─────────────────────────────────────────────────────────
        expense_qs = Expense.objects.filter(
            tenant_id=tenant_id,
            expense_date__gte=from_date.date(),
            expense_date__lte=to_date.date(),
        )
        expenses_by_category = list(
            expense_qs.values("category").annotate(total=Sum("amount")).order_by("-total")
        )
        total_expenses = (
            expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        )
        net_profit = gross_profit - total_expenses

        # ── Monthly breakdown ────────────────────────────────────────────────
        monthly_revenue_qs = (
            sale_qs.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(revenue=Sum("total_amount"))
            .order_by("month")
        )

        monthly_cogs_qs = (
            SaleLine.objects.filter(
                sale__tenant_id=tenant_id,
                sale__status="COMPLETED",
                sale__created_at__gte=from_date,
                sale__created_at__lte=to_date,
            )
            .annotate(month=TruncMonth("sale__created_at"))
            .annotate(line_cogs=F("variant__cost_price") * F("quantity"))
            .values("month")
            .annotate(cogs=Sum("line_cogs"))
            .order_by("month")
        )

        monthly_expenses_qs = (
            expense_qs.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(expenses=Sum("amount"))
            .order_by("month")
        )

        # Merge monthly data into a dict keyed by month
        monthly: dict = {}
        for row in monthly_revenue_qs:
            key = row["month"].isoformat() if row["month"] else None
            if key:
                monthly.setdefault(key, {"month": key, "revenue": Decimal("0"), "cogs": Decimal("0"), "expenses": Decimal("0")})
                monthly[key]["revenue"] = row["revenue"] or Decimal("0")

        for row in monthly_cogs_qs:
            key = row["month"].isoformat() if row["month"] else None
            if key:
                monthly.setdefault(key, {"month": key, "revenue": Decimal("0"), "cogs": Decimal("0"), "expenses": Decimal("0")})
                monthly[key]["cogs"] = row["cogs"] or Decimal("0")

        for row in monthly_expenses_qs:
            key = row["month"].isoformat() if row["month"] else None
            if key:
                monthly.setdefault(key, {"month": key, "revenue": Decimal("0"), "cogs": Decimal("0"), "expenses": Decimal("0")})
                monthly[key]["expenses"] = row["expenses"] or Decimal("0")

        monthly_breakdown = []
        for key in sorted(monthly.keys()):
            m = monthly[key]
            m_gross = m["revenue"] - m["cogs"]
            m_net = m_gross - m["expenses"]
            monthly_breakdown.append({
                "month": m["month"],
                "revenue": str(m["revenue"].quantize(Decimal("0.01"))),
                "cogs": str(m["cogs"].quantize(Decimal("0.01"))),
                "expenses": str(m["expenses"].quantize(Decimal("0.01"))),
                "grossProfit": str(m_gross.quantize(Decimal("0.01"))),
                "netProfit": str(m_net.quantize(Decimal("0.01"))),
            })

        return _ok({
            "totalRevenue": str(total_revenue.quantize(Decimal("0.01"))),
            "totalReturns": str(total_returns.quantize(Decimal("0.01"))),
            "netRevenue": str(net_revenue.quantize(Decimal("0.01"))),
            "totalCogs": str(total_cogs.quantize(Decimal("0.01"))),
            "returnedCogs": "0.00",
            "netCogs": str(total_cogs.quantize(Decimal("0.01"))),
            "grossProfit": str(gross_profit.quantize(Decimal("0.01"))),
            "grossMargin": str(gross_margin),
            "totalExpenses": str(total_expenses.quantize(Decimal("0.01"))),
            "expensesByCategory": [
                {"category": r["category"], "total": str(r["total"].quantize(Decimal("0.01")))}
                for r in expenses_by_category
            ],
            "netProfit": str(net_profit.quantize(Decimal("0.01"))),
            "paymentBreakdown": payment_breakdown_out,
            "monthlyBreakdown": monthly_breakdown,
        })
