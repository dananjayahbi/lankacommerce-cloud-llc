"""
Audit service — thin wrapper around AuditLog creation.

The ``log_audit_event`` function is safe to call from anywhere:
it silently swallows all exceptions so a logging failure can never
propagate to the caller and abort a business-critical operation.
"""

from __future__ import annotations

from typing import Any


def log_audit_event(
    *,
    tenant_id: Any,
    actor_id: Any,
    action: str,
    resource_type: str,
    resource_id: Any,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    """Create an AuditLog entry.  Never raises — any error is silently dropped."""
    try:
        from apps.accounts.models import AuditLog  # noqa: PLC0415

        AuditLog.objects.create(
            actor_id=actor_id,
            tenant_id=tenant_id,
            action=action,
            entity_type=resource_type,
            entity_id=str(resource_id),
            before=before,
            after=after,
        )
    except Exception:  # noqa: BLE001
        pass


# Canonical action constants
class AuditAction:
    PRODUCT_CREATED = "PRODUCT_CREATED"
    PRODUCT_UPDATED = "PRODUCT_UPDATED"
    PRODUCT_DELETED = "PRODUCT_DELETED"
    VARIANT_PRICE_CHANGED = "VARIANT_PRICE_CHANGED"
    STOCK_TAKE_SUBMITTED = "STOCK_TAKE_SUBMITTED"
    STOCK_TAKE_APPROVED = "STOCK_TAKE_APPROVED"
    STOCK_TAKE_REJECTED = "STOCK_TAKE_REJECTED"
