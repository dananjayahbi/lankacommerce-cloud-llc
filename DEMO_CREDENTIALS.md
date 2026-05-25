# Demo Credentials

This document lists all seeded demo accounts for local development and demonstration purposes.

> **WARNING:** These are development/demo credentials only. Do **NOT** use these in production.

---

## How to Seed

Run the following commands from the `backend/` directory:

```bash
# 1. Seed billing plans (required for self-registration to work)
python manage.py seed_plans

# 2. Seed the superadmin account
python manage.py seed_superadmin

# 3. Seed the demo store + staff + data
python manage.py seed_demo_comprehensive
```

---

## Self-Service Business Registration (New!)

Any business can register their own store at:

```
http://localhost:3000/register
```

This creates a new tenant, owner account, and a 30-day free trial subscription in one step.
After registration, the store is accessible at:

```
http://<slug>.localhost:3000
```

**Dev setup for subdomain access:**

The backend attempts to update your Windows hosts file automatically, but may require admin rights.
If it fails, add the entry manually (run as Administrator):

```
echo 127.0.0.1 <slug>.localhost >> C:\Windows\System32\drivers\etc\hosts
```

Or use the Django management command (from `backend/` as admin):

```bash
python manage.py add_tenant_host <slug>
# or add all tenants at once:
python manage.py add_tenant_host --all
```

**Test tenant created during development:**

| Field        | Value                           |
|--------------|---------------------------------|
| Store Name   | Test Business                   |
| Slug         | `test-business`                 |
| Login URL    | `http://test-business.localhost:3000` |
| Email        | `testowner@testbusiness.com`    |
| Password     | `TestPass123`                   |
| Role         | Owner                           |
| PIN          | _(not set — see note below)_    |

> **PIN note:** Accounts created via self-registration do not have a PIN set. If the screen lock activates (after 10 minutes of inactivity), click "Cancel" in the PIN modal to reveal a "Sign in with password instead" link, or click "Sign in with email & password" on the lock screen to return to the login page. You can set a PIN for any staff member from **Store → Staff → [member] → PIN Management**.

---

## SuperAdmin Account

Accesses the SuperAdmin panel at `/superadmin/`.

| Field    | Value                          |
|----------|-------------------------------|
| Email    | `superadmin@lankacommerce.dev` |
| Password | `changeme123!`                 |
| Role     | Super Admin                    |

> The superadmin password can be overridden via the `SEED_SUPERADMIN_PASSWORD` environment variable before running `seed_superadmin`.

---

## Demo Store — Lanka Boutique (Demo)

- **Tenant slug:** `lanka-demo`
- **Tenant name:** Lanka Boutique (Demo)
- **Login URL (subdomain):** `http://lanka-demo.localhost:3000`

All staff accounts share the same login password:

| Field    | Value        |
|----------|-------------|
| Password | `Demo@2024!` |

### Staff Accounts

| Name                   | Email                    | Role        | POS PIN |
|------------------------|--------------------------|-------------|---------|
| Kavindi Perera         | `owner@lankademo.com`    | Owner       | `1111`  |
| Chamara Bandara        | `manager@lankademo.com`  | Manager     | `2222`  |
| Dilani Senanayake      | `cashier1@lankademo.com` | Cashier     | `3333`  |
| Ruwani Fernando        | `cashier2@lankademo.com` | Cashier     | `4444`  |
| Asela Wickramasinghe   | `stock@lankademo.com`    | Stock Clerk | `5555`  |

**Role access summary:**

| Role        | Dashboard | POS | Inventory | Stock Control | Reports | Staff | Settings |
|-------------|-----------|-----|-----------|---------------|---------|-------|----------|
| Owner       | ✅        | ✅  | ✅        | ✅            | ✅      | ✅    | ✅       |
| Manager     | ✅        | ✅  | ✅        | ✅            | ✅      | ✅    | ✅       |
| Cashier     | ✅        | ✅  | ✅        | ❌            | ❌      | ❌    | ❌       |
| Stock Clerk | ✅        | ❌  | ✅        | ✅            | ❌      | ❌    | ❌       |

---

## Seeded Demo Data

The `seed_demo_comprehensive` command creates the following demo data in the `lanka-demo` tenant:

- **30 products** across 5 categories: Sarees, Kurtis, Trousers, Dresses, Accessories
- **10 customers** with Sri Lankan names
- **5 suppliers**
- **1000+ sales** spread over the last 90 days
- **~8% return rate** on sales
- **Purchase orders** linked to suppliers
- **Expenses** for rent, utilities, and miscellaneous costs
- **Attendance & shift** records for all staff

The seeder is **idempotent** — running it multiple times skips already-seeded data (checks by tenant slug).

---

## Local Development URLs

| Service    | URL                              |
|------------|----------------------------------|
| Frontend   | `http://localhost:3000`          |
| Backend    | `http://localhost:8000`          |
| API Docs   | `http://localhost:8000/api/`     |
| Superadmin | `http://localhost:3000/superadmin/dashboard` |
| Marketing  | `http://localhost:3000/`         |
| Register   | `http://localhost:3000/register` |

**Tenant store (after adding to hosts file):**

```
http://<slug>.localhost:3000         → redirects to /login
http://<slug>.localhost:3000/login   → tenant-branded login
http://<slug>.localhost:3000/store/dashboard  → store dashboard
```
