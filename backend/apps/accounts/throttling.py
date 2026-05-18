"""
LankaCommerce Auth Rate Limiting

Throttle classes for authentication endpoints.
These classes extend DRF's AnonRateThrottle to limit requests by IP address.

Rate limits:
    - Login:           10 requests per 15 minutes
    - PIN login:       10 requests per 15 minutes
    - Forgot password:  5 requests per hour

Cache backend:
    - Development: LocMemCache (in-process, reset on server restart)
    - Production:  Redis via django-redis (shared across workers)
"""

from rest_framework.throttling import AnonRateThrottle


class LankaCommerceRateThrottle(AnonRateThrottle):
    """
    Base throttle class with support for custom time periods.

    Extends the standard rate parser to support:
        - Standard: second, minute, hour, day
        - Custom: 15min (= 900 seconds), 30min (= 1800 seconds)
    """

    CUSTOM_PERIODS: dict[str, int] = {
        "15min": 15 * 60,   # 900 seconds
        "30min": 30 * 60,   # 1800 seconds
    }

    def parse_rate(self, rate: str | None):
        """
        Override DRF's parse_rate to support custom period strings like '15min'.
        Falls back to the parent implementation for standard periods.
        """
        if rate is None:
            return None, None

        num, period = rate.split("/")
        num_requests = int(num)

        if period in self.CUSTOM_PERIODS:
            duration = self.CUSTOM_PERIODS[period]
            return num_requests, duration

        # Delegate standard periods to the parent parser
        return super().parse_rate(rate)


class LoginRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the email/password login endpoint.
    10 attempts per 15-minute window per IP address.
    """

    scope = "login"


class PINRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the PIN login endpoint.
    10 attempts per 15-minute window per IP address.
    """

    scope = "pin_login"


class ForgotPasswordRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the forgot-password endpoint.
    5 requests per hour per IP address.
    """

    scope = "forgot_password"
