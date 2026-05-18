# Task 03.03.08 — Build Return History Page

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.08 |
| Name | Build Return History Page |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | Task 03.03.07 |
| Produces | `frontend/app/[tenantSlug]/pos/returns/page.tsx`, `frontend/components/pos/ReturnDetailModal.tsx` |

---

## Objective

Build a dedicated Return History page accessible from the POS terminal's top navigation bar. This page allows managers and cashiers to browse all return transactions, filter by date and method, and drill into individual return detail to view line-level information.

---

## Instructions

### Step 1: Create the Page Route

Create `frontend/app/[tenantSlug]/pos/returns/page.tsx`. This page uses the POS terminal layout. Add a "Returns" link to the POS terminal's top navigation bar next to the existing "Sales History" link.

### Step 2: Implement Data Fetching

Use TanStack Query with key `["returns", tenantSlug, filters]` fetching from `GET /api/pos/returns/`. Set `staleTime` to 30 seconds. Track `page` state starting at 1 and reset to 1 when filters change. Fetch with `limit=25`.

### Step 3: Build the Filter Bar

Render a horizontal filter bar with: a date range picker (two ShadCN Popover-based date inputs for "From" and "To" with clear buttons), a ShadCN `Select` for Refund Method (All, Cash, Card Reversal, Store Credit, Exchange), a debounced (300ms) text search input for Original Sale reference, and a "Clear Filters" button.

### Step 4: Build the Returns Table

Render a ShadCN `Table` with columns:

- Return Ref — first 8 chars of UUID, uppercase, JetBrains Mono, `text-muted` style (`#64748B`)
- Original Sale Ref — same format, rendered as a clickable link to the Sale Detail modal
- Date — "DD MMM YYYY HH:mm" in tenant local time
- Items Returned — sum of all `ReturnLine.quantity` values
- Refund Amount — right-aligned, JetBrains Mono
- Refund Method — ShadCN `Badge`: CASH in `success` green (`#22C55E`), CARD_REVERSAL in `info` blue (`#3B82F6`), STORE_CREDIT in `text-muted` secondary (`#64748B`), EXCHANGE in `orange` (`#F97316`)
- Restocked — checkmark in `success` green (`#22C55E`) if all lines have `is_restocked=True`; dash if all `False`; warning triangle in `warning` amber (`#F59E0B`) if mixed
- Authorized By — authorizing manager's display name
- Actions — "View" button opening `ReturnDetailModal`

Show a Skeleton table while loading. Show an empty state ("No returns found") when the filtered result is empty.

### Step 5: Build the ReturnDetailModal

Create `frontend/components/pos/ReturnDetailModal.tsx`. A ShadCN `Dialog` (not Sheet). Modal header: "Return [shortRef]" with the return date.

Content:

- Summary grid: Original Sale, Cashier (`initiated_by` name), Manager (`authorized_by` name), Refund Method badge, Refund Amount (JetBrains Mono), Restock status, Return Reason.
- Table of ReturnLines: Product Name, Variant, Qty Returned, Refund per Line, Restocked (boolean icon).
- Footer: an "Original Sale" link opening the Sale Detail modal, and a "Print Return Receipt" button.

The "Print Return Receipt" button opens `GET /api/pos/returns/{id}/receipt/` in a new tab. The new tab triggers `window.print()` automatically via the embedded script in the receipt HTML (same pattern as the sale receipt in SubPhase_03_02).

---

## Expected Output

- Return History page at `frontend/app/[tenantSlug]/pos/returns/page.tsx` with filters, paginated table, and detail modal
- POS terminal top bar has a "Returns" navigation link

---

## Validation

- Filtering by CASH shows only CASH returns
- Date range filter excludes returns outside the range
- The detail modal shows correct line-level data
- The Restocked column correctly reflects mixed and all-restocked states

---

## Notes

The `ReturnReceiptDocument` component used in `ReturnReceiptDialog` (Task 03.03.10) should be structured so it can be rendered both in the post-return dialog and in the detail modal for historical reprints — calling the same `GET /api/pos/returns/{id}/receipt/` endpoint in both cases.
