import hashlib
import hmac
import logging
import re
import uuid

from django.conf import settings
from django.utils import timezone

from apps.billing.constants import (
    PAYHERE_PRODUCTION_URL,
    PAYHERE_SANDBOX_URL,
)

logger = logging.getLogger(__name__)


class PayHereService:

    @staticmethod
    def normalise_phone(phone: str) -> str:
        """Normalise a Sri Lankan phone number to +94XXXXXXXXX format."""
        if not phone:
            return phone
        digits = re.sub(r"\D", "", phone)
        if digits.startswith("94") and len(digits) == 11:
            return "+" + digits
        if digits.startswith("0") and len(digits) == 10:
            return "+94" + digits[1:]
        if len(digits) == 9:
            return "+94" + digits
        logger.warning("Could not normalise phone number: %s", phone)
        return phone

    @staticmethod
    def normalise_phone_for_sms(phone: str) -> str:
        """Return digits-only international format for Meta Cloud API."""
        if not phone:
            return phone
        digits = re.sub(r"\D", "", phone)
        if digits.startswith("94") and len(digits) == 11:
            return digits
        if digits.startswith("0") and len(digits) == 10:
            return "94" + digits[1:]
        if len(digits) == 9:
            return "94" + digits
        logger.warning("Could not normalise phone number for SMS: %s", phone)
        return digits

    @staticmethod
    def build_payhere_checkout_payload(invoice, tenant, user) -> dict:
        """Build the PayHere checkout form payload with MD5 hash."""
        checkout_url = (
            PAYHERE_SANDBOX_URL if getattr(settings, "PAYHERE_SANDBOX", True)
            else PAYHERE_PRODUCTION_URL
        )
        merchant_id = str(settings.PAYHERE_MERCHANT_ID)
        order_id = invoice.invoice_number
        amount = str(invoice.amount)
        currency = "LKR"
        items = f"{invoice.subscription.plan.name} Subscription - {invoice.billing_period_start.strftime('%B %Y')}"

        return_url = getattr(settings, "APP_URL", "http://localhost:3000") + "/billing?payment=success"
        cancel_url = getattr(settings, "APP_URL", "http://localhost:3000") + "/billing?payment=cancelled"
        notify_url = getattr(settings, "APP_URL", "http://localhost:8000") + "/api/billing/webhooks/payhere/"

        first_name = getattr(user, "first_name", None) or tenant.name
        last_name = getattr(user, "last_name", "") or ""
        email = user.email
        phone_raw = getattr(user, "phone", None) or getattr(tenant, "phone", "") or ""
        phone = PayHereService.normalise_phone(phone_raw)

        address = getattr(tenant, "address", None) or "No address provided"
        city = getattr(tenant, "city", None) or "Colombo"
        country = "Sri Lanka"

        # MD5 hash: merchant_id + order_id + amount + currency + merchant_secret
        hash_string = (
            merchant_id + order_id + amount + currency + str(settings.PAYHERE_MERCHANT_SECRET)
        )
        md5_hash = hashlib.md5(hash_string.encode("utf-8")).hexdigest()

        return {
            "checkout_url": checkout_url,
            "form_params": {
                "merchant_id": merchant_id,
                "return_url": return_url,
                "cancel_url": cancel_url,
                "notify_url": notify_url,
                "order_id": order_id,
                "items": items,
                "currency": currency,
                "amount": amount,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "address": address,
                "city": city,
                "country": country,
                "hash": md5_hash,
            },
        }

    @staticmethod
    def generate_invoice_number() -> str:
        """Generate a unique invoice number."""
        from datetime import date
        today = date.today().strftime("%Y%m%d")
        suffix = uuid.uuid4().hex[:6].upper()
        return f"INV-{today}-{suffix}"

    @staticmethod
    def initiate_checkout(invoice_id, tenant_id, user) -> dict:
        from apps.billing.models import Invoice, InvoiceStatus

        invoice = (
            Invoice.objects.select_related("subscription__plan", "tenant")
            .get(id=invoice_id, tenant_id=tenant_id)
        )
        if invoice.status != InvoiceStatus.PENDING:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {"code": "invoice_not_pending", "message": "Invoice is not in PENDING status."}
            )
        return PayHereService.build_payhere_checkout_payload(invoice, invoice.tenant, user)

    @staticmethod
    def validate_ipn_signature(
        payhere_md5sig: str,
        merchant_id: str,
        order_id: str,
        payhere_amount: str,
        payhere_currency: str,
        status_code: str,
    ) -> bool:
        """Validate PayHere IPN MD5 signature (timing-safe)."""
        hash_string = (
            merchant_id
            + order_id
            + payhere_amount
            + payhere_currency
            + str(status_code)
            + str(settings.PAYHERE_MERCHANT_SECRET)
        )
        computed = hashlib.md5(hash_string.encode("utf-8")).hexdigest()
        return hmac.compare_digest(computed, payhere_md5sig.lower())
