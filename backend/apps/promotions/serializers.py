from rest_framework import serializers

from apps.promotions.models import CustomerPricingRule, Promotion


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = "__all__"


class CustomerPricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPricingRule
        fields = "__all__"
