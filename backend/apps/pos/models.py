import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    CARD = "CARD", "Card"
    SPLIT = "SPLIT", "Split"


class SaleStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    COMPLETED = "COMPLETED", "Completed"
    VOIDED = "VOIDED", "Voided"


class ShiftStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.CharField(max_length=50)
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="shifts",
    )
    status = models.CharField(
        max_length=10, choices=ShiftStatus.choices, default=ShiftStatus.OPEN
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_float = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant_id", "status"]),
            models.Index(fields=["cashier", "status"]),
            models.Index(fields=["tenant_id", "opened_at"]),
        ]

    def __str__(self) -> str:
        return f"Shift {self.id} [{self.status}]"


class Sale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.CharField(max_length=50)
    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name="sales",
    )
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cashier_sales",
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    change_given = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    authorizing_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authorized_sales",
    )
    payment_method = models.CharField(
        max_length=10, choices=PaymentMethod.choices, null=True, blank=True
    )
    status = models.CharField(
        max_length=10, choices=SaleStatus.choices, default=SaleStatus.OPEN
    )
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voided_sales",
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    whatsapp_receipt_sent_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant_id", "status", "created_at"]),
            models.Index(fields=["shift"]),
            models.Index(fields=["cashier"]),
        ]

    def __str__(self) -> str:
        return f"Sale {self.id} [{self.status}]"


class SaleLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="lines")
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.PROTECT,
        related_name="sale_lines",
    )
    product_name_snapshot = models.CharField(max_length=255)
    variant_description_snapshot = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()
    discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    line_total_before_discount = models.DecimalField(max_digits=12, decimal_places=2)
    line_total_after_discount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["sale"]),
            models.Index(fields=["variant"]),
        ]

    def __str__(self) -> str:
        return f"SaleLine {self.id} — {self.product_name_snapshot} x{self.quantity}"


class ShiftClosure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shift = models.OneToOneField(
        Shift,
        on_delete=models.PROTECT,
        related_name="closure",
    )
    closing_cash_count = models.DecimalField(max_digits=12, decimal_places=2)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2)
    cash_difference = models.DecimalField(max_digits=12, decimal_places=2)
    total_sales_count = models.IntegerField()
    total_sales_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_returns_count = models.IntegerField(default=0)
    total_returns_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    total_cash_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_card_amount = models.DecimalField(max_digits=12, decimal_places=2)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="closed_shifts",
    )
    closed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"ShiftClosure for Shift {self.shift_id}"


class PaymentLegMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    CARD = "CARD", "Card"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    method = models.CharField(max_length=10, choices=PaymentLegMethod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    card_reference_number = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["sale"]),
        ]

    def __str__(self) -> str:
        return f"Payment {self.method} Rs.{self.amount} for Sale {self.sale_id}"
