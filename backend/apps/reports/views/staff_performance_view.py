from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale
from apps.hr.models import TimeClock, CommissionRecord


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class StaffPerformanceView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        user_role = getattr(request.user, "role", "CASHIER")
        user_id = request.user.id
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")

        if user_role == "STOCK_CLERK":
            return _error("Stock clerks cannot access staff performance reports.", 403)

        if not from_date_str or not to_date_str:
            return _error("from_date and to_date are required.", 400)

        try:
            from_date = datetime.fromisoformat(from_date_str.replace("Z", "+00:00"))
            to_date = datetime.fromisoformat(to_date_str.replace("Z", "+00:00"))
        except ValueError:
            return _error("Invalid date format. Use ISO 8601.", 400)

        is_cashier = user_role == "CASHIER"

        # ── Sales by cashier ──────────────────────────────────────────────────
        sales_qs = Sale.objects.filter(
            tenant_id=tenant_id,
            status="COMPLETED",
            created_at__gte=from_date,
            created_at__lte=to_date,
        )
        if is_cashier:
            sales_qs = sales_qs.filter(cashier_id=user_id)
        sales_data = (
            sales_qs.values("cashier_id")
            .annotate(total_revenue=Sum("total_amount"), transaction_count=Count("id"))
            .order_by("-total_revenue")
        )
        sales_map = {
            str(row["cashier_id"]): row for row in sales_data
        }

        # ── Hours worked (computed in Python — SQLite-compatible) ─────────────
        tc_qs = TimeClock.objects.filter(
            tenant_id=tenant_id,
            clocked_in_at__gte=from_date,
            clocked_in_at__lte=to_date,
            clocked_out_at__isnull=False,
        )
        if is_cashier:
            tc_qs = tc_qs.filter(user_id=user_id)

        hours_map: dict[str, float] = {}
        for tc in tc_qs:
            uid = str(tc.user_id)
            if tc.clocked_out_at:
                delta = tc.clocked_out_at - tc.clocked_in_at
                hours_map[uid] = hours_map.get(uid, 0.0) + delta.total_seconds() / 3600.0

        # ── Commission ────────────────────────────────────────────────────────
        comm_qs = CommissionRecord.objects.filter(
            tenant_id=tenant_id,
            created_at__gte=from_date,
            created_at__lte=to_date,
        )
        if is_cashier:
            comm_qs = comm_qs.filter(user_id=user_id)
        commission_data = (
            comm_qs.values("user_id")
            .annotate(
                total_commission=Sum("earned_amount"),
                paid_commission=Sum("earned_amount", filter=Q(is_paid=True)),
            )
        )
        commission_map = {str(row["user_id"]): row for row in commission_data}

        # ── Merge all user IDs ────────────────────────────────────────────────
        all_user_ids = set(sales_map.keys()) | set(hours_map.keys()) | set(commission_map.keys())
        User = get_user_model()
        user_records = {
            str(u.id): u
            for u in User.objects.filter(id__in=all_user_ids).only(
                "id", "first_name", "last_name", "role"
            )
        }

        rows = []
        for uid in all_user_ids:
            u = user_records.get(uid)
            s = sales_map.get(uid, {})
            c = commission_map.get(uid, {})
            total_revenue = s.get("total_revenue") or Decimal("0.00")
            tx_count = s.get("transaction_count") or 0
            hours = hours_map.get(uid, 0.0)
            total_commission = c.get("total_commission") or Decimal("0.00")
            paid_commission = c.get("paid_commission") or Decimal("0.00")
            avg_tx = (
                (total_revenue / Decimal(tx_count)).quantize(Decimal("0.01"))
                if tx_count > 0
                else Decimal("0.00")
            )
            staff_name = ""
            staff_role = ""
            if u:
                staff_name = f"{u.first_name} {u.last_name}".strip() or u.email
                staff_role = u.role
            rows.append({
                "userId": uid,
                "staffName": staff_name,
                "role": staff_role,
                "hoursWorked": round(hours, 2),
                "transactionCount": tx_count,
                "totalRevenue": str(total_revenue.quantize(Decimal("0.01"))),
                "avgTransactionValue": str(avg_tx),
                "commissionEarned": str(total_commission.quantize(Decimal("0.01"))),
                "commissionPaid": str(paid_commission.quantize(Decimal("0.01"))),
            })

        rows.sort(key=lambda r: float(r["totalRevenue"]), reverse=True)

        return _ok({
            "rows": rows,
            "isRestricted": is_cashier,
        })
