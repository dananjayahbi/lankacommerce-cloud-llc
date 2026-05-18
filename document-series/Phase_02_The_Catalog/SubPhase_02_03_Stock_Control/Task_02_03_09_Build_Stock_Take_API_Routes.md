# Task 02.03.09 — Build Stock Take API Routes

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.09 |
| Task Name | Build Stock Take API Routes |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | High |
| Dependencies | SubPhase_02_01 complete |
| Output Paths | `backend/apps/catalog/views.py` (modified), `backend/apps/catalog/urls.py` (modified) |

---

## Objective

Implement all API endpoints managing the complete lifecycle of a stock take session in Django REST Framework. Routes cover listing all sessions, creating a new session with automatic item pre-population, fetching full session detail with all items, adding out-of-scope items to an active session, updating item counted quantities and recount flags, completing a session by submitting it for approval, approving a completed session which applies bulk stock corrections, and rejecting a session with a mandatory reason. Every state transition is validated server-side. All routes are authenticated with SimpleJWT and permission-gated through the tenant RBAC system.

---

## Step 1 — Define the Session State Machine

Before implementing any routes, the valid `StockTakeSession` status transitions must be clearly understood and enforced:

- **No session → `IN_PROGRESS`:** triggered by `POST /api/catalog/stock-takes/`
- **`IN_PROGRESS` → `PENDING_APPROVAL`:** triggered by `POST /api/catalog/stock-takes/{id}/complete/`
- **`PENDING_APPROVAL` → `APPROVED`:** triggered by `POST /api/catalog/stock-takes/{id}/approve/`
- **`PENDING_APPROVAL` → `REJECTED`:** triggered by `POST /api/catalog/stock-takes/{id}/reject/`

Any request attempting a transition not in the above list must be rejected with a 409 Conflict response. The error message must state the current status and what action is required first. For example: "Session is currently IN_PROGRESS. Complete it before attempting approval." Never perform a silent no-op for an invalid transition — always return an explicit error.

---

## Step 2 — Build GET /api/catalog/stock-takes/

Add a `StockTakeSessionListView` in `backend/apps/catalog/views.py`. Authentication: `JWTAuthentication`. Permission: `stock:take:manage` OR `stock:take:approve` — either permission grants read access.

Query all `StockTakeSession` records where `tenant_id` matches the authenticated user's tenant, ordered by `started_at` descending. For each session, compute and include the following derived fields via ORM annotations or Python post-processing:

- The initiating user's display name
- The approving or rejecting user's display name (nullable — null for sessions still in progress or pending)
- The category name (nullable — null for full-catalog sessions)
- `item_count`: the total count of `StockTakeItem` records belonging to the session
- `discrepancy_count`: the count of `StockTakeItem` records where `discrepancy` is non-zero. Only compute this field for sessions with status `PENDING_APPROVAL`, `APPROVED`, or `REJECTED` — for `IN_PROGRESS` sessions, return null for this field.

Return the standard success envelope with `data` containing a `sessions` array and a `total` count.

---

## Step 3 — Build POST /api/catalog/stock-takes/

Add the POST handler on `StockTakeSessionListView` or as a separate `StockTakeSessionCreateView`. Permission: `stock:take:manage`.

Define a DRF serializer validating the optional `category_id` as a nullable UUID string. If `category_id` is provided, verify it belongs to the tenant before proceeding.

**Duplicate session check:** Query for any existing `StockTakeSession` with `status=IN_PROGRESS` and `tenant_id` matching the authenticated user's tenant. If one exists, immediately return a 409 response with `code: "SESSION_ALREADY_IN_PROGRESS"`, the message "A stock take session is already in progress for this tenant.", and the existing session's `id` so the frontend can navigate directly to it.

**Session creation within `transaction.atomic()`:** Create the `StockTakeSession` record with `status=IN_PROGRESS`, `initiated_by=request.user`, `started_at=now()`, and the optional `category_id`. Within the same atomic block, pre-populate session items. If `category_id` was provided, query all non-deleted `ProductVariant` records (`is_deleted=False`) belonging to products in that category within the tenant. Otherwise query all non-deleted variants in the tenant. For each variant, create a `StockTakeItem` record with `session=session`, `variant=variant`, and `system_quantity=variant.stock_quantity`. Use `StockTakeItem.objects.bulk_create([...])` for efficiency on large catalogs.

Return a 201 response with the standard success envelope. The `data` object contains the full session serialisation and `item_count` as the number of items pre-populated.

---

## Step 4 — Build GET /api/catalog/stock-takes/{id}/

Add a `StockTakeSessionDetailView` in `backend/apps/catalog/views.py`. Permission: `stock:take:manage` OR `stock:take:approve`.

Fetch the `StockTakeSession` by `id`. Verify `tenant_id` matches the authenticated user's tenant. If not found or tenant mismatch, return 404.

Return the session's own fields alongside all `StockTakeItem` records as a nested array. Each item must be joined with its `ProductVariant` (including `sku`, `size`, `colour`, and `barcode`) and with the variant's parent `Product` (including the product name and `Category` name). For each item, compute and include `discrepancy` as `counted_quantity - system_quantity` — return null if `counted_quantity` is null.

This detailed response is used both by the counting interface (to display the item list and pre-fill any previously entered counts) and by the review page (to display the full discrepancy analysis).

---

## Step 5 — Build POST /api/catalog/stock-takes/{id}/items/

Add a `StockTakeItemAddView`. Permission: `stock:take:manage`. This endpoint allows staff to add a variant to a session that was not included during initial pre-population — for example, a variant from outside the scoped category that is physically present in the same location during the count.

Validate that the session with the given `id` belongs to the authenticated user's tenant. Return 404 if not found or tenant mismatch.

Validate that the session's current `status` is `IN_PROGRESS`. If not, return 409 with `code: "SESSION_NOT_IN_PROGRESS"` and a message.

Define a DRF serializer requiring `variant_id` as a non-empty UUID string. Verify the variant belongs to the tenant. Verify the variant is not already represented in the session by checking for an existing `StockTakeItem` with the same `session_id` and `variant_id`. If a duplicate is found, return 409 with `code: "ITEM_ALREADY_IN_SESSION"` and a message.

Create the `StockTakeItem` with `system_quantity` set to the variant's current `stock_quantity` at the exact moment of addition. This is important: the system quantity must reflect the current reality, not the quantity at session start. Return a 201 response with the created item serialised.

---

## Step 6 — Build PATCH /api/catalog/stock-takes/{id}/items/{item_id}/

Add a `StockTakeItemUpdateView`. Permission: `stock:take:manage`.

Verify the session belongs to the user's tenant and that the session status is `IN_PROGRESS`. Return appropriate 404 or 409 errors for violations.

Fetch the `StockTakeItem` by `item_id` and verify its `session_id` matches the provided `id`. If the item belongs to a different session, return 404.

Define a DRF serializer with the following optional fields: `counted_quantity` as a nullable non-negative integer (reject negative values), and `needs_recount` as a nullable boolean. At least one of the two fields must be present — reject requests where neither is provided.

Update only the provided fields. Do not overwrite fields that were not included in the request. Return the updated item with the computed `discrepancy` field (or null if `counted_quantity` remains null after the update).

---

## Step 7 — Build POST /api/catalog/stock-takes/{id}/complete/

Add a `StockTakeCompleteView`. Permission: `stock:take:manage`.

Validate the session belongs to the user's tenant. Validate the session status is `IN_PROGRESS` — return 409 if not.

Validate that at least one `StockTakeItem` in the session has a non-null `counted_quantity`. If none have been counted, return 400 with `code: "NO_ITEMS_COUNTED"` and the message: "At least one item must be counted before a session can be submitted for approval."

Within `transaction.atomic()`: for all items where `counted_quantity` is currently null, set `counted_quantity = system_quantity`. This ensures discrepancy calculations are complete and prevents null comparisons during the approval phase — items that were not physically counted are treated as matching the system record. Compute `discrepancy = counted_quantity - system_quantity` for all items and persist it. Update the session: set `status = PENDING_APPROVAL` and `completed_at = now()`.

Call `log_audit_event` with `action="STOCK_TAKE_SUBMITTED"`, `resource_type="StockTakeSession"`, `resource_id=session.id`, and `after` containing the submitting user ID, item count, and discrepancy count.

Return the updated session serialised with the success envelope.

---

## Step 8 — Build POST /api/catalog/stock-takes/{id}/approve/

Add a `StockTakeApproveView`. Permission: `stock:take:approve`.

Validate the session belongs to the user's tenant. Validate the session status is `PENDING_APPROVAL` — return 409 with the state machine message if not.

Within `transaction.atomic()`, lock the session row using `select_for_update()` before any reads or writes — this prevents two approvers from simultaneously approving the same session in a multi-approver tenant.

Collect all `StockTakeItem` records where `discrepancy != 0`. For each such item, call `adjust_stock(tenant_id, item.variant_id, approver_id, quantity_delta=item.discrepancy, reason=StockMovementReason.STOCK_TAKE_ADJUSTMENT, stock_take_session_id=session.id)`. This creates a `StockMovement` record for each affected variant and triggers any necessary low-stock notifications — all within the same outer `transaction.atomic()` block since `adjust_stock` uses a savepoint rather than a new top-level transaction.

After all adjustments are applied, update the session: `status = APPROVED`, `approved_by = request.user`, `approved_at = now()`.

Call `log_audit_event` with `action="STOCK_TAKE_APPROVED"`, `resource_type="StockTakeSession"`, `resource_id=session.id`, and `after` containing the approver's user ID, the count of stock adjustments applied, and the `approved_at` timestamp.

Return the updated session with the success envelope and a 200 status.

---

## Step 9 — Build POST /api/catalog/stock-takes/{id}/reject/

Add a `StockTakeRejectView`. Permission: `stock:take:approve`.

Validate the session belongs to the user's tenant. Validate the session status is `PENDING_APPROVAL` — return 409 if not.

Define a DRF serializer requiring `rejection_reason` as a non-empty string with a minimum length of 10 characters. If the reason is shorter, return 400 with a field-level validation error.

Within `transaction.atomic()`: update the session with `status = REJECTED`, `rejection_reason = validated_data['rejection_reason']`, `approved_by = request.user` (the rejecting user is stored in the same field as the approving user, following the convention of recording who acted on the session), and `approved_at = now()`.

Call `log_audit_event` with `action="STOCK_TAKE_REJECTED"`, `resource_type="StockTakeSession"`, `resource_id=session.id`, and `after` containing the rejecting user's ID and the rejection reason.

Return the updated session with the success envelope.

---

## Step 10 — Register URL Patterns

In `backend/apps/catalog/urls.py`, add the following URL patterns under the `stock-takes/` prefix:

- A path mapping `stock-takes/` to the list and create view (handles both GET and POST on the same view class), named `stock-takes-list`
- A path mapping `stock-takes/{id}/` to the detail view (GET only), named `stock-take-detail`
- A path mapping `stock-takes/{id}/items/` to the add item view (POST only), named `stock-take-add-item`
- A path mapping `stock-takes/{id}/items/{item_id}/` to the update item view (PATCH only), named `stock-take-update-item`
- A path mapping `stock-takes/{id}/complete/` to the complete view (POST only), named `stock-take-complete`
- A path mapping `stock-takes/{id}/approve/` to the approve view (POST only), named `stock-take-approve`
- A path mapping `stock-takes/{id}/reject/` to the reject view (POST only), named `stock-take-reject`

These are served under the `/api/catalog/` prefix applied by the main `backend/urls.py` include, resulting in the full paths `/api/catalog/stock-takes/`, `/api/catalog/stock-takes/{id}/`, and so on as specified in the Sub-Phase 02.03 API endpoint mapping.
