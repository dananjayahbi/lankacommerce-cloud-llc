# Task 04.01.10 — Build Goods Receiving Modal

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.10 |
| Complexity | Medium |
| Dependencies | 04.01.08 + 04.01.09 |
| Produces | `frontend/components/suppliers/GoodsReceivingModal.tsx`, updated PO detail page |

---

## Objective

Build the Goods Receiving Modal — a ShadCN `Dialog` opened from the PO Detail page. Staff enter the quantity received per line and the actual cost paid. On submit, the API calls `receive_po_lines` which wraps all stock and PO state changes in `transaction.atomic()`. A follow-up `AlertDialog` in the parent page shows which variant cost prices changed.

---

## Instructions

### Step 1: Define Component Props and Local State

Create `frontend/components/suppliers/GoodsReceivingModal.tsx` as a Client Component (`'use client'`).

Props interface:

- `po: PurchaseOrder` — full PO object with `lines`, `supplier`, and current status; PO must be SENT or PARTIALLY_RECEIVED
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `tenantSlug: string` — used for TanStack Query cache key invalidation
- `onSuccess: (result: { updated_po: PurchaseOrder; cost_prices_changed: CostPriceChange[] }) => void`

Define types locally:

- `ReceivingEntry = { this_qty: number; actual_cost_price: string }`
- `CostPriceChange = { variant_id: string; variant_description: string; old_cost_price: string; new_cost_price: string }`

Local state:

- `entries: Record<string, ReceivingEntry>` — keyed by `line.id`

Initialise `entries` via `useEffect` watching `po.lines`:

For each line where `line.is_fully_received === false`, set:

`entries[line.id] = { this_qty: 0, actual_cost_price: line.expected_cost_price.toString() }`

Reset to initial state whenever the modal opens (`open` changes to `true`) to prevent stale state from a previous receiving session.

### Step 2: Filter Lines to Show

Compute `displayableLines = po.lines.filter(l => !l.is_fully_received)`. If `displayableLines.length === 0`, render inside the Dialog: a message "All lines for this purchase order have been fully received." in `text-muted-foreground`, and a single "Close" button calling `onOpenChange(false)`. Return early.

### Step 3: Render the Lines Table

**Dialog structure:**

ShadCN `Dialog` → `DialogContent` with `max-w-4xl` and a `max-h-[90vh] flex flex-col` layout to constrain height and keep the footer visible.

`DialogHeader`: title "Receive Goods", description "[PO-last8] from [supplier.name]".

**Scrollable table area** (`flex-1 overflow-y-auto`):

ShadCN `Table` with columns:

- **Product** — `product_name_snapshot` in `font-medium` on one line, `variant_description_snapshot` in `text-sm text-muted-foreground` below. This column gets `flex-grow` so narrow numeric columns stay compact.
- **Ordered** — integer, `text-muted-foreground`, read-only; right-aligned
- **Prev. Received** — `line.received_qty`, rendered in `#22C55E` green when > 0, `text-muted-foreground` when 0; right-aligned
- **Remaining** — `line.ordered_qty - line.received_qty`, rendered in `#F59E0B` amber; right-aligned
- **This Receiving** — stepper widget (see Step 3a)
- **Actual Cost Rs.** — decimal text input (see Step 3b)

**Step 3a — Stepper widget for `this_qty`:**

A row of three elements: a `−` Button (outline, small, square) + an `Input` (number, width ~60px, centred, no spin buttons) + a `+` Button (outline, small, square).

Constraints:

- `−` disabled when `entries[line.id].this_qty <= 0`
- `+` disabled when `entries[line.id].this_qty >= (line.ordered_qty - line.received_qty)`
- Direct keyboard entry also accepted; on `onChange`, clamp the value to `[0, remaining]`

On `−` click: `setEntries(prev => ({ ...prev, [line.id]: { ...prev[line.id], this_qty: prev[line.id].this_qty - 1 } }))`

On `+` click: increment similarly.

**Step 3b — Actual Cost input:**

A decimal `Input` with placeholder matching `line.expected_cost_price.toString()`. Bound to `entries[line.id].actual_cost_price`. Renders a helper text below: "Expected: Rs. [expected_cost_price]" in `text-xs text-muted-foreground`. If the entered value differs from `expected_cost_price` by more than 0.01%, show a `#F59E0B` amber inline indicator "⚠ Differs from expected" to prompt the user to double-check.

### Step 4: Render the Session Summary Footer

`DialogFooter` (sticky at bottom, `border-t pt-4`):

Compute `totalThisQty = Object.values(entries).reduce((sum, e) => sum + e.this_qty, 0)`.

Compute `activeLineCount = Object.values(entries).filter(e => e.this_qty > 0).length`.

Summary text (left side of footer):

- When `totalThisQty > 0`: "Receiving [totalThisQty] item(s) across [activeLineCount] line(s) this session." in a muted `text-sm` badge.
- When `totalThisQty === 0`: "Enter quantities to receive." in `text-muted-foreground text-sm`.

"Confirm Receipt ([totalThisQty] items)" button:

- Primary style, right side of footer.
- Disabled when `totalThisQty === 0`.
- Shows `Loader2` spinner during mutation.

### Step 5: Validate Before Submit

Client-side validation before calling the mutation:

For each entry in `entries` where `this_qty > 0`:

1. Check `this_qty <= (line.ordered_qty - line.received_qty)` — show inline error below the offending row's stepper.
2. Check `parseFloat(actual_cost_price) >= 0` — show inline error "Cost must be a non-negative number" below the cost input.

If any validation fails, set a local `validationErrors: Record<string, string>` state and do not proceed to the API call. Clear `validationErrors` when the user adjusts the offending field.

### Step 6: Submit and Handle Response

Build the request body: filter `entries` to those with `this_qty > 0`. Map each to:

`{ line_id: lineId, received_qty: entry.this_qty, actual_cost_price: entry.actual_cost_price !== line.expected_cost_price.toString() ? parseFloat(entry.actual_cost_price) : null }`

Only send `actual_cost_price` when it differs from `expected_cost_price` — a `null` value tells the backend to keep the existing `actual_cost_price` or leave it unset.

TanStack Query `useMutation`:

- URL: `POST /api/crm/purchase-orders/{po.id}/receive/`
- Body: `{ received_lines: [...] }`

`onSuccess`: `toast("Goods received successfully.")`, call `onOpenChange(false)`, invalidate `['purchase-order', tenantSlug, po.id]`, call `onSuccess(result.data)`.

`onError`: `toast({ variant: "destructive", title: "Receiving failed", description: error.message })`. Keep the modal open so staff can correct errors and retry.

### Step 7: Cost Price AlertDialog in the Parent

In `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx`, add local state:

`const [costPriceChanges, setCostPriceChanges] = useState<CostPriceChange[] | null>(null)`

In the `onSuccess` callback passed to `GoodsReceivingModal`, set:

`if (result.cost_prices_changed.length > 0) { setCostPriceChanges(result.cost_prices_changed) }`

Render a ShadCN `AlertDialog` when `costPriceChanges !== null`:

- Title: "Cost Prices Updated"
- Description: "The following variant cost prices were updated during this receiving session:"
- Below the description: an unordered list. Each item: "[variant_description_snapshot]: Rs. [old_cost_price] → Rs. [new_cost_price]". Render old and new prices in JetBrains Mono.
- Note paragraph: "These changes affect margin calculations in your sales and reports going forward."
- Single action button: "Understood" — clicking sets `setCostPriceChanges(null)` and dismisses the dialog. No undo option.

---

## Expected Output

- `frontend/components/suppliers/GoodsReceivingModal.tsx` — interactive receiving table with stepper and cost inputs, session summary footer, and mutation.
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx` — updated with `GoodsReceivingModal` integration and cost price `AlertDialog`.

---

## Validation

- Stepper `+` button is disabled when `this_qty` already equals the remaining quantity for a line.
- Stepper `−` button is disabled when `this_qty` is 0.
- Submitting with all `this_qty` values at 0 is blocked — the "Confirm Receipt" button remains disabled.
- Submitting a partial receive (one of two lines has `this_qty > 0`) succeeds and PO status updates to PARTIALLY_RECEIVED.
- After a successful full receive, PO detail page status badge updates to RECEIVED without a full page reload.
- Cost price `AlertDialog` appears only when `cost_prices_changed` is a non-empty array.
- Cost price `AlertDialog` does not appear when `cost_prices_changed` is an empty array.
- Modal resets `entries` to initial state when opened for a second receiving session on the same PO.

---

## Notes

- The modal's `useEffect` dependency on `po.lines` means it reinitialises `entries` whenever the PO data is refetched — this is correct behaviour since the remaining quantities change after each receiving session.
- The `actual_cost_price` field sending `null` when unchanged is intentional — it tells the backend not to overwrite a previously recorded actual cost from an earlier receiving session on the same line.
- Prevent the Dialog from closing when the user clicks the backdrop (`preventClose` or `onInteractOutside={e => e.preventDefault()}`) during an active mutation — this prevents accidental dismissal mid-submit.
