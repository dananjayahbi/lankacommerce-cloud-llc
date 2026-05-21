import hmac
import json
import logging
import uuid

import requests
from django.utils import timezone

logger = logging.getLogger(__name__)


def dispatch_webhooks(tenant_id, event: str, payload: dict) -> int:
    """
    Fire webhooks to all active endpoints subscribed to *event* for *tenant_id*.

    Delivers synchronously with a 2-second timeout (fire-and-forget from the
    caller's perspective — failures are logged but never propagate).

    Returns the number of delivery attempts made.
    """
    from apps.webhooks.models import WebhookDelivery, WebhookDeliveryStatus, WebhookEndpoint

    endpoints = WebhookEndpoint.objects.filter(
        tenant_id=tenant_id,
        is_active=True,
        events__contains=event,
    )

    count = 0
    for endpoint in endpoints:
        delivery = WebhookDelivery.objects.create(
            endpoint=endpoint,
            event=event,
            payload=payload,
            status=WebhookDeliveryStatus.PENDING,
        )

        body = json.dumps(payload, separators=(",", ":"))
        signature = hmac.new(
            endpoint.secret.encode(),
            body.encode(),
            "sha256",
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-LankaCommerce-Event": event,
            "X-LankaCommerce-Signature": signature,
            "X-LankaCommerce-Delivery": str(uuid.uuid4()),
        }

        try:
            response = requests.post(
                endpoint.url,
                data=body,
                headers=headers,
                timeout=2,
            )
            delivery.status = WebhookDeliveryStatus.SUCCESS
            delivery.status_code = response.status_code
            delivery.response = response.text[:4000]
            logger.info("Webhook delivered: endpoint=%s event=%s status=%s", endpoint.id, event, response.status_code)
        except Exception as exc:
            delivery.status = WebhookDeliveryStatus.FAILED
            delivery.response = str(exc)[:4000]
            logger.warning("Webhook failed: endpoint=%s event=%s error=%s", endpoint.id, event, exc)

        delivery.attempted_at = timezone.now()
        delivery.save(update_fields=["status", "status_code", "response", "attempted_at"])
        count += 1

    return count
