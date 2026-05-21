import uuid

from django.conf import settings
from django.db import models


class SavedReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="saved_reports",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_reports",
    )
    name = models.CharField(max_length=100)
    report_type = models.CharField(max_length=50)
    filters = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "user"]),
        ]
        verbose_name = "Saved Report"
        verbose_name_plural = "Saved Reports"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class DailySummaryLog(models.Model):
    class Status(models.TextChoices):
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="daily_summary_logs",
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=Status.choices)
    error_message = models.TextField(null=True, blank=True)
    recipient_email = models.EmailField()

    class Meta:
        verbose_name = "Daily Summary Log"
        verbose_name_plural = "Daily Summary Logs"
        ordering = ["-sent_at"]

    def __str__(self) -> str:
        return f"{self.tenant_id} — {self.sent_at.date()} — {self.status}"
