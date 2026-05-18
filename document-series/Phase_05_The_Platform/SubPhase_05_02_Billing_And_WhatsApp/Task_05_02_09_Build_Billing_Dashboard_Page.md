# Task 05.02.09 — Build Billing Dashboard Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.09 |
| SubPhase | 05.02 — Billing and WhatsApp Automation |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | Task 05.02.08 (Invoice auto-generation and PDF) |
| Produces | `frontend/app/[tenantSlug]/billing/page.tsx`, `frontend/components/billing/SubscriptionOverviewCard.tsx`, `frontend/components/billing/InvoiceHistoryTable.tsx`, `frontend/components/billing/CancelSubscriptionButton.tsx`, `backend/apps/billing/views/cancel_subscription_view.py` |
| Blocked By | Task 05.02.08 |

---

## Objective

Build the comprehensive tenant billing dashboard at `frontend/app/[tenantSlug]/billing/page.tsx`, consolidating current plan details, invoice history, checkout CTAs, trial information, and subscription cancellation into a single cohesive Owner-facing page. Every subscription status variant (TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED) must render an appropriate and functional UI. The page is accessible to SUSPENDED tenants via the middleware bypass established in Task 05.02.07, ensuring they can always reach the renewal flow.

---

## Instructions

### Step 1: Define the Page Layout Structure

Create `frontend/app/[tenantSlug]/billing/page.tsx` as a Client Component with `'use client'`. Authenticate using `useAuth()` — redirect non-OWNER, non-MANAGER, and non-SUPER_ADMIN sessions to the dashboard home. Note that SUSPENDED tenants can access this page — this is intentional and required by the middleware bypass.

Fetch the subscription using a TanStack Query key `['billing', tenantSlug]` calling `GET /api/billing/subscription/` (or load from a server component prop). The response includes the plan, the last six invoices ordered by `created_at` descending, and the tenant relations.

Apply a `background` (#F1F5F9) page background. Use a full-width single-column layout on mobile (max-width 768px) and a two-thirds / one-third column split on desktop where the left column holds the invoice history and the right column holds the overview card and CTA controls. Use Tailwind grid with `lg:grid-cols-3` and `col-span-2` pattern.

### Step 2: Build the SubscriptionOverviewCard

Create `frontend/components/billing/SubscriptionOverviewCard.tsx` as a Client Component. Accept `subscription` and `plan` as props.

Use a ShadCN `Card` with `surface` (#FFFFFF) background and a `navy` (#1B2B3A) top border of 3px. Inside the card, render:

- Plan name in Inter at 20px with `navy` colour (e.g., "GROWTH Plan").
- A ShadCN `Badge` beside the plan name for the subscription status: use `variant="default"` with a green className override for ACTIVE; `variant="secondary"` with an amber className for TRIAL and PAST_DUE; `variant="destructive"` for SUSPENDED; `variant="outline"` with muted text for CANCELLED.
- Monthly or annual billing amount in JetBrains Mono at 16px: "LKR 3,500.00 / month".
- Next renewal date in Inter: "Next billing date: 01 April 2026" — format using `date-fns` `format(subscription.current_period_end, "dd MMMM yyyy")`. Label this "Trial ends" for TRIAL status.
- For PAST_DUE status specifically: render a warning callout card inside the overview card with `orange` (#F97316) background and white text. Compute `graceDaysLeft` as `GRACE_PERIOD_DAYS - daysPastDue` (floored), clamped to zero. Render: "Your payment is overdue. Access will be suspended in [graceDaysLeft] day[s] if payment is not received."
- For SUSPENDED status: render a `navy`-background callout: "Your account is suspended. Renew to restore access."

### Step 3: Build the InvoiceHistoryTable

Create `frontend/components/billing/InvoiceHistoryTable.tsx` as a Client Component. Accept an `invoices` array prop typed as `Invoice[]`.

Render a ShadCN `Table`. Define columns: Invoice Number, Billing Period, Amount, Status, Download.

Column rendering details:
- Invoice Number: JetBrains Mono font, `navy` colour (e.g., "INV-2026-0042").
- Billing Period: formatted as "dd MMM yyyy – dd MMM yyyy" using `date-fns`.
- Amount: "LKR [amount]" in JetBrains Mono.
- Status: ShadCN `Badge` — `success` (#22C55E) for PAID, `warning` (#F59E0B) for PENDING, `danger` (#EF4444) for FAILED, `text-muted` (#64748B) for VOIDED.
- Download: an anchor tag with `href="/api/billing/invoices/[id]/pdf/"` and the `download` HTML attribute set to `"[invoiceNumber].pdf"`. Style as a ShadCN `Button` with `variant="ghost"` `size="sm"` and a `Download` icon from Lucide React.

Apply alternating row backgrounds: even rows get `background` (#F1F5F9), odd rows get `surface` (#FFFFFF). If the invoices array is empty, render a centered empty state: a muted `FileText` icon from Lucide React and the text "No invoices yet. Your first invoice will appear here after your first payment."

### Step 4: Build the Trial Information Card

For TRIAL status, render a prominent full-width information card above the invoice history. The card has a `border` (#E2E8F0) background with a `navy` border. Contents:
- Heading: "You are on a free trial" in Inter.
- Subheading: "Your trial ends on [trial_ends_at formatted as dd MMMM yyyy]. Subscribe before then to avoid any interruption."
- A savings callout: "Annual billing saves [X]% — LKR [annualPrice]/year vs LKR [monthlyPrice x 12]/year." Compute savings as `Math.round((plan.monthly_price * 12 - plan.annual_price) / (plan.monthly_price * 12) * 100)`.
- Two side-by-side `PayHereCheckoutButton` components: "Subscribe Monthly — LKR [monthlyPrice]/mo" and "Subscribe Annually — LKR [annualPrice]/yr". The annual button uses a `navy` background to distinguish it as the recommended option.

### Step 5: Build the Payment Method Section

Add a section below the overview card titled "Payments". Render a ShadCN `Card` with `background` (#F1F5F9) background. Include: a `ShieldCheck` icon from Lucide React with `success` (#22C55E) colour, text "Payments are processed securely by PayHere. LankaCommerce does not store card details." For ACTIVE subscriptions, also render: "Last payment: [paidAt of most recent PAID invoice formatted as dd MMMM yyyy]" and "Next auto-renewal: [current_period_end formatted as dd MMMM yyyy]." For TRIAL, PAST_DUE, CANCELLED, and SUSPENDED statuses, render the `PayHereCheckoutButton` in this section.

### Step 6: Build the CancelSubscriptionButton

Create `frontend/components/billing/CancelSubscriptionButton.tsx` as a Client Component. Render a ShadCN `Button` with `variant="outline"` and the destructive text colour class (`text-destructive`), labelled "Cancel Subscription". Only render for ACTIVE and TRIAL statuses.

On click, open a ShadCN `AlertDialog`. Content:
- Title: "Cancel your subscription?"
- Description: "You will retain full access until [current_period_end formatted as dd MMMM yyyy]. After this date, your account will be suspended and no further charges will be made."
- Two actions: "Keep Subscription" button (closes dialog) and "Cancel Subscription" button (destructive variant).

On confirming cancellation, call `PATCH /api/billing/cancel/` using a TanStack Query `useMutation`. On success, redirect to the billing page (via `router.refresh()`) and display a toast "Your subscription has been cancelled. Access continues until [current_period_end]."

### Step 7: Create the Cancellation API View

In `backend/apps/billing/views/cancel_subscription_view.py`, define `CancelSubscriptionView` at `PATCH /api/billing/cancel/` with `JWTAuthentication` and `HasTenantPermission`. Enforce OWNER role only. Fetch the active Subscription for this tenant. If already CANCELLED, return 409.

Inside `with transaction.atomic():`: update `Subscription.status` to `CANCELLED`, set `cancelled_at` to `timezone.now()`, update `Tenant.subscription_status` to `CANCELLED`. Return 200 with the updated subscription.

Do not immediately revoke access — the suspension middleware redirects CANCELLED tenants, but the tenant remains accessible until the cron takes further action. This is intentional: a self-service cancellation is treated as CANCELLED status rather than SUSPENDED, preserving a less alarming user experience for tenants who may wish to resubscribe.

### Step 8: Handle Return Parameter Toasts

In the billing page, read `searchParams.status`. Pass a `statusMessage` prop to a lightweight `BillingPageToast` client component. Render the toast on mount: green for "success", amber for "cancelled". This covers the PayHere return_url redirect feedback loop.

---

## Expected Output

- `frontend/app/[tenantSlug]/billing/page.tsx` — fully rendered billing dashboard for all subscription states.
- `SubscriptionOverviewCard` with status badge, amount, and next renewal date.
- `InvoiceHistoryTable` with PDF download links per row.
- Trial information card with dual monthly/annual PayHere checkout buttons.
- `CancelSubscriptionButton` with `AlertDialog` confirmation.
- `PATCH /api/billing/cancel/` — OWNER-restricted cancellation view.

---

## Validation

- ACTIVE subscription shows plan name, ACTIVE badge, billing amount, and next billing date.
- TRIAL status shows trial end date, savings callout, and dual checkout buttons.
- PAST_DUE shows grace period countdown in the overview card with orange warning callout.
- SUSPENDED status shows navy callout and renewal CTA.
- InvoiceHistoryTable renders all invoices with correct status badges.
- PDF Download link for a PAID invoice returns a binary PDF response.
- Cancel button is absent for SUSPENDED and CANCELLED statuses.
- CancelSubscriptionButton AlertDialog shows the correct `current_period_end` date.
- `PATCH /api/billing/cancel/` returns 403 for MANAGER and CASHIER roles.
- `PATCH /api/billing/cancel/` returns 409 if subscription is already CANCELLED.
- After cancellation, `Subscription.status` is CANCELLED and `cancelled_at` is set.

---

## Notes

Subscriptions in the CANCELLED state are set by tenant Owner action. Subscriptions in SUSPENDED state are set by the cron engine due to non-payment. These are distinct states with different UX implications: CANCELLED is volitional (lighter tone), SUSPENDED is enforcement-driven (urgent tone). Do not expose the `Subscription.payhere_subscription_token` field to the billing page — this value is internally used for recurring charge coordination and should not be visible in any client-accessible payload. The billing page is deliberately accessible to SUSPENDED tenants (middleware grants access to `/billing`). Confirm this bypass is working before testing the suspension state rendering.
