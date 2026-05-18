import platform
import sys
import time

import django
from django.db import connection
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """
    Public health check endpoint — no authentication required.
    Returns database connectivity, version info, and current timestamp.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        from datetime import datetime, timezone

        # Database ping
        db_status = "connected"
        db_latency_ms: int | None = None

        try:
            start = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_latency_ms = int((time.perf_counter() - start) * 1000)
        except Exception:
            db_status = "unreachable"

        overall_status = "healthy" if db_status == "connected" else "degraded"

        payload = {
            "status": overall_status,
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
            },
            "django_version": ".".join(str(v) for v in django.VERSION[:3]),
            "python_version": platform.python_version(),
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

        http_status = 200 if overall_status == "healthy" else 503
        return Response(payload, status=http_status)


class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, "role", None) == "SUPER_ADMIN"


class AuditLogListView(APIView):
    """Returns recent audit log entries (SUPER_ADMIN only)."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.accounts.models import AuditLog

        limit = min(int(request.query_params.get("limit", 20)), 100)
        entries = (
            AuditLog.objects.order_by("-created_at")[:limit]
            .values(
                "id",
                "actor_id",
                "action",
                "entity_type",
                "entity_id",
                "created_at",
            )
        )
        result = []
        for e in entries:
            e["id"] = str(e["id"]) if e["id"] else None
            e["actor_id"] = str(e["actor_id"]) if e["actor_id"] else None
            e["entity_id"] = str(e["entity_id"]) if e["entity_id"] else None
            result.append(e)

        return Response(result)
