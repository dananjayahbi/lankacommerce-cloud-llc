# Demo Credentials

This document lists all seeded demo accounts for local development and demonstration purposes.

> **WARNING:** These are development/demo credentials only. Do **NOT** use these in production.

---

## How to Seed

Run the following commands from the `backend/` directory:

```bash
# 1. Seed the superadmin account
python manage.py seed_superadmin

# 2. Seed the demo store + staff + data
python manage.py seed_demo_comprehensive
```

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
- **Login URL:** `/` → redirects to `/store/dashboard`

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
