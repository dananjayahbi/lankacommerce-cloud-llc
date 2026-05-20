"""DRF views for Purchase Order management."""
from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.crm.models import POStatus, PurchaseOrder
from apps.crm.serializers.purchase_order_serializer import (
    CreatePurchaseOrderSerializer,
    PurchaseOrderDetailSerializer,
    PurchaseOrderListSerializer,
    ReceivePOLinesSerializer,
    UpdatePOStatusSerializer,
)
from apps.crm.services import purchase_order_service
from apps.crm.utils.po_formatter import format_po_for_whatsapp
from apps.pos.services.whatsapp_service import send_whatsapp_text_message

logger = logging.getLogger(__name__)


def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status_code)


class PurchaseOrderListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id
        supplier_id = request.query_params.get("supplier_id")
        po_status = request.query_params.get("status")
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        page = int(request.query_params.get("page", 1))
        limit = int(request.query_params.get("limit", 20))

        result = purchase_order_service.get_pos(
            tenant_id,
            supplier_id=supplier_id,
            status=po_status,
            from_date=from_date,
            to_date=to_date,
            page=page,
            limit=limit,
        )

        serialized_pos = PurchaseOrderListSerializer(
            result["purchase_orders"], many=True
        ).data

        return _ok(
            {
                "purchase_orders": serialized_pos,
                "total": result["total"],
                "page": result["page"],
                "total_pages": result["total_pages"],
            }
        )

    def post(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id
        user_id = request.user.id

        serializer = CreatePurchaseOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        try:
            po = purchase_order_service.create_po(
                tenant_id,
                created_by_id=user_id,
                input_data=serializer.validated_data,
            )
        except ValueError as exc:
            return _error("VALIDATION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        except PermissionError as exc:
            return _error("PERMISSION_ERROR", str(exc), status.HTTP_403_FORBIDDEN)
        except Exception as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)

        return _ok(PurchaseOrderDetailSerializer(po).data, status.HTTP_201_CREATED)


class PurchaseOrderDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id
        try:
            po = purchase_order_service.get_po_by_id(tenant_id, id)
        except PurchaseOrder.DoesNotExist:
            return _error("NOT_FOUND", "Purchase order not found.", status.HTTP_404_NOT_FOUND)
        return _ok(PurchaseOrderDetailSerializer(po).data)

    def patch(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id
        serializer = UpdatePOStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        try:
            po = purchase_order_service.update_po_status(
                tenant_id, id, serializer.validated_data["status"]
            )
        except PurchaseOrder.DoesNotExist:
            return _error("NOT_FOUND", "Purchase order not found.", status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return _error("TRANSITION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)

        return _ok(PurchaseOrderDetailSerializer(po).data)


class PurchaseOrderReceiveView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id
        user_id = request.user.id

        serializer = ReceivePOLinesSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        try:
            result = purchase_order_service.receive_po_lines(
                tenant_id,
                id,
                received_lines=[
                    dict(entry) for entry in serializer.validated_data["received_lines"]
                ],
                actor_id=user_id,
            )
        except PurchaseOrder.DoesNotExist:
            return _error("NOT_FOUND", "Purchase order not found.", status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return _error("VALIDATION_ERROR", str(exc), status.HTTP_422_UNPROCESSABLE_ENTITY)

        return _ok(
            {
                "updated_po": PurchaseOrderDetailSerializer(result["updated_po"]).data,
                "cost_prices_changed": result["cost_prices_changed"],
            }
        )


class PurchaseOrderSendWhatsAppView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, id) -> Response:
        tenant_id = request.user.tenant_id

        try:
            po = purchase_order_service.get_po_by_id(tenant_id, id)
        except PurchaseOrder.DoesNotExist:
            return _error("NOT_FOUND", "Purchase order not found.", status.HTTP_404_NOT_FOUND)

        if po.status != POStatus.DRAFT:
            return _error(
                "INVALID_STATUS",
                f"Only DRAFT purchase orders can be sent. Current status: {po.status}",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not po.supplier.whatsapp_number:
            return _error(
                "NO_WHATSAPP_NUMBER",
                "Supplier has no WhatsApp number configured. Update the supplier record before sending.",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        message = format_po_for_whatsapp(po)
        logger.debug("Formatted PO WhatsApp message for PO %s (length: %d chars)", id, len(message))

        try:
            send_whatsapp_text_message(phone=po.supplier.whatsapp_number, message=message)
        except Exception as exc:
            logger.exception("WhatsApp send failed for PO %s: %s", id, str(exc))
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "WHATSAPP_SEND_FAILED",
                        "message": "WhatsApp send failed. Please try again or contact the supplier manually.",
                        "detail": str(exc),
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        updated_po = purchase_order_service.update_po_status(tenant_id, id, POStatus.SENT)
        return _ok(PurchaseOrderDetailSerializer(updated_po).data)
