# Task 04.02.04 — Build Commission Service Layer

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.04 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Very High |
| Estimated Effort | 2 days |
| Dependencies | Task 04.02.01 (`CommissionRecord`, `CommissionPayout` models migrated); Phase 03 `Sale` and `Return` DRF views in `backend/apps/pos/views/sale_views.py` and `backend/apps/pos/views/return_views.py` |
| Produces | `backend/apps/hr/services/commission_service.py`, updated `backend/apps/pos/views/sale_views.py`, updated `backend/apps/pos/views/return_views.py` |
| Blocked By | Task 04.02.01 |

---

## Objective

Implement the commission service layer that automatically records commission earnings when a sale is completed, adjusts those earnings with a negative record when a return is processed, aggregates unpaid totals for a staff member, and processes period-based payouts that mark records as paid. Commission creation is a side effect — if it fails, the sale or return is never rolled back. All monetary arithmetic uses Python `Decimal` with `ROUND_HALF_UP`. Float arithmetic for any monetary value is strictly forbidden.

---

## Instructions

### Step 1: Create commission_service.py — File Structure and Imports

Create `backend/apps/hr/services/commission_service.py`. Create the `services/` directory inside `backend/apps/hr/` and add an `__init__.py` to it.

Required imports at the top of the file:
- `from decimal import Decimal, ROUND_HALF_UP`
- `import logging`
- `import math`
- `from django.db import transaction`
- `from django.db.models import Sum, Count, Q, F`
- `from django.utils import timezone`
- `from backend.apps.hr.models import CommissionRecord, CommissionPayout`

Define the module-level logger: `logger = logging.getLogger('hr.commission_service')`.

### Step 2: Implement create_commission_record

Define `create_commission_record(tenant_id, sale_id, user_id, base_amount: Decimal, commission_rate: Decimal)`.

Validation:
- If `commission_rate` is `None`, return `None` immediately. A user with no commission rate configured produces no commission record — fail silently.
- If `commission_rate < Decimal('0') or commission_rate > Decimal('100')`: raise `ValueError(f"commission_rate must be between 0 and 100, got {commission_rate}")`.
- If `base_amount < Decimal('0')`: raise `ValueError("base_amount must not be negative for a standard commission record. Use create_negative_commission_record for returns.")`.

Computation:
`earned_amount = (base_amount * commission_rate / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`

Creation:
`record = CommissionRecord.objects.create(tenant_id=tenant_id, sale_id=sale_id, user_id=user_id, base_amount=base_amount, commission_rate=commission_rate, earned_amount=earned_amount, is_paid=False)`

Return `record`.

This function is synchronous and does not open a `transaction.atomic()` — it is intended to be called after an outer transaction has committed. Calling it from inside an open transaction would cause the commission record to be rolled back along with any outer transaction failure, which is exactly what must not happen.

### Step 3: Implement create_negative_commission_record

Define `create_negative_commission_record(return_id)`.

Import `Return` and `User` lazily inside the function body to avoid circular imports: `from backend.apps.pos.models import Return`. `from django.contrib.auth import get_user_model; User = get_user_model()`.

Steps:
1. Fetch `return_obj = Return.objects.select_related('sale').get(id=return_id)`.
2. If `return_obj.sale.salesperson_id` is `None`, return `None` — no salesperson assigned to the originating sale means no commission to reverse.
3. Fetch `salesperson = User.objects.filter(id=return_obj.sale.salesperson_id).values('commission_rate').first()`.
4. If `salesperson is None or salesperson['commission_rate'] is None`, return `None`.
5. `commission_rate = salesperson['commission_rate']`.
6. Compute: `negative_base = -return_obj.refund_amount`. `negative_earned = (negative_base * commission_rate / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.
7. Create: `CommissionRecord.objects.create(tenant_id=return_obj.tenant_id, sale_id=return_obj.sale_id, user_id=return_obj.sale.salesperson_id, base_amount=negative_base, commission_rate=commission_rate, earned_amount=negative_earned, is_paid=False)`.
8. Return the created record.

Note: Negative records have `earned_amount < 0`. They offset the positive record from the original sale but do not delete it. The audit trail preserves both the original earning and the reversal. A salesperson's true unpaid balance for a period is the sum of all positive and negative records where `is_paid=False`.

### Step 4: Implement get_commissions_for_user

Define `get_commissions_for_user(tenant_id, user_id, page=1, page_size=20)`.

1. Build base queryset: `qs = CommissionRecord.objects.filter(tenant_id=tenant_id, user_id=user_id).select_related('sale').order_by('-created_at')`.
2. Compute total count: `total_count = qs.count()`.
3. Compute total pages: `total_pages = math.ceil(total_count / page_size)` (use `math.ceil` from the standard library, not float division).
4. Slice: `offset = (page - 1) * page_size`. `records = list(qs[offset:offset + page_size])`.
5. For each record, annotate an additional Python attribute `is_credit = record.earned_amount >= Decimal('0')` (True for positive/zero, False for negative). This label is used by the frontend to show "Credit" or "Debit" in the type column.
6. Return a plain dict: `{ 'records': records, 'total_count': total_count, 'total_pages': total_pages, 'page': page, 'page_size': page_size }`.

### Step 5: Implement get_unpaid_total

Define `get_unpaid_total(tenant_id, user_id)`.

Query: `result = CommissionRecord.objects.filter(tenant_id=tenant_id, user_id=user_id, is_paid=False).aggregate(total=Sum('earned_amount'), count=Count('id'))`.

Return: `{ 'total': result['total'] if result['total'] is not None else Decimal('0.00'), 'count': result['count'] }`.

Never return `None` for the `total` — the caller always expects a `Decimal`. The `Count` aggregation returns 0 (not None) even when there are no matching rows, so `count` needs no null-guard. The `Sum` aggregation returns `None` when there are no rows — hence the explicit null guard.

### Step 6: Implement create_commission_payout

Define `create_commission_payout(tenant_id, user_id, period_start, period_end, authorized_by_id)`.

All database operations are wrapped in `with transaction.atomic():`.

Inside the transaction:
1. `records = list(CommissionRecord.objects.filter(tenant_id=tenant_id, user_id=user_id, is_paid=False, created_at__gte=period_start, created_at__lte=period_end).select_for_update())`. The `select_for_update()` call acquires row-level locks to prevent a race condition where two concurrent payout requests for the same user and period both succeed.
2. If `len(records) == 0`: raise `ValueError("No unpaid commission records found for the specified period.")`. This is caught by the DRF view and returned as a 400 response.
3. `total_earned = sum((r.earned_amount for r in records), Decimal('0'))`. Use `sum()` with a `Decimal('0')` start value to ensure Decimal arithmetic throughout — never use `float()`.
4. `payout = CommissionPayout.objects.create(tenant_id=tenant_id, user_id=user_id, period_start=period_start, period_end=period_end, total_earned=total_earned, authorized_by_id=authorized_by_id)`.
5. `record_ids = [r.id for r in records]`. `CommissionRecord.objects.filter(id__in=record_ids).update(is_paid=True, commission_payout=payout)`.
6. Return `payout`.

The `select_for_update()` and `update()` within the same `transaction.atomic()` block ensure that the read-lock-compute-write cycle is atomic under concurrent access.

### Step 7: Implement get_commission_summary_for_tenant

Define `get_commission_summary_for_tenant(tenant_id, period_start, period_end)`.

This function is used by the Commission Reports page to display a per-staff summary.

Step A — annotated aggregation: `from django.db.models import Count`. Query:
`records_qs = CommissionRecord.objects.filter(tenant_id=tenant_id, created_at__gte=period_start, created_at__lte=period_end).values('user_id').annotate(total_earned=Sum('earned_amount'), unpaid_total=Sum('earned_amount', filter=Q(is_paid=False)), unpaid_count=Count('id', filter=Q(is_paid=False)))`.

Step B — enrich with user names: `user_ids = [r['user_id'] for r in records_qs]`. `from django.contrib.auth import get_user_model; User = get_user_model()`. `users = {u.id: u for u in User.objects.filter(id__in=user_ids).only('id', 'name', 'role')}`.

Step C — merge and sort: for each entry in `records_qs`, look up `users[entry['user_id']]` and add `user_name`, `user_role` to the dict. Sort the merged list by `total_earned` descending.

Step D — null-guard: for each merged record, replace any `None` values from the aggregation with `Decimal('0.00')`.

Return the merged list.

### Step 8: Integrate with the Sale DRF View

Open `backend/apps/pos/views/sale_views.py`. Locate the `post` method of the `CreateSaleView` (or however the sale completion endpoint is structured).

Before the `transaction.atomic()` block begins, query the salesperson's commission rate if a `salesperson_id` is provided in the validated data:

`commission_rate = None`
`salesperson_id = validated_data.get('salesperson_id')`
`if salesperson_id: salesperson = User.objects.filter(id=salesperson_id).values('commission_rate').first(); commission_rate = salesperson['commission_rate'] if salesperson else None`

This pre-fetch is intentional — reading the user's commission rate outside the transaction means that if the commission lookup fails (e.g., user deleted mid-request), it fails before the sale is created, not after.

After the `transaction.atomic():` block exits cleanly (sale committed to the database): add a `try/except Exception as e:` block. Inside: `if salesperson_id and commission_rate is not None: create_commission_record(tenant_id=sale.tenant_id, sale_id=sale.id, user_id=salesperson_id, base_amount=sale.total_amount, commission_rate=commission_rate)`. In the `except` block: `logger.warning("Commission record creation failed for sale %s: %s", sale.id, str(e))`. Do NOT re-raise.

Import `create_commission_record` from `backend.apps.hr.services.commission_service` at the top of `sale_views.py`.

### Step 9: Integrate with the Return DRF View

Open `backend/apps/pos/views/return_views.py`. Locate the return completion method.

After the `transaction.atomic():` block commits the return:

Add: `try: create_negative_commission_record(return_obj.id) except Exception as e: logger.warning("Commission reversal failed for return %s: %s", return_obj.id, str(e))`.

Import `create_negative_commission_record` from `backend.apps.hr.services.commission_service`.

The commission reversal must never block the return from completing. A failed commission reversal is a recoverable data inconsistency that can be corrected by a manager manually — far preferable to a return that the system refuses to process.

---

## Expected Output

- `backend/apps/hr/services/commission_service.py` exporting six functions: `create_commission_record`, `create_negative_commission_record`, `get_commissions_for_user`, `get_unpaid_total`, `create_commission_payout`, `get_commission_summary_for_tenant`.
- `backend/apps/pos/views/sale_views.py` updated with commission side-effect logic.
- `backend/apps/pos/views/return_views.py` updated with commission reversal side-effect logic.

---

## Validation

- Django shell: complete a mock sale by calling `create_commission_record(tenant_id, sale_id, user_id, Decimal('500.00'), Decimal('5.00'))` — confirm a `CommissionRecord` with `earned_amount = Decimal('25.00')` is created.
- Call `create_commission_record(...)` with `commission_rate=None` — confirm return value is `None` and no record is created.
- Call `create_commission_record(...)` with `commission_rate=Decimal('150.00')` — confirm `ValueError` is raised.
- Call `get_unpaid_total(tenant_id, user_id)` when no records exist — confirm `{'total': Decimal('0.00'), 'count': 0}` is returned (not `None`).
- Call `create_commission_payout(tenant_id, user_id, period_start, period_end, authorized_by_id)` — confirm all matching `CommissionRecord` rows have `is_paid=True` and `commission_payout` set.
- Call `create_commission_payout` again for the same period — confirm `ValueError("No unpaid commission records found")` is raised.
- Simulated sale completion via the DRF view endpoint: `CommissionRecord` created. Simulated failure during commission record creation (mock the function to raise): confirm the sale is still returned successfully (no 500 error on the sale response).
- Simulated return via DRF: negative `CommissionRecord` created. `get_unpaid_total` returns the net of positive and negative records.

---

## Notes

Never use `float` for any monetary computation in this service. Python floating-point arithmetic introduces rounding errors that compound over many commission records. The test: `float(0.1) + float(0.2) != 0.3` illustrates why — even a single multiplication with a `float` can produce an off-by-one cent result that silently accumulates.

The `sum()` built-in with a `Decimal('0')` start value is the safe way to sum a Python list of `Decimal` objects. Using `sum(records)` without the start value would use an integer 0 as the initial accumulator, which causes `Decimal + int` to work correctly in Python but is a fragile pattern that can break if the list is unexpectedly empty (returning integer 0, not `Decimal('0.00')`).

The `select_for_update()` in `create_commission_payout` prevents double-payout under concurrent API requests. Without it, two simultaneous requests for the same user and period could both read the same unpaid records, both create payout records, and both mark the records as paid — resulting in duplicate payout records. The row-level lock ensures only one request completes; the second will wait for the lock and then find no unpaid records, raising `ValueError`.
