"""
apps/webstore/services/payhere_service.py

PayHere payment gateway utilities.

SECURITY:
  - The merchant_secret is NEVER returned to the browser.
  - MD5 hash is computed server-side only.
  - All webhook signatures are verified before processing.

PayHere hash formula (official spec):
  Request hash:  MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).upper())
  Webhook sig:   MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).upper())

Amount format: "5000.00" (decimal string, 2 decimal places)
"""

from __future__ import annotations

import hashlib
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment helpers
# ---------------------------------------------------------------------------

PAYHERE_SANDBOX_URL = "https://sandbox.payhere.lk/pay/checkout"
PAYHERE_PRODUCTION_URL = "https://www.payhere.lk/pay/checkout"


def get_payhere_checkout_url() -> str:
    """Return the correct PayHere checkout URL based on PAYHERE_ENVIRONMENT setting."""
    env = getattr(settings, "PAYHERE_ENVIRONMENT", "sandbox")
    return PAYHERE_PRODUCTION_URL if env == "production" else PAYHERE_SANDBOX_URL


# ---------------------------------------------------------------------------
# Hash helpers
# ---------------------------------------------------------------------------

def _md5(value: str) -> str:
    """Compute MD5 hash of a UTF-8 string. Returns lowercase hex digest."""
    return hashlib.md5(value.encode("utf-8")).hexdigest()


def _md5_secret(merchant_secret: str) -> str:
    """MD5 hash of the merchant secret (lowercase), used in hash formulas."""
    return _md5(merchant_secret).upper()


def generate_payment_hash(
    merchant_id: str,
    order_id: str,
    amount: str,
    currency: str,
    merchant_secret: str,
) -> str:
    """
    Generate the PayHere payment initiation hash.

    Formula: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).upper())

    Args:
        merchant_id: PayHere merchant ID string
        order_id:    The WebstoreOrder.order_number (e.g. "WS-0001")
        amount:      Total formatted as "5000.00"
        currency:    Currency code, e.g. "LKR"
        merchant_secret: PayHere merchant secret (NEVER logged or returned to browser)

    Returns:
        Lowercase MD5 hex string.
    """
    raw = merchant_id + order_id + amount + currency + _md5_secret(merchant_secret)
    return _md5(raw)


def verify_webhook_signature(
    merchant_id: str,
    order_id: str,
    payhere_amount: str,
    payhere_currency: str,
    status_code: str,
    merchant_secret: str,
    received_md5sig: str,
) -> bool:
    """
    Verify a PayHere server-to-server webhook notification.

    Formula: MD5(merchant_id + order_id + payhere_amount + payhere_currency
                 + status_code + MD5(merchant_secret).upper())

    Returns:
        True if the computed hash matches received_md5sig (case-insensitive).

    Security:
        ALWAYS call this before processing any webhook payload.
        A mismatch means the payload was not sent by PayHere.
    """
    raw = (
        merchant_id
        + order_id
        + payhere_amount
        + payhere_currency
        + str(status_code)
        + _md5_secret(merchant_secret)
    )
    expected = _md5(raw)
    return expected.lower() == received_md5sig.lower()


def build_payment_initiation_data(
    order,
    webstore,
    tenant,
) -> dict:
    """
    Build the payment_initiation_data dict to be returned from the order
    placement endpoint. The frontend uses this to build and auto-submit a
    hidden HTML form to PayHere.

    SECURITY: merchant_secret is read from TenantWebstore but is NEVER
    included in the returned dict.

    Args:
        order:    WebstoreOrder instance
        webstore: TenantWebstore instance (contains payhere credentials)
        tenant:   Tenant instance

    Returns:
        Dict safe to serialize to JSON and return to the browser.
    """
    merchant_id = webstore.payhere_merchant_id
    merchant_secret = webstore.payhere_merchant_secret
    amount_str = f"{order.total:.2f}"
    currency = "LKR"
    order_id = order.order_number

    base_domain = getattr(settings, "STOREFRONT_BASE_DOMAIN", "lankacommerce.com")
    notify_base = getattr(settings, "PAYHERE_NOTIFY_URL_BASE", "http://localhost:8000")

    shipping = order.shipping_address or {}
    return_url = f"https://{tenant.slug}.{base_domain}/checkout/success?order_id={order_id}"
    cancel_url = f"https://{tenant.slug}.{base_domain}/checkout?cancelled=true"
    notify_url = f"{notify_base}/api/webstore/webhooks/payhere/{tenant.slug}/"

    hash_value = generate_payment_hash(
        merchant_id, order_id, amount_str, currency, merchant_secret
    )

    return {
        "checkout_url": get_payhere_checkout_url(),
        "merchant_id": merchant_id,
        "return_url": return_url,
        "cancel_url": cancel_url,
        "notify_url": notify_url,
        "first_name": shipping.get("first_name", ""),
        "last_name": shipping.get("last_name", ""),
        "email": order.customer_email,
        "phone": shipping.get("phone", ""),
        "address": shipping.get("address1", ""),
        "city": shipping.get("city", ""),
        "country": shipping.get("country", "Sri Lanka"),
        "order_id": order_id,
        "items": f"{tenant.name} Order {order_id}",
        "currency": currency,
        "amount": amount_str,
        "hash": hash_value,
    }
