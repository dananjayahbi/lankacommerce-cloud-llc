# LankaCommerce — Django Backend

## Requirements

- Python 3.14+
- Django 6.0.5
- Django REST Framework 3.17.1

## Getting Started

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements/development.txt
python manage.py migrate
```

---

## Seeding the Development Database

After running migrations, use the management commands below to populate a fresh database.

### 1. Copy environment file and set credentials

```bash
cp .env.example .env
```

Edit `.env` and set the following variables before seeding:

```dotenv
SEED_SUPERADMIN_EMAIL=admin@lankacommerce.lk
SEED_SUPERADMIN_PASSWORD=YourStrongPassword1!

SEED_OWNER_EMAIL=owner@dilani.example.com
SEED_OWNER_PASSWORD=OwnerPassword1!
```

### 2. Create the platform super-admin account

```bash
make seed-superadmin
# or: python manage.py seed_superadmin
```

### 3. Create the subscription plans

```bash
make seed-plans
# or: python manage.py seed_plans
```

### 4. Create the Dilani Boutique sample tenant

```bash
SEED_SAMPLE_TENANT=true SEED_OWNER_EMAIL=owner@dilani.example.com SEED_OWNER_PASSWORD=OwnerPassword1! make seed-sample-tenant
# or: make seed-sample-tenant  (reads from .env automatically with dotenv-loaded shells)
```

### 5. Or run all three in sequence

```bash
make seed-all
```

### Expected state after seeding

| Model | Record |
|---|---|
| CustomUser (SUPER_ADMIN) | `SEED_SUPERADMIN_EMAIL` — no tenant |
| Plan | Basic POS (LKR 4,999/mo) |
| Plan | Pro POS + WhatsApp (LKR 7,999/mo) |
| Tenant | Dilani Boutique (slug: `dilani`, status: ACTIVE) |
| CustomUser (OWNER) | `SEED_OWNER_EMAIL` — linked to Dilani Boutique |
| Subscription | Active Pro subscription for Dilani Boutique, billed monthly |

---

## Makefile Targets

| Target | Description |
|---|---|
| `make runserver` | Start the development server |
| `make migrate` | Apply all pending migrations |
| `make makemigrations` | Generate new migration files |
| `make seed-superadmin` | Seed the SUPER_ADMIN account |
| `make seed-plans` | Seed subscription plans |
| `make seed-sample-tenant` | Seed the Dilani Boutique sample tenant |
| `make seed-all` | Run all seed commands in order |
| `make lint` | Run Ruff linter |
| `make format` | Format with Black + isort |

---

## Project Structure

```
backend/
  apps/
    accounts/   — CustomUser, AuditLog, auth views & JWT
    tenants/    — Tenant, Plan, Subscription, Invoice models & CRUD API
    core/       — Health check endpoint
  config/
    settings/   — base.py, development.py, production.py
    urls.py
```
