# LankaCommerce — Final Launch Checklist & Handoff
*Task 05.03.12 — Go-Live Document*

---

## Environment Validation

### Database
- [ ] `DATABASE_URL` set in Vercel environment pointing to live PostgreSQL
- [ ] `DIRECT_URL` set (non-pooled, for migrate operations)
- [ ] Test connection verified: `python manage.py migrate --check` runs without error
- [ ] Database hosted in Asia Pacific / South Asia region (low latency for Sri Lanka)

### Authentication
- [ ] `SECRET_KEY` is a minimum 50-character cryptographically random string (Django backend)
- [ ] `NEXT_PUBLIC_API_BASE_URL` set to production backend URL (`https://api.lankacommerce.com`)
- [ ] JWT signing keys (`ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`) are unique production values
- [ ] No placeholder/default secret values in any production environment variable

### Sentry
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in Vercel (all environments)
- [ ] `SENTRY_AUTH_TOKEN` set in Vercel (Production + Preview)
- [ ] `SENTRY_DSN` set in Django production settings
- [ ] Test error event received in Sentry dashboard from a Preview deployment
- [ ] Source maps confirmed as uploaded in Sentry release

### Payments (PayHere)
- [ ] `PAYHERE_MERCHANT_ID` set to **live** (not sandbox) credentials
- [ ] `PAYHERE_MERCHANT_SECRET` set to live value
- [ ] `PAYHERE_MODE` = `"live"` in production environment variables
- [ ] PayHere `notify_url` (webhook callback) registered in PayHere merchant dashboard
- [ ] Final sandbox end-to-end test passes **before** live key swap

### WhatsApp Messaging
- [ ] `WHATSAPP_API_TOKEN` set in production
- [ ] `WHATSAPP_PHONE_NUMBER_ID` set in production
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` set and registered with Meta
- [ ] Test WhatsApp message delivered successfully to a real number

### Cron Jobs
- [ ] `CRON_SECRET` set in Vercel environment variables
- [ ] All cron jobs listed in Vercel project Cron Jobs tab:
  - `check-subscriptions` (daily)
  - `birthday-messages` (daily)
  - `payment-reminders` (daily)
  - `webhook-retry` (every 5 minutes)
- [ ] Manual POST to `/api/cron/check-subscriptions` with correct Authorization header returns HTTP 200

---

## Feature Smoke Tests
*Perform on live production deployment using demo tenant (`lanka-demo`)*

### Authentication
- [ ] Navigate to app root → redirects to login page
- [ ] Log in with OWNER PIN → redirects to dashboard
- [ ] Log out → session destroyed, redirected to login
- [ ] Log in as CASHIER1 → only CASHIER-permitted menu items visible

### Product Management
- [ ] Create a new product with two size variants → appears in product list
- [ ] Edit product name → persists after page refresh
- [ ] Adjust stock for a variant → new quantity displays correctly

### POS Terminal
- [ ] Search "Silk Saree" → results appear in < 200ms
- [ ] Add two products to cart, apply percentage discount
- [ ] Complete sale with Cash → receipt modal shows correct totals
- [ ] Sale appears in sales history list

### Returns
- [ ] Open recent sale → initiate return on one line item
- [ ] Return record appears in returns log
- [ ] Stock quantity restored for returned variant

### Reports
- [ ] Revenue Report: all 3 months of demo data visible in chart
- [ ] Export revenue report as CSV → downloads and opens cleanly
- [ ] Commission Report: both cashiers show non-zero commissions

### Billing
- [ ] Billing page shows demo tenant's current plan
- [ ] "Upgrade" flow opens PayHere checkout (sandbox)
- [ ] Cancel checkout → subscription status unchanged

### Webhooks
- [ ] Register test endpoint at `/settings/webhooks`
- [ ] Complete a sale → `sale.completed` POST received at webhook.site within 5 seconds
- [ ] `X-LankaCommerce-Signature` header present on received request

---

## Performance Baselines

| Feature | Target | Verified |
|---|---|---|
| POS product search (debounced) | < 200ms | [ ] |
| Sale completion (cart → receipt) | < 2 seconds | [ ] |
| Reports dashboard load (3 months) | < 5 seconds | [ ] |
| Customer list load (10 customers) | < 500ms | [ ] |
| Login → dashboard (after auth) | < 1 second | [ ] |

---

## Security Checklist

- [ ] No `.env` / `.env.local` files committed to Git
- [ ] `SECRET_KEY` is not a placeholder — verify in production settings
- [ ] `CRON_SECRET` set; cron routes reject unauthorized requests with HTTP 401
- [ ] Webhook endpoint URLs validated as HTTPS only at API layer
- [ ] No production API route returns raw database error messages in response body
- [ ] Rate limiting active on `/api/auth/token/` (login) endpoint
- [ ] `/api/test-error` returns HTTP 404 in production build
- [ ] `SENTRY_AUTH_TOKEN` is NOT prefixed `NEXT_PUBLIC_` (not exposed to browser)
- [ ] RBAC guards verified for all four roles: CASHIER, STOCK_CLERK, MANAGER, OWNER
- [ ] No `console.log` statements output sensitive data in production

---

## Go-Live Execution Sequence

> ⚠️ **Execute steps in order. Do not skip steps.**

**Step 1 — Final code merge**
Merge `main` branch; confirm Vercel production deployment is green.

**Step 2 — Database migration**
```bash
python manage.py migrate --settings=config.settings.production
```
Confirm output shows: `No migrations to apply.` (or lists only new migrations that apply cleanly).

**Step 3 — Demo seed**
```bash
python manage.py seed_demo_comprehensive --settings=config.settings.production
```
Monitor log — should complete in under 60 seconds.

**Step 4 — DNS propagation**
```bash
nslookup lanka-demo.lankacommerce.com
```
Confirm resolves to Vercel edge network IP. Wait up to 24 hours if not yet propagated.

**Step 5 — Smoke tests**
Execute all feature smoke tests from section above on the live production URL.

**Step 6 — PayHere live key swap** *(irreversible)*
Update in Vercel:
- `PAYHERE_MERCHANT_SECRET` → live production value
- `PAYHERE_MODE` → `"live"`

Trigger a new Vercel deployment. **Never use sandbox credentials against the production database again.** Retain sandbox credentials in a secure vault for staging/preview use only.

**Step 7 — Sentry production verification**
Confirm Sentry dashboard shows events tagged `environment: "production"`.

**Step 8 — Announce**
Platform is live. Update project status to **Live**. Notify all stakeholders.

---

## Post-Launch Monitoring (First 7 Days)

| Day | Action |
|---|---|
| Daily | Check Sentry Issues dashboard — investigate if any event type exceeds 5/hour |
| Daily | Review Vercel Cron Job execution logs for `check-subscriptions` |
| Day 3 | Verify `birthday-messages` and `payment-reminders` executed at least once |
| Day 5 | Review Vercel Function logs for any functions exceeding 10-second timeout |
| Day 7 | Check database query counts for N+1 patterns under real-world traffic |
| Day 30 | Reconcile PayHere transaction log against LankaCommerce subscription records |

---

## Project Completion Summary

**LankaCommerce** is a multi-tenant SaaS Point-of-Sale system built for Sri Lankan clothing boutiques.

### Technology Stack
| Layer | Technology |
|---|---|
| Backend | Django 6 + Django REST Framework, Python 3.14 |
| Frontend | Next.js 15, TypeScript (strict mode), Tailwind CSS v4 |
| Database | PostgreSQL (production), SQLite (development) |
| Auth | JWT (access + refresh tokens), PIN-based quick login |
| State | TanStack Query v5, Zustand |
| Forms | React Hook Form + Zod v4 + standardSchemaResolver |
| Payments | PayHere (Sri Lanka) |
| Messaging | WhatsApp Business API (Meta) |
| Monitoring | Sentry (frontend + backend) |
| Deployment | Vercel (frontend), Railway/Render (backend) |

### Project Scope (5 Phases, 17 Sub-phases)
- **Phase 01 — Foundation:** Project setup, Auth + RBAC, SaaS multi-tenancy
- **Phase 02 — Catalog:** Product data models, Product management UI, Stock control
- **Phase 03 — Terminal:** POS core, Payments + receipts, Returns + exchanges
- **Phase 04 — Operations:** CRM + suppliers, Staff + promotions + expenses, Hardware + audit
- **Phase 05 — Platform:** Reporting + analytics, Billing + WhatsApp, Polish + deployment

### Documentation
The `document-series/` directory contains 80+ task documents serving as the authoritative implementation guide for any developer maintaining or extending the platform.

---

*Checklist prepared by: GitHub Copilot | Date: see Git commit*
*Sign-off required from: Product Owner before Step 6 (PayHere key swap)*
