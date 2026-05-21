"""
SentryTenantMiddleware

Attaches the authenticated user's tenant and user information to the
active Sentry scope so every captured exception is annotated with context.
This middleware must run *after* `JWTAuthentication` has populated
`request.user`.
"""
from __future__ import annotations

import logging

from apps.accounts.services.sentry_context import set_sentry_tenant_context

logger = logging.getLogger(__name__)


class SentryTenantMiddleware:
    """Django middleware that injects tenant / user context into Sentry."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            tenant_id = getattr(user, "tenant_id", None)
            tenant_slug = None

            # Try to resolve the tenant slug cheaply (avoid DB hit if cached)
            try:
                from apps.tenants.models import Tenant  # noqa: PLC0415

                if tenant_id:
                    t = Tenant.objects.filter(id=tenant_id).values("slug").first()
                    tenant_slug = t["slug"] if t else None
            except Exception:  # pragma: no cover
                pass

            set_sentry_tenant_context(
                tenant_id=tenant_id,
                tenant_slug=tenant_slug,
                user_id=getattr(user, "id", None),
                user_email=getattr(user, "email", None),
            )

        return self.get_response(request)
