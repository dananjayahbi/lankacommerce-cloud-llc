# Task 01.02.12 — Seed Super Admin Account

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.12 |
| Title | Seed Super Admin Account |
| Depends On | Task 01.02.01 — CustomUser model · Task 01.02.06 — RBAC permissions |
| Working Directory | `backend/` |
| Stack | Django Management Commands · Python |
| Estimated Effort | 20 minutes |

---

## Objective

Create a Django management command that seeds the initial Super Admin account into the LankaCommerce database. The command is idempotent — running it multiple times is safe and does not create duplicate accounts or overwrite an existing Super Admin's password.

This command is used during:
- Initial server setup / first deployment
- Development environment bootstrapping
- CI/CD pipeline seeding steps

---

## Instructions

### Step 1 — Create the Management Command Directory Structure

Django management commands must be placed inside an `app/management/commands/` directory with `__init__.py` files:

```bash
mkdir -p backend/apps/accounts/management/commands
touch backend/apps/accounts/management/__init__.py
touch backend/apps/accounts/management/commands/__init__.py
```

---

### Step 2 — Write the Management Command

Create `backend/apps/accounts/management/commands/seed_superadmin.py`:

```python
"""
LankaCommerce — Seed Super Admin Account

Django management command for creating the initial Super Admin user.
This command is idempotent: running it when a user with the given email
already exists is a no-op (no error, no overwrite).

Usage:
    poetry run python manage.py seed_superadmin

Environment Variables (optional — falls back to defaults if not set):
    SEED_SUPERADMIN_EMAIL       Default: superadmin@lankacommerce.dev
    SEED_SUPERADMIN_PASSWORD    Default: changeme123!

Security Note:
    Always override the default password in production by setting
    SEED_SUPERADMIN_PASSWORD in your environment or .env file.
    The default password is intentionally weak to signal that it must
    be changed.
"""

import os

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import CustomUser
from apps.accounts.constants.permissions import ALL_PERMISSIONS


class Command(BaseCommand):
    help = (
        "Seeds the initial Super Admin account for LankaCommerce. "
        "Idempotent: safe to run multiple times."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help=(
                "Email address for the Super Admin account. "
                "Overrides the SEED_SUPERADMIN_EMAIL environment variable."
            ),
        )
        parser.add_argument(
            "--password",
            type=str,
            default=None,
            help=(
                "Password for the Super Admin account. "
                "Overrides the SEED_SUPERADMIN_PASSWORD environment variable. "
                "WARNING: Avoid passing passwords on the command line in production."
            ),
        )

    def handle(self, *args, **options):
        # Resolve email
        email = (
            options.get("email")
            or os.environ.get("SEED_SUPERADMIN_EMAIL")
            or "superadmin@lankacommerce.dev"
        )
        email = email.lower().strip()

        # Resolve password
        password = (
            options.get("password")
            or os.environ.get("SEED_SUPERADMIN_PASSWORD")
            or "changeme123!"
        )

        self.stdout.write(
            self.style.NOTICE(
                f"[seed_superadmin] Checking for existing Super Admin: {email}"
            )
        )

        # Idempotency check — do not overwrite if already exists
        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"[seed_superadmin] Super Admin already exists: {email} — skipping."
                )
            )
            return

        # Create the Super Admin using the custom manager
        try:
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
            )
        except Exception as exc:
            raise CommandError(
                f"[seed_superadmin] Failed to create Super Admin: {exc}"
            ) from exc

        # Assign all known permissions to the Super Admin
        user.permissions_list = ALL_PERMISSIONS
        user.role = "SUPER_ADMIN"
        user.save(update_fields=["permissions_list", "role"])

        self.stdout.write(
            self.style.SUCCESS(
                f"[seed_superadmin] Super Admin created successfully: {email}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "[seed_superadmin] IMPORTANT: Change the default password before "
                "deploying to production.\n"
                "  Set SEED_SUPERADMIN_PASSWORD in your .env file."
            )
        )
```

---

### Step 3 — Document Environment Variables

Open `backend/.env.example` and add the Super Admin seed variables:

```dotenv
# ---------------------------------------------------------------------------
# Super Admin Seed
# ---------------------------------------------------------------------------
# Used by: poetry run python manage.py seed_superadmin
# IMPORTANT: Override these in production with strong values.
SEED_SUPERADMIN_EMAIL=superadmin@lankacommerce.dev
SEED_SUPERADMIN_PASSWORD=changeme123!
```

Open `backend/.env` (your local dev environment file) and add the same variables. You can keep the defaults for local development.

---

### Step 4 — Add a Makefile Target

If a `Makefile` does not yet exist at the project root, create one. If it already exists, append the following targets:

Create `Makefile` (at the project root, not inside `backend/`):

```makefile
# LankaCommerce — Project Makefile
# Run commands from the project root directory.

.PHONY: seed-superadmin migrate migrations shell server

# Seed the initial Super Admin account
seed-superadmin:
	cd backend && poetry run python manage.py seed_superadmin

# Apply all pending migrations
migrate:
	cd backend && poetry run python manage.py migrate

# Create migrations for all apps (dry-check)
migrations:
	cd backend && poetry run python manage.py makemigrations

# Open Django shell
shell:
	cd backend && poetry run python manage.py shell

# Start the Django development server
server:
	cd backend && poetry run python manage.py runserver
```

---

### Step 5 — Run the Seed Command

Apply all migrations first (if you haven't already):

```bash
cd backend
poetry run python manage.py migrate
```

Run the seed command:

```bash
cd backend
poetry run python manage.py seed_superadmin
```

Expected output:

```
[seed_superadmin] Checking for existing Super Admin: superadmin@lankacommerce.dev
[seed_superadmin] Super Admin created successfully: superadmin@lankacommerce.dev
[seed_superadmin] IMPORTANT: Change the default password before deploying to production.
  Set SEED_SUPERADMIN_PASSWORD in your .env file.
```

Run the command a second time to confirm idempotency:

```bash
cd backend
poetry run python manage.py seed_superadmin
```

Expected output (no error, no second user created):

```
[seed_superadmin] Checking for existing Super Admin: superadmin@lankacommerce.dev
[seed_superadmin] Super Admin already exists: superadmin@lankacommerce.dev — skipping.
```

---

### Step 6 — Verify the Seeded Account in the Django Shell

```bash
cd backend
poetry run python manage.py shell -c "
from apps.accounts.models import CustomUser
user = CustomUser.objects.get(email='superadmin@lankacommerce.dev')
print('Email:       ', user.email)
print('Role:        ', user.role)
print('Is staff:    ', user.is_staff)
print('Is superuser:', user.is_superuser)
print('Is active:   ', user.is_active)
print('Session ver: ', user.session_version)
print('Permissions: ', len(user.permissions_list), 'permissions assigned')
print('UUID:        ', user.id)
"
```

Expected output:

```
Email:        superadmin@lankacommerce.dev
Role:         SUPER_ADMIN
Is staff:     True
Is superuser: True
Is active:    True
Session ver:  1
Permissions:  <N> permissions assigned
UUID:         <some-uuid>
```

---

### Step 7 — Test Login with Seeded Credentials

Start the Django development server:

```bash
cd backend
poetry run python manage.py runserver
```

Test the login endpoint with the seeded credentials:

```bash
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@lankacommerce.dev", "password": "changeme123!"}' \
  | python -m json.tool
```

Expected response:

```json
{
  "access": "<access-token>",
  "refresh": "<refresh-token>"
}
```

Decode the access token to confirm the custom claims:

```bash
ACCESS_TOKEN="<paste access token here>"
echo $ACCESS_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | python -m json.tool
```

Expected claims:

```json
{
  "token_type": "access",
  "exp": <timestamp>,
  "iat": <timestamp>,
  "jti": "<uuid>",
  "user_id": "<uuid>",
  "email": "superadmin@lankacommerce.dev",
  "role": "SUPER_ADMIN",
  "permissions": ["...", "..."],
  "tenant_id": null,
  "session_version": 1
}
```

Open the Next.js app and navigate to `/login`. Log in with `superadmin@lankacommerce.dev` / `changeme123!`. You should be redirected to the `/superadmin/dashboard` route (as per the `getRedirectPath("SUPER_ADMIN")` logic defined in Task 01.02.03).

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      management/
        __init__.py
        commands/
          __init__.py
          seed_superadmin.py    ← Idempotent management command
  .env.example                  ← SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD added

Makefile                        ← seed-superadmin, migrate, shell targets
```

---

## Validation

- [ ] `backend/apps/accounts/management/__init__.py` exists
- [ ] `backend/apps/accounts/management/commands/__init__.py` exists
- [ ] `backend/apps/accounts/management/commands/seed_superadmin.py` exists
- [ ] `poetry run python manage.py seed_superadmin` creates a Super Admin user on first run
- [ ] Running the command a second time outputs "already exists — skipping" without error
- [ ] The seeded user has `role = "SUPER_ADMIN"`, `is_staff = True`, `is_superuser = True`
- [ ] The seeded user has `is_active = True`
- [ ] The seeded user has `session_version = 1`
- [ ] The seeded user's `permissions_list` contains all permissions from `ALL_PERMISSIONS`
- [ ] `SEED_SUPERADMIN_EMAIL` and `SEED_SUPERADMIN_PASSWORD` are documented in `.env.example`
- [ ] `backend/.env` contains the seed variables for local development
- [ ] `Makefile` has a `seed-superadmin` target that invokes the management command
- [ ] `POST /api/auth/login/` with seeded credentials returns HTTP 200 with access and refresh tokens
- [ ] Decoded access token includes `email`, `role = "SUPER_ADMIN"`, `permissions`, `session_version = 1`
- [ ] Logging in via the Next.js frontend redirects to `/superadmin/dashboard`
- [ ] Django admin at `http://localhost:8000/admin/` is accessible with the seeded account

---

## Notes

- The `create_superuser` method is defined on `CustomUserManager` from Task 01.02.01. It sets `is_staff=True` and `is_superuser=True` automatically. Ensure this manager method is correctly implemented before running this seed command.
- `tenant_id` for a Super Admin is intentionally `null`. The Super Admin account is not scoped to any tenant — it has platform-wide access. This is correct and expected.
- In production CI/CD pipelines, add `make migrate && make seed-superadmin` as a post-deploy step. The idempotency check ensures the command is safe to run on every deployment.
- Never commit a `.env` file with real passwords to source control. The `.env.example` file contains only placeholder values and is safe to commit.
- After the system is live, create tenant-specific OWNER accounts through the LankaCommerce admin UI rather than using this seed command. The seed command is only for the platform-level Super Admin.
