"""
Commission service layer.

Functions here are side-effect helpers — if they fail, the calling sale
or return is NOT rolled back. All failures are logged and silently suppressed
at the call site.
"""

import logging
import math
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum, Count, Q

from apps.hr.models import CommissionRecord, CommissionPayout

logger = logging.getLogger("hr.commission_service")


def create_commission_record(
    tenant_id,
    sale_id,
    user_id,
    base_amount: Decimal,
    commission_rate: Decimal,
):
    """
    Create a positive CommissionRecord for a completed sale.
    Returns None (silently) if commission_rate is None.
    """
    if commission_rate is None:
        return None

    if commission_rate < Decimal("0") or commission_rate > Decimal("100"):
        raise ValueError(
            f"commission_rate must be between 0 and 100, got {commission_rate}"
        )

    if base_amount < Decimal("0"):
        raise ValueError(
            "base_amount must not be negative for a standard commission record. "
            "Use create_negative_commission_record for returns."
        )

    earned_amount = (base_amount * commission_rate / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    record = CommissionRecord.objects.create(
        tenant_id=tenant_id,
        sale_id=sale_id,
        user_id=user_id,
        base_amount=base_amount,
        commission_rate=commission_rate,
        earned_amount=earned_amount,
        is_paid=False,
    )
    return record


def create_negative_commission_record(return_id):
    """
    Create a negative CommissionRecord to offset commission earned on the original sale.
    Returns None if no salesperson or no commission rate is configured.
    """
    from apps.pos.models import Return  # lazy import to avoid circular imports
    from django.contrib.auth import get_user_model

    User = get_user_model()

    return_obj = Return.objects.select_related("sale").get(id=return_id)

    if return_obj.sale.salesperson_id is None:
        return None

    salesperson = (
        User.objects.filter(id=return_obj.sale.salesperson_id)
        .values("commission_rate")
        .first()
    )

    if salesperson is None or salesperson["commission_rate"] is None:
        return None

    commission_rate = salesperson["commission_rate"]
    negative_base = -return_obj.refund_amount
    negative_earned = (negative_base * commission_rate / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    record = CommissionRecord.objects.create(
        tenant_id=return_obj.tenant_id,
        sale_id=return_obj.sale_id,
        user_id=return_obj.sale.salesperson_id,
        base_amount=negative_base,
        commission_rate=commission_rate,
        earned_amount=negative_earned,
        is_paid=False,
    )
    return record


def get_commissions_for_user(tenant_id, user_id, page=1, page_size=20):
    """
    Paginated list of CommissionRecords for a user.
    Annotates each record with is_credit (bool).
    """
    qs = (
        CommissionRecord.objects.filter(tenant_id=tenant_id, user_id=user_id)
        .select_related("sale")
        .order_by("-created_at")
    )

    total_count = qs.count()
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
    offset = (page - 1) * page_size
    records = list(qs[offset : offset + page_size])

    for record in records:
        record.is_credit = record.earned_amount >= Decimal("0")

    return {
        "records": records,
        "total_count": total_count,
        "total_pages": total_pages,
        "page": page,
        "page_size": page_size,
    }


def get_unpaid_total(tenant_id, user_id):
    """
    Returns the sum and count of unpaid commission records for a user.
    Never returns None for total — returns Decimal('0.00') when no records exist.
    """
    result = CommissionRecord.objects.filter(
        tenant_id=tenant_id, user_id=user_id, is_paid=False
    ).aggregate(total=Sum("earned_amount"), count=Count("id"))

    return {
        "total": result["total"] if result["total"] is not None else Decimal("0.00"),
        "count": result["count"],
    }


def create_commission_payout(
    tenant_id, user_id, period_start, period_end, authorized_by_id
):
    """
    Create a CommissionPayout for unpaid records within a period.
    Uses select_for_update to prevent concurrent double-payout.
    Raises ValueError if no unpaid records found in the period.
    """
    with transaction.atomic():
        records = list(
            CommissionRecord.objects.filter(
                tenant_id=tenant_id,
                user_id=user_id,
                is_paid=False,
                created_at__gte=period_start,
                created_at__lte=period_end,
            ).select_for_update()
        )

        if len(records) == 0:
            raise ValueError(
                "No unpaid commission records found for the specified period."
            )

        total_earned = sum(
            (r.earned_amount for r in records), Decimal("0")
        )

        payout = CommissionPayout.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            total_earned=total_earned,
            authorized_by_id=authorized_by_id,
        )

        record_ids = [r.id for r in records]
        CommissionRecord.objects.filter(id__in=record_ids).update(
            is_paid=True, commission_payout=payout
        )

    return payout


def get_commission_summary_for_tenant(tenant_id, period_start, period_end):
    """
    Per-staff commission summary for a tenant within a date range.
    Used by the Commission Reports page.
    """
    from django.db.models import Count
    from django.contrib.auth import get_user_model

    User = get_user_model()

    records_qs = (
        CommissionRecord.objects.filter(
            tenant_id=tenant_id,
            created_at__gte=period_start,
            created_at__lte=period_end,
        )
        .values("user_id")
        .annotate(
            total_earned=Sum("earned_amount"),
            unpaid_total=Sum("earned_amount", filter=Q(is_paid=False)),
            unpaid_count=Count("id", filter=Q(is_paid=False)),
        )
    )

    user_ids = [r["user_id"] for r in records_qs]
    users = {
        u.id: u
        for u in User.objects.filter(id__in=user_ids).only("id", "name", "role")
    }

    merged = []
    for entry in records_qs:
        user = users.get(entry["user_id"])
        row = dict(entry)
        row["user_name"] = user.name if user else "Unknown"
        row["user_role"] = user.role if user else ""
        # null-guard aggregation results
        if row["total_earned"] is None:
            row["total_earned"] = Decimal("0.00")
        if row["unpaid_total"] is None:
            row["unpaid_total"] = Decimal("0.00")
        merged.append(row)

    merged.sort(key=lambda r: r["total_earned"], reverse=True)
    return merged
