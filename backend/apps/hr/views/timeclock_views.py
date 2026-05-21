"""
Time clock DRF views.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.hr.models import TimeClock
from apps.hr.services.timeclock_service import (
    AlreadyClockedInError,
    NotClockedInError,
    clock_in_for_user,
    clock_out_for_user,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


def _serialize_time_clock(record, duration_minutes=None):
    data = {
        "id": str(record.id),
        "user_id": str(record.user_id),
        "tenant_id": str(record.tenant_id),
        "clocked_in_at": record.clocked_in_at.isoformat(),
        "clocked_out_at": record.clocked_out_at.isoformat() if record.clocked_out_at else None,
        "shift_id": str(record.shift_id) if record.shift_id else None,
        "notes": record.notes,
    }
    if duration_minutes is not None:
        data["duration_minutes"] = duration_minutes
    elif record.clocked_out_at:
        data["duration_minutes"] = int(
            (record.clocked_out_at - record.clocked_in_at).total_seconds() / 60
        )
    else:
        data["duration_minutes"] = None
    return data


class ClockInInputSerializer(serializers.Serializer):
    shift_id = serializers.UUIDField(required=False, allow_null=True)


class ClockOutInputSerializer(serializers.Serializer):
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class TimeClockPatchSerializer(serializers.Serializer):
    clocked_out_at = serializers.DateTimeField()
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class ClockInView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        body_serializer = ClockInInputSerializer(data=request.data)
        if not body_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(body_serializer.errors), status.HTTP_400_BAD_REQUEST)

        shift_id = body_serializer.validated_data.get("shift_id")

        try:
            time_clock = clock_in_for_user(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
                shift_id=shift_id,
            )
        except AlreadyClockedInError as exc:
            return _error("ALREADY_CLOCKED_IN", str(exc), status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception("Clock-in failed. user_id=%s", request.user.id)
            return _error("INTERNAL_ERROR", "An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)

        return _ok(
            {
                "time_clock": _serialize_time_clock(time_clock),
                "clocked_in_at": time_clock.clocked_in_at.isoformat(),
            },
            status.HTTP_201_CREATED,
        )


class ClockOutView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        body_serializer = ClockOutInputSerializer(data=request.data)
        if not body_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(body_serializer.errors), status.HTTP_400_BAD_REQUEST)

        notes = body_serializer.validated_data.get("notes", "")

        try:
            time_clock, duration_minutes = clock_out_for_user(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
                notes=notes,
            )
        except NotClockedInError as exc:
            return _error("NOT_CLOCKED_IN", str(exc), status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception("Clock-out failed. user_id=%s", request.user.id)
            return _error("INTERNAL_ERROR", "An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)

        return _ok(
            {
                "time_clock": _serialize_time_clock(time_clock, duration_minutes),
                "duration_minutes": duration_minutes,
            }
        )


class TimeClockHistoryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requesting_user = request.user
        raw_user_id = request.query_params.get("user_id")

        if raw_user_id:
            target_user_id = raw_user_id
            if str(target_user_id) != str(requesting_user.id):
                if requesting_user.role not in ("MANAGER", "OWNER"):
                    return _error("FORBIDDEN", "You can only view your own time clock history.", status.HTTP_403_FORBIDDEN)
        else:
            target_user_id = requesting_user.id

        # Verify target user belongs to this tenant
        if not User.objects.filter(id=target_user_id, tenant_id=requesting_user.tenant_id).exists():
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page_size = 20

        qs = (
            TimeClock.objects.filter(
                tenant_id=requesting_user.tenant_id,
                user_id=target_user_id,
            )
            .select_related("shift")
            .order_by("-clocked_in_at")
        )

        total_count = qs.count()
        import math
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        offset = (page - 1) * page_size
        records = list(qs[offset : offset + page_size])

        # Compute weekly/monthly aggregates
        now = timezone.now()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        def _sum_minutes(start_from):
            recs = TimeClock.objects.filter(
                user_id=target_user_id,
                clocked_in_at__gte=start_from,
                clocked_out_at__isnull=False,
            ).only("clocked_in_at", "clocked_out_at")
            total_secs = sum(
                (r.clocked_out_at - r.clocked_in_at).total_seconds() for r in recs
            )
            return round(total_secs / 3600, 1)  # hours

        total_hours_this_week = _sum_minutes(start_of_week)
        total_hours_this_month = _sum_minutes(start_of_month)

        serialized = []
        for r in records:
            item = _serialize_time_clock(r)
            item["shift_reference"] = str(r.shift_id) if r.shift_id else None
            serialized.append(item)

        return _ok({
            "records": serialized,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
            },
            "total_hours_this_week": total_hours_this_week,
            "total_hours_this_month": total_hours_this_month,
        })


class TimeClockDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        if request.user.role not in ("MANAGER", "OWNER"):
            return _error("FORBIDDEN", "Only managers and owners can close time clock sessions.", status.HTTP_403_FORBIDDEN)

        try:
            record = TimeClock.objects.get(id=id, tenant_id=request.user.tenant_id)
        except TimeClock.DoesNotExist:
            return _error("NOT_FOUND", "Time clock record not found.", status.HTTP_404_NOT_FOUND)

        patch_serializer = TimeClockPatchSerializer(data=request.data)
        if not patch_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(patch_serializer.errors), status.HTTP_400_BAD_REQUEST)

        clocked_out_at = patch_serializer.validated_data["clocked_out_at"]
        notes = patch_serializer.validated_data.get("notes", record.notes)

        if clocked_out_at < record.clocked_in_at:
            return _error("VALIDATION_ERROR", "clocked_out_at must not be before clocked_in_at.", status.HTTP_400_BAD_REQUEST)

        record.clocked_out_at = clocked_out_at
        record.notes = notes
        record.save(update_fields=["clocked_out_at", "notes"])

        # Sync denormalised user state if the open session is closed
        User.objects.filter(id=record.user_id, clocked_in_at__isnull=False).update(clocked_in_at=None)

        return _ok(_serialize_time_clock(record))
