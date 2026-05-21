import logging

from django.shortcuts import get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import Invoice, InvoiceStatus

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class InvoicePDFView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request, id) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        invoice = get_object_or_404(Invoice, id=id, tenant_id=tenant_id)

        if invoice.status != InvoiceStatus.PAID:
            return _error("invoice_not_paid", "PDF is only available for paid invoices.", 400)

        pdf_data = {
            "invoice_number": invoice.invoice_number,
            "store_name": invoice.tenant.name,
            "store_address": getattr(invoice.tenant, "address", ""),
            "customer_name": invoice.tenant.name,
            "amount": str(invoice.amount),
            "billing_period_start": invoice.billing_period_start.isoformat(),
            "billing_period_end": invoice.billing_period_end.isoformat(),
            "due_date": invoice.due_date.isoformat(),
            "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
            "plan_name": invoice.subscription.plan.name,
        }
        return _ok(pdf_data)


class InvoiceListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        invoices = (
            Invoice.objects.filter(tenant_id=tenant_id)
            .select_related("subscription__plan")
            .order_by("-created_at")[:12]
        )

        data = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "amount": str(inv.amount),
                "status": inv.status,
                "billing_period_start": inv.billing_period_start.isoformat(),
                "billing_period_end": inv.billing_period_end.isoformat(),
                "due_date": inv.due_date.isoformat(),
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "plan_name": inv.subscription.plan.name if inv.subscription else None,
            }
            for inv in invoices
        ]
        return _ok(data)
