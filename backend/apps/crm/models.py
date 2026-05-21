"""CRM models: Customer, Supplier, PurchaseOrder, PurchaseOrderLine,
CustomerBroadcast, BirthdayGreetingLog.

Tags field uses JSONField (SQLite-compatible; semantically equivalent to
ArrayField(CharField) in a PostgreSQL production environment).
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.tenants.models import Tenant


# ──────────────────────────────────────────────────────────────────
# TextChoices
# ──────────────────────────────────────────────────────────────────


class POStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SENT = "SENT", "Sent"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially Received"
    RECEIVED = "RECEIVED", "Received"
    CANCELLED = "CANCELLED", "Cancelled"


class Gender(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"


# ──────────────────────────────────────────────────────────────────
# Customer
# ──────────────────────────────────────────────────────────────────


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="customers",
    )
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    email = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(
        max_length=10, choices=Gender.choices, blank=True, null=True
    )
    birthday = models.DateField(null=True, blank=True)
    # JSONField used for SQLite dev compatibility; semantically equivalent to
    # ArrayField(CharField(max_length=100)) in a PostgreSQL production environment.
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    credit_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    total_spend = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    last_birthday_message_sent_year = models.IntegerField(
        null=True,
        blank=True,
        help_text="The calendar year in which a birthday WhatsApp message was last sent to this customer.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant"]),
            models.Index(fields=["tenant", "phone"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"


# ──────────────────────────────────────────────────────────────────
# Supplier
# ──────────────────────────────────────────────────────────────────


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="suppliers",
    )
    name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30)
    whatsapp_number = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True)
    lead_time_days = models.PositiveIntegerField(default=7)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["tenant"])]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# ──────────────────────────────────────────────────────────────────
# PurchaseOrder
# ──────────────────────────────────────────────────────────────────


class PurchaseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    expected_delivery_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=POStatus.choices,
        default=POStatus.DRAFT,
    )
    notes = models.TextField(blank=True)
    total_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "status"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PO {self.id} — {self.supplier.name} ({self.status})"


# ──────────────────────────────────────────────────────────────────
# PurchaseOrderLine
# ──────────────────────────────────────────────────────────────────


class PurchaseOrderLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.PROTECT,
        related_name="po_lines",
    )
    product_name_snapshot = models.CharField(max_length=255)
    variant_description_snapshot = models.CharField(max_length=255, blank=True)
    ordered_qty = models.PositiveIntegerField()
    expected_cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    received_qty = models.PositiveIntegerField(default=0)
    actual_cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_fully_received = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["purchase_order"])]

    def __str__(self) -> str:
        return (
            f"POLine {self.id} — {self.product_name_snapshot} "
            f"x{self.ordered_qty} (PO {self.purchase_order_id})"
        )


# ──────────────────────────────────────────────────────────────────
# CustomerBroadcast
# ──────────────────────────────────────────────────────────────────


class CustomerBroadcast(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="broadcasts",
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="broadcasts_sent",
    )
    message = models.TextField()
    filters = models.JSONField()
    recipient_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["tenant"])]
        ordering = ["-sent_at"]

    def __str__(self) -> str:
        return f"Broadcast {self.id} — {self.recipient_count} recipients"


# ──────────────────────────────────────────────────────────────────
# BirthdayGreetingLog
# ──────────────────────────────────────────────────────────────────


class BirthdayGreetingLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="birthday_logs",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="birthday_logs",
    )
    status = models.CharField(
        max_length=10,
        choices=[("SENT", "Sent"), ("FAILED", "Failed")],
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "created_at"])]

    def __str__(self) -> str:
        return f"BirthdayLog {self.id} — {self.customer.name} ({self.status})"
