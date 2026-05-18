# Task 02.01.05 — Create StockTakeSession Models

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Task 02.01.03 (ProductVariant model), Task 01.02.01 (CustomUser model) |

---

## Objective

This task defines two related models that together support the physical stock-count workflow: `StockTakeSession` and `StockTakeItem`. A `StockTakeSession` represents a single counting event — either a full warehouse count or a category-scoped count. `StockTakeItem` records the physically counted quantity for each individual variant within that session and tracks the discrepancy against the system's recorded quantity.

---

## Instructions

### Step 1: Define the StockTakeStatus Enumeration

In `backend/apps/catalog/models.py`, define a `StockTakeStatus` class inheriting from `django.db.models.TextChoices`. It must declare the following four choices:

- `IN_PROGRESS` — the session is currently open and items are actively being counted by staff
- `PENDING_APPROVAL` — all items have been counted and the session is awaiting review and approval from a manager
- `APPROVED` — a manager has reviewed and accepted the count; stock adjustment movements have been applied
- `REJECTED` — a manager reviewed and rejected the count; no stock adjustments were applied and the session is closed without effect

### Step 2: Define the StockTakeSession Model

Define the `StockTakeSession` model inheriting from `django.db.models.Model`. Add the following fields:

- **id**: A `UUIDField` primary key with `uuid.uuid4` default and `editable=False`.
- **tenant**: A `ForeignKey` to the `Tenant` model with `on_delete=CASCADE`, `db_index=True`, and `related_name='stock_take_sessions'`.
- **category_id**: An optional `UUIDField` with `null=True` and `blank=True`. When set, indicates that this session is scoped to a specific category. A plain `UUIDField` is used rather than a ForeignKey to avoid tight coupling and to allow the session record to persist even if the referenced category is later soft-deleted.
- **status**: A `CharField` with `choices=StockTakeStatus.choices`, `max_length=20`, and a default of `StockTakeStatus.IN_PROGRESS`.
- **initiated_by**: A `ForeignKey` to `CustomUser` with `on_delete=PROTECT` and `related_name='initiated_stock_takes'`. Records the staff member who opened the session. Using `PROTECT` prevents deletion of user accounts that have initiated sessions.
- **approved_by**: A `ForeignKey` to `CustomUser` with `on_delete=SET_NULL`, `null=True`, `blank=True`, and `related_name='approved_stock_takes'`. Set to the manager who approved or rejected the session after review.
- **started_at**: A `DateTimeField` with `auto_now_add=True`. Automatically records the moment the session was created.
- **completed_at**: A nullable `DateTimeField` with `null=True` and `blank=True`. Set by the service layer when the session transitions from `IN_PROGRESS` to `PENDING_APPROVAL`.
- **approved_at**: A nullable `DateTimeField` with `null=True` and `blank=True`. Set when the session is approved or rejected by a manager.
- **notes**: An optional `TextField` with `blank=True` and `null=True`. Used by the approver to add commentary or reasons for rejection.

In the inner `Meta` class, define a `models.Index` on `['tenant', 'status']` to speed up queries that list active or pending sessions for a tenant. Add `verbose_name` and `verbose_name_plural`.

Add a `__str__` method that returns a string combining the session ID and its current status.

### Step 3: Define the StockTakeItem Model

Define the `StockTakeItem` model immediately after `StockTakeSession`. Add the following fields:

- **id**: A `UUIDField` primary key with `uuid.uuid4` default and `editable=False`.
- **session**: A `ForeignKey` to `StockTakeSession` with `on_delete=CASCADE` and `related_name='items'`. Deleting a session cascades to all its count items.
- **variant**: A `ForeignKey` to `ProductVariant` with `on_delete=PROTECT` and `related_name='stock_take_items'`. Variants that have been counted in any session cannot be hard-deleted.
- **system_quantity**: An `IntegerField`. Records the `stock_quantity` value from the database at the moment this item was added to the session. This snapshot is never updated after creation.
- **counted_quantity**: A nullable `IntegerField` with `null=True` and `blank=True`. Set when a staff member submits a physical count for this variant. A null value indicates the item has not yet been counted.
- **discrepancy**: A nullable `IntegerField` with `null=True` and `blank=True`. Stores the computed difference between `counted_quantity` and `system_quantity`. Computed and persisted by the inventory service layer when `counted_quantity` is saved.
- **is_recounted**: A `BooleanField` with a default of `False`. Set to `True` by a supervisor when a second count is required due to a large or suspicious discrepancy.
- **created_at**: A `DateTimeField` with `auto_now_add=True`.
- **updated_at**: A `DateTimeField` with `auto_now=True`.

In the `StockTakeItem` model's inner `Meta` class, define `unique_together` on `['session', 'variant']` to enforce that each variant appears at most once within any given session.

Add a `__str__` method that returns the variant SKU and the session ID.

### Step 4: Register Models in Django Admin

Open `backend/apps/catalog/admin.py`, import `StockTakeSession` and `StockTakeItem`, and register both. Consider using a Django `TabularInline` class to embed `StockTakeItem` records as an inline table within the `StockTakeSession` admin detail view. This makes it easy for administrators to review an entire session — seeing all variants, their system quantities, counted quantities, and discrepancies — on a single page without navigating between separate admin sections.

### Step 5: Generate and Apply the Migration

Run `makemigrations catalog --name add_stock_take_models` via `poetry run` to generate the migration file. Then run `migrate` to apply it to the PostgreSQL database.

---

## Expected Output

- `StockTakeStatus` `TextChoices` class defined in `models.py`
- `StockTakeSession` model defined in `models.py` with all fields and a composite index on `['tenant', 'status']`
- `StockTakeItem` model defined in `models.py` with all fields and `unique_together` on `['session', 'variant']`
- Both models registered in `backend/apps/catalog/admin.py`, with `StockTakeItem` embedded as a `TabularInline`
- Migration file created at `backend/apps/catalog/migrations/0005_add_stock_take_models.py`
- Migration applied to PostgreSQL

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors
- [ ] `poetry run python manage.py showmigrations catalog` shows all five catalog migrations as applied
- [ ] `StockTakeSession` and `StockTakeItem` appear in Django Admin
- [ ] `StockTakeItem` inline is visible within the `StockTakeSession` detail admin view
- [ ] Attempting to add the same variant twice to the same session raises a database integrity error
- [ ] A session with `status=IN_PROGRESS` can be created successfully
- [ ] `completed_at` and `approved_at` both accept null without constraint errors
- [ ] The `initiated_by` field is required and cannot be null at the database level

---

## Notes

- The `discrepancy` field is stored rather than being derived purely at read time. Storing it allows the reporting layer in Phase 05 to filter sessions by variance size, sort items by discrepancy magnitude, and flag high-variance items without complex computed expressions in every query.
- Using `CASCADE` from session to items means that if a session is deleted (which should only be possible in admin or via a future cleanup process), all its count data is also deleted. This is the intended behavior at this build stage. A future enhancement could archive rejected sessions instead of allowing deletion.
- The `category_id` bare `UUIDField` without a database ForeignKey follows the same loose-reference pattern used for `sale_id` on `StockMovement`. It avoids tight coupling between the catalog app and the category table while still recording the scope of the counting session.
- Two separate `ForeignKey` fields to `CustomUser` on `StockTakeSession` (one for initiator and one for approver) require different `related_name` values to avoid reverse accessor conflicts on the `CustomUser` model.
