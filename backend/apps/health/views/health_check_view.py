import time

from django.db import connection
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Public health check endpoint — no authentication required."""

    authentication_classes = []
    permission_classes = []

    def get(self, request) -> Response:
        start = time.time()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            latency = round((time.time() - start) * 1000, 2)
            return Response(
                {
                    "status": "ok",
                    "latency_ms": latency,
                    "timestamp": timezone.now().isoformat(),
                }
            )
        except Exception as exc:
            return Response(
                {
                    "status": "error",
                    "latency_ms": None,
                    "error": str(exc),
                    "timestamp": timezone.now().isoformat(),
                },
                status=503,
            )
