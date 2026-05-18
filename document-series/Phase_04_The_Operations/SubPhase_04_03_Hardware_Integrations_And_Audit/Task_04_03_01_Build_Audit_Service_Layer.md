# Task 04.03.01 — Build Audit Service Layer

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.01 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | `AuditLog` model from SubPhase 01.02 (already in `backend/apps/audit/models.py`), all domain DRF views and service files |
| Produces | `backend/apps/audit/services/audit_service.py`, `backend/apps/audit/views/audit_log_views.py`, updated service/views files across 9 modules |
| Blocked By | `AuditLog` model migration complete |

---

## Objective

Every mutation in LankaCommerce that touches money, inventory, customer balances, staff permissions, inventory, or system configuration must leave a permanent audit trail. The centralized audit service provides a single fire-and-forget entry point that all domain service files call as a non-blocking side effect. Because the audit write must never block or roll back the parent transaction, every call is wrapped in a `try/except Exception:` that logs a warning and continues.

The resulting `AuditLog` records give owners and managers a complete traceable history of who changed what and when, with optional before/after snapshots for seeing exactly what changed. The audit log viewer built in Task 04.03.02 consumes this data to render filterable paginated tables with colour-coded entity type badges and a before/after diff modal.

---

## Instructions

### Step 1: Define AUDIT_ACTIONS Canonical Constants

Create `backend/apps/audit/services/audit_service.py`.

At the top level of the module define `AUDIT_ACTIONS` as a dictionary of canonical string constants:

- `SALE_COMPLETED` = `"sale.completed"`
- `SALE_VOIDED` = `"sale.voided"`
- `RETURN_COMPLETED` = `"return.completed"`
- `CUSTOMER_CREDIT_ADJUSTED` = `"customer.credit_adjusted"`
- `PO_STATUS_CHANGED` = `"purchase_order.status_changed"`
- `STAFF_ROLE_CHANGED` = `"staff.role_changed"`
- `STAFF_PIN_CHANGED` = `"staff.pin_changed"`
- `STAFF_PERMISSION_CHANGED` = `"staff.permission_changed"`
- `PROMOTION_CREATED` = `"promotion.created"`
- `PROMOTION_UPDATED` = `"promotion.updated"`
- `PROMOTION_ARCHIVED` = `"promotion.archived"`
- `STOCK_ADJUSTED` = `"stock.adjusted"`
- `EXPENSE_CREATED` = `"expense.created"`
- `EXPENSE_DELETED` = `"expense.deleted"`
- `SHIFT_CLOSED` = `"shift.closed"`
- `SETTINGS_CHANGED` = `"settings.changed"`

Using canonical dotted-string constants prevents typos across the codebase. Any module that needs the audit service imports `AUDIT_ACTIONS` and references e.g. `AUDIT_ACTIONS['SALE_COMPLETED']` rather than using a raw string.

### Step 2: Implement create_audit_log

In the same file define:

```
def create_audit_log(
    tenant_id,
    user_id,
    action,
\_type,
    entity_id,
    previous_values=None,
    new_values=None,
    ip_address=None,
    user_agent=None
):
```

The function body calls `AuditLog.objects.create(...)` passing all arguments directly. Django's `JSONField` accepts Python dicts for `previous_values` and `new_values` without any JSON serialization step.

Add Python type hints for all parameters. Add a docstring describing each parameter and the return type (`AuditLog`).

The function must never raise an exception — it is the caller's responsibility to wrap in a try/except (see Step 6).directly return the created `AuditLog` instance.

### Step 3: Implement get_audit_logs

Define:

```
def get_audit_logs(
    tenant_id,
    entity_type=None,
    start_date=None,
    end_date=None,
    user_id=None,
    page=1,
    page_size=50
\_>
```

Build the queryset using a filter chain:

1. Start with `AuditLog.objects.filter(tenant_id=tenant_id)`.
2. If `entity_type` is not None: `.filter(entity_type=entity_type)`.
3. If `start_date` is not None: ``.filter(created_at__gte=start_date)`.
4. If `end_date` is not None: `.filter(created_at__lte=end_date)`.
5. If `user_id` is not None: `.filter(user_id=user_id)`.
6. Always order by `.order_by('-created_at')`.
7. Use `.select_related('user').only('user__id', 'user__name', 'user__email')` to minimize database queries.

Run a separate count query with the same filters using `.count()`.

Apply pagination using Python slicing: `offset = (page - 1) * page_size`; `results = list(qs[offset:offset + page_size])`.

Return the response envelope:

```
{
    "success": True,
    "data": {
        "results": results,
\_l": total,
        "page": page,
        "page_size": page_size
    }
}
```

Note that `results` will contain `AuditLog` model instances with a lazy `user` relation. You may need to serialize them. Consider returning `AuditLog.objects.values()` or a simple dict comprehension in the results list.

### Step 4: Build the Audit Log DRF View

Create `backend/apps/audit/views/audit_log_views.py`.

Define `AuditLogListView` extending `APIView`:

- Authentication classes: `JWTAuthentication`
- Permission classes: `HasTenantPermission`
- Enforce MANAGER or OWNER role: `if user.role not in ['MANAGER', 'OWNER']: return Response({"success": False, "error": {"code": "FORBIDDEN", "message": "Only managers and owners can view audit logs."}}, status=403)`
- Implement `get(self, request)`:
  - Parse query params: `entity_type` (str, optional), `start_date` (ISO date, optional), `end_date` (ISO date, optional), `user_id` (UUID, optional), `page` (int, default 1), `page_size` (int, default 50, max 100).
  - Call `get_audit_logs(tenant_id=user.tenant_id, ...)`.
  - Return the response envelope as JSON.

Map to `GET /api/audit/logs/` in `backend/apps/audit/urls.py` (create this file if it does not exist).

### Step 5: Wire Audit Log Side Effects — Sale Views

In `backend/apps/pos/views/sale_views.py`:

- Import `create_audit_log` from `backend.apps.audit.services.audit_service` and `AUDIT_ACTIONS`.
- After the sale completion transaction commits: wrap `create_audit_log(...)` in `try/except Exception:`. Use `entity_type="sale"` and `entity_id=str(sale.id)`. Include `new_values={'total': str(sale.total)}` as new_values for context.
- After a sale is voided: same pattern with `AUDIT_ACTIONS['SALE_VOIDED']`, including `new_values={'voided_at': now.isoformat()}`.

The fire-and-forget pattern explicitly:

```
try:
    create_audit_log(
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        action=AUDIT_ACTIONS['SALE_COMPLETED'],
        entity_type="sale",
        entity_id=str(sale.id),
        new_values={"total": str(sale.total), "payment_methodsale.payment_method},
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
    )
except Exception:
    logger.warning(f"Audit log failed for SALE_COMPLETED on sale {sale.id}", exc_info=True)
```

Note the logger: `import logging; logger = logging.getLogger(__name__)`.

### Step 6: Wire Audit Log Side Effects — Return Views

In `backend/apps/pos/views/return_views.py`:

- Same pattern the return completion. Use `AUDIT_ACTIONS['RETURN_COMPLETED']`, `entity_type="return"`, `entity_id=str(return.id)`. Include new_values with the refund amount and method.
- Fire-and-forget: wrap in try/except with logger warning.

### Step 7: Wire Audit Log Side Effects — Customer Views

In `backend/apps/crm/services/customer_service.py`:

- Before updating the customer's `credit_balance`, capture the current value: `previous_balance = customer.credit_balance`.
- After the update, call `create_audit_log` with `AUDIT_ACTIONS['CUSTOMER_CREDIT_ADJUSTED']`, `entity_type="customer"`, `entity_id=str(customer.id)`.
- Include `previous_values={'credit_balance': float(previous_balance)}` and `new_values={'credit_balance': float(customer.credit_balance)}`.
- Fire-and-forget.

### Step 8: Wire Remaining Service Files

Apply the same pattern across the following files. For each file, document the specific action, entity_type string, and values to include:

**`backend/apps/hr/views/staff_views.py`**:
- `STAFF_ROLE_CHANGED`: entity_type="staff", entity_id=str(staff.id), previous_values={'role': old_role}, new_values={'role': new_role}.
- `STAFF_PIN_CHANGED`: entity_type="staff", entity_id=str(staff.id), previous_values={'pin': '***'} (never log actual PINs), new_values={'pin': '***'}.
- `STAFF_PERMISSION_CHANGED`: entity_type="staff", entity_id=str(staff.id), previous_values={'permissions': old_perms}, new_values={'permissions': new_perms}.

**`backend/apps/promotions/services/promotion_service.py`**:
- `PROMOTION_CREATED`: entity_type="promotion", entity_id=str(promotion.id), new_values={'name': promotion.name, 'type': promotion.promo_type}.
- `PROMOTION_UPDATED`: entity_type="promotion", entity_id=str(promotion.id), previous_values={'name': old_name, 'discount': str(old_discount)}, new_values={'name': new_name, 'discount': str(new_discount)}.
- `PROMOTION_ARCHIVED`: entity_type="promotion", entity_id=str(promotion.id), new_values={'is_active': False}.

**`backend/apps/stock/services/stock_service.py`**:
- `STOCK_ADJUSTED`: entity_type="stock", entity_id=str(adjustment.id), previous_values={'quantity': old_qty}, new_values={'quantity': new_qty, 'reason': reason}.

**`backend/apps/pos/views/expense_views.py`**:
- `EXPENSE_CREATED`: entity_type="expense", entity_id=str(expense.id), new_values={'amount': str(expense.amount), 'category': expense.category}.
- `EXPENSE_DELETED`: entity_type="expense", entity_id=str(expense.id), previous_values={'amount': str(expense.amount), 'category': expense.category}.

**`backend/apps/pos/views/shift_views.py`**:
- `SHIFT_CLOSED`: entity_type="shift", entity_id=str(shift.id), new_values={'closed_at': now.isoformat(), 'expected_cash': str(shift.expected_cash), 'actual_cash': str(shift.actual_cash)}.

**`backend/apps/accounts/views/settings_views.py`**:
- `SETTINGS_CHANGED`: entity_type="settings", entity_id=str(tenant.id), previous_values={'settings': 'previous_config_summary'}, new_values={'settings': 'updated_config_summary'}.

For `PO_STATUS_CHANGED` (Purchase Orders): include `previous_values={'status': old_status}` and `new_values={'status': new_status}`.

---

## Expected Output

- `backend/apps/audit/services/audit_service.py` with `AUDIT_ACTIONS`, `create_audit_log`, and `get_audit_logs`.
- `backend/apps/audit/views/audit/audit_log_views.py` with `AuditLogListView` (GET only).
- `backend/apps/audit/urls.py` with the `/api/audit/logs/` route.
- Updated `backend/apps/pos/views/sale_views.py` — audit calls for SALE_COMPLETED and SALE_VOIDED.
- Updated `backend/apps/pos/views/return_views.py` — audit call for RETURN_COMPLETED.
- Updated `backend/apps/crm/services/customer_service.py` — audit call for CUSTOMER_CREDIT_ADJUSTED.
- Updated `backend/apps/hr/views/staff_views.py` — audit calls for STAFF_ROLE_CHANGED, STAFF_PIN_CHANGED, STAFF_PERMISSION_CHANGED.
- Updated `backend/apps/promotions/services/promotion_service.py` — audit calls for PROMOTION_CREATED, PROMOTION_UPDATED, PROMOTION_ARCHIVED.
- Updated `backend/apps/stock/services/stock_service.py` — audit call for STOCK_ADJUSTED.
- Updated `backend/apps/pos/views/expense_views.py` — audit calls for EXPENSE_CREATED, EXPENSE_DELETED.
- Updated `backend/apps/pos/views/shift_views.py` — audit call for SHIFT_CLOSED.
- Updated `backend/apps/accounts/views/settings_views.py` — audit call for SETTINGS_CHANGED.

---

## Validation

- Complete a sale: verify an `AuditLog` record is created with action `sale.completed` and the correct entity_id.
- Void a sale: verify an `AuditLog` record is created with action `sale.voided`.
- Complete a return: verify an `AuditLog` record is created with action `return.completed`.
- Adjust a customer's credit balance: verify the audit log shows `previous_values.credit_balance` and `new_values.credit_balance`.
- Change a staff member's role: verify the audit log captures the old and new roles.
- Simulate an audit write failure (mock `AuditLog.objects.create` to throw an exception): verify the parent transaction commits successfully and no error propagates to the caller.
- `GET /api/audit/logs/` with no authentication returns 401.
- `GET /api/audit/logs/` with a CASHIER role returns 403.
- `GET /api/audit/logs/` with a MANAGER role returns a paginated list of results scoped to the MANAGER's tenant.
- `GET /api/audit/logs/?entity_type=sale` returns only `Sale`-related audit entries.
- `GET /api/audit/logs/?start_date=2025-01-01&end_date=2025-01-31` returns only records within that date range.
- `GET /api/audit/logs/?user_id=<valid_uuid>` returns only records for that actor.
- Pagination: `page=1&page_size=10` returns at most 10 results and includes the `total` field.

---

## Notes

Keep `previous_values` and `new_values` lean — only include the fields that actually changed, not the full model serialization. For example, a `CUSTOMER_CREDIT_ADJUSTED` event should store only `{'credit_balance': old_value}` and `{'credit_balance': new_value}` rather than the entire customer object. This keeps the `AuditLog` table storage efficient and makes diffs human-readable.

The `ip_address` and `user_agent` parameters should be populated from the Django request headers at the view layer (`request.META.get('REMOTE_ADDR')` and `request.META.get('HTTP_USER_AGENT')`). Service-to-service calls (e.g., from background tasks or cron jobs) should pass `None` for these values. For background cron jobs that are not triggered by any user, use the sentinel value `user_id = "SYSTEM"`.

URL patterns must be ordered correctly: the audit log view URL must be defined before any catch-all URL patterns in the backend URL configuration. If using a router, register the `AuditLogListView` explicitly rather than relying on a `DefaultRouter`, which may not play well with non-model viewsets.

Never log raw PIN codes or passwords in the audit trail. For `STAFF_PIN_CHANGED`, always store the sentinel value `'***'` instead of the actual PIN.
