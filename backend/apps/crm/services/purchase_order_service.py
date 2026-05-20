from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Count, F

from apps.catalog.models import ProductVariant
from apps.catalog.services.inventory_service import adjust_stock
from apps.crm.models import POStatus, PurchaseOrder, PurchaseOrderLine, Supplier


def create_po(tenant_id, created_by_id, input_data: dict) -> PurchaseOrder:
    """Create a new Purchase Order with one or more lines."""
    lines = input_data.get("lines", [])
    if len(lines) == 0:
        raise ValueError("A purchase order must have at least one line")

    try:
        supplier = Supplier.objects.get(id=input_data["supplier_id"])
    except Supplier.DoesNotExist:
        raise

    if supplier.tenant_id != tenant_id:
        raise PermissionError("Supplier does not belong to this tenant")

    processed_lines = []
    total_amount = Decimal("0")
    for line in lines:
        variant = ProductVariant.objects.select_related("product").get(id=line["variant_id"])
        product_name_snapshot = variant.product.name
        variant_description_snapshot = variant.description or ""
        line_amount = Decimal(str(line["ordered_qty"])) * Decimal(str(line["expected_cost_price"]))
        total_amount += line_amount
        processed_lines.append((line, product_name_snapshot, variant_description_snapshot))

    total_amount = total_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    po = PurchaseOrder.objects.create(
        tenant_id=tenant_id,
        supplier=supplier,
        created_by_id=created_by_id,
        expected_delivery_date=input_data.get("expected_delivery_date"),
        notes=input_data.get("notes", ""),
        total_amount=total_amount,
        status=POStatus.DRAFT,
    )

    PurchaseOrderLine.objects.bulk_create(
        [
            PurchaseOrderLine(
                purchase_order=po,
                variant_id=line["variant_id"],
                product_name_snapshot=product_name_snapshot,
                variant_description_snapshot=variant_description_snapshot,
                ordered_qty=line["ordered_qty"],
                expected_cost_price=Decimal(str(line["expected_cost_price"])),
            )
            for line, product_name_snapshot, variant_description_snapshot in processed_lines
        ]
    )

    return PurchaseOrder.objects.prefetch_related("lines").get(id=po.id)


def get_po_by_id(tenant_id, po_id) -> PurchaseOrder:
    """Fetch a single PO with all related data. Raises DoesNotExist for 404 mapping."""
    return (
        PurchaseOrder.objects.select_related("supplier", "created_by", "tenant")
        .prefetch_related("lines__variant__product")
        .get(id=po_id, tenant_id=tenant_id)
    )


def get_pos(
    tenant_id,
    supplier_id=None,
    status=None,
    from_date=None,
    to_date=None,
    page=1,
    limit=20,
) -> dict:
    """Return a paginated list of purchase orders."""
    limit = min(limit, 100)
    qs = PurchaseOrder.objects.filter(tenant_id=tenant_id).select_related("supplier").annotate(
        lines_count=Count("lines")
    )

    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)
    if status:
        qs = qs.filter(status=status)
    if from_date:
        qs = qs.filter(created_at__date__gte=from_date)
    if to_date:
        qs = qs.filter(created_at__date__lte=to_date)

    qs = qs.order_by("-created_at")
    total = qs.count()
    offset = (page - 1) * limit
    purchase_orders = list(qs[offset : offset + limit])
    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "purchase_orders": purchase_orders,
        "total": total,
        "page": page,
        "total_pages": total_pages,
    }


def update_po_status(tenant_id, po_id, new_status: str) -> PurchaseOrder:
    """Transition a PO to a new status, enforcing allowed transitions."""
    ALLOWED_TRANSITIONS = {
        POStatus.DRAFT: [POStatus.SENT, POStatus.CANCELLED],
        POStatus.SENT: [POStatus.CANCELLED],
    }

    po = PurchaseOrder.objects.get(id=po_id, tenant_id=tenant_id)

    if po.status not in ALLOWED_TRANSITIONS or new_status not in ALLOWED_TRANSITIONS.get(po.status, []):
        raise ValueError(
            f"Cannot transition a purchase order from '{po.status}' to '{new_status}'"
        )

    PurchaseOrder.objects.filter(id=po_id).update(status=new_status)
    return PurchaseOrder.objects.get(id=po_id)


def cancel_po(tenant_id, po_id) -> PurchaseOrder:
    """Cancel a DRAFT or SENT purchase order."""
    po = PurchaseOrder.objects.get(id=po_id, tenant_id=tenant_id)
    if po.status not in [POStatus.DRAFT, POStatus.SENT]:
        raise ValueError("Only DRAFT or SENT purchase orders can be cancelled.")
    return update_po_status(tenant_id, po_id, POStatus.CANCELLED)


def receive_po_lines(tenant_id, po_id, received_lines: list, actor_id) -> dict:
    """
    Record goods received for a list of PO lines.
    Adjusts stock, updates line received quantities, and transitions PO status.
    Runs entirely within a single atomic transaction with row-level locking.
    """
    with transaction.atomic():
        po = PurchaseOrder.objects.select_for_update().get(id=po_id, tenant_id=tenant_id)

        if po.status in [POStatus.CANCELLED, POStatus.RECEIVED]:
            raise ValueError(
                f"Cannot receive goods for a purchase order with status '{po.status}'"
            )

        cost_prices_changed = []

        for entry in received_lines:
            line = PurchaseOrderLine.objects.select_for_update().select_related("variant").get(
                id=entry["line_id"], purchase_order_id=po_id
            )

            if entry["received_qty"] <= 0:
                raise ValueError(
                    f"Received quantity must be positive for {line.product_name_snapshot}"
                )

            remaining = line.ordered_qty - line.received_qty
            if entry["received_qty"] > remaining:
                raise ValueError(
                    f"Cannot receive more than the ordered quantity for {line.product_name_snapshot}. "
                    f"Ordered: {line.ordered_qty}, Already received: {line.received_qty}, "
                    f"Requested: {entry['received_qty']}"
                )

            adjust_stock(
                tenant_id=tenant_id,
                variant_id=line.variant_id,
                actor_id=actor_id,
                quantity_delta=entry["received_qty"],
                reason="PURCHASE_RECEIVED",
            )

            updated_received_qty = line.received_qty + entry["received_qty"]
            is_fully_received = updated_received_qty >= line.ordered_qty
            effective_actual_cost = entry.get("actual_cost_price") or line.actual_cost_price

            PurchaseOrderLine.objects.filter(id=line.id).update(
                received_qty=F("received_qty") + entry["received_qty"],
                is_fully_received=is_fully_received,
                actual_cost_price=effective_actual_cost,
            )

            if entry.get("actual_cost_price"):
                actual_cost = Decimal(str(entry["actual_cost_price"]))
                if actual_cost != line.variant.cost_price:
                    old_cost = line.variant.cost_price
                    ProductVariant.objects.filter(id=line.variant_id).update(cost_price=actual_cost)
                    cost_prices_changed.append(
                        {
                            "variant_id": str(line.variant_id),
                            "variant_description": line.variant_description_snapshot,
                            "old_cost_price": str(old_cost),
                            "new_cost_price": str(actual_cost),
                        }
                    )

        all_lines = PurchaseOrderLine.objects.filter(purchase_order_id=po_id)
        if all(line.is_fully_received for line in all_lines):
            new_status = POStatus.RECEIVED
        elif any(line.received_qty > 0 for line in all_lines):
            new_status = POStatus.PARTIALLY_RECEIVED
        else:
            new_status = po.status

        PurchaseOrder.objects.filter(id=po_id).update(status=new_status)

        return {
            "updated_po": PurchaseOrder.objects.prefetch_related("lines").get(id=po_id),
            "cost_prices_changed": cost_prices_changed,
        }
