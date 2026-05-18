# Task 05.02.12 — Seed Demo Billing Data

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.12 |
| SubPhase | 05.02 — Billing and WhatsApp Automation |
| Complexity | Medium |
| Estimated Effort | 1 day |
| Dependencies | Task 05.02.01 (Billing models migrated) |
| Produces | `backend/apps/billing/management/commands/seed_demo_billing.py` |
| Blocked By | Task 05.02.01 |

---

## Objective

Extend the seed data management command to populate billing-specific demo data: three `SubscriptionPlan` records (STARTER, GROWTH, ENTERPRISE), an ACTIVE GROWTH subscription for the primary demo tenant, three demo invoices (two PAID, one PENDING), two `PaymentReminder` records, and two additional lite demo tenants (one TRIAL, one SUSPENDED) to make the Super Admin MRR dashboard meaningful during development and QA. All additions must be idempotent.

---

## Instructions

### Step 1: Add Idempotency Guards

At the beginning of the billing seed section in `backend/apps/billing/management/commands/seed_demo_billing.py`, add idempotency checks using `update_or_create` patterns:
- For `SubscriptionPlan` records, use `update_or_create(name=name, defaults={...})`. This prevents duplicate plans on repeated seed runs.
- For `Invoice` records, use `update_or_create(invoice_number=inv_num, defaults={...})`. Use the prefix "INV-SEED-" for seed records to avoid collisions with production-generated numbers.
- For the additional lite tenants, use `update_or_create` using a unique slug for the tenant.

Import `Decimal` from Python's `decimal` module at the top of the file. Import `timezone` from `django.utils`. Import `timedelta` from `datetime`.

### Step 2: Create the Three Subscription Plans

Use `update_or_create` for three `SubscriptionPlan` records:

**STARTER plan**: `name="STARTER"`, `monthly_price=Decimal("1500.00")`, `annual_price=Decimal("15000.00")` (equivalent to 2 months free), `max_users=3`, `max_product_variants=200`, `features=["pos:basic", "reports:basic", "stock:basic"]`, `is_active=True`.

**GROWTH plan**: `name="GROWTH"`, `monthly_price=Decimal("3500.00")`, `annual_price=Decimal("35000.00")`, `max_users=10`, `max_product_variants=1000`, `features=["pos:basic", "pos:returns", "reports:advanced", "stock:advanced", "crm:basic", "whatsapp:basic"]`, `is_active=True`.

**ENTERPRISE plan**: `name="ENTERPRISE"`, `monthly_price=Decimal("8000.00")`, `annual_price=Decimal("80000.00")`, `max_users=50`, `max_product_variants=5000`, `features=["pos:basic", "pos:returns", "reports:advanced", "reports:export", "stock:advanced", "crm:advanced", "whatsapp:advanced", "staff:unlimited", "hardware:all"]`, `is_active=True`.

Log each result: `self.stdout.write(self.style.SUCCESS(f"Plan upserted: {plan.name}"))`.

### Step 3: Assign the Demo Tenant an ACTIVE GROWTH Subscription

Fetch the primary demo tenant by slug (e.g., `"demo"`). Fetch the GROWTH plan by name.

Use `update_or_create` for the `Subscription` record using `tenant_id=demo_tenant.id`. Set: `plan=growth_plan`, `status='ACTIVE'`, `current_period_start=timezone.now().replace(day=1)`, `current_period_end=(timezone.now().replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)`, `created_at=timezone.now() - timedelta(days=180)` (six months ago — represents an established customer). Also update the demo Tenant: `Tenant.objects.filter(id=demo_tenant.id).update(subscription_status='ACTIVE')`.

### Step 4: Create the Three Demo Invoice Records

Create three `Invoice` records for the primary demo tenant using `update_or_create` on `invoice_number`. All amounts use `Decimal("3500.00")`.

**Invoice 1 (oldest, fully paid)**: `invoice_number="INV-SEED-0001"`, `billing_period_start=start=(timezone.now() - timedelta(days=120)).replace(day=1)`, `billing_period_end` = end of that month, `due_date=billing_period_end`, `status='PAID'`, `paid_at=billing_period_start + timedelta(days=1)`, `payhere_order_id="PAYHERE-DEMOERE-DEMO-001"`.

**Invoice 2 (recent, paid)**: `invoice_number="INV-SEED-0002"`, `billing_period_start=(timezone.now() - timedelta(days=60)).replace(day=1)`, `billing_period_end` = end of that month, `due_date=billing_period_end`, `status='PAID'`, `paid_at=billing_period_start + timedelta(days=2)`, `payhere_order_id="PAYHERE-DEMO-002"`.

**Invoice 3 (current month, pending)**: `invoice_number="INV-SEED-0003"`, `billing_period_start=timezone.now().replace(day=1)`, `billing_period_end` = end of current month, `due_date=billing_period_end`, `status='PENDING'`.

All invoices reference the demo tenant's subscription. Set `tenant` and `subscription` on each.

### Step 5: Add Two Demo PaymentReminder Records

Create two `PaymentReminder` records linked to Invoice 3:

**Reminder 1**: `type='THREE_DAY_REMINDER'`, `channel='WHATSAPP'`, `sent_at=timezone.now() - timedelta(days=2)`, `status='SENT'`, `tenant=demo_tenant`, `invoice=invoice3`.

**Reminder 2**: `type='DUE_DATE_REMINDER'`, `channel='WHATSAPP'`, `sent_at=timezone.now()`, `status='SENT'`, `tenant=demo_tenant`, `invoice=invoice3`.

Use `get_or_create` with the combination of `invoice` and `type` to maintain idempotency.

### Step 6: Create the Trial Demo Tenant

Create a second demo tenant with minimal data. This tenant exists only for the Super Admin MRR dashboard display.

Create a `User` record: `email="demo-trial-owner@lankacommerce.dev"`, `name="Trial Demo Owner"`, `, `role='OWNER'`, password hashed using Django's `make_password("demo1234")`.

Create the `Tenant` record: `name="Trial Demo Boutique"`, `slug="trial-demo"`, `subscription_status='TRIAL'`. Create the `Subscription` record: `plan=starter_plan`, `status='TRIAL'`, `trial_ends_at=timezone.now() + timedelta(days=14)`, `current_period_start=timezone.now()`, `current_period_end=timezone.now() + timedelta(days=14)`. Use `update_or_create` on tenant slug for idempotency.

### Step 7: Create the Suspended Demo Tenant

Create a third demo tenant: `User` email `"demo-suspended-owner@lankacommerce.dev"`, name `"Suspended Demo Owner"`, role `'OWNER'`. Tenant: `name="Suspended Demo Boutique"`, `slug="suspended-demo"`, `subscription_status='SUSPENDED'`. Subscription: `plan=growth_plan`, `status='SUSPENDED'`, `current_period_start=(timezone.now() - timedelta(days=60)).replace(day=1)`, `current_period_end=(timezone.now() - timedelta(days=30)).replace(day=1) + timedelta(days=31)` (past the grace period), `cancelled_at=None`.

Use `update_or_create` on tenant slug for idempotency.

### Step 8: Log the Seed Summary

At the end of the billing seed section, log a completion message: `self.stdout.write(self.style.SUCCESS("Billing seed complete — Plans: 3 (STARTER, GROWTH, ENTERPRISE) | Primary demo tenant: ACTIVE GROWTH | Demo invoices: 3 (2 PAID, 1 PENDING) | Payment reminders: 2 | Additional demo tenants: Trial Demo Boutique (TRIAL, 14 days), Suspended Demo Boutique (SUSPENDED)."))`.

---

## Expected Output

- Three `SubscriptionPlan` records: STARTER LKR 1,500/mo, GROWTH LKR 3,500/mo, ENTERPRISE LKR 8,000/mo.
- Primary demo tenant with ACTIVE Subscription on GROWTH plan.
- Three Invoice records: INV-SEED-0001 (PAID), INV-SEED-0002 (PAID), INV-SEED-0003 (PENDING).
- Two `PaymentReminder` records for the PENDING invoice.
- Trial Demo Boutique tenant: TRIAL, STARTER, 14 days remaining.
- Suspended Demo Boutique tenant: SUSPENDED, GROWTH, past grace period.

---

## Validation

- `poetry run python manage.py seed_demo_billing` runs to completion without errors.
- Re-running the seed command produces no duplicate records (idempotency confirmed).
- Primary demo tenant has `subscription_status='ACTIVE'` in the database.
- All three invoices exist with correct invoice numbers, statuses, and amounts.
- Invoice 1 and Invoice 2 have non-null `paid_at` values.
- Invoice 3 has null `paid_at` and `status='PENDING'`.
- Two `PaymentReminder` records exist for Invoice 3: one THREE_DAY_REMINDER, one DUE_DATE_REMINDER.
- Trial Demo Boutique has `subscription_status='TRIAL'` and `trial_ends_at` approximately 14 days from seed run date.
- Suspended Demo Boutique has `subscription_status='SUSPENDED'`.
- The MRR dashboard at `/super-admin/metrics` shows non-zero MRR and at least 1 active subscriber after seeding.
- `Decimal` amounts are stored with exact precision (LKR 3500.00, not 3499.9999...).

---

## Notes

The invoice numbers "INV-SEED-0001" through "INV-SEED-0003" use the "SEED" prefix to avoid collisions with production-generated numbers. The production `generate_invoice_number` function counts real invoices for the current year and assigns the next sequential number. The placeholder passwords ("demo1234" hashed with `make_password`) created for the demo tenant owners must never be deployed to production. The seed file should check for a `NODE_ENV` guard and refuse to run if `settings.DEBUG` is `False`. The `timedelta` and `timezone` functions ensure seed dates remain consistent relative to the run date rather than hardcoded calendar dates that become stale over time.
