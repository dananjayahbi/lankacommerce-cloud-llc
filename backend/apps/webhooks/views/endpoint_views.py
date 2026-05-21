import logging

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.webhooks.models import WebhookEndpoint
from apps.webhooks.serializers import (
    WebhookEndpointCreateSerializer,
    WebhookEndpointDetailSerializer,
    WebhookEndpointListSerializer,
)

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class WebhookEndpointListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this account.", 400)

        endpoints = WebhookEndpoint.objects.filter(tenant_id=tenant_id)
        return _ok(WebhookEndpointListSerializer(endpoints, many=True).data)

    def post(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this account.", 400)

        serializer = WebhookEndpointCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("validation_error", serializer.errors, 400)

        from apps.tenants.models import Tenant

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return _error("tenant_not_found", "Tenant not found.", 404)

        endpoint = WebhookEndpoint.objects.create(
            tenant=tenant,
            url=serializer.validated_data["url"],
            events=serializer.validated_data["events"],
        )

        # Return detail (including secret) on creation — this is the only time secret is shown
        return _ok(WebhookEndpointDetailSerializer(endpoint).data, status=201)


class WebhookEndpointDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def _get_endpoint(self, request: Request, pk: int):
        tenant_id = getattr(request.user, "tenant_id", None)
        try:
            return WebhookEndpoint.objects.get(id=pk, tenant_id=tenant_id)
        except WebhookEndpoint.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        endpoint = self._get_endpoint(request, pk)
        if not endpoint:
            return _error("not_found", "Webhook endpoint not found.", 404)

        return _ok(WebhookEndpointListSerializer(endpoint).data)

    def delete(self, request: Request, pk: int) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        endpoint = self._get_endpoint(request, pk)
        if not endpoint:
            return _error("not_found", "Webhook endpoint not found.", 404)

        endpoint.delete()
        return _ok({"deleted": True})
