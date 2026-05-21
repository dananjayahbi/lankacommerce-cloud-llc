from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Count
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale
from apps.hr.models import CommissionRecord


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class SalesByStaffView(APIView):
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

        # ── Sales by Cashier ─────────────────────────────────────────────────
        sales_qs = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                created_at__gte=from_date,
                created_at__lte=to_date,
            )
            .values("cashier_id")
            .annotate(
                total_revenue=Sum("total_amount"),
                transaction_count=Count("id"),
            )
            .order_by("-total_revenue")
        )

        # ── Commission by User ───────────────────────────────────────────────
        commission_qs = (
            CommissionRecord.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=from_date,
                created_at__lte=to_date,
            )
            .values("user_id")
            .annotate(total_commission=Sum("earned_amount"))
        )
        commission_map: dict = {
            str(r["user_id"]): r["total_commission"] or Decimal("0.00")
            for r in commission_qs
        }

        # ── Fetch User Records ───────────────────────────────────────────────
        User = settings.AUTH_USER_MODEL
        # Import lazily to respect AUTH_USER_MODEL
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()

        cashier_ids = [r["cashier_id"] for r in sales_qs]
        users_map = {
            str(u.id): u
            for u in UserModel.objects.filter(id__in=cashier_ids).only(
                "id", "first_name", "last_name", "role"
            )
        }

        # ── Build rows ───────────────────────────────────────────────────────
        rows = []
        for row in sales_qs:
            cashier_id_str = str(row["cashier_id"])
            user = users_map.get(cashier_id_str)
            total_rev = row["total_revenue"] or Decimal("0.00")
            tx_count = row["transaction_count"] or 0
            avg_tx = (total_rev / Decimal(tx_count)).quantize(Decimal("0.01")) if tx_count > 0 else Decimal("0.00")
            commission = commission_map.get(cashier_id_str, Decimal("0.00"))
            rows.append({
                "userId": cashier_id_str,
                "staffName": f"{user.first_name} {user.last_name}".strip() if user else cashier_id_str,
                "role": user.role if user else "UNKNOWN",
                "transactionCount": tx_count,
                "totalRevenue": str(total_rev.quantize(Decimal("0.01"))),
                "avgTransactionValue": str(avg_tx),
                "commissionEarned": str(commission.quantize(Decimal("0.01")) if isinstance(commission, Decimal) else Decimal(str(commission)).quantize(Decimal("0.01"))),
            })

        return _ok({"rows": rows})
