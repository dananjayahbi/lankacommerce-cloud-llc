# Task 01.03.06 — Create Subscription Plan Models and Seed

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.06 |
| Title | Create Subscription Plan Models and Seed |
| Working Directory | `backend/` |
| Prerequisites | Task 01.03.01 (tenants app and Plan model created and migrated) |
| Estimated Time | 2 hours |
| Status | [ ] Not Started |

---

## Objective

Establish the two LankaCommerce subscription plans in the database and provide a reproducible, idempotent management command that any developer or deployment pipeline can run to ensure the plans exist. This task also confirms that the Django REST Framework plan listing endpoint correctly filters and orders plan records. After completing this task, a fresh development database can be brought to a fully seeded plan state with a single command.

---

## Instructions

### Step 1: Create the Management Command Directory Structure

Navigate to `backend/apps/tenants/`. Verify that the `management/` directory does not already exist. If it does not, create the following directory structure:

- `backend/apps/tenants/management/` — the top-level management directory.
- `backend/apps/tenants/management/__init__.py` — an empty Python init file marking the directory as a Python package.
- `backend/apps/tenants/management/commands/` — the commands subdirectory where Django discovers management commands.
- `backend/apps/tenants/management/commands/__init__.py` — another empty init file.

Django discovers management commands by scanning each installed app's `management/commands/` directory. Every Python file in that directory (excluding files whose name begins with an underscore) is treated as a management command, where the command name equals the filename without the `.py` extension.

### Step 2: Create the seed_plans Command File

Create the file `backend/apps/tenants/management/commands/seed_plans.py`.

Inside this file, import `BaseCommand` from `django.core.management.base`. Import the `Plan` model from `apps.tenants.models`. Import `Decimal` from Python's built-in `decimal` module.

Define a class named `Command` inheriting from `BaseCommand`. Set the `help` class attribute to a descriptive string such as "Seeds the two standard subscription plans into the database. Safe to re-run (idempotent via update_or_create)."

Add a `handle` method to the Command class. This method accepts `*args` and `**options` as parameters. All seeding logic lives inside this method.

### Step 3: Define the Basic POS Plan Data

Inside the `handle` method, define the data for the first plan as a Python dictionary. The dictionary should contain the following key-value pairs:

- `description`: A paragraph describing the Basic POS plan as suitable for small independent retailers who need reliable point-of-sale and inventory tracking without advanced features.
- `price_monthly`: A Decimal value of 4999.00 (representing LKR 4,999 per month).
- `features`: A Python list containing exactly five strings: "POS Terminal", "Inventory Management", "Sales History", "Basic Reports", and "Up to 3 Staff Accounts".
- `is_active`: The boolean value True.
- `sort_order`: The integer 1.

The lookup key for this plan's update_or_create call will be the plan `name`, which is "Basic POS".

### Step 4: Define the Pro POS + WhatsApp Plan Data

Define a second dictionary for the second plan. The dictionary should contain:

- `description`: A paragraph describing the Pro plan as suitable for growing retail businesses that need WhatsApp notifications for order updates, customer messaging, multi-staff management, and advanced reporting.
- `price_monthly`: A Decimal value of 7999.00 (representing LKR 7,999 per month).
- `features`: A Python list containing exactly six strings: "Everything in Basic POS", "WhatsApp Notifications", "Advanced Analytics & Reports", "Unlimited Staff Accounts", "Customer Relationship Management", and "Priority Support".
- `is_active`: The boolean value True.
- `sort_order`: The integer 2.

The lookup key for this plan's update_or_create call will be the plan `name`, which is "Pro POS + WhatsApp".

### Step 5: Implement Idempotent Update-or-Create Logic

For each plan's data dictionary, call Django's `Plan.objects.update_or_create()` method. The first argument is a dictionary containing the lookup field — in this case `name` — and its value. The `defaults` keyword argument receives the remaining data dictionary fields (description, price_monthly, features, is_active, sort_order).

The `update_or_create` method returns a tuple of `(instance, created)` where `created` is a boolean indicating whether a new record was created (True) or an existing record was updated (False). Store both values from the tuple.

This idempotency means the command is safe to run multiple times: on a fresh database it creates both records, and on a database where the plans already exist it updates their fields to match the current definitions in the command. This is critical for deployment pipelines that run seed commands on every release.

### Step 6: Add Logging Output

After each `update_or_create` call, use `self.stdout.write()` to log the result. If `created` is True, write "Created plan: [plan name]" styled with `self.style.SUCCESS`. If `created` is False, write "Updated plan: [plan name]" styled with `self.style.WARNING`.

At the end of the `handle` method, write a summary line: "Plan seeding complete. 2 plans processed." styled with `self.style.SUCCESS`.

Using `self.stdout.write` (rather than Python's `print` function) is the Django-idiomatic way to produce management command output because it respects the `--no-color` and output redirection flags.

### Step 7: Add a Makefile Target

Open `backend/Makefile`. Add a new target named `seed-plans` that runs the seed_plans management command using Poetry. The target should use the `poetry run` prefix so it executes in the project's virtual environment without requiring manual activation. The command executed should be `python manage.py seed_plans`.

If the Makefile does not yet exist, create it. Add a standard `SHELL` variable declaration at the top.

Document the new target with a short comment above it explaining its purpose and that it is safe to re-run.

### Step 8: Run the Command and Verify

From the `backend/` directory, run the seed_plans management command via Poetry. Observe the terminal output and confirm that both "Created plan: Basic POS" and "Created plan: Pro POS + WhatsApp" messages appear.

Open the Django admin interface at `/admin/tenants/plan/`. Confirm that two Plan records are present. Verify that the Basic POS plan shows a price of LKR 4,999 and a features list of five items. Verify that the Pro POS + WhatsApp plan shows a price of LKR 7,999 and a features list of six items.

Run the seed command a second time. Confirm that the output now shows "Updated plan" (not "Created plan") for both plans and that no duplicate records were created in the admin.

### Step 9: Verify the Plans API Endpoint

Open the plans listing view in `backend/apps/tenants/views.py`. Confirm that the `GET /api/plans/` endpoint is implemented and applies the following behaviour:

- It filters the queryset to only include plans where `is_active=True`. Deactivated or legacy plans are not returned.
- It orders the results by `sort_order` ascending, so plans are returned in the intended display order (Basic POS first, Pro second).
- It does not require authentication. The plan listing is a public endpoint used by the provisioning wizard and, in later phases, by public-facing pricing pages.

If the view does not yet implement these filters, add them now. Test the endpoint by making a GET request (via a browser, curl command, or API client) to `http://localhost:8000/api/plans/` and confirming that both plans are returned in the correct order with all expected fields.

---

## Expected Output

After completing this task, the following artifacts exist:

- `backend/apps/tenants/management/__init__.py` — empty Python package marker.
- `backend/apps/tenants/management/commands/__init__.py` — empty Python package marker.
- `backend/apps/tenants/management/commands/seed_plans.py` — idempotent management command that seeds two plan records.
- Two Plan records in the database: "Basic POS" (LKR 4,999, sort_order 1) and "Pro POS + WhatsApp" (LKR 7,999, sort_order 2).
- A `seed-plans` target in `backend/Makefile`.
- The `GET /api/plans/` endpoint returns both plans ordered by sort_order.

---

## Validation

- [ ] Running `poetry run python manage.py seed_plans` inside `backend/` exits with code 0 and prints two "Created plan" lines on a fresh database.
- [ ] Running the command a second time prints two "Updated plan" lines and creates no duplicate records.
- [ ] The Django admin shows exactly two Plan records with the correct prices and feature lists.
- [ ] Making a GET request to `http://localhost:8000/api/plans/` returns a JSON array with two plan objects.
- [ ] The plans in the API response are ordered with Basic POS (sort_order 1) before Pro POS + WhatsApp (sort_order 2).
- [ ] A plan with `is_active=False` (set manually via the admin) does not appear in the `GET /api/plans/` response.
- [ ] Running `make seed-plans` from the `backend/` directory works as an alias for the management command.

---

## Notes

- The `Decimal` type is used for `price_monthly` rather than a Python float to avoid floating-point precision errors in currency arithmetic. Always use `Decimal` for financial values in Python. Django's DecimalField stores values with exact precision in PostgreSQL.
- The features list is stored as a JSON array of plain strings. In the provisioning wizard (Task 01.03.05), the frontend renders this list as bullet points with orange checkmarks. Keeping the list as plain strings gives the most flexibility for future rendering changes without a database migration.
- If you need to add a third plan in the future, simply add a third `update_or_create` call to the `handle` method and increment the summary count. The command remains idempotent for all existing plans.
- The `GET /api/plans/` endpoint being unauthenticated is a deliberate product decision. The plan names and prices are not sensitive information and need to be accessible to the provisioning wizard. If public-facing pricing pages are added in Phase 5, this same endpoint will serve them.
