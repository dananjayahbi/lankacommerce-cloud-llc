# Task 05.02.01 — Create Billing Models

## Metadata

| Attribute | Value |
|-----------|-------|
| **Task ID** | 05.02.01 |
| **Task Name** | Create Billing Models |
| **SubPhase** | 05.02 — Billing & WhatsApp Automation |
| **Phase** | 05 — The Platform |
| **Status** | Draft |
| **Priority** | High |
| **Estimated Effort** | 3 hours |
| **Dependencies** | Phase 01 Tenant model, User model, RBAC enums |
| **Technology** | Django 5.x, PostgreSQL, Django ORM |

## Objective

This task establishes the data foundation for the entire billing subsystem by defining five Django models in `backend/apps/billing/models.py

---

## Instructions

### Step 1: Create the Billing App Directory Structure

Create `backend/apps/billing/` with an `__init__.py`, then create `backend/apps/billing/models.py`. Register `billing` in `INSTALLED_APPS` inside `backend/config/settings.py` under the `LOCAL_APPS` section alongside existing apps like `tenants`, `users`, `products`, and `transactions`.

### Step 2: Create the Constants File

Create `backend/apps/billing/constants.py` with the following Python constants:

- `PLAN_FEATURE_ALL` as a list of all available feature slugs: `["pos_terminal", "product_catalog", "stock_control", "staff_management", "promotions", "crm", "expense_tracking", "reports", "whatsapp_reminders", "multi_store", "api_access", "priority_support"]`.
- `PLAN_FEATURE_LABELS` as a dict mapping each feature slug to a human-readable label, for example `{"pos_terminal": "POS Terminal", "product_catalog": "Product Catalog", ...}`.
- `PAYHERE_SANDBOX_URL = "https://sandbox.payhere.lk/pay/checkout"`.
- `PAYHERE_PRODUCTION_URL = "https://www.payhere.lk/pay/checkout"`.
- `LKR_CURRENCY_CODE = "LKR"`.
- `TRIAL_DAYS = 14`.
- `GRACE_PERIOD_DAYS = 7`.
- `REMINDER_THREE_DAYS_BEFORE = 3`.
- `REMINDER_DUE_DATE = 0`.
- `REMINDER_OVERDUE_INTERVAL_DAYS = 1`.

### Step 3: Declare TextChoices Enums

At the top of `models.py`, before any model class, declare five `TextChoices` classes:

**SubscriptionStatus** with members `TRIAL = "TRIAL", "Trial"`, `ACTIVE = "ACTIVE", "Active"`, `PAST_DUE = "PAST_DUE", "Past Due"`, `SUSPENDED = "SUSPENDED", "Suspended"`, `CANCELLED = "CANCELLED", "Cancelled"`.

**InvoiceStatus** with members `PENDING = "PENDING", "Pending"`, `PAID = "PAID", "Paid"`, `FAILED = "FAILED", "Failed"`, `VOIDED = "VOIDED", "Voided"`.

**PaymentReminderType** with members `THREE_DAY_REMINDER = "THREE_DAY_REMINDER", "3-Day Before"`, `DUE_DATE_REMINDER = "DUE_DATE_REMINDER", "Due Date"`, `OVERDUE_REMINDER = "OVERDUE_REMINDER", "Overdue"`.

**PaymentReminderChannel** with members `WHATSAPP = "WHATSAPP", "WhatsApp"`, `EMAIL = "EMAIL", "Email"`.

**PaymentReminderSendStatus** with members `SENT = "SENT", "Sent"`, `FAILED = "FAILED", "Failed"`.

### Step 4: Define SubscriptionPlan

Add a `SubscriptionPlan` model with the following fields:

- `id` as `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `name` as `CharField(max_length=100, unique=True)` — plan names are `STARTER`, `GROWTH`, `ENTERPRISE`.
- `description` as `TextField(null=True, blank=True)`.
- `monthly_price` as `DecimalField(max_digits=10, decimal_places=2)` — monthly subscription fee in LKR.
- `annual_price` as `DecimalField(max_digits=10, decimal_places=2)` — annual equivalent fee in LKR.
- `max_users` as `IntegerField()` — maximum number of staff accounts.
- `max_product_variants` as `IntegerField()` — maximum number of product variants across the entire catalog.
- `features` as `JSONField(null=True, blank=True)` — stores a list of feature slugs from `constants.py`.
- `is_active` as `BooleanField(default=True)` — used to soft-disable plans instead of deleting them.
- `sort_order` as `IntegerField(default=0)` — controls display ordering on the billing page.
- `created_at` as `DateTimeField(auto_now_add=True)`.
- `updated_at` as `DateTimeField(auto_now=True)`.

Add `Meta` class with `db_table = "billing_subscription_plan"`, `ordering = ["sort_order", "name"]`, `verbose_name = "Subscription Plan"`, `verbose_name_plural = "Subscription Plans"`. Implement `__str__` returning `self.name`.

### Step 5: Define Subscription

Add a `Subscription` model with the following fields:

- `id` as `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant` as `ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscriptions")` — cascade delete ensures subscriptions are removed when a tenant is deleted.
- `plan` as `ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")` — `PROTECT` prevents deleting a plan that has active subscriptions.
- `status` as `CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIAL)`.
- `trial_ends_at` as `DateTimeField(null=True, blank=True)` — set to `now() + 14 days` on trial creation.
- `current_period_start` as `DateTimeField(null=True, blank=True)` — start of the current billing period.
- `current_period_end` as `DateTimeField(null=True, blank=True)` — end of the current billing period.
- `payhere_subscription_token` as `CharField(max_length=255, null=True, blank=True)` — returned by PayHere for recurring subscriptions.
- `cancelled_at` as `DateTimeField(null=True, blank=True)` — set when the tenant requests cancellation.
- `cancel_at_period_end` as `BooleanField(default=False)` — if `True`, subscription cancels at `current_period_end`.
- `created_at` as `DateTimeField(auto_now_add=True)`.
- `updated_at` as `DateTimeField(auto_now=True)`.

Add indexes: a composite index on `tenant` and `status` for efficient tenant-scoped lookups, and an index on `current_period_end` for the cron expiry query. Add `Meta` with `db_table = "billing_subscription"`, `ordering = ["-created_at"]`, `verbose_name = "Subscription"`. Implement `__str__` returning `f"{self.tenant.store_name} - {self.plan.name} ({self.status})"`.

### Step 6: Define Invoice

Add an `Invoice` model with the following fields:

- `id` as `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `subscription` as `ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")` — cascade delete removes invoices when a subscription is removed.
- `tenant` as `ForeignKey(Tenant, on_delete=models.CASCADE, related_name="invoices")` — denormalised for efficient tenant-scoped queries without joining through Subscription.
- `invoice_number` as `CharField(max_length=50, unique=True)` — generated as a human-readable serial number, e.g., `INV-20250518-XXXX`.
- `amount` as `DecimalField(max_digits=10, decimal_places=2)` — invoice total in LKR.
- `status` as `CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.PENDING)`.
- `billing_period_start` as `DateTimeField()` — start date of the period this invoice covers.
- `billing_period_end` as `DateTimeField()` — end date of the period this invoice covers.
- `due_date` as `DateTimeField()` — date by which payment must be received (typically 7 days after period end).
- `paid_at` as `DateTimeField(null=True, blank=True)` — set when the IPN handler processes a successful payment.
- `payhere_order_id` as `CharField(max_length=255, null=True, blank=True)` — PayHere's order reference.
- `pdf_url` as `URLField(max_length=500, null=True, blank=True)` — URL to the generated PDF on storage.
- `created_at` as `DateTimeField(auto_now_add=True)`.
- `updated_at` as `DateTimeField(auto_now=True)`.

Add indexes: a composite index on `subscription` and `status` for subscription invoice queries, a composite index on `tenant` and `status` for dashboard queries, an index on `due_date` for the reminder cron query. Add `Meta` with `db_table = "billing_invoice"`, `ordering = ["-created_at"]`, `verbose_name = "Invoice"`. Implement `__str__` returning `f"{self.invoice_number} - {self.status}"`.

### Step 7: Define InvoicePaymentEvent

Add an `InvoicePaymentEvent` model with the following fields:

- `id` as `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `invoice` as `ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payment_events")`.
- `payhere_status_code` as `CharField(max_length=10)` — the `status_code` from the IPN payload: `2` for success, `0` for pending, `-1` for cancelled, `-2` for failed, `-3` for charged back.
- `payhere_order_id` as `CharField(max_length=255)` — PayHere's order reference.
- `payhere_amount` as `CharField(max_length=50)` — stored as CharField to preserve the exact string PayHere sent, avoiding Decimal parsing of malformed payloads.
- `payhere_currency` as `CharField(max_length=10, default="LKR")`.
- `payhere_md5sig` as `CharField(max_length=255)` — the raw `md5sig` from the IPN payload for audit.
- `signature_valid` as `BooleanField(default=False)` — set to `True` after the backend validates the MD5 signature.
- `raw_payload` as `JSONField()` — the full parsed IPN payload preserved as-is for debugging.
- `processed` as `BooleanField(default=False)` — set to `True` after the atomic processing block completes.
- `created_at` as `DateTimeField(auto_now_add=True)`.

Add an index on `payhere_order_id` for lookup by order reference. Add `Meta` with `db_table = "billing_invoice_payment_event"`, `ordering = ["-created_at"]`, `verbose_name = "Invoice Payment Event"`, `verbose_name_plural = "Invoice Payment Events"`. Implement `__str__` returning `f"Event {self.payhere_order_id} - Status {self.payhere_status_code}"`.

### Step 8: Define PaymentReminder

Add a `PaymentReminder` model with the following fields:

- `id` as `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant` as `ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payment_reminders")`.
- `invoice` as `ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payment_reminders")`.
- `reminder_type` as `CharField(max_length=30, choices=PaymentReminderType.choices)` — distinguishes the three reminder passes.
- `channel` as `CharField(max_length=20, choices=PaymentReminderChannel.choices)` — `WHATSAPP` or `EMAIL`.
- `error_message` as `TextField(null=True, blank=True)` — stores the API error if sending failed.
- `sent_at` as `DateTimeField(auto_now_add=True)`.

Add a unique constraint on the combination of `invoice`, `reminder_type`, and `channel` to prevent duplicate reminder sends. This is enforced as a `Meta.unique_together` or `Meta.constraints` with `UniqueConstraint`. Add an index on `sent_at` for cron deduplication queries. Add `Meta` with `db_table = "billing_payment_reminder"`, `ordering = ["-sent_at"]`, `verbose_name = "Payment Reminder"`.

### Step 9: Add subscription_status to Tenant Model

Open `backend/apps/tenants/models.py` and add a `subscription_status` field to the existing `Tenant` model:

- `subscription_status` as `CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIAL)`.

Import `SubscriptionStatus` from `billing.models` inside the tenant models file. Use a lazy import or import at the top of the file — the billing app must appear after tenants in `INSTALLED_APPS` to resolve the circular dependency. Add an index on `subscription_status` for metrics queries.

### Step 10: Run the Migration

Run `poetry run python manage.py makemigrations billing --name add_billing_models` then `poetry run python manage.py migrate`. Alternatively, run both in sequence: first `makemigrations`, then `migrate`. Verify that the migration SQL creates all five tables plus adds the `subscription_status` column to the `tenants_tenant` table. Check that the `billing_invoice_payment_event` table's `raw_payload` column is `JSONB` (or the JSON equivalent for the configured PostgreSQL version).

---

## Expected Output

- `backend/apps/billing/models.py` contains all five model classes and five `TextChoices` enums
- `backend/apps/billing/constants.py` contains plan feature constants, PayHere URLs, and timing constants
- `Tenant` model in `backend/apps/tenants/models.py` has a new `subscription_status` field
- Migration `add_billing_models` produces five `CREATE TABLE` statements plus one `ALTER TABLE` for the Tenant column
- Zero errors when running `poetry run python manage.py check`

---

## Validation

- Run `poetry run python manage.py showmigrations billing` and confirm the migration is listed and applied
- Connect to PostgreSQL and confirm tables `billing_subscription_plan`, `billing_subscription`, `billing_invoice`, `billing_invoice_payment_event`, and `billing_payment_reminder` exist
- Confirm the `tenants_tenant` table has a `subscription_status` column of type `varchar(20)` with default `TRIAL`
- Run `poetry run python manage.py test billing.tests.test_models` (when tests are written) to confirm field constraints
- Open Django Admin and confirm all five billing models are registered (when admin registration is added)
- Verify that `SubscriptionPlan.features` can store and retrieve a JSON list of feature slugs
- Confirm that deleting a SubscriptionPlan used by a Subscription raises a `ProtectedError` due to `PROTECT`
- Confirm that deleting a Tenant cascades to delete its Subscriptions and Invoices
- Verify that the `PaymentReminder` unique constraint prevents creating a duplicate reminder for the same invoice, type, and channel
- Check that `InvoicePaymentEvent.raw_payload` can store the full IPN payload without truncation

---

## Notes

- The circular import between `billing` and `tenants` models requires careful app ordering. The `Tenant.subscription_status` field references `SubscriptionStatus` from `billing.models`. Use a Django import inside the `Tenant` model's method or a module-level import after `billing` is guaranteed to be loaded. Alternatively, define `SubscriptionStatus` values as simple string constants in `tenants/constants.py` and share them — but the cleaner approach is to ensure `billing` appears before `tenants` in `INSTALLED_APPS` or to use a lazy `apps.get_model()` reference in migrations.
- `InvoicePaymentEvent.payhere_amount` is deliberately `CharField` rather than `DecimalField`. PayHere sends the amount as a string in the IPN payload. Storing the raw string preserves the exact value for audit and debugging. Only parse it to `Decimal` when performing arithmetic in the processing block.
- The `Invoice.invoice_number` field is `unique=True` at the database level. The generation logic in a later task must handle race conditions — use a `select_for_update` or a unique constraint retry pattern when generating invoice numbers.
- All UUID primary keys use `uuid.uuid4` rather than `default=uuid.uuid4` with `editable=False`. This ensures IDs cannot be set client-side and are generated server-side only.