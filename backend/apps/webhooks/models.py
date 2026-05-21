import uuid

from django.db import models


class WebhookDeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"


class WebhookEndpoint(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webhook_endpoints",
    )
    url = models.URLField(
        max_length=2048,
        help_text="The HTTPS endpoint that will receive webhook payloads.",
    )
    secret = models.CharField(max_length=128, editable=False)
    events = models.JSONField(
        default=list,
        help_text="List of event type strings, e.g. ['sale.completed', 'stock.updated']",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.tenant.slug} — {self.url}"

    def save(self, *args, **kwargs):
        if not self.secret:
            from apps.webhooks.services.secret_generator import generate_webhook_secret
            self.secret = generate_webhook_secret()
        super().save(*args, **kwargs)


class WebhookDelivery(models.Model):
    id = models.BigAutoField(primary_key=True)
    endpoint = models.ForeignKey(
        WebhookEndpoint,
        on_delete=models.CASCADE,
        related_name="deliveries",
    )
    event = models.CharField(max_length=128)
    payload = models.JSONField()
    status = models.CharField(
        max_length=16,
        choices=WebhookDeliveryStatus.choices,
        default=WebhookDeliveryStatus.PENDING,
    )
    status_code = models.IntegerField(null=True, blank=True)
    response = models.TextField(null=True, blank=True)
    attempted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
