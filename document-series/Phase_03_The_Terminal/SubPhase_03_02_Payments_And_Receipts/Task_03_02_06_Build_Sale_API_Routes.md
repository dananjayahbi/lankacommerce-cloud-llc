# Task 03.02.06 — Build Sale API Routes

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.06 |
| Name | Build Sale API Routes |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | High |
| Depends On | Task 03.02.02 |
| Produces | `backend/apps/pos/serializers/sale_serializer.py`, `backend/apps/pos/views/sale_views.py`, URL registrations in `backend/apps/pos/urls.py` |

## Objective

Build the complete set of sale-related DRF views: creating a sale with atomic persistence (`POST /api/pos/sales/`), listing sales with filters and pagination (`GET /api/pos/sales/`), fetching a single sale (`GET /api/pos/sales/{id}/`), voiding a sale (`POST /api/pos/sales/{id}/void/`), and serving the thermal receipt as an HTML response (`GET /api/pos/sales/{id}/receipt/`).

## Instructions

### Step 1: Define the Sale Serializers

Create `backend/apps/pos/serializers/sale_serializer.py`. Define a `CreateSaleSerializer` using DRF's `Serializer` class with the following fields:

- `shift_id`: a `UUIDField`, required.
- `lines`: a `ListField` of `DictField` children, minimum one element required. Each element is validated in `validate_lines` to confirm it contains `variant_id`, `quantity` (positive integer), and `unit_price` (positive decimal), and an optional `discount_percent`.
- `cart_discount_percent`: a `DecimalField` with `max_digits=5`, `decimal_places=2`, minimum 0, maximum 100, defaulting to 0 if omitted.
- `authorizing_manager_id`: a `UUIDField`, optional.
- `payment_method`: a `ChoiceField` with choices `CASH`, `CARD`, `SPLIT`.
- `cash_received`: a `DecimalField` optional, positive.
- `card_reference_number`: a `CharField` optional, max length 20.
- `card_amount`: a `DecimalField` optional, positive.
- `queued_at`: a `DateTimeField` optional — populated by the client when the sale was assembled offline and the request was queued. The view uses this for the staleness check.

Override `validate` to enforce cross-field payment rules: if `payment_method` is `"CASH"`, confirm `cash_received` is present and positive; if `payment_method` is `"SPLIT"`, confirm both `card_amount` and `cash_received` are present and positive. Raise `serializers.ValidationError` on failure.

Define a `GetSalesQuerySerializer` for query parameters: `shift_id`, `cashier_id`, `status` (choice), `from_date`, `to_date` (both `DateField` optional), `page` (integer, min 1, default 1), and `limit` (integer, min 1, max 100, default 20).

Define a `VoidSaleSerializer` with a single required `reason` field (`CharField`, min length 5).

### Step 2: Build POST /api/pos/sales/

Create `backend/apps/pos/views/sale_views.py`. Implement a `CreateSaleView` DRF `APIView` (or `GenericAPIView`) with `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.

In the `post` method: extract `tenant_id` and `user_id` from the JWT claims (`request.auth`). Instantiate `CreateSaleSerializer` with `request.data`. Call `serializer.is_valid(raise_exception=True)`. If validation passes, call `sale_service.create_sale` with the validated data, `tenant_id`, and `user_id` as the cashier.

If the service raises a `ShiftNotFoundError`, return a 409 response. If the service raises a `StockInsufficiencyError` or `InvalidVariantError`, return a 422 response with a descriptive error message. For any unexpected exception, log it server-side and return a 500 response with a generic message.

Include the staleness check: if `queued_at` is present in the validated data and is more than `settings.OFFLINE_SALE_STALE_HOURS` (defaulting to 4) hours in the past, return a 410 response with the message "This offline sale payload has expired and will not be processed. Please contact your manager." Log the stale payload details at the warning level.

On success, return a 201 response with the created sale in the standard response envelope. The sale data must include `id`, `status`, `total_amount`, `payment_method`, all `SaleLine` records with their snapshots, all `Payment` records, and the shift reference.

### Step 3: Build GET /api/pos/sales/

In the same view file or a list view class, implement the `get` method on a `SaleListView`. Validate query parameters using `GetSalesQuerySerializer`. Check that the user has `pos:access` or `stock:view` permission — return 403 if neither. Call `sale_service.get_sales` with the parsed filters and `tenant_id`. Return paginated results with a `meta` object containing `total`, `page`, and `total_pages`.

### Step 4: Build GET /api/pos/sales/{id}/

Implement `SaleDetailView` (a DRF `RetrieveAPIView` or `APIView`). Read the `id` from `kwargs`. Call `sale_service.get_sale_by_id` with the `sale_id` and `tenant_id`. The service validates that the sale belongs to the tenant — if not, treat as not found. Return 404 if not found.

The response data includes the full sale record, `SaleLine` records with `product_name_snapshot` and `variant_description_snapshot`, all `Payment` records, the cashier's `id` and name, the shift's `id` and `opened_at` timestamp, and the tenant name.

### Step 5: Build POST /api/pos/sales/{id}/void/

Implement `VoidSaleView`. Parse the body using `VoidSaleSerializer`. Check that the user has the `pos:void_sale` permission — return 403 if not. Fetch the sale to confirm its current status. If the sale is already `VOIDED` or `REFUNDED`, return 409. Call `sale_service.void_sale` with `sale_id`, `tenant_id`, the authenticated `user_id`, and the `reason` string. The service updates `Sale.status` to `VOIDED`, sets `voided_at`, stores `void_reason`, and writes an `AuditLog` entry. Return the updated sale in a 200 response.

### Step 6: Build GET /api/pos/sales/{id}/receipt/

Implement `SaleReceiptView`. This view returns raw HTML, not JSON. Call `sale_service.get_sale_by_id`. If not found, return an `HttpResponse` with a minimal HTML "Receipt not found" page and status 404. Fetch the `Tenant` record. Call `build_thermal_receipt_html(sale, tenant, cashier_name)` from `backend/apps/pos/utils/receipt_renderer.py`. Return `HttpResponse(html_string, content_type='text/html')` with headers `Cache-Control: no-store, no-cache` and `Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'`. The `script-src 'unsafe-inline'` exception is required solely for the `window.print()` auto-print script embedded in the receipt HTML.

### Step 7: Error Handling Discipline

All views return responses in the standard LankaCommerce envelope: `{ "success": true, "data": {...} }` or `{ "success": false, "error": { "code": ..., "message": ... } }`. Error responses never expose raw Django ORM error messages, database identifiers, or stack traces. Every `except` block logs the full exception server-side and returns only a sanitised message to the client.

## Expected Output

- `backend/apps/pos/serializers/sale_serializer.py` with `CreateSaleSerializer`, `GetSalesQuerySerializer`, and `VoidSaleSerializer`.
- `backend/apps/pos/views/sale_views.py` with all five sale views.
- URL patterns registered in `backend/apps/pos/urls.py`.

## Validation

- `POST /api/pos/sales/` with a valid CASH payload creates one `Sale` and one CASH `Payment` record and returns 201.
- `POST /api/pos/sales/` with a SPLIT payload creates one `Sale` and two `Payment` records and returns 201.
- `POST /api/pos/sales/` with `payment_method: "CASH"` but no `cash_received` returns 400.
- `GET /api/pos/sales/` returns a paginated list.
- `GET /api/pos/sales/{id}/` with a sale belonging to a different tenant returns 404.
- `POST /api/pos/sales/{id}/void/` sets `status` to `VOIDED` and creates an `AuditLog` entry.
- Calling void on an already-voided sale returns 409.
- `GET /api/pos/sales/{id}/receipt/` returns a 200 response with `Content-Type: text/html`.

## Notes

- The `sale_service.create_sale` function is the single source of truth for atomicity. Views must not create any database records directly — they only validate input, delegate to the service, and map the result to an HTTP response.
- The `queued_at` staleness threshold in the view must match the client-side threshold in `useOfflineSync` to avoid edge cases where the client permits submission but the server rejects it.
- The receipt endpoint does not enforce the same RBAC permission as the JSON endpoints — any authenticated user with access to the tenant can view a receipt. Store managers reviewing a receipt on a customer's behalf should not be blocked by cashier-specific permissions.
