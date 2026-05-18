# Task 04.03.07 — Build CFD SSE Endpoint

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.07 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Phase 03 cart Zustand store (cartStore.ts), Phase 03 POS shift model |
| Produces | `backend/apps/hardware/services/cfd_emitter.py`, `backend/apps/hardware/views/cfd_views.py` (SSE stream + cart update), updated `frontend/stores/cartStore.ts` |
| Blocked By | None |

---

## Objective

The Customer Facing Display (CFD) is a dedicated screen mounted at the checkout counter that shows the customer exactly what is being scanned, the running total, applied discounts, and the final amount due. This transparency builds trust, reduces disputes at the register, and gives the customer a sense of participation in the transaction. For LankaCommerce, the CFD feature is a differentiator over basic POS systems — it signals a professional retail environment, particularly for apparel and general retail stores where customers are used to seeing itemised screens.

Architecturally, the CFD is implemented as a Server-Sent Events (SSE) stream that pushes cart state changes from the cashier's POS terminal to the customer-facing display in real time. SSE is chosen over WebSockets because the data flow is unidirectional (POS to display only), SSE works over standard HTTP without requiring a protocol upgrade, and it auto-reconnects natively in the browser. The backend uses Django's `StreamingHttpResponse` with a generator function, backed by an in-memory pub/sub pattern using Python `queue.Queue`. This single-process design is adequate for a single-store deployment; a production multi-store or multi-replica deployment would upgrade to Django Channels with Redis, and the migration path is explicitly documented in the emitter module.

---

## Instructions

### Step 1: Create the CFD Emitter Service Module

Create `backend/apps/hardware/services/cfd_emitter.py`.

Define a module-level dictionary `_subscribers: dict[str, list] = {}` mapping tenant slugs (strings) to lists of `queue.Queue` instances. Because the dictionary is at module scope, all views importing this module share the same subscriber registry within a single Python process.

Implement three public functions:

**`subscribe(tenant_slug: str) -> queue.Queue`**
- Create a new `queue.Queue()` instance with default `maxsize=0` (unbounded).
- Append it to `_subscribers.setdefault(tenant_slug, [])`.
- Return the queue handle to the caller.

**`unsubscribe(tenant_slug: str, queue: queue.Queue)`**
- Locate the queue reference in `_subscribers[tenant_slug]` and remove it.
- Use a try/except `ValueError` to silently handle the case where the queue has already been removed (e.g., on double-close).
- If `_subscribers[tenant_slug]` becomes empty after removal, delete the key to keep the dictionary tidy.

**`broadcast(tenant_slug: str, payload: dict)`**
- Look up `_subscribers.get(tenant_slug)`. If `None` or empty, return early — no connected displays to notify.
- Iterate over a shallow copy of the list (`list(_subscribers[tenant_slug])`) to allow concurrent modification during iteration.
- For each queue, call `queue.put_nowait(payload)`. Use `put_nowait` so that a slow consumer does not block other consumers.
- Wrap each `put_nowait` in try/except `queue.Full` — this should never happen with unbounded queues, but safety is cheap.

Include a module-level docstring explaining the single-process limitation:

```
This module uses an in-memory subscriber dictionary. In a multi-process
Gunicorn deployment (e.g., multiple uWSGI workers), each worker has its
own subscriber registry, so SSE clients connected to one worker will NOT
receive broadcasts from another worker. For production multi-replica
deployments, replace this module with this module with Django Channels and a Redis
channel layer. The public API (subscribe/unsubscribe/broadcast) remains
identical — only the internal implementation changes.
```

### Step 2: Create the SSE Stream View

Create `backend/apps/hardware/views/cfd_views.py`.

**`GET /api/hardware/cfd/stream/` endpoint as `CfdStreamView`**

Use `from django.http import StreamingHttpResponse`. Define a generator function `event_stream(tenant_slug: str)` nested inside the view method (or as a module-level generator for testability). The generator:

1. Calls `cfd_emitter.subscribe(tenant_slug)` to obtain a `queue.Queue`.
2. Enters an infinite loop:
   - Attempt `queue.get(timeout=20)`.
   - If a payload is received within 20 seconds: `yield f"data: {json.dumps(payload)}\n\n"`.
   - If `queue.get` raises `queue.Empty` (timeout): `yield ": keepalive\n\n"` — this is an SSE comment that keeps the connection alive.
3. On `GeneratorExit` or `close` of the generator: call `cfd_emitter.unsubscribe(tenant_slug, queue)` in a try/finally block to guarantee cleanup even if an unhandled exception occurs.

Set response headers explicitly:

```python
response = StreamingHttpResponse(
    streaming_content=event_stream(tenant_slug),
    content_type="text/event-stream",
)
response["Cache-Control"] = "no-cache, no-store"
response["X-Accel-Buffering"] = "no"  # Disable nginx buffering
response["Connection"] = "keep-alive"
return response
```

The `tenant_slug` is extracted from the request's `GET` parameter `?tenant_slug=...`. If missing, return a 400 response with `{ "success": False, "error": { "code": "MISSING_PARAMETER", "message": "tenant_slug query parameter is required." } }`.

Set `from rest_framework.decorators import api_view, authentication_classes, permission_classes` and use `@api_view(["GET"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`. The decorators ensure that only authenticated users from the correct tenant can initiate an SSE stream.

### Step 3: Create the Cart Update View

In the same `cfd_views.py`, create **`POST /api/hardware/cfd/update/` as `CfdUpdateView`**.

Decorate with `@api_view(["POST"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

Parse the request.data`. Expected fields:

- `tenant_slug` (str, required): must match `request.user.tenant_id`. If mismatch, return 403 `{ "success": False, "error": { "code": "TENANT_MISMATCH", "message": "Tenant slug does not match your session." } }`.
- `items` (list, required): array of item objects, each with `variant_id`, `name`, `quantity`, `unit_price`, `line_total`. Allow empty array for cart reset.
- `subtotal` (str, required): decimal string, e.g. "1500.00".
- `discount` (str, optional): decimal string, default "0.00".
- `total` (str, required): decimal string.
- `applied_promotions` (list, optional): array of promotion label strings.
- `customer_name` (str, optional): nullable.
- `status` (str, required): one of `"IDLE"`, `"SCANNING"`, `"COMPLETE"`.
- `change` (str, optional): decimal string, nullable. Present only when `status === "COMPLETE"`.

Construct a `payload` dict with `type: "cart_update"` plus all above fields. Call `cfd_emitter.broadcast(tenant_slug, payload)`.

Return `{ "success": True, "data": { "ok": True } }`.

Use `serializer.is_valid(raise_exception=True)` with a DRF `Serializer` class defined in the same file (or imported from `backend/apps/hardware/serializers.py`). `CfdUpdateSerializer`:

```python
class CfdUpdateSerializer(serializers.Serializer):
    tenant_slug = serializers.CharField()
    items = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    subtotal = serializers.CharField()
    discount = serializers.CharField(required=False, default="0.00")
    total = serializers.CharField()
    applied_promotions = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    customer_name = serializers.CharField(allow_null=True, required=False, default=None)
    status = serializers.ChoiceField(choices=["IDLE", "SCANNING", "COMPLETE"])
    change = serializers.CharField(allow_null=True, required=False, default=None)
```

Validate `tenant_slug`tenant_slug`` matches `request.user.tenant_id` in the view, not in the serializer, because the serializer does not have access to the request by default.

### Step 4: Wire the CFD Update into the Zustand Cart Store

Edit `frontend/stores/cartStore.ts`. Add state values and actions if not already present:

```typescript
// Existing state...
cartItems: CartItem[];
subtotal: number;
discount: number;
total: number;
appliedPromotions: string[];
customerName: string | null;
status: 'IDLE' | 'SCANNING' | 'COMPLETE';
change: number | null;
```

Add a new helper function **`send_cfd_update()`** within the store (or as a standalone utility called from the store). The function:

1. Reads the current full cart state from the store using `getState()`.
2. Constructs the payload object from current state values.
3. Performs a fire-and-forget `POST` request:
   ```typescript
   fetch(`/api/hardware/cfd/update/`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
   }).catch(() => {});
   ```
   The `.catch(() => {})` swallows all network errors gracefully. A failed CFD update MUST NEVER interrupt the POS flow.

4. Define `send_cfd_update` as a regular function (not a Zustand action) at module scope.

Call `send_cfd_update()` at the end of every cart mutation action:

- **`addItem`**: after adding the item, recalculating subtotal and total, and setting `status: 'SCANNING'`.
- **`removeItem`**: after filtering out the item and recalculating totals. If `cartItems` becomes empty, set `status: 'IDLE'` before sending.
- **`updateQuantity`**: after adjusting the quantity and recalculating.
- **`linkCustomer`**: after setting `customerName`.
- **`unlinkCustomer`**: after setting `customerName` to `null`.
- **`completeSale`**: after setting `status: 'COMPLETE'` and `change`.
- **`resetCart`**: reset all items to defaults, set `status: 'IDLE'`, `items: []`, `change: null`.

### Step 5: Multiple-Path Scenario Handling

Each cart state transition must send the correct CFD payload:

| Scenario | `status` | `items` | `change` | Behaviour |
|---|---|---|---|---|
| Add first item to empty cart | `SCANNING` | `[{...}]` | null | CFD wakes from idle to show first item |
| Remove last item | `IDLE` | `[]` | null | CFD returns to idle/screensaver state |
| Change quantity on existing item | `SCANNING` | updated array | null | CFD updates line total in real time |
| Link customer | `SCANNING` | unchanged | null | CFD shows "Serving: [customer_name]" |
| Unlinkcustomer | `SCANNING` | unchanged | null | CFD removes customer greeting |
| Complete sale (tender) | `COMPLETE` | final array | "150.00" | CFD shows "Thank You!" with change amount |
| Reset cart after completion | `IDLE` | `[]` | null | CFD returns to idle for next customer |

### Step 6: URL Configuration

Add the following URL patterns to `backend/apps/hardware/urls.py` (create if not existing):

```python
from django.urls import path
from .views.cfd_views import CfdUpdateView, CfdStreamView

urlpatterns = [
    path('cfd/update/', CfdUpdateView, name='cfd-update'),
    path('cfd/stream/', CfdStreamView, name='cfd-stream'),
]
```

Ensure `backend/config/urls.py` includes the hardware app URLs under the `api/hardware/` prefix.

---

## Expected Output

- `backend/apps/hardware/services/cfd_emitter.py` — in-memory pub/sub with subscribe/unsubscribe/broadcast functions.
- `backend/apps/hardware/views/cfd_views.py` — `CfdUpdateView` (POST) and `CfdStreamView` (GET with SSE generator).
- `backend/apps/hardware/serializers.py` (or inline) — `CfdUpdateSerializer` with field validation.
- `backend/apps/hardware/urls.py` — URL routing for both endpoints.
- Updated `frontend/stores/cartStore.ts` — `send_cfd_update()` helper wired into all cart mutation actions.

---

## Validation

- Open the CFD page in one browser tab at `/cfd?tenant_slug=demo`. Open the POS terminal in another tab. Add an item in POS: the CFD tab displays the item within 1 second without a page refresh.
- Add a second item: CFD updates the item count and running total without flickering or resetting.
- Remove an item: CFD adjusts the list and total.
- Link a customer in the POS: CFD displays "Serving: [customer_name]" below the list.
- Complete the sale: CFD shows "Thank You!" with the change amount. After 5 seconds, CFD returns to idle.
- Close the CFD tab. Open it again: a new SSE connection is established and subsequent POS updates flow to the new tab.
- Send a CFD update with a mismatched `tenant_slug`: the API returns 403 and the error is silently swallowed by `.catch()`.
- Rapidly add 20 items: all 20 CFD updates arrive and the CFD page shows the final state.
- Kill and restart the Django dev server while a CFD tab is open: the SSE connection closes and the EventSource auto-reconnects.
- Check that no CFD error ever appears in the browser console for the POS tab — all errors are caught.

---

## Notes

The in-memory `queue.Queue` approach is deliberately simple and stateless within a single process. If the Django server is behind Gunicorn with multiple workers, each worker has its own `_subscribers` dict, so an SSE client connected to worker A will not receive broadcasts from a POS terminal handled by worker B. The long-term fix documented in the emitter module is Django Channels with a Redis channel layer, which provides cross-process pub/sub. The migration path requires replacing the module-level dictionary with `async_to_sync(channel_layer.group_add)` / `group_discard` / `group_send` calls, while keeping the same public API so that callers in `cfd_views.py` and `cartStore.ts` require zero changes.

SSE is preferred over WebSockets for this use case because the data flow is strictly unidirectional (POS to CFD display). SSE natively supports auto-reconnection with last-event-id tracking, works through HTTP proxies without special configuration, and consumes fewer server resources per connection since the server never needs to receive messages from the client. The 20-second keepalive pings prevent load balancers and reverse proxies (nginx, Cloudflare) from timing out idle connections, which typically have defaults between 60 and 120 seconds.

The `send_cfd_update()` fire-and-forget pattern ensures that CFD network issues never impact POS performance. If the CFD endpoint is unreachable, the POS continues to operate normally — the customer display simply shows stale data or a connection error message. This is an intentional design decision: the POS terminal is the system of record, and the CFD is a convenience display. In the rare case where many CFD updates are triggered in rapid succession (e.g., scanning 50 barcodes in quick succession), the browser's `fetch` API queues the requests internally, and the backend `broadcast` function processes them sequentially. The `queue.Queue` in `event_stream` ensures the CFD page receives every update in order without skipping intermediate states.

