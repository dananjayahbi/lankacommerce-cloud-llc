# Task 04.02.12 — Seed Demo Staff and Promotions Data

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.12 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Low |
| Estimated Effort | 0.5 days |
| Dependencies | Task 04.02.01 (all new models migrated: `CommissionRecord`, `CommissionPayout`, `TimeClock`, `Promotion`, `CustomerPricingRule`, `Expense`, `CashMovement`); Phase 01 seed (CASHIER user, MANAGER user, demo Tenant created); Phase 03 seed (demo `Sale` records, demo `Shift` record) |
| Produces | `backend/apps/hr/management/commands/seed_demo_staff_promotions.py` |
| Blocked By | Task 04.02.01 and Phase 03 seed |

---

## Objective

Create a Django management command that seeds realistic demo data for the SubPhase 04.02 data models. The command is idempotent — running it multiple times has no additional effect. It populates commission records for the demo cashier, three distinct promotions covering different promotion types, five expense records covering different categories and calendar dates, and two cash movement records for the first demo shift.

---

## Instructions

### Step 1: Create the Management Command Module

Create `backend/apps/hr/management/__init__.py` and `backend/apps/hr/management/commands/__init__.py` if they do not already exist (empty files).

Create `backend/apps/hr/management/commands/seed_demo_staff_promotions.py`.

Import at the top of the command module:
- `import datetime` and `import calendar` (for month-end date handling).
- `from decimal import Decimal`.
- `from django.core.management.base import BaseCommand`.
- `from django.contrib.auth import get_user_model`.
- `from backend.apps.hr.models import CommissionRecord, CommissionPayout, TimeClock`.
- `from backend.apps.promotions.models import Promotion`.
- `from backend.apps.pos.models import Sale, Shift, CashMovement, Expense`.
- `from backend.apps.catalog.models import Category` (or the equivalent model name from the Phase 02 catalog app).

`User = get_user_model()`.

Define the `Command` class extending `BaseCommand`. Set `help = 'Seed demo staff, promotions, expenses, and cash movement data for SubPhase 04.02.'`.

### Step 2: Implement the Idempotency Check

At the start of `handle(self, *args, **options)`:

1. Retrieve the demo tenant via `demo_tenant = Tenant.objects.filter(slug='demo').first()`. If `None`: `self.stdout.write(self.style.WARNING('Demo tenant not found. Run Phase 01 seed first.'))` and `return`.
2. Retrieve the CASHIER user: `cashier_user = User.objects.filter(tenant=demo_tenant, role='CASHIER').first()`. If `None`: `self.stdout.write(self.style.WARNING('Demo CASHIER user not found. Run Phase 01 seed first.'))` and `return`.
3. Retrieve the MANAGER user: `manager_user = User.objects.filter(tenant=demo_tenant, role__in=['MANAGER', 'OWNER']).first()`. If `None`: `self.stdout.write(self.style.WARNING('Demo MANAGER/OWNER user not found.'))` and `return`.
4. **Idempotency check**: `if CommissionRecord.objects.filter(tenant=demo_tenant, user=cashier_user).exists()`: `self.stdout.write('Demo staff/promotions data already seeded — skipping.')` and `return`.

### Step 3: Update CASHIER commission_rate

Before creating records, ensure the CASHIER user has a `commission_rate` set. Check `if cashier_user.commission_rate is None`: `User.objects.filter(id=cashier_user.id).update(commission_rate=Decimal('5.00'))`. Then refresh from the database: `cashier_user.refresh_from_db()`. This check prevents overwriting a `commission_rate` that was set by a previous manual update.

### Step 4: Seed CommissionRecord Entries

Retrieve up to 5 completed demo sales:
`demo_sales = list(Sale.objects.filter(tenant=demo_tenant, status='COMPLETED').order_by('created_at')[:5])`.

If `demo_sales` is empty: `self.stdout.write(self.style.WARNING('No completed demo sales found. Commission records will not be seeded.'))`. Continue (do not return — still seed other data).

For each `sale` in `demo_sales`, compute: `earned_amount = (sale.total_amount * Decimal('5') / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.

Import `ROUND_HALF_UP` from `decimal` at the top of the file.

Determine `is_paid`: `True` if the index is 0 or 1 (first two records are paid), `False` otherwise.

Create each record: `CommissionRecord.objects.get_or_create(tenant=demo_tenant, user=cashier_user, sale=sale, defaults={ 'earned_amount': earned_amount, 'rate_at_time': Decimal('5.00'), 'is_paid': is_paid })`.

Track `commission_records_seeded` count for the final summary print.

### Step 5: Seed Promotions

Seed 3 `Promotion` records using `get_or_create`. The deduplication key is `(tenant, name)`.

**Promotion 1 — Cart Percentage Discount**:
`Promotion.objects.get_or_create(tenant=demo_tenant, name='10% Off Everything', defaults={ 'promotion_type': 'CART_PERCENTAGE', 'value': Decimal('10.00'), 'is_active': True, 'description': 'A flat 10% discount applied to every cart — great for clearance periods.' })`.

**Promotion 2 — Promo Code Discount**:
`Promotion.objects.get_or_create(tenant=demo_tenant, name='Summer10', defaults={ 'promotion_type': 'PROMO_CODE', 'promo_code': 'SUMMER10', 'value': Decimal('10.00'), 'is_active': True, 'description': 'Enter SUMMER10 at checkout for 10% off.' })`.

**Promotion 3 — Category Percentage Discount**:

Before creating, retrieve the first category for the tenant (if any): `first_category = Category.objects.filter(tenant=demo_tenant).first()`. The `target_category` field is nullable — if `first_category` is `None`, the promotion is still created but `target_category` will be `None` (and in the UI it will need a category selected before it becomes effective). Set `target_category=first_category` regardless.

`Promotion.objects.get_or_create(tenant=demo_tenant, name='Category Discount 15%', defaults={ 'promotion_type': 'CATEGORY_PERCENTAGE', 'value': Decimal('15.00'), 'target_category': first_category, 'is_active': True, 'description': '15% off all products in the selected category.' })`.

### Step 6: Seed Expense Records

Define a helper function `_safe_date(year: int, month: int, day: int) -> datetime.date` at module level (or as a private method on the command class):
`last_day = calendar.monthrange(year, month)[1]`. `return datetime.date(year, month, min(day, last_day))`.

This prevents `ValueError` when the month has fewer than 31 days (e.g., trying to construct `datetime.date(2026, 2, 30)`).

Determine the seeding year and month from the current date: `today = datetime.date.today()`. `year = today.year`. `month = today.month`.

Seed 5 `Expense` records using `get_or_create`. The deduplication key is `(tenant, description, expense_date)`.

`Expense.objects.get_or_create(tenant=demo_tenant, description='Monthly retail space rent', expense_date=_safe_date(year, month, 1), defaults={ 'category': 'RENT', 'amount': Decimal('1200.00'), 'recorded_by': manager_user })`.

`Expense.objects.get_or_create(tenant=demo_tenant, description='Electricity and water bill', expense_date=_safe_date(year, month, 5), defaults={ 'category': 'UTILITIES', 'amount': Decimal('230.00'), 'recorded_by': manager_user })`.

`Expense.objects.get_or_create(tenant=demo_tenant, description='Weekly staff wages', expense_date=_safe_date(year, month, 15), defaults={ 'category': 'SALARIES', 'amount': Decimal('3500.00'), 'recorded_by': manager_user })`.

`Expense.objects.get_or_create(tenant=demo_tenant, description='Social media promotion boost', expense_date=_safe_date(year, month, 10), defaults={ 'category': 'ADVERTISING', 'amount': Decimal('150.00'), 'recorded_by': manager_user })`.

`Expense.objects.get_or_create(tenant=demo_tenant, description='Office supplies purchase', expense_date=_safe_date(year, month, 20), defaults={ 'category': 'MISCELLANEOUS', 'amount': Decimal('45.00'), 'recorded_by': manager_user })`.

The `expense_date` field expects a `datetime.date` object, not a `datetime.datetime`. Do not pass `datetime.datetime` — the Django `DateField` will reject it at the ORM layer in strict mode.

### Step 7: Seed CashMovement Records

Retrieve the first demo shift: `demo_shift = Shift.objects.filter(tenant=demo_tenant).order_by('opened_at').first()`.

If `demo_shift` is `None`: `self.stdout.write(self.style.WARNING('No demo shift found. CashMovement records will not be seeded.'))`. Skip cash movement seeding (do not return).

If `demo_shift` is found, seed 2 `CashMovement` records using `get_or_create`. The deduplication key is `(tenant, shift, movement_type)`.

**Opening Float**:
`CashMovement.objects.get_or_create(tenant=demo_tenant, shift=demo_shift, movement_type='OPENING_FLOAT', defaults={ 'amount': Decimal('200.00'), 'notes': 'Opening float for demo shift.', 'recorded_by': manager_user })`.

**Petty Cash Out**:
`CashMovement.objects.get_or_create(tenant=demo_tenant, shift=demo_shift, movement_type='PETTY_CASH_OUT', defaults={ 'amount': Decimal('35.00'), 'notes': 'Purchased coffee supplies for staff room.', 'recorded_by': manager_user, 'authorized_by': manager_user })`.

The `authorized_by` field is only relevant for `PETTY_CASH_OUT` and `MANUAL_OUT` movements as defined in the `CashMovement` model from Task 04.02.01. For `OPENING_FLOAT`, leave `authorized_by` as null.

### Step 8: Print the Seeding Summary

After all seeding is complete, print a structured summary to stdout:

`self.stdout.write(self.style.SUCCESS(f'Seeded demo staff/promotions data: {commission_records_seeded} CommissionRecords for CASHIER, 3 Promotions, 5 Expenses, 2 CashMovements for demo shift.'))`.

Also print individual confirmation lines (using `self.style.SUCCESS`) for each entity type, for easier debugging if the full command is run with verbosity: `--verbosity=2`.

---

## Running the Command

Run with Poetry from the `backend/` directory:

`poetry run python manage.py seed_demo_staff_promotions`

The command is safe to re-run: the idempotency check at Step 2 will detect existing `CommissionRecord` entries for the CASHIER and exit cleanly without duplicating any records.

To force a re-seed after wiping the data (e.g., during development): `CommissionRecord.objects.filter(tenant=demo_tenant, user=cashier_user).delete()` in the Django shell, then re-run the command.

---

## Expected Output

A single `backend/apps/hr/management/commands/seed_demo_staff_promotions.py` file implementing `class Command(BaseCommand)` with the `handle` method seeding all demo data idempotently.

---

## Validation

- Run the command once: verify 5 `CommissionRecord` entries for the CASHIER via Django shell (`CommissionRecord.objects.filter(user=cashier_user).count()` == 5 if 5 or more completed sales exist, or the number of completed sales otherwise).
- Verify first 2 records are `is_paid=True`, remainder `is_paid=False`: `CommissionRecord.objects.filter(user=cashier_user).order_by('created_at').values_list('is_paid', flat=True)`.
- Verify `cashier_user.commission_rate == Decimal('5.00')` after running the command.
- Run the command a second time: output is "Demo staff/promotions data already seeded — skipping." No new database records created. Verify record counts are identical to after the first run.
- Verify 3 `Promotion` records: types `CART_PERCENTAGE`, `PROMO_CODE`, `CATEGORY_PERCENTAGE` — one of each.
- Verify the `PROMO_CODE` promotion has `promo_code = 'SUMMER10'`.
- Verify 5 `Expense` records with categories RENT, UTILITIES, SALARIES, ADVERTISING, MISCELLANEOUS.
- Verify all `expense_date` values are `datetime.date` instances (not `datetime.datetime`): `type(Expense.objects.first().expense_date)` is `datetime.date`.
- Verify 2 `CashMovement` records for the first demo shift: one `OPENING_FLOAT` (Rs. 200.00) and one `PETTY_CASH_OUT` (Rs. 35.00).
- Run on a demo environment with no completed sales: warning "No completed demo sales found" printed, but command does not crash. Promotions, Expenses, and CashMovements still seeded.

---

## Notes

The `get_or_create` deduplication strategy for expenses uses `(tenant, description, expense_date)` as the lookup keys. This is intentional: two different expenses can share the same category and amount (e.g., two rent payments in the same month) but are distinguished by description. In production data, a more robust deduplication strategy would use a separate `idempotency_key` field. For demo seeding purposes, the description-based approach is sufficient.

Do not use `datetime.datetime.today()` or `timezone.now()` for `expense_date`. These return `datetime.datetime` objects (which include a time component), but `expense_date` is a Django `DateField`. Passing a `datetime.datetime` where a `DateField` is expected succeeds silently in some ORM configurations but raises `TypeError` in strict or database-level validation contexts. Always use `datetime.date.today()` or construct with `datetime.date(year, month, day)`.

The `ROUND_HALF_UP` rounding mode is mandatory for all monetary quantisation. Do not use Python's default `ROUND_HALF_EVEN` (banker's rounding) for currency amounts — it produces surprising results for half-cent values (e.g., `Decimal('0.5').quantize(Decimal('0.01'), ROUND_HALF_EVEN)` rounds to `0.0`, not `0.50`). LankaCommerce uses `ROUND_HALF_UP` consistently across all monetary operations.
