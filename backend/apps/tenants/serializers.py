from decimal import Decimal

from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from apps.tenants.models import Invoice, Plan, Subscription, Tenant


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "name", "description", "price_monthly", "features", "sort_order"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "status",
            "current_period_start",
            "current_period_end",
            "next_billing_date",
            "cancelled_at",
            "created_at",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["id", "invoice_number", "amount", "status", "billing_date", "paid_at"]


class TenantListSerializer(serializers.ModelSerializer):
    active_subscription = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "status",
            "grace_ends_at",
            "created_at",
            "active_subscription",
        ]

    def get_active_subscription(self, obj):
        sub = obj.subscriptions.select_related("plan").filter(status="ACTIVE").first()
        if sub:
            return {"plan_name": sub.plan.name, "next_billing_date": sub.next_billing_date}
        return None


class TenantDetailSerializer(serializers.ModelSerializer):
    subscriptions = SubscriptionSerializer(many=True, read_only=True)
    invoices = InvoiceSerializer(many=True, read_only=True, source="invoices.all")

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "logo_url",
            "status",
            "grace_ends_at",
            "custom_domain",
            "settings",
            "created_at",
            "updated_at",
            "subscriptions",
            "invoices",
        ]


class TenantProvisionSerializer(serializers.Serializer):
    store_name = serializers.CharField(max_length=255)
    slug = serializers.SlugField(max_length=100)
    owner_email = serializers.EmailField()
    owner_password = serializers.CharField(min_length=8, write_only=True)
    timezone = serializers.CharField(max_length=100)
    currency = serializers.CharField(max_length=10)
    vat_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal("18.00"))
    sscl_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal("2.50"))
    plan_id = serializers.UUIDField()

    def validate_slug(self, value):
        if Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A tenant with this slug already exists.")
        return value

    def validate_owner_email(self, value):
        from apps.accounts.models import CustomUser
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
