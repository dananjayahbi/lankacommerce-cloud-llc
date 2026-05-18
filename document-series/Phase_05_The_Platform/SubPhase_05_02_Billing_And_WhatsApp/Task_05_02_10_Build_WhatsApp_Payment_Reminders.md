# Task 05.02.10 — Build WhatsApp Payment Reminders

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.10 |
| SubPhase | 05.02 — Billing and WhatsApp Automation |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 05.02.06 (Grace period and suspension engine), SubPhase 03.02 (Meta Cloud API WhatsApp utility) |
| Produces | `backend/apps/billing/views/payment_reminders_cron_view.py` |
| Blocked By | Task 05.02.06 |

---

## Objective

Implement a daily cron job that sends automated WhatsApp payment reminders to tenant Owners at three points in the payment lifecycle: three days before the invoice due date, on the due date, and daily during the grace period while the invoice remains unpaid. Every send attempt is recorded as a `PaymentReminder` record, and duplicate reminders for the same invoice on the same calendar day are prevented.

---

## Instructions

### Step 1: Register the Cron in Configuration

In `backend/config/settings.py`, add the cron schedule configuration. The cron fires at 9:00 AM UTC each morning, after the midnight check-subscriptions cron has already processed any status transitions. Document the schedule as `"0 9 * * *"` for Vercel Cron or a traditional cron daemon.

### Step 2: Create the Route File and Authenticate

Create `backend/apps/billing/views/payment_reminders_cron_view.py`. Define `PaymentRemindersCronView` as a Django class-based view accepting GET requests. Perform CRON_SECRET validation: extract the `Authorization` header, parse the Bearer token, compare using `hmac.compare_digest()` from Python's `hmac` module. Return 401 immediately on failure.

Import the WhatsApp send utility from `backend/apps/integrations/services/whatsapp_service.py` (established in SubPhase 03.02). Import `timezone` from `django.utils`.

### Step 3: Initialise the Run Context

Set `run_at = timezone.now()` and `run_date_start = run_at.replace(hour=0, minute=0, second=0, microsecond=0)` and `run_date_end = run_date_start + timedelta(days=1)`. Initialise counters: `three_day_reminders_sent = 0`, `due_date_reminders_sent = 0`, `overdue_reminders_sent = 0`, `failure_count = 0`.

### Step 4: Send Three-Day-Before Reminders

Define `target_date = run_date_start + timedelta(days=3)` and `target_date_end = target_date + timedelta(days=1)`.

Query `Invoice.objects.filter(status='PENDING', due_date__gte=target_date, due_date__lt=target_date_end).select_related('tenant__owner', 'subscription')`.

For each result: check for an existing `PaymentReminder` where `invoice_id` matches and `type='THREE_DAY_REMINDER'`. If one already exists, skip. Invoke the WhatsApp send utility with the Owner's phone number normalised to international format (see Step 7). Message: "Dear [ownerFirstName], your LankaCommerce subscription payment of LKR [amount] is due on [due_date formatted dd/MM/yyyy]. Please pay at: [billingPageUrl]."

Wrap in `try/except`. On success: create `PaymentReminder.objects.create(type='THREE_DAY_REMINDER', channel='WHATSAPP', sent_at=run_at, status='SENT')`. Increment `three_day_reminders_sent`. On failure: create with `status='FAILED'`. Increment `failure_count`.

### Step 5: Send Due-Date Reminders

Query `Invoice.objects.filter(status='PENDING', due_date__gte=run_date_start, due_date__lt=run_date_end).select_related('tenant__owner', 'subscription')`.

For each result: check for existing `PaymentReminder` where `invoice_id` matches, `type='DUE_DATE_REMINDER'`, and `sent_at` is between `run_date_start` and `run_date_end`. Skip if found. Message: "Dear [ownerFirstName], your LankaCommerce subscription payment of LKR [amount] is due today. Please pay now to avoid service interruption: [billingPageUrl]."

Same `try/except` pattern. Create `PaymentReminder` with `type='DUE_DATE_REMINDER'`. Increment `due_date_reminders_sent` on success.

### Step 6: Send Overdue Reminders

Query `Invoice.objects.filter(status='PENDING', due_date__lt=run_date_start, subscription__status='PAST_DUE').select_related('tenant__owner', 'subscription')`.

For each result: check whether an `OVERDUE_REMINDER` `PaymentReminder` already exists where `sent_at` is between `run_date_start` and `run_date_end`. Skip if found — limit to one overdue reminder per invoice per calendar day. Message: "Dear [ownerFirstName], your LankaCommerce subscription payment of LKR [amount] is overdue. Your access will be suspended if payment is not received soon. Pay now: [billingPageUrl]. Reply STOP to opt out of reminders."

Create `PaymentReminder` with `type='OVERDUE_REMINDER'`. Increment `overdue_reminders_sent` on success.

### Step 7: Normalise Phone Numbers for Meta Cloud API

Before calling the WhatsApp utility, normalise every phone number to digits-only format with country code. For Sri Lankan mobile numbers:
- If the number starts with "0" (e.g., 0771234567), replace the leading 0 with "94" to produce "94771234567".
- If the number starts with "+94", strip the "+" to produce "94771234567".
- If the number already starts with "94" and is 11 digits long, use as-is.
- If the number cannot be resolved to a plausible Sri Lankan mobile number (does not match `/^947\d{8}$/`), skip the WhatsApp send and create a `PaymentReminder` with `status='FAILED'`.

### Step 8: Construct the Billing Page URL

Generate the billing page URL for each tenant: `settings.APP_URL + "/" + tenant.slug + "/billing"`. If subdomain-based routing is in use, construct: `"https://" + tenant.slug + "." + settings.BASE_DOMAIN + "/billing"`.

### Step 9: Return the Summary Response

After all three reminder passes complete, return a JSON response with status 200: `{ "run_at": run_at.isoformat(), "three_day_reminders_sent": N, "due_date_reminders_sent": N, "overdue_reminders_sent": N, "failure_count": N }`. Wrap the entire handler body in a top-level `try/except` so that any unexpected error still returns a 200 with an `error` field.

---

## Expected Output

- `GET /api/billing/cron/payment-reminders/` — timing-safe authenticated daily cron view.
- Three-day reminders sent for invoices due in three days (first send only).
- Due-date reminders sent for invoices due today (first send only).
- Overdue reminders sent daily (once per calendar day) for PAST_DUE invoices.
- `PaymentReminder` records for every attempt with type, channel, sent_at, and status.
- Phone number normalisation for Sri Lankan mobile format.
- Summary JSON response with per-type counts.

---

## Validation

- GET without Authorization header returns 401.
- GET with correct CRON_SECRET returns 200.
- A THREE_DAY_REMINDER is created for an invoice with due_date exactly 3 days from today.
- A second run on the same day does not create a duplicate THREE_DAY_REMINDER for the same invoice.
- A DUE_DATE_REMINDER is created for an invoice whose due_date is today.
- An OVERDUE_REMINDER is created for a PAST_DUE invoice where due_date is yesterday.
- A second run of the overdue pass on the same day does not duplicate the OVERDUE_REMINDER.
- A phone number "0771234567" is normalised to "94771234567" before the API call.
- A malformed phone number creates a FAILED PaymentReminder and does not crash the cron.
- Summary response counts match the actual number of PaymentReminder records created.

---

## Notes

The WhatsApp Cloud API utility from SubPhase 03.02 should handle authentication and message construction. Reuse it directly. The "Reply STOP to opt out" text in the overdue reminder is a best-practice WhatsApp messaging courtesy. Implement opt-out handling in a future SubPhase if needed. If a tenant has multiple PENDING invoices, each invoice generates an independent set of reminders. The cron processes all qualifying invoices regardless of whether they are from the same tenant.
