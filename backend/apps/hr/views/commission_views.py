"""
Commission views: summary report, payout, and per-staff history.
"""

import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import HasPermission
from apps.accounts.constants.permissions import PERMISSIONS
from apps.hr.services.commission_service import (
    create_commission_payout,
    get_commission_summary_for_tenant,
    get_commissions_for_user,
    get_unpaid_total,
)
from apps.hr.models import CommissionRecord, CommissionPayout

User = get_user_model()
logger = logging.getLogger(__name__)


def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


class CommissionSummaryQuerySerializer(serializers.Serializer):
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()


class CommissionPayoutInputSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


def _serialize_commission_record(record):
    return {
        "id": str(record.id),
        "sale_id": str(record.sale_id),
        "base_amount": str(record.base_amount),
        "commission_rate": str(record.commission_rate),
        "earned_amount": str(record.earned_amount),
        "is_paid": record.is_paid,
        "is_credit": getattr(record, "is_credit", record.earned_amount >= Decimal("0")),
        "commission_payout_id": str(record.commission_payout_id) if record.commission_payout_id else None,
        "created_at": record.created_at.isoformat(),
    }


def _serialize_payout(payout):
    return {
        "id": str(payout.id),
        "user_id": str(payout.user_id),
        "period_start": payout.period_start.isoformat(),
        "period_end": payout.period_end.isoformat(),
        "total_earned": str(payout.total_earned),
        "authorized_by_id": str(payout.authorized_by_id),
        "created_at": payout.created_at.isoformat(),
    }


class CommissionSummaryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("MANAGER", "OWNER"):
            return _error("FORBIDDEN", "Only managers and owners can view commission reports.", status.HTTP_403_FORBIDDEN)

        query_serializer = CommissionSummaryQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(query_serializer.errors), status.HTTP_400_BAD_REQUEST)

        period_start = query_serializer.validated_data["period_start"]
        period_end = query_serializer.validated_data["period_end"]

        if period_start > period_end:
            return _error("VALIDATION_ERROR", "period_start must be before period_end.", status.HTTP_400_BAD_REQUEST)

        summary = get_commission_summary_for_tenant(request.user.tenant_id, period_start, period_end)

        serialized = []
        for item in summary:
            serialized.append({
                "user_id": str(item["user_id"]),
                "user_name": item["user_name"],
                "user_role": item["user_role"],
                "total_earned": str(item["total_earned"]),
                "unpaid_total": str(item["unpaid_total"]),
                "unpaid_count": item["unpaid_count"],
            })

        return _ok({
            "summary": serialized,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
        })


class CommissionPayoutView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("MANAGER", "OWNER"):
            return _error("FORBIDDEN", "Only managers and owners can process payouts.", status.HTTP_403_FORBIDDEN)

        body_serializer = CommissionPayoutInputSerializer(data=request.data)
        if not body_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(body_serializer.errors), status.HTTP_400_BAD_REQUEST)

        data = body_serializer.validated_data
        user_id = data["user_id"]
        period_start = data["period_start"]
        period_end = data["period_end"]

        target_user = User.objects.filter(id=user_id, tenant_id=request.user.tenant_id).first()
        if not target_user:
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)

        try:
            payout = create_commission_payout(
                tenant_id=request.user.tenant_id,
                user_id=user_id,
                period_start=period_start,
                period_end=period_end,
                authorized_by_id=request.user.id,
            )
        except ValueError as exc:
            return _error("NO_UNPAID_RECORDS", str(exc), status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Commission payout failed. tenant_id=%s", request.user.tenant_id)
            return _error("INTERNAL_ERROR", "An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)

        return _ok(_serialize_payout(payout), status.HTTP_201_CREATED)


class StaffCommissionDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        role = request.user.role
        if role in ("MANAGER", "OWNER"):
            pass  # can view any staff
        elif str(id) != str(request.user.id):
            return _error("FORBIDDEN", "You can only view your own commission history.", status.HTTP_403_FORBIDDEN)

        # Verify target user belongs to this tenant
        target = User.objects.filter(id=id, tenant_id=request.user.tenant_id).only("id").first()
        if not target:
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page_size = 20

        result = get_commissions_for_user(
            tenant_id=request.user.tenant_id,
            user_id=id,
            page=page,
            page_size=page_size,
        )
        unpaid = get_unpaid_total(tenant_id=request.user.tenant_id, user_id=id)

        # All-time total
        from django.db.models import Sum as _Sum
        total_all_time = (
            CommissionRecord.objects.filter(
                tenant_id=request.user.tenant_id, user_id=id
            ).aggregate(v=_Sum("earned_amount"))["v"]
            or Decimal("0.00")
        )

        return _ok({
            "records": [_serialize_commission_record(r) for r in result["records"]],
            "pagination": {
                "page": result["page"],
                "page_size": result["page_size"],
                "total_count": result["total_count"],
                "total_pages": result["total_pages"],
            },
            "unpaid_total": str(unpaid["total"]),
            "unpaid_count": unpaid["count"],
            "total_earned_all_time": str(total_all_time),
        })
