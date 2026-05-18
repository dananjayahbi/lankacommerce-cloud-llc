import uuid

from django.db import models


class NotificationType(models.TextChoices):
    LOW_STOCK_ALERT = "LOW_STOCK_ALERT", "Low Stock Alert"
    STOCK_TAKE_SUBMITTED = "STOCK_TAKE_SUBMITTED", "Stock Take Submitted"
    STOCK_TAKE_APPROVED = "STOCK_TAKE_APPROVED", "Stock Take Approved"
    STOCK_TAKE_REJECTED = "STOCK_TAKE_REJECTED", "Stock Take Rejected"
    SYSTEM_ALERT = "SYSTEM_ALERT", "System Alert"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    related_entity_type = models.CharField(max_length=100, null=True, blank=True)
    related_entity_id = models.CharField(max_length=100, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant_id", "recipient_id", "is_read"]),
            models.Index(fields=["tenant_id", "recipient_id", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient_id}"
