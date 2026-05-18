# Task 01.03.12 — Seed Initial Tenant and Plans

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.12 |
| Title | Seed Initial Tenant and Plans |
| Working Directory | `backend/` |
| Prerequisites | Task 01.03.01 (models migrated), Task 01.03.06 (seed_plans command), Task 01.02.12 (seed_superadmin command), all migrations applied |
| Estimated Time | 1 hour |
| Status | [ ] Not Started |

---

## Objective

Establish a complete, reproducible development seed workflow that brings a fresh LankaCommerce database from empty to a fully usable development state in three management command invocations. By the end of this task, any developer who clones the repository can run a defined sequence of commands and immediately have a working platform: a super-admin account, two subscription plans, and a sample tenant store (Dilani Boutique) with an active subscription and an owner account. All seed commands are idempotent and environment-guarded.

---

## Instructions

### Step 1: Review the Existing Management Command Infrastructure

Before creating the new command, confirm that the prerequisite management commands are in place and functional.

Open `backend/apps/accounts/management/commands/seed_superadmin.py` (created in Task 01.02.12). Verify that this command creates a CustomUser with role SUPER_ADMIN and no associated tenant. Confirm that the command uses environment variables for the super-admin credentials and is idempotent.

Open `backend/apps/tenants/management/commands/seed_plans.py` (created in Task 01.03.06). Confirm that this command creates the Basic POS and Pro POS + WhatsApp plans using update_or_create and is idempotent.

If either command is missing or incomplete, complete it before proceeding with this task.

### Step 2: Create the seed_sample_tenant Command File

Create the file `backend/apps/tenants/management/commands/seed_sample_tenant.py`.

Inside this file, import `BaseCommand` and `CommandError` from `django.core.management.base`. Import `transaction` from `django.db`. Import `os` from the standard library. Import the `datetime` class and `timezone` from Python's `datetime` module. Import `timedelta` from `datetime`. Import `make_password` from `django.contrib.auth.hashers`. Import the `Tenant`, `Plan`, `Subscription`, `TenantStatus`, and `SubscriptionStatus` models and enums from `apps.tenants.models`. Import the `CustomUser` model from `apps.accounts.models`.

Define a class named `Command` inheriting from `BaseCommand`. Set the `help` class attribute to "Seeds a sample tenant (Dilani Boutique) for development and testing. Requires SEED_SAMPLE_TENANT=true environment variable. Safe to re-run (idempotent)."

### Step 3: Implement the Environment Guard

At the very beginning of the `handle` method, read the environment variable `SEED_SAMPLE_TENANT` using `os.environ.get("SEED_SAMPLE_TENANT", "")`.

If the value does not equal the exact string `"true"` (case-sensitive), write the following message to stdout using `self.stdout.write` with `self.style.WARNING` styling: "SEED_SAMPLE_TENANT is not set to 'true'. Skipping sample tenant seed. Set SEED_SAMPLE_TENANT=true to run." Then return immediately from the method without performing any database operations.

This guard prevents the sample tenant from being created accidentally during a plain `python manage.py migrate` run or a careless re-run in production. The explicit opt-in requirement makes the intent clear.

### Step 4: Check for an Existing Sample Tenant

After the environment guard, check whether the sample tenant already exists. Call `Tenant.objects.filter(slug="dilani").exists()`. If this returns True, write the message "Sample tenant 'dilani' already exists. Skipping." with `self.style.WARNING` styling and return from the method.

This idempotency check, combined with the environment guard, makes the command fully safe to include in automated development setup scripts that run on every `docker-compose up` or similar workflow.

### Step 5: Resolve the Pro Plan

Query for the Pro POS + WhatsApp plan using `Plan.objects.get(name="Pro POS + WhatsApp")`. Wrap this call in a try-except block that catches `Plan.DoesNotExist`.

If the plan is not found, raise a `CommandError` with the message "Pro POS + WhatsApp plan not found. Please run 'python manage.py seed_plans' first." A `CommandError` causes the management command to exit with a non-zero status code and print the error message to stderr, which is the correct behaviour for a prerequisite failure.

Store the retrieved Plan instance in a local variable.

### Step 6: Read Owner Credentials From Environment Variables

Read the owner's email from the `SEED_OWNER_EMAIL` environment variable using `os.environ.get("SEED_OWNER_EMAIL", "owner@dilani.example.com")`. Use the default value only for convenience; in team setups, the actual email should be set in the local `.env` file.

Read the owner's plain-text password from the `SEED_OWNER_PASSWORD` environment variable. Do not provide a default for the password. If the variable is not set, raise a `CommandError` with the message "SEED_OWNER_PASSWORD environment variable is required for seed_sample_tenant."

Hash the plain-text password immediately using Django's `make_password()` function. Store the hashed result. Discard the plain-text password variable by reassigning it to `None` after hashing. This minimises the time the unhashed password is in memory and prevents accidental logging.

### Step 7: Create the Tenant Record

Inside the `with transaction.atomic()` block (established in Step 10), create the Tenant record using `Tenant.objects.create()` with the following field values:

- `name`: "Dilani Boutique"
- `slug`: "dilani"
- `status`: `TenantStatus.ACTIVE`
- `settings`: A Python dictionary with exactly the following keys and values:
  - `currency`: "LKR"
  - `timezone`: "Asia/Colombo"
  - `vatRate`: 18
  - `ssclRate`: 2.5
  - `receiptFooter`: "Thank you for shopping at Dilani Boutique!"

Store the returned Tenant instance in a local variable named `tenant`.

### Step 8: Create the Owner User Record

Still inside the `with transaction.atomic()` block, create the owner CustomUser record using `CustomUser.objects.create()` with the following field values:

- `email`: the email string read from `SEED_OWNER_EMAIL`.
- `password`: the hashed password string from Step 6.
- `role`: "OWNER" (or use the equivalent enum value from the accounts models if one exists).
- `is_active`: True
- `tenant`: the `tenant` instance created in Step 7 (or `tenant.id` if the field is a UUIDField rather than a ForeignKey, as determined by the approach taken in Task 01.03.01 Step 7).

Store the returned CustomUser instance in a local variable named `owner`.

### Step 9: Create the Active Subscription Record

Still inside the `with transaction.atomic()` block, compute billing dates. Set `now` to `datetime.now(tz=timezone.utc)`. Set `period_end` to `now + timedelta(days=30)`.

Create the Subscription record using `Subscription.objects.create()` with the following field values:

- `tenant`: the `tenant` instance.
- `plan`: the plan instance resolved in Step 5.
- `status`: `SubscriptionStatus.ACTIVE`
- `current_period_start`: `now`
- `current_period_end`: `period_end`
- `next_billing_date`: `period_end`

### Step 10: Wrap All Creates in an Atomic Transaction

Restructure the three create operations from Steps 7, 8, and 9 so that they all execute inside a single `with transaction.atomic():` block. The environment guard (Step 3) and the idempotency check (Step 4) and the plan resolution (Step 5) and the credential reading (Step 6) should all happen before the `with transaction.atomic():` block, outside of it.

By keeping only the three database writes inside the atomic block, you ensure that if the Subscription creation fails (for example, because of an unexpected constraint), both the Tenant and the CustomUser records are rolled back as well, leaving the database in a clean state.

After the `with transaction.atomic():` block, write success messages to stdout:

- "Created tenant: Dilani Boutique (slug: dilani)" with `self.style.SUCCESS`.
- "Created owner account: [email]" with `self.style.SUCCESS`.
- "Created active Pro subscription for Dilani Boutique" with `self.style.SUCCESS`.
- "Sample tenant seed complete." with `self.style.SUCCESS`.

### Step 11: Add a Makefile Target

Open `backend/Makefile`. Add a new target named `seed-sample-tenant`. The target should set the `SEED_SAMPLE_TENANT=true` environment variable inline and run the management command via Poetry: `SEED_SAMPLE_TENANT=true poetry run python manage.py seed_sample_tenant`.

Also add a combined target named `seed-all` that chains the three seed commands in the correct order: `seed-superadmin`, then `seed-plans`, then `seed-sample-tenant`. This provides a single command that completely seeds a fresh development database.

Add a comment above the `seed-sample-tenant` target explaining that it requires `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` to be set in the environment or the Makefile.

### Step 12: Document the Full Seed Workflow in the Backend README

Open `backend/README.md`. Locate the "Getting Started" or "Development Setup" section. Add a subsection titled "Seeding the Development Database" that documents the complete seed workflow.

The documentation should cover the following steps in order, written as numbered prose instructions:

1. Ensure all migrations are applied by running the Django migrate management command with Poetry.
2. Copy the example environment file to create a local `.env` file. Set the `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` variables.
3. Optionally, set the `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` variables for the platform super-admin account.
4. Run `make seed-superadmin` to create the platform super-admin account (or the equivalent Poetry management command invocation).
5. Run `make seed-plans` to create the subscription plans.
6. Run `make seed-sample-tenant` (with `SEED_SAMPLE_TENANT=true` and `SEED_OWNER_EMAIL` set) to create the Dilani Boutique sample tenant.
7. Or run `make seed-all` to execute all three steps in sequence.

Document the expected result: after running all three commands, the database contains one super-admin user, two subscription plans, one active tenant (Dilani Boutique), one owner user linked to that tenant, and one active subscription.

---

## Expected Output

After completing this task, the following artifacts exist:

- `backend/apps/tenants/management/commands/seed_sample_tenant.py` — the idempotent, environment-guarded management command.
- `backend/Makefile` updated with `seed-sample-tenant` and `seed-all` targets.
- `backend/README.md` updated with the full seeding workflow documentation.
- Running `SEED_SAMPLE_TENANT=true SEED_OWNER_EMAIL=owner@example.com SEED_OWNER_PASSWORD=password123 poetry run python manage.py seed_sample_tenant` creates three records: Tenant, CustomUser, and Subscription.

---

## Validation

- [ ] Running `poetry run python manage.py seed_sample_tenant` without setting `SEED_SAMPLE_TENANT=true` prints the skip message and creates no database records.
- [ ] Running the command with `SEED_SAMPLE_TENANT=true` but without `SEED_OWNER_PASSWORD` set raises a CommandError.
- [ ] Running the command with all required variables set creates the Dilani Boutique tenant, owner user, and active subscription.
- [ ] Running the command a second time with the same inputs prints the "already exists" skip message and creates no duplicate records.
- [ ] Running `poetry run python manage.py seed_sample_tenant` before running `seed_plans` prints a CommandError directing the user to run `seed_plans` first.
- [ ] The created Tenant record has `status=ACTIVE`, `slug="dilani"`, and a `settings` JSON object with `currency="LKR"` and `timezone="Asia/Colombo"`.
- [ ] The created Subscription record has `status=ACTIVE`, is linked to the Pro POS + WhatsApp plan, and has a `next_billing_date` approximately 30 days from the current timestamp.
- [ ] Running `make seed-all` (with appropriate environment variables set) runs all three seed commands successfully on a fresh database.
- [ ] The Django admin shows the Dilani Boutique tenant, its owner user, and its subscription after seeding.

---

## Notes

- The sample tenant's slug "dilani" is used as the lookup key for the idempotency check. Never change this slug in the seed command without also updating the check, or the idempotency will break and a duplicate may be created.
- The `make_password()` call in Step 6 uses Django's default password hashing algorithm (currently PBKDF2-SHA256 with 600,000 iterations as of recent Django versions). The resulting hash is what gets stored in the database. The plain-text password is never persisted.
- The seed command intentionally uses hard-coded values for the tenant name, slug, and store settings. These represent a known, consistent development fixture. If developers need customised sample data, they should create additional management commands rather than modifying `seed_sample_tenant`, to preserve the guaranteed state of the standard development fixture.
- The `seed-all` Makefile target is useful in CI/CD pipelines that spin up a fresh database for integration tests. The target encodes the correct execution order as a project convention, preventing developers from accidentally running `seed_sample_tenant` before `seed_plans` and encountering the CommandError.
