"""Supplier service functions."""
from __future__ import annotations

import math
from typing import Any

from django.db.models import Count, Q

from apps.crm.models import Supplier
from apps.crm.validators import validate_phone


def create_supplier(tenant_id: Any, data: dict) -> Supplier:
    phone = validate_phone(data["phone"])
    data["phone"] = phone
    if not data.get("whatsapp_number"):
        data["whatsapp_number"] = phone
    return Supplier.objects.create(tenant_id=tenant_id, **data)


def update_supplier(tenant_id: Any, supplier_id: Any, data: dict) -> Supplier:
    supplier = Supplier.objects.get(id=supplier_id, tenant_id=tenant_id)
    if "phone" in data:
        data["phone"] = validate_phone(data["phone"])
    Supplier.objects.filter(id=supplier_id).update(**data)
    return Supplier.objects.get(id=supplier_id)


def get_suppliers(
    tenant_id: Any,
    search: str | None = None,
    include_archived: bool = False,
    page: int = 1,
    limit: int = 20,
) -> dict:
    limit = min(limit, 100)
    qs = Supplier.objects.filter(tenant_id=tenant_id)
    if not include_archived:
        qs = qs.filter(is_active=True)
    if search:
        term = search.strip()
        qs = qs.filter(
            Q(name__icontains=term) | Q(contact_name__icontains=term)
        )
    qs = qs.annotate(purchase_orders_count=Count("purchase_orders"))
    total = qs.count()
    offset = (page - 1) * limit
    suppliers = list(qs.order_by("name")[offset : offset + limit])
    return {
        "suppliers": suppliers,
        "total": total,
        "page": page,
        "total_pages": max(1, math.ceil(total / limit)),
    }


def get_supplier_by_id(tenant_id: Any, supplier_id: Any) -> Supplier:
    return (
        Supplier.objects.annotate(purchase_orders_count=Count("purchase_orders"))
        .get(id=supplier_id, tenant_id=tenant_id)
    )


def archive_supplier(tenant_id: Any, supplier_id: Any) -> Supplier:
    Supplier.objects.get(id=supplier_id, tenant_id=tenant_id)  # ownership check
    Supplier.objects.filter(id=supplier_id, tenant_id=tenant_id).update(is_active=False)
    return Supplier.objects.get(id=supplier_id)
