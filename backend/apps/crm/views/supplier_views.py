"""Supplier DRF views."""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import HasPermission
from apps.accounts.constants.permissions import PERMISSIONS
from apps.crm.models import Supplier
from apps.crm.serializers.supplier_serializer import (
    CreateSupplierSerializer,
    UpdateSupplierSerializer,
    SupplierOutputSerializer,
)
from apps.crm.services import supplier_service


def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status_code)


class SupplierListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.SUPPLIERS_CREATE)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SUPPLIERS_VIEW)]

    def get(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id
        search = request.query_params.get("search", "").strip() or None
        include_archived = request.query_params.get("include_archived", "").lower() in ("1", "true")
        page = int(request.query_params.get("page", 1))
        limit = int(request.query_params.get("limit", 20))
        result = supplier_service.get_suppliers(
            tenant_id, search=search, include_archived=include_archived, page=page, limit=limit
        )
        return _ok(
            {
                "results": SupplierOutputSerializer(result["suppliers"], many=True).data,
                "total": result["total"],
                "page": result["page"],
                "total_pages": result["total_pages"],
            }
        )

    def post(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id
        serializer = CreateSupplierSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            supplier = supplier_service.create_supplier(tenant_id, serializer.validated_data.copy())
        except ValueError as exc:
            return _error("VALIDATION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        return _ok(SupplierOutputSerializer(supplier).data, status.HTTP_201_CREATED)


class SupplierDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SUPPLIERS_EDIT)]

    def patch(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id
        serializer = UpdateSupplierSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            supplier = supplier_service.update_supplier(tenant_id, id, serializer.validated_data.copy())
        except Supplier.DoesNotExist:
            return _error("NOT_FOUND", "Supplier not found.", status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return _error("VALIDATION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        return _ok(SupplierOutputSerializer(supplier).data)


class SupplierArchiveView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SUPPLIERS_EDIT)]

    def patch(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id
        try:
            supplier_service.archive_supplier(tenant_id, id)
        except Supplier.DoesNotExist:
            return _error("NOT_FOUND", "Supplier not found.", status.HTTP_404_NOT_FOUND)
        return _ok({"archived": True})
