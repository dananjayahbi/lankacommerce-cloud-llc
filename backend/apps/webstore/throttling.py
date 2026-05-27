"""
apps/webstore/throttling.py

Rate throttle classes for webstore consumer-facing endpoints.
Extends the LankaCommerceRateThrottle base defined in apps.accounts.throttling.
"""

from apps.accounts.throttling import LankaCommerceRateThrottle


class WebstoreLoginThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the consumer storefront login endpoint.
    10 attempts per minute per IP address.
    """

    scope = "webstore_login"


class WebstoreRegisterThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the consumer storefront registration endpoint.
    5 registrations per hour per IP address.
    """

    scope = "webstore_register"


class WebstoreOrderThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for order placement.
    30 orders per minute per IP (burst protection).
    """

    scope = "webstore_order"
