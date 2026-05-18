# Task 02.01.06 — Build Product Service Layer

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | High |
| Dependencies | Tasks 02.01.01–02.01.05 (all catalog models), Task 01.02 (audit log, CustomUser) |

---

## Objective

This task creates the product-focused service layer at `backend/apps/catalog/services/`. The service module encapsulates all business logic for category, brand, product, and variant operations, keeping the DRF view layer thin and focused on HTTP concerns. All database queries, uniqueness checks, atomic transactions, and audit log writes are handled here. The service layer always returns complete objects — cost price redaction is the responsibility of the serializer layer and is never performed in service functions.

---

## Instructions

### Step 1: Create the Services Directory

Create the directory `backend/apps/catalog/services/`. Inside it, create an `__init__.py` file so Python treats the directory as a package. Create a second file named `product_service.py` inside `services/`. All category, brand, product, and variant service functions will reside in this file.

### Step 2: Implement Category Service Functions

In `product_service.py`, implement the following category-related service functions:

**get_all_categories(tenant_id, include_deleted=False)**: Builds a base queryset of all `Category` records filtered by `tenant_id`. By default, applies an additional filter to exclude records where `deleted_at` is not null. Orders results by `sort_order` ascending, then by `name` ascending. Returns the queryset without executing it — the view handles pagination.

**get_category_tree(tenant_id)**: Queries all non-deleted categories for the tenant. Uses `select_related('parent')` to avoid N+1 queries when serializers access parent category names. Returns the full list; the serializer is responsible for nesting children under their parents.

**get_category_by_id(tenant_id, category_id)**: Fetches a single category by primary key that also matches the given `tenant_id` and has a null `deleted_at`. Raises a `NotFoundError` (or `Http404`) if the record does not exist or belongs to a different tenant.

**create_category(tenant_id, actor_id, data)**: First checks whether an active category with the same name already exists under the given tenant using a `.filter(...).exists()` call. If a conflict is detected, raises a `ConflictError` with a descriptive message. If no conflict, creates a new `Category` instance using `Category.objects.create(...)` with `tenant_id`, `name`, `description`, `parent_id`, and `sort_order` extracted from `data`. Writes an audit log entry recording the creation. Returns the newly created instance.

**update_category(tenant_id, category_id, actor_id, data)**: Fetches the active category using `get_category_by_id`. Applies all fields present in `data` to the model instance, then calls `.save()`. Writes an audit log entry. Returns the updated instance.

**soft_delete_category(tenant_id, category_id, actor_id)**: Fetches the active category. Checks that no non-deleted products are currently linked to it using a `Product.objects.filter(category_id=category_id, deleted_at__isnull=True).exists()` check. If products exist, raises a `ConflictError` explaining that the category cannot be deleted while products reference it. If the category is empty, sets `deleted_at` to the current UTC timestamp using `django.utils.timezone.now()` and calls `.save()`. Writes an audit log entry.

### Step 3: Implement Brand Service Functions

Implement the following brand-related functions following the same patterns as the category functions:

**get_all_brands(tenant_id)**: Filters active (non-deleted) brands by tenant. Orders by `name`.

**get_brand_by_id(tenant_id, brand_id)**: Fetches a single active brand by ID and tenant. Raises `NotFoundError` if absent.

**create_brand(tenant_id, actor_id, data)**: Checks for duplicate brand names within the tenant. Creates and returns the brand. Writes an audit log entry.

**update_brand(tenant_id, brand_id, actor_id, data)**: Fetches, updates, saves, and logs the brand.

**soft_delete_brand(tenant_id, brand_id, actor_id)**: Checks whether active products reference this brand. If they do, raises a `ConflictError`. Otherwise, soft-deletes and logs.

### Step 4: Implement Product Listing and Retrieval

**get_all_products(tenant_id, filters)**: Builds a base queryset of `Product` records filtered by `tenant_id` and `deleted_at__isnull=True`. Then applies optional keyword filters extracted from the `filters` dictionary:

- `category_id` applies a ForeignKey equality filter.
- `brand_id` applies a ForeignKey equality filter.
- `gender` applies a `TextChoices` value equality filter.
- `is_archived` applies a boolean filter.
- `search` applies a case-insensitive `icontains` filter on the `name` field.
- `tags` applies a PostgreSQL array containment filter using the `__contains` lookup.

After applying filters, chains `select_related('category', 'brand')` to avoid N+1 queries when serializing the results. Annotates the queryset with a `variant_count` field using Django's `Count()` aggregation on the reverse relation to variants, filtering to exclude soft-deleted variants. Returns the annotated queryset without pagination — the view handles slicing.

**get_product_by_id(tenant_id, product_id)**: Fetches a single non-deleted `Product` matching `pk=product_id` and `tenant_id=tenant_id`. Chains `prefetch_related('variants')` to pre-fetch all non-deleted associated variants in a single additional query. Raises `NotFoundError` or `Http404` if the product does not exist or belongs to a different tenant.

### Step 5: Implement Product Creation

**create_product(tenant_id, actor_id, data)**: Validates that the referenced `category_id` belongs to the same tenant using a quick existence check. Creates a `Product` instance via `Product.objects.create(...)` with all fields from `data` plus the `tenant_id` argument. The `tenant_id` is always sourced from the function argument, never from user-supplied input. Writes an audit log entry referencing the new product ID and actor. Returns the newly created product.

**create_product_variants(tenant_id, product_id, variants_data)**: Wraps the entire operation in `transaction.atomic()`. Fetches the parent product to confirm it belongs to the given tenant — raises `NotFoundError` if not. For each variant definition in `variants_data`, auto-generates a SKU if one is not provided (using a deterministic format based on the product name and a sequential index). Collects all proposed SKUs from the batch and checks for intra-batch duplicates using a simple set comparison. Then queries the database for any existing variants whose SKUs overlap with the batch using a `filter(tenant_id=tenant_id, sku__in=[...]).exists()` check. If any duplicate is found, raises a `ConflictError` and the transaction is rolled back. If all SKUs are unique, constructs `ProductVariant` instances for each definition, setting `tenant_id` on each to match the product's tenant. Creates all instances in a single database round-trip using `ProductVariant.objects.bulk_create([...])`. Returns the list of created variant instances.

### Step 6: Implement Product Updates

**update_product(tenant_id, product_id, actor_id, data)**: Fetches the active product by ID and tenant. Applies only the fields present in `data` to the instance, leaving absent fields unchanged. Calls `.save()`. Writes an audit log entry. Returns the updated product.

**update_product_variant(tenant_id, variant_id, actor_id, data)**: Fetches the active variant by ID. Confirms that its `tenant_id` matches the argument to prevent cross-tenant mutations. Applies updated fields and calls `.save(update_fields=[...])` listing only the modified fields for efficiency. Returns the updated variant.

### Step 7: Implement Soft Delete and Archive

**soft_delete_product(tenant_id, product_id, actor_id)**: Fetches the active product. Opens a `transaction.atomic()` block. Sets `deleted_at` to the current UTC timestamp on the product and also bulk-updates all non-deleted variants linked to the product using `ProductVariant.objects.filter(product_id=product_id, deleted_at__isnull=True).update(deleted_at=now())`. Both the product save and the variant bulk update occur inside the same transaction. Writes a single audit log entry for the product soft-deletion. Returns confirmation.

**archive_product(tenant_id, product_id, actor_id)**: Fetches the active product. Sets `is_archived=True` and calls `.save(update_fields=['is_archived', 'updated_at'])`. This operation does not affect variants or stock quantities. Writes an audit log entry.

**unarchive_product(tenant_id, product_id, actor_id)**: The reverse of `archive_product`. Fetches the product, sets `is_archived=False`, saves, and logs.

### Step 8: Cost Price Access Note

All service functions in `product_service.py` return complete model instances, including `cost_price` on variants. Services must never conditionally omit or mask fields based on user permissions. Cost price redaction — hiding this field from users who lack the `catalog:view_cost` permission — is the sole responsibility of the `ProductVariantSerializer` in `backend/apps/catalog/serializers.py`, implemented in Task 02.01.10.

---

## Expected Output

- `backend/apps/catalog/services/` directory created with `__init__.py`
- `backend/apps/catalog/services/product_service.py` created with all category, brand, product, and variant service functions
- All multi-step write operations wrapped in `transaction.atomic()`
- `select_related` and `prefetch_related` used consistently to avoid N+1 queries
- `bulk_create` used for batch variant insertion

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors after creating the services directory and file
- [ ] `get_all_products` correctly filters by tenant and excludes soft-deleted products
- [ ] `get_all_products` with a `search` filter returns only products whose name contains the search string (case-insensitive)
- [ ] `create_product_variants` raises a conflict error if a duplicate SKU is provided within the same batch
- [ ] `create_product_variants` raises a conflict error if a SKU already exists in the database for the tenant
- [ ] `soft_delete_product` sets `deleted_at` on both the product and all its non-deleted variants
- [ ] `soft_delete_product` rolls back both updates if either fails within the transaction
- [ ] Calling `get_product_by_id` with a product ID belonging to a different tenant raises `NotFoundError` or `Http404`

---

## Notes

- All service functions receive `tenant_id` as an explicit first argument. Views always derive `tenant_id` from `request.user.tenant_id`, which is decoded from the verified JWT. Tenant IDs from request bodies or query parameters must never be trusted.
- Audit log entries should be written using the shared utility from `apps.accounts` established in SubPhase 01.02. Each create, update, archive, and soft-delete operation generates one audit log record containing the actor ID, action type, model name, and object ID.
- The `transaction.atomic()` context manager must be imported from `django.db` at the top of the service file. The `timezone.now()` function for generating UTC timestamps must be imported from `django.utils.timezone`.
- The `NotFoundError` and `ConflictError` custom exception classes should be defined in `backend/apps/catalog/exceptions.py` and imported into the service file.
