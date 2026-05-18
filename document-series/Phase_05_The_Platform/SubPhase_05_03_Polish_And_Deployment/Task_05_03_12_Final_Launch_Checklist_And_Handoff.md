# Task 05.03.12 — Final Launch Checklist and Handoff

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.03.12 |
| SubPhase | 05.03 — Production Deployment and Polish |
| Complexity | High |
| Estimated Effort | 1 day (review and verification) |
| Dependencies | All 11 prior tasks in SubPhase 05.03 complete; all prior phases complete |
| Produces | This document serves as the handoff artifact. No additional source files created. |
| Blocked By | All prior tasks |

---

## Objective

This document is the definitive go-live checklist for LankaCommerce. It consolidates environment validation, feature smoke testing, performance baseline assertions, security requirements, and the exact linear sequence of go-live actions into a single reviewable artefact. Upon completing every checklist item and receiving sign-off from the Product Owner, the LankaCommerce project transitions from development to a live production SaaS product. This document also serves as the project completion handoff record for any future maintainer.

---

## Instructions

### Environment Validation Checklist

All items in this section must be confirmed before the deployment step begins.

**Database**: Production `DATABASE_URL` is set in Vercel environment variables pointing to the live PostgreSQL instance. `DIRECT_URL` is set for Prisma Migrate operations (non-pooled connection string). A manual test connection is verified: `pnpm prisma db pull` runs without error against the production database. The production database is hosted in a region geographically close to the majority of tenant users (Asia Pacific or South Asia region recommended for Sri Lanka-based tenants).

**Authentication**: `NEXTAUTH_SECRET` is a minimum 32-character cryptographically random string generated via `openssl rand -base64 32`. `NEXTAUTH_URL` is set to the production canonical URL (`https://lankacommerce.com`). `NEXT_PUBLIC_APP_URL` is set correctly and matches the value used in email link generation.

**Sentry**: `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel for all environments. `SENTRY_AUTH_TOKEN` is set in Vercel for Production and Preview environments. A Vercel preview deployment has been triggered and a test error event received in the Sentry dashboard. Source maps are confirmed as uploaded.

**Payments**: `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` are set for production (not sandbox values). `PAYHERE_MODE` is set to "live" in the production environment. The PayHere `notify_url` (webhook callback URL) is registered in the PayHere merchant dashboard. A final sandbox end-to-end payment test passes before the production key swap.

**Cron Jobs and Messaging**: `CRON_SECRET` is set in Vercel environment variables. `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` are set. All four Vercel Cron Jobs are listed in the Vercel project Cron Jobs tab. A manual POST to `/api/cron/check-subscriptions` with the correct Authorization header returns HTTP 200.

### Feature Smoke Test Checklist

Perform each test on the live production deployment after go-live actions are complete. Use the demo tenant (`lanka-demo.lankacommerce.com`) for all tests.

**Authentication**: Navigate to `lanka-demo.lankacommerce.com` and confirm redirect to login page. Log in with the OWNER PIN and confirm redirect to dashboard. Log out and confirm session destruction. Log in with the CASHIER1 PIN and confirm only CASHIER-permitted menu items are visible.

**Product Management**: Create a new product with two size variants and verify it appears in the product list. Edit the product name and confirm the update persists on page refresh. Adjust stock for a variant and confirm the new quantity displays correctly.

**POS Terminal**: Open the POS terminal and search for "Silk Saree" — verify results appear in under 200 milliseconds. Add two different products to the cart and apply a percentage discount. Complete a sale with Cash payment and confirm the receipt modal appears with correct totals. Verify the completed sale appears in the sales history list.

**Returns**: Open a recent sale from the history and initiate a return on one line item. Confirm the return record appears in the returns log and stock quantity is restored.

**Reports**: Open the Revenue Report and confirm all three months of demo data chart bars are visible. Export the revenue report as a CSV and confirm the file downloads and opens cleanly. Open the Commission Report and verify both cashier users show non-zero commissions.

**Billing**: Open the Billing page and confirm the demo tenant's current plan is displayed. Click "Upgrade to Enterprise" — confirm the PayHere checkout page opens with the sandbox merchant. Close the checkout without completing — confirm the subscription status is unchanged.

**Webhooks**: Register a test webhook endpoint using webhook.site at `/settings/webhooks`. Complete a new sale and verify the webhook.site receiver captures the `sale.completed` POST request within 5 seconds. Confirm the `X-LankaCommerce-Signature` header is present on the received request.

### Performance Baseline

The following latency targets must be met under normal load: POS terminal product search (debounced) — under 200 milliseconds. Sale completion (cart to receipt) — under 2 seconds. Reports dashboard load (3 months data) — under 5 seconds. Customer list load (10 demo customers) — under 500 milliseconds. Login page to dashboard (after auth) — under 1 second.

### Security Checklist

- No `.env` or `.env.local` files are committed to the Git repository.
- `NEXTAUTH_SECRET` is not the string "secret" or "changeme" or any placeholder value.
- `CRON_SECRET` is set and cron route handlers reject unauthorised requests with HTTP 401.
- All webhook endpoint URLs are validated to HTTPS only at the API layer.
- No production API route returns the raw database error message in the response body.
- Rate limiting middleware is active on the login endpoint is active on the login endpoint.
- The `/api/test-error` endpoint returns HTTP 404 in the production build.
- Sentry DSN is public (`NEXT_PUBLIC_`) but `SENTRY_AUTH_TOKEN` is not exposed to the browser.
- All role-based access control guards are verified for CASHIER, STOCK_CLERK, MANAGER, and OWNER roles.
- No `console.log` statements in production code output sensitive data.

### Go-Live Steps — Exact Execution Sequence

**Step 1 — Final code merge**: Merge the production-ready main branch to ensure the Vercel production deployment reflects the latest code.

**Step 2 — Database migration**: After the deployment succeeds, run `poetry run python manage.py migrate` with the production database. Confirm all migrations have been applied.

**Step 3 — Initial data seed**: Run `poetry run python manage.py seed_demo_comprehensive` targeting the production database. Monitor the seed log for completion in under 60 seconds.

**Step 4 — DNS propagation**: Confirm the Vercel wildcard CNAME record for `*.lankacommerce.com` has fully propagated by running a DNS lookup for `lanka-demo.lankacommerce.com` and verifying it resolves to Vercel's edge network.

**Step 5 — Smoke tests**: Execute all feature smoke tests from the checklist above.

**Step 6 — PayHere key swap**: In Vercel environment variables, update `PAYHERE_MERCHANT_SECRET` and `PAYHERE_MODE` to the live production PayHere credentials. Trigger a new Vercel deployment.

**Step 7 — Sentry production verification**: Confirm the Sentry dashboard shows events tagged with `environment: "production"`.

**Step 8 — Announce**: The platform is live. Update the project status to "Live".

### Post-Launch Monitoring (First 7 Days)

Monitor the Sentry Issues dashboard daily. If the error rate for any event type exceeds 5 per hour, investigate immediately. Check that the daily summary cron job executed successfully each morning by reviewing Vercel Cron Job execution logs. Verify the birthday-messages and payment-reminders cron jobs execute correctly by the end of the first full week. Monitor Vercel Function execution logs for any functions exceeding the 10-second timeout limit. Review the first month's PayHere transaction log against LankaCommerce subscription records to confirm payment webhook delivery is reliable. Check database query counts weekly to identify N+1 patterns introduced under real-world traffic.

### Project Completion Summary

LankaCommerce is a multi-tenant SaaS Point-of-Sale system built for Sri Lankan clothing boutiques. The project spans five phases and 17 sub-phases covering authentication and RBAC, multi-tenant SaaS infrastructure, product catalogue management, POS terminal operations, payments and receipts, returns and exchanges, CRM and supplier management, staff and commission management, hardware integrations, subscription billing, analytics and reporting, and this final production deployment and polish sub-phase.

The complete technology foundation is Django REST Framework backend with Next.js 15 frontend, TypeScript strict mode, Django ORM with PostgreSQL, Tailwind CSS 4, ShadCN/UI component library, TanStack Query, Zustand, React Hook Form with Zod validation, and Python `Decimal` for monetary arithmetic. The design system is anchored by the boutique-appropriate navy, orange, border, text-muted, border, background, and surface palette with Inter headings and JetBrains Mono body text for monetary values.

The project documentation series consists of over 80 task documents organised across the `document-series/` directory and serves as the authoritative implementation guide for any developer maintaining or extending the platform.

---

## Expected Output

This document serves as the definitive go-live checklist and project handoff record. No additional source files are created.

---

## Validation

- All environment validation checklist items are confirmed complete.
- All feature smoke tests pass on the production deployment.
- Performance baselines are met under normal load.
- All security checklist items are verified.
- Go-live steps are executed in the exact specified order.
- Post-launch monitoring plan is in place for the first 7 days.

---

## Notes

The go-live PayHere key swap (Step 6) is irreversible in the sense that the production merchant credentials are now active. Ensure all team members are notified before this step, and that the PayHere sandbox is never used again against the production database after the swap. Retain the sandbox PayHere credentials in a secure vault for use in future staging and preview deployments. Preview and staging environments must always use the sandbox merchant account to prevent accidental real charges during testing.
