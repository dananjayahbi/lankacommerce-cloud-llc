"""DRF serializers for the POS app (sales and shifts)."""

from decimal import Decimal

from rest_framework import serializers

from apps.pos.models import (
    Payment,
    PaymentMethod,
    Return,
    ReturnLine,
    ReturnRefundMethod,
    Sale,
    SaleLine,
    Shift,
    ShiftClosure,
    StoreCredit,
)


# ──────────────────────────────────────────────────────────────────
# Input serializers
# ──────────────────────────────────────────────────────────────────

class CreateSaleLineSerializer(serializers.Serializer):
    variant_id = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1)
    discount_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        required=False,
        default=Decimal("0.00"),
    )


class CreateSaleSerializer(serializers.Serializer):
    shift_id = serializers.CharField()
    lines = CreateSaleLineSerializer(many=True)
    cart_discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        default=Decimal("0.00"),
    )
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    authorizing_manager_id = serializers.CharField(
        required=False, allow_null=True, default=None
    )
    # Payment-specific fields
    cash_received = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
        allow_null=True,
        default=None,
    )
    card_reference_number = serializers.CharField(
        max_length=20, required=False, allow_null=True, allow_blank=True, default=None
    )
    card_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
        allow_null=True,
        default=None,
    )
    # Offline support: timestamp when the sale was assembled offline
    queued_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
    # Exchange: ID of the Return this sale is fulfilling
    linked_return_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one line item is required."
            )
        return value

    def validate(self, data):
        method = data.get("payment_method")
        if method == PaymentMethod.CASH and not data.get("cash_received"):
            raise serializers.ValidationError(
                {"cash_received": "cash_received is required for CASH payment."}
            )
        if method == PaymentMethod.SPLIT:
            if not data.get("cash_received"):
                raise serializers.ValidationError(
                    {"cash_received": "cash_received is required for SPLIT payment."}
                )
            if not data.get("card_amount"):
                raise serializers.ValidationError(
                    {"card_amount": "card_amount is required for SPLIT payment."}
                )
        return data


class HoldSaleSerializer(serializers.Serializer):
    """Input serializer for the hold (OPEN) sale endpoint.

    Does not require ``payment_method`` — held sales always have null payment.
    """

    shift_id = serializers.CharField()
    lines = CreateSaleLineSerializer(many=True)
    cart_discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0"),
        required=False,
        default=Decimal("0.00"),
    )
    authorizing_manager_id = serializers.CharField(
        required=False, allow_null=True, default=None
    )

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one line item is required."
            )
        return value


# ──────────────────────────────────────────────────────────────────
# Output serializers
# ──────────────────────────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "method",
            "amount",
            "card_reference_number",
            "created_at",
        ]


class SaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleLine
        fields = [
            "id",
            "variant_id",
            "product_name_snapshot",
            "variant_description_snapshot",
            "sku",
            "unit_price",
            "quantity",
            "discount_percent",
            "discount_amount",
            "line_total_before_discount",
            "line_total_after_discount",
            "created_at",
        ]


class SaleSerializer(serializers.ModelSerializer):
    lines = SaleLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "tenant_id",
            "shift_id",
            "cashier_id",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total_amount",
            "change_given",
            "authorizing_manager_id",
            "payment_method",
            "status",
            "voided_by_id",
            "voided_at",
            "whatsapp_receipt_sent_at",
            "completed_at",
            "created_at",
            "updated_at",
            "linked_return_id",
            "lines",
            "payments",
        ]


# ──────────────────────────────────────────────────────────────────
# Shift input serializers
# ──────────────────────────────────────────────────────────────────

class OpenShiftSerializer(serializers.Serializer):
    """Input serializer for the open-shift endpoint."""

    opening_float = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    def validate_opening_float(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Opening float must be zero or greater."
            )
        return value


class CloseShiftSerializer(serializers.Serializer):
    """Input serializer for the close-shift endpoint."""

    closing_cash_count = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_null=True,
        default=None,
    )

    def validate_closing_cash_count(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError(
                "Closing cash count cannot be negative. Enter the physical cash "
                "amount in the drawer."
            )
        return value


# ──────────────────────────────────────────────────────────────────
# Shift output serializers
# ──────────────────────────────────────────────────────────────────

class ShiftClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftClosure
        fields = [
            "id",
            "closing_cash_count",
            "expected_cash",
            "cash_difference",
            "total_sales_count",
            "total_sales_amount",
            "total_returns_count",
            "total_returns_amount",
            "total_cash_amount",
            "total_card_amount",
            "closed_by_id",
            "closed_at",
        ]


class ShiftSerializer(serializers.ModelSerializer):
    """Output serializer for a Shift, with optional nested closure data."""

    closure = ShiftClosureSerializer(read_only=True)
    # sale_count is present only when the queryset is annotated (list view).
    sale_count = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            "id",
            "tenant_id",
            "cashier_id",
            "status",
            "opened_at",
            "closed_at",
            "opening_float",
            "notes",
            "sale_count",
            "closure",
        ]

    def get_sale_count(self, obj):
        return getattr(obj, "sale_count", None)


# ──────────────────────────────────────────────────────────────────
# Return serializers (SubPhase 03.03)
# ──────────────────────────────────────────────────────────────────

class ReturnLineInputSerializer(serializers.Serializer):
    sale_line_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class InitiateReturnSerializer(serializers.Serializer):
    original_sale_id = serializers.UUIDField()
    lines = ReturnLineInputSerializer(many=True)
    refund_method = serializers.ChoiceField(choices=ReturnRefundMethod.choices)
    restock_items = serializers.BooleanField(default=True)
    reason = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    card_reversal_reference = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    authorizing_manager_id = serializers.CharField()

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError(
                "At least one return line is required."
            )
        return value

    def validate(self, data):
        if (
            data.get("refund_method") == ReturnRefundMethod.CARD_REVERSAL
            and not data.get("card_reversal_reference")
        ):
            raise serializers.ValidationError(
                {"card_reversal_reference": "Required for CARD_REVERSAL refund method."}
            )
        return data


class ReturnLineOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnLine
        fields = [
            "id",
            "original_sale_line_id",
            "variant_id",
            "product_name_snapshot",
            "variant_description_snapshot",
            "quantity",
            "unit_price",
            "line_refund_amount",
            "is_restocked",
            "created_at",
        ]


class ReturnSerializer(serializers.ModelSerializer):
    lines = ReturnLineOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Return
        fields = [
            "id",
            "tenant_id",
            "original_sale_id",
            "initiated_by_id",
            "authorized_by_id",
            "refund_method",
            "refund_amount",
            "restock_items",
            "reason",
            "status",
            "card_reversal_reference",
            "created_at",
            "lines",
        ]
