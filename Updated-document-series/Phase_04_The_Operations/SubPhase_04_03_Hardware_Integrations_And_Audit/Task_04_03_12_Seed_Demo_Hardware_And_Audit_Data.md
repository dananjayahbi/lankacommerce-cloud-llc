# Task 04.03.12 — Seed Demo Hardware and Audit Data

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.12 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Low |
| Estimated Effort | 0.5 days |
| Dependencies | All prior SubPhase 04.03 tasks (CFD, birthday automation, broadcast, promotions, cash movements), Task 04.02.12 (Demo Staff and Promotions tenant) |
| Produces | `backend/apps/audit/management/commands/seed_demo_hardware_audit.py` |
| Blocked By | Task 04.02.12 (must have a demo tenant with staff and promotions seeded first) |

---

## Objective

A demo environment is only valuable if it contains realistic data that the evaluator can interact with immediately. This management command seeds hardware configuration, audit log entries, cash movements, and customer birthday data — all wired to the existing demo tenant — so that every feature built in SubPhase 04.03 has pre-populated data to display from the moment the backend starts. The CFD endpoint has registered subscribers to broadcast to, the Z-Report has cash movement records to show, the birthday cron has at least one customer to send a message to, and the audit log has 10 entries spanning 14 days of simulated activity.

Idempotency is the core design principle: running the command multiple times must never duplicate data. The first guard checks for existing `AuditLog` entries for the demo tenant — if any exist, the command exits early with a message. All subsequent creation steps use the same guard pattern. This allows the seed command to be safely included in CI/CD pipelines and Docker entrypoint scripts.

---

## Instructions

### Step 1: Create the Management Command File

Create the directory structure if it does not exist: `backend/apps/audit/management/commands/`. Ensure an `__init__.py` exists in each directory.

Create `backend/apps/audit/management/commands/seed_demo_hardware_audit.py`.

```python
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.core.models import Tenant
from apps.crm.models import Customer
from apps.pos.models import CashMovement, Shift

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seeds demo hardware config, audit logs, cash movements, and birthday data."

    def handle(self, *args, **options):
        # Step 2: Idempotency guard
        # Steps 3-6 follow...
```

### Step 2: Implement the Idempotency Guard

At the start of `handle()`:

```python
try:
    demo_tenant = Tenant.objects.get(slug='demo')
except Tenant.DoesNotExist:
    self.stdout.write(self.style.ERROR("Demo tenant (slug='demo') not found. Run seed_demo_staff_promotions first."))
    return

# Idempotency guard: check if audit logs already seeded for this tenant
existing_logs = AuditLog.objects.filter(tenant=demo_tenant)
if existing_logs.exists():
    self.stdout.write(
        self.style.WARNING(
            f"AuditLog entries already exist for tenant '{demo_tenant.slug}' ({existing_logs.count()} records). Skipping seed."
        )
    )
    return
```

This guard ensures that re-running the command does not produce duplicate audit log entries. If audit logs exist, the command exits immediately without modifying any data.

### Step 3: Seed Hardware Configuration

Read the current `demo_tenant.settings` JSON field, merge the hardware sub-object, and update in-place:

```python
settings = dict(demo_tenant.settings or {})
settings['hardware'] = {
    'printer_type': 'NETWORK',
    'host': '192.168.1.100',
    'port': 9100,
    'cash_drawer_enabled': True,
    'cfd_enabled': True,
    'paper_width': '80mm',
}
demo_tenant.settings = settings
demo_tenant.save(update_fields=['settings'])
self.stdout.write(self.style.SUCCESS("Updated hardware configuration for demo tenant."))
```

Preserve any existing settings keys (like `whatsapp`, `store_name`) that may have been set by previous seed commands. The `settings = dict(demo_tenant.settings or {})` pattern reads the current dict and adds/overwrites only the `hardware` key.

### Step 4: Seed AuditLog Entries

Create 10 `AuditLog` records spanning the last 14 days. Use `AuditLog.objects.bulk_create()` for efficiency.

First, determine a start timestamp:

```python
now = timezone.now()
fourteen_days_ago = now - timedelta(days=14)
```

Define the 10 entries as a list of `AuditLog` instances. Spread them evenly across the 14-day window:

```python
audit_logs = [
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='SALE_COMPLETED',
        entity_type='Sale',
        entity_id=1001,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(hours=2),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='SALE_VOIDED',
        entity_type='Sale',
        entity_id=1002,
        previous_values={'status': 'COMPLETED'},
        new_values={'status': 'VOIDED'},
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=1, hours=5),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='RETURN_COMPLETED',
        entity_type='Return',
        entity_id=2001,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=2, hours=10),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=2,
        action='RETURN_COMPLETED',
        entity_type='Return',
        entity_id=2002,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=3, hours=14),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='CUSTOMER_CREDIT_ADJUSTED',
        entity_type='Customer',
        entity_id=3001,
        previous_values={'credit_balance': 0},
        new_values={'credit_balance': 50},
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=4, hours=9),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=2,
        action='STAFF_ROLE_CHANGED',
        entity_type='User',
        entity_id=3,
        previous_values={'role': 'CASHIER'},
        new_values={'role': 'MANAGER'},
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=6, hours=11),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='PROMOTION_CREATED',
        entity_type='Promotion',
        entity_id=4001,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=8, hours=15),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='STOCK_ADJUSTED',
        entity_type='StockMovement',
        entity_id=5001,
        previous_values={'quantity': 10},
        new_values={'quantity': 8},
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=10, hours=16),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=2,
        action='EXPENSE_CREATED',
        entity_type='Expense',
        entity_id=6001,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=12, hours=8),
    ),
    AuditLog(
        tenant=demo_tenant,
        user_id=1,
        action='SHIFT_CLOSED',
        entity_type='Shift',
        entity_id=7001,
        ip_address='127.0.0.1',
        user_agent='LankaCommerce/Seed',
        created_at=fourteen_days_ago + timedelta(days=13, hours=22),
    ),
]
```

Call:

```python
AuditLog.objects.bulk_create(audit_logs)
audit_count = len(audit_logs)
```

**Important**: Review the `AuditLog` model definition in `backend/apps/audit/models.py` before writing this code. If the model has required fields not listed here (e.g., `description`, `tenant_name`), add them with sensible defaults.

### Step 5: Check the Demo Shift and Seed CashMovement Records

Find the demo shift:

```python
demo_shift = Shift.objects.filter(tenant=demo_tenant).first()
if not demo_shift:
    self.stdout.write(self.style.WARNING("No shifts found for demo tenant. Skipping cash movements."))
    cash_count = 0
else:
    existing_movements = CashMovement.objects.filter(shift=demo_shift)
    if existing_movements.exists():
        self.stdout.write(self.style.WARNING("Cash movements already exist for demo shift. Skipping."))
        cash_count = existing_movements.count()
    else:
        cash_movements = CashMovement.objects.bulk_create([
            CashMovement(
                shift=demo_shift,
                tenant=demo_tenant,
                type='PETTY_CASH_OUT',
                amount=Decimal('15.00'),
                reason='Bought paper cups and straws',
                user_id=1,
            ),
            CashMovement(
                shift=demo_shift,
                tenant=demo_tenant,
                type='MANUAL_IN',
                amount=Decimal('100.00'),
                reason='Cash float top-up from safe',
                user_id=1,
            ),
        ])
        cash_count = len(cash_movements)
        self.stdout.write(self.style.SUCCESS(f"Created {cash_count} CashMovement records."))
```

### Step 6: Seed Customer Birthday Data

```python
demo_customers = Customer.objects.filter(tenant=demo_tenant, deleted_at__isnull=True)
customer_count = demo_customers.count()

# Reset last_birthday_message_sent_year to None for all demo customers
updated_count = demo_customers.update(last_birthday_message_sent_year=None)

# Set one customer's birthday to today
first_customer = demo_customers.first()
if first_customer:
    today = date.today()
    first_customer.birthday = date(2000, today.month, today.day)  # Year 2000 is arbitrary
    first_customer.last_birthday_message_sent_year = None
    first_customer.save(update_fields=['birthday', 'last_birthday_message_sent_year'])
    self.stdout.write(self.style.SUCCESS(f"Set customer '{first_customer.name}' birthday to today ({today.isoformat()})."))
```

This ensures that at least one customer matches the birthday cron query on the day the seed is run.

### Step 7: Log the Summary

```python
self.stdout.write(self.style.SUCCESS(
    f"Seeded {audit_count} AuditLog entries, {cash_count} CashMovement records, "
    f"updated hardware config, and reset birthday fields for {customer_count} customers."
))

logger.info(
    "Seed demo hardware audit complete: %d AuditLog, %d CashMovement, %d customers reset.",
    audit_count, cash_count, customer_count,
)
```

---

## Expected Output

- `backend/apps/audit/management/commands/seed_demo_hardware_audit.py` — idempotent Django management command.

---

## Validation

- **Idempotency — first run**: Run `poetry run python manage.py seed_demo_hardware_audit`. The output shows "Created 10 AuditLog entries." and "Created 2 CashMovement records."
- **Idempotency — second run**: Run the command again. The output shows "AuditLog entries already exist... Skipping seed." No duplicate records.
- **Hardware config**: Check the demo tenant's settings via Django shell. `tenant.settings['hardware']` contains all six keys.
- **AuditLog entries**: `AuditLog.objects.filter(tenant__slug='demo').count()` returns 10. The `created_at` timestamps span the last 14 days.
- **Cash movements**: `CashMovement.objects.filter(shift__tenant__slug='demo').count()` returns 2. One `PETTY_CASH_OUT` of Rs. 15.00, one `MANUAL_IN` of Rs. 100.00.
- **Customer birthdays**: At least 1 customer has `birthday` month and day matching today. `last_birthday_message_sent_year` is `None` for all customers.
- **Birthday cron test**: After seeding, immediately run the birthday cron endpoint. At least one customer matches.
- **Orphaned tenant guard**: Temporarily delete the demo tenant. Run the seed. It exits early with "Demo tenant not found."
- **Missing shift guard**: If no shifts exist for the demo tenant, the cash movement section skips with a warning.

---

## Notes

The 10 AuditLog entries cover every entity type used in the LankaCommerce audit system: Sale, Return, Customer, User, Promotion, StockMovement, Expense, and Shift. This ensures that the audit log views in later subphases (reporting and analytics) have representative data to display. The two-week time spread simulates organic growth rather than a single massive batch insertion, which makes timeline-based visualisations in the audit dashboard look realistic.

The `timedelta(hours=...)` approach for `created_at` timestamps uses a non-uniform distribution — entries are clustered during business hours (8 AM to 10 PM) rather than evenly across the 24-hour cycle. This mimics real retail operation patterns where most activity occurs between 10 AM and 8 PM. The `AuditLog` model must have `created_at` as an `auto_now_add=False` `DateTimeField` that accepts explicit values — if the current model uses `auto_now_add=True`, you will need to add a separate migration to allow explicit `created_at` assignment using `default=timezone.now` instead.

The `CashMovement` records reference an existing shift in the demo tenant. If the shift seed command that creates demo shifts (Phase 03) has not been run, the cash movement section gracefully skips without crashing the entire seed. This defensive pattern — skipping sections when their dependencies are missing — is intentional: it allows seeding hardware and audit data independently of shift data.

## Objective

Idempotent Django management command seeding hardware configuration, 10 AuditLog entries, 2 CashMovement records, and customer birthday data.

## Instructions

### Step 1: Idempotency Guard

At the start of the command, check whether demo data already exists by querying `AuditLog.objects.filter(tenant=demo_tenant).exists()`. If records are found, skip the seeding and output a message indicating data already exists.

### Step 2: Hardware Configuration

Update the demo Tenant's `settings.hardware` JSON field with:

- `printer_type`: "NETWORK"
- `host`: "192.168.1.100"
- `port`: 9100
- `cash_drawer_enabled`: True
- `cfd_enabled`: True
- `paper_width`: "80mm"

Read the current settings, merge the hardware sub-object, and update in-place, preserving any other settings that may exist.

### Step 3: AuditLog Entries

Create 10 `AuditLog` records using `AuditLog.objects.bulk_create([...])` with this distribution:

- 2 Sale entries: `SALE_COMPLETED` and `SALE_VOIDED`, both with `entity_type` set to "Sale".
- 2 Return entries: `RETURN_COMPLETED`, both with `entity_type` set to "Return".
- 1 Customer credit adjustment: `CUSTOMER_CREDIT_ADJUSTED` with `previous_values={"credit_balance": 0}` and `new_values={"credit_balance": 50}`, `entity_type` set to "Customer".
- 1 Staff role change: `STAFF_ROLE_CHANGED` with `entity_type` set to "User".
- 1 Promotion created: `PROMOTION_CREATED` with `entity_type` set to "Promotion".
- 1 Stock adjustment: `STOCK_ADJUSTED` with `entity_type` set to "StockMovement".
- 1 Expense created: `EXPENSE_CREATED` with `entity_type` set to "Expense".
- 1 Shift closed: `SHIFT_CLOSED` with `entity_type` set to "Shift".

Spread the `created_at` timestamps across the last 14 days. All records use `ip_address="127.0.0.1"` and `user_agent="LankaCommerce/Seed"`.

### Step 4: CashMovement Records

Using `CashMovement.objects.bulk_create([...])`, create two demo cash movement records for the demo shift:

- `PETTY_CASH_OUT` with `amount=15.00` and `reason="Bought paper cups and straws"`.
- `MANUAL_IN` with `amount=100.00` and `reason="Cash float top-up from safe"`.

Check for existing cash movements first to avoid duplicates.

### Step 5: Customer Birthday Data

Set `last_birthday_message_sent_year = None` on all demo customers to ensure they are eligible for birthday message processing. Set one designated demo customer's birthday to today (month and day matching the current date, any year) so the birthday cron endpoint can be tested immediately after seeding.

### Step 6: Log Summary

After seeding completes, log a summary with the count of records created per model:
`logger.info("Seeded %d AuditLog entries, %d CashMovement records, updated hardware config, and reset birthday fields for %d customers.", audit_count, cash_count, customer_count)`
