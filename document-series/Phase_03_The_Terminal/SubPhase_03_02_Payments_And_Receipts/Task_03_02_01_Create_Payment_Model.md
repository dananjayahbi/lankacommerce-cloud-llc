# Task 03.02.01 — Create Payment Model

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.01 |
| Name | Create Payment Model |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Low |
| Depends On | SubPhase 03.01 complete |
| Produces | `backend/apps/pos/models.py` (Payment model added), migration `add_payment_model` |

## Objective

Add the `Payment` Django model to `backend/apps/pos/models.py` and generate the corresponding migration. The model represents a single payment leg within a completed sale. A cash sale produces one payment record. A card sale produces one payment record. A split sale produces two payment records — one `CASH` leg and one `CARD` leg.

## Instructions

### Step 1: Add the PaymentLegMethod TextChoices

Open `backend/apps/pos/models.py`. Define a `PaymentLegMethod` inner class using Django's `models.TextChoices`. Define exactly two choices: `CASH` with the string value `"CASH"`, and `CARD` with the string value `"CARD"`. The `SPLIT` method exists at the `Sale` model level only — individual payment records are always one of the two atomic leg types, never `SPLIT`.

### Step 2: Define the Payment Model

Add the `Payment` model class to `backend/apps/pos/models.py`. The model has the following fields:

- `id`: a `UUIDField` set as the primary key with `default=uuid.uuid4` and `editable=False`.
- `sale`: a `ForeignKey` to the `Sale` model, `on_delete=models.PROTECT`, and `related_name='payments'`. Using `PROTECT` prevents accidental deletion of a sale that has payment records attached.
- `method`: a `CharField` with `max_length=10`, `choices=PaymentLegMethod.choices`, and no default — the method is always explicitly provided by the service layer.
- `amount`: a `DecimalField` with `max_digits=12` and `decimal_places=2`. This stores the amount tendered for this specific payment leg.
- `card_reference_number`: a `CharField` with `max_length=20`, `null=True`, and `blank=True`. Populated only for `CARD` payment legs when the cashier enters the terminal approval code.
- `created_at`: a `DateTimeField` with `auto_now_add=True`.

Do not add `updated_at`. Payment records are immutable after creation — once a sale is completed, its payment legs are never modified. This immutability is by design and is enforced at the service layer.

### Step 3: Add Meta Configuration

Add a `Meta` inner class to the `Payment` model. Set `ordering = ['created_at']` so that when multiple payment legs are returned (as in a split sale), they are consistently ordered by creation time. Add a database index on the `sale` field using `indexes = [models.Index(fields=['sale'])]`. The index accelerates the common query pattern of fetching all payments for a given sale when building a receipt.

### Step 4: Add the String Representation

Add a `__str__` method to the `Payment` model that returns a descriptive string in the form `"Payment {method} Rs.{amount} for Sale {sale_id}"`. This representation appears in the Django admin and in debug output.

### Step 5: Verify the Sale Model Relationship

The `Sale` model already has a `PaymentMethod` field for the top-level payment classification (`CASH`, `CARD`, or `SPLIT`). The `Payment.sale` foreign key creates the reverse relation `sale.payments` automatically via `related_name='payments'`. Confirm that no additional changes to the `Sale` model are needed — the relationship is established entirely by the foreign key on `Payment`.

### Step 6: Generate and Review the Migration

Run `poetry run python manage.py makemigrations pos --name add_payment_model` from the project root. Open the generated migration file in `backend/apps/pos/migrations/` and verify that it contains a `CreateModel` operation for `Payment` with the correct fields and the database index. Run `poetry run python manage.py migrate` to apply the migration to the development database.

## Expected Output

- `Payment` model added to `backend/apps/pos/models.py` with all required fields, `Meta` configuration, and `__str__` method.
- Migration file `backend/apps/pos/migrations/XXXX_add_payment_model.py` generated and applied.

## Validation

- Run `poetry run python manage.py shell` and import `Payment` from `backend.apps.pos.models`. Confirm the model loads without errors.
- Create a test `Payment` record in the shell to verify the field constraints are enforced.
- Run `poetry run python manage.py migrate --check` to confirm no unapplied migrations exist.

## Notes

- The `sum of Payment.amount must equal Sale.total_amount` invariant is enforced in `payment_service.py` inside a `transaction.atomic()` block, not at the database level. A database-level constraint would require a deferred check trigger, which is more complex to maintain than the application-level check.
- The `Payment` model is intentionally minimal. Audit trail requirements are met by the `AuditLog` model written by the sale service layer, not by adding extra tracking fields to `Payment` itself.
