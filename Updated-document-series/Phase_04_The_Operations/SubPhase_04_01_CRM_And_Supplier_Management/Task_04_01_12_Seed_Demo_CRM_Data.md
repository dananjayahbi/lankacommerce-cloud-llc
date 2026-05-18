# Task 04.01.12 — Seed Demo CRM Data

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.12 |
| Complexity | Low |
| Dependencies | 04.01.01 + Task_03_02_12 |
| Produces | `backend/apps/crm/management/commands/seed_demo_crm.py` |

---

## Objective

Create an idempotent Django management command that seeds demo customers, suppliers, purchase orders, and a broadcast record for the demo tenant. Run with `poetry run python manage.py seed_demo_crm`.

---

## Instructions

### Step 1: Understand Existing Seed Structure

Review `backend/apps/pos/management/commands/seed_demo_sales.py` from Task_03_02_12 to understand how the demo tenant and admin user are fetched. The CRM seed appends after all existing seed data — it does not modify or replace earlier seed commands. Fetch the demo tenant with a consistent lookup (e.g. `Tenant.objects.get(slug='demo')`) as used in the existing seed commands.

### Step 2: Idempotency Guard

At the top of `handle(self, *args, **kwargs)`:

`if Customer.objects.filter(tenant=demo_tenant, phone='+94770000001').exists():`

`    self.stdout.write("Demo CRM data already seeded — skipping.")`

`    return`

This check is based on the first demo customer's phone number, which is unique and unlikely to appear in any other context.

### Step 3: Seed 10 Demo Customers

Create each customer using `Customer.objects.create(...)`. Use `datetime.date(YYYY, MM, DD)` (from the `datetime` standard library) for birthday fields — the `Customer.birthday` is a `DateField`, not a `DateTimeField`. Use `Decimal(...)` (from the `decimal` standard library) for all monetary values.

| # | Name | Phone | Tags | Birthday | credit_balance | total_spend | notes |
|---|---|---|---|---|---|---|---|
| 1 | Amara Perera | +94770000001 | ['VIP', 'Regular'] | 1990-03-17 | 1500.00 | 45000.00 | "Loyal since 2019" |
| 2 | Nimal Fernando | +94770000002 | ['Wholesale'] | null | 0.00 | 0.00 | "" |
| 3 | Dilani Jayawardena | +94770000003 | ['VIP'] | 1985-06-21 | 0.00 | 62000.00 | "" |
| 4 | Kasun Dissanayake | +94770000004 | ['Regular'] | 1995-11-08 | -500.00 | 0.00 | "" |
| 5 | Priya Rajapaksa | +94770000005 | ['VIP', 'Online'] | 1992-07-14 | 2000.00 | 38000.00 | "Online orders" |
| 6 | Chamara Silva | +94770000006 | ['Regular'] | null | 0.00 | 0.00 | "" |
| 7 | Ruwan Bandara | +94770000007 | ['Wholesale'] | 1978-02-28 | 0.00 | 0.00 | "" |
| 8 | Sanduni Gunawardena | +94770000008 | ['VIP'] | 1998-09-03 | 750.00 | 28000.00 | "" |
| 9 | Tharindu Wickramasinghe | +94770000009 | ['Regular'] | 1988-12-25 | 0.00 | 0.00 | "" |
| 10 | Ishani Mendis | +94770000010 | ['Staff'] | 1993-04-18 | 0.00 | 0.00 | "" |

Set `is_active=True` for all 10. `email` may be left `None` for all demo customers.

### Step 4: Seed 3 Demo Suppliers

Check each supplier's existence before creating using `Supplier.objects.filter(tenant=demo_tenant, name=supplier_name).exists()`. Only create if it does not exist.

| name | contact_name | phone | whatsapp_number | lead_time_days | email |
|---|---|---|---|---|---|
| Colombo Fashion Imports | Ruwan Senanayake | +94112000001 | +94770100001 | 14 | contact@colombo-fashion-imports.lk |
| Lanka Textile Mills | Nirosha Wickrama | +94112000002 | +94770100002 | 7 | contact@lanka-textile-mills.lk |
| FabricCo Wholesale | Saman Rathnayake | +94112000003 | +94770100003 | 10 | contact@fabricco-wholesale.lk |

Set `is_active=True` and `address=''` for all three. Set `notes=''`.

### Step 5: Fetch Two Existing Product Variants

`variants = list(ProductVariant.objects.filter(product__tenant=demo_tenant)[:2])`

If `len(variants) < 2`:

`self.stdout.write(self.style.WARNING("Not enough product variants found — skipping PO seed."))`

`return`

Fetch the `Lanka Textile Mills` supplier: `supplier_ltm = Supplier.objects.get(tenant=demo_tenant, name='Lanka Textile Mills')`. Fetch the `Colombo Fashion Imports` supplier: `supplier_cfi = Supplier.objects.get(tenant=demo_tenant, name='Colombo Fashion Imports')`. Fetch the first admin user for `created_by`: `admin_user = User.objects.filter(tenant=demo_tenant, role='ADMIN').first()`.

### Step 6: Seed a RECEIVED PO

Check existence: `if PurchaseOrder.objects.filter(tenant=demo_tenant, notes='Demo PO — Received (seed)').exists(): # skip`.

Create the PO:

`po_received = PurchaseOrder.objects.create(tenant=demo_tenant, supplier=supplier_ltm, created_by=admin_user, status=POStatus.RECEIVED, expected_delivery_date=datetime.date.today(), notes='Demo PO — Received (seed)', total_amount=Decimal('35000.00'))`

Create two lines using `PurchaseOrderLine.objects.create(...)`:

**Line 1:**

`purchase_order=po_received`, `variant=variants[0]`, `product_name_snapshot=variants[0].product.name`, `variant_description_snapshot=variants[0].description or ''`, `ordered_qty=20`, `expected_cost_price=Decimal('850.00')`, `received_qty=20`, `actual_cost_price=Decimal('840.00')`, `is_fully_received=True`

**Line 2:**

`purchase_order=po_received`, `variant=variants[1]`, `product_name_snapshot=variants[1].product.name`, `variant_description_snapshot=variants[1].description or ''`, `ordered_qty=15`, `expected_cost_price=Decimal('1200.00')`, `received_qty=15`, `actual_cost_price=Decimal('1200.00')`, `is_fully_received=True`

**Direct stock increment for seed data:**

After creating both lines, increment each variant's `stock_quantity` directly using `F()`:

`ProductVariant.objects.filter(id=variants[0].id).update(stock_quantity=F('stock_quantity') + 20)`

`ProductVariant.objects.filter(id=variants[1].id).update(stock_quantity=F('stock_quantity') + 15)`

Note in a comment above these lines: `# Seed only — direct stock increment bypasses adjust_stock intentionally. Production code must always call adjust_stock from inventory_service.py.`

### Step 7: Seed a DRAFT PO

Check existence: `if PurchaseOrder.objects.filter(tenant=demo_tenant, notes='Demo PO — Draft (seed)').exists(): # skip`.

Create the PO:

`po_draft = PurchaseOrder.objects.create(tenant=demo_tenant, supplier=supplier_cfi, created_by=admin_user, status=POStatus.DRAFT, expected_delivery_date=datetime.date.today() + datetime.timedelta(days=21), notes='Demo PO — Draft (seed)', total_amount=Decimal('40500.00'))`

Create two lines:

**Line 1:** `ordered_qty=25`, `expected_cost_price=Decimal('750.00')`, `received_qty=0`, `is_fully_received=False`. Snapshots from `variants[0]`.

**Line 2:** `ordered_qty=18`, `expected_cost_price=Decimal('1025.00')`, `received_qty=0`, `is_fully_received=False`. Snapshots from `variants[1]`.

Do not modify stock quantities for the DRAFT PO — stock is only updated when goods are physically received.

### Step 8: Seed a CustomerBroadcast Record

Check existence: `if CustomerBroadcast.objects.filter(tenant=demo_tenant, message__icontains='End of Season Sale').exists(): # skip`.

Import `timedelta` from `datetime`. Import `timezone` from `django.utils`.

`CustomerBroadcast.objects.create(tenant=demo_tenant, sent_by=admin_user, message="Dear Valued Customer, our End of Season Sale is here! Visit us this weekend for up to 40% off selected items. Thank you for shopping with us!", filters={'tag': 'VIP'}, recipient_count=8, sent_at=timezone.now() - timedelta(days=7))`

Note: `sent_at` has `auto_now_add=True` on the model, which cannot be overridden via `.create()`. If the model's `sent_at` field needs a fixed past date for demo purposes, change the field to `DateTimeField(default=timezone.now, editable=True)` temporarily, or use `CustomerBroadcast.objects.filter(id=broadcast.id).update(sent_at=timezone.now() - timedelta(days=7))` after creation. Document this workaround in the command.

### Step 9: Log Summary

Print a success summary:

`self.stdout.write(self.style.SUCCESS("Seeded demo CRM data: 10 customers, 3 suppliers, 2 purchase orders (1 RECEIVED + 1 DRAFT), 1 broadcast record."))`

### Step 10: Verify Idempotency

Run `poetry run python manage.py seed_demo_crm` a second time. Confirm the output is exactly "Demo CRM data already seeded — skipping." and that no duplicate records are created in any of the seeded tables.

---

## Expected Output

`backend/apps/crm/management/commands/seed_demo_crm.py` — a `BaseCommand` subclass named `Command` with a `help` string and a `handle` method implementing all steps above.

---

## Validation

- 10 `Customer` records exist for the demo tenant with varied `tags`, `credit_balance`, `total_spend`, and `birthday` values.
- Customer 4 (Kasun Dissanayake) has `credit_balance = Decimal('-500.00')` — a negative balance indicating the customer owes the store.
- 3 `Supplier` records exist with all fields populated, including `whatsapp_number` distinct from `phone`.
- 1 `PurchaseOrder` with `status=RECEIVED` exists with 2 `PurchaseOrderLine` records both having `is_fully_received=True`.
- 1 `PurchaseOrder` with `status=DRAFT` exists with 2 `PurchaseOrderLine` records both having `received_qty=0`.
- 1 `CustomerBroadcast` record exists with `recipient_count=8` and `filters={'tag': 'VIP'}`.
- Running `poetry run python manage.py seed_demo_crm` a second time prints "Demo CRM data already seeded — skipping." and no additional records are created.
- `poetry run python manage.py migrate --check` still passes after running the seed (seed data does not trigger migrations).

---

## Notes

- Use `datetime.date(YYYY, MM, DD)` — not `datetime.datetime` — for `birthday` fields since `Customer.birthday` is a `DateField`. Passing a `datetime` object causes a type mismatch in strict Django validation modes.
- Use `Decimal(...)` — never `float` — for all monetary field values (`credit_balance`, `total_spend`, `expected_cost_price`, `actual_cost_price`, `total_amount`).
- Use `F('stock_quantity') + N` for the direct stock increment in Step 6. This is the thread-safe approach even in a seed context, where concurrent database access is unlikely but the pattern reinforces production best practices.
- The `sent_at` field workaround in Step 8 (updating after creation) is a known Django limitation with `auto_now_add`. The comment in the command should make this clear to future maintainers.
