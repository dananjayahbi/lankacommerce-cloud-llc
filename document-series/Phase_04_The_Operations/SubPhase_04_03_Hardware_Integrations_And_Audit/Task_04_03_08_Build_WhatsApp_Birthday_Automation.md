# Task 04.03.08 — Build WhatsApp Birthday Automation

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.08 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1 day |
| Dependencies | Customer model (`backend/apps/crm/models.py`), Tenant model with `settings.whatsapp` JSON field |
| Produces | `backend/apps/crm/views/birthday_cron_view.py`, migration file adding `last_birthday_message_sent_year` to Customer model |
| Blocked By | None (standalone CRM feature) |

---

## Objective

Birthday messages are one of the highest-ROI marketing channels for retail stores. A personalised WhatsApp greeting with a special offer drives foot traffic, builds customer loyalty, and creates positive word-of-mouth. LankaCommerce automates this with a cron-triggered endpoint that checks every morning which customers celebrate their birthday today and sends them a tailored WhatsApp message.

The system is designed for safety: it tracks the year each customer last received a birthday message so no customer is messaged twice in the same calendar year. If a tenant has not configured their WhatsApp API settings, their customers are silently skipped with a server warning — one tenant's misconfiguration never crashes the entire cron job. The `hmac.compare_digest()` authentication ensures that only the authorised cron scheduler can trigger the endpoint, preventing abuse.

---

## Instructions

### Step 1: Add the Birthday Tracking Field to the Customer Model

Edit `backend/apps/crm/models.py`. Find the `Customer` model class definition. Add a new field after the existing fields (e.g., after `deleted_at`):

```python
last_birthday_message_sent_year = IntegerField(null=True, blank=True, help_text="The calendar year in which a birthday WhatsApp message was last sent to this customer.")
```

Import `IntegerField` from `django.db.models` if not already imported.

Create and apply the migration:

```
poetry run python manage.py makemigrations crm --name add_last_birthday_message_sent_year
poetry run python manage.py migrate crm
```

Verify the migration by running `poetry run python manage.py showmigrations crm` and confirming the new migration is marked with `[X]`.

### Step 2: Create the Birthday Cron View

Create `backend/apps/crm/views/birthday_cron_view.py`.

Use `from django.http import JsonResponse`. Decorate with `@api_view(["GET"])` and `@permission_classes([])` (no permission — authentication is done via cron secret, not session).

Define a helper function `validate_cron_secret(request)`:

1. Extract the `x-cron-secret` header from `request.headers`.
2. If missing or empty, return `False`.
3. Read `settings.CRON_SECRET` from Django settings. Import `from django.conf import settings`.
4. Use `hmac.compare_digest(header_value, settings.CRON_SECRET)`. Import `from hmac import compare_digest`. This comparison is constant-time and prevents timing attacks.
5. Return `True` if they match, `False` otherwise.

In the main view function `birthday_messages_view(request)`:

1. Call `validate_cron_secret(request)`. If it returns `False`, return a 401 response:
   ```python
   return JsonResponse({"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid or missing cron secret."}}, status=401)
   ```
2. Import `from datetime import date` and `from django.db import connection`.
3. Determine today's month and day:
   ```python
   today = date.today()
   today_month = today.month    # 1-based integer
   today_day = today.day        # 1-based integer
   current_year = today.year
   ```
4. Execute the birthday matching query using raw SQL via `connection.cursor()`:
   ```python
   with connection.cursor() as cursor:
       cursor.execute("""
           SELECT id, tenant_id, name, phone, birthday
           FROM crm_customer
           WHERE EXTRACT(MONTH FROM birthday) = %s
             AND EXTRACT(DAY FROM birthday) = %s
             AND (last_birthday_message_sent_year IS NULL OR last_birthday_message_sent_year != %s)
             AND deleted_at IS NULL
       """, [today_month, today_day, current_year])
       rows = cursor.fetchall()
   ```
5. Process the raw rows into a structured list: `customers = [{"id": r[0], "tenant_id": r[1], "name": r[2], "phone": r[3], "birthday": r[4]} for r in rows]`.
6. Group customers by `tenant_id` using a `defaultdict(list)`:
   ```python
   from collections import defaultdict
   by_tenant = defaultdict(list)
   for c in customers:
       by_tenant[c["tenant_id"]].append(c)
   ```
7. Fetch tenant objects: `from django_tenants.utils import tenant_context` or use `Tenant.objects.get(id=tenant_id)` and access settings directly.

### Step 3: Implement the Send Loop for Each Tenant

For each `tenant_id, tenant_customers` in `by_tenant.items()`:

1. Fetch the Tenant object:
   ```python
   try:
       tenant = Tenant.objects.get(id=tenant_id)
   except Tenant.DoesNotExist:
       logger.warning("Birthday cron: Tenant %s not found, skipping %d customers.", tenant_id, len(tenant_customers))
       skipped += len(tenant_customers)
       continue
   ```
2. Read WhatsApp settings from `tenant.settings`:
   ```python
   whatsapp_config = tenant.settings.get("whatsapp", {})
   api_url = whatsapp_config.get("api_url")
   api_key = whatsapp_config.get("api_key")
   template_name = whatsapp_config.get("birthday_template_name", "happy_birthday")
   store_name = tenant.settings.get("store_name", tenant.name)
   ```
3. If `api_url` or `api_key` is missing:
   ```python
   logger.warning("Birthday cron: Tenant %s has no WhatsApp API config. Skipping %d customers.", tenant.slug, len(tenant_customers))
   skipped += len(tenant_customers)
   continue
   ```
4. For each customer in `tenant_customers`:
   - Check `customer["phone"]`: if `None` or empty string, increment `skipped` and `continue`.
   - Construct the message body:
     `Happy Birthday {customer_name}! Come celebrate with us at {store_name} — show this message for a special treat.`
     Where `{customer_name}` is `customer["name"]` and `{store_name}` is `store_name`.
   - Send the WhatsApp POST request using the `requests` library:
     ```python
     import requests
     try:
         resp = requests.post(
             api_url,
             headers={"Authorization": f"Bearer {api_key}"},
             json={
                 "messaging_product": "whatsapp",
                 "to": customer["phone"],
                 "type": "template",
                 "template": {
                     "name": template_name,
                     "language": {"code": "en"},
                     "components": [{
                         "type": "body",
                         "parameters": [{"type": "text", "text": customer["name"].split()[0] if customer["name"] else ""}]
                     }]
                 }
             },
             timeout=15,
         )
         if resp.status_code >= 200 and resp.status_code < 300:
             Customer.objects.filter(id=customer["id"]).update(last_birthday_message_sent_year=current_year)
             sent += 1
         else:
             logger.error("Birthday cron: WhatsApp API error for customer %s (tenant %s): HTTP %d - %s",
                          customer["id"], tenant.slug, resp.status_code, resp.text[:200])
             failed += 1
     except requests.exceptions.RequestException as exc:
         logger.error("Birthday cron: Network error sending to customer %s (tenant %s): %s",
                      customer["id"], tenant.slug, str(exc))
         failed += 1
     ```
   - Insert `time.sleep(0.2)` between sends to avoid rate limiting.

### Step 4: Edge Case Handling

Cover these specific edge cases in the implementation:

- **Customer with no phone number**: Check `customer["phone"]` before sending. If falsy (`None`, `""`), increment `skipped` and `continue`. Do not attempt to send.
- **Tenant with no WhatsApp config**: Log a warning at the tenant level with the tenant slug: `logger.warning("Birthday cron: Tenant '%s' has incomplete WhatsApp configuration. Skipping %d customer(s).", tenant.slug, len(tenant_customers))`. Increment `skipped` by the group count and `continue` to the next tenant.
- **WhatsApp API returns non-2xx**: Log the specific HTTP status code and first 200 characters of the response body. Increment `failed` and continue to the next customer. Do not stop the entire batch.
- **Network timeout or DNS failure**: Catch `requests.exceptions.RequestException` broadly, log the customer ID and error message, increment `failed`, and continue.
- **Customer deleted between query and send**: The `Customer.objects.filter(id=customer["id"]).update(...)` call will simply match zero rows, which is harmless.

### Step 5: Build and Return the Response

After processing all tenants, construct the summary:

```python
processed = sent + failed + skipped
response_data = {
    "success": True,
    "data": {
        "processed": processed,
        "sent": sent,
        "failed": failed,
        "skipped": skipped,
    }
}
```

Import `import logging` and use `logger = logging.getLogger(__name__)`. Log the summary at INFO level:

```python
logger.info(
    "Birthday cron completed for %s. Sent: %d, Failed: %d, Skipped: %d (out of %d processed).",
    today.isoformat(), sent, failed, skipped, processed
)
```

Return `JsonResponse(response_data)`.

### Step 6: Configure the Cron Schedule

Document the following cron configuration for production deployment:

**Vercel Cron Jobs** (if using Vercel for the Django API):
- Use `vercel.json` with a cron job configuration:
  ```json
  {
    "crons": [
      {
        "path": "/api/crm/cron/birthday-messages/",
        "schedule": "0 8 * * *"
      }
    ]
  }
  ```
- Set the `CRON_SECRET` environment variable in your Vercel project settings. This value MUST match the `x-cron-secret` header that Vercel sends with cron requests (configured in Vercel dashboard under Cron Jobs).

**Traditional server cron**:
- Add a crontab entry: `0 8 * * * curl -H "x-cron-secret: YOUR_CRON_SECRET" https://yourdomain.com/api/crm/cron/birthday-messages/`.
- Store `CRON_SECRET` in the Django `.env` file and read it via `settings.CRON_SECRET`.

**Important**: The `CRON_SECRET` environment variable must be at least 32 characters long and generated using a cryptographically secure random generator. Use `openssl rand -hex 32` to generate one.

---

## Expected Output

- Migration file: `backend/apps/crm/migrations/XXXX_add_last_birthday_message_sent_year.py`.
- Updated `backend/apps/crm/models.py` with `last_birthday_message_sent_year` field on the `Customer` model.
- `backend/apps/crm/views/birthday_cron_view.py` — cron endpoint with HMAC validation, raw SQL birthday matching, grouped send loop, and error-resilient per-customer processing.
- Cron configuration documented in deployment notes.

---

## Validation

- **HMAC security**: Send a request without the `x-cron-secret` header — returns 401. Send with a wrong secret — returns 401. Send with the correct secret — proceeds to process.
- **No birthdays today**: The endpoint returns `{ "processed": 0, "sent": 0, "failed": 0, "skipped": 0 }`. The log confirms no matching customers found.
- **Customer with matching birthday but already messaged this year**: Create a customer with `birthday=today` and `last_birthday_message_sent_year=2026`. The raw SQL excludes them because `last_birthday_message_sent_year != 2026` evaluates to `FALSE`. They are not sent a message.
- **Customer with matching birthday and no last_birthday_message_sent_year**: The raw SQL `OR last_birthday_message_sent_year IS NULL` includes them. A message is sent and `last_birthday_message_sent_year` is updated to the current year.
- **Tenant with no WhatsApp config**: Logged as a warning. All their customers are skipped. The endpoint still processes other tenants normally.
- **Customer with empty phone**: Skipped with incremented `skipped` counter. Other customers for the same tenant are processed.
- **WhatsApp API returns 500**: Logged as an error with HTTP status and response snippet. `failed` counter incremented. Execution continues to the next customer.
- **Rate limiting**: The 200ms `time.sleep(0.2)` between sends prevents hitting WhatsApp's rate limits (typically 250 messages per second per phone number — the delay is conservative insurance).
- **Concurrent cron invocations**: If the cron job fires while a previous run is still processing, both runs execute independently. The `last_birthday_message_sent_year` guard prevents duplicate sends within the same calendar year, but to avoid double-processing, keep the cron schedule aligned with expected run duration (a batch of 500 customers at 0.2s each takes about 100 seconds — schedule every 5 minutes at most).
- **Idempotency within the same day**: If the cron runs twice on the same day, customers messaged in the first run have `last_birthday_message_sent_year` set to the current year, so the second run skips them. No duplicates.

---

## Notes

The raw SQL query with `EXTRACT(MONTH FROM birthday)` and `EXTRACT(DAY FROM birthday)` is used instead of Django ORM lookups because cross-database date-part extraction is inconsistent across PostgreSQL, SQLite, and MySQL. The raw query ensures compatibility with the development SQLite database and the production PostgreSQL database without requiring database-specific ORM expressions. If the team later standardises solely on PostgreSQL, this can be refactored to Django's `birthday__month` and `birthday__day` lookups for improved readability.

The `time.sleep(0.2)` delay between sends is a conservative pacing mechanism. WhatsApp Business API rate limits vary by region and account age, but a 200ms gap corresponds to 5 messages per second, which is well below the standard 80-messages-per-second limit for most WhatsApp Business accounts. The delay is adjustable via a module-level constant `SEND_DELAY_SECONDS = 0.2` if tuning. For tenants with very large customer bases (thousands of birthday customers on a single day), consider switching to an async task queue like Celery or Upstash QStash.

Customer birthdays are stored as a full `Date` field with an arbitrary year. The system ignores the year and only matches month and day. This means a customer born on any year will match if their month and day align with today. This is intentional — the year component is only used to calculate age if needed for future regulatory compliance or age-restricted promotions, but the birthday message system itself is year-agnostic.

## Objective

Cron-triggered birthday greeting system, sending WhatsApp messages to customers whose birthday is today.

## Instructions

### Step 1: Customer Model Migration

Add a field `last_birthday_message_sent_year = IntegerField(null=True, blank=True)` to the Customer model in `backend/apps/crm/models.py`. Create and run the migration:

```
poetry run python manage.py makemigrations crm --name add_last_birthday_message_sent_year
poetry run python manage.py migrate
```

### Step 2: Birthday Cron View

Create `GET /api/crm/cron/birthday-messages/` in `backend/apps/crm/views/birthday_cron_view.py`. Implement CRON_SECRET validation: extract the `x-cron-secret` header from the request and compare it with `settings.CRON_SECRET` using `hmac.compare_digest()` from the Python `hmac` module. Return 401 with an error response if the secrets do not match.

### Step 3: Query Logic

Determine today's month (1-based integer) and day. Query customers whose birthday matches today using Django's `connection.cursor()` from `django.db`:

```sql
SELECT * FROM crm_customer
WHERE EXTRACT(MONTH FROM birthday) = %s
  AND EXTRACT(DAY FROM birthday) = %s
  AND (last_birthday_message_sent_year IS NULL OR last_birthday_message_sent_year != %s)
  AND deleted_at IS NULL
```

Parameters: today_month, today_day, current_year.

### Step 4: Group and Send

Group matching customers by tenant. For each tenant, fetch `Tenant.settings.whatsapp` configuration. Skip tenants that do not have WhatsApp settings configured (log a warning and continue).

For each customer, send a WhatsApp message via the `requests` library:

- URL: from tenant WhatsApp settings.
- Headers: `Authorization: Bearer {api_key}`.
- JSON payload with `messaging_product: whatsapp`, `to: customer_phone`, `type: text`, and `text.body` containing the message: "Happy Birthday {customer.name}! Come celebrate with us at {store_name} — show this message for a special treat."

On a successful 2xx response, update the customer record:
`Customer.objects.filter(id=c.id).update(last_birthday_message_sent_year=current_year)`

Insert a 200-millisecond delay between sends using `time.sleep(0.2)`.

### Step 5: Response

Return the response envelope:
`{ "success": True, "data": { "processed": N, "sent": N, "failed": N, "skipped": N } }`

Log a summary via `logger.info`.

### Step 6: Cron Configuration

Document the required cron configuration: schedule the endpoint at 08:00 UTC daily. Set `CRON_SECRET` in the Django environment variables (`.env` or server configuration). For Vercel/CRON deployments, the CRON_JOB_SECRET environment variable maps to the `x-cron-secret` header.