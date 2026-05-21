import hmac
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice, InvoiceStatus, PaymentReminder, PaymentReminderChannel, PaymentReminderSendStatus, PaymentReminderType

logger = logging.getLogger(__name__)


def _normalise_phone(phone: str) -> str | None:
    """Normalise to digits-only Sri Lankan format (e.g. 94771234567)."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("94") and len(digits) == 11:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "94" + digits[1:]
    if len(digits) == 9:
        return "94" + digits
    return None


def _is_valid_sl_mobile(phone: str) -> bool:
    return bool(re.match(r"^947\d{8}$", phone))


class PaymentRemindersCronView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        # CRON_SECRET via Authorization Bearer header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            request_secret = auth_header[7:]
        else:
            request_secret = request.query_params.get("secret", "")

        cron_secret = getattr(settings, "CRON_SECRET", "")
        if not hmac.compare_digest(request_secret, cron_secret):
            return Response({"success": False, "error": "Unauthorized"}, status=401)

        try:
            return self._run(request)
        except Exception as exc:
            logger.exception("PaymentRemindersCronView unhandled error: %s", exc)
            return Response({"success": False, "error": str(exc)}, status=200)

    def _run(self, request: Request) -> Response:
        run_at = timezone.now()
        run_date_start = run_at.replace(hour=0, minute=0, second=0, microsecond=0)
        run_date_end = run_date_start + timedelta(days=1)

        three_day_sent = 0
        due_date_sent = 0
        overdue_sent = 0
        failure_count = 0

        app_url = getattr(settings, "APP_URL", "http://localhost:3000")

        # Helper to get owner phone
        def _get_owner(tenant):
            return tenant.users.filter(role="OWNER").first() or tenant.users.first()

        def _build_billing_url(tenant):
            return f"{app_url}/{tenant.slug}/billing"

        def _send_whatsapp(phone_raw, message, invoice, tenant, reminder_type):
            nonlocal failure_count
            normalised = _normalise_phone(phone_raw)
            if not normalised or not _is_valid_sl_mobile(normalised):
                PaymentReminder.objects.get_or_create(
                    invoice=invoice,
                    reminder_type=reminder_type,
                    channel=PaymentReminderChannel.WHATSAPP,
                    defaults={
                        "tenant": tenant,
                        "send_status": PaymentReminderSendStatus.FAILED,
                        "error_message": f"Invalid phone: {phone_raw}",
                    },
                )
                failure_count += 1
                return False

            try:
                from apps.integrations.services.whatsapp_service import WhatsAppService  # type: ignore
                WhatsAppService.send_text_message(normalised, message)
                PaymentReminder.objects.get_or_create(
                    invoice=invoice,
                    reminder_type=reminder_type,
                    channel=PaymentReminderChannel.WHATSAPP,
                    defaults={
                        "tenant": tenant,
                        "send_status": PaymentReminderSendStatus.SENT,
                    },
                )
                return True
            except ImportError:
                logger.warning("WhatsApp service not available; skipping.")
                PaymentReminder.objects.get_or_create(
                    invoice=invoice,
                    reminder_type=reminder_type,
                    channel=PaymentReminderChannel.WHATSAPP,
                    defaults={
                        "tenant": tenant,
                        "send_status": PaymentReminderSendStatus.FAILED,
                        "error_message": "WhatsApp service unavailable",
                    },
                )
                failure_count += 1
                return False
            except Exception as exc:
                PaymentReminder.objects.get_or_create(
                    invoice=invoice,
                    reminder_type=reminder_type,
                    channel=PaymentReminderChannel.WHATSAPP,
                    defaults={
                        "tenant": tenant,
                        "send_status": PaymentReminderSendStatus.FAILED,
                        "error_message": str(exc),
                    },
                )
                failure_count += 1
                return False

        # --- Three-day-before reminders ---
        target_date = run_date_start + timedelta(days=3)
        target_date_end = target_date + timedelta(days=1)
        three_day_invoices = Invoice.objects.filter(
            status=InvoiceStatus.PENDING,
            due_date__gte=target_date,
            due_date__lt=target_date_end,
        ).select_related("tenant", "subscription")

        for inv in three_day_invoices:
            if PaymentReminder.objects.filter(
                invoice=inv,
                reminder_type=PaymentReminderType.THREE_DAY_REMINDER,
            ).exists():
                continue
            owner = _get_owner(inv.tenant)
            if owner:
                first_name = getattr(owner, "first_name", None) or owner.email
                billing_url = _build_billing_url(inv.tenant)
                due_str = inv.due_date.strftime("%d/%m/%Y")
                msg = (
                    f"Dear {first_name}, your LankaCommerce subscription payment of "
                    f"LKR {inv.amount} is due on {due_str}. Please pay at: {billing_url}"
                )
                phone = getattr(owner, "phone", "") or ""
                success = _send_whatsapp(
                    phone, msg, inv, inv.tenant,
                    PaymentReminderType.THREE_DAY_REMINDER,
                )
                if success:
                    three_day_sent += 1

        # --- Due-date reminders ---
        due_today_invoices = Invoice.objects.filter(
            status=InvoiceStatus.PENDING,
            due_date__gte=run_date_start,
            due_date__lt=run_date_end,
        ).select_related("tenant", "subscription")

        for inv in due_today_invoices:
            if PaymentReminder.objects.filter(
                invoice=inv,
                reminder_type=PaymentReminderType.DUE_DATE_REMINDER,
                sent_at__gte=run_date_start,
                sent_at__lt=run_date_end,
            ).exists():
                continue
            owner = _get_owner(inv.tenant)
            if owner:
                first_name = getattr(owner, "first_name", None) or owner.email
                billing_url = _build_billing_url(inv.tenant)
                msg = (
                    f"Dear {first_name}, your LankaCommerce subscription payment of "
                    f"LKR {inv.amount} is due today. Please pay now to avoid service interruption: {billing_url}"
                )
                phone = getattr(owner, "phone", "") or ""
                success = _send_whatsapp(
                    phone, msg, inv, inv.tenant,
                    PaymentReminderType.DUE_DATE_REMINDER,
                )
                if success:
                    due_date_sent += 1

        # --- Overdue reminders ---
        overdue_invoices = Invoice.objects.filter(
            status=InvoiceStatus.PENDING,
            due_date__lt=run_date_start,
            subscription__status="PAST_DUE",
        ).select_related("tenant", "subscription")

        for inv in overdue_invoices:
            if PaymentReminder.objects.filter(
                invoice=inv,
                reminder_type=PaymentReminderType.OVERDUE_REMINDER,
                sent_at__gte=run_date_start,
                sent_at__lt=run_date_end,
            ).exists():
                continue
            owner = _get_owner(inv.tenant)
            if owner:
                first_name = getattr(owner, "first_name", None) or owner.email
                billing_url = _build_billing_url(inv.tenant)
                msg = (
                    f"Dear {first_name}, your LankaCommerce subscription payment of "
                    f"LKR {inv.amount} is overdue. Your access will be suspended if payment is not "
                    f"received soon. Pay now: {billing_url}. Reply STOP to opt out of reminders."
                )
                phone = getattr(owner, "phone", "") or ""
                success = _send_whatsapp(
                    phone, msg, inv, inv.tenant,
                    PaymentReminderType.OVERDUE_REMINDER,
                )
                if success:
                    overdue_sent += 1

        return Response({
            "run_at": run_at.isoformat(),
            "three_day_reminders_sent": three_day_sent,
            "due_date_reminders_sent": due_date_sent,
            "overdue_reminders_sent": overdue_sent,
            "failure_count": failure_count,
        }, status=200)
