# Task 05.02.03 — Build Tenant Signup and Trial Flow

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.03 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | High |
| Estimated Effort | 2-3 hours |
| Depends On | 05.02.01 (Billing models), Phase 01 Tenant and User creation flow |
| Produces | `backend/apps/billing/services/subscription_service.py`, `frontend/components/layout/TrialBanner.tsx`, updates to tenant signup flow |
| Blocked By | None |

---

## Objective

Implement the automatic trial subscription provisioning that runs when a new tenant signs up for LankaCommerce. Every new tenant receives a 14-day TRIAL subscription tied to the STARTER plan, created inside a database transaction alongside the Tenant and admin User records. The trial subscription must include an `Invoice` for informational purposes (value 0, status PAID) and a `current_period_end` set to 14 days from creation.

On the frontend, the `TrialBanner` component displays the remaining trial days in the dashboard layout header. The banner adapts its visual urgency: more than 7 days remaining uses a calm informational style, 7 days or fewer uses a warning style, and expired trials use an urgent style directing the tenant to subscribe. The banner is rendered as part of the authenticated dashboard layout, not on individual pages.

---

## Instructions

### Step 1: Create the Subscription Service

Create `backend/apps/billing/services/__init__.py` and `backend/apps/billing/services/subscription_service.py`. Define a `SubscriptionService` class with static methods:

Define `create_trial_subscription(tenant, plan_name="STARTER")` as a `@staticmethod`:

- Accept a `Tenant` instance and optionally a plan name string.
- Wrap the entire operation in `from django.db import transaction` with `with transaction.atomic():`.
- Inside the atomic block, fetch `SubscriptionPlan.objects.get(name=plan_name, is_active=True)`. If no active `STARTER` plan exists, fall back to `SubscriptionPlan.objects.filter(is_active=True).order_by('sort_order').first()`. If no plan exists at all, raise a `ValueError("No active subscription plan available")`.
- Calculate `trial_ends = timezone.now() + timedelta(days=TRIAL_DAYS)` using `TRIAL_DAYS` from `constants.py`.
- Create a `Subscription` object: `tenant=tenant`, `plan=plan`, `status=SubscriptionStatus.TRIAL`, `trial_ends_at=trial_ends`, `current_period_start=timezone.now()`, `current_period_end=trial_ends`.
- Create a zero-value `Invoice`: `subscription=subscription`, `tenant=tenant`, `invoice_number="TRIAL-" + str(uuid.uuid4())[:8].upper()`, `amount=Decimal("0.00")`, `status=InvoiceStatus.PAID`, `billing_period_start=current_period_start`, `billing_period_end=trial_ends`, `due_date=trial_ends`.
- Update the `Tenant` record: `Tenant.objects.filter(id=tenant.id).update(subscription_status=SubscriptionStatus.TRIAL)`.
- Return the created `Subscription` instance. The atomic block ensures that if any step fails, no partial data is committed.

Define `get_subscription_for_tenant(tenant_id)` as a `@staticmethod`:

- Return `Subscription.objects.filter(tenant_id=tenant_id).select_related('plan').order_by('-created_at').first()`.
- This always returns the most recent subscription for the tenant. In normal operation there is only one, but the method is defensive.

### Step 2: Integrate Trial Creation into Tenant Signup

Locate the tenant signup view in `backend/apps/tenants/views/` (likely `auth_views.py` or `registration_views.py`). After the `Tenant` and admin `User` are created and committed, call:

```
subscription = SubscriptionService.create_trial_subscription(tenant)
```

This call should be inside the existing `transaction.atomic()` block that creates the Tenant and User. If the signup flow does not yet use an atomic block, wrap all three operations (Tenant create, User create, Subscription create) inside one. The response should include `subscription` data in the signup response so the frontend can immediately render the trial banner.

### Step 3: Add subscription_status to JWT Claims

In the JWT token generation utility (likely `backend/apps/authentication/utils.py` or `backend/apps/authentication/serializers.py`), add the `subscription_status` claim to the token payload:

```
"subscription_status": user.tenant.subscription_status
```

This ensures the frontend middleware can read `subscription_status` from the token without an additional API call. If the user is a SUPER_ADMIN (no tenant), set `subscription_status` to `null` in the token.

### Step 4: Add a Subscription Status API Endpoint

Create a simple API endpoint at `GET /api/billing/subscription/status/` that returns the current tenant's subscription:

- `get_object_or_404(Subscription, tenant_id=user.tenant_id)` (or the most recent subscription using `SubscriptionService.get_subscription_for_tenant`).
- Return serialized data: `plan.name`, `plan.monthly_price`, `status`, `trial_ends_at`, `current_period_end`, `cancel_at_period_end`, `days_remaining` (computed on the backend as `(subscription.current_period_end - timezone.now()).days` or 0 if already past).
- Return in the standard envelope: `{"success": True, "data": {...}}`.

This endpoint is used by the `TrialBanner` and the billing dashboard page.

### Step 5: Build the Trial Banner Component

Create `frontend/components/layout/TrialBanner.tsx` as a client component with `"use client"`:

- Accept `subscription` data as a prop (fetched server-side in the root layout or via the status endpoint).
- Extract `status`, `days_remaining` from the subscription data.
- If `status` is `ACTIVE` and the subscription is not on trial and is not past_due, render nothing (return `null`).
- Define three visual states using LankaCommerce design tokens:

  **State 1: TRIAL with days_remaining > 7**
  - Background: `bg-blue-50`, border: `border-blue-200`, text: `text-blue-800`.
  - Icon: `Clock` from `lucide-react`.
  - Message: "Your free trial ends in {days_remaining} days. Subscribe now to keep using LankaCommerce."
  - Action button: "View Plans" button with `bg-orange text-white hover:bg-orange/90` linking to `/billing`.

  **State 2: TRIAL with days_remaining <= 7 and > 0**
  - Background: `bg-orange-50`, border: `border-orange-300`, text: `text-orange-800`.
  - Icon: `AlertTriangle` from `lucide-react`.
  - Message: "Your trial ends soon! Only {days_remaining} days remaining. Subscribe to avoid service interruption."
  - Action button: "Subscribe Now" with pulsing animation (`animate-pulse` class on hover only) in orange.

  **State 3: TRIAL with days_remaining <= 0 (expired)**
  - Background: `bg-red-50`, border: `border-red-300`, text: `text-red-800`.
  - Icon: `Ban` from `lucide-react`.
  - Message: "Your trial has ended. Your account will be suspended if you don't subscribe."
  - Action button: "Resubscribe" with `bg-red text-white hover:bg-red/90`.

  **State 4: PAST_DUE status (any days_remaining)**
  - Background: `bg-red-50`, border: `border-red-300`, text: `text-red-800`.
  - Icon: `CreditCard` from `lucide-react`.
  - Message: "Payment is past due. Please settle your invoice to continue using LankaCommerce."
  - Action button: "Pay Now" linking to `/billing`.

- Use `useRouter` for client-side navigation on button clicks. Do not use `<a>` or full page reloads for the banner links.
- Add a dismissible `X` button for states 1 and 2 only (states 3 and 4 are not dismissible). Store dismissal state in `localStorage` with a key like `lankacommerce_trial_banner_dismissed` and a 24-hour expiry. On component mount, check if the banner was dismissed within the last 24 hours — if so, hide it.

### Step 6: Integrate Trial Banner into Dashboard Layout

Locate the authenticated dashboard layout at `frontend/app/[tenantSlug]/layout.tsx` (or the root layout wrapper for authenticated users). Add the `TrialBanner` component above the main content area:

- Fetch the subscription data in a parent server component or use the `useAuth().fetchWithAuth` pattern.
- Pass `subscription` as a prop to `TrialBanner`.
- The banner should render between the top navigation bar and the page content, taking full width.
- Apply a transition animation (`transition-all duration-300`) when the banner appears or disappears.

---

## Expected Output

- `SubscriptionService.create_trial_subscription` creates a Subscription, a zero-value Invoice, and updates Tenant in a single atomic transaction
- Tenant signup flow calls `create_trial_subscription` atomically with Tenant and User creation
- JWT token includes `subscription_status` claim
- `GET /api/billing/subscription/status/` returns subscription data with `days_remaining`
- `TrialBanner` renders with four visual states based on subscription status and days remaining
- Banner is dismissible for states 1 and 2 with localStorage persistence and 24-hour expiry

---

## Validation

- Register a new tenant account — confirm the tenant's `subscription_status` is `TRIAL` in the database
- Call `GET /api/billing/subscription/status/` and confirm `days_remaining` is 14 (or close to it) and `status` is `TRIAL`
- Decode the JWT for the new tenant's admin user — confirm the `subscription_status` claim is `TRIAL`
- Log in as the new tenant and confirm the `TrialBanner` renders in state 1 (blue, > 7 days)
- Dismiss the banner and refresh the page — confirm it remains hidden. Clear `localStorage` and refresh — confirm it reappears.
- Manually set `subscription_status = PAST_DUE` in the database, refresh — confirm the banner renders in state 4 (red, PAST_DUE) and is not dismissible
- Manually set `subscription_status = ACTIVE` with a non-trial subscription — confirm the banner does not render
- Call the signup flow a second time with the same email — confirm the signup fails due to unique constraint, not due to orphaned subscription records
- Verify that running `SubscriptionService.create_trial_subscription` with no active plans raises a `ValueError`

---

## Notes

- The `create_trial_subscription` method is intentionally synchronous and blocking. Trial creation happens at signup time, which is a low-traffic operation. There is no performance benefit to making it async or deferred.
- The `TrialBanner` dismissal uses `localStorage` rather than a server-side preference because the banner is cosmetic and does not affect functionality. This avoids an extra API call on every page load.
- The `days_remaining` calculation uses `(subscription.current_period_end - timezone.now()).days` on the backend. The frontend also computes a local approximation for immediate display, but the backend value is authoritative.
- If a tenant's trial has expired but they have never been moved to PAST_DUE by the cron engine (task 05.02.06), the `TrialBanner` state 3 still shows the expired warning. The actual suspension takes effect only after the cron runs. This gap is intentional — the banner warns before enforcement.