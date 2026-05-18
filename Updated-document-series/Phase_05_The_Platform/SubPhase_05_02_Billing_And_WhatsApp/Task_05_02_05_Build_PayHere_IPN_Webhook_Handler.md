# Task 05.02.05 — Build PayHere IPN Webhook Handler

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.05 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | Very High |
| Estimated Effort | 3-4 hours |
| Depends On | 05.02.01 (Billing models), 05.02.04 (Checkout integration) |
| Produces | `backend/apps/billing/views/payhere_webhook_view.py`, `backend/apps/billing/services/payhere_service.py` (updated with IPN validation) |
| Blocked By | PayHere merchant account setup (sandbox credentials) |

---

## Objective

Build the PayHere IPN (Instant Payment Notification) webhook handler that receives asynchronous payment status updates from PayHere. Every time a transaction is created, updated, or completed, PayHere sends a URL-encoded POST to the `notify_url` specified in the checkout payload. The handler must validate the MD5 signature of every IPN, record every event as an `InvoicePaymentEvent` audit record, and — only for successful payments (`status_code = 2`) — atomically update the invoice to PAID, mark the subscription as ACTIVE, and set the tenant's `subscription_status` to ACTIVE.

The handler must be idempotent: duplicate IPNs (PayHere may retry) must not double-process the invoice. The handler must return HTTP 200 for every well-formed IPN, even failed ones, because PayHere interprets non-200 responses as delivery failures and will retry indefinitely.

---

## Instructions

### Step 1: Add IPN Validation to PayHere Service

In `backend/apps/billing/services/payhere_service.py`, add the following static methods:

Define `validate_ipn_signature(payhere_md5sig, merchant_id, order_id, payhere_amount, payhere_currency, status_code)` as a `@staticmethod`:

- Take the six parameters: the `md5sig` from the IPN payload, `merchant_id`, `order_id`, `payhere_amount`, `payhere_currency`, and `status_code`.
- Build the expected hash string by concatenating `merchant_id` + `order_id` + `payhere_amount` + `payhere_currency` + `status_code` + `settings.PAYHERE_MERCHANT_SECRET` with no separators.
- Compute `hashlib.md5(hash_string.encode('utf-8')).hexdigest()`.
- Use `hmac.compare_digest(computed_hash, payhere_md5sig)` for a timing-safe comparison.
- Return `True` if they match, `False` otherwise.

Define `normalise_phone_for_sms(phone)` as a `@staticmethod`:

- Strip all non-digit characters from the phone string.
- If the result starts with `94`, prepend `+`.
- If the result starts with `0`, strip the leading `0` and prepend `+94`.
- Otherwise, prepend `+94`.
- Return the normalised phone string. This is used later for WhatsApp reminders but is defined here because the phone normalisation pattern is the same.

### Step 2: Create the IPN Webhook View

Create `backend/apps/billing/views/payhere_webhook_view.py`. Define a `PayHereWebhookView` class using `APIView` with:

- `authentication_classes = []` — the IPN endpoint has no authentication because PayHere does not send auth headers. Security is provided by MD5 signature validation instead.
- `permission_classes = []` — no permission classes.
- `csrf_exempt = True` — decorate the dispatch or use `@method_decorator(csrf_exempt, name='dispatch')` because PayHere sends a form POST without a CSRF token.

Define the `post` handler:

1. Read the request body as URL-encoded form data using `request.data` (DRF's `Request` object handles form-encoded data). PayHere sends the IPN as `application/x-www-form-urlencoded`.

2. Extract the following fields from `request.data`:
   - `merchant_id`
   - `order_id`
   - `payhere_amount` — use `request.data.get('amount')` (PayHere sends it as `amount`)
   - `payhere_currency` — use `request.data.get('currency')`
   - `status_code` — use `request.data.get('status_code')`
   - `md5sig`
   - `custom_1` — optional, can contain extra data
   - All other fields — capture the entire `request.data` dict as the `raw_payload`.

3. Validate that `order_id` is not empty. If empty, log a warning and return HTTP 200 (with `{"success": False, "error": "Missing order_id"}`) to prevent PayHere retries.

4. Look up the invoice: `Invoice.objects.select_related('subscription', 'tenant').filter(invoice_number=order_id).first()`. If not found, log a warning with the `order_id` and return HTTP 200 (so PayHere stops retrying).

5. Create an `InvoicePaymentEvent` record with:
   - `invoice=invoice`
   - `payhere_status_code=status_code`
   - `payhere_order_id=order_id`
   - `payhere_amount=payhere_amount`
   - `payhere_currency=payhere_currency`
   - `payhere_md5sig=md5sig`
   - `signature_valid=False` (will be updated after validation)
   - `raw_payload=request.data.dict()` (the full payload)
   - `processed=False`

6. Validate the MD5 signature: call `PayHereService.validate_signature(md5sig, merchant_id, order_id, payhere_amount, payhere_currency, status_code)`.

7. Update the `InvoicePaymentEvent` record with `signature_valid=True` or keep it as `False`.

8. If `signature_valid` is `True` and `status_code == "2"` (success), proceed inside `with transaction.atomic():`:
   - Check if the `InvoicePaymentEvent.processed` flag:
     - Run `InvoicePaymentEvent.objects.select_for_update().filter(id=event.id)` to acquire a row-level lock on the event.
     - If `event.processed` is already `True`, skip processing (idempotency guard).
     - Set `event.processed = True` and save.
   - Update the `Invoice`: set `status = InvoiceStatus.PAID`, `paid_at = timezone.now()`, `payhere_order_id = order_id`.
   - Update the `Subscription`: set `status = SubscriptionStatus.ACTIVE`, `current_period_start = timezone.now()` (or keep existing), `current_period_end = timezone.now() + timedelta(days=30)`.
   - Update the `Tenant`: `Tenant.objects.filter(id=invoice.tenant_id).update(subscription_status=SubscriptionStatus.ACTIVE)`.
   - Call `InvoiceService.mark_invoice_paid(invoice)` from task 05.02.08 if defined, else perform the update directly.

9. If `signature_valid` is `True` and `status_code == "-1"` (cancelled) or `"-2"` (failed), update the invoice status to `InvoiceStatus.FAILED`.

10. If `signature_valid` is `False`, log a security warning with the `order_id` and the computed vs. received md5sig for debugging.

11. Return HTTP 200 with `{"success": True}` for every IPN, regardless of outcome.

### Step 3: Handle Recurring IPN Payloads

PayHere sends a slightly different payload for recurring subscription payments. The `recurring` field will be present in `request.data`. If `request.data.get('recurring')` is `"1"`, the IPN is for a recurring payment:

- Use the `subscription` from the invoice's subscription relation.
- If PayHere sends a new `subscription_token`, update `Subscription.payhere_subscription_token`.
- The same status code logic applies: `2` marks the invoice paid and creates the next invoice automatically (via `InvoiceService.auto_generate_next_invoice` from task 05.02.08).

### Step 4: Add URL Routing

In `backend/config/urls.py` or `backend/apps/billing/urls.py`, add:

- `path("api/billing/webhooks/payhere/", PayHereWebhookView.as_view(), name="billing-payhere-webhook")`.

Ensure this path is `csrf_exempt`. The URL must match the `notify_url` specified in the checkout payload exactly, including the trailing slash.

---

## Expected Output

- `POST /api/billing/webhooks/payhere/` accepts URL-encoded form data, validates the MD5 signature, creates an `InvoicePaymentEvent`, and processes successful payments atomically
- Every IPN — valid or invalid, success or failure — returns HTTP 200
- Duplicate IPNs for the same `order_id` and `status_code` create duplicate `InvoicePaymentEvent` records but do not double-process the invoice
- The `InvoicePaymentEvent.processed` flag prevents duplicate processing within the same IPN delivery (rare double-call scenario)
- Successful payments set `Invoice.status = PAID`, `Subscription.status = ACTIVE`, and `Tenant.subscription_status = ACTIVE`

---

## Validation

- Send a test IPN POST via `curl` to `POST /api/billing/webhooks/payhere/` with valid form data — confirm HTTP 200 and an `InvoicePaymentEvent` record is created
- Send a test IPN with an invalid `md5sig` — confirm HTTP 200, `InvoicePaymentEvent.signature_valid = False`, and no invoice/subscription/tenant mutations
- Send a test IPN with `status_code = 2` and a valid signature for a PENDING invoice — confirm the invoice status changes to PAID, subscription becomes ACTIVE, tenant subscription_status becomes ACTIVE
- Send the same successful IPN a second time — confirm a second `InvoicePaymentEvent` is created, the invoice remains PAID, and no double-processing occurs
- Send an IPN with a non-existent `order_id` — confirm HTTP 200 and a warning log entry
- Send an IPN with `status_code = -2` (failed) — confirm invoice status changes to FAILED
- Verify in PostgreSQL that the `invoice_payment_event` row's `raw_payload` column contains the full IPN payload as JSON
- Check the application logs for the security warning when an IPN with an invalid signature is received

---

## Notes

- The IPN endpoint is deliberately unauthenticated because PayHere does not send authentication credentials. Security relies entirely on MD5 signature validation. Do NOT add `JWTAuthentication` or any API key check to this endpoint.
- The `InvoicePaymentEvent.processed` flag combined with `select_for_update` prevents a race condition where two IPN notifications for the same invoice arrive simultaneously. The first transaction acquires the row lock and processes; the second skips because `processed` is already `True`.
- PayHere sends `status_code` as a string. Always compare with `"2"` (string), not `2` (integer). The IPN payload fields are all strings.
- Some PayHere IPN payloads include `custom_1` through `custom_4` fields. These are preserved in `raw_payload` but not processed — they are available for future extensibility.
- The MD5 signature for IPN validation includes `status_code` in the hash string, unlike the checkout payload hash which does not. This is a deliberate PayHere security design. The concatenation order is: `merchant_id + order_id + amount + currency + status_code + merchant_secret`.
- PayHere's IPN retry policy: if the webhook returns anything other than HTTP 200, PayHere retries at increasing intervals (1 minute, 5 minutes, 15 minutes, 1 hour, 6 hours, 24 hours). After 7 days of continuous failure, PayHere stops retrying. Always return HTTP 200 even for malformed payloads.