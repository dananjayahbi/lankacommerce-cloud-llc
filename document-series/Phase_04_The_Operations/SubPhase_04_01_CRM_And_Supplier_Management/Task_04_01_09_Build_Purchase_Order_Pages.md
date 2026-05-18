# Task 04.01.09 — Build Purchase Order Pages

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.09 |
| Complexity | High |
| Dependencies | 04.01.08 + 04.01.07 |
| Produces | PO list page, PO detail page, new PO form page, PO DRF views |

---

## Objective

Build all Purchase Order facing pages and DRF API views. Staff can create new POs, filter the list by status and supplier, access a detail view for each PO, and trigger lifecycle actions (send, cancel, receive) from the detail page.

---

## Instructions

### Step 1: Build the PO DRF Views

Create `backend/apps/crm/views/purchase_order_views.py`. All views use `JWTAuthentication` and `HasTenantPermission`. Extract `tenant_id` from `request.auth['tenant_id']` and `user_id` from `request.auth['user_id']`.

**`PurchaseOrderListCreateView`** handles `GET` and `POST` at `/api/crm/purchase-orders/`:

- `GET`: extract query params `supplier_id`, `status`, `from_date`, `to_date`, `page` (default 1), `limit` (default 20). Call `get_pos(tenant_id, ...)`. Return 200 with the paginated dict in the standard success envelope.
- `POST`: validate body with `CreatePurchaseOrderSerializer`. Call `create_po(tenant_id, created_by_id=user_id, input_data=serializer.validated_data)`. Return 201 with the created PO serialised by `PurchaseOrderDetailSerializer`.

**`PurchaseOrderDetailView`** handles `GET` and `PATCH` at `/api/crm/purchase-orders/{id}/`:

- `GET`: call `get_po_by_id(tenant_id, po_id)`. Return 200 or 404.
- `PATCH`: validate body with `UpdatePOStatusSerializer` (field: `status` only). Call `update_po_status(tenant_id, po_id, validated_data['status'])`. Return 200 with updated PO.

**`PurchaseOrderReceiveView`** handles `POST` at `/api/crm/purchase-orders/{id}/receive/`:

- Validate body with `ReceivePOLinesSerializer`: a list field `received_lines`, each element having `line_id` (UUIDField), `received_qty` (IntegerField, min 1), `actual_cost_price` (DecimalField, allow_null=True).
- Call `receive_po_lines(tenant_id, po_id, received_lines=validated_data['received_lines'], actor_id=user_id)`.
- On `ValueError`, return 422 with the error message.
- On success, return 200 with `{ "success": true, "data": { "updated_po": {...}, "cost_prices_changed": [...] } }`.

**`PurchaseOrderSendWhatsAppView`** handles `POST` at `/api/crm/purchase-orders/{id}/send-whatsapp/`:

- At this stage, return `Response({'success': False, 'error': {'code': 'NOT_IMPLEMENTED', 'message': 'WhatsApp dispatch is implemented in Task 04.01.11'}}, status=501)`.
- This stub allows the URL registration and frontend wiring to proceed while the WhatsApp logic is deferred.

Create `backend/apps/crm/serializers/purchase_order_serializer.py` with the serializers described above. Register all four URL patterns in `backend/apps/crm/urls.py`.

### Step 2: Build the PO List Page

Create `frontend/app/[tenantSlug]/suppliers/purchase-orders/page.tsx` as a Client Component. TanStack Query key `['purchase-orders', tenantSlug, filters]` fetching from `GET /api/crm/purchase-orders/`.

**Page Header:** "Purchase Orders" in Inter `text-2xl font-semibold text-navy`. "New Purchase Order" link button on the right, navigating to `frontend/app/[tenantSlug]/suppliers/purchase-orders/new/page.tsx`.

**Filter Bar:**

- Supplier `Select` — populated by TanStack Query `useQuery` key `['suppliers-dropdown', tenantSlug]` fetching `GET /api/crm/suppliers/?limit=100`. Default option "All Suppliers".
- Status `Select` with options: All Statuses, DRAFT, SENT, PARTIALLY RECEIVED, RECEIVED, CANCELLED.
- Date range picker for `from_date` and `to_date`.

**ShadCN `Table`** with columns:

- PO Reference — last 8 characters of the UUID string prefixed "PO-", rendered in JetBrains Mono, linked to the detail page
- Supplier — Inter, plain text
- Status — ShadCN `Badge` with colour:
  - DRAFT: `background: #64748B`, `color: white` (grey/muted)
  - SENT: `background: #3B82F6`, `color: white` (blue)
  - PARTIALLY_RECEIVED: `background: #F59E0B`, `color: white` (amber)
  - RECEIVED: `background: #22C55E`, `color: white` (green)
  - CANCELLED: `background: #EF4444`, `color: white` with strikethrough text (red)
- Lines — integer count of PO lines (the `lines_count` annotation from the service)
- Total Amount — JetBrains Mono, `text-navy`
- Expected Delivery — formatted "DD/MM/YYYY" or "—" if null
- Created — formatted "DD MMM YYYY"
- Actions — "View" link to detail page

ShadCN `Pagination` below the table. Show `Skeleton` rows while loading.

### Step 3: Build the New PO Form Page

Create `frontend/app/[tenantSlug]/suppliers/purchase-orders/new/page.tsx` as a Client Component.

**Layout:** two-column grid on large screens (`lg:grid-cols-3`). Form occupies 2 columns, live order summary occupies 1 column.

**Form (left 2/3):**

- Supplier — ShadCN searchable `Select` component populated by `GET /api/crm/suppliers/?limit=100`. Required.
- Expected Delivery Date — date picker, optional.
- Notes — `Textarea`, optional.

**PO Lines section:**

Managed with React Hook Form `useFieldArray(control, { name: 'lines' })`. At least one line is required — validated on submit.

Each line row:

- Variant search — debounced `Input` (300 ms) triggering `GET /api/crm/products/variants/?search=[query]&limit=10`. Clicking a result from the dropdown sets `variant_id`, `product_name_snapshot`, `variant_description_snapshot`, and pre-fills `expected_cost_price` from the variant's current `cost_price`.
- Ordered Qty — number `Input`, min 1.
- Expected Cost Price (Rs.) — decimal `Input`, pre-filled from variant `cost_price` but editable.
- Remove button (trash icon) — removes the line from the array.

"Add Line" button below the lines: `fields.append({ variant_id: '', ordered_qty: 1, expected_cost_price: '' })`.

**Live Summary Panel (right 1/3):**

A sticky `Card` showing:

- Supplier name (from selected supplier, or "No supplier selected").
- A list of each line: `product_name_snapshot × ordered_qty × expected_cost_price`.
- Running total computed with `decimal.js`: `lines.reduce((sum, l) => sum.plus(new Decimal(l.ordered_qty || 0).mul(new Decimal(l.expected_cost_price || 0))), new Decimal(0)).toFixed(2)`.
- "Total: Rs. [total]" in JetBrains Mono `text-xl font-bold text-navy`.

**"Create Purchase Order" submit button** (primary, full width at bottom of form):

On submit validation failure (empty lines array): show an inline error "At least one line is required."

On success: `POST /api/crm/purchase-orders/` via `useMutation`. On `onSuccess`: `toast("Purchase Order created as DRAFT.")`, `router.push('/[tenantSlug]/suppliers/purchase-orders/[new_po_id]')`.

### Step 4: Build the PO Detail Page

Create `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx`. TanStack Query key `['purchase-order', tenantSlug, poId]` fetching from `GET /api/crm/purchase-orders/{poId}/`.

**Header section:**

- PO Reference ("PO-[last8]") in JetBrains Mono `text-2xl font-bold`
- Status badge (colour-coded, same scheme as list page)
- Supplier name in Inter `text-lg`
- Contact name, phone (muted), expected delivery date

**Stats row:** Total Amount (JetBrains Mono, `text-navy`), Lines count, Created date.

**PO Lines Table:**

Columns: Product (`product_name_snapshot` in `font-medium` + `variant_description_snapshot` in muted below), Ordered Qty (grey, read-only), Received Qty (format: "N / M"; green `#22C55E` text when N > 0), Fully Received (ShadCN `Badge` "Yes" in green or "No" in muted), Expected Cost (JetBrains Mono), Actual Cost (JetBrains Mono — only rendered when `actual_cost_price` is non-null; otherwise "—").

**Action buttons** conditional on PO status:

- DRAFT: "Send via WhatsApp" button (primary, WhatsApp icon) and "Cancel PO" button (destructive outline). "Send via WhatsApp" is wired as a stub for Task 04.01.11.
- SENT or PARTIALLY_RECEIVED: "Receive Goods" button (opens `GoodsReceivingModal`) and "Cancel PO" button. The "Receive Goods" button has `variant="default"` with a package icon.
- RECEIVED: a green banner "All goods received." — no action buttons.
- CANCELLED: a muted banner "This purchase order was cancelled." — no action buttons.

**Cancel PO AlertDialog:**

Title: "Cancel Purchase Order?"
Description: "This action cannot be undone. Once cancelled, no goods can be received against this order."
Buttons: "Keep Order" and "Cancel Order" (destructive). On confirm: `useMutation` to `PATCH /api/crm/purchase-orders/{poId}/` with `{ status: 'CANCELLED' }`. On success: `toast("Purchase order cancelled.")`, invalidate the detail query.

---

## Expected Output

- `backend/apps/crm/views/purchase_order_views.py` — four DRF view classes.
- `backend/apps/crm/serializers/purchase_order_serializer.py` — `CreatePurchaseOrderSerializer`, `UpdatePOStatusSerializer`, `ReceivePOLinesSerializer`, `PurchaseOrderDetailSerializer`.
- Updated `backend/apps/crm/urls.py` — all PO URL patterns registered.
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/page.tsx` — list with filters.
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/new/page.tsx` — creation form with live summary.
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx` — detail with conditional actions.

---

## Validation

- PO list filters by status: selecting "DRAFT" shows only DRAFT POs; selecting "RECEIVED" shows only RECEIVED POs.
- PO list filters by supplier: selecting a specific supplier name shows only their POs.
- New PO form prevents submission with an empty lines array — shows inline error.
- Status badge renders correct colour for each of the five status values.
- Detail page shows "Send via WhatsApp" and "Cancel PO" buttons for a DRAFT PO.
- Detail page shows "Receive Goods" and "Cancel PO" buttons for a SENT PO.
- Detail page shows only the "All goods received." banner for a RECEIVED PO.
- PO Reference in the list and detail renders as "PO-" followed by the last 8 characters of the UUID.

---

## Notes

- The PO detail page should use `staleTime: 30000` (30 seconds) on the TanStack Query to avoid refetching on every tab focus — the PO detail rarely changes between user interactions.
- The `GoodsReceivingModal` is imported into the detail page but its implementation is covered in Task 04.01.10.
- The "Send via WhatsApp" button stub returns HTTP 501 — wire the `onError` handler to display a toast explaining that WhatsApp dispatch is not yet available, so the UI is not broken during development.
