# Task 03.02.07 — Build WhatsApp Receipt Dispatch

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.07 |
| Name | Build WhatsApp Receipt Dispatch |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | Task 03.02.06 |
| Produces | `backend/apps/pos/services/whatsapp_service.py`, DRF view `POST /api/pos/sales/{id}/send-receipt/` |

## Objective

Implement WhatsApp receipt dispatch using the Meta Cloud API with pre-approved message templates. The integration allows the cashier to send a receipt to the customer's WhatsApp number from the `ReceiptPreviewDialog` after a sale is completed. The dispatch is fire-and-forget — a failure never blocks, reverses, or delays the completed sale.

## Instructions

### Step 1: Document the Required Environment Variables

Update the `.env.example` file in the project root and the corresponding `backend/config/settings/base.py` (or the settings file used to read environment variables). Add the following three settings with descriptive comments:

`WHATSAPP_PHONE_NUMBER_ID` — the numeric ID of the WhatsApp Business phone number, found in Meta Business Manager under WhatsApp > Phone Numbers. Read via `os.environ.get('WHATSAPP_PHONE_NUMBER_ID')` in settings.

`WHATSAPP_ACCESS_TOKEN` — the system user access token from the Meta Developer console. Never commit a real value. Read via `os.environ.get('WHATSAPP_ACCESS_TOKEN')`.

`WHATSAPP_TEMPLATE_NAME` — the exact name of the approved WhatsApp Business message template. The template must be approved in Meta Business Manager and must contain exactly four variable placeholders: `{{1}}` store name, `{{2}}` sale reference, `{{3}}` items summary, `{{4}}` total amount. Read via `os.environ.get('WHATSAPP_TEMPLATE_NAME')`.

Add a comment block above the three settings explaining that the integration uses the Meta Cloud API (not Twilio). In development, any phone number added as a test contact in the Meta developer sandbox receives messages without template approval.

### Step 2: Create the WhatsApp Service Module

Create `backend/apps/pos/services/whatsapp_service.py`. Add a module-level docstring stating that this module provides WhatsApp Business messaging via the Meta Cloud API v18.0. Import `requests` (or Python's `urllib.request`), `re`, `logging`, and `django.conf.settings`.

Define a `WhatsAppReceiptPayload` as a Python `dataclass` or `TypedDict` with four string fields: `store_name`, `sale_reference` (the short 8-character uppercase sale identifier), `items_summary` (a pre-formatted compact text summary), and `total_amount` (pre-formatted with the "Rs." prefix and two decimal places). Accepting pre-formatted strings keeps all formatting logic in the caller.

### Step 3: Implement format_receipt_template_components

Define `format_receipt_template_components(payload: WhatsAppReceiptPayload, language_code: str = "en") -> list`. The function returns the Meta API template `components` array.

The return value is a list with one element: a dict with `type: "body"` and a `parameters` list. The `parameters` list contains four dicts, each with `type: "text"`. Parameters map to template variables `{{1}}` through `{{4}}`: `store_name`, `sale_reference`, `items_summary` (truncated to 57 characters with "…" appended if it exceeds 60 characters), and `total_amount`. The truncation prevents Meta API errors from template variable values exceeding the character limit.

### Step 4: Implement format_phone_number

Define `format_phone_number(raw_phone: str) -> str`. The function converts a raw phone number string to E.164 format.

Processing steps: strip all whitespace, hyphens, parentheses, and plus signs using `re.sub`. If the cleaned string starts with "0", remove the leading "0" and prepend "94" for the Sri Lanka country code. If it already starts with "94", use as-is. Prepend "+" to produce E.164 format. Validate the final result against the pattern `^\+[0-9]{7,15}$`. If it does not match, raise a `ValueError` with the message "Invalid phone number format: the number provided cannot be converted to a valid E.164 format."

### Step 5: Implement send_whatsapp_receipt_message

Define `send_whatsapp_receipt_message(phone_number: str, sale_id: str, sale_data: WhatsAppReceiptPayload) -> dict`. The function returns a dict with shape `{"success": bool, "error": str | None}`. It never raises exceptions.

Steps inside the function: call `format_phone_number` inside a try-except; if it raises `ValueError`, return `{"success": False, "error": "Invalid phone number: " + str(e)}`. Read `settings.WHATSAPP_PHONE_NUMBER_ID`, `settings.WHATSAPP_ACCESS_TOKEN`, and `settings.WHATSAPP_TEMPLATE_NAME`. If any is missing or empty, return `{"success": False, "error": "WhatsApp is not configured. Missing environment variables."}`.

Construct the Meta Cloud API request: URL is `"https://graph.facebook.com/v18.0/"` + `WHATSAPP_PHONE_NUMBER_ID` + `"/messages"`. Method `POST`. Headers: `Content-Type: application/json` and `Authorization: Bearer <token>`. Body: `messaging_product: "whatsapp"`, `recipient_type: "individual"`, `to: <formatted_phone>`, `type: "template"`, `template: { name: WHATSAPP_TEMPLATE_NAME, language: { code: "en" }, components: [result of format_receipt_template_components] }`.

Wrap the HTTP call in try-except. If a network error occurs, log it with `sale_id` context and return `{"success": False, "error": "WhatsApp dispatch failed due to a network error."}`. If the response status is not 200 or 201, log the error body with `sale_id` context and return `{"success": False, "error": "WhatsApp dispatch failed. Meta API returned HTTP status " + str(status_code)}`. If 200 or 201, return `{"success": True}`.

### Step 6: Build the DRF View

Implement a `SendReceiptView` in `backend/apps/pos/views/sale_views.py`. Use `JWTAuthentication` and `HasTenantPermission`. The `post` method: validate session (401 if absent). Validate the request body — it must contain a `phone_number` field (string, length 7–20). Return 400 on validation failure. Read the sale `id` from URL kwargs. Call `sale_service.get_sale_by_id`. Return 404 if not found. Fetch the `Tenant` record. Assemble the `WhatsAppReceiptPayload`: `store_name` from tenant name, `sale_reference` from the first 8 characters of `sale.id` in uppercase, `items_summary` by joining the first three `product_name_snapshot` values from sale lines with ", ", `total_amount` formatted with the currency formatter.

Call `send_whatsapp_receipt_message`. If the result has `success: True`, update `sale.whatsapp_receipt_sent_at = timezone.now()` and save. Return `{"success": True}` in a 200 response. If `success: False`, do NOT return an HTTP error status — return 200 with `{"success": False, "error": "..."}`. This keeps client-side handling uniform.

### Step 7: Audit Log on Failure in Production

After a failed `send_whatsapp_receipt_message` result, add a conditional block: if `settings.DEBUG is False`, write an `AuditLog` record with `action: "WHATSAPP_DISPATCH_FAILED"`, `entity_type: "SALE"`, `entity_id: sale_id`, `user_id` from the JWT claims, and the error string as the description. Wrap this in a separate try-except — if the `AuditLog` write fails, log to the Python logger and continue. An `AuditLog` write failure must never change the HTTP response.

## Expected Output

- `backend/apps/pos/services/whatsapp_service.py` with `format_phone_number`, `format_receipt_template_components`, and `send_whatsapp_receipt_message`.
- `SendReceiptView` added to `backend/apps/pos/views/sale_views.py`.
- Settings updated with the three WhatsApp environment variable entries.

## Validation

- Call `format_phone_number("0771234567")` and confirm it returns `"+94771234567"`.
- Call `format_phone_number("+94771234567")` and confirm it returns `"+94771234567"` unchanged.
- Call `format_phone_number("notaphone")` and confirm it raises `ValueError`.
- `POST /api/pos/sales/{id}/send-receipt/` in the Meta developer sandbox returns 200 with `success: True` and sets `whatsapp_receipt_sent_at` on the sale.
- Simulate a Meta API failure (invalid token) — confirm the route returns HTTP 200 with `success: False`.

## Notes

- The Meta Cloud API v18.0 base URL and the approved template name must match exactly. A mismatch results in a 400 error from Meta that is logged and returned as a generic dispatch failure message.
- For production, generate a system user token with a non-expiring access policy in Meta Business Manager. Document this in team onboarding notes.
- Phone numbers are validated by `format_phone_number` before the API call — the Meta API can silently fail with non-E.164 numbers.
