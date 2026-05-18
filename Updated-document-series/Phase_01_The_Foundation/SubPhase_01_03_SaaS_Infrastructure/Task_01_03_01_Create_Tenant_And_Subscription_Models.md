# Task 01.03.01 — Create Tenant and Subscription Models

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.01 |
| Title | Create Tenant and Subscription Models |
| Working Directory | `backend/` |
| Prerequisites | Task 01.02.01 (CustomUser model), Django project structure, PostgreSQL connected |
| Estimated Time | 3 hours |
| Status | [ ] Not Started |

---

## Objective

Define the core data models that underpin the entire LankaCommerce multi-tenant SaaS platform. This task creates a new Django application called `tenants`, registers it in the project, and populates it with four models: Plan, Tenant, Subscription, and Invoice. Each model uses a UUID primary key, appropriate field types, and Python TextChoices enums for all status columns. After completing this task, the database will contain the full tenant data schema, and all four models will be explorable through the Django admin interface.

---

## Instructions

### Step 1: Create the Tenants Django Application

Navigate to the `backend/` directory in your terminal. From inside the `backend/` directory, run the Django `startapp` management command, specifying the destination path as `apps/tenants`. This will generate the standard Django app scaffolding — models, views, admin, apps, tests, and migration files — inside the correct subdirectory.

After the command completes, open `backend/apps/tenants/apps.py` and verify that the `name` attribute of the AppConfig class reads `apps.tenants` rather than just `tenants`. If it reads only `tenants`, change it to `apps.tenants` to match the full Python module path.

Open `backend/config/settings/base.py` (or the settings file appropriate to your project's settings structure) and locate the INSTALLED_APPS list. Add `apps.tenants` as a new entry. Place it after `apps.accounts` so that related migrations run in the correct order.

### Step 2: Define TextChoices Status Enumerations

Open `backend/apps/tenants/models.py`. Before defining any model classes, define three inner enumeration classes that inherit from Django's `models.TextChoices`. These enumerations must be defined at the top of the module so that all model definitions below can reference them.

The first enumeration is TenantStatus. It must have four members: ACTIVE (stored as the string "ACTIVE"), GRACE_PERIOD (stored as "GRACE_PERIOD"), SUSPENDED (stored as "SUSPENDED"), and CANCELLED (stored as "CANCELLED"). Each member should include a human-readable label as the second argument, for example "Active", "Grace Period", "Suspended", and "Cancelled" respectively.

The second enumeration is SubscriptionStatus. It must have four members: ACTIVE, PAST_DUE, CANCELLED, and TRIALING, each with an equivalent human-readable label.

The third enumeration is InvoiceStatus. It must have three members: PAID, UNPAID, and OVERDUE, each with a human-readable label.

### Step 3: Define the Plan Model

Still in `models.py`, define the Plan model class inheriting from `models.Model`. The Plan model represents a subscription tier that tenants can be enrolled on.

Add the following fields:

- An `id` field using UUIDField, with `primary_key=True`, `default=uuid.uuid4`, and `editable=False`. Import the `uuid` module at the top of the file.
- A `name` field using CharField with `max_length=100` and `unique=True`. This will serve as the human-readable tier name.
- A `description` field using TextField, which can be blank.
- A `price_monthly` field using DecimalField with `max_digits=12` and `decimal_places=2`, representing the plan's monthly price in LKR.
- A `features` field using JSONField with a `default` argument pointing to a callable that returns an empty list. This stores the list of feature bullet points shown on plan cards.
- An `is_active` field using BooleanField with `default=True`, used to hide deprecated plans without deleting them.
- A `sort_order` field using IntegerField with `default=0`, used to control the display order of plan cards in the provisioning wizard.
- A `created_at` field using DateTimeField with `auto_now_add=True`.
- An `updated_at` field using DateTimeField with `auto_now=True`.

Add an inner Meta class to the Plan model setting `ordering` to a list containing `sort_order`, so that Django queries return plans in ascending sort order by default.

Add a `__str__` method that returns the plan's name field for readable representation in the admin and shell.

### Step 4: Define the Tenant Model

Define the Tenant model class inheriting from `models.Model`. The Tenant model represents a single retail store operating on the LankaCommerce platform.

Add the following fields:

- An `id` field using UUIDField, same configuration as Plan.
- A `name` field using CharField with `max_length=255`, the store's display name.
- A `slug` field using SlugField with `max_length=100` and `unique=True`. The slug serves as the tenant's subdomain identifier and must contain only lowercase letters, numbers, and hyphens.
- A `logo_url` field using URLField, allowing null and blank, for storing the tenant's logo as a URL to cloud-hosted storage.
- A `status` field using CharField with `max_length=20`, `choices=TenantStatus.choices`, and `default=TenantStatus.ACTIVE`.
- A `grace_ends_at` field using DateTimeField, allowing null and blank, which records when the grace period expires.
- A `custom_domain` field using CharField with `max_length=255`, allowing null and blank, for tenants on plans that support custom domains.
- A `settings` field using JSONField with a `default` callable that returns the standard settings dictionary containing the keys: currency, timezone, vatRate, ssclRate, and receiptFooter with sensible Sri Lankan defaults (LKR, Asia/Colombo, 18 for vatRate, 2.5 for ssclRate, and an empty string for receiptFooter).
- A `created_at` field using DateTimeField with `auto_now_add=True`.
- An `updated_at` field using DateTimeField with `auto_now=True`.
- A `deleted_at` field using DateTimeField, allowing null and blank, which records the soft-deletion timestamp. A tenant with a non-null `deleted_at` is considered logically deleted but retained for audit purposes.

Add a `__str__` method that returns the tenant name and slug together in a readable format.

### Step 5: Define the Subscription Model

Define the Subscription model class. Each Tenant has one active Subscription at any given time, linking it to a Plan and tracking the billing cycle.

Add the following fields:

- An `id` field using UUIDField with the same configuration as the other models.
- A `tenant` field using ForeignKey pointing to the Tenant model, with `on_delete=models.CASCADE` and `related_name="subscriptions"`. This means deleting a tenant also deletes all its subscription records.
- A `plan` field using ForeignKey pointing to the Plan model, with `on_delete=models.PROTECT` and `related_name="subscriptions"`. Using PROTECT prevents a Plan record from being deleted while active subscriptions reference it.
- A `status` field using CharField with `max_length=20`, `choices=SubscriptionStatus.choices`, and `default=SubscriptionStatus.ACTIVE`.
- A `current_period_start` field using DateTimeField, marking the start of the current billing period.
- A `current_period_end` field using DateTimeField, marking the end of the current billing period.
- A `payhere_sub_id` field using CharField with `max_length=100`, allowing null and blank, for storing the PayHere subscription reference identifier once PayHere integration is added in Phase 5.
- A `next_billing_date` field using DateTimeField, which the billing service uses to schedule the next invoice.
- A `cancelled_at` field using DateTimeField, allowing null and blank, recorded when the subscription is cancelled.
- A `created_at` field using DateTimeField with `auto_now_add=True`.
- An `updated_at` field using DateTimeField with `auto_now=True`.

Add a `__str__` method returning a human-readable string combining the tenant name, plan name, and subscription status.

### Step 6: Define the Invoice Model

Define the Invoice model class. An Invoice represents a billing event for a tenant's subscription, whether paid, pending, or overdue.

Add the following fields:

- An `id` field using UUIDField with the same configuration as the other models.
- A `tenant` field using ForeignKey pointing to Tenant, with `on_delete=models.CASCADE` and `related_name="invoices"`.
- A `subscription` field using ForeignKey pointing to Subscription, with `on_delete=models.CASCADE` and `related_name="invoices"`.
- An `invoice_number` field using CharField with `max_length=50` and `unique=True`, formatted as a human-readable reference such as INV-2024-001.
- An `amount` field using DecimalField with `max_digits=12` and `decimal_places=2`, representing the invoice total in LKR.
- A `status` field using CharField with `max_length=20`, `choices=InvoiceStatus.choices`, and `default=InvoiceStatus.UNPAID`.
- A `billing_date` field using DateTimeField marking when the invoice was issued.
- A `paid_at` field using DateTimeField, allowing null and blank, recorded when payment is confirmed.
- A `pdf_url` field using URLField, allowing null and blank, for storing a link to the PDF invoice generated in Phase 5.
- A `created_at` field using DateTimeField with `auto_now_add=True`.

Add a `__str__` method returning the invoice number and status.

### Step 7: Update the CustomUser Model for Tenant Association

Open `backend/apps/accounts/models.py` where the CustomUser model was defined in SubPhase 01.02.

The CustomUser model currently has a `tenant_id` field that is a plain UUIDField. You must decide how to associate users with tenants:

**Recommended approach (ForeignKey with db_constraint):** Replace the `tenant_id` UUIDField with a ForeignKey pointing to `apps.tenants.Tenant` using `on_delete=models.SET_NULL`, `null=True`, `blank=True`, and `related_name="users"`. This gives the ORM full relationship awareness, allowing queries like `tenant.users.all()` and enabling `select_related` optimisation. Since `apps.accounts` and `apps.tenants` are in separate Django apps, import the Tenant model at the top of accounts/models.py using the standard import.

**Alternative approach (if circular import is a concern):** Keep the `tenant_id` as a UUIDField but add `db_constraint=False`. This avoids the circular import entirely at the cost of losing ORM relationship traversal. If this approach is used, document it clearly in a comment above the field definition so future developers understand the intentional decoupling.

After modifying the CustomUser model, create a new migration for the accounts app to reflect the field change.

### Step 8: Create and Run Migrations

From the `backend/` directory, run the `makemigrations` management command targeting the `tenants` app. Django will generate a migration file in `backend/apps/tenants/migrations/` that captures all four new models and their fields.

Review the generated migration file to verify: all four model tables are created, UUID primary keys are present, all ForeignKey relationships reference the correct tables, all CharField fields with `choices` use the correct string length, and all nullable fields have both `null=True` and `blank=True` set.

If the accounts app was modified in Step 7, run `makemigrations` for the `accounts` app as well and verify that the migration accurately reflects the tenant ForeignKey or the updated UUIDField.

After reviewing both migrations, run the `migrate` management command to apply all pending migrations to the database. Confirm that the command exits with no errors and that all migrations are marked as applied.

### Step 9: Register Models in Django Admin

Open `backend/apps/tenants/admin.py`. Register all four models — Plan, Tenant, Subscription, and Invoice — with the Django admin site.

For the Plan admin class, set `list_display` to show the name, price_monthly, is_active, and sort_order fields. Set `list_editable` to include is_active and sort_order so admins can quickly toggle and reorder plans from the list view.

For the Tenant admin class, set `list_display` to show the name, slug, status, and created_at fields. Set `list_filter` to filter by status. Set `search_fields` to search by name and slug.

For the Subscription admin class, set `list_display` to show the tenant name (via raw_id_fields or StringRelatedField), the plan name, status, and next_billing_date. Set `list_filter` to filter by status.

For the Invoice admin class, set `list_display` to show invoice_number, tenant name, amount, status, and billing_date. Set `list_filter` to filter by status. Set `search_fields` to search by invoice_number.

### Step 10: Verify in Django Shell

Open the Django shell by running the shell management command from the `backend/` directory.

In the shell, import each of the four model classes from `apps.tenants.models`. Inspect the field names and types by examining the `_meta.get_fields()` method on each model class. Confirm that:

- The Plan model has all expected fields including the JSONField for features.
- The Tenant model has the settings JSONField and the slug SlugField.
- The Subscription model shows both the tenant ForeignKey and the plan ForeignKey.
- The Invoice model shows the unique invoice_number CharField.

If Step 7 used the ForeignKey approach, also confirm that `CustomUser._meta.get_field('tenant')` returns a ForeignKey field pointing to the Tenant model. Exit the shell cleanly.

---

## Expected Output

After completing this task, the following artifacts exist in the codebase:

- `backend/apps/tenants/` directory containing the complete Django app scaffolding.
- `backend/apps/tenants/models.py` with the TenantStatus, SubscriptionStatus, and InvoiceStatus enumerations and the Plan, Tenant, Subscription, and Invoice model classes.
- `backend/apps/tenants/migrations/0001_initial.py` (or equivalent) containing the migration for all four models.
- `backend/apps/tenants/admin.py` with registrations for all four models with display configuration.
- `apps.tenants` entry in the project's INSTALLED_APPS setting.
- All migrations applied to the PostgreSQL database cleanly.
- The accounts app migration (if CustomUser was updated) applied cleanly.

---

## Validation

- [ ] Running `poetry run python manage.py migrate` inside `backend/` exits with code 0 and shows all tenants migrations as applied.
- [ ] Running `poetry run python manage.py showmigrations tenants` lists the initial migration as applied.
- [ ] The Django admin at `/admin/` shows Plan, Tenant, Subscription, and Invoice entries under the Tenants section.
- [ ] Creating a Plan record through the Django admin saves successfully and displays correctly in the list view.
- [ ] Creating a Tenant record through the Django admin with a unique slug saves successfully.
- [ ] Attempting to create a second Tenant with the same slug produces a database unique constraint error.
- [ ] The Tenant model's `settings` JSONField defaults correctly (currency: LKR, timezone: Asia/Colombo) on a newly created Tenant with no explicit settings argument.
- [ ] Running `pnpm tsc --noEmit` in `frontend/` still passes (no frontend changes in this task, so this should be a baseline check).

---

## Notes

- UUID primary keys are critical for this application because tenant identifiers are embedded in JWT tokens and exposed in API URLs. Sequential integer IDs are not used for security and privacy reasons.
- The `deleted_at` soft-delete pattern on the Tenant model is intentional. Tenants are never hard-deleted, because their data may be needed for billing history, audits, and regulatory compliance. Any query that should return only active tenants must include a `deleted_at__isnull=True` filter.
- The Plan model's `features` JSONField stores a flat list of strings. This list is consumed by the provisioning wizard to render feature bullet points on plan selection cards. If the features list becomes more complex in the future (for example, adding icon identifiers), the existing JSONField can accommodate that change without a schema migration.
- If you encounter a circular import error when adding the ForeignKey from CustomUser to Tenant, use Django's lazy reference syntax for model paths (a dotted string such as "tenants.Tenant") as the first argument to ForeignKey instead of the imported class. This resolves the import cycle without requiring any restructuring.
