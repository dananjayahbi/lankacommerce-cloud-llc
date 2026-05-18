# Task 03.03.07 — Build Return API Routes

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.07 |
| Name | Build Return API Routes |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | Task 03.03.02 |
| Produces | `backend/apps/pos/serializers/return_serializer.py`, `backend/apps/pos/views/return_views.py`, URL registrations in `backend/apps/pos/urls.py`, modification to `GET /api/pos/sales/{id}/` |

---

## Objective

Build the HTTP API layer for the returns subsystem. These DRF views expose `return_service.py` to the client, enforce tenant scoping, validate all inputs with DRF Serializers, and return standardized response envelopes.

---

## Instructions

### Step 1: Create the Return Serializer

Create `backend/apps/pos/serializers/return_serializer.py`. Define a `CreateReturnSerializer` using DRF's `Serializer` class with:

- `original_sale_id`: `UUIDField`, required
- `lines`: `ListField` with at least one element, each containing `sale_line_id`, `variant_id`, and `quantity` (positive integer). Validate in `validate_lines`.
- `refund_method`: `ChoiceField` with choices from `ReturnRefundMethod`
- `restock_items`: `BooleanField`, default `True`
- `reason`: `CharField`, max length 200, optional
- `authorized_by_id`: `UUIDField`, required
- `card_reversal_reference`: `CharField`, max length 50, optional
- `linked_return_id`: `UUIDField`, optional

Override `validate` to enforce: when `refund_method` is `"CARD_REVERSAL"` and `card_reversal_reference` is empty, raise `serializers.ValidationError` on the `card_reversal_reference` field with message "Reversal reference number is required for card reversals."

Define a `GetReturnsQuerySerializer` for query parameters: `original_sale_id` (UUID, optional), `refund_method` (choice, optional), `from_date` (`DateField`, optional), `to_date` (`DateField`, optional), `page` (integer, min 1, default 1), `limit` (integer, min 1, max 100, default 25).

### Step 2: Build POST /api/pos/returns/

Create `backend/apps/pos/views/return_views.py`. Implement `CreateReturnView` as a DRF `APIView` with `JWTAuthentication` and `HasTenantPermission`. In the `post` method:

1. Extract `tenant_id` and `user_id` from JWT claims.
2. Validate request body using `CreateReturnSerializer`.
3. Verify the `authorized_by_id` user exists, belongs to the same tenant, and has role `MANAGER`, `OWNER`, or `SUPER_ADMIN` — return 403 with "Authorizing user is not a manager in this tenant" if not.
4. Call `return_service.initiate_return` with validated data and `tenant_id`.
5. Return a 201 response with `{ "success": true, "data": return_record }`.
6. Catch `ValueError` from the service (return window expired, over-quantity) and return 422 with the error message.
7. Catch unexpected exceptions, log server-side, return 500.

### Step 3: Build GET /api/pos/returns/

Add `ReturnListView` to the same view file. Validate query parameters using `GetReturnsQuerySerializer`. Call `return_service.get_returns` with `tenant_id` and filters. Return paginated results with a `meta` object containing `total`, `page`, `limit`, `total_pages`.

### Step 4: Build GET /api/pos/returns/{id}/

Add `ReturnDetailView`. Read `id` from URL kwargs. Call `return_service.get_return_by_id(tenant_id, return_id)`. Catch `Return.DoesNotExist` and return 404. Return 200 with the full return record including lines, original sale data, and user references.

### Step 5: Update GET /api/pos/sales/{id}/ to Include returned_already

Update the existing sale detail DRF view to include, for each `SaleLine`, a computed `returned_already` field. This is the sum of all `ReturnLine.quantity` values from `COMPLETED` returns for that `SaleLine`. Compute this efficiently using a Django `annotate` or `aggregate` query on the `SaleLine` queryset, then attach the result to each line's serialized output. This field powers the `ReturnItemSelectionStep` to determine remaining returnable quantities.

### Step 6: Register URL Patterns

Add URL patterns in `backend/apps/pos/urls.py`:

- `POST /api/pos/returns/` → `CreateReturnView`
- `GET /api/pos/returns/` → `ReturnListView`
- `GET /api/pos/returns/{id}/` → `ReturnDetailView`

---

## Expected Output

- `backend/apps/pos/serializers/return_serializer.py` with `CreateReturnSerializer` and `GetReturnsQuerySerializer`
- `backend/apps/pos/views/return_views.py` with three return views
- URL patterns registered
- `GET /api/pos/sales/{id}/` updated to include `returned_already` per line

---

## Validation

- `POST /api/pos/returns/` with `refund_method: "CARD_REVERSAL"` and no `card_reversal_reference` returns 400
- `POST /api/pos/returns/` with an `authorized_by_id` that is a CASHIER role returns 403
- `POST /api/pos/returns/` with a sale older than 30 days returns 422
- `GET /api/pos/returns/` returns only returns for the authenticated tenant
- `GET /api/pos/sales/{id}/` response includes `returned_already` on each sale line

---

## Notes

PIN verification is performed client-side via `POST /api/accounts/auth/verify-pin/`. The return API trusts the `authorized_by_id` and validates only the identity and role — not the PIN hash. This separation is intentional: the PIN is a UX-level authorization prompt; the server-side role check is the security enforcement.
