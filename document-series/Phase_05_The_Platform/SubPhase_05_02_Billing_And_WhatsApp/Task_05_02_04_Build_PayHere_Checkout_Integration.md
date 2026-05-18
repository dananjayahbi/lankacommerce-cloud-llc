# Task 05.02.04 — Build PayHere Checkout Integration

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.04 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | High |
| Estimated Effort | 2-3 hours |
| Depends On | 05.02.01 (Billing models), 05.02.02 (Plan management), 05.02.03 (Trial flow) |
| Produces | `backend/apps/billing/services/payhere_service.py`, `frontend/components/billing/PayHereCheckoutButton.tsx`, `frontend/app/[tenantSlug]/billing/page.tsx` (initial version) |
| Blocked By | None |

---

## Objective

Integrate LankaCommerce with PayHere, Sri Lanka's leading payment gateway, to accept credit card, debit card, and wallet payments for subscription billing. The PayHere integration follows a server-side payload generation pattern where the backend constructs the checkout form parameters (including the MD5 integrity signature) and the frontend renders a hidden form that POSTs to PayHere's checkout URL. This approach keeps the merchant secret server-side and prevents tampering with the checkout payload.

The frontend billing page is started in this task with the checkout flow and will be completed in task 05.02.09 with the full dashboard.

---

## Instructions

### Step 1: Create the PayHere Service

Create `backend/apps/billing/services/payhere_service.py`. Define a `PayHereService` class with static methods:

Define `build_payhere_checkout_payload(invoice, tenant, user)` as a `@staticmethod`:

- Accept an `Invoice` instance, a `Tenant` instance, and a `User` instance (the tenant admin who is making the purchase).
- Compute the checkout URL: `PAYHERE_SANDBOX_URL` if `settings.PAYHERE_SANDBOX` is `True`, else `PAYHERE_PRODUCTION_URL`.
- Build the `merchant_id` from `settings.PAYHERE_MERCHANT_ID`.
- Set `return_url` to `settings.APP_URL + "/billing?payment=success"`.
- Set `cancel_url` to `settings.APP_URL + "/billing?payment=cancelled"`.
- Set `notify_url` to `settings.APP_URL + "/api/billing/webhooks/payhere/"`.
- Set `order_id` to `invoice.invoice_number` — PayHere requires a unique order ID. The invoice number is already unique in the database.
- Set `items` to a descriptive string like `f"{invoice.subscription.plan.name} Subscription - {invoice.billing_period_start.strftime('%B %Y')}"`.
- Set `currency` to `LKR`.
- Set `amount` to `str(invoice.amount)` — PayHere expects a string representation.
- Set `first_name` to `user.first_name` (or `tenant.store_name` as fallback).
- Set `last_name` to `user.last_name` (or empty string).
- Set `email` to `user.email`.
- Set `phone` to `user.phone` (or `tenant.phone`). Normalise to Sri Lanka format — if the phone starts with `0`, strip the `0` and prepend `+94`. If it already starts with `94` or `+94`, leave it. If neither, log a warning and send as-is.
- Set `address` to `tenant.address` or `"No address provided"`.
- Set `city` to `tenant.city` or `"Colombo"`.
- Set `country` to `"Sri Lanka"`.
- Compute the `hash` parameter: create a string by concatenating `merchant_id`, `order_id`, `amount`, `currency`, and `settings.PAYHERE_MERCHANT_SECRET` with no separators. Compute `hashlib.md5(string.encode('utf-8')).hexdigest()`. This is the MD5 integrity signature that PayHere uses to verify the payload was not tampered with.
- Return a dictionary containing all parameters ready for form rendering.

Define `generate_invoice_number()` as a `@staticmethod`:

- Use `from django.db import connection` to call a raw SQL sequence or use a retry loop with `select_for_update`.
- The recommended approach: use a `with transaction.atomic()` and `select_for_update` on a lock table, or simply generate `INV-{date}-{uuid4().hex[:6].upper()}` and rely on the unique constraint. If a duplicate is hit, retry once.
- Return the generated invoice number string.

Define `initiate_checkout(invoice_id, tenant_id, user)` as a `@staticmethod`:

- Fetch the invoice with `Invoice.objects.select_related('subscription__plan', 'tenant').get(id=invoice_id, tenant_id=tenant_id)`.
- Verify the invoice status is `PENDING`. If not, raise a `ValidationError` with code `"invoice_not_pending"`.
- Call `build_payhere_checkout_payload(invoice, invoice.tenant, user)` to build the payload.
- Return a dict with `checkout_url` and `form_params` (the payload dict). The frontend will use these to render the POST form.

### Step 2: Create the Checkout Initiate Endpoint

Create a DRF view at `backend/apps/billing/views/checkout_view.py`:

- Implement a `POST` handler at `/api/billing/checkout/initiate/` that accepts `{"plan_id": "..."}`.
- Validate that the authenticated user's tenant `subscription_status` is one of `TRIAL`, `ACTIVE`, or `PAST_DUE`. If `SUSPENDED` or `CANCELLED`, return `{"success": False, "error": {"code": "subscription_suspended", "message": "Cannot initiate checkout while subscription is suspended or cancelled."}}`.
- Fetch the `Subscription` for the tenant. If the subscription status is `TRIAL`, first upgrade the subscription: change the `plan` to the requested plan, set `status` to `PENDING` (awaiting payment), and create an `Invoice` for the plan's `monthly_price` with `billing_period_start` and `billing_period_end` set appropriately.
- If the subscription status is `ACTIVE` or `PAST_DUE`, create a new `Invoice` for the next billing period.
- Call `PayHereService.initiate_checkout(invoice.id, user.tenant_id, user)`.
- Return `{"success": True, "data": {"checkout_url": ..., "form_params": {...}}}`.

### Step 3: Build the PayHereCheckoutButton Component

Create `frontend/components/billing/PayHereCheckoutButton.tsx` as a client component with `"use client"`:

- Accept `planId` (string) and `className` (optional) as props.
- Render a `<button>` that is a styled ShadCN button with the text "Subscribe with PayHere" or "Pay Now".
- On click:
  1. Set a local `loading` state to `true` and disable the button.
  2. Call `POST /api/billing/checkout/initiate/` with body `{"plan_id": planId}` using `fetch` with the auth header from `useAuth()`.
  3. On success, extract `checkout_url` and `form_params` from the response.
  4. Create a hidden HTML form dynamically: create a `<form>` element with `method="POST"` and `action=checkout_url`. For each key-value pair in `form_params`, create an `<input type="hidden">` with `name={key}` and `value={value}`. Append the form to the document body and call `form.submit()`. This performs a browser POST to PayHere.
  5. On error, show a `toast.error` with the error message from the API response and set `loading` back to `false`.
- While `loading` is true, show a spinner alongside "Redirecting to PayHere..." text.
- Use `useCallback` to wrap the click handler. Use `useRef` for cleanup (remove the form from the body after submission).
- Style: use `bg-orange text-white hover:bg-orange/90 font-medium py-2 px-4 rounded-lg transition-colors` from the LankaCommerce design tokens (orange `#F97316`).

### Step 4: Create the Initial Billing Page Shell

Create `frontend/app/[tenantSlug]/billing/page.tsx` as a client component with `"use client"`:

- Use `useAuth()` to get the current user and `useQuery` to fetch subscription status from `GET /api/billing/subscription/status/`.
- Render a loading skeleton while data is loading.
- Conditionally render based on subscription status:
  - **TRIAL**: Show the current plan info, trial end date, and a "Subscribe" section with a plan picker (three cards for STARTER, GROWTH, ENTERPRISE) each with a `PayHereCheckoutButton`.
  - **ACTIVE**: Show the current plan, next billing date, and the `PayHereCheckoutButton` for renewals or upgrades.
  - **PAST_DUE**: Show a prominent "Pay Now" section with a single `PayHereCheckoutButton` and a warning about service interruption.
  - **SUSPENDED or CANCELLED**: Show a message directing to `/suspended`.
- Handle URL search params `?payment=success` and `?payment=cancelled` — show a success toast ("Payment successful! Your subscription is now active.") or a cancelled toast ("Payment was cancelled. You can try again."). Use `useSearchParams` from `next/navigation` and clear the params after showing the toast.
- This page is a shell that will be completed with `SubscriptionOverviewCard`, `InvoiceHistoryTable`, and `CancelSubscriptionButton` in task 05.02.09.

### Step 5: Add URL Routing and Toast Handler

In `backend/config/urls.py` or `backend/apps/billing/urls.py`, add:

- `path("api/billing/checkout/initiate/", CheckoutInitiateView.as_view(), name="billing-checkout-initiate")`.

In `frontend/app/[tenantSlug]/billing/page.tsx`, add a `useEffect` that reads `payment` from URL search params once on mount and shows the appropriate toast, then removes the param using `router.replace()` to avoid showing the toast again on page refresh.

---

## Expected Output

- `PayHereService.build_payhere_checkout_payload` returns a complete form payload with MD5 hash
- `POST /api/billing/checkout/initiate/` accepts `plan_id`, creates or updates the invoice, and returns checkout data
- `PayHereCheckoutButton` renders a button that POSTs to PayHere via a dynamically created form
- `frontend/app/[tenantSlug]/billing/page.tsx` renders conditionally based on subscription status
- Return and cancel URL toasts display correctly without reappearing on refresh

---

## Validation

- Call `PayHereService.build_payhere_checkout_payload` with an invoice — confirm the returned payload includes `merchant_id`, `order_id`, `items`, `currency`, `amount`, `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `country`, and `hash`
- Verify the `hash` parameter matches the MD5 of `merchant_id + order_id + amount + currency + merchant_secret` using Python's `hashlib.md5()` — manually compute expected hash and compare
- Call `POST /api/billing/checkout/initiate/` as a TRIAL tenant — confirm a new Invoice is created with `status = PENDING` and the subscription plan is updated
- Call `POST /api/billing/checkout/initiate/` as a SUSPENDED tenant — confirm a 400 error with code `subscription_suspended`
- Click the `PayHereCheckoutButton` as a TRIAL tenant — confirm a browser POST form is created and submitted (in sandbox mode, observe the redirect)
- Navigate to `/billing?payment=success` — confirm a success toast appears and the param is removed from the URL
- Navigate to `/billing?payment=cancelled` — confirm a cancelled toast appears and the param is removed
- Refresh the billing page after a toast was shown — confirm no toast appears on refresh
- Verify phone number normalisation: `0771234567` becomes `+94771234567`; `+94771234567` stays as-is; `94771234567` stays as-is

---

## Notes

- The MD5 hash computation must match PayHere's expected concatenation exactly: `merchant_id + order_id + amount + currency + merchant_secret` with no separators, no newlines, no spaces. The `amount` must be the string representation of the decimal value exactly as sent in the `amount` form field. Any discrepancy causes PayHere to reject the transaction with a signature mismatch.
- The dynamic form POST to PayHere is a standard pattern for payment gateway integrations that do not use JavaScript-based checkout. It works in all browsers and does not depend on CORS configuration. The trade-off is that the user leaves the LankaCommerce application during payment and returns via the `return_url`.
- Sandbox detection is controlled by `settings.PAYHERE_SANDBOX`. In local development, sandbox mode uses `https://sandbox.payhere.lk/pay/checkout`. The sandbox merchant credentials must be configured in Django settings or environment variables.
- The `initiate_checkout` method upgrades a TRIAL subscription to the selected plan immediately upon checkout initiation, before payment confirmation. This is intentional — the subscription status becomes `PENDING` (an intermediate status not represented in the enum — actually it stays as TRIAL or goes to ACTIVE only after IPN) and the invoice becomes `PENDING`. The IPN handler (task 05.02.05) finalises the payment. If the payment fails, the cron engine will eventually expire the trial and revert the state. This trade-off simplifies the checkout flow by avoiding a two-step commit.