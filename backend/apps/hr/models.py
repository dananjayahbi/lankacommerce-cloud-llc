import uuid

from django.conf import settings
from django.db import models


class CommissionPayout(models.Model):
    """
    Records a bulk commission payout to a staff member for a defined period.
    Acts as the parent record that bundles multiple CommissionRecord rows.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.PROTECT,
        related_name="commission_payouts",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="commission_payouts",
    )
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    total_earned = models.DecimalField(max_digits=14, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)
    authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="authorized_payouts",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "user"]),
        ]
        ordering = ["-paid_at"]

    def __str__(self) -> str:
        return f"Payout to {self.user_id} — {self.total_earned}"


class CommissionRecord(models.Model):
    """
    Individual commission entry linked to a single sale.
    commission_rate is snapshotted at creation time; it does not change
    if the user's rate is later updated.
    Uses SET_NULL for commission_payout so records survive payout deletion.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.PROTECT,
        related_name="commission_records",
    )
    sale = models.ForeignKey(
        "pos.Sale",
        on_delete=models.PROTECT,
        related_name="commission_records",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="commission_records",
    )
    base_amount = models.DecimalField(max_digits=14, decimal_places=2)
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Snapshot of the user's commission rate at the time this record was created.",
    )
    earned_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        help_text="May be negative for returns.",
    )
    is_paid = models.BooleanField(default=False)
    commission_payout = models.ForeignKey(
        CommissionPayout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "user"]),
            models.Index(fields=["sale"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Commission {self.earned_amount} for sale {self.sale_id}"


class TimeClock(models.Model):
    """
    Time-clock record for a staff member's shift attendance.
    User.clocked_in_at is a denormalised mirror: update both atomically.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.PROTECT,
        related_name="time_clocks",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="time_clocks",
    )
    clocked_in_at = models.DateTimeField()
    clocked_out_at = models.DateTimeField(null=True, blank=True)
    shift = models.ForeignKey(
        "pos.Shift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="time_clocks",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "user"]),
            models.Index(fields=["shift"]),
        ]
        ordering = ["-clocked_in_at"]

    def __str__(self) -> str:
        return f"TimeClock {self.user_id} in={self.clocked_in_at}"
