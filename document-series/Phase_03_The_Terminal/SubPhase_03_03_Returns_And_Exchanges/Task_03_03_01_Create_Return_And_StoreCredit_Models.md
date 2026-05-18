# Task 03.03.01 — Create Return and StoreCredit Models

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.01 |
| Name | Create Return and StoreCredit Models |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | SubPhase_03_01 + SubPhase_03_02 complete |
| Produces | `backend/apps/pos/models.py` (Return, ReturnLine, StoreCredit models added), migration `add_return_and_storecredit_models` |

---

## Objective

Define the three new Django models — `Return`, `ReturnLine`, and `StoreCredit` — along with two new TextChoices (`ReturnRefundMethod` and `ReturnStatus`). Also add the `linked_return` nullable FK field to the existing `Sale` model to support exchange tracking. Generate and apply the migration.

---

## Instructions

### Step 1: Add ReturnRefundMethod TextChoices

Open `backend/apps/pos/models.py`. Define a `ReturnRefundMethod` class using `models.TextChoices` with four values:

- `CASH` ("CASH") — cash disbursed from the drawer immediately
- `CARD_REVERSAL` ("CARD_REVERSAL") — manual reversal on the card terminal with reference number recorded
- `STORE_CREDIT` ("STORE_CREDIT") — a `StoreCredit` record is created, redeemable in Phase 04
- `EXCHANGE` ("EXCHANGE") — return value applied as credit against a new replacement cart

### Step 2: Add ReturnStatus TextChoices

Define a `ReturnStatus` class using `models.TextChoices` with one value: `COMPLETED` ("COMPLETED") — all requested lines were returned and restocked in one atomic operation. In Phase 03, all returns are stamped `COMPLETED` at creation time. Additional statuses (`PENDING`, `CANCELLED`) may be added in future phases but are not needed now.

### Step 3: Define the Return Model

Add the `Return` model class to `backend/apps/pos/models.py` with these fields:

- `id`: `UUIDField` primary key, `default=uuid.uuid4`, `editable=False`
- `tenant`: `ForeignKey` to `Tenant`, `on_delete=models.PROTECT`, `related_name='returns'`
- `original_sale`: `ForeignKey` to `Sale`, `on_delete=models.PROTECT`, `related_name='returns'` — using PROTECT means a sale cannot be deleted if a return exists against it
- `initiated_by`: `ForeignKey` to `User`, `on_delete=models.PROTECT`, `related_name='initiated_returns'` — the cashier who opened the wizard
- `authorized_by`: `ForeignKey` to `User`, `on_delete=models.PROTECT`, `related_name='authorized_returns'` — must be MANAGER or SUPER_ADMIN; always required
- `refund_method`: `CharField` with `max_length=20`, `choices=ReturnRefundMethod.choices`
- `refund_amount`: `DecimalField` with `max_digits=12`, `decimal_places=2`
- `restock_items`: `BooleanField`, `default=True`
- `reason`: `TextField`, `blank=True` — free-text reason, max 200 chars enforced at the serializer layer
- `status`: `CharField` with `max_length=20`, `choices=ReturnStatus.choices`, `default=ReturnStatus.COMPLETED`
- `created_at`: `DateTimeField`, `auto_now_add=True`

Add a `Meta` class with `indexes = [models.Index(fields=['tenant', 'created_at']), models.Index(fields=['original_sale'])]` and `ordering = ['-created_at']`. Add a `__str__` method returning a descriptive string such as `"Return {refund_method} Rs.{refund_amount} for Sale {original_sale_id}"`.

### Step 4: Define the ReturnLine Model

Add the `ReturnLine` model with these fields:

- `id`: `UUIDField` primary key, `default=uuid.uuid4`, `editable=False`
- `return_record`: `ForeignKey` to `Return`, `on_delete=models.CASCADE`, `related_name='lines'`
- `original_sale_line`: `ForeignKey` to `SaleLine`, `on_delete=models.PROTECT`, `related_name='return_lines'`
- `variant`: `ForeignKey` to `ProductVariant`, `on_delete=models.PROTECT`, `related_name='return_lines'` — denormalized for display without extra joins
- `product_name_snapshot`: `CharField`, `max_length=255` — copied from `SaleLine.product_name_snapshot`
- `variant_description_snapshot`: `CharField`, `max_length=255`, `blank=True` — copied from `SaleLine.variant_description_snapshot`
- `quantity`: `PositiveIntegerField`
- `unit_price`: `DecimalField` with `max_digits=12`, `decimal_places=2` — copied from the original SaleLine
- `line_refund_amount`: `DecimalField` with `max_digits=12`, `decimal_places=2` — computed proportional refund
- `is_restocked`: `BooleanField`, `default=False` — set to True per-line after `adjust_stock` succeeds
- `created_at`: `DateTimeField`, `auto_now_add=True`

Add a `Meta` class with `indexes = [models.Index(fields=['return_record'])]` and a `__str__` method returning a descriptive string identifying the variant name, quantity, and parent return ID.

### Step 5: Define the StoreCredit Model

Add the `StoreCredit` model with these fields:

- `id`: `UUIDField` primary key, `default=uuid.uuid4`, `editable=False`
- `tenant`: `ForeignKey` to `Tenant`, `on_delete=models.PROTECT`, `related_name='store_credits'`
- `customer`: `ForeignKey` to `Customer`, `on_delete=models.SET_NULL`, `null=True`, `blank=True`, `related_name='store_credits'` — nullable; Phase 04 CRM will populate this
- `amount`: `DecimalField` with `max_digits=12`, `decimal_places=2` — the original issued amount
- `used_amount`: `DecimalField` with `max_digits=12`, `decimal_places=2`, `default=Decimal('0.00')` — incremented by Phase 04 redemption
- `note`: `TextField`, `null=True`, `blank=True` — auto-populated as "Return {return_id}"
- `expires_at`: `DateTimeField`, `null=True`, `blank=True` — nullable; not enforced in Phase 03
- `created_at`: `DateTimeField`, `auto_now_add=True`

Add a `Meta` class with `ordering = ['-created_at']` and a `__str__` method.

### Step 6: Add linked_return to Sale Model

In the existing `Sale` model, add a new nullable field: `linked_return` as a `ForeignKey` to `Return` with `on_delete=models.SET_NULL`, `null=True`, `blank=True`, `related_name='exchange_sales'`. This field is populated when an exchange cart is completed — it links the replacement sale back to its originating return record for audit purposes.

### Step 7: Generate and Apply Migration

Run `poetry run python manage.py makemigrations pos --name add_return_and_storecredit_models`. Review the generated migration file to confirm all four model operations are present: `CreateModel` for `Return`, `CreateModel` for `ReturnLine`, `CreateModel` for `StoreCredit`, and `AddField` for `Sale.linked_return`. Run `poetry run python manage.py migrate` to apply.

---

## Expected Output

- `Return`, `ReturnLine`, and `StoreCredit` Django models added to `backend/apps/pos/models.py`
- `Sale.linked_return` nullable FK field added
- Migration `add_return_and_storecredit_models` generated and applied

---

## Validation

- Run `poetry run python manage.py shell` and import all three new models — confirm they load without errors
- Run `poetry run python manage.py migrate --check` to confirm no unapplied migrations exist

---

## Notes

- Using `CASCADE` on `ReturnLine.return_record` ensures that if a Return record were ever deleted (which should not happen in normal operation), its lines are also deleted cleanly. Using `PROTECT` on `Return.original_sale` prevents sale deletion when returns exist.
- The `StoreCredit.customer` FK uses `SET_NULL` on delete so that deleting a customer record in a future CRM cleanup does not orphan store credit records or raise integrity errors.
