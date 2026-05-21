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
from decimal import Decimal
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.db.models import Sum
from rest_framework import serializers as drf_serializers

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.models import UserRole
from apps.accounts.permissions import HasPermission, IsManagerOrAbove
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
from apps.hr.services.commission_service import (
    create_commission_record,
    create_negative_commission_record,
)

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

        # ── CRM: pre-flight credit check (outside atomic block) ───
        customer_id = data.get("customer_id")
        requested_credit = data.get("applied_store_credit", Decimal("0.00"))
        valid_credit = Decimal("0.00")
        if customer_id is not None and requested_credit > Decimal("0.00"):
            try:
                from apps.crm.services import customer_service as _cs
                credit_result = _cs.apply_credit_to_cart(
                    tenant_id, customer_id, requested_credit
                )
                valid_credit = credit_result["valid_amount"]
            except Exception:
                valid_credit = Decimal("0.00")

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
                customer_id=customer_id,
                applied_store_credit=valid_credit,
                applied_promotions=data.get("applied_promotions", []),
            )
        except NotFoundError as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)

        # ── Commission side-effect (must not roll back the sale) ───
        from django.contrib.auth import get_user_model
        _User = get_user_model()
        _cashier_data = (
            _User.objects.filter(id=cashier_id).values("commission_rate").first()
        )
        _commission_rate = (
            _cashier_data["commission_rate"] if _cashier_data else None
        )
        try:
            if _commission_rate is not None:
                create_commission_record(
                    tenant_id=sale.tenant_id,
                    sale_id=sale.id,
                    user_id=cashier_id,
                    base_amount=sale.total_amount,
                    commission_rate=_commission_rate,
                )
        except Exception as _exc:
            logger.warning(
                "Commission record creation failed for sale %s: %s",
                sale.id,
                str(_exc),
            )

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

        # ── Optional auto clock-in side-effect ──────────────────────
        if data.get("auto_clock_in", False):
            try:
                from apps.hr.services.timeclock_service import (
                    clock_in_for_user,
                    AlreadyClockedInError,
                )
                clock_in_for_user(
                    tenant_id=tenant_id,
                    user_id=cashier_id,
                    shift_id=shift.id,
                )
            except AlreadyClockedInError:
                logger.debug(
                    "auto_clock_in skipped — user already clocked in. user_id=%s shift_id=%s",
                    cashier_id,
                    shift.id,
                )
            except Exception:
                logger.warning(
                    "auto_clock_in failed for shift %s user %s",
                    shift.id,
                    cashier_id,
                )

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

        # ── Commission reversal side-effect ────────────────────────
        try:
            create_negative_commission_record(return_record.id)
        except Exception as _exc:
            logger.warning(
                "Commission reversal failed for return %s: %s",
                return_record.id,
                str(_exc),
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


# ══════════════════════════════════════════════════════════════════
# EXPENSE VIEWS
# ══════════════════════════════════════════════════════════════════


# ──────────────────────────────────────────────────────────────────
# GET/POST /api/pos/expenses/
# ──────────────────────────────────────────────────────────────────

class _CreateExpenseSerializer(drf_serializers.Serializer):
    from apps.pos.models import ExpenseCategory as _EC
    category = drf_serializers.ChoiceField(choices=_EC.choices)
    amount = drf_serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01")
    )
    description = drf_serializers.CharField(max_length=1000)
    expense_date = drf_serializers.DateField()
    receipt_image_url = drf_serializers.URLField(required=False, allow_blank=True, allow_null=True)


class _UpdateExpenseSerializer(drf_serializers.Serializer):
    from apps.pos.models import ExpenseCategory as _EC
    category = drf_serializers.ChoiceField(choices=_EC.choices, required=False)
    amount = drf_serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    description = drf_serializers.CharField(max_length=1000, required=False)
    expense_date = drf_serializers.DateField(required=False)
    receipt_image_url = drf_serializers.URLField(required=False, allow_blank=True, allow_null=True)


def _serialize_expense(expense):
    return {
        "id": str(expense.id),
        "category": expense.category,
        "amount": str(expense.amount),
        "description": expense.description,
        "receipt_image_url": expense.receipt_image_url,
        "expense_date": str(expense.expense_date),
        "recorded_by": {
            "user_id": str(expense.recorded_by_id),
            "name": expense.recorded_by.get_full_name() or expense.recorded_by.email,
            "email": expense.recorded_by.email,
        },
        "created_at": expense.created_at.isoformat(),
    }


class ExpenseListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)

        from apps.pos.models import Expense
        category = request.query_params.get("category")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20

        qs = Expense.objects.filter(
            tenant_id=request.user.tenant_id
        ).select_related("recorded_by").order_by("-expense_date", "-created_at")

        if category:
            qs = qs.filter(category=category)
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)

        total_amount = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        total_count = qs.count()
        total_pages = max(1, (total_count + page_size - 1) // page_size)
        offset = (page - 1) * page_size
        expenses = list(qs[offset : offset + page_size])

        return _ok({
            "expenses": [_serialize_expense(e) for e in expenses],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
            },
            "total_amount": str(total_amount),
        })

    def post(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)

        serializer = _CreateExpenseSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        from apps.pos.models import Expense
        data = serializer.validated_data
        expense = Expense.objects.create(
            tenant_id=request.user.tenant_id,
            recorded_by_id=request.user.user_id,
            **data,
        )
        expense.refresh_from_db()
        expense_data = Expense.objects.select_related("recorded_by").get(pk=expense.pk)
        return _ok(_serialize_expense(expense_data), status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────
# GET/PATCH /api/pos/expenses/{id}/
# ──────────────────────────────────────────────────────────────────

class ExpenseDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_expense(self, request, id):
        from apps.pos.models import Expense
        try:
            return Expense.objects.select_related("recorded_by").get(
                id=id, tenant_id=request.user.tenant_id
            )
        except Expense.DoesNotExist:
            return None

    def get(self, request, id):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)
        expense = self._get_expense(request, id)
        if expense is None:
            return _error("NOT_FOUND", "Expense not found.", status.HTTP_404_NOT_FOUND)
        return _ok(_serialize_expense(expense))

    def patch(self, request, id):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)
        expense = self._get_expense(request, id)
        if expense is None:
            return _error("NOT_FOUND", "Expense not found.", status.HTTP_404_NOT_FOUND)

        serializer = _UpdateExpenseSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        from apps.pos.models import Expense
        Expense.objects.filter(id=id, tenant_id=request.user.tenant_id).update(
            **serializer.validated_data
        )
        updated = Expense.objects.select_related("recorded_by").get(pk=id)
        return _ok(_serialize_expense(updated))


# ──────────────────────────────────────────────────────────────────
# GET /api/pos/expenses/upload-url/
# ──────────────────────────────────────────────────────────────────

class ExpenseReceiptUploadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)

        file_name = request.query_params.get("file_name", "").strip()
        mime_type = request.query_params.get("mime_type", "").strip()

        if not file_name or not mime_type:
            return _error("VALIDATION_ERROR", "file_name and mime_type are required.", status.HTTP_400_BAD_REQUEST)

        allowed_types = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
        if mime_type not in allowed_types:
            return _error(
                "UNSUPPORTED_MEDIA_TYPE",
                "Only JPEG, PNG, and WebP images are supported.",
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        from django.conf import settings as django_settings
        bucket = getattr(django_settings, "AWS_S3_BUCKET", None)
        if not bucket:
            return Response(
                {"success": False, "error": {"code": "UPLOAD_NOT_CONFIGURED", "message": "Receipt upload is not configured in this environment."}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from uuid import uuid4
        import boto3
        ext = allowed_types[mime_type]
        key = f"receipts/{request.user.tenant_id}/{uuid4()}.{ext}"
        region = getattr(django_settings, "AWS_S3_REGION", "us-east-1")
        s3_client = boto3.client("s3", region_name=region)
        upload_url = s3_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": mime_type},
            ExpiresIn=300,
        )
        custom_domain = getattr(django_settings, "AWS_S3_CUSTOM_DOMAIN", None)
        if custom_domain:
            object_url = f"https://{custom_domain}/{key}"
        else:
            object_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"

        return _ok({"upload_url": upload_url, "object_url": object_url})


# ══════════════════════════════════════════════════════════════════
# CASH FLOW VIEW
# ══════════════════════════════════════════════════════════════════

class _CashFlowQuerySerializer(drf_serializers.Serializer):
    date_from = drf_serializers.DateField()
    date_to = drf_serializers.DateField()

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise drf_serializers.ValidationError("date_from must not be after date_to.")
        return attrs


class CashFlowView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count
        from apps.pos.models import Sale, Return, Payment, Expense, CashMovement

        if not IsManagerOrAbove().has_permission(request, self):
            return _error("PERMISSION_DENIED", "Managers or above only.", status.HTTP_403_FORBIDDEN)

        serializer = _CashFlowQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        date_from = data["date_from"]
        date_to = data["date_to"]
        tenant_id = request.user.tenant_id

        # Income
        gross_sales = (
            Sale.objects.filter(
                tenant_id=tenant_id,
                status="COMPLETED",
                completed_at__date__gte=date_from,
                completed_at__date__lte=date_to,
            ).aggregate(gross=Sum("total_amount"))["gross"] or Decimal("0.00")
        )
        total_refunds = (
            Return.objects.filter(
                tenant_id=tenant_id,
                created_at__date__gte=date_from,
                created_at__date__lte=date_to,
            ).aggregate(refunds=Sum("refund_amount"))["refunds"] or Decimal("0.00")
        )
        total_income = gross_sales - total_refunds

        payment_breakdown_qs = Payment.objects.filter(
            sale__tenant_id=tenant_id,
            sale__status="COMPLETED",
            sale__completed_at__date__gte=date_from,
            sale__completed_at__date__lte=date_to,
        ).values("method").annotate(total=Sum("amount"))
        payment_breakdown_dict = {row["method"]: str(row["total"]) for row in payment_breakdown_qs}

        # Expenses
        expense_breakdown_qs = Expense.objects.filter(
            tenant_id=tenant_id,
            expense_date__gte=date_from,
            expense_date__lte=date_to,
        ).values("category").annotate(total=Sum("amount"))
        expense_breakdown_list = [
            {"category": row["category"], "total": str(row["total"])} for row in expense_breakdown_qs
        ]
        total_expenses = sum(
            (Decimal(row["total"]) for row in expense_breakdown_list), Decimal("0.00")
        )

        # Cash Movements
        movement_qs = CashMovement.objects.filter(
            tenant_id=tenant_id,
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        ).values("type").annotate(total=Sum("amount"), count=Count("id"))
        movement_breakdown_dict = {
            row["type"]: {"total": str(row["total"]), "count": row["count"]}
            for row in movement_qs
        }

        def _mov(t):
            return Decimal(str(movement_breakdown_dict.get(t, {}).get("total", "0") or "0"))

        manual_in = _mov("MANUAL_IN")
        opening_float = _mov("OPENING_FLOAT")
        petty_cash_out = _mov("PETTY_CASH_OUT")
        manual_out = _mov("MANUAL_OUT")
        net_movement = manual_in + opening_float - petty_cash_out - manual_out
        net_cash_flow = total_income - total_expenses + net_movement

        return _ok({
            "period": {"date_from": str(date_from), "date_to": str(date_to)},
            "income": {
                "gross_sales": str(gross_sales),
                "total_refunds": str(total_refunds),
                "net_income": str(total_income),
                "payment_breakdown": payment_breakdown_dict,
            },
            "expenses": {
                "total": str(total_expenses),
                "by_category": expense_breakdown_list,
            },
            "cash_movements": {
                "by_type": movement_breakdown_dict,
                "net_movement": str(net_movement),
            },
            "net_cash_flow": str(net_cash_flow),
        })
