# Task 03.02.12 — Seed Demo Sales Data

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.12 |
| Name | Seed Demo Sales Data |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Low |
| Depends On | Task 03.02.01 (Payment Model), SubPhase 02.01 catalog data seeded |
| Produces | `backend/apps/pos/management/commands/seed_demo_sales.py` |

## Objective

Create a Django management command that seeds 20 completed demo sales across five consecutive days, using two cashier users, realistic multi-item cart compositions drawn from the sample product catalog, and the correct payment method distribution required for meaningful dashboard and shift report demonstrations.

## Instructions

### Step 1: Understand the Existing Seed Structure

Before writing any code, review the existing seed commands under `backend/apps/pos/management/commands/` and the catalog seed to identify: the seeded tenant, the two cashier `User` records created in SubPhase 01.02 or 01.03, and the seeded product variants from SubPhase 02.01. Note the idempotency pattern in use.

The `seed_demo_sales` command must follow the same idempotency pattern. At the start of the `handle` method, query `Sale.objects.filter(tenant=demo_tenant).count()`. If the count is already 20 or greater, call `self.stdout.write("Demo sales already seeded — skipping.")` and return immediately. This prevents duplicate data on subsequent command runs.

### Step 2: Define the Seed Constants

At the start of the `handle` method body, declare the seeding constants. `SALE_DAYS` is a list of five `datetime.date` objects relative to today — four days ago, three days ago, two days ago, yesterday, and today. Use `datetime.date.today() - datetime.timedelta(days=N)` for each. `CASHIERS` is a list of two `User` records fetched using `User.objects.get(email="<seeded cashier email>")` for each cashier. `PAYMENT_DISTRIBUTION` is a dict mapping `"CASH": 12`, `"CARD": 6`, `"SPLIT": 2` (summing to 20, representing a 60/30/10 distribution).

### Step 3: Create the Shifts

Create two `Shift` records — one per cashier — covering the five demo days. Use `Shift.objects.create` for each. Set `tenant` to the demo tenant, `cashier` to the respective cashier, `status` to `"CLOSED"`, `opened_at` to the first day at 08:30 UTC, `closed_at` to the last day at 20:00 UTC, and `opening_cash_float` to `Decimal('5000.00')` for both. After creating the shifts, create a `ShiftClosure` record for each with `closing_cash_count` set to a reasonable approximate value, `expected_cash_amount` set to the same value, `variance_amount` set to `Decimal('0')` (zero variance makes reports look clean in demos), `closed_by` set to the cashier's own user record, and `closed_at` matching the shift's `closed_at`.

### Step 4: Define the Sale Compositions

Define a list of 20 sale definition dicts. Each dict has: `day_index` (0–4), `hour_offset` (integer 0–10, distributing roughly four sales per day with even spacing across 09:00–18:00), `cashier_index` (0 or 1, alternating), `payment_method` (first 12 get `"CASH"`, next 6 get `"CARD"`, last 2 get `"SPLIT"`), and `lines` (a list of 2 to 5 line item dicts each with `variant_id`, `quantity` (1–3), and `unit_price` looked up from the seeded variant — do not hard-code prices).

Draw line items from a diverse range of seeded product variants (clothing, accessories, footwear if available). Look up `unit_price` from `ProductVariant.objects.get(id=variant_id).price` to ensure consistency with the catalog seed.

### Step 5: Execute the Sale Creation Loop

Iterate over the 20 sale definitions. For each: generate a UUID for `sale_id` using `uuid.uuid4()`. Compute `sub_total` as the sum of `quantity * unit_price` for each line (using `Decimal` arithmetic). Set `total_amount` equal to `sub_total` with no cart-level discount. Construct `created_at` from `SALE_DAYS[day_index]` combined with `time(9 + hour_offset, 0)`.

Create the `Sale` record using `Sale.objects.create` with all required fields: `tenant`, `shift` (the shift belonging to the correct cashier), `cashier`, `status: "COMPLETED"`, `payment_method`, `sub_total`, `total_amount`, `cart_discount_percent: Decimal('0')`, `completed_at` (same as `created_at`), `created_at`.

**Important**: do not call `adjust_stock` or any stock adjustment service for each line during seeding. This avoids excessive transaction overhead. Instead, after the loop completes, set each variant's `stock_quantity` to 50 directly using `ProductVariant.objects.filter(id__in=seeded_variant_ids).update(stock_quantity=50)`. Add a clearly visible comment: "NOTE: Seed data bypasses adjust_stock service. Stock quantities are set directly after sale creation to avoid race conditions and excessive transaction overhead in seed. Do not replicate this pattern in application code."

Create `SaleLine` records using `SaleLine.objects.bulk_create` for each sale. Each `SaleLine` requires `sale`, `tenant`, `variant`, `quantity`, `unit_price`, `discount_percent: Decimal('0')`, `line_total` (quantity × unit_price), `product_name_snapshot` (from `variant.product.name`), and `variant_description_snapshot` (from the variant's description or size/colour composite).

Create `Payment` records: for `CASH` sales, one `Payment` with `method: "CASH"` and `amount = total_amount`. For `CARD` sales, one `Payment` with `method: "CARD"`, `amount = total_amount`, and `card_reference_number` set to a plausible fake reference such as `"AUTO" + str(sale_index).zfill(6)`. For `SPLIT` sales, two `Payment` records — one `CARD` record with `amount` approximately 60% of `total_amount` (rounded to two decimal places using `Decimal.quantize`) and a `card_reference_number`, and one `CASH` record with the remaining 40%.

### Step 6: Logging and Sanity Assertions

Add `self.stdout.write` progress messages throughout: "Creating demo shift for cashier [name]...", "Creating sale [N] of 20...", "Setting stock quantities...", "Demo sales seed complete."

After the loop and stock fix-up, perform sanity assertions: query `Sale.objects.filter(tenant=demo_tenant).count()` and confirm it equals 20 (log a warning if not). Query `Payment.objects.filter(sale__tenant=demo_tenant).count()` and confirm it equals 22 (20 standard + 2 extra for the 2 SPLIT sales). Log both counts for confirmation.

### Step 7: Run and Verify

Run the command from the project root: `poetry run python manage.py seed_demo_sales`. Observe the console output. Verify in the Django admin or Django shell:
- 20 `Sale` records exist for the demo tenant with `status: "COMPLETED"`.
- 12 have `payment_method: "CASH"`, 6 have `"CARD"`, 2 have `"SPLIT"`.
- `created_at` timestamps are spread across 5 distinct days with approximately 4 sales per day.
- The `Payment` table has 22 records total.
- `SaleLine` records have non-empty `product_name_snapshot` and `variant_description_snapshot`.

Run the command a second time to verify idempotency — it should print "Demo sales already seeded — skipping." without creating any duplicate records.

## Expected Output

- `backend/apps/pos/management/commands/seed_demo_sales.py` implementing a self-contained Django management command that creates 2 shifts, 2 shift closures, 20 sales, their sale lines, and their payment records.
- The command is idempotent across multiple runs.
- The database contains exactly 22 `Payment` records for the demo sales (20 standard + 2 extra SPLIT legs).

## Notes

- Use `uuid.uuid4()` for ID generation — do not use `cuid2` or other Node.js-specific ID libraries.
- All monetary arithmetic uses Python `Decimal` — never Python `float`.
- The management command approach (rather than a fixture or migration) allows easy re-seeding during development and is consistent with LankaCommerce's existing seed pattern.
