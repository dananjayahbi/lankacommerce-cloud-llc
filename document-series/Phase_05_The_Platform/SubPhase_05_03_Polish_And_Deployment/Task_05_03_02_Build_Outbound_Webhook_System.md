# Task 05-03-02: Build Outbound Webhook System

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-02 |
| **Priority** | High |
| **Dependencies** | Task 01-02-01 (Tenant Model), Task 02-01-01 (Product Models), Task 03-01-01 (Sale Models) |
| **Estimated Effort** | 8 hours |
| **Status** | Not Started |

## Objective

LankaCommerce tenants need to integrate their own external systems — accounting software, inventory management platforms, or custom dashboards — with their point-of-sale data. An outbound webhook system allows tenants to receive real-time notifications when key events occur, such as a sale completion, a return processed, or stock levels changed. Each tenant can configure multiple endpoints, each subscribed to specific event types, with HMAC-signed payloads for security.

This task delivers a complete webhook subsystem: Django models for endpoint and delivery tracking, a secret generator for per-endpoint signing keys, a dispatch service that fires webhooks asynchronously, DRF CRUD views for tenant self-service, and a frontend management page where tenants can add, view, and delete endpoints with a one-time secret reveal modal. The system is designed to be fire-and-forget — webhook delivery failures never block the primary transaction.

## Instructions

1. **Create the webhooks Django app.**
   - Run `python manage.py startapp webhooks` inside the `backend/apps/` directory.
   - Add `backend.apps.webhooks` to `INSTALLED_APPS` in `backend/config/settings.py`.

2. **Define the `WebhookDeliveryStatus` TextChoices enum.**
   - In `backend/apps/webhooks/models.py`, create class `WebhookDeliveryStatus(models.TextChoices)`:
     - `PENDING = "pending", "Pending"`
     - `SUCCESS = "success", "Success"`
     - `FAILED = "failed", "Failed"`

3. **Define the `WebhookEndpoint` model.`Endpoint model.**
   - Fields:
     - `id` — `BigAutoField`, primary key.
     - `tenant` — `ForeignKey` to `accounts.Tenant`, `on_delete=models.CASCADE`, `related_name="webhook_endpoints"`.
     - `url` — `URLField`, max length 2048, help text "The HTTPS endpoint that will receive webhook payloads."
     - `secret` — `CharField`, max length 128, `editable=False`, stores the HMAC signing secret.
     - `events` — `JSONField`, default `list`, stores a list of event type strings (e.g., `["sale.completed", "stock.updated"]`).
updated"]`).
     - `is_active` — `BooleanField`, default `True`.
     - `created_at` — `DateTimeField`, `auto_now_add=True`.
     - `updated_at` — `DateTimeField`, `auto_now=True`.
   - Add `class Meta: ordering = ["-created_at"]`.
   - Add `__str__` returning `f"{self.tenant.slug} — {self.url}"`.

4. **Define the `WebhookDelivery` model.
   - Fields:
     - `id` — `BigAutoField`, primary key.
     - `endpoint` — `ForeignKey` to `WebhookEndpoint`, `on_delete=models.CASCADE`, `related_name="deliveries"`.
     - `event` — `CharField`, max length 128.
     - `payload` — `JSONField`.
     - `status` — `CharField`, max length 16, choices `WebhookDeliveryStatus.choices`, default `WebhookDeliveryStatus.PENDING`.
     - `status_code` — `IntegerField`, `null=True`, `blank=True`.
     - `response` — `TextField`, `null=True`, `blank=True`.
     - `attempted_at` — `DateTimeField`, `null=True`, `blank=True`.
     - `created_at` — `DateTimeField`, `auto_now_add=True`.
   - Add `class Meta: ordering = ["-created_at"]`.

5. **Create and run the migration.**
   - Run `python manage.py makemigrations webhooks`.
   - Run `python manage.py migrate webhooks`.

6. **Build the webhook secret generator.**
   - Create `backend/apps/webhooks/services/secret_generator.py`.
   - Define function `generate_webhook_secret()`:
     - `import secrets`
     - `return secrets.token_hex(32)` — produces a 64-character hex string.
   - Call this function in the `WebhookEndpoint` model's `save()` method if `self.secret` is not set.

7. **Build the webhook dispatch service.**
   - Create `backend/apps/webhooks/services/dispatch_service.py`.
   - Define function `dispatch_webhooks(tenant_id, event, payload)`:
     - Import `hmac`, `json`, `requests`, `logging`.
     - Query `WebhookEndpoint.objects.filter(tenant_id=tenant_id, is_active=True, events__contains=event)`.
     - For each endpoint:
       - Compute signature: `hmac.new(secret.encode(), json.dumps(payload, separators=(",", ":")).encode(), "sha256").hexdigest()`.
       - Build headers dict:
         - `"Content-Type": "application/json"`
         - `"X-LankaCommerce-Event": event`
         - `"X-LankaCommerce-Signature": computed_signature`
         - `"X-LankaCommerce-Delivery": str(uuid.uuid4())`
       - Create `WebhookDelivery` record with `status=PENDING`.
       - Use `try/except`:
         - `response = requests.post(url, json=payload, headers=headers, timeout=2)`.
         - On success: update delivery with `status=SUCCESS`, `status_code=response.status_code`, `response=response.text`, `attempted_at=timezone.now()`.
         - On exception: update delivery with `status=FAILED`, `response=str(exception)`, `attempted_at=timezone.now()`.
       - Log outcome via `logger.info()`.

8. **Integrate dispatch into existing services.**
   - In `backend/apps/pos/services/sale_service.py`:
     - After `with transaction.atomic():` block completes and sale is finalized, call `dispatch_webhooks(tenant.id, "sale.completed", {"sale_id": sale.id, "total": str(sale.total, "items_count": count})`.
   - In `backend/apps/pos/services/return_service.py`:
     - After return is processed, call `dispatch_webhooks(tenant.id, "return.processed", {...})`.
   - In `backend/apps/catalog/services/stock_service.py`:
     - After stock adjustment, call `dispatch_webhooks(tenant.id, "stock.updated", {...})`.
   - All dispatch calls should be fire-and-forget — use `threading.Thread` or Celery if available, but for MVP a synchronous call wrapped in `try/except` is acceptable since the timeout is only 2 seconds.

9. **Create DRF serializers for webhook endpoints.**
   - Create `backend/apps/webhooks/serializers.py`.
   - `WebhookEndpointCreateSerializer`:
     - Fields: `url`, `events`.
     - Validate `url` starts with `https://`.
     - Validate ` Validate `events` is a non-empty list of strings.
   - `WebhookEndpointListSerializer`:
     - Fields: `id`, `url`, `events`, `is_active`, `created_at`.
     - `secret` is **never** returned in list view.
   - `Webhook `WebhookEndpointDetailSerializer`:
     - Fields: `id`, `url`, `events`, `is_active`, `secret`, `created_at`, `updated_at`.
     - `secret` is returned **only once** after creation.

10. **Create DRF views for webhook endpoint CRUD.**
    - Create `backend/apps/webhooks/views/endpoint_views.py`.
    - `WebhookEndpointListView`:
      - Authentication classes: `[JWTAuthentication]`.
      - Permission classes: `[HasTenantPermission]`.
      - `GET`: list endpoints for the current tenant.
      - `POST`: create a new endpoint, generate secret, return full detail (including secret) in response envelope `{"success": true, "data": serializer.data}`.
    - `WebhookEndpointDetailView`:
      - Authentication classes: `[JWTAuthentication]`.
      - Permission classes: `[HasTenantPermission]`.
      - `GET`: return single endpoint detail (without secret).
      - `DELETE`: soft-delete or hard-delete the endpoint.
    - Register URLs in `backend/apps/webhooks/urls.py`:
      - `GET /api/webhooks/endpoints/` — list
      - `POST /api/webhooks/endpoints/` — create
      - `GET /api/webhooks/endpoints/<id>/` — detail
      - `DELETE /api/webhooks/endpoints/<id>/` — delete

11. **Create a test dispatch endpoint.**
    - In `backend/apps/webhooks/views/test_dispatch_view.py`:
      - `WebhookTestDispatchView` with `[JWTAuthentication]` and `[HasTenantPermission]`.
      - Accepts `POST` with `{"event": "...", "payload": {...}}`.
      - Calls `dispatch_webhooks(tenant.id, event, payload)` synchronously.
      - Returns `{"success": true, "data": {"deliveries_count": N}}`.
    - Register at `POST /api/webhooks/test-dispatch/`.

12. **Build the frontend webhook management page.**
    - Create `frontend/app/[tenantSlug]/settings/webhooks/page.tsx`:
      - Server component that calls `getAuthFromCookies()` to verify session.
      - Fetches endpoint list from `GET /api/webhooks/endpoints/`.
      - Renders a table with columns: URL, Events, Status, Created, Actions.
    - Create `frontend/app/[tenantSlug]/settings/webhooks/webhook_form.tsx`:
      - Client component with React Hook Form.
      - Fields: URL input, event type multi-select checkboxes.
      - On submit, calls `POST /api/webhooks/endpoints/`.
      - On success, shows a modal with the one-time secret and a copy button to copy it.
      - The modal has a warning: "This secret will not be shown again. Store it securely."
    - Create `frontend/app/[tenantSlug]/settings/webhooks/webhook_list.tsx`:
      - Client component with TanStack Query for data fetching.
      - Delete button with confirmation dialog.
      - Uses `useAuth()` for client-side auth context.

13. **Add webhook settings link to the dashboard sidebar.**
    - In the sidebar navigation component, add a "Webhooks" link under the "Settings" section pointing to `/${tenantSlug}/settings/webhooks`.

## Expected Output

- Tenants can create webhook endpoints via the frontend UI and receive a one-time secret.
- Webhook payloads are signed with HMAC-SHA256 and delivered with proper headers.
- Sale, return, and stock events automatically trigger webhook dispatch without blocking the primary operation.
- Delivery attempts are logged in the `WebhookDelivery` table with status, status code, and response body.
- Tenants can view delivery history and delete endpoints from the management page.
- The test dispatch endpoint allows manual verification of webhook delivery.

## Validation

1. `backend/apps/webhooks/models.py` contains `WebhookEndpoint` and `WebhookDelivery` models with all specified fields.
2. `WebhookDeliveryStatus` TextChoices has `PENDING`, `SUCCESS`, and `FAILED` choices.
3. Migration runs without errors and tables are created in the database.
4. `generate_webhook_secret()` returns a 64-character hex string.
5. `dispatch_webhooks()` correctly filters active endpoints matching the event type.
6. HMAC signature is computed using `hmac.new()` and matches the signature verified by a test receiver.
7. `WebhookDelivery` records are created with correct status after dispatch attempt.
8. `POST /api/webhooks/endpoints/` returns the secret in the response only on creation.
9. `GET /api/webhooks/endpoints/` never returns the `secret` field.
10. `DELETE /api/webhooks/endpoints/<id>/` successfully deletes the endpoint.
11. `POST /api/webhooks/test-dispatch/` triggers delivery and returns delivery count.
12. Frontend webhook page loads endpoint list and allows creation with one-time secret modal.
13. Sale completion triggers automatic webhook dispatch (verify via delivery log).

## Notes

- Always use HTTPS for webhook URLs. Reject HTTP URLs in serializer validation.
- The HMAC secret is the only way for the receiver to verify payload authenticity. Never log or expose it after the initial creation modal.
- Webhook dispatch is synchronous with a 2-second timeout. For high-volume tenants, consider migrating to a Celery task queue.
- The `events` JSONField stores event type strings. Standard event types: `sale.completed`, `return.processed`, `stock.updated`, `product.created`, `product.updated`, `customer.created`.
- Monitor webhook failure rates. If an endpoint fails repeatedly (e.g., 5 consecutive failures), consider auto-deactivating it and notifying the tenant notification.
- The `X-LankaCommerce-Delivery` header contains a UUID that receivers can use for idempotency.
- For local testing, use a tool like `webhook.site` or `ngrok` to receive webhooks.
- Consider adding a "Replay" feature in a future iteration that allows tenants to retry failed deliveries.
