"""Audit Log DRF views — read-only access for MANAGER and OWNER roles."""

from __future__ import annotations

import logging

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import IsManagerOrAbove
from apps.audit.services.audit_service import get_audit_logs

logger = logging.getLogger(__name__)


def _ok(data) -> Response:
    return Response({"success": True, "data": data})


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


class AuditLogListView(APIView):
    """
    GET /api/audit/logs/

    Returns a paginated, filterable list of AuditLog records for the
    authenticated user's tenant. Requires MANAGER or OWNER role.

    Query Parameters
    ----------------
    entity_type : string — filter by entity type (e.g. "sale", "customer").
    start_date  : ISO date string — filter created_at >= this date.
    end_date    : ISO date string — filter created_at <= this date.
    user_id     : UUID string — filter by the actor who performed the action.
    page        : integer, default 1.
    page_size   : integer, default 50, max 100.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        user = request.user

        if not IsManagerOrAbove().has_permission(request, self):
            return _error(
                "FORBIDDEN",
                "Only managers and owners can view audit logs.",
                403,
            )

        tenant_id = user.tenant_id

        params = request.query_params
        entity_type = params.get("entity_type") or None

        try:
            page = int(params.get("page", 1))
            page = max(1, page)
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = int(params.get("page_size", 50))
            page_size = min(max(1, page_size), 100)
        except (ValueError, TypeError):
            page_size = 50

        start_date = params.get("start_date") or None
        end_date = params.get("end_date") or None
        user_id_filter = params.get("user_id") or None

        result = get_audit_logs(
            tenant_id=tenant_id,
            entity_type=entity_type,
            start_date=start_date,
            end_date=end_date,
            user_id=user_id_filter,
            page=page,
            page_size=page_size,
        )

        return _ok(result["data"])
