"""Serializers for PurchaseOrder CRUD and receiving goods."""
from __future__ import annotations

from rest_framework import serializers

from apps.crm.models import POStatus, PurchaseOrder, PurchaseOrderLine


class POLineInputSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    ordered_qty = serializers.IntegerField(min_value=1)
    expected_cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CreatePurchaseOrderSerializer(serializers.Serializer):
    supplier_id = serializers.UUIDField()
    expected_delivery_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    lines = POLineInputSerializer(many=True)

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("A purchase order must have at least one line.")
        return value


class UpdatePOStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=POStatus.choices)


class ReceivePOLineItemSerializer(serializers.Serializer):
    line_id = serializers.UUIDField()
    received_qty = serializers.IntegerField(min_value=1)
    actual_cost_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class ReceivePOLinesSerializer(serializers.Serializer):
    received_lines = ReceivePOLineItemSerializer(many=True)

    def validate_received_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one received line is required.")
        return value


class PurchaseOrderLineOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = [
            "id",
            "variant_id",
            "product_name_snapshot",
            "variant_description_snapshot",
            "ordered_qty",
            "expected_cost_price",
            "received_qty",
            "actual_cost_price",
            "is_fully_received",
        ]


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineOutputSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_contact_name = serializers.CharField(source="supplier.contact_name", read_only=True)
    supplier_phone = serializers.CharField(source="supplier.phone", read_only=True)
    supplier_whatsapp_number = serializers.CharField(source="supplier.whatsapp_number", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "supplier_id",
            "supplier_name",
            "supplier_contact_name",
            "supplier_phone",
            "supplier_whatsapp_number",
            "created_by_id",
            "created_by_name",
            "expected_delivery_date",
            "status",
            "notes",
            "total_amount",
            "lines",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return ""


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    lines_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "supplier_id",
            "supplier_name",
            "status",
            "total_amount",
            "lines_count",
            "expected_delivery_date",
            "created_at",
        ]
