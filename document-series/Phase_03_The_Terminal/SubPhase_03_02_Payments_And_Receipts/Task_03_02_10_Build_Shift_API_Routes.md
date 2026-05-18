# Task 03.02.10 — Build Shift API Routes

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.10 |
| Name | Build Shift API Routes |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | SubPhase 03.01 complete (`shift_service.py` exists) |
| Produces | `backend/apps/pos/serializers/shift_serializer.py`, `backend/apps/pos/views/shift_views.py`, URL registrations in `backend/apps/pos/urls.py` |

## Objective

Expose the shift lifecycle management functions from `shift_service.py` through RESTful DRF endpoints, completing the server-side contract that the POS terminal frontend requires to open sessions, query the active session, close sessions with cash counts, and browse shift history.

## Instructions

### Step 1: Define the Shift Serializers

Create `backend/apps/pos/serializers/shift_serializer.py`. Define the following serializers:

`OpenShiftSerializer`: one required field `opening_cash_float` (`DecimalField`, `max_digits=12`, `decimal_places=2`, minimum 0, maximum 9,999,999.99).

`CloseShiftSerializer`: one required field `closing_cash_count` (`DecimalField`, `max_digits=12`, `decimal_places=2`, minimum 0, maximum 9,999,999.99). Used to compute the variance between expected and actual cash.

`GetShiftsQuerySerializer`: optional fields `cashier_id` (`UUIDField`), `status` (choice of `"OPEN"` or `"CLOSED"`), `from_date` and `to_date` (`DateField`), `page` (integer, min 1, default 1), `limit` (integer, min 1, max 100, default 20).

### Step 2: Build POST /api/pos/shifts/

Create `backend/apps/pos/views/shift_views.py`. Implement `OpenShiftView` as a DRF `APIView` with `JWTAuthentication` and `HasTenantPermission`. In the `post` method: extract `tenant_id` and `user_id` from JWT claims. Check for `pos:access` permission — return 403 if absent. Validate the body using `OpenShiftSerializer`.

Before calling the service, check for an existing OPEN shift for this cashier in this tenant using `Shift.objects.filter(cashier_id=user_id, tenant_id=tenant_id, status="OPEN").exists()`. If found, return 409 with the message "A shift is already open for this cashier. Please close the existing shift before opening a new one." If no conflict, call `shift_service.open_shift` with `tenant_id`, `cashier_id`, and `opening_cash_float`. Return the new `Shift` record in a 201 response envelope.

### Step 3: Build GET /api/pos/shifts/

In the same view file, implement `ShiftListView`. Check for `pos:access` OR `manager:reports` permission. Validate query parameters using `GetShiftsQuerySerializer`. Pass filters and `tenant_id` to `shift_service.get_shifts`. Return paginated results with a `meta` object containing `total`, `page`, and `total_pages`. Always scope the query to the session's `tenant_id` — even for manager-level users.

### Step 4: Build GET /api/pos/shifts/current/

Implement `CurrentShiftView`. Check for `pos:access`. Call `shift_service.get_current_shift` with `tenant_id` and the session's `user_id`. If the result is `None`, return a 200 response with `data: null` — do not return 404. The absence of an open shift is expected before a cashier opens their first shift. The frontend uses the `null` case to redirect the cashier to the shift-open screen. If a shift is found, include the full `Shift` record in the response data including `opened_at`, `opening_cash_float`, `status`, and the sale count if the service provides it.

### Step 5: Build POST /api/pos/shifts/{id}/close/

Implement `CloseShiftView`. Extract `tenant_id` and `user_id` from JWT claims. Read `id` from URL kwargs. Fetch the `Shift` record filtered by `id` and `tenant_id`. Return 404 if not found. If `shift.status` is already `"CLOSED"`, return 409 with the message "This shift has already been closed." Check the close permission: a cashier may close only their own shift (`shift.cashier_id == user_id`); a user with `manager:shifts` permission may close any shift in the tenant. Return 403 if neither condition is satisfied. Validate the body using `CloseShiftSerializer`. Call `shift_service.close_shift` with `shift_id`, `closing_cash_count`, `tenant_id`, and `user_id`. The service sets `status` to `"CLOSED"`, sets `closed_at`, creates the `ShiftClosure` record with variance calculation, and voids any `ON_HOLD` sales belonging to the shift. Return the updated `Shift` with its nested `ShiftClosure` in a 200 response.

### Step 6: Build GET /api/pos/shifts/{id}/

Implement `ShiftDetailView`. Check for `pos:access` OR `manager:reports`. Fetch the `Shift` by `id` and `tenant_id`. Include the related `ShiftClosure` (if present) and a count of associated sales grouped by status. Return 404 if not found. The response data includes the full `Shift` object, the `ShiftClosure` or null, the cashier's name, and sale counts by status (`COMPLETED`, `VOIDED`, `ON_HOLD`).

### Step 7: RBAC and Tenant Isolation Summary

Add a comment block at the top of `shift_views.py` documenting the permission model:

- `POST /api/pos/shifts/` — requires `pos:access`, scoped to the authenticated user's own cashier ID.
- `GET /api/pos/shifts/` — requires `pos:access` OR `manager:reports`, always scoped to session `tenant_id`.
- `GET /api/pos/shifts/current/` — requires `pos:access`, returns only the authenticated user's own open shift.
- `POST /api/pos/shifts/{id}/close/` — requires `pos:access` (own shift) OR `manager:shifts` (any shift), always scoped to session `tenant_id`.
- `GET /api/pos/shifts/{id}/` — requires `pos:access` OR `manager:reports`, always scoped to session `tenant_id`.

## Expected Output

- `backend/apps/pos/serializers/shift_serializer.py` with `OpenShiftSerializer`, `CloseShiftSerializer`, and `GetShiftsQuerySerializer`.
- `backend/apps/pos/views/shift_views.py` with all five shift views.
- URL patterns registered in `backend/apps/pos/urls.py`.

## Validation

- `POST /api/pos/shifts/` with a valid `opening_cash_float` creates a shift and returns 201.
- `POST /api/pos/shifts/` when an OPEN shift already exists returns 409.
- `GET /api/pos/shifts/current/` with no open shift returns 200 with `data: null`.
- `GET /api/pos/shifts/current/` with an open shift returns the shift data.
- `POST /api/pos/shifts/{id}/close/` closes the shift, creates `ShiftClosure`, and voids `ON_HOLD` sales.
- Calling close again on an already-closed shift returns 409.
- A cashier attempting to close another cashier's shift without `manager:shifts` permission returns 403.

## Notes

- Tenant isolation is absolute: every queryset is filtered by `tenant_id` from the JWT claims. A manager-level user who somehow sends a request without the correct tenant claim will receive an empty response, not cross-tenant data.
- The `GET /api/pos/shifts/current/` endpoint returning 200 with `data: null` (not 404) is an intentional contract. The frontend handles both the null and non-null cases without error-state logic.
