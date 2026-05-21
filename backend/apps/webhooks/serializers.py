from rest_framework import serializers

from apps.webhooks.models import WebhookEndpoint

VALID_EVENTS = [
    "sale.completed",
    "return.processed",
    "stock.updated",
    "product.created",
    "product.updated",
    "customer.created",
]


class WebhookEndpointCreateSerializer(serializers.Serializer):
    url = serializers.URLField(max_length=2048)
    events = serializers.ListField(child=serializers.CharField(), min_length=1)

    def validate_url(self, value):
        if not value.startswith("https://"):
            raise serializers.ValidationError("Webhook URL must use HTTPS.")
        return value

    def validate_events(self, value):
        if not value:
            raise serializers.ValidationError("At least one event type is required.")
        return value


class WebhookEndpointListSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ["id", "url", "events", "is_active", "created_at"]


class WebhookEndpointDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ["id", "url", "events", "is_active", "secret", "created_at", "updated_at"]
