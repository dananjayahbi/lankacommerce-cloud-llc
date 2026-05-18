import uuid

from django.db import models


# ---------------------------------------------------------------------------
# Status Enumerations
# ---------------------------------------------------------------------------


class TenantStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    GRACE_PERIOD = "GRACE_PERIOD", "Grace Period"
    SUSPENDED = "SUSPENDED", "Suspended"
    CANCELLED = "CANCELLED", "Cancelled"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PAST_DUE = "PAST_DUE", "Past Due"
    CANCELLED = "CANCELLED", "Cancelled"
    TRIALING = "TRIALING", "Trialing"


class InvoiceStatus(models.TextChoices):
    PAID = "PAID", "Paid"
    UNPAID = "UNPAID", "Unpaid"
    OVERDUE = "OVERDUE", "Overdue"


# ---------------------------------------------------------------------------
# Default helpers
# ---------------------------------------------------------------------------


def _default_tenant_settings() -> dict:
    return {
        "currency": "LKR",
        "timezone": "Asia/Colombo",
        "vatRate": 18,
        "ssclRate": 2.5,
        "receiptFooter": "",
    }


def _default_features() -> list:
    return []


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Plan(models.Model):
    """
    Represents a subscription tier available to tenants.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    price_monthly = models.DecimalField(max_digits=12, decimal_places=2)
    features = models.JSONField(default=_default_features)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self) -> str:
        return self.name


class Tenant(models.Model):
    """
    Represents a single retail store operating on the LankaCommerce platform.
    Soft-deleted tenants retain their records for audit and billing history.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    logo_url = models.URLField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TenantStatus.choices,
        default=TenantStatus.ACTIVE,
    )
    grace_ends_at = models.DateTimeField(null=True, blank=True)
    custom_domain = models.CharField(max_length=255, null=True, blank=True)
    settings = models.JSONField(default=_default_tenant_settings)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Soft-delete: non-null means logically deleted
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


class Subscription(models.Model):
    """
    Links a Tenant to a Plan and tracks the billing cycle.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    payhere_sub_id = models.CharField(max_length=100, null=True, blank=True)
    next_billing_date = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.tenant.name} — {self.plan.name} ({self.status})"


class Invoice(models.Model):
    """
    Represents a billing event for a tenant's subscription.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.UNPAID,
    )
    billing_date = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.invoice_number} ({self.status})"
