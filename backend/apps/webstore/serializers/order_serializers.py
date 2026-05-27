"""
apps/webstore/serializers/order_serializers.py

Serializers for Phase 8: Checkout & Order Flow.

Includes:
  - ConsumerRegisterSerializer
  - ConsumerLoginSerializer
  - OrderCreateSerializer
  - OrderDetailSerializer
  - OrderFulfillSerializer   (tenant admin)
"""

from __future__ import annotations

from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.webstore.models import WebstoreCustomer, WebstoreOrder


# ---------------------------------------------------------------------------
# Consumer account
# ---------------------------------------------------------------------------


class ConsumerRegisterSerializer(serializers.Serializer):
    """Validate consumer registration for a specific tenant's storefront."""

    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=8,
        write_only=True,
        style={"input_type": "password"},
    )
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    accepts_marketing = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_password(self, value: str) -> str:
        """Enforce at least one letter and one digit."""
        has_letter = any(c.isalpha() for c in value)
        has_digit = any(c.isdigit() for c in value)
        if not (has_letter and has_digit):
            raise serializers.ValidationError(
                _("Password must contain at least one letter and one digit.")
            )
        return value


class ConsumerLoginSerializer(serializers.Serializer):
    """Validate consumer login credentials."""

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


# ---------------------------------------------------------------------------
# Order creation
# ---------------------------------------------------------------------------


class LineItemInputSerializer(serializers.Serializer):
    """A single line item in an order creation request."""

    variant_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=999)


class AddressSerializer(serializers.Serializer):
    """Shipping or billing address snapshot."""

    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    address1 = serializers.CharField(max_length=255)
    address2 = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    country = serializers.CharField(max_length=2, required=False, allow_blank=True, default="LK")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")


class OrderCreateSerializer(serializers.Serializer):
    """Incoming payload for POST /api/webstore/public/<slug>/orders/."""

    customer_email = serializers.EmailField()
    # Optional — supplied when a registered consumer is logged in
    customer_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    line_items = LineItemInputSerializer(many=True, min_length=1)
    shipping_address = AddressSerializer()
    billing_address = AddressSerializer(required=False, allow_null=True, default=None)
    same_as_shipping = serializers.BooleanField(required=False, default=True)
    discount_code = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    notes = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=""
    )
    shipping_method_id = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )

    def validate_customer_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_line_items(self, value):
        if not value:
            raise serializers.ValidationError(_("At least one item is required."))
        return value


# ---------------------------------------------------------------------------
# Order detail / response
# ---------------------------------------------------------------------------


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    Full order representation returned to the consumer and used in payment
    initiation. Excludes all server-side secrets.
    """

    class Meta:
        model = WebstoreOrder
        fields = [
            "id",
            "order_number",
            "customer_email",
            "subtotal",
            "shipping_amount",
            "discount_amount",
            "tax_amount",
            "total",
            "currency",
            "status",
            "payment_status",
            "fulfillment_status",
            "line_items",
            "shipping_address",
            "billing_address",
            "notes",
            "discount_code",
            "payment_reference",
            "payment_gateway",
            "tracking_number",
            "tracking_carrier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class OrderSummarySerializer(serializers.ModelSerializer):
    """Compact order list row for paginated responses."""

    item_count = serializers.SerializerMethodField()
    items_preview = serializers.SerializerMethodField()

    class Meta:
        model = WebstoreOrder
        fields = [
            "id",
            "order_number",
            "customer_email",
            "total",
            "currency",
            "status",
            "payment_status",
            "fulfillment_status",
            "item_count",
            "items_preview",
            "created_at",
        ]
        read_only_fields = fields

    def get_item_count(self, obj: WebstoreOrder) -> int:
        """Total number of items across all line items."""
        return sum(int(item.get("quantity", 1)) for item in (obj.line_items or []))

    def get_items_preview(self, obj: WebstoreOrder) -> str:
        """Comma-separated list of the first 3 product titles."""
        titles = [item.get("title", "") for item in (obj.line_items or []) if item.get("title")]
        preview = titles[:3]
        if len(titles) > 3:
            preview.append(f"+{len(titles) - 3} more")
        return ", ".join(preview)


# ---------------------------------------------------------------------------
# Tenant admin order management
# ---------------------------------------------------------------------------


class OrderFulfillSerializer(serializers.Serializer):
    """Payload for fulfilling an order (tenant admin action)."""

    tracking_number = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    tracking_carrier = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


class WebstoreCustomerSummarySerializer(serializers.ModelSerializer):
    """Compact consumer profile for tenant admin lists."""

    class Meta:
        model = WebstoreCustomer
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "accepts_marketing",
            "is_active",
            "created_at",
            "last_login_at",
        ]
        read_only_fields = fields
