# Task 04.01.02 — Build Customer Service Layer

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.02 |
| Complexity | High |
| Dependencies | 04.01.01 |
| Produces | `backend/apps/crm/services/customer_service.py` |

---

## Objective

Create the complete server-side service layer for Customer operations — the single source of truth for all customer data mutations and queries used by both the dashboard management pages and the POS terminal. The transactional functions `redeem_credit` and `add_to_spend_total` are composable inside the sale view's `transaction.atomic()` block.

---

## Instructions

### Step 1: Create the File and Define Imports

Create `backend/apps/crm/services/customer_service.py`. Add the following imports:

- `Decimal` from Python's standard `decimal` module
- `ceil` from Python's standard `math` module
- `Q` and `F` from `django.db.models`
- `Count` from `django.db.models`
- `transaction` from `django.db`
- `timezone` from `django.utils`
- `Customer` from `backend.apps.crm.models`

### Step 2: Implement create_customer

Function signature: `create_customer(tenant_id, data: dict) -> Customer`.

Before inserting, call `Customer.objects.filter(tenant_id=tenant_id, phone=data['phone'].strip(), deleted_at__isnull=True).exists()`. If `True`, raise `ValueError("A customer with this phone number already exists")`. If no conflict, call `Customer.objects.create(tenant_id=tenant_id, **filtered_data)` where `filtered_data` contains only the allowed writable fields (`name`, `phone`, `email`, `gender`, `birthday`, `tags`, `notes`). Return the created record.

### Step 3: Implement update_customer

Function signature: `update_customer(tenant_id, customer_id, data: dict) -> Customer`.

First call `_assert_customer_belongs_to_tenant(tenant_id, customer_id)` (private helper defined in Step 10). If `phone` is present in `data` and is being changed, run the duplicate check excluding the current customer:

`Customer.objects.filter(tenant_id=tenant_id, phone=data['phone'].strip(), deleted_at__isnull=True).exclude(id=customer_id).exists()`

If the above returns `True`, raise `ValueError("A customer with this phone number already exists")`.

Call `Customer.objects.filter(id=customer_id).update(**data)`. Return the refreshed customer from `Customer.objects.get(id=customer_id)`.

### Step 4: Implement get_customer_by_id

Function signature: `get_customer_by_id(tenant_id, customer_id) -> dict`.

Fetch with:

`Customer.objects.select_related('tenant').prefetch_related('sales__sale_lines', 'sales__payments').get(id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True)`

If `Customer.DoesNotExist` is raised, re-raise it — the view layer maps this to a 404 response.

Compute `visit_count` as a separate count query: `customer.sales.filter(status='COMPLETED').count()`. This avoids inflating the count from prefetched data.

Compute `avg_order_value` as:

`customer.total_spend / Decimal(visit_count)` guarded against division by zero — return `Decimal('0.00')` when `visit_count == 0`.

Return the customer instance augmented with `visit_count` and `avg_order_value` as attributes set on the object, or packaged in a dict per the serializer contract.

### Step 5: Implement get_customers

Function signature: `get_customers(tenant_id, search=None, tag=None, spend_min=None, spend_max=None, page=1, limit=20) -> dict`.

Cap `limit` at 100: `limit = min(limit, 100)`. Compute `offset = (page - 1) * limit`.

Build a base queryset: `Customer.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)`.

Apply filters conditionally:

- `search`: `.filter(Q(name__icontains=search.strip()) | Q(phone__icontains=search.strip()))`
- `tag`: `.filter(tags__contains=[tag])` — PostgreSQL array contains operator
- `spend_min`: `.filter(total_spend__gte=Decimal(str(spend_min)))`
- `spend_max`: `.filter(total_spend__lte=Decimal(str(spend_max)))`

Execute `.count()` first, then `.order_by('-created_at')[offset:offset + limit]` for the page slice.

Return:

`{ 'customers': list(queryset), 'total': total, 'page': page, 'total_pages': ceil(total / limit) if total > 0 else 1 }`

### Step 6: Implement soft_delete_customer

Function signature: `soft_delete_customer(tenant_id, customer_id) -> Customer`.

Call `_assert_customer_belongs_to_tenant(tenant_id, customer_id)`. Then:

`Customer.objects.filter(id=customer_id).update(deleted_at=timezone.now(), is_active=False)`

Return the refreshed record from `Customer.objects.get(id=customer_id)`.

Historical sale data is preserved because `Sale.customer` is a nullable FK that is not cascade-deleted — existing sale records keep their `customer_id` reference intact even after soft deletion.

### Step 7: Implement apply_credit_to_cart

Function signature: `apply_credit_to_cart(tenant_id, customer_id, requested_amount: Decimal) -> dict`.

This is a read-only pre-flight validation — no database writes occur.

Fetch the customer: `Customer.objects.get(id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True)`. If `DoesNotExist`, raise it for the view to map to 404.

Read `credit_balance = customer.credit_balance`.

If `credit_balance <= Decimal('0.00')`:

Return `{ 'valid_amount': Decimal('0.00'), 'current_balance': credit_balance }`.

Otherwise:

Return `{ 'valid_amount': min(requested_amount, credit_balance), 'current_balance': credit_balance }`.

### Step 8: Implement redeem_credit

Function signature: `redeem_credit(tenant_id, customer_id, amount: Decimal) -> Customer`.

This function is intended to be called from within an enclosing `transaction.atomic()` block in the sale view.

Guard: if `amount <= Decimal('0.00')`, raise `ValueError("Credit redemption amount must be positive")`.

Execute the atomic decrement using Django's `F()` expression — never a read-then-write pattern:

`Customer.objects.filter(id=customer_id, tenant_id=tenant_id).update(credit_balance=F('credit_balance') - amount)`

Return the refreshed customer from `Customer.objects.get(id=customer_id)`.

### Step 9: Implement add_to_spend_total

Function signature: `add_to_spend_total(tenant_id, customer_id, amount: Decimal) -> None`.

This is a write-and-ignore operation designed to be composable inside `transaction.atomic()`.

Execute:

`Customer.objects.filter(id=customer_id, tenant_id=tenant_id).update(total_spend=F('total_spend') + amount)`

The spend increment is the gross sale total before any credit offset, consistent with the semantics of `total_spend` as the cumulative value of goods transacted by the customer.

### Step 10: Private Helper _assert_customer_belongs_to_tenant

Define as a module-level private function: `_assert_customer_belongs_to_tenant(tenant_id, customer_id)`.

Execute:

`Customer.objects.filter(id=customer_id, tenant_id=tenant_id, deleted_at__isnull=True).exists()`

If `False`, raise `Customer.DoesNotExist`. This prevents cross-tenant data access without requiring a full fetch of the customer record.

---

## Expected Output

`backend/apps/crm/services/customer_service.py` exporting nine callable functions: `create_customer`, `update_customer`, `get_customer_by_id`, `get_customers`, `soft_delete_customer`, `apply_credit_to_cart`, `redeem_credit`, `add_to_spend_total`, and the private `_assert_customer_belongs_to_tenant`.

---

## Validation

- `create_customer` called with a duplicate phone (same tenant, not soft-deleted) raises `ValueError` with the expected message.
- `get_customers` with a `search` string "Ama" filters by both `name__icontains` and `phone__icontains` via OR logic — a customer matching only on phone is returned.
- `apply_credit_to_cart` returns `{ 'valid_amount': Decimal('0.00'), 'current_balance': ... }` for a customer with zero or negative `credit_balance`.
- `apply_credit_to_cart` returns `valid_amount = min(requested, balance)` when balance is positive.
- `redeem_credit` uses an `F('credit_balance') - amount` update expression — inspect the generated SQL to confirm a single `UPDATE ... SET credit_balance = credit_balance - N` with no preceding `SELECT`.
- `add_to_spend_total` uses `F('total_spend') + amount` similarly.
- `soft_delete_customer` sets `deleted_at` to a non-null timestamp and `is_active=False`; `get_customers` no longer returns the record.

---

## Notes

- Trim all string filter inputs with `.strip()` before passing to `__icontains` to prevent accidental leading/trailing whitespace from breaking search results.
- `add_to_spend_total` does not check tenant ownership via `_assert_customer_belongs_to_tenant` because it is always called from the sale pipeline where ownership is already validated before the atomic block begins.
- All monetary comparisons and arithmetic use `Decimal` — never `float`. Cast incoming numeric strings to `Decimal(str(value))` rather than `Decimal(float(value))` to avoid floating-point rounding artefacts.
- The `apply_credit_to_cart` pre-flight is called outside `transaction.atomic()` to avoid holding a lock on the customer row during slow operations like cart price calculations. The actual `redeem_credit` inside the atomic block uses a fresh `F()` update to reflect the true balance at commit time.
