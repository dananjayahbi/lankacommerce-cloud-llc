from decimal import Decimal
from datetime import timedelta

from django.db.models import OuterRef, Subquery, Max
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.catalog.models import ProductVariant
from apps.pos.models import SaleLine


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


class InventoryValuationView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        low_stock_only = request.query_params.get("low_stock_only", "false").lower() == "true"
        dead_stock_only = request.query_params.get("dead_stock_only", "false").lower() == "true"

        cutoff_date = now() - timedelta(days=90)

        # Subquery: last sale created_at for each variant
        last_sale_sub = (
            SaleLine.objects.filter(
                variant=OuterRef("pk"),
                sale__tenant_id=tenant_id,
                sale__status="COMPLETED",
            )
            .order_by()
            .values("variant")
            .annotate(last=Max("sale__created_at"))
            .values("last")
        )

        # Base queryset — "active" = not soft-deleted
        base_qs = (
            ProductVariant.objects.filter(
                tenant_id=tenant_id,
                deleted_at__isnull=True,
            )
            .select_related("product")
            .annotate(last_sale_at=Subquery(last_sale_sub))
        )

        # Summary from full unfiltered base
        summary_variants = list(base_qs.only(
            "id", "sku", "stock_quantity", "cost_price", "low_stock_threshold",
            "product__name",
        ))
        total_skus = len(summary_variants)
        total_units = sum(v.stock_quantity for v in summary_variants)
        total_stock_value = sum(
            v.cost_price * Decimal(v.stock_quantity)
            for v in summary_variants
            if v.cost_price is not None and v.stock_quantity
        )

        # Apply optional filters
        filtered_qs = base_qs
        if low_stock_only:
            # Cannot use F() comparison across two model fields in filter directly in all ORM versions
            # Use Python-level filter after fetching (dataset is manageable)
            pass  # will filter in python below
        if dead_stock_only:
            filtered_qs = filtered_qs.filter(
                last_sale_at__lt=cutoff_date
            )

        rows_raw = list(filtered_qs.select_related("product"))

        rows = []
        for v in rows_raw:
            last_sale_at = v.last_sale_at  # type: ignore[attr-defined]
            is_dead_stock = last_sale_at is None or last_sale_at < cutoff_date
            is_low_stock = v.stock_quantity <= v.low_stock_threshold

            if low_stock_only and not is_low_stock:
                continue

            size = v.size or ""
            colour = v.colour or ""
            variant_name = " / ".join(filter(None, [size, colour])) or v.sku

            stock_value = (v.cost_price * Decimal(v.stock_quantity)).quantize(Decimal("0.01"))

            rows.append({
                "variantId": str(v.id),
                "sku": v.sku,
                "productName": v.product.name,
                "variantName": variant_name,
                "stockQuantity": v.stock_quantity,
                "costPrice": str(v.cost_price.quantize(Decimal("0.01"))),
                "stockValue": str(stock_value),
                "lowStockThreshold": v.low_stock_threshold,
                "isLowStock": is_low_stock,
                "lastSaleDate": last_sale_at.isoformat() if last_sale_at else None,
                "isDeadStock": is_dead_stock,
            })

        return _ok({
            "summary": {
                "totalSkus": total_skus,
                "totalUnits": total_units,
                "totalStockValue": str(total_stock_value.quantize(Decimal("0.01"))),
            },
            "rows": rows,
        })
