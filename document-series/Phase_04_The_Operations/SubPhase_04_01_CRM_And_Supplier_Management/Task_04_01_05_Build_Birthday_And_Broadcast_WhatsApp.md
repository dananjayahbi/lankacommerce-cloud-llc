# Task 04.01.05 — Build Birthday and Broadcast WhatsApp

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.05 |
| Complexity | High |
| Dependencies | 04.01.01 + SubPhase_03_02 WhatsApp utility |
| Produces | `backend/apps/crm/views/cron_views.py`, `backend/apps/crm/views/broadcast_view.py`, `frontend/app/[tenantSlug]/customers/broadcast/page.tsx` |

---

## Objective

Implement two WhatsApp-based marketing automation features: an automated birthday greeting endpoint for daily cron execution, and a manual broadcast builder in the dashboard for one-time campaign sends.

---

## Instructions

### Step 1: Confirm Environment Variables

Verify that `CRON_SECRET`, `WHATSAPP_PHONE_ID`, and `WHATSAPP_ACCESS_TOKEN` are documented in the backend `.env.example` file. The `WHATSAPP_PHONE_ID` and `WHATSAPP_ACCESS_TOKEN` were established in SubPhase_03_02. `CRON_SECRET` must be a strong random string of at least 32 characters and must never appear in source control — generate one with `python -c "import secrets; print(secrets.token_hex(32))"` and add it to `.env` and to the deployment environment. Add it to `.env.example` as `CRON_SECRET=your-strong-random-secret-here`.

### Step 2: Build the Birthday Cron DRF View

Create `backend/apps/crm/views/cron_views.py`. Implement `BirthdayGreetingCronView` as a DRF `APIView` with `permission_classes = [AllowAny]` (the CRON_SECRET bearer token replaces session auth for this endpoint). Do not add `JWTAuthentication` — the cron caller is an external scheduler, not a user session.

In the `get(self, request)` method:

**Step 2a — Authenticate via CRON_SECRET:**

Read the `Authorization` header from `request.headers.get('Authorization', '')`. Split on a single space and extract the token (index 1 of the split result). If the header is missing, malformed, or the split produces fewer than 2 parts, return `Response({'success': False, 'error': {'code': 'UNAUTHORIZED', 'message': 'Missing or malformed Authorization header'}}, status=401)`.

Compare the extracted token against `settings.CRON_SECRET` using `hmac.compare_digest(token, settings.CRON_SECRET)`. If `False`, return `Response({'success': False, 'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid CRON_SECRET'}}, status=401)`. The use of `hmac.compare_digest` is mandatory — a plain `==` comparison is vulnerable to timing attacks.

**Step 2b — Determine today's date in Asia/Colombo:**

Import `pytz` and `datetime`. Define `colombo_tz = pytz.timezone('Asia/Colombo')`. Compute `today = datetime.datetime.now(tz=colombo_tz)`. Extract `today.month` and `today.day` for the filter.

**Step 2c — Query matching customers:**

Import `ExtractMonth` and `ExtractDay` from `django.db.models.functions`. Build the queryset:

`Customer.objects.select_related('tenant').annotate(birthday_month=ExtractMonth('birthday'), birthday_day=ExtractDay('birthday')).filter(birthday_month=today.month, birthday_day=today.day, is_active=True, deleted_at__isnull=True)`

This approach uses Django ORM's annotation-then-filter pattern. Customers with `birthday=NULL` are automatically excluded because `ExtractMonth(None)` evaluates to `NULL` in SQL, which does not match any integer value.

**Step 2d — Compose and send greetings:**

For each customer in the queryset:

1. Check `customer.tenant.settings` (a JSONField). If it contains a key `birthday_message`, use that as the template. Otherwise use the default: `"Happy Birthday [name]! Thank you for being a valued customer at [store_name]. We hope to see you soon!"`.
2. Replace `[name]` with the first space-delimited word of `customer.name` (e.g. `customer.name.split()[0]`). Replace `[store_name]` with `customer.tenant.name`.
3. Call `send_whatsapp_message(phone=customer.phone, message=greeting)` from `backend.apps.pos.utils.whatsapp`. Wrap the call in `try: ... except Exception as e: ...`.
4. After each attempt, create a `BirthdayGreetingLog` record: `status='SENT'` on success, `status='FAILED'` and `error_message=str(e)` on exception.
5. Increment `sent_count` on success or `failed_count` on exception.

**Step 2e — Return summary:**

Return `Response({'success': True, 'data': {'processed': len(customers), 'sent': sent_count, 'failed': failed_count}}, status=200)`.

Register the view at `GET /api/crm/cron/birthday-greetings/` in `backend/apps/crm/urls.py`.

### Step 3: Build the Broadcast DRF View

Create `backend/apps/crm/views/broadcast_view.py`. Implement `BroadcastView` as a DRF `APIView` with `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.

**Validate request body** with `BroadcastSerializer`:

- `message` — `CharField(max_length=1000)`, required
- `filters` — `DictField(allow_empty=True, required=False, default=dict)` — optional filter snapshot with keys `tag` (str), `spend_min` (decimal), `birthday_month` (int 1–12)

**Build the recipient queryset:**

`Customer.objects.filter(tenant_id=tenant_id, is_active=True, deleted_at__isnull=True)`

Apply optional filters:

- If `filters.get('tag')`: `.filter(tags__contains=[filters['tag']])`
- If `filters.get('spend_min')`: `.filter(total_spend__gte=Decimal(str(filters['spend_min'])))`
- If `filters.get('birthday_month')`: annotate with `ExtractMonth('birthday')` and filter `birthday_month=filters['birthday_month']`

**Count recipients:**

Call `.count()` on the filtered queryset. If `count > 200`, return `Response({'success': False, 'error': {'code': 'RECIPIENT_LIMIT_EXCEEDED', 'message': 'Recipient count exceeds the 200-recipient limit. Refine your filters.'}}, status=422)`.

If `count == 0`, return `Response({'success': False, 'error': {'code': 'NO_RECIPIENTS', 'message': 'No active customers match the selected filters.'}}, status=422)`.

**Create the broadcast record before sending** (so the broadcast ID exists even if some sends fail):

`broadcast = CustomerBroadcast.objects.create(tenant_id=tenant_id, sent_by=request.user, message=validated_data['message'], filters=validated_data.get('filters', {}), recipient_count=count)`

**Send messages:**

Iterate using `.iterator()` to avoid loading all records into memory. Per customer, call `send_whatsapp_message` wrapped in `try/except`. Track `sent_count`. Do not create per-customer log records here — the broadcast record itself serves as the audit trail.

After the loop, update the actual sent count: `CustomerBroadcast.objects.filter(id=broadcast.id).update(recipient_count=sent_count)`.

Return `Response({'success': True, 'data': {'broadcast_id': str(broadcast.id), 'recipient_count': sent_count}}, status=202)`.

Register at `POST /api/crm/customers/broadcast/` in `backend/apps/crm/urls.py`.

### Step 4: Build the Broadcast Builder Page

Create `frontend/app/[tenantSlug]/customers/broadcast/page.tsx` as a Client Component.

**Layout:** a single centred card (`max-w-2xl mx-auto`) with Inter heading "Send WhatsApp Broadcast".

**Form:**

- Textarea labelled "Message" with a character counter showing remaining characters out of 1000. Red counter when < 50 characters remaining.
- Filter section heading "Recipients" with a description "Only active customers matching the selected filter will receive this message."
- Radio group with four options: "All active customers", "Specific tag" (reveals tag Select), "Spend band" (reveals spend min/max inputs), "Birthday month" (reveals month select 1–12).
- Each radio option reveals a follow-up input in a sliding disclosure panel when selected.

**"Preview Recipients" button:**

Submits the current filter state to `GET /api/crm/customers/` with the selected filter params (and `limit=1` since we only need the `total` count). Displays the count in a muted info card: "This message will be sent to N customers." Use `#3B82F6` blue info card styling. Show a warning in `#F59E0B` amber if `total > 200`: "Recipient count exceeds 200. Refine your filters." Disable the "Send Broadcast" button in this case.

**"Send Broadcast" button:**

Disabled when: no message text entered, preview count is 0, preview count is > 200, or preview has not been run. Enabled otherwise. Shows a `Loader2` spinner during submission.

On click: TanStack Query `useMutation` to `POST /api/crm/customers/broadcast/` with `{ message, filters }`. On `onSuccess`: `toast("Broadcast sent to N customers.")` with success styling, then `router.push('/[tenantSlug]/customers')`. On `onError`: `toast({ variant: "destructive", title: "Broadcast failed", description: error.message })` — keep the user on the page to allow retry.

### Step 5: Document the Cron Schedule

The cron endpoint at `/api/crm/cron/birthday-greetings/` is triggered by an external scheduler. For deployments using Vercel, add or append to the `vercel.json` configuration file a `crons` array entry with `path = "/api/crm/cron/birthday-greetings"` and `schedule = "0 2 * * *"`. This corresponds to 2:00 AM UTC, which is 7:30 AM Sri Lanka Standard Time (UTC+5:30). The `Authorization: Bearer [CRON_SECRET]` header is injected automatically by the Vercel Cron system when `CRON_SECRET` is configured in the project's environment variables.

For non-Vercel deployments, configure the scheduler (crontab, AWS EventBridge, etc.) to send a `GET` request to the endpoint with the `Authorization: Bearer` header set to the same value as `CRON_SECRET`.

---

## Expected Output

- `backend/apps/crm/views/cron_views.py` — `GET /api/crm/cron/birthday-greetings/` secured by `hmac.compare_digest`.
- `backend/apps/crm/views/broadcast_view.py` — `POST /api/crm/customers/broadcast/` with 200-recipient cap.
- `frontend/app/[tenantSlug]/customers/broadcast/page.tsx` — broadcast builder UI with preview and guarded send button.
- `BirthdayGreetingLog` records written per individual greeting attempt.

---

## Validation

- Cron endpoint called without `Authorization` header returns 401.
- Cron endpoint called with `Authorization: Bearer wrong-secret` returns 401.
- Cron endpoint called with a valid CRON_SECRET and a test customer whose birthday matches today creates a `BirthdayGreetingLog` with `status='SENT'`.
- WhatsApp failure during cron creates a `BirthdayGreetingLog` with `status='FAILED'` and `error_message` populated; the cron does not stop — it processes remaining customers.
- Broadcast endpoint with a filter returning 201 customers returns 422 with the recipient limit error.
- Broadcast endpoint with a valid filter (≤ 200 customers) returns 202 with `broadcast_id` and `recipient_count`.
- A `CustomerBroadcast` database record is created before the first message is sent.
- "Send Broadcast" button is disabled when the preview count is > 200.

---

## Notes

- Birthday matching is inherently tolerant of `NULL` birthday values — the `annotate().filter()` chain excludes nulls automatically via SQL `NULL` semantics. No explicit `birthday__isnull=False` filter is needed, but adding it does not hurt.
- Timezone handling is critical: always use `pytz.timezone('Asia/Colombo')` to determine the current local date. A cron running at 2:00 AM UTC equates to 7:30 AM Sri Lanka time — birthday matching must use the Sri Lankan date, not the UTC date.
- Do not log the WhatsApp message body to any persistent application log. The message content in `CustomerBroadcast.message` is the only intended record. This prevents commercially sensitive marketing copy from appearing in log aggregation systems.
- The `.iterator()` call during broadcast sending avoids loading all customer records into Django's ORM identity map at once, which would spike memory usage for large recipient lists.
