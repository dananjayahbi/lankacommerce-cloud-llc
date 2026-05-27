import uuid

from django.db import models


class SubscriptionStatus(models.TextChoices):
    TRIAL = "TRIAL", "Trial"
    ACTIVE = "ACTIVE", "Active"
    PAST_DUE = "PAST_DUE", "Past Due"
    SUSPENDED = "SUSPENDED", "Suspended"
    CANCELLED = "CANCELLED", "Cancelled"


class InvoiceStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    VOIDED = "VOIDED", "Voided"


class PaymentReminderType(models.TextChoices):
    THREE_DAY_REMINDER = "THREE_DAY_REMINDER", "3-Day Before"
    DUE_DATE_REMINDER = "DUE_DATE_REMINDER", "Due Date"
    OVERDUE_REMINDER = "OVERDUE_REMINDER", "Overdue"


class PaymentReminderChannel(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    EMAIL = "EMAIL", "Email"


class PaymentReminderSendStatus(models.TextChoices):
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"


# ── SubscriptionPlan ──────────────────────────────────────────────────────────

class SubscriptionPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    annual_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_users = models.IntegerField()
    max_product_variants = models.IntegerField()
    features = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    # Stripe price IDs — set after Prices are created in Stripe Dashboard or via API
    stripe_monthly_price_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_annual_price_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_subscription_plan"
        ordering = ["sort_order", "name"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self) -> str:
        return self.name


# ── Subscription ──────────────────────────────────────────────────────────────

class Subscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="billing_subscriptions",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL,
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    payhere_subscription_token = models.CharField(max_length=255, null=True, blank=True)
    # Stripe fields — populated when tenant pays via Stripe
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_subscription"
        ordering = ["-created_at"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        indexes = [
            models.Index(fields=["tenant", "status"], name="idx_billing_sub_tenant_status"),
            models.Index(fields=["current_period_end"], name="idx_billing_sub_period_end"),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id} - {self.plan.name} ({self.status})"


# ── Invoice ───────────────────────────────────────────────────────────────────

class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="billing_invoices",
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.PENDING,
    )
    billing_period_start = models.DateTimeField()
    billing_period_end = models.DateTimeField()
    due_date = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    payhere_order_id = models.CharField(max_length=255, null=True, blank=True)
    pdf_url = models.URLField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_invoice"
        ordering = ["-created_at"]
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        indexes = [
            models.Index(fields=["subscription", "status"], name="idx_billing_inv_sub_status"),
            models.Index(fields=["tenant", "status"], name="idx_billing_inv_tenant_status"),
            models.Index(fields=["due_date"], name="idx_billing_inv_due_date"),
        ]

    def __str__(self) -> str:
        return f"{self.invoice_number} - {self.status}"


# ── InvoicePaymentEvent ───────────────────────────────────────────────────────

class InvoicePaymentEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payment_events",
    )
    payhere_status_code = models.CharField(max_length=10)
    payhere_order_id = models.CharField(max_length=255)
    payhere_amount = models.CharField(max_length=50)
    payhere_currency = models.CharField(max_length=10, default="LKR")
    payhere_md5sig = models.CharField(max_length=255)
    signature_valid = models.BooleanField(default=False)
    raw_payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_invoice_payment_event"
        ordering = ["-created_at"]
        verbose_name = "Invoice Payment Event"
        verbose_name_plural = "Invoice Payment Events"
        indexes = [
            models.Index(fields=["payhere_order_id"], name="idx_billing_pay_evt_order"),
        ]

    def __str__(self) -> str:
        return f"Event {self.payhere_order_id} - Status {self.payhere_status_code}"


# ── PaymentReminder ───────────────────────────────────────────────────────────

class PaymentReminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="payment_reminders",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payment_reminders",
    )
    reminder_type = models.CharField(max_length=30, choices=PaymentReminderType.choices)
    channel = models.CharField(max_length=20, choices=PaymentReminderChannel.choices)
    send_status = models.CharField(
        max_length=10,
        choices=PaymentReminderSendStatus.choices,
        default=PaymentReminderSendStatus.SENT,
    )
    error_message = models.TextField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_payment_reminder"
        ordering = ["-sent_at"]
        verbose_name = "Payment Reminder"
        verbose_name_plural = "Payment Reminders"
        constraints = [
            models.UniqueConstraint(
                fields=["invoice", "reminder_type", "channel"],
                name="uniq_billing_reminder_invoice_type_channel",
            )
        ]
        indexes = [
            models.Index(fields=["sent_at"], name="idx_billing_reminder_sent_at"),
        ]

    def __str__(self) -> str:
        return f"{self.reminder_type} via {self.channel} for invoice {self.invoice_id}"


# ── StripePaymentEvent ────────────────────────────────────────────────────────

class StripePaymentEvent(models.Model):
    """
    Records every Stripe webhook event that results in an invoice payment.
    Kept separate from InvoicePaymentEvent (which is PayHere-specific).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stripe_payment_events",
    )
    stripe_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="LKR")
    processed = models.BooleanField(default=False)
    raw_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_stripe_payment_event"
        ordering = ["-created_at"]
        verbose_name = "Stripe Payment Event"
        verbose_name_plural = "Stripe Payment Events"
        indexes = [
            models.Index(fields=["stripe_session_id"], name="idx_billing_stripe_session"),
            models.Index(fields=["invoice", "processed"], name="idx_billing_stripe_inv_proc"),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} - {self.stripe_event_id}"
