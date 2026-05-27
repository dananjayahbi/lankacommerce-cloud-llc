"""
apps/webstore/views/webhook_views.py

PayHere payment gateway webhook handler.

Security:
  - Webhook signature is verified with MD5 before any state change.
  - CSRF exempt — PayHere POSTs from its servers, not from a browser.
  - Always returns HTTP 200 (even on failure) to prevent PayHere retry loops
    on transient errors. Errors are logged server-side.
  - Idempotency is enforced in order_service.confirm_order_payment — duplicate
    notifications for the same order are silently ignored.
  - All DB writes are wrapped in transaction.atomic() inside confirm_order_payment.

PayHere status codes:
  2  = Successful payment
  0  = Pending
 -1  = Cancelled
 -2  = Failed
 -3  = Charged back
"""

from __future__ import annotations

import logging

from django.http import HttpRequest, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.audit.models import AuditLog
from apps.webstore.models import TenantWebstore, WebstoreOrder
from apps.webstore.services import storefront_service
from apps.webstore.services.order_service import cancel_order, confirm_order_payment
from apps.webstore.services.payhere_service import verify_webhook_signature

logger = logging.getLogger(__name__)

# PayHere status codes we act on
_STATUS_PAID = "2"
_STATUS_CANCELLED = "-1"
_STATUS_FAILED = "-2"
_STATUS_CHARGEDBACK = "-3"


@method_decorator(csrf_exempt, name="dispatch")
class PayHereWebhookView(View):
    """
    POST /api/webstore/webhooks/payhere/<slug>/

    Receives PayHere payment notifications and updates order status accordingly.
    """

    def post(self, request: HttpRequest, slug: str) -> HttpResponse:
        # --- Resolve tenant ---
        try:
            tenant = storefront_service.resolve_tenant(slug)
        except Exception:
            logger.warning("payhere_webhook: unknown slug %r", slug)
            return HttpResponse(status=200)

        # --- Resolve TenantWebstore for merchant credentials ---
        try:
            webstore = tenant.webstore
        except TenantWebstore.DoesNotExist:
            logger.warning("payhere_webhook: no webstore for slug %r", slug)
            return HttpResponse(status=200)

        # --- Extract POST parameters ---
        merchant_id = request.POST.get("merchant_id", "")
        order_id = request.POST.get("order_id", "")
        payhere_amount = request.POST.get("payhere_amount", "")
        payhere_currency = request.POST.get("payhere_currency", "LKR")
        status_code = request.POST.get("status_code", "")
        md5sig = request.POST.get("md5sig", "")
        payment_id = request.POST.get("payment_id", "")

        if not all([merchant_id, order_id, payhere_amount, status_code, md5sig]):
            logger.warning(
                "payhere_webhook: missing required fields for slug %r order %r",
                slug,
                order_id,
            )
            AuditLog.objects.create(
                tenant_id=tenant.id,
                actor_role="system",
                entity_type="WebstoreOrder",
                action="PAYHERE_WEBHOOK_MISSING_FIELDS",
                after={"slug": slug, "order_id": order_id},
                ip_address=request.META.get("REMOTE_ADDR"),
            )
            return HttpResponse(status=200)

        # --- Verify signature ---
        merchant_secret = webstore.payhere_merchant_secret
        if not verify_webhook_signature(
            merchant_id=merchant_id,
            order_id=order_id,
            payhere_amount=payhere_amount,
            payhere_currency=payhere_currency,
            status_code=status_code,
            merchant_secret=merchant_secret,
            received_md5sig=md5sig,
        ):
            logger.warning(
                "payhere_webhook: INVALID signature for order %r (slug=%r)",
                order_id,
                slug,
            )
            AuditLog.objects.create(
                tenant_id=tenant.id,
                actor_role="system",
                entity_type="WebstoreOrder",
                action="PAYHERE_WEBHOOK_INVALID_SIGNATURE",
                after={"order_id": order_id, "verified": False},
                ip_address=request.META.get("REMOTE_ADDR"),
            )
            return HttpResponse(status=400)

        # --- Resolve the WebstoreOrder by order_number ---
        try:
            order = WebstoreOrder.objects.select_related("tenant").get(
                tenant=tenant,
                order_number=order_id,
                deleted_at__isnull=True,
            )
        except WebstoreOrder.DoesNotExist:
            logger.warning(
                "payhere_webhook: order %r not found for slug %r", order_id, slug
            )
            return HttpResponse(status=200)

        logger.info(
            "payhere_webhook: received status_code=%s for order %s (slug=%s)",
            status_code,
            order_id,
            slug,
        )

        # --- Dispatch on status code ---
        try:
            if status_code == _STATUS_PAID:
                confirm_order_payment(
                    order=order,
                    payment_id=payment_id,
                    payhere_amount=payhere_amount,
                )
                logger.info(
                    "payhere_webhook: payment confirmed for order %s", order_id
                )
                AuditLog.objects.create(
                    tenant_id=tenant.id,
                    actor_role="system",
                    entity_type="WebstoreOrder",
                    entity_id=order.id,
                    action="PAYHERE_PAYMENT_CONFIRMED",
                    after={
                        "order_number": order_id,
                        "payment_id": payment_id,
                        "amount": payhere_amount,
                        "verified": True,
                    },
                    ip_address=request.META.get("REMOTE_ADDR"),
                )

            elif status_code in (_STATUS_CANCELLED, _STATUS_FAILED, _STATUS_CHARGEDBACK):
                try:
                    cancel_order(order)
                    logger.info(
                        "payhere_webhook: order %s cancelled (status_code=%s)",
                        order_id,
                        status_code,
                    )
                    AuditLog.objects.create(
                        tenant_id=tenant.id,
                        actor_role="system",
                        entity_type="WebstoreOrder",
                        entity_id=order.id,
                        action="PAYHERE_PAYMENT_CANCELLED",
                        after={
                            "order_number": order_id,
                            "status_code": status_code,
                            "verified": True,
                        },
                        ip_address=request.META.get("REMOTE_ADDR"),
                    )
                except Exception as cancel_exc:
                    # cancel_order raises if order is already paid — log and continue
                    logger.warning(
                        "payhere_webhook: could not cancel order %s: %s",
                        order_id,
                        cancel_exc,
                    )

        except Exception:
            logger.exception(
                "payhere_webhook: unhandled error processing order %s", order_id
            )
            # Return 200 to prevent PayHere from retrying and flooding logs
            return HttpResponse(status=200)

        # Always return 200 — PayHere retries on any non-2xx response
        return HttpResponse(status=200)


payhere_webhook = PayHereWebhookView.as_view()
