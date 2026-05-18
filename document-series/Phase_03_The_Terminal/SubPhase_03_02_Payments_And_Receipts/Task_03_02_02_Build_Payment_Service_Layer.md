# Task 03.02.02 — Build Payment Service Layer

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.02 |
| Name | Build Payment Service Layer |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | Task 03.02.01 |
| Produces | `backend/apps/pos/services/payment_service.py` |

## Objective

Create the `payment_service.py` module in `backend/apps/pos/services/` that provides the core payment record management functions. These functions are called exclusively from within `transaction.atomic()` blocks in the sale service — they must never be called from views directly.

## Instructions

### Step 1: Create the Service Module

Create the file `backend/apps/pos/services/payment_service.py`. If the `services/` directory does not yet exist inside `backend/apps/pos/`, create it along with an `__init__.py` file. Import `Decimal` and `ROUND_HALF_UP` from Python's `decimal` module. Import the `Payment` model from `backend.apps.pos.models`.

### Step 2: Implement create_payment

Define the function `create_payment(sale, method, amount, card_reference_number=None)`. The `sale` parameter is a `Sale` model instance. The `method` parameter is a string matching one of the `PaymentLegMethod` choices (`"CASH"` or `"CARD"`). The `amount` parameter is a Python `Decimal`. The optional `card_reference_number` parameter is a string or `None`.

Before creating the database record, validate that `amount` is strictly greater than `Decimal('0')`. If the validation fails, raise a `ValueError` with a descriptive message. This guard prevents zero-value or negative payment legs from being persisted.

Create and return the `Payment` record using `Payment.objects.create(sale=sale, method=method, amount=amount, card_reference_number=card_reference_number)`.

This function must be called from within a `transaction.atomic()` block in the sale service. It does not manage its own transaction — the caller controls the transaction boundary. This design ensures that if multiple payment legs are being created for a split sale, they either all succeed or all roll back together.

### Step 3: Implement get_payments_for_sale

Define the function `get_payments_for_sale(sale_id)`. It queries `Payment.objects.filter(sale_id=sale_id).order_by('created_at')` and returns the resulting queryset. The caller is responsible for iterating or serialising the results.

### Step 4: Implement compute_change

Define the function `compute_change(total_amount, amount_paid)`. Both parameters are Python `Decimal` values. The function computes the change as `amount_paid - total_amount` using Python `Decimal` arithmetic.

If `amount_paid` is less than `total_amount`, raise a `ValueError` with the message `"Insufficient payment: amount_paid is less than total_amount."` This exception surfaces in the sale service as a domain validation error and is mapped to an HTTP 422 response.

If `amount_paid` is greater than or equal to `total_amount`, return the change amount as a `Decimal` rounded to two decimal places using `ROUND_HALF_UP`. This is a pure function with no database interaction — it can be called safely in any context, including from a frontend-facing change preview endpoint if one is added in a later phase.

## Expected Output

- `backend/apps/pos/services/payment_service.py` created with `create_payment`, `get_payments_for_sale`, and `compute_change` implemented.

## Validation

- Call `compute_change(Decimal('100.00'), Decimal('500.00'))` and confirm it returns `Decimal('400.00')`.
- Call `compute_change(Decimal('100.00'), Decimal('50.00'))` and confirm it raises `ValueError`.
- Call `create_payment` with `amount=Decimal('0')` and confirm it raises `ValueError`.

## Notes

- All monetary arithmetic uses Python's `decimal` module. Never use Python's native `float` type for currency values. Floating-point arithmetic introduces rounding errors that are visible in financial reports (e.g. Rs. 0.00000001 of spurious change).
- The `compute_change` function is intentionally a pure function. This makes it easy to unit test in isolation and straightforward to reuse from a future change preview DRF endpoint without any database overhead.
