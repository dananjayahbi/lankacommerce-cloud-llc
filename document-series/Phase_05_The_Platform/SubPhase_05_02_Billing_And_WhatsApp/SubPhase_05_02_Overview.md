# SubPhase 05.02 — Billing & WhatsApp Automation

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | 05 — The Platform |
| **SubPhase** | 05.02 — Billing & WhatsApp Automation |
| **Author** | LankaCommerce Engineering |
| **Status** | Draft |
| **Priority** | High |
| **Dependencies** | Phase 01 (Auth & RBAC), SubPhase 02.01 (Product Data Models), SubPhase 04.01 (CRM & Supplier Management) |
| **Estimated Effort** | 5–7 sprint days |
| **Target Environment** | Production (Vercel + Django DRF + PostgreSQL + PayHere + Resend + Meta Cloud API) |

## Objective

SubPhase 05.02 implements the complete billing lifecycle for LankaCommerce, covering everything from subscription plan creation by Super Admins through automated recurring billing via PayHere, invoice generation, grace-period enforcement, tenant suspension, and WhatsApp-driven payment reminders. This is the revenue backbone of the SaaS platform and must be designed for correctness, observability, and fault tolerance — a single missed charge should not silently suspend a tenant, and a dropped IPN notification must be recoverable via manual reconciliation.

Beyond the core billing loop, this SubPhase introduces WhatsApp automation as a first-class communication channel for payment reminders and dunning notifications. By integrating the Meta Cloud API alongside Resend transactional email, LankaCommerce ensures tenants receive timely, multi-channel nudges before their subscription expires or after a payment failure. The combination of denormalized `subscription_status` on `Tenant` (for fast dashboard queries), cron-driven checks, and idempotent IPN handling creates a robust system that minimises revenue leakage while maximising tenant satisfaction.

### Scope

- Super Admin CRUD for subscription plans (no DELETE, only is_active toggle).
- Tenant sign-up automatically creates a 30-day trial subscription.
- PayHere subscription integration with IPN webhook for recurring billing.
- Invoice generation on each billing cycle with unique `invoice_number`.
- Grace period (3 days past due) before automatic suspension.
- Cron-based checks for subscription expiry and suspension (Vercel Cron Jobs).
- WhatsApp payment-reminder notifications via Meta Cloud API.
- Invoice PDF placeholder generation (Resend for email delivery path).
- Super Admin dashboard to view all tenants subscription statuses subscription status.

### Out of Scope

- Custom pricing tiers or negotiated plan overrides.
- One-time add-on charges or usage-based billing.
- Refund processing or chargeback handling.
- Multi-currency support beyond LKR.
- Tenant-initiated plan downgrade mid-cycle plan downgrade (cancellation at period end only).
- Advanced dunning logic (escalating reminder cadence is basic).

## Technical Context

### PayHere IPN Verification

Every Instant Payment Notification from PayHere arrives at a dedicated Django DRF endpoint (`/api/billing/payhere-ipn/`). The handler must:

1. Extract `merchant_id`, `order_id`, `payhere_amount`, `payhere_currency`, `status_code`, and `md5sig` from the POST body.
2. Recompute the MD5 signature using `hashlib.md5` over the concatenation: `merchant_id + order_id + payhere_amount + payhere_currency + status_code + MERCHANT_SECRET`.
3. Compare the computed digest against `md5sig` using `hmac.compare_digest()` to prevent timing attacks.
4. If valid, store the raw payload and verification result in `InvoicePaymentEvent` for audit.
5. Update the related `Invoice` and `Subscription` statuses accordingly.

### Tenant Subscription Status Denormalization

The `Tenant` model carries a `subscription_status` field (TextChoices: `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`). This field is updated transactionally inside every billing-related state change (IPN handler, cron suspension, trial-creation). It is **not** computed dynamically via JOINs because the tenant dashboard and middleware checks require fast, index-friendly reads. A background reconciliation task (future SubPhase) may verify consistency.

### Vercel Cron Integration

Two cron jobs are registered in `vercel.json`:

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/check-subscriptions` | Daily at 02:00 UTC | Expire trials, suspend PAST_DUE tenants |
| `/api/cron/send-payment-reminders` | Every 6 hours | Send WhatsApp/email reminders for due invoices |

### WhatsApp Meta Cloud API

Reminders are sent via the Meta Cloud API endpoint `POST /v20.0/{phone_number_id}/messages`. LankaCommerce uses a shared WhatsApp Business Account. The message template (pre-approved by Meta) includes variant placeholders for: `{{1`, `invoice_number`, `amount`, `due_date`. Sending is idempotent; each `PaymentReminder` record tracks `status` and `sent_at`.

### Resend (Transactional Email)

Email invoices are sent via Resend using the `Invoices` email template. The PDF is a placeholder generated server-side (a simple HTML-to-PDF via WeasyPrint or similar) and attached. The email includes the tenant's business name, invoice number, amount due, and a direct payment link.

## Task Breakdown

| # | Task | Description | Est. Hours |
|---|------|-------------|------------|
| 1 | `Task_05_02_01` | Create Django billing models (SubscriptionPlan, Subscription, Invoice, InvoicePaymentEvent, PaymentReminder) + Tenant.subscription_status field. Migrations. | 3 |
| 2 | `Task_05_02_02` | Build subscription plan management UI (Super Admin) with ShadCN table + dialog. DRF plan views (list, create, update). Active subscriber count annotation. | 4 |
| 3 | `Task_05_02_03` | Build tenant signup and trial flow. `create_trial_subscription` service, TrialBanner component, dashboard integration. | 4 |
| 4 | `Task_05_02_04` | Implement PayHere IPN webhook endpoint with MD5 signature verification. `InvoicePaymentEvent` logging. Invoice + Subscription status updates. | 5 |
| 5 | `Task_05_02_05` | Build invoice generation service `generate_invoice(subscription)` idempotent, within `transaction.atomic()`. Unique `invoice_number` logic. | 3 |
| 6 | `Task_05_02_06` | Implement grace period and suspension logic. Daily cron `check_subscriptions` expiry check, PAST_DUE detection, SUSPENDED transition. | 4 |
| 7 | `Task_05_02_07` | Build WhatsApp payment reminders via Meta Cloud API. `PaymentReminder` creation, template rendering, send status tracking. | 4 |
| 8 | `Task_05_02_08` | Integrate Resend for invoice email delivery with PDF attachment. Invoice-paid confirmation email. | 3 |
| 9 | `Task_05_02_09` | Build Super Admin subscription overview page. Tenant subscription status filter, manual override (cancel, extend trial) actions. | 4 |
| 10 | `Task_05_02_10` | Add subscription-protected middleware. Check `Tenant.subscription_status` on dashboard routes, redirect to billing page if SUSPENDED / EXPIRED. | 2 |
| 2 |
| 11 | `Task_05_02_11` | Build tenant-facing billing page: current plan display, change plan, payment history table, download invoice PDF. | 5 |
| 12 | `Task_05_02_12` | Write integration tests for billing lifecycle (trial creation, PayHere IPN, suspension, reminder sending). Add invoice payment reconciliation view. | 6 |

## Validation Criteria

1. Super Admin can create, view, and toggle subscription plans. Plans with active subscriptions cannot be deactivated (backend guard).
2. Tenant creation automatically provisions a 30-day trial Subscription and sets `Tenant.subscription_status = TRIAL`.
3. TrialBanner correctly renders three visual states: >7 days remaining, ≤7 days remaining warning, expired danger.
4. PayHere IPN endpoint rejects requests with invalid `md5sig` and logs the event with `signature_valid = False`.
5. Valid IPN for a `RECURRING_SUCCESS` status code creates/updates the `Invoice`, transitions `Subscription` to `ACTIVE`, and updates `Tenant.subscription_status`.
6. Invoice `invoice_number` is unique, monotonically increasing, and formatted as `INV-{YYYYMMDD}-{XXXX}`.
7. Daily cron marks invoices as `PAST_DUE` when past due date and grace period have elapsed without payment.
8. Daily cron transitions tenants from `ACTIVE` or `PAST_DUE` to `SUSPENDED` when past `current_period_end + 3 days`.
9. WhatsApp reminders are sent only once per invoice per day (duplicate guard via `PaymentReminder` lookup).
10. Subscription-protected middleware redirects SUSPENDED/EXPIRED tenants to the billing page and blocks all dashboard routes.
11. Super Admin override actions (cancel, extend trial) are logged and immediately reflected in `Tenant.subscription_status`.
12. Tenant-facing billing page shows real-time plan data, upcoming invoices if available, and payment history.
13. All enum values (SubscriptionStatus, InvoiceStatus, PaymentReminderType, PaymentReminderChannel, PaymentReminderSendStatus) are Django TextChoices with correct display labels.
14. `makemigrations billing --name add_billing_models` and `migrate` run without errors on a fresh PostgreSQL database.
15. Every `transaction.atomic()` block has an associated rollback test case in the integration suite.
16. Invoice PDF generation produces a valid PDF with correct business name, invoice number, and amount.

## Notes

- All monetary values use `Decimal` with `max_digits=12`, `decimal_places=2`, and `ROUND_HALF_UP` rounding. Never use `float`.
- PayHere sandbox credentials must be configured in Django settings as `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_BASE_URL`. These must never be committed to version control.
- The WhatsApp message template must be pre-approved by Meta before going live. Use template name `payment_reminder` with `body` variant placeholders: `1`, `invoice_number`, `amount`, `due_date`.
- Vercel Cron calls the Next.js API route handler at `/api/cron/check-subscriptions` which proxies to Django's cron endpoints via an internal network call. Auth is via a shared `CRON_SECRET` header.
- Each `InvoicePaymentEvent` stores the full raw `payload` as a `TextField` for debugging. This may contain PII; ensure database access is restricted.
- The `payhere_subscription_token` on `Subscription` is the token returned by PayHere after the first successful recurring payment. It is required for subsequent IPN correlation but may arrive asynchronously.
- Indexes on `Subscription(tenant_id, status, current_period_end)` and `Invoice(tenant_id, status, due_date)` are critical for cron query performance. Confirm via `EXPLAIN ANALYZE` after migration.
- If cron jobs overlap (e.g., a tenant is both expired and has a due invoice), the suspension task takes precedence: SUSPENDED status blocks all actions until payment is received.
- Grace period duration is configurable via Django setting `BILLING_GRACE_PERIOD_DAYS` (default `3`). The cron respects this value dynamically.

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `backend/apps/billing/models.py` | Create | Django billing models + enums |
| `backend/apps/billing/admin.py` | Create | Django admin registration for all billing models |
| `backend/apps/billing/serializers/` | Create | DRF serialisers for plan, subscription, invoice |
| `backend/apps/billing/views/plan_views.py` | Create | `PlanListCreateView`, `PlanDetailView` |
| `backend/apps/billing/views/plan_detail_views.py` | Create | Single-plan PATCH endpoint |
| `backend/apps/billing/views/ipn_views.py` | Create | PayHere IPN webhook handler |
| `backend/apps/billing/views/cron_views.py` | Create | Cron job endpoints for subscription checks |
| `backend/apps/billing/services/subscription_service.py` | Create | `create_trial_subscription`, `get_subscription_for_tenant`, `generate_invoice` |
| `backend/apps/billing/services/payment_service.py` | Create | `verify_payhere_signature`, `process_ipn` |
| `backend/apps/billing/services/whatsapp_service.py` | Create | WhatsApp reminder sending via Meta Cloud API |
| `backend/apps/billing/services/email_service.py` | Create | Resend invoice email delivery |
| `backend/apps/billing/urls.py` | Create | URL routing for all billing endpoints |
| `frontend/app/super-admin/plans/page.tsx` | Create | Super Admin plan management page |
| `frontend/app/super-admin/plans/PlanFormDialog.tsx` | Create | Plan creation/editing dialog (RHF + ShadCN) |
| `frontend/app/super-admin/subscriptions/page.tsx` | Create | Super Admin subscription overview |
| `frontend/components/layout/TrialBanner.tsx` | Create | Trial status banner with three visual states |
| `frontend/app/billing/page.tsx` | Create | Tenant-facing billing page |
| `frontend/lib/auth.ts` | Modify | Add `getAuthFromCookies()` for server-side auth |
| `frontend/hooks/useAuth.ts` | Modify | Add `useAuth()` for client-side auth |
| `frontend/app/api/cron/check-subscriptions/route.ts` | Create | Vercel Cron proxy to Django for subscription cron |
| `frontend/app/api/cron/send-payment-reminders/route.ts` | Create | Vercel proxy for reminder cron |
| `vercel.json` | Modify | Add cron job schedules |
| `backend/lankacommerce/settings.py` | Modify | Add PayHere, Resend, WhatsApp settings |
| `backend/lankacommerce/urls.py` | Modify | Include `billing/urls.py` |
