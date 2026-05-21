"""Customer service layer — CRM.

All public functions are the single source of truth for customer data mutations
and queries. Transactional helpers (redeem_credit, add_to_spend_total) are
designed to be composed inside an enclosing transaction.atomic() block in the
sale pipeline.
"""

from __future__ import annotations

from decimal import Decimal
from math import ceil
from typing import Any

from django.db.models import F, Q

from apps.crm.models import Customer

# Writable fields accepted from external callers
_WRITABLE_FIELDS = {"name", "phone", "email", "gender", "birthday", "tags", "notes"}


# ──────────────────────────────────────────────────────────────────
# Private helpers
# ──────────────────────────────────────────────────────────────────


def _assert_customer_belongs_to_tenant(tenant_id: Any, customer_id: Any) -> None:
    """Raise Customer.DoesNotExist if the customer is not owned by this tenant."""
    exists = Customer.objects.filter(
        id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True
    ).exists()
    if not exists:
        raise Customer.DoesNotExist(
            f"Customer {customer_id} not found for tenant {tenant_id}"
        )


# ──────────────────────────────────────────────────────────────────
# create_customer
# ──────────────────────────────────────────────────────────────────


def create_customer(tenant_id: Any, data: dict) -> Customer:
    phone = data.get("phone", "").strip()
    if Customer.objects.filter(
        tenant_id=tenant_id, phone=phone, deleted_at__isnull=True
    ).exists():
        raise ValueError("A customer with this phone number already exists")

    filtered = {k: v for k, v in data.items() if k in _WRITABLE_FIELDS}
    filtered["phone"] = phone
    return Customer.objects.create(tenant_id=tenant_id, **filtered)


# ──────────────────────────────────────────────────────────────────
# update_customer
# ──────────────────────────────────────────────────────────────────


def update_customer(tenant_id: Any, customer_id: Any, data: dict) -> Customer:
    _assert_customer_belongs_to_tenant(tenant_id, customer_id)

    if "phone" in data:
        phone = data["phone"].strip()
        if Customer.objects.filter(
            tenant_id=tenant_id, phone=phone, deleted_at__isnull=True
        ).exclude(id=customer_id).exists():
            raise ValueError("A customer with this phone number already exists")
        data = dict(data)
        data["phone"] = phone

    allowed = {k: v for k, v in data.items() if k in _WRITABLE_FIELDS}
    Customer.objects.filter(id=customer_id).update(**allowed)
    return Customer.objects.get(id=customer_id)


# ──────────────────────────────────────────────────────────────────
# get_customer_by_id
# ──────────────────────────────────────────────────────────────────


def get_customer_by_id(tenant_id: Any, customer_id: Any) -> Customer:
    customer = (
        Customer.objects.select_related("tenant")
        .prefetch_related("sales__lines", "sales__payments")
        .get(id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True)
    )

    visit_count = customer.sales.filter(status="COMPLETED").count()
    avg_order_value = (
        customer.total_spend / Decimal(visit_count)
        if visit_count > 0
        else Decimal("0.00")
    )

    customer.visit_count = visit_count  # type: ignore[attr-defined]
    customer.avg_order_value = avg_order_value  # type: ignore[attr-defined]
    return customer


# ──────────────────────────────────────────────────────────────────
# get_customers
# ──────────────────────────────────────────────────────────────────


def get_customers(
    tenant_id: Any,
    search: str | None = None,
    tag: str | None = None,
    spend_min: Any = None,
    spend_max: Any = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    limit = min(limit, 100)
    offset = (max(1, page) - 1) * limit

    qs = Customer.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)

    if search:
        s = search.strip()
        qs = qs.filter(Q(name__icontains=s) | Q(phone__icontains=s))
    if tag:
        qs = qs.filter(tags__contains=[tag])
    if spend_min is not None:
        qs = qs.filter(total_spend__gte=Decimal(str(spend_min)))
    if spend_max is not None:
        qs = qs.filter(total_spend__lte=Decimal(str(spend_max)))

    total = qs.count()
    results = list(qs.order_by("-created_at")[offset : offset + limit])

    return {
        "customers": results,
        "total": total,
        "page": page,
        "total_pages": ceil(total / limit) if total > 0 else 1,
    }


# ──────────────────────────────────────────────────────────────────
# soft_delete_customer
# ──────────────────────────────────────────────────────────────────


def soft_delete_customer(tenant_id: Any, customer_id: Any) -> Customer:
    from django.utils import timezone

    _assert_customer_belongs_to_tenant(tenant_id, customer_id)
    Customer.objects.filter(id=customer_id).update(
        deleted_at=timezone.now(), is_active=False
    )
    return Customer.objects.get(id=customer_id)


# ──────────────────────────────────────────────────────────────────
# apply_credit_to_cart  (read-only pre-flight)
# ──────────────────────────────────────────────────────────────────


def apply_credit_to_cart(
    tenant_id: Any, customer_id: Any, requested_amount: Decimal
) -> dict:
    customer = Customer.objects.get(
        id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True
    )
    balance = customer.credit_balance
    if balance <= Decimal("0.00"):
        return {"valid_amount": Decimal("0.00"), "current_balance": balance}
    return {
        "valid_amount": min(requested_amount, balance),
        "current_balance": balance,
    }


# ──────────────────────────────────────────────────────────────────
# redeem_credit  (call inside transaction.atomic())
# ──────────────────────────────────────────────────────────────────


def redeem_credit(tenant_id: Any, customer_id: Any, amount: Decimal) -> Customer:
    if amount <= Decimal("0.00"):
        raise ValueError("Credit redemption amount must be positive")
    customer_before = Customer.objects.filter(id=customer_id, tenant_id=tenant_id).values("credit_balance").first()
    previous_balance = customer_before["credit_balance"] if customer_before else None
    Customer.objects.filter(id=customer_id, tenant_id=tenant_id).update(
        credit_balance=F("credit_balance") - amount
    )
    updated = Customer.objects.get(id=customer_id)
    # ── Audit side-effect ──────────────────────────────────────────
    try:
        import logging
        _logger = logging.getLogger(__name__)
        from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS
        create_audit_log(
            tenant_id=tenant_id,
            user_id="SYSTEM",
            action=AUDIT_ACTIONS["CUSTOMER_CREDIT_ADJUSTED"],
            entity_type="customer",
            entity_id=str(customer_id),
            previous_values={"credit_balance": float(previous_balance) if previous_balance is not None else None},
            new_values={"credit_balance": float(updated.credit_balance)},
        )
    except Exception:
        pass
    return updated


# ──────────────────────────────────────────────────────────────────
# add_to_spend_total  (call inside transaction.atomic())
# ──────────────────────────────────────────────────────────────────


def add_to_spend_total(tenant_id: Any, customer_id: Any, amount: Decimal) -> None:
    Customer.objects.filter(id=customer_id, tenant_id=tenant_id).update(
        total_spend=F("total_spend") + amount
    )
