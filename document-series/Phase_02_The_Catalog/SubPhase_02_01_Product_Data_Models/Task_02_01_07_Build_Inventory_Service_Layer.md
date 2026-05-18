# Task 02.01.07 — Build Inventory Service Layer

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | High |
| Dependencies | Tasks 02.01.03–02.01.05 (ProductVariant, StockMovement, StockTakeSession models) |

---

## Objective

This task creates the inventory-focused service layer at `backend/apps/catalog/services/inventory_service.py`. It covers stock adjustment with pessimistic row-level locking to prevent concurrent write conflicts, bulk stock updates, stock movement history queries, the full stock-take session lifecycle from creation through approval, low-stock detection using field-to-field comparisons, and stock valuation using aggregate expressions. All operations that modify stock quantities use database-level locking.

---

## Instructions

### Step 1: Create the Inventory Service File

Create `backend/apps/catalog/services/inventory_service.py`. At the top of the file, import `transaction` from `django.db`, import `F`, `Sum`, and `Count` from `django.db.models`, import `timezone` from `django.utils`, and import all relevant models: `ProductVariant`, `StockMovement`, `StockMovementReason`, `StockTakeSession`, `StockTakeStatus`, and `StockTakeItem`. Also import the custom exception classes from `apps.catalog.exceptions`.

### Step 2: Implement Core Stock Adjustment

**adjust_stock(tenant_id, variant_id, actor_id, quantity_delta, reason, note=None, reference_id=None)**: This is the most critical function in the inventory layer. It must be wrapped entirely in a `transaction.atomic()` context manager.

Inside the transaction, build a queryset for the target variant filtered by `pk=variant_id` and `tenant_id=tenant_id`. Before calling `.get()` on this queryset, chain `select_for_update()` to acquire a row-level exclusive lock in PostgreSQL. This lock prevents any other concurrent database session from reading or writing this row until the current transaction commits or rolls back. This is the Django ORM equivalent of a Prisma interactive transaction with row-level locking — it eliminates the race condition that would otherwise occur if two POS terminals tried to sell the last unit of the same variant simultaneously.

After acquiring the locked variant row, record the original quantity as `quantity_before`. Compute the prospective new quantity by adding `quantity_delta` to `quantity_before`. If `quantity_delta` is negative and the resulting quantity would be less than zero, raise an `InsufficientStockError` before making any writes. This prevents the system from ever recording negative inventory.

If the new quantity is valid, update `variant.stock_quantity` to the new value and call `variant.save(update_fields=['stock_quantity', 'updated_at'])` to write only the changed fields. Then create a `StockMovement` record, setting `quantity_before` to the original amount, `quantity_after` to the new amount, `quantity_delta` to the argument value, `reason` to the provided reason, `actor_id` to the actor, `tenant_id` to the tenant, and `variant` to the locked variant. Store the optional `reference_id` in the appropriate UUID field — `sale_id`, `purchase_order_id`, or `stock_take_session_id` — based on a `reason` check.

Return a tuple of the updated variant instance and the newly created `StockMovement` instance.

### Step 3: Implement Bulk Stock Adjustment

**bulk_adjust_stock(tenant_id, adjustments, actor_id)**: Accepts a list of adjustment dictionaries, each containing at minimum a `variant_id`, `quantity_delta`, and `reason`. Wraps all adjustments in a single outer `transaction.atomic()` block. Iterates through the list and calls `adjust_stock` for each item. Because all calls occur within the same outer transaction, if any single `adjust_stock` call raises an exception — for instance, due to insufficient stock on one variant — the outer `transaction.atomic()` block rolls back all preceding adjustments in the batch. Returns a list of result tuples, one per adjustment.

### Step 4: Implement Stock Movement Queries

**get_stock_movements(tenant_id, filters, page, page_size)**: Builds a base queryset on `StockMovement.objects.filter(tenant_id=tenant_id)`. Applies optional filter arguments from the `filters` dictionary: `variant_id` for a specific variant, `reason` for a specific movement type, `actor_id` for movements by a specific user, `date_from` using the `created_at__gte` lookup, and `date_to` using the `created_at__lte` lookup. Applies `select_related('variant', 'actor')` to resolve ForeignKey fields in the same query. Applies `order_by('-created_at')` for reverse chronological ordering. Computes the total count using `.count()` before applying pagination. Slices the queryset using list-slice notation based on the `page` and `page_size` arguments to extract the correct page of results. Returns a dictionary containing the results list and the total count.

### Step 5: Implement Stock Take Session Creation and Item Management

**create_stock_take_session(tenant_id, actor_id, category_id=None)**: Creates and returns a new `StockTakeSession` with `status=StockTakeStatus.IN_PROGRESS`, `initiated_by_id=actor_id`, and `tenant_id=tenant_id`. If `category_id` is provided, sets it on the session. Returns the newly created session.

**add_stock_take_item(tenant_id, session_id, variant_id)**: Fetches the session and confirms that it belongs to the correct tenant and has `status=IN_PROGRESS`. If the session is not in progress, raises a `ConflictError`. Fetches the variant and confirms it belongs to the same tenant. Reads `variant.stock_quantity` as the `system_quantity` value at this moment. Creates a new `StockTakeItem` with `counted_quantity=None` and `discrepancy=None`. If the variant is already present in the session, the `unique_together` database constraint raises an `IntegrityError`, which the caller should catch and convert to a 409 response.

**update_stock_take_item(tenant_id, session_id, item_id, counted_quantity)**: Fetches the item by ID and confirms that its parent session belongs to the correct tenant and is still `IN_PROGRESS`. Sets `counted_quantity` to the provided value. Computes `discrepancy` as the arithmetic difference between `counted_quantity` and `system_quantity`. Calls `.save(update_fields=['counted_quantity', 'discrepancy', 'updated_at'])`. Returns the updated item.

### Step 6: Implement Stock Take Session Lifecycle

**complete_stock_take_session(tenant_id, session_id, actor_id)**: Fetches the session and confirms it is `IN_PROGRESS`. Queries all items belonging to the session and checks whether any have `counted_quantity=None`. If any uncounted items exist, raises a `ValidationError` listing the uncounted variant SKUs. If all items are counted, sets `status=StockTakeStatus.PENDING_APPROVAL` and `completed_at=timezone.now()`. Calls `.save()`. Returns the updated session.

**approve_stock_take(tenant_id, session_id, actor_id, notes=None)**: Fetches the session and confirms it is `PENDING_APPROVAL`. Opens a single `transaction.atomic()` block. Queries all `StockTakeItem` records for the session where `discrepancy` is not zero. For each such item, calls `adjust_stock(...)` with `reason=StockMovementReason.STOCK_TAKE_ADJUSTMENT` and passes the session ID as the `reference_id`. After all adjustments are created, sets `status=StockTakeStatus.APPROVED`, `approved_by_id=actor_id`, `approved_at=timezone.now()`, and `notes` to the provided text. Calls `.save()` on the session. Returns the updated session.

**reject_stock_take(tenant_id, session_id, actor_id, notes)**: Fetches the session and confirms it is `PENDING_APPROVAL`. Sets `status=StockTakeStatus.REJECTED`, `approved_by_id=actor_id`, `approved_at=timezone.now()`, and `notes` to the rejection reason. Calls `.save()`. No stock adjustment movements are created. Returns the updated session.

### Step 7: Implement Low-Stock Detection

**get_low_stock_variants(tenant_id, category_id=None)**: Builds a queryset of `ProductVariant.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)`. Applies a field-to-field comparison using Django's `F()` expression object: the filter condition `stock_quantity__lte=F('low_stock_threshold')` instructs the database to compare the `stock_quantity` column against the `low_stock_threshold` column of the same row, entirely within SQL. This is more efficient than fetching all variants into Python and filtering in application code.

If `category_id` is provided, applies an additional filter traversing the ForeignKey relationship: `product__category_id=category_id`. Chains `select_related('product', 'product__category')` to resolve related fields efficiently. Returns the filtered queryset.

### Step 8: Implement Stock Valuation

**get_stock_valuation(tenant_id, category_id=None)**: Builds a queryset of non-deleted `ProductVariant` records scoped to the tenant. If `category_id` is provided, filters by `product__category_id`. Calls `.aggregate()` on the queryset with a `Sum()` expression that multiplies two `F()` fields together — specifically `F('cost_price') * F('stock_quantity')` — to produce the total cost value of all on-hand inventory units. This entire multiplication is evaluated inside PostgreSQL, producing a single aggregated decimal value without loading any row data into Python.

The result of `.aggregate()` is a dictionary; extract the `total_cost` key and return it as a Python `Decimal` value. If no matching variants exist, the aggregate returns `None` — in that case, return `Decimal('0.00')` explicitly.

---

## Expected Output

- `backend/apps/catalog/services/inventory_service.py` created with all inventory service functions
- `select_for_update()` used in `adjust_stock` to acquire row-level pessimistic locks
- `transaction.atomic()` wraps all multi-step write operations
- `F()` expressions used for field-to-field comparison in `get_low_stock_variants`
- `F()` multiplication with `Sum()` aggregation used in `get_stock_valuation`
- `InsufficientStockError` raised when a negative stock result would occur

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors
- [ ] `adjust_stock` correctly records `quantity_before` and `quantity_after` on the resulting `StockMovement`
- [ ] `adjust_stock` raises `InsufficientStockError` when `quantity_delta` would bring `stock_quantity` below zero
- [ ] `bulk_adjust_stock` rolls back all adjustments atomically if any single adjustment fails
- [ ] `approve_stock_take` creates `StockMovement` records for all items where `discrepancy` is non-zero
- [ ] `approve_stock_take` skips `StockMovement` creation for items where `discrepancy` is zero
- [ ] `get_low_stock_variants` uses a field-to-field database comparison rather than filtering in Python
- [ ] `get_stock_valuation` returns a `Decimal` value and returns `Decimal('0.00')` when no variants exist
- [ ] `complete_stock_take_session` raises a `ValidationError` if any item in the session has not been counted

---

## Notes

- `select_for_update()` only takes effect inside an active `transaction.atomic()` block. If called outside a transaction, Django raises a `TransactionManagementError` in `ATOMIC_REQUESTS=True` mode or silently has no locking effect in other configurations. Always ensure it is called within `transaction.atomic()`.
- The `InsufficientStockError` class should be defined in `backend/apps/catalog/exceptions.py`. DRF views catch this exception and return a 422 or 400 response with a structured error body.
- The `F('cost_price') * F('stock_quantity')` expression within `Sum()` is evaluated entirely in the PostgreSQL query planner. It is significantly more efficient than loading all variant rows into Python and performing the multiplication in a loop.
- Row-level locking via `select_for_update()` serializes concurrent stock adjustments for the same variant, but allows concurrent adjustments to different variants to proceed in parallel. This is the optimal lock granularity for a retail inventory system.
