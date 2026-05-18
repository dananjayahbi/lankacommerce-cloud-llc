from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.notifications.models import Notification


def _ok(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


def _serialize(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "notification_type": n.notification_type,
        "title": n.title,
        "body": n.body,
        "related_entity_type": n.related_entity_type,
        "related_entity_id": n.related_entity_id,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    }


class NotificationListView(APIView):
    """GET /api/notifications/ — list notifications for the authenticated user."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 100)
        include_read = request.query_params.get("include_read", "false").lower() == "true"

        qs = Notification.objects.filter(
            tenant_id=request.user.tenant_id,
            recipient_id=request.user.id,
        )
        if not include_read:
            qs = qs.filter(is_read=False)

        total_unread = Notification.objects.filter(
            tenant_id=request.user.tenant_id,
            recipient_id=request.user.id,
            is_read=False,
        ).count()

        notifications = [_serialize(n) for n in qs[:limit]]
        return _ok({"notifications": notifications, "total_unread": total_unread})


class MarkNotificationReadView(APIView):
    """PATCH /api/notifications/{id}/read/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        updated = Notification.objects.filter(
            id=pk,
            tenant_id=request.user.tenant_id,
            recipient_id=request.user.id,
        ).update(is_read=True)
        if not updated:
            return _error("NOT_FOUND", "Notification not found.", status.HTTP_404_NOT_FOUND)
        return _ok({"marked_read": True})


class MarkAllReadView(APIView):
    """PATCH /api/notifications/read-all/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        count = Notification.objects.filter(
            tenant_id=request.user.tenant_id,
            recipient_id=request.user.id,
            is_read=False,
        ).update(is_read=True)
        return _ok({"marked_count": count})
