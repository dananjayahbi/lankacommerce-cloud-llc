from decimal import Decimal
from datetime import datetime

from django.db.models import Sum, Count, F
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.pos.models import SaleLine, ReturnLine
from apps.catalog.models import ProductVariant


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class SalesByProductView(APIView):
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

        # ── Gross Sales per Variant ──────────────────────────────────────────
        gross_qs = (
            SaleLine.objects.filter(
                sale__tenant_id=tenant_id,
                sale__status="COMPLETED",
                sale__created_at__gte=from_date,
                sale__created_at__lte=to_date,
            )
            .values(
                "variant_id",
                "product_name_snapshot",
                "variant_description_snapshot",
                "sku",
            )
            .annotate(
                gross_revenue=Sum("line_total_after_discount"),
                units_sold=Sum("quantity"),
                sale_count=Count("id"),
            )
            .order_by("-gross_revenue")
        )

        # ── Returns per Variant ──────────────────────────────────────────────
        return_qs = (
            ReturnLine.objects.filter(
                return_record__tenant_id=tenant_id,
                return_record__created_at__gte=from_date,
                return_record__created_at__lte=to_date,
            )
            .values("variant_id")
            .annotate(
                returned_units=Sum("quantity"),
                refund_total=Sum("line_refund_amount"),
            )
        )
        returns_map: dict = {
            str(r["variant_id"]): r for r in return_qs
        }

        # ── Build rows ───────────────────────────────────────────────────────
        rows = []
        total_net_revenue = Decimal("0.00")
        for row in gross_qs:
            gross_rev = row["gross_revenue"] or Decimal("0.00")
            variant_id_str = str(row["variant_id"])
            ret = returns_map.get(variant_id_str, {})
            refund_total = ret.get("refund_total") or Decimal("0.00")
            returned_units = ret.get("returned_units") or 0
            net_rev = gross_rev - refund_total
            total_net_revenue += net_rev
            rows.append({
                "productVariantId": variant_id_str,
                "productName": row["product_name_snapshot"],
                "variantName": row["variant_description_snapshot"],
                "sku": row["sku"],
                "unitsSold": row["units_sold"],
                "grossRevenue": str(gross_rev.quantize(Decimal("0.01"))),
                "returns": str(refund_total.quantize(Decimal("0.01"))),
                "returnedUnits": returned_units,
                "netRevenue": str(net_rev.quantize(Decimal("0.01"))),
                "pctOfTotal": 0.0,
            })

        # ── Compute pctOfTotal ───────────────────────────────────────────────
        if total_net_revenue > Decimal("0"):
            for row in rows:
                pct = Decimal(row["netRevenue"]) / total_net_revenue * Decimal("100")
                row["pctOfTotal"] = round(float(pct), 2)

        return _ok({
            "rows": rows,
            "totalRevenue": str(total_net_revenue.quantize(Decimal("0.01"))),
        })
