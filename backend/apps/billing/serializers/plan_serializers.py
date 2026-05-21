from rest_framework import serializers

from apps.billing.constants import PLAN_FEATURE_ALL
from apps.billing.models import SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "description",
            "monthly_price",
            "annual_price",
            "max_users",
            "max_product_variants",
            "features",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_features(self, value):
        if value is None:
            return value
        for feature in value:
            if feature not in PLAN_FEATURE_ALL:
                raise serializers.ValidationError(
                    f"'{feature}' is not a valid feature slug.",
                    code="invalid_feature",
                )
        return value

    def validate_monthly_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Monthly price must be greater than zero.",
                code="invalid_price",
            )
        return value

    def validate_annual_price(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Annual price must be greater than zero.",
                code="invalid_price",
            )
        return value

    def to_internal_value(self, data):
        # Make 'name' read-only on update
        if self.instance is not None and "name" in data:
            data = data.copy()
            data.pop("name")
        return super().to_internal_value(data)

    def create(self, validated_data):
        return super().create(validated_data)
