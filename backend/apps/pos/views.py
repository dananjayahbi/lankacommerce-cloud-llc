"""
POS API views (sales and shifts).

All views enforce JWT authentication and RBAC via HasPermission.
Tenant ID is always sourced from request.user.tenant_id (from the
verified JWT) — never from request bodies.

Response envelope:
    Success → { "success": True,  "data": {...} }
    Error   → { "success": False, "error": { "code": "...", "message": "..." } }
"""

import logging

from django.conf import settings as django_settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.models import UserRole
from apps.accounts.permissions import HasPermission
from apps.catalog.exceptions import ConflictError, NotFoundError
from apps.core.exceptions import PermissionDeniedError
from apps.pos.serializers import (
    CloseShiftSerializer,
    CreateSaleSerializer,
    HoldSaleSerializer,
    InitiateReturnSerializer,
    OpenShiftSerializer,
    ReturnSerializer,
    SaleSerializer,
    ShiftSerializer,
)
from apps.pos.services import sale_service, shift_service
from apps.pos.services import return_service
from apps.pos.services.whatsapp_service import (
    WhatsAppReceiptPayload,
    send_whatsapp_receipt_message,
)
from apps.pos.utils.receipt_renderer import build_thermal_receipt_html
from apps.pos.utils.return_receipt_renderer import build_return_receipt_html
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# Response helpers
# ──────────────────────────────────────────────────────────────────

def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/sales/   POST /api/pos/sales/
# ──────────────────────────────────────────────────────────────────

class SaleListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_CREATE)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        params = request.query_params
        filters = {
            "shift_id": params.get("shift_id"),
            "cashier_id": params.get("cashier_id"),
            "status": params.get("status"),
            "from_date": params.get("from_date"),
            "to_date": params.get("to_date"),
            "page": params.get("page", 1),
            "limit": params.get("limit", 20),
        }
        sales, total = sale_service.get_sales(tenant_id, filters)
        return _ok(
            {
                "results": SaleSerializer(sales, many=True).data,
                "total": total,
                "page": int(filters["page"]),
                "limit": int(filters["limit"]),
            }
        )

    def post(self, request):
        tenant_id = request.user.tenant_id
        cashier_id = request.user.id
        serializer = CreateSaleSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data

        # ── Staleness check for offline-queued sales ──────────────
        queued_at = data.get("queued_at")
        if queued_at is not None:
            stale_hours = getattr(django_settings, "OFFLINE_SALE_STALE_HOURS", 4)
            if (timezone.now() - queued_at).total_seconds() > stale_hours * 3600:
                logger.warning(
                    "Stale offline sale rejected. tenant_id=%s cashier_id=%s "
                    "queued_at=%s",
                    tenant_id,
                    cashier_id,
                    queued_at,
                )
                return _error(
                    "STALE_PAYLOAD",
                    "This offline sale payload has expired and will not be processed. "
                    "Please contact your manager.",
                    status.HTTP_410_GONE,
                )

        try:
            sale = sale_service.create_sale(
                tenant_id=tenant_id,
                shift_id=data["shift_id"],
                cashier_id=cashier_id,
                lines=data["lines"],
                discount_amount=data["cart_discount_amount"],
                authorizing_manager_id=data.get("authorizing_manager_id"),
                payment_method=data["payment_method"],
                cash_received=data.get("cash_received"),
                card_amount=data.get("card_amount"),
                card_reference_number=data.get("card_reference_number"),
                linked_return_id=data.get("linked_return_id"),
            )
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok(SaleSerializer(sale).data, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/sales/{id}/
# ──────────────────────────────────────────────────────────────────

class SaleDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VIEW)]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            sale = sale_service.get_sale_by_id(tenant_id, id)
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        return _ok(SaleSerializer(sale).data)


# ──────────────────────────────────────────────────────────────────
# POST /api/pos/sales/{id}/void/
# ──────────────────────────────────────────────────────────────────

class SaleVoidView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VOID)]

    def post(self, request, id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        try:
            sale = sale_service.void_sale(tenant_id, id, actor_id)
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok(SaleSerializer(sale).data)


# ──────────────────────────────────────────────────────────────────
# POST /api/pos/sales/hold/
# ──────────────────────────────────────────────────────────────────

class SaleHoldView(APIView):
    """Create a held (OPEN) sale — no stock deduction, no payment_method."""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_CREATE)]

    def post(self, request):
        tenant_id = request.user.tenant_id
        cashier_id = request.user.id
        serializer = HoldSaleSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        try:
            sale = sale_service.hold_sale(
                tenant_id=tenant_id,
                shift_id=data["shift_id"],
                cashier_id=cashier_id,
                lines=data["lines"],
                discount_amount=data["cart_discount_amount"],
                authorizing_manager_id=data.get("authorizing_manager_id"),
            )
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok(SaleSerializer(sale).data, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/shifts/current/
# ──────────────────────────────────────────────────────────────────

class ShiftCurrentView(APIView):
    """Return the authenticated cashier's current OPEN shift, or null when none open."""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.POS_ACCESS)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        cashier_id = request.user.id
        shift = shift_service.get_current_shift(tenant_id, cashier_id)
        if shift is None:
            return _ok(None)
        return _ok(ShiftSerializer(shift).data)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/shifts/   POST /api/pos/shifts/
# ──────────────────────────────────────────────────────────────────

class ShiftListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.SHIFTS_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SHIFTS_CREATE)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        params = request.query_params
        filters = {
            "cashier_id": params.get("cashier_id"),
            "status": params.get("status"),
            "from_date": params.get("from_date"),
            "to_date": params.get("to_date"),
            "page": params.get("page", 1),
            "limit": params.get("limit", 20),
        }
        shifts, total = shift_service.get_shifts(tenant_id, filters)
        return _ok(
            {
                "results": ShiftSerializer(shifts, many=True).data,
                "total": total,
                "page": int(filters["page"]),
                "limit": int(filters["limit"]),
            }
        )

    def post(self, request):
        tenant_id = request.user.tenant_id
        cashier_id = request.user.id
        serializer = OpenShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        try:
            shift = shift_service.open_shift(
                tenant_id=tenant_id,
                cashier_id=cashier_id,
                opening_float=data["opening_float"],
            )
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok(ShiftSerializer(shift).data, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/shifts/{id}/
# ──────────────────────────────────────────────────────────────────

class ShiftDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SHIFTS_VIEW)]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            shift, summary = shift_service.get_shift_by_id(tenant_id, id)
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)

        # Cashiers may only view their own shifts.
        if (
            getattr(request.user, "role", None) == UserRole.CASHIER
            and str(shift.cashier_id) != str(request.user.id)
        ):
            return _error(
                "FORBIDDEN",
                "Cashiers may only view their own shifts.",
                status.HTTP_403_FORBIDDEN,
            )

        return _ok(
            {
                "shift": ShiftSerializer(shift).data,
                "summary": {
                    "completed_sales_count": summary.get("count") or 0,
                    "completed_sales_total": summary.get("total"),
                },
            }
        )


# ──────────────────────────────────────────────────────────────────
# POST /api/pos/shifts/{id}/close/
# ──────────────────────────────────────────────────────────────────

class ShiftCloseView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SHIFTS_CLOSE)]

    def post(self, request, id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = CloseShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )
        try:
            shift, _closure = shift_service.close_shift(
                tenant_id=tenant_id,
                shift_id=id,
                actor_id=actor_id,
                close_input=serializer.validated_data,
            )
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        except PermissionDeniedError as exc:
            return _error("FORBIDDEN", str(exc), status.HTTP_403_FORBIDDEN)
        return _ok(ShiftSerializer(shift).data)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/sales/{id}/receipt/
# ──────────────────────────────────────────────────────────────────

class SaleReceiptView(APIView):
    """Return a self-contained 80 mm thermal receipt HTML page.

    The browser opens this in a new tab. The embedded script calls
    ``window.print()`` automatically.
    """

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            sale = sale_service.get_sale_by_id(tenant_id, id)
        except NotFoundError:
            return HttpResponse(
                "<html><body><p>Receipt not found.</p></body></html>",
                content_type="text/html",
                status=404,
            )

        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return HttpResponse(
                "<html><body><p>Tenant not found.</p></body></html>",
                content_type="text/html",
                status=404,
            )

        cashier_name = (
            getattr(sale.cashier, "get_full_name", lambda: "")()
            or getattr(sale.cashier, "email", "Cashier")
        )
        html_string = build_thermal_receipt_html(sale, tenant, cashier_name)
        response = HttpResponse(html_string, content_type="text/html")
        response["Cache-Control"] = "no-store, no-cache"
        response["Content-Security-Policy"] = (
            "default-src 'none'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; "
            "script-src 'unsafe-inline'"
        )
        return response


# ──────────────────────────────────────────────────────────────────
# POST /api/pos/sales/{id}/send-receipt/
# ──────────────────────────────────────────────────────────────────

class SendReceiptView(APIView):
    """Dispatch a WhatsApp receipt to a customer phone number."""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated()]

    def post(self, request, id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id

        phone_number = request.data.get("phone_number", "").strip()
        if not phone_number or len(phone_number) < 7 or len(phone_number) > 20:
            return _error(
                "VALIDATION_ERROR",
                "phone_number must be between 7 and 20 characters.",
                status.HTTP_400_BAD_REQUEST,
            )

        try:
            sale = sale_service.get_sale_by_id(tenant_id, id)
        except NotFoundError:
            return _error("NOT_FOUND", "Sale not found.", status.HTTP_404_NOT_FOUND)

        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return _error("NOT_FOUND", "Tenant not found.", status.HTTP_404_NOT_FOUND)

        # Build item summary from first 3 sale lines
        lines_list = list(sale.lines.all()[:3])
        items_summary = ", ".join(
            ln.product_name_snapshot for ln in lines_list
        )

        payload = WhatsAppReceiptPayload(
            store_name=tenant.name,
            sale_reference=str(sale.id)[:8].upper(),
            items_summary=items_summary,
            total_amount=f"Rs. {sale.total_amount:,.2f}",
        )

        result = send_whatsapp_receipt_message(
            phone_number=phone_number,
            sale_id=str(sale.id),
            sale_data=payload,
        )

        if result["success"]:
            sale.whatsapp_receipt_sent_at = timezone.now()
            sale.save(update_fields=["whatsapp_receipt_sent_at"])
        else:
            # Write audit log on failure in production
            if not django_settings.DEBUG:
                try:
                    from apps.catalog.services.audit_service import log_audit_event
                    log_audit_event(
                        tenant_id=tenant_id,
                        actor_id=actor_id,
                        action="WHATSAPP_DISPATCH_FAILED",
                        resource_type="Sale",
                        resource_id=str(sale.id),
                        after={"error": result.get("error")},
                    )
                except Exception:
                    logger.exception(
                        "Failed to write audit log for WhatsApp dispatch failure. "
                        "sale_id=%s",
                        sale.id,
                    )

        # Always return HTTP 200 — error is surfaced in the response body
        return Response(
            {"success": result["success"], "error": result.get("error")},
            status=status.HTTP_200_OK,
        )


# ──────────────────────────────────────────────────────────────────
# POST /api/pos/returns/    GET /api/pos/returns/
# ──────────────────────────────────────────────────────────────────

class ReturnListCreateView(APIView):
    """
    POST — initiate a new return (requires SALES_REFUND + manager authorization).
    GET  — list returns for the tenant (requires SALES_VIEW).
    """

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_REFUND)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        params = request.query_params
        filters = {
            "original_sale_id": params.get("original_sale_id"),
            "initiated_by_id": params.get("initiated_by_id"),
            "refund_method": params.get("refund_method"),
            "from_date": params.get("from_date"),
            "to_date": params.get("to_date"),
            "page": params.get("page", 1),
            "limit": params.get("limit", 25),
        }
        result = return_service.get_returns(tenant_id, filters)
        return _ok(
            {
                "results": ReturnSerializer(result["data"], many=True).data,
                "total": result["total"],
                "page": result["page"],
                "limit": result["limit"],
            }
        )

    def post(self, request):
        tenant_id = request.user.tenant_id
        initiated_by_id = request.user.id

        serializer = InitiateReturnSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "VALIDATION_ERROR",
                str(serializer.errors),
                status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data

        # Verify the authorizing manager exists and has MANAGER or SUPER_ADMIN role
        from apps.accounts.models import CustomUser
        auth_manager_id = data["authorizing_manager_id"]
        try:
            manager = CustomUser.objects.get(id=auth_manager_id, tenant_id=tenant_id)
        except CustomUser.DoesNotExist:
            return _error(
                "NOT_FOUND",
                "Authorizing manager not found.",
                status.HTTP_404_NOT_FOUND,
            )
        if manager.role not in (UserRole.MANAGER, UserRole.SUPER_ADMIN):
            return _error(
                "FORBIDDEN",
                "Authorizing user must be a MANAGER or SUPER_ADMIN.",
                status.HTTP_403_FORBIDDEN,
            )

        try:
            return_record = return_service.initiate_return(
                tenant_id=tenant_id,
                input_data={
                    "initiated_by_id": initiated_by_id,
                    "authorized_by_id": auth_manager_id,
                    "original_sale_id": str(data["original_sale_id"]),
                    "lines": [
                        {
                            "sale_line_id": str(line["sale_line_id"]),
                            "quantity": line["quantity"],
                        }
                        for line in data["lines"]
                    ],
                    "refund_method": data["refund_method"],
                    "restock_items": data.get("restock_items", True),
                    "reason": data.get("reason", ""),
                    "card_reversal_reference": data.get("card_reversal_reference", ""),
                },
            )
        except ValueError as exc:
            return _error("VALIDATION_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Return initiation failed. tenant_id=%s", tenant_id)
            return _error(
                "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return _ok(ReturnSerializer(return_record).data, status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/returns/{id}/
# ──────────────────────────────────────────────────────────────────

class ReturnDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VIEW)]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            return_record = return_service.get_return_by_id(tenant_id, id)
        except Exception:
            return _error("NOT_FOUND", "Return not found.", status.HTTP_404_NOT_FOUND)
        return _ok(ReturnSerializer(return_record).data)


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/returns/{id}/receipt/
# ──────────────────────────────────────────────────────────────────

class ReturnReceiptView(APIView):
    """Return a self-contained 80 mm thermal return receipt HTML page."""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            return_record = return_service.get_return_by_id(tenant_id, id)
        except Exception:
            return HttpResponse(
                "<html><body><p>Return receipt not found.</p></body></html>",
                content_type="text/html",
                status=404,
            )

        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return HttpResponse(
                "<html><body><p>Tenant not found.</p></body></html>",
                content_type="text/html",
                status=404,
            )

        html_string = build_return_receipt_html(return_record, tenant)
        response = HttpResponse(html_string, content_type="text/html")
        response["Cache-Control"] = "no-store, no-cache"
        response["Content-Security-Policy"] = (
            "default-src 'none'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; "
            "script-src 'unsafe-inline'"
        )
        return response


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/shifts/{id}/z-report/
# ──────────────────────────────────────────────────────────────────

class ShiftZReportView(APIView):
    """Return aggregated Z-Report data for a closed (or open) shift."""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.SALES_VIEW)]

    def get(self, request, id):
        tenant_id = request.user.tenant_id
        try:
            z_data = shift_service.build_z_report_data(tenant_id, id)
        except Exception as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        return _ok(z_data)
