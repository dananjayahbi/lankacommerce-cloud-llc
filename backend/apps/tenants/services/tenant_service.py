"""
Tenant service layer — all tenant business logic lives here.

Views call these functions and stay thin (HTTP parsing + serialisation only).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from django.db.models import Q

from apps.accounts.constants.permissions import ROLE_PERMISSIONS
from apps.accounts.models import AuditLog, CustomUser
from apps.tenants.models import Plan, Subscription, SubscriptionStatus, Tenant, TenantStatus


# ─────────────────────────────────────────────────────────────────
# Read helpers
# ─────────────────────────────────────────────────────────────────

def get_all_tenants(
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Tuple[QuerySet, int]:
    """Return a paginated queryset of non-deleted tenants and the total count."""
    qs = Tenant.objects.filter(deleted_at__isnull=True).prefetch_related("subscriptions")

    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

    if status:
        qs = qs.filter(status=status)

    qs = qs.order_by("-created_at")

    total = qs.count()
    offset = (page - 1) * limit
    page_qs = qs[offset : offset + limit]

    return page_qs, total


def get_tenant_by_id(tenant_id: Any) -> Optional[Tenant]:
    """
    Return a Tenant instance with prefetched subscriptions and users,
    or None if not found / soft-deleted.
    """
    from django.db.models import Prefetch

    try:
        return (
            Tenant.objects.prefetch_related(
                Prefetch(
                    "subscriptions",
                    queryset=Subscription.objects.select_related("plan").order_by("-created_at"),
                ),
                Prefetch(
                    "users",
                    queryset=CustomUser.objects.order_by("created_at")[:5],
                    to_attr="recent_users",
                ),
            )
            .get(id=tenant_id, deleted_at__isnull=True)
        )
    except Tenant.DoesNotExist:
        return None


def get_active_tenant_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """
    Return minimal {id, status} dict for a non-deleted tenant by slug,
    or None if not found. Optimised for high-frequency middleware calls.
    """
    try:
        return Tenant.objects.filter(deleted_at__isnull=True).values("id", "status").get(slug=slug)
    except Tenant.DoesNotExist:
        return None


# ─────────────────────────────────────────────────────────────────
# Write operations
# ─────────────────────────────────────────────────────────────────

@transaction.atomic
def create_tenant(
    store_name: str,
    slug: str,
    owner_email: str,
    hashed_password: str,
    timezone_name: str,
    currency: str,
    vat_rate: Decimal,
    sscl_rate: Decimal,
    plan_id: Any,
) -> Tenant:
    """
    Atomically create a Tenant, its owner CustomUser, and an initial Subscription.
    Raises ValueError on validation failures or duplicate slug.
    """
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        raise ValueError("Plan not found.")

    if not plan.is_active:
        raise ValueError("Selected plan is not available.")

    try:
        tenant = Tenant.objects.create(
            name=store_name,
            slug=slug,
            status=TenantStatus.ACTIVE,
            settings={
                "currency": currency,
                "timezone": timezone_name,
                "vatRate": float(vat_rate),
                "ssclRate": float(sscl_rate),
                "receiptFooter": "",
            },
        )
    except IntegrityError:
        raise ValueError("A tenant with this slug already exists.")

    CustomUser.objects.create(
        email=owner_email,
        password=hashed_password,
        role="OWNER",
        is_active=True,
        tenant=tenant,
        permissions_list=ROLE_PERMISSIONS.get("OWNER", []),
    )

    now = datetime.now(tz=timezone.utc)
    period_end = now + timedelta(days=30)

    Subscription.objects.create(
        tenant=tenant,
        plan=plan,
        status=SubscriptionStatus.ACTIVE,
        current_period_start=now,
        current_period_end=period_end,
        next_billing_date=period_end,
    )

    return tenant


@transaction.atomic
def update_tenant_status(
    tenant_id: Any,
    new_status: str,
    actor_id: Any,
    grace_ends_at: Optional[datetime] = None,
) -> Tenant:
    """
    Update a tenant's status with a row-level lock and write an AuditLog record.
    Raises ValueError if the tenant does not exist.
    """
    try:
        tenant = Tenant.objects.select_for_update().get(
            id=tenant_id, deleted_at__isnull=True
        )
    except Tenant.DoesNotExist:
        raise ValueError("Tenant not found.")

    old_status = tenant.status
    tenant.status = new_status
    if grace_ends_at is not None:
        tenant.grace_ends_at = grace_ends_at

    tenant.save(update_fields=["status", "grace_ends_at", "updated_at"])

    AuditLog.objects.create(
        actor_id=actor_id,
        action="TENANT_STATUS_CHANGED",
        entity_type="Tenant",
        entity_id=tenant.id,
        before={"status": old_status},
        after={"status": new_status},
    )

    return tenant


# ─────────────────────────────────────────────────────────────────
# Convenience status transition helpers
# ─────────────────────────────────────────────────────────────────

def suspend_tenant(tenant_id: Any, actor_id: Any) -> Tenant:
    """Transition a tenant to SUSPENDED status."""
    return update_tenant_status(tenant_id, TenantStatus.SUSPENDED, actor_id)


def reactivate_tenant(tenant_id: Any, actor_id: Any) -> Tenant:
    """Transition a SUSPENDED or GRACE_PERIOD tenant back to ACTIVE."""
    tenant = Tenant.objects.filter(deleted_at__isnull=True).values("status").get(id=tenant_id)
    if tenant["status"] == TenantStatus.ACTIVE:
        raise ValueError("Tenant is already active.")
    return update_tenant_status(tenant_id, TenantStatus.ACTIVE, actor_id)


def trigger_grace_period(tenant_id: Any, actor_id: Any, grace_days: int = 14) -> Tenant:
    """Transition an ACTIVE tenant to GRACE_PERIOD status."""
    grace_ends_at = datetime.now(tz=timezone.utc) + timedelta(days=grace_days)
    return update_tenant_status(
        tenant_id, TenantStatus.GRACE_PERIOD, actor_id, grace_ends_at=grace_ends_at
    )
