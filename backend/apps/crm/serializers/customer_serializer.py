"""Customer serializers for CRM API."""

from rest_framework import serializers

from apps.crm.models import Customer, Gender


class CustomerOutputSerializer(serializers.ModelSerializer):
    """Read serializer — used for list and detail responses."""

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "gender",
            "birthday",
            "tags",
            "notes",
            "credit_balance",
            "total_spend",
            "is_active",
            "created_at",
            "updated_at",
        ]


class CreateCustomerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=30)
    email = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class UpdateCustomerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=30, required=False)
    email = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birthday = serializers.DateField(required=False, allow_null=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True)
