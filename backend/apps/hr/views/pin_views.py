"""Staff PIN management DRF view."""
from __future__ import annotations

import logging
import re

from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.models import CustomUser, UserRole
from apps.accounts.permissions import HasPermission

# TODO(rate-limit): apply to PATCH /api/hr/staff/{id}/pin/ — limit to 5 attempts/min per IP.

logger = logging.getLogger(__name__)


def _ok(data, status_code: int = status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


class SetPINSerializer(drf_serializers.Serializer):
    new_pin = drf_serializers.CharField(max_length=8)

    def validate_new_pin(self, value: str) -> str:
        value = value.strip()
        if not re.match(r"^\d{4,8}$", value):
            raise drf_serializers.ValidationError("PIN must be 4 to 8 digits.")
        return value


class StaffPINView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STAFF_EDIT)]

    def patch(self, request: Request, id: str) -> Response:
        if request.user.role not in (UserRole.MANAGER, UserRole.OWNER):
            return _error(
                "FORBIDDEN",
                "Only Managers and Owners can update staff PINs.",
                status.HTTP_403_FORBIDDEN,
            )

        target_user = CustomUser.objects.filter(
            id=id, tenant_id=request.user.tenant_id
        ).first()
        if target_user is None:
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)

        serializer = SetPINSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )

        hashed = make_password(serializer.validated_data["new_pin"])
        target_user.pin_hash = hashed
        target_user.save(update_fields=["pin_hash"])

        logger.info(
            "PIN updated",
            extra={
                "staff_id": str(id),
                "authorized_by_id": str(request.user.id),
                "action": "pin_updated",
            },
        )

        return _ok(
            {
                "message": "PIN updated successfully.",
                "updated_at": timezone.now().isoformat(),
            }
        )
