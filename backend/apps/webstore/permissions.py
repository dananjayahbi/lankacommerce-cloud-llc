"""
apps/webstore/permissions.py

DRF permission classes for the webstore tenant admin API.
"""

import logging

from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.models import UserRole

logger = logging.getLogger(__name__)

_FEATURE_WEBSTORE_ID = "webstore"
_ACTIVE_STATUSES = ("ACTIVE", "TRIALING")


class HasWebstoreFeature(BasePermission):
    """
    Grants access only when ALL of the following are true:

    1. The requesting user is authenticated.
    2. The user belongs to a tenant  (SUPER_ADMIN is exempt from checks 2–4).
    3. The tenant has an ACTIVE or TRIALING subscription.
    4. That subscription's plan has ``{"id": "webstore", "enabled": true}``
       somewhere in its ``features`` list.

    On failure the response is HTTP 403 with the ``message`` below.
    """

    message = (
        "Your plan does not include the Webstore feature. "
        "Please upgrade to a plan that includes the Webstore add-on."
    )

    def has_permission(self, request: Request, view) -> bool:
        # Must be authenticated first (works alongside IsAuthenticated).
        if not request.user or not request.user.is_authenticated:
            return False

        # SUPER_ADMIN bypasses all feature-gate checks.
        if getattr(request.user, "role", None) == UserRole.SUPER_ADMIN:
            return True

        tenant = getattr(request.user, "tenant", None)
        if tenant is None:
            return False

        # Fetch the first active/trialing subscription with its plan in one query.
        subscription = (
            tenant.billing_subscriptions
            .filter(status__in=_ACTIVE_STATUSES)
            .select_related("plan")
            .first()
        )
        if subscription is None:
            return False

        features = subscription.plan.features or []
        for feature in features:
            # Support plain string format: "webstore"
            if isinstance(feature, str) and feature == _FEATURE_WEBSTORE_ID:
                return True
            # Support dict format: {"id": "webstore", "enabled": True}
            if (
                isinstance(feature, dict)
                and feature.get("id") == _FEATURE_WEBSTORE_ID
                and feature.get("enabled") is True
            ):
                return True

        return False
