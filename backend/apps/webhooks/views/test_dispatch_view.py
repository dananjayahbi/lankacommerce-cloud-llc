import logging

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.webhooks.services.dispatch_service import dispatch_webhooks

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class WebhookTestDispatchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def post(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this account.", 400)

        event = request.data.get("event")
        payload = request.data.get("payload", {})

        if not event:
            return _error("missing_event", "event is required.", 400)

        count = dispatch_webhooks(tenant_id, event, payload)
        return _ok({"deliveries_count": count})
