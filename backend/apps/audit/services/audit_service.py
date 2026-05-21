"""
LankaCommerce — Centralised Audit Service
==========================================

Provides fire-and-forget audit log creation for all domain mutations:
sales, returns, customer credit, staff changes, promotions, stock,
expenses, shifts, and settings.

Usage
-----
    from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS

    try:
        create_audit_log(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action=AUDIT_ACTIONS['SALE_COMPLETED'],
            entity_type="sale",
            entity_id=str(sale.id),
            new_values={"total": str(sale.total_amount)},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        )
    except Exception:
        logger.warning("Audit log failed", exc_info=True)

The caller MUST wrap every call in try/except — this service never raises.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from apps.accounts.models import AuditLog

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────
# Canonical action constants
# ──────────────────────────────────────────────────────────────────

AUDIT_ACTIONS: dict[str, str] = {
    "SALE_COMPLETED": "sale.completed",
    "SALE_VOIDED": "sale.voided",
    "RETURN_COMPLETED": "return.completed",
    "CUSTOMER_CREDIT_ADJUSTED": "customer.credit_adjusted",
    "PO_STATUS_CHANGED": "purchase_order.status_changed",
    "STAFF_ROLE_CHANGED": "staff.role_changed",
    "STAFF_PIN_CHANGED": "staff.pin_changed",
    "STAFF_PERMISSION_CHANGED": "staff.permission_changed",
    "PROMOTION_CREATED": "promotion.created",
    "PROMOTION_UPDATED": "promotion.updated",
    "PROMOTION_ARCHIVED": "promotion.archived",
    "STOCK_ADJUSTED": "stock.adjusted",
    "EXPENSE_CREATED": "expense.created",
    "EXPENSE_DELETED": "expense.deleted",
    "SHIFT_CLOSED": "shift.closed",
    "SETTINGS_CHANGED": "settings.changed",
}


# ──────────────────────────────────────────────────────────────────
# create_audit_log
# ──────────────────────────────────────────────────────────────────

def create_audit_log(
    tenant_id: Any,
    user_id: Any,
    action: str,
    entity_type: str,
    entity_id: Any,
    previous_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    actor_role: str = "",
) -> AuditLog:
    """
    Write a single AuditLog record.

    Parameters
    ----------
    tenant_id       : UUID or str — tenant context.
    user_id         : UUID or str — actor who performed the action.
    action          : Canonical action string from AUDIT_ACTIONS.
    entity_type     : Lowercase entity name, e.g. "sale", "customer".
    entity_id       : UUID or str of the affected record.
    previous_values : Dict snapshot of state before the change.
    new_values      : Dict snapshot of state after the change.
    ip_address      : Remote IP from request.META (None for cron/background).
    user_agent      : User-Agent header, truncated to 255 chars.
    actor_role      : Role string of the actor at the time of the action.

    Returns
    -------
    AuditLog instance (caller should not depend on the return value for
    critical logic — the call may be in a fire-and-forget try/except).
    """
    return AuditLog.objects.create(
        tenant_id=tenant_id,
        actor_id=user_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=previous_values,
        after=new_values,
        ip_address=ip_address,
        user_agent=(user_agent or "")[:255],
    )


# ──────────────────────────────────────────────────────────────────
# get_audit_logs
# ──────────────────────────────────────────────────────────────────

def get_audit_logs(
    tenant_id: Any,
    entity_type: Optional[str] = None,
    start_date: Optional[Any] = None,
    end_date: Optional[Any] = None,
    user_id: Optional[Any] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """
    Return a paginated list of AuditLog records for the given tenant.

    Parameters
    ----------
    tenant_id   : UUID — tenant context to scope results.
    entity_type : Optional filter — only return records for this entity type.
    start_date  : Optional ISO date or datetime — filter created_at >= start_date.
    end_date    : Optional ISO date or datetime — filter created_at <= end_date.
    user_id     : Optional UUID — filter by the actor who performed the action.
    page        : 1-based page number.
    page_size   : Number of records per page (max 100 enforced by caller).

    Returns
    -------
    Dict with keys: results (list of dicts), total (int), page (int), page_size (int).
    """
    qs = AuditLog.objects.filter(tenant_id=tenant_id)

    if entity_type is not None:
        qs = qs.filter(entity_type=entity_type)
    if start_date is not None:
        qs = qs.filter(created_at__gte=start_date)
    if end_date is not None:
        qs = qs.filter(created_at__lte=end_date)
    if user_id is not None:
        qs = qs.filter(actor_id=user_id)

    qs = qs.order_by("-created_at")

    total = qs.count()

    page_size = min(page_size, 100)
    offset = (page - 1) * page_size
    records = list(
        qs.values(
            "id",
            "tenant_id",
            "actor_id",
            "actor_role",
            "entity_type",
            "entity_id",
            "action",
            "before",
            "after",
            "ip_address",
            "user_agent",
            "created_at",
        )[offset : offset + page_size]
    )

    # Serialise UUIDs and datetimes to strings for JSON safety
    for r in records:
        r["id"] = str(r["id"]) if r["id"] else None
        r["tenant_id"] = str(r["tenant_id"]) if r["tenant_id"] else None
        r["actor_id"] = str(r["actor_id"]) if r["actor_id"] else None
        r["entity_id"] = str(r["entity_id"]) if r["entity_id"] else None
        r["created_at"] = r["created_at"].isoformat() if r["created_at"] else None

    return {
        "success": True,
        "data": {
            "results": records,
            "total": total,
            "page": page,
            "page_size": page_size,
        },
    }
