"""Serializers for the catalog app."""

from decimal import Decimal

from rest_framework import serializers

from .models import (
    Brand,
    Category,
    GenderType,
    Product,
    ProductVariant,
    StockMovementReason,
    TaxRule,
)


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, allow_null=True)

    class Meta:
        model = Category
        fields = [
            "id", "name", "description", "parent_id", "parent_name",
            "sort_order", "created_at", "updated_at", "deleted_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CreateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(required=False, default=0)


class UpdateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(required=False)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "logo_url", "created_at", "updated_at", "deleted_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CreateBrandSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    logo_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)


class UpdateBrandSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    logo_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)


class ProductVariantSerializer(serializers.ModelSerializer):
    """Variant serializer with cost price redaction.

    ``cost_price`` is only included when the requesting user has the
    ``products.view_cost`` permission.
    """

    class Meta:
        model = ProductVariant
        fields = [
            "id", "sku", "barcode", "size", "colour",
            "cost_price", "retail_price", "wholesale_price",
            "stock_quantity", "low_stock_threshold", "image_urls",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            role = getattr(request.user, "role", None)
            auth_payload = getattr(request.auth, "payload", {}) if request.auth else {}
            perms = auth_payload.get("permissions", [])
            has_cost = role == "SUPER_ADMIN" or "products.view_cost" in perms
            if not has_cost:
                data.pop("cost_price", None)
        else:
            data.pop("cost_price", None)
        return data


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, allow_null=True)
    variant_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "category_id", "category_name",
            "brand_id", "brand_name", "gender", "tags", "tax_rule",
            "is_archived", "variant_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, allow_null=True)
    variants = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "category_id", "category_name",
            "brand_id", "brand_name", "gender", "tags", "tax_rule",
            "is_archived", "variants", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_variants(self, obj):
        active_variants = [v for v in obj.variants.all() if v.deleted_at is None]
        return ProductVariantSerializer(
            active_variants, many=True, context=self.context
        ).data


class CreateVariantDefinitionSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=100, required=False, allow_blank=True)
    barcode = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    size = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    colour = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    cost_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    retail_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    wholesale_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    stock_quantity = serializers.IntegerField(required=False, default=0, min_value=0)
    low_stock_threshold = serializers.IntegerField(required=False, default=5, min_value=0)
    image_urls = serializers.ListField(child=serializers.URLField(), required=False, default=list)

    def validate(self, data):
        cost = data.get("cost_price")
        retail = data.get("retail_price")
        wholesale = data.get("wholesale_price")
        if cost is not None and retail is not None:
            if retail < cost:
                raise serializers.ValidationError(
                    {"retail_price": "Retail price must be greater than or equal to cost price."}
                )
        if wholesale is not None and cost is not None and retail is not None:
            if wholesale < cost:
                raise serializers.ValidationError(
                    {"wholesale_price": "Wholesale price must be greater than or equal to cost price."}
                )
            if wholesale > retail:
                raise serializers.ValidationError(
                    {"wholesale_price": "Wholesale price must be less than or equal to retail price."}
                )
        return data


class CreateProductSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    category_id = serializers.UUIDField()
    brand_id = serializers.UUIDField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=GenderType.choices, required=False, default=GenderType.UNISEX)
    tags = serializers.ListField(child=serializers.CharField(max_length=100), required=False, default=list)
    tax_rule = serializers.ChoiceField(choices=TaxRule.choices, required=False, default=TaxRule.STANDARD_VAT)
    is_archived = serializers.BooleanField(required=False, default=False)
    variant_definitions = serializers.ListField(
        child=CreateVariantDefinitionSerializer(), required=False, default=list
    )


class UpdateProductSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=500, required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    category_id = serializers.UUIDField(required=False)
    brand_id = serializers.UUIDField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=GenderType.choices, required=False)
    tags = serializers.ListField(child=serializers.CharField(max_length=100), required=False)
    tax_rule = serializers.ChoiceField(choices=TaxRule.choices, required=False)


class UpdateProductVariantSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=100, required=False)
    barcode = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    size = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    colour = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    cost_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    retail_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    wholesale_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    low_stock_threshold = serializers.IntegerField(required=False, min_value=0)
    image_urls = serializers.ListField(child=serializers.URLField(), required=False)

    def validate(self, data):
        cost = data.get("cost_price")
        retail = data.get("retail_price")
        wholesale = data.get("wholesale_price")
        # Only enforce cross-field rules when both compared fields are present
        if cost is not None and retail is not None:
            if retail < cost:
                raise serializers.ValidationError(
                    {"retail_price": "Retail price must be greater than or equal to cost price."}
                )
        if wholesale is not None:
            if cost is not None and wholesale < cost:
                raise serializers.ValidationError(
                    {"wholesale_price": "Wholesale price must be greater than or equal to cost price."}
                )
            if retail is not None and wholesale > retail:
                raise serializers.ValidationError(
                    {"wholesale_price": "Wholesale price must be less than or equal to retail price."}
                )
        return data


class ProductListQuerySerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=False)
    brand_id = serializers.UUIDField(required=False)
    gender = serializers.ChoiceField(choices=GenderType.choices, required=False)
    is_archived = serializers.BooleanField(required=False)
    search = serializers.CharField(max_length=200, required=False, allow_blank=True)
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)


class StockAdjustmentSerializer(serializers.Serializer):
    variant_id = serializers.UUIDField()
    quantity_delta = serializers.IntegerField()
    reason = serializers.ChoiceField(choices=StockMovementReason.choices)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate_quantity_delta(self, value: int) -> int:
        if value == 0:
            raise serializers.ValidationError("Stock adjustment quantity cannot be zero.")
        return value
