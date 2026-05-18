# Task 03.01.03 — Build Sale Service Layer

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.03 |
| Task Name | Build Sale Service Layer |
| Sub-Phase | 03.01 — POS Core |
| Complexity | High |
| Dependency | Task_03_01_02 |
| Output Files | `backend/apps/pos/services/sale_service.py`, `backend/apps/pos/serializers.py` (modified), `backend/apps/pos/views.py` (modified), `backend/apps/pos/urls.py` (modified) |

---

## Objective

Create the sale service module at `backend/apps/pos/services/sale_service.py` and its associated DRF API endpoints. This task implements all sale lifecycle operations: creating a completed sale with atomic stock deduction inside a single `transaction.atomic()` block with `select_for_update()`, retrieving individual and paginated sales, voiding a completed sale with full stock restoration and audit logging, and returning shift-level sale aggregates for use in shift closure calculations.

---

## Step 1 — Establish Imports and Input Type Definitions

Create the file `backend/apps/pos/services/sale_service.py`. Begin by establishing all necessary imports. From `django.db`, import `transaction`. From `django.db.models`, import `Sum`, `Count`, and `Q` for ORM aggregation queries. From `django.utils`, import `timezone` for timezone-aware datetime stamps. From Python's standard `decimal` module, import `Decimal` and `ROUND_HALF_UP`.

Import the Django ORM models needed: `Sale`, `SaleLine`, `Shift`, `ShiftStatus`, `SaleStatus`, `PaymentMethod`, and `StockMovementReason` from `backend/apps/pos/models` and `backend/apps/catalog/models` respectively. Import `ProductVariant` from `backend/apps/catalog/models`. Import the `User` model from `backend/apps/accounts/models`. Import `adjust_stock` from `backend/apps/catalog/services/inventory_service`. Import the shared exception classes — `ConflictError`, `NotFoundError`, and `PermissionDeniedError` — from `backend/apps/core/exceptions`.

Define Python dataclass or typed-dict structures for the input objects. `CreateSaleLineInput` should carry `variant_id` (string), `quantity` (positive integer), and `discount_percent` (Decimal, defaulting to zero). `CreateSaleInput` should carry `cashier_id` (string), `shift_id` (string), `lines` (a list of `CreateSaleLineInput`), `cart_discount_amount` (Decimal, defaulting to zero), an optional `authorizing_manager_id` (string or None), and `payment_method` (a `PaymentMethod` value).

---

## Step 2 — Implement create_sale

The `create_sale(tenant_id, sale_input)` function is the most critical function in the entire POS service layer. Every database write it performs must execute inside a single `with transaction.atomic():` block. This is non-negotiable. Using sequential ORM writes outside a transaction risks leaving the database in a partial state — for example, a `Sale` record created but stock not yet deducted, or some lines written but not others — if the server crashes or a database error occurs mid-sequence.

Inside the atomic block, proceed through the following sequence of steps in strict order.

**Validate the shift.** Query `Shift.objects.select_for_update().get(id=sale_input.shift_id, tenant_id=tenant_id)`. The `select_for_update()` call acquires a row-level write lock on the shift record, preventing concurrent requests from closing or modifying the shift during the sale creation. If the shift does not exist, raise `NotFoundError`. If the shift exists but its `status` is not `ShiftStatus.OPEN`, raise `ConflictError` with a descriptive message explaining that sales cannot be created against a closed shift.

**Resolve variants and product data.** For every line in `sale_input.lines`, query `ProductVariant.objects.select_related('product').get(id=line.variant_id)`. The `select_related('product')` prevents an N+1 query pattern by fetching the associated `Product` record in the same SQL query. For each resolved variant, verify that `variant.product.tenant_id == tenant_id` — this guards against cross-tenant data leakage. Also verify that `variant.product.is_archived == False` — archived products must not appear in new sales. If any variant cannot be found or fails the tenant or archive check, raise `NotFoundError` naming the specific `variant_id`. Build an in-memory mapping of `variant_id` to the resolved variant object so you do not query the database again for the same variant later in the same function.

**Compute line-level financial figures.** For each line, construct all monetary values using Python's `Decimal` type. Compute `unit_price` from `Decimal(str(variant.retail_price))` — always convert via string to avoid floating-point rounding errors that arise when passing a float directly to the `Decimal` constructor. Compute `line_total_before_discount = unit_price * Decimal(str(line.quantity))`. Compute `discount_amount = (line_total_before_discount * line.discount_percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`. Compute `line_total_after_discount = line_total_before_discount - discount_amount`. Apply per-line tax: read the product's `tax_rule` field and apply the corresponding rate — 15% for `STANDARD_VAT`, 2.5% for `SSCL`, and 0% for `EXEMPT`. Compute each line's tax amount as `(line_total_after_discount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`. Accumulate all per-line tax amounts into a running `total_tax` value.

**Compute sale-level totals.** Sum all `line_total_after_discount` values to obtain `subtotal`. Validate that `sale_input.cart_discount_amount` does not exceed `subtotal` — if it does, raise a `ConflictError` explaining the cart discount cannot exceed the subtotal. Compute `total_amount = subtotal - cart_discount_amount + total_tax`. Round to two decimal places using `ROUND_HALF_UP`.

**Validate stock availability.** For each line, check whether `variant.stock_quantity >= line.quantity`. If the tenant's `allow_negative_stock` setting is `True`, skip this check. If the check fails for any variant, raise `ConflictError` including the variant's `product_name`, `sku`, the `stock_quantity` currently available, and the `quantity` requested. This gives the cashier actionable information rather than a generic error.

**Create the Sale record.** Call `Sale.objects.create(...)` with all computed financial values, `status=SaleStatus.COMPLETED`, `completed_at=timezone.now()`, the `shift_id`, `cashier_id`, `tenant_id`, `payment_method`, and `authorizing_manager_id` as supplied in the input. The `Sale` record must be created before the `SaleLine` records because the lines require a foreign key reference to the sale's `id`.

**Create all SaleLine records.** For each line in the input, call `SaleLine.objects.create(...)` with all financial fields and all three snapshot fields. Assemble `product_name_snapshot` from `variant.product.name`, `variant_description_snapshot` by concatenating the variant's attribute values into a human-readable string (for example, joining size and colour attributes with a slash separator), and `sku` from `variant.sku`.

**Adjust stock for each line.** For each line, call `adjust_stock(tenant_id=tenant_id, variant_id=line.variant_id, actor_id=sale_input.cashier_id, quantity_delta=-line.quantity, reason=StockMovementReason.SALE)`. Pass a negative `quantity_delta` to reduce stock. This function is called within the already-active `transaction.atomic()` block. Django handles nested atomic blocks using database-level savepoints, so calling `adjust_stock` — which may itself wrap its writes in `transaction.atomic()` — from within this outer block is safe and correct. If `adjust_stock` raises any exception, the entire outer transaction rolls back, leaving the database in its pre-call state with no `Sale` record, no `SaleLine` records, and no stock changes.

**Return the completed Sale.** After the atomic block exits successfully, re-query the sale with `Sale.objects.select_related('cashier', 'authorizing_manager', 'shift').prefetch_related('lines__variant__product').get(id=sale.id)` to return a fully populated object.

---

## Step 3 — Implement get_sale_by_id

The `get_sale_by_id(tenant_id, sale_id)` function retrieves a single sale with all related data needed to render a sale detail view or receipt. Use `Sale.objects.select_related('cashier', 'authorizing_manager', 'voided_by', 'shift').prefetch_related('lines__variant__product')` filtered by `id=sale_id` and `tenant_id=tenant_id`. If no matching record is found, raise `NotFoundError`. Return the fully populated sale object.

---

## Step 4 — Implement get_sales

The `get_sales(tenant_id, filters=None)` function accepts an optional `filters` dictionary containing any combination of `shift_id`, `cashier_id`, `status`, `from_date`, `to_date`, `page` (defaulting to 1), and `limit` (defaulting to 20 with a maximum of 100).

Build the base queryset: `Sale.objects.filter(tenant_id=tenant_id)`. Apply each filter from the dictionary if the corresponding key is present and non-None. Use `status__in` if a list of statuses is provided or `status=` for a single value. Use `created_at__gte` for `from_date` and `created_at__lte` for `to_date`. Order the result set by `created_at` descending so the most recent sales appear first.

Compute the total record count using `.count()` on the unsliced queryset — this executes as a single `SELECT COUNT(*)` query and is critical for the frontend's pagination controls. Compute the offset as `(page - 1) * limit` and slice the queryset as `queryset[offset : offset + limit]`. Return both the sliced sale list and the total count, wrapped in whatever response structure the DRF view expects.

---

## Step 5 — Implement void_sale

The `void_sale(tenant_id, sale_id, actor_id)` function reverses a completed sale. Begin with an RBAC permission check before any database access: verify the acting user has the `pos:void_sale` permission using the shared permission utility from Phase 01. If they do not, raise `PermissionDeniedError` immediately.

Inside `with transaction.atomic():`, query `Sale.objects.select_for_update().get(id=sale_id, tenant_id=tenant_id)`. The `select_for_update()` lock prevents concurrent void attempts on the same sale. If the sale is not found, raise `NotFoundError`. Check the sale's status: if it is already `VOIDED`, raise `ConflictError` with the message that the sale has already been voided. If it is `OPEN` (held), raise `ConflictError` explaining that held sales cannot be voided — they must be retrieved and either completed or discarded by clearing the cart.

Retrieve the sale's associated shift and confirm that `shift.status == ShiftStatus.OPEN`. Voiding a sale from a closed shift is not permitted in Phase 03. If the shift is closed, raise `ConflictError` with a clear explanation.

Update the sale record: set `status=SaleStatus.VOIDED`, `voided_by_id=actor_id`, and `voided_at=timezone.now()`. Call `Sale.objects.filter(id=sale_id).update(...)` rather than fetching and saving the full instance to minimise the number of round trips.

For each `SaleLine` associated with the sale, call `adjust_stock(tenant_id=tenant_id, variant_id=line.variant_id, actor_id=actor_id, quantity_delta=+line.quantity, reason=StockMovementReason.VOID_REVERSAL)` with a positive `quantity_delta` to restore the stock. The positive delta symmetrically undoes the negative delta applied at sale creation time.

Finally, create an `AuditLog` entry by calling `log_audit_event` from `backend/apps/catalog/services/audit_service.py` with `action="SALE_VOIDED"`, `actor_id=actor_id`, `tenant_id=tenant_id`, and relevant metadata including the `sale_id`.

Return the updated `Sale` record by re-querying with `get_sale_by_id`.

---

## Step 6 — Implement get_shift_sales

The `get_shift_sales(tenant_id, shift_id)` function provides aggregated sale data for a shift, primarily consumed by `close_shift` and the shift summary view. First validate that the shift exists and belongs to `tenant_id` — raise `NotFoundError` if not.

Query `Sale.objects.filter(shift_id=shift_id, status=SaleStatus.COMPLETED)` as the base queryset. Apply Django ORM aggregation: compute `total_sales_amount` using `Sum('total_amount')`, `cash_sum` using `Sum('total_amount', filter=Q(payment_method=PaymentMethod.CASH))`, `card_sum` using `Sum('total_amount', filter=Q(payment_method=PaymentMethod.CARD))`, `discount_sum` using `Sum('discount_amount')`, and `total_sales_count` using `Count('id')`. Handle `None` aggregation results (which occur when no completed sales exist) by substituting `Decimal('0.00')`.

Return both the list of completed sales and the summary object so callers can use either or both pieces of data.

---

## Step 7 — Create Serializers

In `backend/apps/pos/serializers.py`, define two DRF serializers for the create-sale workflow.

`CreateSaleLineSerializer` must validate: `variant_id` is a non-empty string, `quantity` is a positive integer with a minimum value of 1, and `discount_percent` is an optional decimal between 0 and 100 inclusive (defaulting to 0 if not provided).

`CreateSaleSerializer` must validate: `lines` is a non-empty array containing at least one `CreateSaleLineSerializer` entry, `cart_discount_amount` is a non-negative decimal, `payment_method` is a valid `PaymentMethod` choice, and `shift_id` is a non-empty string. Ensure the serializer uses nested validation for the `lines` field so each line object is individually validated before the outer serializer's `validate` method runs.

---

## Step 8 — Create DRF Views and URL Patterns

In `backend/apps/pos/views.py`, implement the sale-related DRF class-based views. All views must use `JWTAuthentication` from `djangorestframework-simplejwt` as the authentication class and `HasTenantPermission` as the permission class, checking `pos:access` as the required permission code.

`SaleListCreateView` handles `GET` (calling `get_sales`) and `POST` (calling `create_sale`). The `GET` handler extracts filter parameters from `request.query_params`. The `POST` handler deserialises the request body using `CreateSaleSerializer`, validates it, extracts `tenant_id` from the JWT claim `user.tenant_id`, and calls `create_sale`.

`SaleDetailView` handles `GET /api/pos/sales/{id}/` by calling `get_sale_by_id`.

`SaleVoidView` handles `POST /api/pos/sales/{id}/void/` by calling `void_sale`. Requires the actor to have `pos:void_sale` permission, which is checked inside the service layer — the view need only pass `actor_id` from the JWT.

`SaleHoldView` handles `POST /api/pos/sales/hold/`. This view takes a different code path from `create_sale`: it creates a `Sale` with `status=SaleStatus.OPEN` and writes all `SaleLine` records, but it does not call `adjust_stock`, does not validate stock availability, and does not set `completed_at`. The `payment_method` on the created Sale is null. This is intentional — a held sale carries no financial commitments and no inventory impact. The hold endpoint does not require `payment_method` in its request body.

All views wrap service layer results in the standard LankaCommerce response envelope: `{ "success": True, "data": {...} }` on success and `{ "success": False, "error": { "code": "...", "message": "..." } }` on error. Map `NotFoundError` to HTTP 404, `ConflictError` to HTTP 409, and `PermissionDeniedError` to HTTP 403.

In `backend/apps/pos/urls.py`, register the URL patterns: `sales/` routed to `SaleListCreateView`, `sales/<uuid:id>/` routed to `SaleDetailView`, `sales/<uuid:id>/void/` routed to `SaleVoidView`, and `sales/hold/` routed to `SaleHoldView`. In `backend/urls.py`, include the POS URL patterns under the prefix `/api/pos/`.

---

## Expected Output

After this task, `backend/apps/pos/services/sale_service.py` exists with all five implemented functions. `backend/apps/pos/serializers.py` contains `CreateSaleLineSerializer` and `CreateSaleSerializer`. `backend/apps/pos/views.py` contains the four sale views. The DRF URL patterns are registered under `/api/pos/`. All sale endpoints return the standard response envelope.

---

## Notes

The `transaction.atomic()` block is non-negotiable. Partial writes — for example, writing a `Sale` record and some `SaleLine` records before a database connection error prevents the remaining lines from being written — would create orphaned or incomplete sale records that are extremely difficult to detect and resolve. The atomic block guarantees all-or-nothing semantics.

Tax calculation must remain at the line level. Never simplify the implementation by applying a single tax rate to the total. Different products within the same sale may carry different tax rules, and the line-level tax breakdown is required for accurate reporting and compliance.

The `adjust_stock` function from Phase 02 must operate correctly when called from within the outer `transaction.atomic()` block. Django's transaction nesting uses database savepoints, so this is safe. If you encounter issues, check whether `adjust_stock` uses `transaction.atomic()` internally — if it does, Django will create a savepoint for the inner block, and the outer block will still roll back everything on failure.

`ConflictError`, `NotFoundError`, and `PermissionDeniedError` should already exist in `backend/apps/core/exceptions.py` from Phase 01. Do not duplicate these classes — import and reuse them.
