"""
Inventory service layer for the catalog app.

Handles all stock quantity mutations with pessimistic row-level locking,
stock-take session lifecycle management, low-stock detection, and
inventory valuation.

All stock quantity changes go through ``adjust_stock`` — this is the
single authoritative path. Stock movements are the audit log for quantity
changes; the AuditLog model covers entity lifecycle events only.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from apps.catalog.exceptions import (
    ConflictError,
    InsufficientStockError,
    NotFoundError,
)
from apps.catalog.models import (
    ProductVariant,
    StockMovement,
    StockMovementReason,
    StockTakeItem,
    StockTakeSession,
    StockTakeStatus,
)

# Imported lazily inside functions to avoid circular imports
# from apps.notifications.models import Notification, NotificationType


# ═════════════════════════════════════════════════════════════════
# Core stock adjustment
# ═════════════════════════════════════════════════════════════════

def adjust_stock(
    tenant_id: Any,
    variant_id: Any,
    actor_id: Any,
    quantity_delta: int,
    reason: str,
    *,
    note: str | None = None,
    reference_id: Any = None,
) -> tuple[ProductVariant, StockMovement, bool]:
    """Adjust the stock quantity of a single variant.

    Uses ``select_for_update()`` to acquire a row-level exclusive lock,
    preventing concurrent writes to the same variant row.

    Returns a 3-tuple: (variant, movement, low_stock_triggered).

    Raises:
        NotFoundError: if the variant does not exist for this tenant.
        InsufficientStockError: if the adjustment would bring stock below 0.
    """
    with transaction.atomic():
        try:
            variant = ProductVariant.objects.select_for_update().get(
                pk=variant_id, tenant_id=tenant_id, deleted_at__isnull=True
            )
        except ProductVariant.DoesNotExist:
            raise NotFoundError(f"Variant {variant_id} not found.")

        quantity_before = variant.stock_quantity
        quantity_after = quantity_before + quantity_delta

        if quantity_after < 0:
            raise InsufficientStockError(
                f"Insufficient stock: {quantity_before} on hand, "
                f"adjustment of {quantity_delta} requested."
            )

        variant.stock_quantity = quantity_after
        variant.save(update_fields=["stock_quantity", "updated_at"])

        # Route the loose reference UUID to the correct field
        sale_id = None
        purchase_order_id = None
        stock_take_session_id = None
        if reason == StockMovementReason.SALE:
            sale_id = reference_id
        elif reason == StockMovementReason.PURCHASE_RECEIPT:
            purchase_order_id = reference_id
        elif reason == StockMovementReason.STOCK_TAKE_ADJUSTMENT:
            stock_take_session_id = reference_id

        movement = StockMovement.objects.create(
            tenant_id=tenant_id,
            variant=variant,
            reason=reason,
            quantity_delta=quantity_delta,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            actor_id=actor_id,
            note=note,
            sale_id=sale_id,
            purchase_order_id=purchase_order_id,
            stock_take_session_id=stock_take_session_id,
        )

        low_stock_triggered = (
            variant.low_stock_threshold > 0
            and quantity_after <= variant.low_stock_threshold
        )

    # Create low-stock notifications (best-effort; never propagate failures)
    if low_stock_triggered:
        try:
            from apps.accounts.models import CustomUser, UserRole  # noqa: PLC0415
            from apps.notifications.models import Notification, NotificationType  # noqa: PLC0415

            recipients = CustomUser.objects.filter(
                tenant_id=tenant_id,
                role__in=[UserRole.OWNER, UserRole.MANAGER],
                is_active=True,
            ).values_list("id", flat=True)
            notifications = [
                Notification(
                    tenant_id=tenant_id,
                    recipient_id=recipient_id,
                    notification_type=NotificationType.LOW_STOCK_ALERT,
                    title=f"Low stock: {variant.sku}",
                    body=(
                        f"{variant.sku} has fallen to {quantity_after} units, "
                        f"below the threshold of {variant.low_stock_threshold} units."
                    ),
                    related_entity_type="ProductVariant",
                    related_entity_id=str(variant.id),
                )
                for recipient_id in recipients
            ]
            Notification.objects.bulk_create(notifications, ignore_conflicts=True)
        except Exception:  # noqa: BLE001
            pass  # Notification failures must never break stock adjustments

    return variant, movement, low_stock_triggered
    batch is rolled back.
    """
    results: list[tuple[ProductVariant, StockMovement]] = []
    with transaction.atomic():
        for adj in adjustments:
            result = adjust_stock(
                tenant_id=tenant_id,
                variant_id=adj["variant_id"],
                actor_id=actor_id,
                quantity_delta=adj["quantity_delta"],
                reason=adj["reason"],
                note=adj.get("note"),
                reference_id=adj.get("reference_id"),
            )
            results.append(result)
    return results


# ═════════════════════════════════════════════════════════════════
# Stock movement queries
# ═════════════════════════════════════════════════════════════════

def get_stock_movements(
    tenant_id: Any,
    filters: dict | None = None,
    *,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Return a paginated, filtered list of stock movements.

    Returns a dict: ``{"results": [...], "total": int}``.
    """
    filters = filters or {}
    qs = StockMovement.objects.filter(tenant_id=tenant_id)

    if "variant_id" in filters:
        qs = qs.filter(variant_id=filters["variant_id"])
    if "reason" in filters:
        qs = qs.filter(reason=filters["reason"])
    if "actor_id" in filters:
        qs = qs.filter(actor_id=filters["actor_id"])
    if "date_from" in filters:
        qs = qs.filter(created_at__gte=filters["date_from"])
    if "date_to" in filters:
        qs = qs.filter(created_at__lte=filters["date_to"])

    qs = qs.select_related("variant", "actor").order_by("-created_at")
    total = qs.count()
    offset = (page - 1) * page_size
    results = list(qs[offset : offset + page_size])
    return {"results": results, "total": total}


# ═════════════════════════════════════════════════════════════════
# Stock take session — creation & item management
# ═════════════════════════════════════════════════════════════════

def create_stock_take_session(
    tenant_id: Any,
    actor_id: Any,
    *,
    category_id: Any = None,
) -> StockTakeSession:
    """Create a new IN_PROGRESS stock take session."""
    return StockTakeSession.objects.create(
        tenant_id=tenant_id,
        initiated_by_id=actor_id,
        category_id=category_id,
        status=StockTakeStatus.IN_PROGRESS,
    )


def add_stock_take_item(
    tenant_id: Any,
    session_id: Any,
    variant_id: Any,
) -> StockTakeItem:
    """Add a variant to an IN_PROGRESS stock take session.

    Captures the current ``stock_quantity`` as ``system_quantity``.
    Raises ConflictError if the session is not IN_PROGRESS.
    """
    try:
        session = StockTakeSession.objects.get(
            pk=session_id, tenant_id=tenant_id
        )
    except StockTakeSession.DoesNotExist:
        raise NotFoundError(f"Stock take session {session_id} not found.")

    if session.status != StockTakeStatus.IN_PROGRESS:
        raise ConflictError("Items can only be added to an IN_PROGRESS session.")

    try:
        variant = ProductVariant.objects.get(
            pk=variant_id, tenant_id=tenant_id, deleted_at__isnull=True
        )
    except ProductVariant.DoesNotExist:
        raise NotFoundError(f"Variant {variant_id} not found.")

    return StockTakeItem.objects.create(
        session=session,
        variant=variant,
        system_quantity=variant.stock_quantity,
        counted_quantity=None,
        discrepancy=None,
    )


def update_stock_take_item(
    tenant_id: Any,
    session_id: Any,
    item_id: Any,
    counted_quantity: int,
) -> StockTakeItem:
    """Record the physical count for a stock take item."""
    try:
        item = StockTakeItem.objects.select_related("session").get(
            pk=item_id, session_id=session_id
        )
    except StockTakeItem.DoesNotExist:
        raise NotFoundError(f"Stock take item {item_id} not found.")

    if item.session.tenant_id != tenant_id:
        raise NotFoundError(f"Stock take item {item_id} not found.")

    if item.session.status != StockTakeStatus.IN_PROGRESS:
        raise ConflictError("Items can only be updated in an IN_PROGRESS session.")

    item.counted_quantity = counted_quantity
    item.discrepancy = counted_quantity - item.system_quantity
    item.save(update_fields=["counted_quantity", "discrepancy", "updated_at"])
    return item


# ═════════════════════════════════════════════════════════════════
# Stock take session — lifecycle transitions
# ═════════════════════════════════════════════════════════════════

def complete_stock_take_session(
    tenant_id: Any,
    session_id: Any,
    actor_id: Any,
) -> StockTakeSession:
    """Transition a session from IN_PROGRESS to PENDING_APPROVAL.

    Raises ValidationError if any items have not yet been counted.
    """
    try:
        session = StockTakeSession.objects.get(
            pk=session_id, tenant_id=tenant_id
        )
    except StockTakeSession.DoesNotExist:
        raise NotFoundError(f"Stock take session {session_id} not found.")

    if session.status != StockTakeStatus.IN_PROGRESS:
        raise ConflictError("Only IN_PROGRESS sessions can be completed.")

    uncounted = list(
        session.items.filter(counted_quantity__isnull=True)
        .select_related("variant")
        .values_list("variant__sku", flat=True)
    )
    if uncounted:
        raise ValidationError(
            f"The following variants have not been counted: {', '.join(uncounted)}"
        )

    session.status = StockTakeStatus.PENDING_APPROVAL
    session.completed_at = timezone.now()
    session.save(update_fields=["status", "completed_at"])
    try:
        from apps.catalog.services.audit_service import log_audit_event, AuditAction
        log_audit_event(
            tenant_id=tenant_id, actor_id=actor_id,
            action=AuditAction.STOCK_TAKE_SUBMITTED,
            resource_type="StockTakeSession", resource_id=session.id,
        )
    except Exception:  # noqa: BLE001
        pass
    return session


def approve_stock_take(
    tenant_id: Any,
    session_id: Any,
    actor_id: Any,
    *,
    notes: str | None = None,
) -> StockTakeSession:
    """Approve a PENDING_APPROVAL session and apply stock adjustments.

    Only items with a non-zero discrepancy generate StockMovement records.
    """
    try:
        session = StockTakeSession.objects.get(
            pk=session_id, tenant_id=tenant_id
        )
    except StockTakeSession.DoesNotExist:
        raise NotFoundError(f"Stock take session {session_id} not found.")

    if session.status != StockTakeStatus.PENDING_APPROVAL:
        raise ConflictError("Only PENDING_APPROVAL sessions can be approved.")

    items_with_discrepancy = session.items.filter(discrepancy__isnull=False).exclude(
        discrepancy=0
    )

    with transaction.atomic():
        for item in items_with_discrepancy:
            adjust_stock(
                tenant_id=tenant_id,
                variant_id=item.variant_id,
                actor_id=actor_id,
                quantity_delta=item.discrepancy,
                reason=StockMovementReason.STOCK_TAKE_ADJUSTMENT,
                reference_id=session.id,
            )

        session.status = StockTakeStatus.APPROVED
        session.approved_by_id = actor_id
        session.approved_at = timezone.now()
        if notes is not None:
            session.notes = notes
        session.save(update_fields=["status", "approved_by_id", "approved_at", "notes"])
    try:
        from apps.catalog.services.audit_service import log_audit_event, AuditAction
        log_audit_event(
            tenant_id=tenant_id, actor_id=actor_id,
            action=AuditAction.STOCK_TAKE_APPROVED,
            resource_type="StockTakeSession", resource_id=session.id,
        )
    except Exception:  # noqa: BLE001
        pass
    return session


def reject_stock_take(
    tenant_id: Any,
    session_id: Any,
    actor_id: Any,
    notes: str,
) -> StockTakeSession:
    """Reject a PENDING_APPROVAL session without applying any adjustments."""
    try:
        session = StockTakeSession.objects.get(
            pk=session_id, tenant_id=tenant_id
        )
    except StockTakeSession.DoesNotExist:
        raise NotFoundError(f"Stock take session {session_id} not found.")

    if session.status != StockTakeStatus.PENDING_APPROVAL:
        raise ConflictError("Only PENDING_APPROVAL sessions can be rejected.")

    session.status = StockTakeStatus.REJECTED
    session.approved_by_id = actor_id
    session.approved_at = timezone.now()
    session.notes = notes
    session.save(update_fields=["status", "approved_by_id", "approved_at", "notes"])
    try:
        from apps.catalog.services.audit_service import log_audit_event, AuditAction
        log_audit_event(
            tenant_id=tenant_id, actor_id=actor_id,
            action=AuditAction.STOCK_TAKE_REJECTED,
            resource_type="StockTakeSession", resource_id=session.id,
            after={"rejection_reason": notes},
        )
    except Exception:  # noqa: BLE001
        pass
    return session


# ═════════════════════════════════════════════════════════════════
# Low-stock detection
# ═════════════════════════════════════════════════════════════════

def get_low_stock_variants(
    tenant_id: Any,
    *,
    category_id: Any = None,
):
    """Return variants whose stock_quantity <= low_stock_threshold.

    Uses a database-level field-to-field comparison via ``F()`` expressions
    — no Python-side filtering.
    """
    qs = ProductVariant.objects.filter(
        tenant_id=tenant_id,
        deleted_at__isnull=True,
        stock_quantity__lte=F("low_stock_threshold"),
    ).select_related("product", "product__category")

    if category_id is not None:
        qs = qs.filter(product__category_id=category_id)

    return qs


# ═════════════════════════════════════════════════════════════════
# Stock valuation
# ═════════════════════════════════════════════════════════════════

def get_stock_valuation(
    tenant_id: Any,
    *,
    category_id: Any = None,
) -> Decimal:
    """Return the total cost value of all on-hand inventory.

    Computed entirely in the database:
        SUM(cost_price * stock_quantity)

    Returns ``Decimal('0.00')`` when no matching variants exist.
    """
    qs = ProductVariant.objects.filter(
        tenant_id=tenant_id, deleted_at__isnull=True
    )
    if category_id is not None:
        qs = qs.filter(product__category_id=category_id)

    result = qs.aggregate(total_cost=Sum(F("cost_price") * F("stock_quantity")))
    total = result.get("total_cost")
    return total if total is not None else Decimal("0.00")
