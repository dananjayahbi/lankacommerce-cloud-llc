# Task 02.03.11 — Setup Stock Movement Audit Logging

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.11 |
| Task Name | Setup Stock Movement Audit Logging |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Low |
| Dependencies | Task_02_03_08 complete |
| Output Paths | `backend/apps/catalog/services/audit_service.py` (verified or created), `backend/apps/catalog/services/inventory_service.py` (verified), `backend/apps/catalog/services/product_service.py` (verified) |

---

## Objective

Verify and complete the audit logging strategy for all stock-modifying and product-modifying operations across the LankaCommerce catalog backend. The `StockMovement` table serves as the primary audit record for all inventory quantity changes. The complementary `AuditLog` model established in SubPhase 01.02 captures administrative and business-level events not covered by stock movements — specifically product lifecycle events, price changes, and stock take decisions. This dual-audit architecture must be enforced consistently, with a clear boundary preventing double-logging.

---

## Step 1 — Understand the Dual Audit Architecture

LankaCommerce uses two complementary audit mechanisms that serve distinct purposes and must not be conflated.

**The `StockMovement` table** (in `backend/apps/catalog/models.py`) is the append-only source of truth for all inventory quantity changes. Every stock adjustment creates exactly one `StockMovement` record containing `quantity_before`, `quantity_after`, `quantity_delta`, `reason`, `actor`, `tenant`, and an optional `note`. This table feeds the Movement History page and provides the complete operational record of how inventory quantities changed over time. It is created by `adjust_stock` and `bulk_adjust_stock` in `inventory_service.py` — never anywhere else.

**The `AuditLog` model** (in `backend/apps/accounts/models.py`) records broader administrative actions: create, update, delete operations on top-level entities such as products, variants, categories, and the approval or rejection of stock take sessions. It stores `before` and `after` JSON snapshots allowing support staff to investigate configuration errors — for example, "who changed the cost price of this variant and what was the old value?" The key distinction is that `AuditLog` captures entity-level changes, not quantity changes.

The boundary rule: never write an `AuditLog` entry for a stock quantity change. Never write a `StockMovement` record for a product or price change. Each event type has exactly one home.

---

## Step 2 — Verify or Create the Audit Service

Open `backend/apps/catalog/services/audit_service.py` if it already exists. Verify that it exposes a function with the signature `log_audit_event(tenant_id, actor_id, action, resource_type, resource_id, before=None, after=None)`.

If the file does not exist, create it. The function must:

- Accept the seven named parameters listed above
- Construct an `AuditLog.objects.create(...)` call passing each parameter, serialising `before` and `after` to JSON if they are provided as Python dicts or lists
- Wrap the entire `create` call in a `try/except` block that catches all exceptions, logs the error server-side using Django's standard logging module, and silently re-raises nothing — audit log failures must never propagate to the caller or cause the primary operation to roll back. Audit logging is best-effort.

The `action` parameter is a string following the established naming convention of uppercase underscore-separated verbs and resources: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `VARIANT_PRICE_CHANGED`, `STOCK_TAKE_SUBMITTED`, `STOCK_TAKE_APPROVED`, `STOCK_TAKE_REJECTED`.

---

## Step 3 — Verify AuditLog Integration in product_service.py

Open `backend/apps/catalog/services/product_service.py`. For each of the following product lifecycle operations, verify that a `log_audit_event` call is present immediately after the database write succeeds. Add the call wherever it is missing.

**Product creation:** After a new `Product` record is created, call `log_audit_event` with `action="PRODUCT_CREATED"`, `resource_type="Product"`, `resource_id=product.id`, `before=None`, and `after` containing a dict of key fields: name, category ID, `is_archived`, and `tenant_id`. This gives support staff a complete picture of the initial state.

**Product update:** After a product record is updated, call `log_audit_event` with `action="PRODUCT_UPDATED"`, `resource_type="Product"`, `resource_id=product.id`. The `before` dict must contain only the fields that were changed and their previous values; the `after` dict must contain only the changed fields and their new values. Log only what changed — do not snapshot the entire model on every update, as this produces noisy and large audit entries.

**Product soft-delete:** After `is_archived` is set to `True` on a product, call `log_audit_event` with `action="PRODUCT_DELETED"`, `resource_type="Product"`, `resource_id=product.id`, `before` containing `{ "is_archived": False }`, and `after` containing `{ "is_archived": True }`.

**Variant retail or cost price change:** After a `ProductVariant` retail price or cost price is updated, call `log_audit_event` with `action="VARIANT_PRICE_CHANGED"`, `resource_type="ProductVariant"`, `resource_id=variant.id`, `before` containing a dict with the old price values (whichever were changed), and `after` containing the new values.

**Bulk price update (from SubPhase 02.02):** When the bulk price update operation processes multiple products, call `log_audit_event` once per product — not once for the entire batch operation. Each call uses `action="VARIANT_PRICE_CHANGED"` and specifies the individual product's before and after price. Batch audit entries obscure individual product history and make investigation harder.

---

## Step 4 — Verify AuditLog Integration in inventory_service.py

Open `backend/apps/catalog/services/inventory_service.py`. Verify the following two operations call `log_audit_event`:

**`approve_stock_take`:** Confirm that after the session status is updated to `APPROVED` and all discrepancy-based `StockMovement` records have been created, `log_audit_event` is called with `action="STOCK_TAKE_APPROVED"`, `resource_type="StockTakeSession"`, `resource_id=session.id`, and `after` containing a dict with the approver's user ID, the count of stock adjustments that were applied, and the `approved_at` timestamp. If this call is absent, add it.

**`reject_stock_take`:** Confirm that after the session status is updated to `REJECTED`, `log_audit_event` is called with `action="STOCK_TAKE_REJECTED"`, `resource_type="StockTakeSession"`, `resource_id=session.id`, and `after` containing a dict with the rejecting user's ID and the `rejection_reason` string. If this call is absent, add it.

If `inventory_service.py` has been split such that approval and rejection are handled in the DRF view rather than the service layer, relocate these `log_audit_event` calls to wherever the status update is actually performed — the important thing is that the call happens exactly once per operation, not that it lives in a particular file.

---

## Step 5 — Verify AuditLog Table Indexes

Open the Django migration file that created the `AuditLog` model in SubPhase 01.02. Check whether both of the following composite database indexes are defined in the `Meta.indexes` list or added via a `migrations.AddIndex` operation:

**Index on `[tenant_id, actor_id, created_at]`:** This index is essential for queries like "show me all actions taken by this staff member in the last 30 days." Without it, such queries perform a full table scan as the audit log grows.

**Index on `[tenant_id, resource_type, resource_id]`:** This index is essential for queries like "show me all changes ever made to Product with ID X." This is the query a support engineer runs when investigating a product configuration complaint.

If either index is missing, create a new migration in the `accounts` app named `add_auditlog_indexes` that adds the missing indexes using `migrations.AddIndex`. Run `poetry run python manage.py makemigrations accounts` and `poetry run python manage.py migrate` to apply. Do not modify the original migration file — always add indexes in a new migration.

---

## Step 6 — Verify No Double-Logging for Stock Movements

Perform a final review of `backend/apps/catalog/services/inventory_service.py`. Specifically search for any `log_audit_event` calls inside the `adjust_stock` function and the `bulk_adjust_stock` function. If any such calls exist — perhaps added by an earlier attempt before this task was written — remove them immediately.

The `StockMovement` record created by each call to `adjust_stock` is the complete and authoritative audit record for that inventory quantity change. Adding an `AuditLog` entry for the same event creates a redundant and potentially inconsistent parallel record. The two systems serve different purposes, and stock quantity changes belong exclusively in `StockMovement`. This separation ensures the Movement History page and the AuditLog are each accurate and non-overlapping sources of truth.
