# Task 02.03.08 — Build Stock Adjustment API Routes

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.08 |
| Task Name | Build Stock Adjustment API Routes |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | SubPhase_02_01 complete |
| Output Paths | `backend/apps/catalog/views.py` (modified), `backend/apps/catalog/urls.py` (modified) |

---

## Objective

Implement all stock adjustment and inventory query API endpoints in the Django REST Framework catalog application. These endpoints power the manual adjustment form, the bulk adjustment capability, the movement history page, the stock valuation view, and the low-stock alert widget. Every endpoint is authenticated via SimpleJWT, permission-gated through the tenant RBAC system, validated with DRF serializers, and responds using the standard LankaCommerce response envelope format. All mutation endpoints use `transaction.atomic()` with `select_for_update()` to prevent concurrent adjustment races under simultaneous user activity.

---

## Step 1 — Establish Shared Infrastructure

Before implementing individual views, verify that the following shared utilities are in place and importable. If any are missing, create minimal implementations before proceeding.

**`JWTAuthentication` backend:** Confirm that `djangorestframework-simplejwt` is listed in the project dependencies and that `JWTAuthentication` is configured in `REST_FRAMEWORK` settings under `DEFAULT_AUTHENTICATION_CLASSES` in `backend/settings.py`. This backend validates the JWT from the httpOnly cookie on every authenticated request.

**`HasTenantPermission` DRF permission class:** Confirm this class exists and is importable from `backend/apps/accounts/permissions.py`. It must read the authenticated user's tenant role, resolve the set of RBAC permission strings for that role, and check whether the requested permission string is present. The permission string is passed via the `required_permission` attribute or a similar mechanism on the view class.

**Standard response envelope helper:** Confirm that a utility function or mixin is importable from a shared module (such as `backend/utils/responses.py`). For success responses it produces a JSON object in the form `{ "success": true, "data": { ... } }`. For error responses it produces `{ "success": false, "error": { "code": "...", "message": "..." } }`. All views in this sub-phase must use this helper rather than constructing raw `Response` objects with ad-hoc structures.

---

## Step 2 — Build POST /api/catalog/stock/adjust/

Add a `StockAdjustView` class in `backend/apps/catalog/views.py`, inheriting from DRF `APIView`. Set `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]` with the required permission `stock:adjust`.

Define a DRF serializer (either inline or in a dedicated `serializers.py`) that validates the request body. Required fields: `variant_id` as a non-empty string (UUID), `quantity_delta` as a non-zero integer (reject zero with a clear message: "quantity_delta must be non-zero"). Optional fields: `reason` as a string matching a valid `StockMovementReason` choice (default to `DATA_ERROR` or require it explicitly — requiring it is the safer approach), `note` as a string with maximum 500 characters, `sale_id` as a nullable string, `purchase_order_id` as a nullable string, and `stock_take_session_id` as a nullable string.

In the view's `post` method, after serializer validation passes, extract `tenant_id` from the JWT claim on the request. Perform a tenant-scoped existence check: query `ProductVariant.objects.select_related('product').get(id=variant_id, product__tenant_id=tenant_id)`. If the variant does not exist or belongs to a different tenant, return a 404 response using the error envelope with code `VARIANT_NOT_FOUND`.

Call the service function `adjust_stock(tenant_id, variant_id, actor_id, {...validated_data})` from `backend/apps/catalog/services/inventory_service.py`. The service function handles `transaction.atomic()` internally.

On success, return a 200 response with the standard success envelope and a `data` object containing: a `movement` object with `id`, `quantity_before`, `quantity_after`, `quantity_delta`, `reason`, and `created_at`; a `variant` object with `id`, `sku`, and the updated `stock_quantity`; and the boolean `low_stock_triggered`.

If the service raises a `BelowZeroStockError` custom exception, catch it and return a 422 response with `code: "BELOW_ZERO_STOCK"` and a message that includes the variant's current stock level, for example: "Cannot remove 10 units: current stock is only 4."

---

## Step 3 — Build POST /api/catalog/stock/bulk-adjust/

Add a `BulkStockAdjustView` in `backend/apps/catalog/views.py`. Same authentication and `stock:adjust` permission requirement as `StockAdjustView`.

Define a nested DRF serializer that validates an `adjustments` top-level array. Each item in the array uses the same field definitions as the single-adjust serializer. Validate that the array is not empty (reject with 400 and a clear message) and does not exceed 50 items (reject with 400 if it does — callers needing more than 50 adjustments must split into multiple requests).

After serializer validation, extract all `variant_id` values from the array. Perform a single bulk existence check: `ProductVariant.objects.filter(id__in=variant_ids, product__tenant_id=tenant_id).values_list('id', flat=True)`. Compare the returned set to the requested set. If any requested IDs are absent or belong to a different tenant, return a 400 response listing the unresolvable IDs in the error detail.

Call `bulk_adjust_stock(tenant_id, actor_id, adjustments)` from the inventory service. The service handles `transaction.atomic()` internally and creates all `StockMovement` records and low-stock `Notification` records in a single atomic block.

Return a 200 response with `data` containing: `adjusted_count` as the number of adjustments successfully applied, `movements` as an array of movement objects (same shape as the single-adjust response), and `low_stock_triggered_variant_ids` as an array of variant IDs whose stock dropped to or below their threshold as a result of this batch.

---

## Step 4 — Build GET /api/catalog/stock/movements/

Add a `StockMovementListView` in `backend/apps/catalog/views.py`. Authentication: `JWTAuthentication`. Permission: `stock:view`.

Validate query parameters using a DRF serializer or inline validation: `from` and `to` as optional ISO date strings (validate they parse correctly and that `from` is not later than `to`); `reason` as an optional comma-separated list of valid `StockMovementReason` values; `variant_id` as an optional UUID string; `product_id` as an optional UUID string; `actor_id` as an optional UUID string; `page` as a positive integer defaulting to 1; `limit` as a positive integer defaulting to 25 capped at 100; `format` as an optional string accepting only "csv".

**CSV export path:** When `format=csv`, bypass pagination. Query up to 10,000 matching `StockMovement` records ordered by `created_at` descending. Construct a CSV response with `Content-Type: text/csv` and `Content-Disposition: attachment` with a filename in the format "movements-YYYY-MM-DD-to-YYYY-MM-DD.csv". The CSV columns are: Date/Time, Product Name, Category, Variant SKU, Reason, Delta, Quantity Before, Quantity After, Actor Name, Note. Do not include any cost price fields. Return the response immediately without the standard JSON envelope.

**Standard JSON path:** Query `StockMovement` records filtered by `tenant_id` from the JWT claim, and each optional parameter when present. Join with `ProductVariant` (and its parent `Product` with the product's `Category`) and with the actor `User` record. Apply pagination. Return the standard success envelope with `data` containing `movements` array, `total`, `page`, `limit`, and `total_pages`. Each movement item must not include cost price fields.

---

## Step 5 — Build GET /api/catalog/stock/valuation/

Add a `StockValuationView` in `backend/apps/catalog/views.py`. Authentication: `JWTAuthentication`. Permission: `product:view_cost_price`. If the authenticated user does not hold this permission, return a 403 response immediately with `code: "COST_PRICE_RESTRICTED"` and the message: "Stock valuation data includes cost prices, which are restricted to users with cost-price access."

Call `get_stock_valuation(tenant_id)` from `backend/apps/catalog/services/inventory_service.py`. This service function uses Django ORM aggregations to compute the following across all non-archived variants with `stock_quantity > 0` within the tenant:

- `retail_value`: the sum of `stock_quantity × retail_price`
- `cost_value`: the sum of `stock_quantity × cost_price`
- `estimated_margin`: `retail_value - cost_value`
- `estimated_margin_percent`: `(estimated_margin / retail_value) × 100` rounded to two decimal places
- `variant_count`: the count of distinct variants with stock greater than zero
- `category_breakdown`: an array of objects, one per category, each containing `category_id`, `category_name`, `variant_count`, `retail_value`, and `cost_value` — computed using Django ORM `.values('product__category__id', 'product__category__name').annotate(...)` grouping queries

Include `calculated_at` as the current server timestamp in ISO 8601 format.

Return the success envelope with all of the above. Also support `format=csv` for a two-section CSV download: a summary section with labelled rows (Total Retail Value, Total Cost Value, Estimated Margin Rs., Estimated Margin %) followed by the category breakdown section with column headers matching the response fields.

---

## Step 6 — Build GET /api/catalog/stock/low-stock/

Add a `LowStockVariantsView` in `backend/apps/catalog/views.py`. Authentication: `JWTAuthentication`. Permission: `stock:view`.

Validate query parameters: `count_only` as an optional boolean string (default "false"), `threshold_override` as an optional positive integer, `page` as a positive integer defaulting to 1, `limit` as a positive integer defaulting to 25 capped at 100, `format` as an optional "csv".

**When `count_only=true`:** Perform a single ORM count query: `ProductVariant.objects.filter(product__tenant_id=tenant_id, product__is_archived=False, stock_quantity__lte=F('low_stock_threshold'), low_stock_threshold__gt=0).count()`. If `threshold_override` is provided, replace the `stock_quantity__lte=F('low_stock_threshold')` filter with `stock_quantity__lte=threshold_override`. Return `{ "success": true, "data": { "count": N } }` — this is the lightweight response consumed by the `LowStockAlertBadge`.

**When `count_only=false`:** Return the full paginated list of matching variants. For each item include: variant `id`, `sku`, `stock_quantity`, `low_stock_threshold`, `shortfall` (computed as `low_stock_threshold - stock_quantity`), the parent product name, and the parent category name. Sort by `shortfall` descending. Support `format=csv` for download.

---

## Step 7 — Register URL Patterns

In `backend/apps/catalog/urls.py`, add the following URL patterns for the stock adjustment and query views. These patterns are registered without the `/api/catalog/` prefix because that prefix is applied by the main `backend/urls.py` router include:

- A path mapping `stock/adjust/` to `StockAdjustView`, named `stock-adjust`
- A path mapping `stock/bulk-adjust/` to `BulkStockAdjustView`, named `stock-bulk-adjust`
- A path mapping `stock/movements/` to `StockMovementListView`, named `stock-movements`
- A path mapping `stock/valuation/` to `StockValuationView`, named `stock-valuation`
- A path mapping `stock/low-stock/` to `LowStockVariantsView`, named `stock-low-stock`

Confirm that `backend/urls.py` already includes the catalog app URLs under the `/api/catalog/` prefix. If not, add the include statement.
