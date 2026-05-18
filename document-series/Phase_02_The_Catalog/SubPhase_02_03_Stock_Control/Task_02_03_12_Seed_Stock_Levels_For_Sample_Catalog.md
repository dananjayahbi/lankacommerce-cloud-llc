# Task 02.03.12 — Seed Stock Levels For Sample Catalog

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.12 |
| Task Name | Seed Stock Levels For Sample Catalog |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Low |
| Dependencies | Task_02_01_12 complete |
| Output Path | `backend/apps/catalog/management/commands/seed_catalog.py` (extended) |

---

## Objective

Extend the catalog seed management command to create `INITIAL_STOCK` `StockMovement` records for every `ProductVariant` in the sample catalog that carries a non-zero `stock_quantity`. Without these movement records, the Movement History page appears completely empty for all seeded variants despite the variants having stock quantities in the database. This task ensures the development environment has realistic movement history from day one, enabling meaningful end-to-end testing of the Movement History page, the Low Stock Alert widget, the Stock Valuation view, and any downstream features that depend on movement data.

---

## Step 1 — Review the Existing Seed Structure

Open `backend/apps/catalog/management/commands/seed_catalog.py` and read the sections added by Task 02.01.12 thoroughly before writing any new code. Understand the following:

- How the 30 sample products and their variants were created and stored
- What `stock_quantity` values were assigned to each variant — specifically which variants were intentionally seeded with stock at or below their `low_stock_threshold` (approximately 15% of all variants)
- How the development tenant is resolved within the seed command — locate and store this reference for use in the new extension
- Which user acts as the seed system actor — the `SUPER_ADMIN` user created during SubPhase 01.02. Locate where this user is resolved in the existing seed command (it may already be fetched near the top of the `handle` method) and use the same resolved reference throughout the new seed extension

Place the new seed extension code after the existing product and variant seeding section, clearly separated by a comment block: `# --- BEGIN: Stock Movement Seeding (added by Task 02.03.12) ---`.

---

## Step 2 — Design the Idempotency Strategy

The seed command must be safe to run multiple times without duplicating data. Design the idempotency check before writing any insertion logic.

After the seed command has been run once, every eligible variant will already have a `StockMovement` record with `reason=INITIAL_STOCK` and `actor=super_admin_user`. On a second or subsequent run, the command must detect this and skip re-insertion for those variants.

Implement the idempotency check efficiently in two steps:

First, fetch the IDs of all variants in the development tenant that have `stock_quantity > 0`. These are the candidates for seeding.

Second, perform a single query to find which of those variant IDs already have a `StockMovement` record with `reason=StockMovementReason.INITIAL_STOCK` and `actor=super_admin_user`. Use `StockMovement.objects.filter(variant_id__in=candidate_variant_ids, reason=StockMovementReason.INITIAL_STOCK, actor=super_admin_user).values_list('variant_id', flat=True)` to retrieve the already-seeded set as a flat list.

Subtract the already-seeded set from the full candidate set to produce the unseeded set — these are the only variants for which new `StockMovement` records will be created in this run. Variants in the already-seeded set are skipped entirely, with no update and no duplicate record.

---

## Step 3 — Create INITIAL_STOCK Movements in Batch

For each variant in the unseeded set determined in Step 2, prepare a `StockMovement` Python object in memory without saving it to the database yet. Each object must have the following field values set:

- `variant_id`: the variant's primary key
- `tenant_id`: the development tenant's primary key
- `actor`: the resolved `SUPER_ADMIN` seed user object
- `reason`: `StockMovementReason.INITIAL_STOCK`
- `quantity_before`: zero — at the time of initial stock receipt, the system held no units
- `quantity_after`: the variant's current `stock_quantity` value
- `quantity_delta`: equal to `quantity_after`, since `quantity_before` is zero and all delta logic is `quantity_after - quantity_before`
- `note`: the string "Initial stock seeded for development environment."
- `created_at`: a backdated timestamp approximately 30 days before the current date. Use the first day of the preceding calendar month as the base date. Vary each variant's timestamp by one to two hours relative to the others to simulate a realistic receiving process spread across a working day — for example, use the variant's position in the unseeded list to compute an offset of `position_index * 4 minutes`, capped so all timestamps fall within a single 24-hour window.

Once all objects are prepared, call `StockMovement.objects.bulk_create([...])` with the complete list to insert all records in a single database operation. Pass `ignore_conflicts=False` — the idempotency check in Step 2 has already ensured there are no conflicts to worry about, and passing `False` here means any unexpected duplicate would surface as a database error rather than being silently dropped.

---

## Step 4 — Handle Zero-Stock Variants

Variants with `stock_quantity` of zero must not receive an `INITIAL_STOCK` movement record. An `INITIAL_STOCK` movement signifies the physical receipt of inventory — receiving zero units is semantically meaningless and would pollute the movement history with noise. Zero-stock variants start with no movement history in the development environment.

Variants that have both `stock_quantity = 0` and `low_stock_threshold = 0` must be excluded from any low-stock alert verification steps described in Step 6. A threshold of zero means no low-stock alerting is configured for that variant, so the absence of a threshold crossing is expected and correct.

These exclusions are already handled by the idempotency filter in Step 2 (which only selects variants with `stock_quantity > 0`), so no additional conditional logic is needed beyond that filter.

---

## Step 5 — Add a Seed Summary Log

At the end of the new seed extension block, write summary information to the command's standard output using `self.stdout.write()` with the `self.style.SUCCESS` style formatter for the final line.

Compute and print the following four statistics:

- **Total variants in tenant:** the count of all `ProductVariant` records in the development tenant, regardless of stock quantity
- **Variants with stock > 0:** the count of candidates from Step 2 before idempotency filtering
- **Movements created this run:** the count of records actually inserted via `bulk_create` in Step 3
- **Movements skipped (already existed):** the count of candidates that were excluded by the idempotency check

Format the summary as a single output line such as: "Stock seeding complete: 87 variants total, 74 with stock > 0, 74 INITIAL_STOCK movements created, 0 skipped."

On a second run of the seed command, the output should read: "Stock seeding complete: 87 variants total, 74 with stock > 0, 0 INITIAL_STOCK movements created, 74 skipped." This confirms at a glance that the idempotency guard is working correctly.

---

## Step 6 — Verify the Low-Stock Seed Subset

After running the seed command successfully in a development environment for the first time, verify that the low-stock signal is correct end-to-end.

Review the variant data seeded by Task 02.01.12 and confirm that approximately 15% of all variants were assigned `stock_quantity` values at or below their individual `low_stock_threshold`. Record the exact expected count in a comment at the top of the seed extension block, for example: `# Expected low-stock variant count after seeding: 11 (out of 74 variants with stock > 0)`. This comment allows future developers to validate the seed output without needing to query the database directly.

After running the seed command, call `GET /api/catalog/stock/low-stock/?count_only=true` from a REST client or via curl in the development environment. The returned count must match the expected number recorded in the comment. If the counts do not match, investigate whether the `low_stock_threshold` values were set correctly during the Task 02.01.12 variant seeding, or whether the `INITIAL_STOCK` movements are being created with incorrect `quantity_after` values. Do not proceed to testing the Low Stock Alert widget until this count is confirmed correct.
