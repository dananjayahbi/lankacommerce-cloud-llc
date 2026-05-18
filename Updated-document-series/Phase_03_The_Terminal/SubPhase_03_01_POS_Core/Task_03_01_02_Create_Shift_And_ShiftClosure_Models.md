# Task 03.01.02 — Create Shift And ShiftClosure Models

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.02 |
| Task Name | Create Shift And ShiftClosure Models |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Low |
| Dependency | Task_03_01_01 |
| Output Files | `backend/apps/pos/models.py` (modified) |

---

## Objective

Add the `Shift` and `ShiftClosure` Django ORM models to `backend/apps/pos/models.py`, introduce the `ShiftStatus` TextChoices class, define all required compound database indexes, and run the second POS migration to make these structures available in the database.

---

## Step 1 — Review Model State and Resolve Forward References

Open `backend/apps/pos/models.py` and confirm that the `Sale` and `SaleLine` models from Task 03.01.01 are present and that the first migration (`add_sale_and_saleline_models`) has been applied. You will notice that `Sale` contains a `ForeignKey` field pointing to `Shift`, but `Shift` does not yet exist in this file. Django uses the string `'Shift'` as a forward reference in that field definition, meaning the actual `Shift` class can be defined later in the same file and Django will resolve the reference at application startup.

To keep the file well-organised and avoid any import-order confusion, re-order the model definitions so that `Shift` is declared before `Sale`. Update the `Sale.shift` field to reference `Shift` directly (using the class, not the string) now that the ordering is correct, or leave it as the string form `'Shift'` — both approaches are valid in Django. Whichever approach you choose, confirm that loading the Django application produces no `FieldError` or `LookupError` relating to unresolved forward references before proceeding.

---

## Step 2 — Add ShiftStatus TextChoices

Define a `ShiftStatus` TextChoices class in `backend/apps/pos/models.py`. This class requires exactly two values: `OPEN` with the database string `"OPEN"` and the label `"Open"`, and `CLOSED` with the database string `"CLOSED"` and the label `"Closed"`.

The transition from `OPEN` to `CLOSED` is one-way and permanent. Once a shift has been closed, no service function may reopen it, update its `ShiftClosure`, or attach new sales to it. This constraint is enforced exclusively at the service layer in `close_shift` — the model itself does not carry a database constraint preventing status changes, since Django's ORM does not natively support check constraints in the same way that some database-specific migrations do. However, all service-layer paths that create or complete a sale must verify the shift is `OPEN` before proceeding.

---

## Step 3 — Define the Shift Model

Define the `Shift` model in `backend/apps/pos/models.py`, positioned before the `Sale` model definition.

The `id` field follows the standard LankaCommerce pattern: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.

The `tenant_id` field is a `CharField(max_length=50)` with no foreign key relation to a Tenant model, consistent with the tenant isolation pattern used throughout the codebase.

The `cashier` field is a `ForeignKey` to the `User` model from `backend/apps/accounts/models.py`, with `related_name='shifts'` and `on_delete=models.PROTECT`. A cashier user account must not be deletable while they have associated shift records.

The `status` field is a `CharField(max_length=10, choices=ShiftStatus.choices, default=ShiftStatus.OPEN)`. New shift records always begin as `OPEN`.

The `opened_at` field is a `DateTimeField(auto_now_add=True)`. This is set once at creation and never updated. It serves as the immutable start timestamp for the shift.

The `closed_at` field is a `DateTimeField(null=True, blank=True)`. This field is null while the shift is open and is populated by the `close_shift` service function when the shift transitions to `CLOSED`.

The `opening_float` field is a `DecimalField(max_digits=12, decimal_places=2)` with no default value. The service layer must supply this value explicitly when opening a shift. There is no sensible default — a missing opening float would silently introduce errors into cash reconciliation calculations at close time. The serializer for shift creation must validate that this field is present and non-negative.

The `notes` field is a `TextField(null=True, blank=True)`. This is an optional free-text field where the cashier or manager can record any context relevant to the shift, such as staffing notes or terminal issues observed during trading.

Inside the `Meta` inner class, define three compound database indexes. The first covers `['tenant_id', 'status']` to support the most common query pattern: finding the current open shift for a tenant. The second covers `['cashier', 'status']` to support checking whether a specific cashier already has an open shift (used in `open_shift` to enforce the single-open-shift rule). The third covers `['tenant_id', 'opened_at']` to support chronological shift history queries for a tenant.

Regarding the single-open-shift enforcement: it is tempting to add a unique database constraint on `[cashier_id, status]` to guarantee at the database level that no cashier can have two `OPEN` shifts simultaneously. However, this approach fails because a cashier accumulates many `CLOSED` shifts over time, and a unique constraint would prevent them from having more than one record with `status='CLOSED'` under the same cashier — which is clearly wrong. The single-open-shift rule must therefore be enforced exclusively at the service layer inside `open_shift()`, which queries for an existing `OPEN` shift before creating a new one.

---

## Step 4 — Define the ShiftClosure Model

Define the `ShiftClosure` model in `backend/apps/pos/models.py`, positioned after the `Shift` model definition.

The `id` field uses the same `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)` pattern.

The `shift` field is a `OneToOneField` to `Shift` with `on_delete=models.PROTECT`. Using `OneToOneField` ensures at the database level that each `Shift` record has at most one associated `ShiftClosure`. This replaces the combination of a foreign key with a `@unique` constraint that would be used in Prisma. Using `PROTECT` rather than `CASCADE` ensures that if someone attempts to delete a `Shift` record (which should itself be impossible due to sale `PROTECT` constraints), the `ShiftClosure` would not be silently destroyed.

The `closing_cash_count` field is a `DecimalField(max_digits=12, decimal_places=2)` with no default value. This is the physical cash amount that the cashier manually counted in the till at the end of their shift and entered into `ShiftCloseModal`. The serializer for shift closure must validate that this field is present and is a non-negative decimal number. Never default this to zero, as an accidentally submitted zero would produce a misleading discrepancy figure.

The `expected_cash` field is a `DecimalField(max_digits=12, decimal_places=2)` storing the computed expected cash amount: `opening_float + total_cash_amount`. Although this value could theoretically be recomputed from the `Shift.opening_float` and the aggregated cash sales, it is stored permanently in `ShiftClosure` as an immutable audit safeguard. If the `Sale` records for a shift are ever retroactively modified (which should not happen but might occur through direct database intervention), the `expected_cash` value in `ShiftClosure` remains unchanged, preserving the historical record of what was calculated at the precise moment of closing.

The `cash_difference` field is a `DecimalField(max_digits=12, decimal_places=2)` equal to `closing_cash_count - expected_cash`. A positive value indicates a cash overage (more money in the till than expected). A negative value indicates a cash shortage. This figure drives the discrepancy alert in the shift close confirmation screen.

The `total_sales_count` field is an `IntegerField()` recording the count of `COMPLETED` (non-voided) sales that occurred during the shift.

The `total_sales_amount` field is a `DecimalField(max_digits=12, decimal_places=2)` recording the sum of `total_amount` across all `COMPLETED` sales in the shift.

The `total_returns_count` field is an `IntegerField(default=0)`. Returns and exchange functionality is deferred to SubPhase 03.03. This field is included now to avoid requiring a future migration on a `ShiftClosure` table that may already contain thousands of rows.

The `total_returns_amount` field is a `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))`. Same reasoning — defined now, populated in SubPhase 03.03.

The `total_cash_amount` field is a `DecimalField(max_digits=12, decimal_places=2)` representing the sum of `total_amount` across all `COMPLETED` sales where `payment_method = PaymentMethod.CASH`. This is the value added to `opening_float` to compute `expected_cash`.

The `total_card_amount` field is a `DecimalField(max_digits=12, decimal_places=2)` representing the sum of `total_amount` across all `COMPLETED` sales where `payment_method = PaymentMethod.CARD`. Note that `SPLIT` payment totals are included in `total_sales_amount` but not broken down into `total_cash_amount` or `total_card_amount` in Phase 03 — the detailed split payment breakdown is added in SubPhase 03.02.

The `closed_by` field is a `ForeignKey` to `User` with `related_name='closed_shifts'` and `on_delete=models.PROTECT`. Records which user performed the shift close action. This may be the cashier themselves or a manager closing on their behalf.

The `closed_at` field is a `DateTimeField(auto_now_add=True)`. This is set automatically to the current timestamp at the moment the `ShiftClosure` record is created, providing an authoritative close timestamp.

---

## Step 5 — Run the Migration

With the `Shift` and `ShiftClosure` models defined, run the second POS migration. Name it descriptively: `add_shift_and_closure_models`. After generating the migration file, review it to confirm that both tables are being created, that the `OneToOneField` on `ShiftClosure.shift` is correctly mapped, and that the `Sale.shift` foreign key is now resolved to the correct `Shift` table.

Execute the migration to apply the schema changes. Confirm via the Django shell or database introspection that the `pos_shift` and `pos_shiftclosure` tables now exist. Verify the `pos_sale.shift_id` foreign key column correctly references `pos_shift.id`. Attempt to load the Django application (for example, by starting the development server or running `poetry run python manage.py check`) and confirm no warnings or errors relating to model definitions.

---

## Expected Output

After this task, `backend/apps/pos/models.py` contains four complete model definitions: `Shift`, `Sale`, `SaleLine`, and `ShiftClosure`, along with three TextChoices classes: `PaymentMethod`, `SaleStatus`, and `ShiftStatus`. The second migration (`add_shift_and_closure_models`) has been applied. The database contains all four POS tables. The forward reference from `Sale.shift` to `Shift` is fully resolved. No import errors or migration conflicts exist.

---

## Notes

The `total_returns_count` and `total_returns_amount` fields on `ShiftClosure` must be included in this migration even though they will always be zero during Phase 03. Adding them in a future migration would require running that migration against a production database that already contains historical `ShiftClosure` rows. By including them now, the schema is forward-compatible with SubPhase 03.03's returns functionality at zero cost.

There is deliberately no `default` value on `closing_cash_count`. If Django or the serializer were to silently default this to zero, every incorrectly submitted closure would show a full shortage equal to the expected cash amount. The service and serializer must require this value explicitly.

The `ShiftClosure` record is immutable after creation by design. Do not implement any endpoint, service function, or admin action that updates or recalculates a `ShiftClosure`. The stored values represent the state of the shift at the exact moment it was closed. If a discrepancy is discovered later, that is a reconciliation matter handled outside the system — not a reason to mutate the closure record.
