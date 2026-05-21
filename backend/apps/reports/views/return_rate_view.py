from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import Sale, Return, ReturnLine, SaleLine
from apps.catalog.models import Product


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class ReturnRateView(APIView):
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

        _return_filter = dict(
            tenant_id=tenant_id,
            created_at__gte=from_date,
            created_at__lte=to_date,
        )

        # ── Overall stats ─────────────────────────────────────────────────────
        total_revenue = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                created_at__gte=from_date,
                created_at__lte=to_date,
            ).aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0.00")
        )

        total_refunds = (
            Return.objects.filter(**_return_filter)
            .aggregate(total=Sum("refund_amount"))["total"]
            or Decimal("0.00")
        )

        return_count = Return.objects.filter(**_return_filter).count()

        return_rate = (
            round(float(total_refunds / total_revenue * Decimal("100")), 2)
            if total_revenue > Decimal("0")
            else 0.0
        )

        # ── Category-level return rate ─────────────────────────────────────────
        # Returns by category (via ReturnLine → variant → product → category)
        cat_returns = (
            ReturnLine.objects.filter(
                return_record__tenant_id=tenant_id,
                return_record__created_at__gte=from_date,
                return_record__created_at__lte=to_date,
            )
            .values("variant__product__category_id", "variant__product__category__name")
            .annotate(
                return_amount=Sum("line_refund_amount"),
                returned_units=Sum("quantity"),
            )
            .order_by("-return_amount")
        )

        # Revenue by category (via SaleLine → variant → product → category)
        cat_revenue_qs = (
            SaleLine.objects.filter(
                sale__tenant_id=tenant_id,
                sale__status="COMPLETED",
                sale__created_at__gte=from_date,
                sale__created_at__lte=to_date,
            )
            .values("variant__product__category_id")
            .annotate(revenue=Sum("line_total_after_discount"))
        )
        cat_revenue_map = {
            str(row["variant__product__category_id"]): row["revenue"] or Decimal("0.00")
            for row in cat_revenue_qs
        }

        by_category = []
        for row in cat_returns:
            cat_id = str(row["variant__product__category_id"]) if row["variant__product__category_id"] else ""
            cat_name = row["variant__product__category__name"] or "Uncategorized"
            ret_amount = row["return_amount"] or Decimal("0.00")
            cat_rev = cat_revenue_map.get(cat_id, Decimal("0.00"))
            cat_rate = (
                round(float(ret_amount / cat_rev * Decimal("100")), 2)
                if cat_rev > Decimal("0")
                else 0.0
            )
            by_category.append({
                "categoryId": cat_id,
                "categoryName": cat_name,
                "returnAmount": str(ret_amount.quantize(Decimal("0.01"))),
                "returnedUnits": row["returned_units"] or 0,
                "categoryRevenue": str(cat_rev.quantize(Decimal("0.01"))),
                "returnRate": cat_rate,
            })

        # ── Reasons breakdown ────────────────────────────────────────────────
        reasons_qs = (
            Return.objects.filter(**_return_filter)
            .values("reason")
            .annotate(count=Count("id"), total=Sum("refund_amount"))
            .order_by("-count")
        )
        by_reason = [
            {
                "reason": row["reason"] if row["reason"] else "No Reason Given",
                "count": row["count"],
                "total": str((row["total"] or Decimal("0.00")).quantize(Decimal("0.01"))),
            }
            for row in reasons_qs
        ]

        # ── Top 10 most-returned products ─────────────────────────────────────
        top_products_qs = (
            ReturnLine.objects.filter(
                return_record__tenant_id=tenant_id,
                return_record__created_at__gte=from_date,
                return_record__created_at__lte=to_date,
            )
            .values("variant__product_id")
            .annotate(
                returned_units=Sum("quantity"),
                returned_amount=Sum("line_refund_amount"),
            )
            .order_by("-returned_units")[:10]
        )

        product_ids = [row["variant__product_id"] for row in top_products_qs]
        product_names = {
            str(p.id): p.name
            for p in Product.objects.filter(id__in=product_ids).only("id", "name")
        }

        top_returned_products = [
            {
                "productId": str(row["variant__product_id"]),
                "productName": product_names.get(str(row["variant__product_id"]), ""),
                "returnedUnits": row["returned_units"] or 0,
                "returnedAmount": str(
                    (row["returned_amount"] or Decimal("0.00")).quantize(Decimal("0.01"))
                ),
            }
            for row in top_products_qs
        ]

        return _ok({
            "overall": {
                "totalRevenue": str(total_revenue.quantize(Decimal("0.01"))),
                "totalRefunds": str(total_refunds.quantize(Decimal("0.01"))),
                "returnCount": return_count,
                "returnRate": return_rate,
            },
            "byCategory": by_category,
            "byReason": by_reason,
            "topReturnedProducts": top_returned_products,
        })
