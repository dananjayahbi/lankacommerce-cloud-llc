# Task 02.01.09 — Build Product & Variant API Routes

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Tasks 02.01.02–02.01.06 (product models and service layer), Task 02.01.08 (catalog URL setup) |

---

## Objective

This task creates DRF API views for product and variant endpoints. It includes list and create views for products, a detail view with full variant data, a variant detail view for individual SKU management, and a barcode lookup endpoint optimized for POS scanner performance. Special attention is given to cost price redaction in the serializer layer and the 50-millisecond performance target on the barcode endpoint.

---

## Instructions

### Step 1: Define the Product List and Create View

Open `backend/apps/catalog/views.py` and define `ProductListCreateView` inheriting from `APIView`. Set the same `authentication_classes` and `permission_classes` as the category views established in Task 02.01.08.

Implement a `get` method that performs the following steps in order:

1. Extracts `tenant_id` from `request.user.tenant_id`.
2. Validates all query parameters by instantiating `ProductListQuerySerializer` with `data=request.query_params` and calling `.is_valid()`. If validation fails, returns 400 with the error envelope.
3. Extracts `page` and `page_size` from the validated query data (defaulting to page 1 and page size 20).
4. Extracts filter parameters (`category_id`, `brand_id`, `gender`, `is_archived`, `search`) from the validated query data.
5. Calls `product_service.get_all_products(tenant_id, filters=filter_params)` to receive the annotated queryset.
6. Counts the total number of matching records using `.count()` on the queryset before applying pagination.
7. Computes the slice offset as `(page - 1) * page_size` and slices the queryset to retrieve only the records for the current page.
8. Serializes the sliced result using `ProductListSerializer` with `many=True` and `context={'request': request}`.
9. Returns a 200 response with `success=True`, `data` holding the serialized list, and a `meta` object containing `total`, `page`, and `page_size`.

Implement a `post` method that performs the following steps:

1. Extracts `tenant_id` and `actor_id` from `request.user`.
2. Validates `request.data` using `CreateProductSerializer`. On failure, returns 400.
3. Opens a `transaction.atomic()` block.
4. Inside the transaction, calls `product_service.create_product(tenant_id, actor_id, validated_data)` to create the product record.
5. If `variant_definitions` is non-empty in `validated_data`, calls `product_service.create_product_variants(tenant_id, product.id, validated_data['variant_definitions'])`.
6. Serializes the newly created product and its variants using `ProductSerializer` with `context={'request': request}`.
7. Returns a 201 response with the serialized product.
8. If a `ConflictError` is raised (e.g., duplicate SKU), the transaction rolls back and the view returns a 409 response.

### Step 2: Define the Product Detail View

Define `ProductDetailView` inheriting from `APIView`. The URL path includes a `<uuid:product_id>` segment.

Implement a `get` method that:
1. Calls `product_service.get_product_by_id(tenant_id, product_id)`.
2. Returns 404 if the product is not found or belongs to a different tenant.
3. Serializes using `ProductSerializer` with `context={'request': request}`. The nested `ProductVariantSerializer` checks the request user's permissions and conditionally omits `cost_price` from each variant's representation.
4. Returns 200 with the serialized product.

Implement a `patch` method that:
1. Validates `request.data` using `UpdateProductSerializer`. Returns 400 on validation failure.
2. Calls `product_service.update_product(tenant_id, product_id, actor_id, validated_data)`.
3. Serializes and returns the updated product in a 200 response.

Implement a `delete` method that calls `product_service.soft_delete_product(tenant_id, product_id, actor_id)` and returns a 200 envelope with a success message. Returns 404 if the product does not exist.

### Step 3: Define the Variant Detail View

Define `VariantDetailView` inheriting from `APIView`. The URL path is `/api/catalog/variants/<uuid:variant_id>/`.

Implement a `get` method that fetches the variant by ID and confirms tenant ownership, then serializes using `ProductVariantSerializer` with the request context (enabling cost price redaction). Returns 200 or 404 as appropriate.

Implement a `patch` method that validates incoming data using `UpdateProductVariantSerializer` and calls `product_service.update_product_variant(tenant_id, variant_id, actor_id, validated_data)`. Returns the updated variant in a 200 response.

Implement a `delete` method that soft-deletes the variant by calling the appropriate service function, which sets `deleted_at` on the variant record. Returns a 200 success envelope.

### Step 4: Define the Barcode Lookup View

Define `BarcodeVariantView` inheriting from `APIView`. The URL path is `/api/catalog/variants/barcode/<str:barcode>/`. This endpoint is called by the POS terminal scanner on every item scanned and must be extremely fast.

Implement a `get` method that performs the following steps:

1. Validates the `barcode` path parameter format before touching the database. A valid barcode is a non-empty string of between 8 and 20 alphanumeric characters (letters, digits, and hyphens only). If the barcode fails this validation, return a 400 response immediately without querying the database.
2. Queries `ProductVariant.objects.filter(tenant_id=tenant_id, barcode=barcode, deleted_at__isnull=True).select_related('product')`. This query uses the compound index on `(tenant, barcode)` established in Task 02.01.03.
3. If no variant is found, returns 404.
4. Serializes the variant using `ProductVariantSerializer` with `context={'request': request}` for cost price redaction.
5. Returns a 200 response.

Do not add any supplementary database queries, permission checks that require additional queries, or other processing steps between the barcode validation and the index lookup. Every additional query adds latency. The target is to complete the entire round-trip within 50 milliseconds.

### Step 5: Define the Product Image Upload View

Define `ProductImageUploadView` inheriting from `APIView`. The URL path is `/api/catalog/products/<uuid:product_id>/upload-image/`. This endpoint requires `catalog:manage_products` permission.

Implement a `post` method that:

1. Confirms the product exists and belongs to the tenant using `product_service.get_product_by_id(...)`. Returns 404 if not found.
2. Reads the uploaded file from `request.FILES` using the key `image`. If no file is present in `request.FILES`, returns a 400 error envelope.
3. Validates the file's MIME type by checking the content type header. Accepted types are `image/jpeg`, `image/png`, and `image/webp`. If the MIME type is not acceptable, returns 400.
4. Validates that the file size does not exceed the configured maximum upload size (set in Django settings). Returns 400 if the file is too large.
5. Reads the file into bytes using the file object's `.read()` method.
6. Constructs a storage path string using the format `products/{product_id}/{filename}`.
7. Creates an `UploadOptions` instance with the detected content type.
8. Calls `upload_file(file_bytes, path, options)` from `apps.catalog.storage`.
9. Retrieves the `variant_id` from `request.data` if provided; otherwise targets the first non-deleted variant of the product.
10. Appends the returned `public_url` to the targeted variant's `image_urls` array and saves the variant.
11. Returns a 200 response containing the uploaded image URL in the standard data envelope.

### Step 6: Register All New URL Patterns

In `backend/apps/catalog/urls.py`, add the following path entries to `urlpatterns`. Register them in this exact order to ensure correct URL resolution:

- `products/` mapped to `ProductListCreateView.as_view()`.
- `products/<uuid:product_id>/` mapped to `ProductDetailView.as_view()`.
- `products/<uuid:product_id>/upload-image/` mapped to `ProductImageUploadView.as_view()`.
- `variants/barcode/<str:barcode>/` mapped to `BarcodeVariantView.as_view()`.
- `variants/<uuid:variant_id>/` mapped to `VariantDetailView.as_view()`.

The `variants/barcode/<str:barcode>/` pattern must appear before the `variants/<uuid:variant_id>/` pattern in the list. Django resolves URL patterns from top to bottom, and the literal path segment `barcode/` must take precedence over the `<uuid:...>` converter. Reversing this order causes the barcode URL to fail UUID conversion and return a 404.

---

## Expected Output

- `ProductListCreateView`, `ProductDetailView`, `VariantDetailView`, `BarcodeVariantView`, and `ProductImageUploadView` defined in `backend/apps/catalog/views.py`
- All five URL patterns registered in `backend/apps/catalog/urls.py` in the correct order
- All endpoints enforce tenant isolation via `tenant_id` from the JWT
- Cost price redaction applied to all variant-containing responses

---

## Validation

- [ ] `GET /api/catalog/products/` returns 401 without a JWT
- [ ] `GET /api/catalog/products/` returns a paginated product list with `meta.total`, `meta.page`, and `meta.page_size`
- [ ] `GET /api/catalog/products/?search=shirt` returns only products whose name contains "shirt"
- [ ] `POST /api/catalog/products/` creates product and variants atomically — if variant creation fails, the product is also rolled back
- [ ] `GET /api/catalog/products/{id}/` returns full product with nested variants
- [ ] `cost_price` is absent from variant data for users without `catalog:view_cost` permission
- [ ] `cost_price` is present in variant data for users with `catalog:view_cost` permission
- [ ] `GET /api/catalog/variants/barcode/{barcode}/` responds within 50 milliseconds for indexed lookups
- [ ] A barcode value shorter than 8 characters returns 400
- [ ] A barcode value longer than 20 characters returns 400
- [ ] Soft-deleted products return 404 on the detail endpoint

---

## Notes

- The URL ordering for barcode before UUID variant is critical and must be enforced at code review. A comment should be added above the barcode URL pattern entry in `urls.py` explaining why it must precede the UUID variant entry.
- Do not add `select_for_update()` to the barcode lookup — it is a read-only operation and pessimistic locking would severely degrade scan throughput.
- The image upload endpoint accepts multipart form data. The `request.FILES` dictionary contains the uploaded file object. The maximum accepted file size should be defined as a Django setting (for example, `CATALOG_MAX_IMAGE_UPLOAD_SIZE_BYTES = 5_000_000` for 5 MB) rather than as a hardcoded constant in the view.
- All responses from the product and variant endpoints must pass the request object in the serializer context so that `ProductVariantSerializer` can perform cost price redaction correctly.
