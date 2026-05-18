# Task 04.03.09 — Build Marketing Broadcast Builder

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.09 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | Customer model with tags, gender, spend_total, birthday; Tenant model with `settings.whatsapp` JSON field |
| Produces | `frontend/app/[tenantSlug]/customers/broadcast/page.tsx`, `frontend/components/broadcast/BroadcastFilterPanel.tsx`, `frontend/components/broadcast/BroadcastComposer.tsx`, `backend/apps/crm/views/broadcast_views.py`, `backend/apps/crm/views/customer_count_view.py` |
| Blocked By | CRM Customer model existing customer endpoints and models from earlier phases |

---

## Objective

The Broadcast Builder empowers store managers and owners to send targeted WhatsApp marketing campaigns directly from the LankaCommerce dashboard. Instead of exporting customer lists and using external tools, the operator can filter customers by tags, gender, spending behaviour, and birthday month — then compose and send a personalised message in a single workflow. This keeps marketing operations inside the POS ecosystem, reduces friction, and enables rapid campaign execution.

The architecture separates concerns clearly: the frontend provides a sleek two-column builder with real-time audience count preview, while the backend performs authoritative customer queries and sequential message dispatch. The server always re-queries customers based on the filter criteria provided by the client — never trusting the client-provided customer list — ensuring that the broadcast targets exactly the intended segment even if the CRM data changed between preview and send.

---

## Instructions

### Step 1: Create the Broadcast Page Shell

Create `frontend/app/[tenantSlug]/customers/broadcast/page.tsx` as a Client Component (`"use client"` at the top).

Role guard with `useAuth()`:

```typescript
const { user } = useAuth();
useEffect(() => {
    if (user?.role !== 'MANAGER' && user?.role !== 'OWNER') {
        router.push(`/${tenantSlug}/dashboard`);
    }
}, [user, tenantSlug]);
```

Page layout using Tailwind grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
    {/* Left column: filters — lg:col-span-2 */}
    <div className="lg:col-span-2">
        <BroadcastFilterPanel
            filters={filters}
            onChange={setFilters}
            count={customerCount}
            isCountLoading={isCountLoading}
        />
    </div>
    {/* Right column: composer — lg:col-span-3 */}
    <div className="lg:col-span-3">
        <BroadcastComposer
            message={message}
            onMessageChange={setMessage}
            customerCount={customerCount}
            isSending={isSending}
            onSend={handleSend}
        />
    </div>
</div>
```

State management:

- `filters` object with shape `{ tags: string[], gender: 'ALL' | 'FEMALE' | 'MALE' | 'NON_BINARY', min_spend: number | '', max_spend: number | '', birthday_month: number | '' }`.
- A `useDebounce` hook (create at `frontend/hooks/useDebounce.ts` if not existing) that debounces `filters` by 300ms. The debounced value drives the count API call.
- `customerCount: number`, `isCountLoading: boolean`, `isSending: boolean`, `message: string`.

### Step 2: Build the BroadcastFilterPanel Component

Create `frontend/components/broadcast/BroadcastFilterPanel.tsx`.

Props: `filters: FilterState`, `onChange: (filters: FilterState) => void`, `count: number`, `isCountLoading: boolean`.

Rendered as a Card (ShadCN) with the following filter groups stacked vertically:

**Tag multi-select** (fetching tag options):

- Use `GET /api/crm/customers/tags/` via TanStack Query: `useQuery({ queryKey: ['customer-tags', tenantSlug], queryFn: ... })`.
- Display as a ShadCN `MultiSelect` component (or a `Popover` with checkboxes). Selected tags shown as chips with an × dismiss.
- On change, call `onChange({ ...filters, tags: selectedTags })`.

**Gender radio group**:

- ShadCN `RadioGroup` with four options: `ALL`, `FEMALE`, `MALE`, `NON_BINARY`.
- `ALL` is the default. Selecting a gender calls `onChange({ ...filters, gender: value })`.

**Spend band** (Min Spend and Max Spend):

- Two ShadCN `Input` fields of type `number`, `min="0"`, `step="0.01"`.
- Labels: "Min Spend (Rs.)" and "Max Spend (Rs.)".
- On change, call `onChange({ ...filters, min_spend: value, max_spend: filters.max_spend })` for min, and symmetric for max.
- When min_spend is `""` and max_spend is `""`, the count API should not apply any spend filtering.

**Birthday month select**:

- ShadCN `Select` with 13 options: "Any Month" (`value=""`) and January (`value=1`) through December (`value=12`).
- On change, call `onChange({ ...filters, birthday_month: parseInt(value) || '' })`.

All filter change handlers must use the `onChange` callback to update the parent state in `page.tsx`, which in turn triggers the debounced count API call.

### Step 3: Create the Customer Count Endpoint

Create `backend/apps/crm/views/customer_count_view.py`.

Decorate with `@api_view(["GET"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

```python
from django.db.models import Q

@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([HasTenantPermission])
def customer_count_view(request):
    tenant_id = request.user.tenant_id
    queryset = Customer.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)

    # Tag filter
    tags = request.GET.getlist("tags")
    if tags:
        queryset = queryset.filter(tags__overlap=tags)

    # Gender filter (skip if "ALL" or empty)
    gender = request.GET.get("gender")
    if gender and gender.upper() != "ALL":
        queryset = queryset.filter(gender=gender.upper())

    # Spend band
    min_spend = request.GET.get("min_spend")
    max_spend = request.GET.get("max_spend")
    if min_spend:
        queryset = queryset.filter(spend_total__gte=Decimal(min_spend))
    if max_spend:
        queryset = queryset.filter(spend_total__lte=Decimal(max_spend))

    # Birthday month filter
    birthday_month = request.GET.get("birthday_month")
    if birthday_month:
        try:
            month = int(birthday_month)
            if 1 <= month <= 12:
                queryset = queryset.filter(birthday__month=month)
        except ValueError:
            pass

    count = queryset.count()
    return JsonResponse({"success": True, "data": {"count": count}})
```

Import `from decimal import Decimal` and `from django.db.models import Q` as needed. Use `JsonResponse` from `django.http`.

**Important**: The `tags__overlap` lookup works only with PostgreSQL `ArrayField`. If the database is SQLite (development), this will crash. Document this in the Notes section. For development, provide a fallback: `if tags: queryset = queryset.filter(tags__contains=tags[0])` with a comment explaining the development shortcut.

### Step 4: Integrate Count Preview in the Page

Between `BroadcastFilterPanel` and `BroadcastComposer` (visually, the count preview sits inside the filter panel card), render a callout box:

```tsx
<div className={`p-4 rounded-lg border ${count === 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
    {isCountLoading ? (
        <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted">Counting customers...</span>
        </div>
    ) : count === 0 ? (
        <p className="text-sm font-medium" style={{ color: '#EF4444' }}>
            No customers match your filters. Adjust the criteria above.
        </p>
    ) : (
        <p className="text-sm font-medium" style={{ color: '#1B2B3A' }}>
            <span className="font-bold text-lg">{count}</span> customer{count !== 1 ? 's' : ''} match your filters
        </p>
    )}
</div>
```

### Step 5: Build the BroadcastComposer Component

Create `frontend/components/broadcast/BroadcastComposer.tsx`.

Props: `message: string`, `onMessageChange: (msg: string) => void`, `customerCount: number`, `isSending: boolean`, `onSend: () => void`.

Rendered as a Card (ShadCN) with:

**Message textarea**:

- ShadCN `Textarea` with `maxLength={500}`.
- Style: `fontFamily: 'JetBrains Mono, monospace'`, `fontSize: '14px'`, `minHeight: '120px'`.
- `placeholder="Type your broadcast message... Use {{name}} for customer name and {{store_name}} for your store name."`

**Live character counter**:

- Below the textarea, right-aligned.
- Display `{message.length}/500`.
- Colour: `#64748B` (text-muted) when `<= 480`, `#EF4444` (danger) when `> 480`, `#EF4444` with a pulsing animation when `=== 500`.
- Use Tailwind classes: `text-xs font-mono`.

**Variable reference hints**:

- A small row below the counter showing two inline badges:
  - `{{name}}` — Customer's first name.
  - `{{store_name}}` — Your store name.
- Each badge is a `span` with `bg-gray-100` background, `text-xs`, `font-mono`, `px-2 py-0.5 rounded`.

**Send Broadcast button**:

- Full-width ShadCN `Button` with `className="w-full"` and `style={{ backgroundColor: '#F97316' }}` (orange).
- Label: "Send Broadcast to [count] customer(s)".
- Disabled when:
  - `message.trim() === ''`.
  - `message.length > 500`.
  - `customerCount === 0`.
  - `isSending === true`.
- When disabled, show the button in `#E2E8F0` (border) background with cursor-not-allowed.

### Step 6: Create the Broadcast Send Endpoint

Create `backend/apps/crm/views/broadcast_views.py`.

Decorate with `@api_view(["POST"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

**BroadcastSendSerializer** (inline or in `backend/apps/crm/serializers.py`):

```python
class BroadcastSendSerializer(serializers.Serializer):
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    gender = serializers.CharField(required=False, allow_blank=True, default='')
    min_spend = serializers.CharField(required=False, allow_blank=True, default='')
    max_spend = serializers.CharField(required=False, allow_blank=True, default='')
    birthday_month = serializers.IntegerField(required=False, allow_null=True, default=None)
    message = serializers.CharField(max_length=500)
```

**View logic in `broadcast_send_view`**:

1. Authenticate and deserialize: `serializer = BroadcastSendSerializer(data=request.data); serializer.is_valid(raise_exception=True)`.
2. Extract validated data.
3. Re-query customers using the exact same filter logic as `customer_count_view` (see Step 3). Store the filtered `QuerySet` in `customers`:
   ```python
   customers = Customer.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
   # Apply the same conditional filters...
   customer_list = list(customers.values('id', 'name', 'phone'))  # Materialize early
   ```
4. Fetch the tenant's WhatsApp config:
   ```python
   tenant = Tenant.objects.get(id=tenant_id)
   whatsapp = tenant.settings.get("whatsapp", {})
   api_url = whatsapp.get("api_url")
   api_key = whatsapp.get("api_key")
   if not api_url or not api_key:
       return JsonResponse({"success": False, "error": {"code": "WHATSAPP_NOT_CONFIGURED", "message": "WhatsApp is not configured for this store."}}, status=400)
   ```
5. Initialize counters: `sent = 0`, `failed = 0`, `errors = []`.
6. Sequential send loop:
   ```python
   for customer in customer_list:
       if not customer['phone']:
           continue  # Don't count as failed — it's a data issue
       first_name = customer['name'].split()[0] if customer['name'] else 'Valued Customer'
       store_name = tenant.settings.get("store_name", tenant.name)
       body = message.replace('{{name}}', first_name).replace('{{store_name}}', store_name)

       try:
           resp = requests.post(
               api_url,
               headers={"Authorization": f"Bearer {api_key}"},
               json={
                   "messaging_product": "whatsapp",
                   "to": customer['phone'],
                   "type": "template",
                   "template": {
                       "name": whatsapp.get("broadcast_template_name", "marketing_broadcast"),
                       "language": {"code": "en"},
                       "components": [{
                           "type": "body",
                           "parameters": [{"type": "text", "text": body}]
                       }]
                   }
               },
               timeout=30,
           )
           if resp.status_code >= 200 and resp.status_code < 300:
               sent += 1
           else:
               failed += 1
               errors.append({"customer_id": customer['id'], "status": resp.status_code, "detail": resp.text[:150]})
       except requests.exceptions.RequestException as exc:
           failed += 1
           errors.append({"customer_id": customer['id'], "error": str(exc)})

       time.sleep(1)  # WA rate limiting: 1 second between sends
   ```
7. After the loop, return:
   ```python
   return JsonResponse({
       "success": True,
       "data": {
           "sent": sent,
           "failed": failed,
           "total": len(customer_list),
           "errors": errors[:10],  # Only return first 10 errors to avoid oversized response
       }
   })
   ```

### Step 7: Implement Confirmation and Result Display

In `page.tsx`, implement a `handleSend` function that:

1. Sets `isSending` to `true`.
2. Calls `POST /api/crm/broadcast/whatsapp/` using TanStack Query `useMutation`.
3. Before the mutation, opens a ShadCN `AlertDialog`:

```tsx
<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Confirm Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
                You are about to send a WhatsApp message to <strong>{customerCount}</strong> customer{customerCount !== 1 ? 's' : ''}.
                This action cannot be undone.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={executeSend}
                style={{ backgroundColor: '#F97316' }}
            >
                Yes, Send Now
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

4. After the mutation resolves:
   - If `sent === total`: `toast({ title: "Broadcast sent", description: `Your message was sent to ${sent} customers successfully.` })`.
   - If `sent > 0 && failed > 0`: `toast({ title: "Broadcast partially sent", description: `Sent to ${sent}, failed for ${failed} customers. Check the server logs for details.`, variant: "warning" })`.
   - If `sent === 0 && failed > 0`: `toast({ title: "Broadcast failed", description: "All messages failed to send. Please check your WhatsApp configuration and try again.", variant: "destructive" })`.
5. Re-enable the send button by setting `isSending` to `false`.

---

## Expected Output

- `frontend/app/[tenantSlug]/customers/broadcast/page.tsx` — two-column broadcast builder with role guard, debounced filter-to-count pipeline, and send confirmation.
- `frontend/components/broadcast/BroadcastFilterPanel.tsx` — tag multi-select, gender radio, spend band, birthday month select.
- `frontend/components/broadcast/BroadcastComposer.tsx` — JetBrains Mono textarea with counter, variable hints, orange send button.
- `frontend/hooks/useDebounce.ts` — generic debounce hook.
- `backend/apps/crm/views/customer_count_view.py` — filtered count endpoint.
- `backend/apps/crm/views/broadcast_views.py` — server-side customer re-query and sequential WhatsApp send.

---

## Validation

- **Filter + count**: Select a tag "VIP" and gender "FEMALE". The count preview updates after 300ms and shows the correct number.
- **Zero count state**: Set filters that match no customers (e.g., a birthday month with no matching records). The count preview shows "No customers match" in red. The send button is disabled.
- **Empty message**: The send button is disabled when the textarea is empty. The character counter shows `0/500`.
- **Over-limit message**: Type 501 characters. The counter turns red. The send button becomes disabled. The textarea's `maxLength={500}` prevents further input.
- **Send with 1 customer**: Clicking "Send Broadcast" opens the AlertDialog. Clicking Cancel closes it without sending. Clicking "Yes, Send Now" initiates the POST and shows a success toast.
- **Partial failure**: Mock the backend to fail for one of two customers. The warning toast appears with "Sent to 1, failed for 1" message.
- **WhatsApp not configured**: The backend returns 400 with `WHATSAPP_NOT_CONFIGURED`. The frontend shows a destructive toast with the error message from the API.
- **Variable substitution**: Send a message containing `{{name}}`. The backend replaces it with the customer's first name (first element of `name.split(' ')`). The WhatsApp API receives the substituted body.
- **Concurrent sends disabled**: While a broadcast is in progress (`isSending=true`), the send button is disabled. Clicking it multiple times does not trigger multiple sends.
- **Rate limiting**: The 1-second `time.sleep(1)` between sends is respected. For 3 customers, the endpoint takes at least 3 seconds to return.

---

## Notes

The `tags__overlap` Django ORM lookup requires PostgreSQL's `ArrayField`, which is the production database. During development with SQLite, this lookup will raise a `NotSupportedError`. Two strategies mitigate this: either run a local PostgreSQL instance during development (recommended for teams), or provide a fallback in `customer_count_view.py` that checks `connection.vendor == 'postgresql'` and uses `tags__contains` as a simplified alternative for SQLite. The `tags__contains` lookup checks for any single tag containment rather than overlap, which is less precise but sufficient for development testing.

WhatsApp Business API requires approved message templates for broadcast messages. The `marketing_broadcast` template must be created in the WhatsApp Business account dashboard before this feature works. If the template is not approved, the WhatsApp API will reject the messages with a `TEMPLATE_NOT_FOUND` error. The broadcast builder currently assumes a single template — a future enhancement could allow the operator to select from multiple approved templates.

The sequential send loop with 1-second delays is intentionally conservative. WhatsApp's rate limits vary by account quality and region, but for a typical LankaCommerce store sending to 50-200 customers, a 1-second gap keeps the send duration manageable (under 4 minutes for 200 customers) while staying well within rate limits. For stores with more than 500 customers in a segment, consider implementing a queue-based approach using Upstash QStash or Celery, which would offload the send loop to a background worker and allow the API to return immediately. The current implementation blocks the HTTP response until all messages are sent, which can cause timeout issues with Vercel's 10-second function timeout for very large audiences.
