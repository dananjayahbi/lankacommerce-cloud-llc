# Task 02.01.10 — Setup Product & Variant Validators

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Tasks 02.01.01–02.01.05 (all catalog models), Task 01.02 (CustomUser and permission system) |

---

## Objective

This task creates the complete set of DRF serializers in `backend/apps/catalog/serializers.py`. Serializers replace Zod schemas from the original VelvetPOS architecture. They handle input validation, cross-field business rule enforcement, and output shaping. Each serializer is designed for a specific use case — list view, detail view, create, update, or query parameter validation — rather than a single universal serializer for all operations. Cost price redaction is implemented directly in `ProductVariantSerializer`.

---

## Instructions

### Step 1: Create the Serializers File

Create or open `backend/apps/catalog/serializers.py`. At the top, import `serializers` from `rest_framework` and import all necessary catalog models and enumeration classes from `apps.catalog.models`. Import validators from `rest_framework.validators` as needed. Import `Decimal` from the standard `decimal` module for use in cross-field validation comparisons.

### Step 2: Implement Category Serializers

Define **`CategorySerializer`** inheriting from `serializers.ModelSerializer`. Set `Meta.model = Category`. Include the fields `id`, `name`, `description`, `parent`, `parent_id`, `sort_order`, `created_at`, and `updated_at` in `Meta.fields`. Mark `id` and both timestamp fields as `read_only=True`. The `parent` field should be a nested `CategorySerializer` with `read_only=True` to display the parent category name. The `parent_id` field should be a writable `UUIDField` with `required=False` and `allow_null=True`.

Define **`CreateCategorySerializer`** inheriting from `serializers.Serializer`. Include `name` as a required `CharField` with `max_length=255`, `description` as an optional `CharField` with `required=False` and `allow_blank=True`, `parent_id` as an optional `UUIDField` with `required=False` and `allow_null=True`, and `sort_order` as an optional `IntegerField` with `required=False` and `default=0`.

Define **`UpdateCategorySerializer`** following the same field structure as `CreateCategorySerializer` but with all fields having `required=False` to support partial update semantics.

### Step 3: Implement Brand Serializers

Define **`BrandSerializer`** inheriting from `serializers.ModelSerializer` with `Meta.model = Brand`. Include `id`, `name`, `logo_url`, `created_at`, and `updated_at` in `Meta.fields`. Mark `id` and timestamps as `read_only=True`. The `logo_url` field should be an optional `URLField`.

Define **`CreateBrandSerializer`** inheriting from `serializers.Serializer`. Include `name` as required `CharField` with `max_length=255`, and `logo_url` as an optional `URLField` with `required=False` and `allow_null=True`.

Define **`UpdateBrandSerializer`** with the same fields as `CreateBrandSerializer`, all with `required=False`.

### Step 4: Implement the Product List Serializer

Define **`ProductListSerializer`** inheriting from `serializers.ModelSerializer`. This serializer is used for list responses and intentionally does not include variant detail data, keeping response payloads small.

Set `Meta.model = Product`. Include the fields `id`, `name`, `description`, `gender`, `tax_rule`, `is_archived`, `created_at`, `updated_at`, and `variant_count`. Also include nested representations of `category` and `brand` using `CategorySerializer(read_only=True)` and `BrandSerializer(read_only=True)` as field declarations.

Declare `variant_count` as an `IntegerField(read_only=True)`. Because the view queries pass a queryset annotated with a `variant_count` field (computed via Django's `Count()` aggregation), DRF will find this attribute on each object and serialize it automatically without requiring a `SerializerMethodField`.

### Step 5: Implement the Full Product Serializer

Define **`ProductSerializer`** inheriting from `serializers.ModelSerializer`. This serializer is used for single-product detail responses where full variant data is required.

Include all fields from `ProductListSerializer` plus a `variants` field. Declare `variants` as a nested `ProductVariantSerializer(many=True, read_only=True)`. Mark all fields as `read_only=True` since this serializer is used only for output.

Override the `to_representation(instance)` method. Call `super().to_representation(instance)` to produce the default representation dictionary. Then access `self.context.get('request')` to retrieve the request object. Pass the request down to the nested `ProductVariantSerializer` by ensuring it is included in the context when the nested serializer renders each variant. Return the final representation dictionary.

### Step 6: Implement ProductVariant Serializer with Cost Price Redaction

Define **`ProductVariantSerializer`** inheriting from `serializers.ModelSerializer`. Set `Meta.model = ProductVariant`. Include the fields `id`, `sku`, `barcode`, `size`, `colour`, `cost_price`, `retail_price`, `wholesale_price`, `stock_quantity`, `low_stock_threshold`, `image_urls`, `created_at`, and `updated_at`.

Override the `to_representation(instance)` method. Inside this override, call `super().to_representation(instance)` to produce the full representation dictionary including `cost_price`. Then retrieve the request object from `self.context.get('request')`. Check whether the request user has the `catalog:view_cost` permission using the permission utility from `apps.accounts`. If the user does not have this permission, remove the `cost_price` key from the representation dictionary entirely before returning it. This ensures that `cost_price` is never present in any response to a user who lacks the permission, regardless of which view called this serializer.

This cost price redaction is the only logic in the serializer that references user permissions. All other validation and field rendering is permission-agnostic.

### Step 7: Implement Create Product Serializers

Define **`CreateProductSerializer`** inheriting from `serializers.Serializer`. Include the following fields:

- `name` as a required `CharField` with `max_length=500`.
- `description` as an optional `CharField` with `required=False` and `allow_blank=True`.
- `category_id` as a required `UUIDField`.
- `brand_id` as an optional `UUIDField` with `required=False` and `allow_null=True`.
- `gender` as a `ChoiceField` with `choices=GenderType.choices` and a default of `GenderType.UNISEX`.
- `tags` as an optional `ListField` containing `CharField` children, with `required=False` and `default=list`.
- `tax_rule` as a `ChoiceField` with `choices=TaxRule.choices` and a default of `TaxRule.STANDARD_VAT`.
- `variant_definitions` as an optional `ListField` containing `CreateProductVariantSerializer` children, with `required=False` and `default=list`.

Define **`CreateProductVariantSerializer`** inheriting from `serializers.Serializer`. Include the following fields:

- `sku` as an optional `CharField` with `max_length=100`, `required=False`, and `allow_blank=True`. If omitted, the service layer auto-generates a SKU.
- `barcode` as an optional `CharField` with `required=False` and `allow_null=True`.
- `size` as an optional `CharField` with `required=False` and `allow_null=True`.
- `colour` as an optional `CharField` with `required=False` and `allow_null=True`.
- `cost_price` as a required `DecimalField` with `max_digits=14` and `decimal_places=2`.
- `retail_price` as a required `DecimalField` with `max_digits=14` and `decimal_places=2`.
- `wholesale_price` as an optional `DecimalField` with `max_digits=14`, `decimal_places=2`, `required=False`, and `allow_null=True`.
- `stock_quantity` as an optional `IntegerField` with `required=False`, `default=0`, and `min_value=0`.
- `low_stock_threshold` as an optional `IntegerField` with `required=False`, `default=5`, and `min_value=0`.

Implement a `validate()` method (the cross-field validation hook) in `CreateProductVariantSerializer`. This method receives the dictionary of all validated field values. It must enforce the following two business rules:

**Rule 1**: `retail_price` must be greater than or equal to `cost_price`. If not, raise a `serializers.ValidationError` targeting the `retail_price` field with the message "Retail price must be greater than or equal to cost price."

**Rule 2**: If `wholesale_price` is provided and is not null, it must be greater than or equal to `cost_price` and less than or equal to `retail_price`. If either condition fails, raise a `serializers.ValidationError` targeting the `wholesale_price` field with a descriptive message.

Return the validated data dictionary if all checks pass.

### Step 8: Implement Update Serializers

Define **`UpdateProductSerializer`** with all fields from `CreateProductSerializer` made optional by setting `required=False`. Exclude the `variant_definitions` field — variants are managed individually through the variant detail endpoint, not updated in bulk during a product update.

Define **`UpdateProductVariantSerializer`** with all fields from `CreateProductVariantSerializer` made optional. Include the same cross-field `validate()` method to enforce pricing rules even on partial updates. The cross-field check should only run when both compared fields are present in the incoming data — check for key presence in the data dictionary before comparing.

### Step 9: Implement the Query Parameter Serializer

Define **`ProductListQuerySerializer`** inheriting from `serializers.Serializer`. Include the following fields for validating query parameters on the product list endpoint:

- `page` as an optional `IntegerField` with `required=False`, `min_value=1`, and `default=1`.
- `page_size` as an optional `IntegerField` with `required=False`, `min_value=1`, `max_value=100`, and `default=20`.
- `category_id` as an optional `UUIDField` with `required=False`.
- `brand_id` as an optional `UUIDField` with `required=False`.
- `gender` as an optional `ChoiceField` with `choices=GenderType.choices` and `required=False`.
- `is_archived` as an optional `BooleanField` with `required=False`.
- `search` as an optional `CharField` with `required=False` and `allow_blank=True`.

### Step 10: Implement the Stock Adjustment Serializer

Define **`StockAdjustmentSerializer`** inheriting from `serializers.Serializer`. Include the following fields:

- `variant_id` as a required `UUIDField`.
- `quantity_delta` as a required `IntegerField`. May be negative for stock reductions.
- `reason` as a required `ChoiceField` with `choices=StockMovementReason.choices`.
- `note` as an optional `CharField` with `required=False` and `allow_blank=True`.

Implement a `validate_quantity_delta()` method (the single-field validation hook for `quantity_delta`). This method receives only the value of the `quantity_delta` field. If the value equals zero, raise a `serializers.ValidationError` with the message "Stock adjustment quantity cannot be zero." A zero-delta adjustment creates a meaningless movement record and is always a client error.

---

## Expected Output

- `backend/apps/catalog/serializers.py` created with all serializer classes
- `CreateProductVariantSerializer` enforces `retail_price >= cost_price` cross-field validation
- `UpdateProductVariantSerializer` enforces the same pricing rules on partial updates where both fields are present
- `ProductVariantSerializer` redacts `cost_price` in `to_representation` based on the requesting user's permissions
- `ProductListQuerySerializer` validates all list query parameters with correct types and defaults
- `StockAdjustmentSerializer` rejects zero-delta adjustments

---

## Validation

- [ ] Submitting a variant with `retail_price` less than `cost_price` returns a 400 with a field-level error on `retail_price`
- [ ] Submitting a variant with valid pricing passes validation and reaches the service layer
- [ ] A user without `catalog:view_cost` receives variant data without the `cost_price` field in any response
- [ ] A user with `catalog:view_cost` receives variant data including the `cost_price` field
- [ ] `ProductListQuerySerializer` rejects `page_size=0` with a 400 error
- [ ] `ProductListQuerySerializer` rejects `page_size=200` with a 400 error (exceeds max of 100)
- [ ] `StockAdjustmentSerializer` rejects `quantity_delta=0` with a 400 error
- [ ] `UpdateProductVariantSerializer` only enforces the pricing cross-field check when both price fields are present in the data

---

## Notes

- DRF `ModelSerializer` automatically generates validators from model field definitions, including `max_length` constraints and `choices` validation. However, cross-field business rules such as price ordering must always be implemented explicitly in the `validate()` method. Relying on database-level constraints alone would result in cryptic 500 errors rather than informative 400 responses.
- The `validate_<field_name>()` hook runs during the per-field validation phase, before the cross-field `validate()` method is invoked. Use single-field validators for format and range constraints, and cross-field validators for relational constraints between fields.
- Always pass `context={'request': request}` when instantiating `ProductSerializer` or `ProductVariantSerializer` in views. Omitting the request from context will cause the `to_representation()` cost price redaction logic to silently fail to perform the check, which would expose cost prices to all users regardless of permissions.
- Serializers in this file are for validation and output shaping only. They do not write to the database. All persistence operations are the responsibility of the service layer.
