# Task 03.03.12 — Seed Demo Returns Data

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.12 |
| Name | Seed Demo Returns Data |
| SubPhase | 03.03 |
| Complexity | LOW |
| Dependencies | Task 03.03.01 + Task 03.02.12 |
| Produces | `backend/apps/pos/management/commands/seed_demo_returns.py` |

---

## Objective

Create a Django management command that seeds demonstration return records so developers can validate the returns UI, Return History page, and Z-Report without manually processing a return through the POS terminal. Each demo return covers a different scenario to exercise all code paths.

---

## Instructions

### Step 1: Understand the Existing Seed Structure

Before writing any code, review the existing seed commands under `backend/apps/pos/management/commands/` — particularly `seed_demo_sales.py` from Task 03.02.12. Identify the seeded tenant, the demo cashier and manager `User` records, and the 20 demo sales. The demo manager user serves as `authorized_by` for all demo returns. The demo cashier serves as `initiated_by`.

### Step 2: Add Idempotency Guard

At the start of the `handle` method, query `Return.objects.filter(tenant=demo_tenant, reason__in=["SEED_DEMO_CASH_REFUND", "SEED_DEMO_STORE_CREDIT", "SEED_DEMO_CARD_REVERSAL", "SEED_DEMO_EXCHANGE"]).count()`. If any of these records already exist, call `self.stdout.write("Demo returns already seeded — skipping.")` and return immediately.

### Step 3: Create Return A — Cash Refund with Restocking

Select the first demo sale that has at least two `SaleLine` records. Return one line item (quantity 1 of the first SaleLine) with `refund_method="CASH"` and `restock_items=True`.

Create the `Return` record using `Return.objects.create(...)` with all required fields including `reason="SEED_DEMO_CASH_REFUND"`. Then create the `ReturnLine` using `ReturnLine.objects.create(...)` with `is_restocked=False` initially. Compute `line_refund_amount` as `Decimal('1') / Decimal(sale_line.quantity) * sale_line.line_total`, rounded to two decimal places using `ROUND_HALF_UP`. After creating the `ReturnLine`, update the associated `ProductVariant.stock_quantity` using `.update(stock_quantity=F('stock_quantity') + 1)`. Then update the `ReturnLine` to set `is_restocked=True`.

### Step 4: Create Return B — Store Credit, No Restock

Select a different demo sale. Return one full `SaleLine`. Use `refund_method="STORE_CREDIT"`, `restock_items=False`, `reason="SEED_DEMO_STORE_CREDIT"`.

Create `Return` and `ReturnLine` records. Leave `is_restocked=False` (no stock update). Create a `StoreCredit` record using `StoreCredit.objects.create(amount=line_refund_amount, tenant=demo_tenant, customer=None, note="Demo store credit — Return " + str(return_record.id))`.

### Step 5: Create Return C — Card Reversal, Partial Return

Select a demo sale with a `SaleLine` having `quantity >= 2`. Return quantity 1 out of the total. Use `refund_method="CARD_REVERSAL"`, `restock_items=True`, `reason="SEED_DEMO_CARD_REVERSAL"`. Include a `card_reversal_reference="DEMO-CARD-REV-9012"` — store this on the `Return` record (add a `card_reversal_reference` field to the model if not already present).

Create `Return` and `ReturnLine`. Update variant stock using `F('stock_quantity') + 1`. Update `ReturnLine.is_restocked=True`.

### Step 6: Create Return D — Exchange

Select a fourth demo sale. Return one `SaleLine`. Use `refund_method="EXCHANGE"`, `restock_items=True`, `reason="SEED_DEMO_EXCHANGE"`.

Create `Return` and `ReturnLine`. Update variant stock. Update `is_restocked=True`. This simulates an exchange where the replacement cart was never completed — no `linked_return_id` on a new sale exists in seed data.

### Step 7: Logging and Verification

Add `self.stdout.write(...)` progress messages: "Creating demo Return A (cash refund)...", "Creating demo Return B (store credit)...", "Creating demo Return C (card reversal)...", "Creating demo Return D (exchange)...", "Seeded demo returns: 4 returns (1 cash, 1 store credit, 1 card reversal, 1 exchange)".

After all records are created, run sanity assertions: query `Return.objects.filter(tenant=demo_tenant).count()` and confirm it equals 4 (log a warning if not). Query `StoreCredit.objects.filter(tenant=demo_tenant).count()` and confirm it equals 1.

### Step 8: Run and Verify

Run `poetry run python manage.py seed_demo_returns`. Verify in the Django admin or shell: 4 `Return` records with varied `refund_method`, 4 associated `ReturnLine` records with correct `is_restocked` values (True for A, C, D; False for B), and 1 `StoreCredit` record. Run the command a second time to confirm idempotency — it should print "Demo returns already seeded — skipping."

---

## Expected Output

- `backend/apps/pos/management/commands/seed_demo_returns.py` implementing an idempotent management command that creates 4 `Return` records, 4 `ReturnLine` records, and 1 `StoreCredit` record
- Running the command twice does not create duplicate records

---

## Validation

- 4 `Return` records exist for the demo tenant with different `refund_method` values
- `ReturnLine.is_restocked` is `True` for Returns A, C, D and `False` for Return B
- 1 `StoreCredit` record exists for Return B with `customer=None`
- Running the command twice prints "Demo returns already seeded — skipping."

---

## Notes

- Use `F('stock_quantity') + quantity` from `django.db.models import F` for safe concurrent stock increments — never read then write the stock quantity in seed code
- All monetary arithmetic uses Python `Decimal` — never Python `float`
- The management command approach is consistent with LankaCommerce's existing seed pattern from `seed_demo_sales.py`
