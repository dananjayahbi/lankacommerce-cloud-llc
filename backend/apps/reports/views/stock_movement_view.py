from decimal import Decimal
from datetime import datetime
from math import ceil

from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.catalog.models import StockMovement


def _ok(data):
    from rest_framework.response import Response
    return Response({"success": True, "data": data})


def _error(msg, status=400):
    from rest_framework.response import Response
    return Response({"success": False, "error": msg}, status=status)


PAGE_SIZE = 50


class StockMovementView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):
        tenant_id = request.user.tenant_id
        from_date_str = request.query_params.get("from_date")
        to_date_str = request.query_params.get("to_date")
        variant_search = request.query_params.get("variant_search", "").strip()
        reason_filter = request.query_params.get("reason", "").strip()
        try:
            page = max(1, int(request.query_params.get("page", "1")))
        except (ValueError, TypeError):
            page = 1

        if not from_date_str or not to_date_str:
            return _error("from_date and to_date are required.", 400)

        try:
            from_date = datetime.fromisoformat(from_date_str.replace("Z", "+00:00"))
            to_date = datetime.fromisoformat(to_date_str.replace("Z", "+00:00"))
        except ValueError:
            return _error("Invalid date format. Use ISO 8601.", 400)

        base_filter = dict(
            tenant_id=tenant_id,
            created_at__gte=from_date,
            created_at__lte=to_date,
        )

        # ── Summary by reason (unfiltered except date/tenant) ─────────────────
        summary_qs = (
            StockMovement.objects.filter(**base_filter)
            .values("reason")
            .annotate(total_delta=Sum("quantity_delta"), count=Count("id"))
            .order_by("reason")
        )
        summary = [
            {
                "reason": row["reason"],
                "totalDelta": row["total_delta"] or 0,
                "count": row["count"],
            }
            for row in summary_qs
        ]

        # ── Filtered query ────────────────────────────────────────────────────
        movements = (
            StockMovement.objects.filter(**base_filter)
            .select_related("variant__product", "actor")
            .order_by("-created_at")
        )

        if variant_search:
            movements = movements.filter(
                Q(variant__sku__icontains=variant_search)
                | Q(variant__product__name__icontains=variant_search)
            )

        if reason_filter:
            movements = movements.filter(reason=reason_filter)

        # ── Pagination ────────────────────────────────────────────────────────
        total_count = movements.count()
        total_pages = max(1, ceil(total_count / PAGE_SIZE))
        page = min(page, total_pages)
        offset = (page - 1) * PAGE_SIZE

        rows_qs = movements[offset: offset + PAGE_SIZE]

        results = []
        for m in rows_qs:
            v = m.variant
            size = v.size or ""
            colour = v.colour or ""
            variant_name = " / ".join(filter(None, [size, colour])) or v.sku

            actor = m.actor
            actor_name = ""
            if actor:
                actor_name = f"{actor.first_name} {actor.last_name}".strip() or actor.email

            reference = None
            if m.sale_id:
                reference = str(m.sale_id)
            elif m.purchase_order_id:
                reference = str(m.purchase_order_id)
            elif m.stock_take_session_id:
                reference = str(m.stock_take_session_id)

            results.append({
                "id": str(m.id),
                "createdAt": m.created_at.isoformat(),
                "productName": v.product.name,
                "variantName": variant_name,
                "sku": v.sku,
                "reason": m.reason,
                "quantityDelta": m.quantity_delta,
                "quantityBefore": m.quantity_before,
                "quantityAfter": m.quantity_after,
                "actorName": actor_name,
                "note": m.note or "",
                "reference": reference,
            })

        return _ok({
            "summary": summary,
            "results": results,
            "pagination": {
                "page": page,
                "pageSize": PAGE_SIZE,
                "totalPages": total_pages,
                "totalCount": total_count,
            },
        })
