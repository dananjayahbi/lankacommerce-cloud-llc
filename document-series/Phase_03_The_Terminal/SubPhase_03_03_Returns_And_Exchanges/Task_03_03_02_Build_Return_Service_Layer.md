# Task 03.03.02 — Build Return Service Layer

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.02 |
| Name | Build Return Service Layer |
| SubPhase | 03.03 |
| Complexity | HIGH |
| Dependencies | Task 03.03.01 |
| Produces | `backend/apps/pos/services/return_service.py` |

---

## Objective

Implement the `return_service.py` service layer that powers every return operation in LankaCommerce. The service handles eligibility validation, proportional refund computation, and atomic database writes — ensuring inventory adjustments, return records, and store credit issuance all succeed together or not at all.

---

## Instructions

### Step 1: Create the Service File

Create `backend/apps/pos/services/return_service.py`. Import `Decimal` and `ROUND_HALF_UP` from Python's `decimal` module. Import `transaction` from `django.db`. Import `timezone` from `django.utils`. Import `timedelta` from `datetime`. Import `Return`, `ReturnLine`, `StoreCredit`, `Sale`, `SaleLine` from `backend.apps.pos.models`. Import `adjust_stock` from `backend.apps.pos.services.inventory_service`.

### Step 2: Define the RETURN_WINDOW_DAYS Constant

Declare a module-level constant `RETURN_WINDOW_DAYS = 30`. This is the only place the 30-day rule is encoded in Phase 03.

### Step 3: Implement get_remaining_returnable_qty

Define `get_remaining_returnable_qty(sale_line_id)`. It queries all `ReturnLine` records that reference the given `original_sale_line_id` and are associated with a `Return` of status `COMPLETED` (using `Return.objects.filter(...).aggregate(Sum('lines__quantity'))`). Returns the summed quantity as an integer (defaulting to 0 if no returns exist). The calling code subtracts this from the original `SaleLine.quantity` to determine remaining returnable units.

### Step 4: Implement validate_return_eligibility

Define `validate_return_eligibility(tenant_id, original_sale_id, lines)` where `lines` is a list of dicts with `sale_line_id` and `quantity`. Validates in order:

1. The `Sale` with `original_sale_id` must exist and its `tenant_id` must match — raise `ValueError` if not.
2. `Sale.status` must be `COMPLETED` — raise `ValueError` if voided or pending.
3. The sale's `created_at` must be within `RETURN_WINDOW_DAYS` of `timezone.now()` — raise `ValueError` including the sale date and the expiry date if outside the window.
4. Each `sale_line_id` in the request must belong to `original_sale_id` — raise `ValueError` if a line belongs to a different sale.
5. For each line, `quantity` must be greater than zero and must not exceed `SaleLine.quantity - get_remaining_returnable_qty(sale_line_id)` — raise `ValueError` with line-level detail (variant name and over-limit amount) if exceeded.

Returns the fully loaded `Sale` with its `sale_lines` prefetched.

### Step 5: Implement compute_line_refund_amounts

Define `compute_line_refund_amounts(sale, return_lines)`. A pure function. For each return line, finds the matching `SaleLine` and computes the proportional refund: `(Decimal(return_qty) / Decimal(original_qty)) * line_total_after_discount`. All arithmetic uses Python `Decimal`. Returns a tuple of (list of dicts `{sale_line_id, variant_id, quantity, unit_price, line_refund_amount}`, grand_total_refund as `Decimal`). Grand total is the sum of all `line_refund_amount` values.

### Step 6: Implement initiate_return

Define `initiate_return(tenant_id, input_data)` where `input_data` is a dict with `initiated_by_id`, `authorized_by_id`, `original_sale_id`, `lines`, `refund_method`, `restock_items`, `reason`.

The entire body runs inside `with transaction.atomic():`.

Inside the transaction:

1. Call `validate_return_eligibility` to confirm validity.
2. Call `compute_line_refund_amounts` to get per-line refund values and total.
3. Create the `Return` record using `Return.objects.create(...)`.
4. Create all `ReturnLine` records using `ReturnLine.objects.bulk_create(...)`, setting `is_restocked=False` for all lines initially.
5. If `restock_items` is `True`, loop through each return line and call `adjust_stock` with `reason='SALE_RETURN'` and `delta=+quantity`. Immediately after each successful `adjust_stock` call, update the corresponding `ReturnLine` using `.update(is_restocked=True)`. This per-line update ensures the audit trail is accurate.
6. If `refund_method` is `STORE_CREDIT`, create a `StoreCredit` record using `StoreCredit.objects.create(amount=total_refund_amount, tenant_id=tenant_id, note="Return ref " + str(return_record.id))`.
7. Return the fully loaded `Return` object with `select_related('lines', 'original_sale')`.

### Step 7: Implement get_return_by_id

Define `get_return_by_id(tenant_id, return_id)`. Fetches the `Return` using `Return.objects.select_related('lines', 'original_sale', 'initiated_by', 'authorized_by').get(id=return_id, tenant_id=tenant_id)`. Raises `Return.DoesNotExist` if not found (caught at the view layer and mapped to 404).

### Step 8: Implement get_returns

Define `get_returns(tenant_id, filters=None)`. Accepts optional filters: `original_sale_id`, `initiated_by_id`, `refund_method`, `from_date`, `to_date`, `page`, `limit`. Builds a queryset from `Return.objects.filter(tenant_id=tenant_id)` applying each filter only when defined. Returns a dict with `data` (list of serialized returns) and `total` (count). Default `limit` is 25, maximum is capped at 100.

---

## Expected Output

`backend/apps/pos/services/return_service.py` exporting `initiate_return`, `get_return_by_id`, `get_returns`, plus the internal helpers.

---

## Validation

- Calling `initiate_return` with a sale older than 30 days raises `ValueError` with the expiry date in the message
- Calling with quantity exceeding the remaining returnable quantity raises `ValueError` with line-level detail
- After a successful call, the database contains one `Return`, the correct number of `ReturnLine` records, and a `StoreCredit` if applicable
- When `restock_items=True`, `StockMovement` records exist for each returned variant with reason `SALE_RETURN`
- When `restock_items=False`, no `StockMovement` records are created and all `ReturnLine.is_restocked` remain `False`

---

## Notes

The `adjust_stock` function in `backend/apps/pos/services/inventory_service.py` operates within the caller's `transaction.atomic()` context because Django's atomic blocks are composable via savepoints. No special parameter passing is required — nested `with transaction.atomic():` calls inside `initiate_return` are safe.
