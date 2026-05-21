import logging
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.billing.models import (
    Invoice,
    InvoiceStatus,
    SubscriptionStatus,
)

logger = logging.getLogger(__name__)


class InvoiceService:

    @staticmethod
    def mark_invoice_paid(invoice, payhere_order_id: str = None):
        """Atomically mark an invoice as PAID and auto-generate the next invoice."""
        with transaction.atomic():
            locked = Invoice.objects.select_for_update().get(id=invoice.id)

            if locked.status == InvoiceStatus.PAID:
                logger.warning(
                    "InvoiceService.mark_invoice_paid: invoice %s is already PAID, skipping.",
                    locked.invoice_number,
                )
                return locked

            locked.status = InvoiceStatus.PAID
            locked.paid_at = timezone.now()
            if payhere_order_id:
                locked.payhere_order_id = payhere_order_id
            locked.save(update_fields=["status", "paid_at", "payhere_order_id", "updated_at"])

        # Generate next invoice outside atomic block (non-critical)
        try:
            InvoiceService.auto_generate_next_invoice(locked.subscription)
        except Exception as exc:
            logger.exception(
                "Failed to auto-generate next invoice for subscription %s: %s",
                locked.subscription_id,
                exc,
            )

        return locked

    @staticmethod
    def auto_generate_next_invoice(subscription):
        """Generate the next billing period's PENDING invoice."""
        if subscription.status in (SubscriptionStatus.CANCELLED, SubscriptionStatus.SUSPENDED):
            logger.info(
                "auto_generate_next_invoice: subscription %s is %s, skipping.",
                subscription.id,
                subscription.status,
            )
            return None

        next_period_start = subscription.current_period_end
        if next_period_start is None:
            logger.warning(
                "auto_generate_next_invoice: subscription %s has no current_period_end.",
                subscription.id,
            )
            return None

        next_period_end = next_period_start + timedelta(days=30)
        next_due_date = next_period_end + timedelta(days=7)

        # Idempotency: check if invoice already exists for this period
        if Invoice.objects.filter(
            subscription=subscription,
            billing_period_start=next_period_start,
        ).exists():
            logger.info(
                "auto_generate_next_invoice: invoice already exists for period starting %s.",
                next_period_start,
            )
            return None

        today = next_period_start.strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        invoice_number = f"INV-{today}-{suffix}"

        invoice = Invoice.objects.create(
            subscription=subscription,
            tenant=subscription.tenant,
            invoice_number=invoice_number,
            amount=subscription.plan.monthly_price,
            status=InvoiceStatus.PENDING,
            billing_period_start=next_period_start,
            billing_period_end=next_period_end,
            due_date=next_due_date,
        )

        # Update subscription period
        subscription.current_period_start = next_period_start
        subscription.current_period_end = next_period_end
        subscription.save(update_fields=["current_period_start", "current_period_end", "updated_at"])

        return invoice

    @staticmethod
    def generate_and_email_invoice_pdf(invoice):
        """Log and trigger invoice PDF email. Actual PDF rendering is client-side."""
        logger.info(
            "Invoice PDF notification triggered for %s (tenant=%s).",
            invoice.invoice_number,
            invoice.tenant_id,
        )
        try:
            from apps.billing.services.email_service import EmailService
            from django.conf import settings

            app_url = getattr(settings, "APP_URL", "http://localhost:3000")
            admin_user = (
                invoice.tenant.users.filter(role="OWNER").first()
                or invoice.tenant.users.first()
            )
            if admin_user:
                html_content = f"""
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto">
                  <div style="background:#1B2B3A;padding:24px;text-align:center">
                    <h1 style="color:#ffffff;margin:0">LankaCommerce</h1>
                  </div>
                  <div style="padding:24px">
                    <p>Your invoice <b>{invoice.invoice_number}</b> for LKR {invoice.amount} has been paid.</p>
                    <p>You can download your invoice PDF from the billing page.</p>
                    <a href="{app_url}/billing"
                       style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;
                              text-decoration:none;display:inline-block">
                      View Billing
                    </a>
                  </div>
                </div>
                """
                EmailService.send_email(
                    admin_user.email,
                    f"Invoice {invoice.invoice_number} from LankaCommerce",
                    html_content,
                )
        except Exception as exc:
            logger.exception("generate_and_email_invoice_pdf failed: %s", exc)
