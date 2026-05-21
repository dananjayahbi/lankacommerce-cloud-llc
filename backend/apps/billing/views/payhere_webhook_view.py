import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import (
    Invoice,
    InvoicePaymentEvent,
    InvoiceStatus,
    Subscription,
    SubscriptionStatus,
)
from apps.billing.services.payhere_service import PayHereService

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class PayHereWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request: Request) -> Response:
        merchant_id = request.data.get("merchant_id", "")
        order_id = request.data.get("order_id", "")
        payhere_amount = request.data.get("amount", "")
        payhere_currency = request.data.get("currency", "LKR")
        status_code = request.data.get("status_code", "")
        md5sig = request.data.get("md5sig", "")

        if not order_id:
            logger.warning("PayHere IPN received with missing order_id.")
            return Response({"success": False, "error": "Missing order_id"}, status=200)

        invoice = (
            Invoice.objects.select_related("subscription", "tenant")
            .filter(invoice_number=order_id)
            .first()
        )
        if not invoice:
            logger.warning("PayHere IPN: invoice not found for order_id=%s", order_id)
            return Response({"success": True}, status=200)

        # Capture raw payload (dict copy since request.data may be a QueryDict)
        try:
            raw_payload = dict(request.data)
        except Exception:
            raw_payload = {}

        # Create audit event
        event = InvoicePaymentEvent.objects.create(
            invoice=invoice,
            payhere_status_code=status_code,
            payhere_order_id=order_id,
            payhere_amount=payhere_amount,
            payhere_currency=payhere_currency,
            payhere_md5sig=md5sig,
            signature_valid=False,
            raw_payload=raw_payload,
            processed=False,
        )

        # Validate signature
        signature_valid = PayHereService.validate_ipn_signature(
            md5sig, merchant_id, order_id, payhere_amount, payhere_currency, status_code
        )
        event.signature_valid = signature_valid
        event.save(update_fields=["signature_valid"])

        if not signature_valid:
            logger.warning(
                "PayHere IPN: INVALID SIGNATURE for order_id=%s. md5sig=%s",
                order_id,
                md5sig,
            )
            return Response({"success": True}, status=200)

        # Process successful payment
        if status_code == "2":
            with transaction.atomic():
                locked_event = (
                    InvoicePaymentEvent.objects.select_for_update()
                    .get(id=event.id)
                )
                if locked_event.processed:
                    logger.info(
                        "PayHere IPN: duplicate IPN for order_id=%s, skipping.", order_id
                    )
                    return Response({"success": True}, status=200)

                locked_event.processed = True
                locked_event.save(update_fields=["processed"])

                # Update invoice
                invoice.status = InvoiceStatus.PAID
                invoice.paid_at = timezone.now()
                invoice.payhere_order_id = order_id
                invoice.save(update_fields=["status", "paid_at", "payhere_order_id", "updated_at"])

                # Update subscription
                subscription = invoice.subscription
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.current_period_end = timezone.now() + __import__("datetime").timedelta(days=30)
                subscription.save(update_fields=["status", "current_period_end", "updated_at"])

                # Handle recurring subscription token
                if request.data.get("recurring") == "1":
                    sub_token = request.data.get("subscription_token")
                    if sub_token:
                        subscription.payhere_subscription_token = sub_token
                        subscription.save(update_fields=["payhere_subscription_token"])

                # Update tenant
                from apps.tenants.models import Tenant
                Tenant.objects.filter(id=invoice.tenant_id).update(
                    subscription_status=SubscriptionStatus.ACTIVE
                )

            # Auto-generate next invoice (non-atomic, non-blocking)
            try:
                from apps.billing.services.invoice_service import InvoiceService
                InvoiceService.auto_generate_next_invoice(invoice.subscription)
            except Exception as exc:
                logger.exception("Failed to auto-generate next invoice for %s: %s", order_id, exc)

            # Email PDF notification
            try:
                from apps.billing.services.invoice_service import InvoiceService
                InvoiceService.generate_and_email_invoice_pdf(invoice)
            except Exception as exc:
                logger.exception("Failed to email invoice PDF for %s: %s", invoice.invoice_number, exc)

        elif status_code in ("-1", "-2"):
            invoice.status = InvoiceStatus.FAILED
            invoice.save(update_fields=["status", "updated_at"])

        return Response({"success": True}, status=200)
