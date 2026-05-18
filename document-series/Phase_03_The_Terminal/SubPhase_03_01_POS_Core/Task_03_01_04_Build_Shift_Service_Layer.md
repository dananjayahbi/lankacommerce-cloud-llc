# Task 03.01.04 — Build Shift Service Layer

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.04 |
| Task Name | Build Shift Service Layer |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_02 |
| Output Files | `backend/apps/pos/services/shift_service.py`, `backend/apps/pos/serializers.py` (modified), `backend/apps/pos/views.py` (modified), `backend/apps/pos/urls.py` (modified) |

---

## Objective

Create the shift service module at `backend/apps/pos/services/shift_service.py` responsible for managing cashier work sessions: opening a shift with a validated opening float, closing a shift with computed cash reconciliation and an immutable closure record, retrieving the current open shift for use in the POS layout gate, and providing paginated shift history for management reporting.

---

## Step 1 — Establish Imports

Create the file `backend/apps/pos/services/shift_service.py`. Import `transaction` from `django.db` and `Sum`, `Count`, `Q` from `django.db.models`. Import `timezone` from `django.utils`. Import `Decimal` and `ROUND_HALF_UP` from Python's `decimal` module. Import the models `Shift`, `ShiftClosure`, `Sale`, `ShiftStatus`, `SaleStatus`, and `PaymentMethod` from `backend/apps/pos/models`. Import the `User` model from `backend/apps/accounts/models`. Import the shared exception classes `ConflictError`, `NotFoundError`, and `PermissionDeniedError` from `backend/apps/core/exceptions`. Import `log_audit_event` from `backend/apps/catalog/services/audit_service`.

---

## Step 2 — Implement open_shift

The `open_shift(tenant_id, cashier_id, opening_float)` function creates a new shift for a cashier after verifying that they do not already have one open.

Begin by querying for an existing open shift: `Shift.objects.filter(tenant_id=tenant_id, cashier_id=cashier_id, status=ShiftStatus.OPEN).first()`. If a result is returned, raise `ConflictError`. The error message should include the existing shift's `id` and `opened_at` timestamp so the calling cashier or their manager can identify the conflicting record. This error can occur if a cashier's previous session was not properly closed, or if a second browser tab or device is being used simultaneously.

If no existing open shift is found, create a new `Shift` record with `tenant_id`, `cashier_id`, `status=ShiftStatus.OPEN`, and `opening_float` rounded to two decimal places using `opening_float.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`. There is no need to wrap this in a `transaction.atomic()` block because a single `INSERT` is inherently atomic at the database level.

Return the newly created `Shift` object. The caller (the DRF view) will serialise this and return it in the standard response envelope.

---

## Step 3 — Implement close_shift

The `close_shift(tenant_id, shift_id, actor_id, close_input)` function is the most complex function in the shift service. It must execute its critical writes inside a `transaction.atomic()` block to ensure the `ShiftClosure` record and the shift status update are committed together or not at all.

**Retrieve and validate the shift.** Query `Shift.objects.get(id=shift_id, tenant_id=tenant_id)`. Raise `NotFoundError` if the shift does not exist. Check `status == ShiftStatus.OPEN` — if the shift is already `CLOSED`, raise `ConflictError` explaining that this shift has already been closed.

**Validate authorisation.** If `actor_id` matches `shift.cashier_id`, the cashier is closing their own shift, which is permitted. If they differ, the actor must hold a `MANAGER` or `OWNER` role within this tenant. Retrieve the actor's role from the tenant membership (querying the appropriate accounts model established in Phase 01). If the actor's role is `CASHIER`, raise `PermissionDeniedError`. Only managers and owners may close another cashier's shift.

**Handle lingering OPEN (held) sales.** Query `Sale.objects.filter(shift_id=shift_id, status=SaleStatus.OPEN)`. A held sale is one that the cashier placed in hold status but never retrieved and completed. For each such sale, update its status to `VOIDED` and set `voided_at=timezone.now()`. This is not a stock-reversing void — held sales never had any inventory impact, so no `adjust_stock` call is made here. Create an `AuditLog` entry for each voided held sale using `log_audit_event` with `action="NO_SALE_SHIFT_CLOSED"`, including the sale `id` in the metadata.

**Aggregate completed sales.** Using Django ORM aggregation, compute all closure statistics from the `COMPLETED` sales of this shift. The query should filter by `shift_id=shift_id` and `status=SaleStatus.COMPLETED` and apply `aggregate()` with: `total_sales_count=Count('id')`, `total_sales_amount=Sum('total_amount')`, `total_cash_amount=Sum('total_amount', filter=Q(payment_method=PaymentMethod.CASH))`, `total_card_amount=Sum('total_amount', filter=Q(payment_method=PaymentMethod.CARD))`, and `total_discount=Sum('discount_amount')`.

Note on `SPLIT` payments in Phase 03: `SPLIT` payment sales are included in `total_sales_amount` but are not broken down into `total_cash_amount` or `total_card_amount`. The detailed split payment cash and card breakdown requires the payment detail model introduced in SubPhase 03.02. Add an inline code comment at this point in the service referencing SubPhase 03.02 so future developers know this is an acknowledged gap, not an oversight.

**Compute closure fields.** Using Python's `Decimal` throughout: retrieve `total_cash_amount` from the aggregation result, defaulting to `Decimal('0')` if no cash sales exist. Compute `expected_cash = shift.opening_float + total_cash_amount`. Compute `cash_difference = close_input.closing_cash_count - expected_cash`. Round both to two decimal places. Set `total_returns_count = 0` and `total_returns_amount = Decimal('0.00')` as placeholders for SubPhase 03.03.

**Execute the atomic write.** Inside `with transaction.atomic():`, perform two operations. First, create the `ShiftClosure` record with all computed values, `closed_by_id=actor_id`, and all aggregated totals. Second, update the shift's status and closed timestamp: `Shift.objects.filter(id=shift_id).update(status=ShiftStatus.CLOSED, closed_at=timezone.now())`. Using `filter().update()` rather than `.save()` on the retrieved instance issues a single `UPDATE` SQL statement, which is more efficient and avoids the risk of overwriting fields that may have been set by a concurrent process.

**Return the results.** Fetch the updated shift using `Shift.objects.select_related('cashier', 'closure').get(id=shift_id)` and return it alongside the `ShiftClosure` record for use in the response payload.

---

## Step 4 — Implement get_current_shift

The `get_current_shift(tenant_id, cashier_id)` function is called by the POS layout server component on every page load to determine whether to show the terminal or the `ShiftOpenModal` fullscreen gate.

Query `Shift.objects.filter(tenant_id=tenant_id, cashier_id=cashier_id, status=ShiftStatus.OPEN).first()`. Return the shift if found, or `None` if not found. Performance is important for this function because it is called on every POS page navigation. Do not eager-load related sale records or apply annotations — return only the `Shift` fields required to confirm the open session and provide the `id`, `cashier_id`, and `opened_at` to the layout component.

The index defined on `['cashier', 'status']` in the `Shift` model's `Meta` class ensures this query is efficient even for cashiers with many historical shifts.

---

## Step 5 — Implement get_shift_by_id

The `get_shift_by_id(tenant_id, shift_id)` function retrieves a single shift with all data needed for the shift detail or history view. Use `Shift.objects.select_related('cashier', 'closure').get(id=shift_id, tenant_id=tenant_id)`. Raise `NotFoundError` if the shift does not exist or belongs to a different tenant.

Annotate the shift with additional computed context: run a separate aggregate query on the shift's `COMPLETED` sales to compute total revenue and count. Return both the shift object and the aggregate summary as a composite response object. The aggregate can be obtained with `Sale.objects.filter(shift_id=shift_id, status=SaleStatus.COMPLETED).aggregate(count=Count('id'), total=Sum('total_amount'))`.

---

## Step 6 — Implement get_shifts

The `get_shifts(tenant_id, filters=None)` function returns a paginated list of shifts for management history views. Accept optional filter parameters: `cashier_id`, `status`, `from_date`, `to_date`, `page` (defaulting to 1), and `limit` (defaulting to 20, maximum 100).

Build the base queryset: `Shift.objects.filter(tenant_id=tenant_id)`. Apply each filter as present. Annotate the queryset with a `sale_count` using `Count('sales')` so the list view can display how many transactions occurred in each shift without separate queries. Order by `opened_at` descending. Execute `.count()` on the unsliced queryset for the total count, then slice for the current page. Return both the paginated shift list and the total count.

---

## Step 7 — Create Serializers

In `backend/apps/pos/serializers.py`, add the following two serializers for shift operations.

`OpenShiftSerializer` must validate a single field: `opening_float` as a non-negative `DecimalField`. The serializer's `validate_opening_float` method should confirm the value is greater than or equal to zero using `Decimal('0.00')`. It is acceptable for a cashier to open a shift with an empty till (zero float), but a negative value must be rejected.

`CloseShiftSerializer` must validate `closing_cash_count` as a non-negative `DecimalField`. A `notes` field (optional string, maximum 500 characters) may also be included for the cashier to record end-of-shift observations. The `closing_cash_count` field must be required — do not allow it to default to anything. The serializer's `validate_closing_cash_count` method should reject negative values with a descriptive error message.

---

## Step 8 — Create DRF Views and URL Patterns

In `backend/apps/pos/views.py`, implement the shift-related DRF views. All views must use `JWTAuthentication` and require the `pos:access` permission.

`ShiftListCreateView` handles `GET` (calling `get_shifts` with filter parameters from `request.query_params`) and `POST` (calling `open_shift` with the deserialised `opening_float` from `OpenShiftSerializer`). For the `POST` handler, extract `cashier_id` from the JWT claim `user.user_id` and `tenant_id` from `user.tenant_id`.

`ShiftDetailView` handles `GET /api/pos/shifts/{id}/` by calling `get_shift_by_id`. This view also checks whether the requesting user is a cashier viewing their own shift or a manager viewing any shift — a simple RBAC check using the existing permission utilities. A CASHIER-role user should only be able to view shifts where `cashier_id == user.user_id`.

`ShiftCloseView` handles `POST /api/pos/shifts/{id}/close/` by deserialising the request body with `CloseShiftSerializer`, then calling `close_shift` with the validated data. Extract `actor_id` from the JWT.

Register the URL patterns in `backend/apps/pos/urls.py`: `shifts/` routed to `ShiftListCreateView`, `shifts/<uuid:id>/` routed to `ShiftDetailView`, and `shifts/<uuid:id>/close/` routed to `ShiftCloseView`.

---

## Expected Output

After this task, `backend/apps/pos/services/shift_service.py` exists with all five implemented functions. `backend/apps/pos/serializers.py` includes `OpenShiftSerializer` and `CloseShiftSerializer`. `backend/apps/pos/views.py` includes the three shift views. All shift endpoints are accessible under `/api/pos/shifts/`.

---

## Notes

The `SPLIT` payment limitation in Phase 03's `close_shift` cash reconciliation is an acknowledged gap. The `total_cash_amount` and `total_card_amount` figures in `ShiftClosure` will be slightly understated when split payments have occurred because the split breakdown (how much of a split payment was cash versus card) is tracked only after the payment detail model is introduced in SubPhase 03.02. This should be clearly communicated in both the inline service code comment and in any user-facing shift closure summary displayed by `ShiftCloseModal`.

The `ShiftClosure` record is immutable after creation. No update, patch, or recalculate endpoint should be implemented for it. If a cashier believes the closure figures are wrong, the resolution path is a manual reconciliation note — not modifying the stored closure record.

The `expected_cash` field's value is stored permanently rather than being recomputed on read, even though it could theoretically be derived from the shift's `opening_float` and the aggregated cash sales. Storing it guarantees that the reconciliation snapshot remains unchanged even if data is later corrected or migrated. This is a standard practice in financial system design — audit records are written once and never recomputed.
