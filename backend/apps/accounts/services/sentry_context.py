"""
Sentry context helpers.

Call `set_sentry_tenant_context` after resolving the tenant and user on a
request to attach structured context to every Sentry event captured during
that request's lifetime.
"""
from __future__ import annotations


def set_sentry_tenant_context(
    tenant_id: str | None,
    tenant_slug: str | None,
    user_id: str | None,
    user_email: str | None,
) -> None:
    """Attach tenant and user context to the current Sentry scope."""
    try:
        import sentry_sdk  # noqa: PLC0415 — optional dependency

        sentry_sdk.set_context("tenant", {"id": str(tenant_id), "slug": tenant_slug})
        sentry_sdk.set_user({"id": str(user_id), "email": user_email})
    except ImportError:
        pass
