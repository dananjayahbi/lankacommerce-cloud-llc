# Task 04.01.11 — Build PO WhatsApp Dispatch

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.11 |
| Complexity | Medium |
| Dependencies | 04.01.08 + 04.01.09 + SubPhase_03_02 WhatsApp utility |
| Produces | `backend/apps/crm/views/purchase_order_views.py` (stub replaced), updated PO detail page |

---

## Objective

Implement the "Send via WhatsApp" action on the PO Detail page. The system formats the PO as plain text using `format_po_for_whatsapp` and sends it to the supplier's WhatsApp number via `send_whatsapp_message`. On success, the PO status advances from DRAFT to SENT. On failure, the PO remains in DRAFT for retry.

---

## Instructions

### Step 1: Implement the Send-WhatsApp DRF View

In `backend/apps/crm/views/purchase_order_views.py`, locate `PurchaseOrderSendWhatsAppView` and replace the HTTP 501 stub body with the full implementation.

The view handles `POST` at `/api/crm/purchase-orders/{id}/send-whatsapp/` with `JWTAuthentication` and `HasTenantPermission`.

In the `post(self, request, pk)` method:

**Step 1a — Extract context:**

`tenant_id = request.auth['tenant_id']`. `po_id = pk`.

**Step 1b — Fetch the PO:**

Call `get_po_by_id(tenant_id, po_id)` from the purchase order service. The function fetches with `select_related('supplier', 'tenant')` and `prefetch_related('lines')`. If `PurchaseOrder.DoesNotExist` is raised, return 404.

**Step 1c — Guard: status must be DRAFT:**

If `po.status != POStatus.DRAFT`:

Return `Response({'success': False, 'error': {'code': 'INVALID_STATUS', 'message': f"Only DRAFT purchase orders can be sent. Current status: {po.status}"}}, status=422)`.

This is a server-side enforcement independent of the frontend button visibility — a client bypassing the UI must still be rejected.

**Step 1d — Guard: supplier must have a WhatsApp number:**

If not `po.supplier.whatsapp_number` (empty string or `None`):

Return `Response({'success': False, 'error': {'code': 'NO_WHATSAPP_NUMBER', 'message': 'Supplier has no WhatsApp number configured. Update the supplier record before sending.'}}, status=422)`.

### Step 2: Format the PO Message

Import `format_po_for_whatsapp` from `backend.apps.crm.utils.po_formatter`.

Call `message = format_po_for_whatsapp(po)`. The PO object has all related data prefetched from Step 1b — no additional database queries are needed inside the formatter.

Log at DEBUG level in development only: `logger.debug("Formatted PO WhatsApp message for PO %s (length: %d chars)", po_id, len(message))`. Do not log the message body itself.

### Step 3: Send via WhatsApp

Import `send_whatsapp_message` from `backend.apps.pos.utils.whatsapp`.

Wrap the send call:

Try: `send_whatsapp_message(phone=po.supplier.whatsapp_number, message=message)`.

Except `Exception as e`:

- Log the full exception: `logger.exception("WhatsApp send failed for PO %s: %s", po_id, str(e))`.
- Return `Response({'success': False, 'error': {'code': 'WHATSAPP_SEND_FAILED', 'message': 'WhatsApp send failed. Please try again or contact the supplier manually.', 'detail': str(e)}}, status=502)`.
- **Do not advance the PO status** — the PO remains in `DRAFT` so the staff member can retry the dispatch after the WhatsApp service recovers.

### Step 4: Advance PO Status to SENT

Call `updated_po = update_po_status(tenant_id, po_id, POStatus.SENT)` from the purchase order service.

Serialise `updated_po` with `PurchaseOrderDetailSerializer`. Return:

`Response({'success': True, 'data': serializer.data}, status=200)`.

### Step 5: Wire the Button on the PO Detail Page

In `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx`, replace the static "Send via WhatsApp" button with a wired implementation.

**Local state:** `const [isSending, setIsSending] = useState(false)`.

**TanStack Query `useMutation`:**

`mutationFn`: POST to `/api/crm/purchase-orders/${poId}/send-whatsapp/` with an empty body `{}`.

`onMutate`: `setIsSending(true)`.

`onSuccess(data)`:

- `toast("Purchase Order sent to [supplier name] via WhatsApp.", { style: { background: '#22C55E', color: 'white' } })` — extract supplier name from the updated PO in `data.data`.
- Invalidate `['purchase-order', tenantSlug, poId]` — the status badge updates from DRAFT to SENT.
- `setIsSending(false)`.

`onError(error)`:

- `toast({ variant: "destructive", title: "WhatsApp send failed", description: error.message || "Please try again." })`.
- Show a secondary action toast with a "Contact Supplier" label and `onClick: () => window.open('tel:' + supplierPhone)` — this allows staff to call the supplier directly when WhatsApp is unavailable.
- `setIsSending(false)` — re-enables the button.

**Button rendering:**

`<Button onClick={() => mutate()} disabled={isSending} className="gap-2">`

When `isSending = true`: replace button label with `<Loader2 className="animate-spin" />` and `"Sending..."`.

When `isSending = false`: WhatsApp icon (SVG or `MessageCircle` from lucide-react) and `"Send via WhatsApp"`.

### Step 6: Document the Expected WhatsApp Message Format

The plain-text message produced by `format_po_for_whatsapp` follows this structure (each line separated by `\n`):

Line 1: Store name in all uppercase (e.g. "DEMO STORE LK")

Line 2: 30 standard ASCII hyphens (`------------------------------`)

Line 3: "PURCHASE ORDER [last-8-chars-of-UUID-in-uppercase]" (e.g. "PURCHASE ORDER A1B2C3D4")

Line 4: "Supplier: [supplier name]"

Line 5: "Expected Delivery: [DD/MM/YYYY]" or "Expected Delivery: Not specified"

Line 6: 30 ASCII hyphens

Lines 7+: Each PO line as "[N]. [product_name_snapshot] - [variant_description_snapshot] | Qty: [ordered_qty] | Cost: Rs. [expected_cost_price]"

Second-to-last line: 30 ASCII hyphens

Last-but-one line: "TOTAL: Rs. [total_amount]"

Last line: "This order was generated by LankaCommerce. Please confirm receipt by replying to this message."

Separators use only standard ASCII hyphens (`-`, code point U+002D). No Unicode em-dashes, box-drawing characters, or emoji are used. Line length is kept under 60 characters per line where possible.

---

## Expected Output

- `backend/apps/crm/views/purchase_order_views.py` — `PurchaseOrderSendWhatsAppView.post` fully implemented with status guards, WhatsApp send, and status advancement.
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx` — "Send via WhatsApp" button wired with mutation, loading state, success toast, and "Contact Supplier" fallback on error.

---

## Validation

- `POST /api/crm/purchase-orders/{id}/send-whatsapp/` on a DRAFT PO with a supplier `whatsapp_number` set: returns 200, PO status in response is SENT.
- `POST` on a non-DRAFT PO (e.g. SENT, CANCELLED): returns 422 with `"Only DRAFT purchase orders can be sent"`.
- `POST` on a DRAFT PO whose supplier has no `whatsapp_number`: returns 422 with `"Supplier has no WhatsApp number configured"`.
- WhatsApp API failure (mock `send_whatsapp_message` to raise): returns 502, PO status remains DRAFT in the database.
- Status badge on PO detail page updates from DRAFT to SENT after a successful send without a full page reload.
- "Send via WhatsApp" button shows spinner and "Sending..." text during the mutation.
- "Send via WhatsApp" button is re-enabled after an error response.
- "Contact Supplier" toast action calls `window.open('tel:...')` with the supplier's phone number.

---

## Notes

- Do not log the formatted WhatsApp message body to any persistent log. WhatsApp messages may contain commercially sensitive pricing information (cost prices are included in the PO message). The `logger.debug` call should log only metadata (PO ID, message length).
- The "Contact Supplier" fallback toast action is a significant UX improvement for environments where WhatsApp connectivity is intermittent — common in retail environments using mobile data connections.
- The 502 response code is appropriate here because the LankaCommerce server successfully processed the request but the downstream WhatsApp API failed. The frontend should surface this distinction to the user rather than treating it as a generic 500 error.
