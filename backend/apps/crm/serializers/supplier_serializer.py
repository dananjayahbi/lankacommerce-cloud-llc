"""Supplier DRF serializers."""
from __future__ import annotations

from rest_framework import serializers

from apps.crm.validators import validate_phone


class CreateSupplierSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    contact_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=20)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    lead_time_days = serializers.IntegerField(min_value=1, max_value=365, required=False, default=7)
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")

    def validate_phone(self, value: str) -> str:
        try:
            return validate_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class UpdateSupplierSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    contact_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    lead_time_days = serializers.IntegerField(min_value=1, max_value=365, required=False)
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        try:
            return validate_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class SupplierOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    contact_name = serializers.CharField()
    phone = serializers.CharField()
    whatsapp_number = serializers.CharField()
    email = serializers.CharField()
    address = serializers.CharField()
    lead_time_days = serializers.IntegerField()
    notes = serializers.CharField()
    is_active = serializers.BooleanField()
    purchase_orders_count = serializers.SerializerMethodField()

    def get_purchase_orders_count(self, obj):
        return getattr(obj, "purchase_orders_count", 0)
