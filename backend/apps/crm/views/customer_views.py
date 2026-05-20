"""Customer DRF views for CRM API."""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.permissions import HasPermission
from apps.crm.models import Customer
from apps.crm.serializers.customer_serializer import (
    CreateCustomerSerializer,
    CustomerOutputSerializer,
    UpdateCustomerSerializer,
)
from apps.crm.services import customer_service

logger = logging.getLogger(__name__)


def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status_code)


# ──────────────────────────────────────────────────────────────────
# GET/POST  /api/crm/customers/
# ──────────────────────────────────────────────────────────────────


class CustomerListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_CREATE)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_VIEW)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        params = request.query_params
        result = customer_service.get_customers(
            tenant_id=tenant_id,
            search=params.get("search") or None,
            tag=params.get("tag") or None,
            spend_min=params.get("spend_min") or None,
            spend_max=params.get("spend_max") or None,
            page=int(params.get("page", 1)),
            limit=int(params.get("limit", 20)),
        )
        customers_data = CustomerOutputSerializer(result["customers"], many=True).data
        return _ok({
            "customers": customers_data,
            "total": result["total"],
            "page": result["page"],
            "total_pages": result["total_pages"],
        })

    def post(self, request):
        tenant_id = request.user.tenant_id
        serializer = CreateCustomerSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            customer = customer_service.create_customer(tenant_id, serializer.validated_data)
        except ValueError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception("create_customer failed. tenant_id=%s", tenant_id)
            return _error("INTERNAL_ERROR", "An unexpected error occurred.", status.HTTP_500_INTERNAL_SERVER_ERROR)
        return _ok(CustomerOutputSerializer(customer).data, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET/PATCH/DELETE  /api/crm/customers/{id}/
# ──────────────────────────────────────────────────────────────────


class CustomerDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_EDIT)]
        if self.request.method == "DELETE":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_DELETE)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_VIEW)]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            customer = customer_service.get_customer_by_id(tenant_id, id)
        except Customer.DoesNotExist:
            return _error("NOT_FOUND", "Customer not found.", status.HTTP_404_NOT_FOUND)
        data = CustomerOutputSerializer(customer).data
        data["visit_count"] = getattr(customer, "visit_count", 0)
        data["avg_order_value"] = str(getattr(customer, "avg_order_value", "0.00"))
        return _ok(data)

    def patch(self, request, id):
        tenant_id = request.user.tenant_id
        serializer = UpdateCustomerSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            customer = customer_service.update_customer(tenant_id, id, serializer.validated_data)
        except Customer.DoesNotExist:
            return _error("NOT_FOUND", "Customer not found.", status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok(CustomerOutputSerializer(customer).data)

    def delete(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            customer_service.soft_delete_customer(tenant_id, id)
        except Customer.DoesNotExist:
            return _error("NOT_FOUND", "Customer not found.", status.HTTP_404_NOT_FOUND)
        return _ok({"deleted": True})
