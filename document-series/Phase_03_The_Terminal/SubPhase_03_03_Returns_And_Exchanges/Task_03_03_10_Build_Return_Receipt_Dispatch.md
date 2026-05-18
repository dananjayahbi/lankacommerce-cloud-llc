# Task 03.03.10 — Build Return Receipt Dispatch

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.10 |
| Name | Build Return Receipt Dispatch |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | Task 03.03.07 |
| Produces | `backend/apps/pos/utils/return_receipt_renderer.py`, DRF view `GET /api/pos/returns/{id}/receipt/`, `frontend/components/pos/ReturnReceiptDialog.tsx` |

---

## Objective

Build a return receipt system that mirrors the sale receipt system from SubPhase_03_02. After a return is completed, the cashier is presented with a dialog offering WhatsApp dispatch and thermal printing. The receipt is rendered by a pure Python function serving 80 mm thermal paper HTML, consistent with the sale receipt renderer.

---

## Instructions

### Step 1: Build the Return Receipt Renderer

Create `backend/apps/pos/utils/return_receipt_renderer.py`. A pure Python module with one exported function `build_return_receipt_html(return_record, tenant) -> str`. No Django view dependencies — this is a string-building function.

The function returns a complete HTML5 document (same structure as `build_thermal_receipt_html` from SubPhase_03_02) with the following sections in order:

1. Store header: tenant name (centred, bold, 11pt), address (centred, small), phone number prefixed "Tel: " (centred, small). Omit address/phone if null.
2. Solid separator line.
3. "RETURN RECEIPT" label — centred, bold, uppercase. This label visually distinguishes the document from a sale receipt.
4. Original Sale reference: "Original Sale: [first 8 chars of sale.id in uppercase]" left-aligned.
5. Return reference: "Return Ref: [first 8 chars of return.id in uppercase]" left-aligned.
6. Date and time: "Date: DD/MM/YYYY HH:mm" left-aligned.
7. Cashier and Manager lines: "Cashier: [initiated_by name]" and "Authorized By: [authorized_by name]".
8. Dashed separator.
9. Items returned: for each `ReturnLine` — product name on row one, variant description indented on row two (if non-empty), "Qty: X @ Rs. X.XX = Rs. X.XX" on row three in monospace alignment.
10. Dashed separator.
11. Total refund: "TOTAL REFUND: Rs. X,XXX.XX" right-aligned, bold.
12. Refund method: "Refund Method: [method]".
13. If CARD_REVERSAL: "Reversal Ref: [reference]" on the next line.
14. If STORE_CREDIT: "Credit Note Issued — Redeemable in future purchase."
15. Dashed separator.
16. Restock status: "Inventory: Items returned to stock" or "Inventory: Items not restocked."
17. Footer: tenant's `thank_you_message` if non-empty, then "LankaCommerce POS" in centred small muted style.

CSS: `@page { size: 80mm auto; margin: 3mm; }`, `body` monospace 9pt, `@media print { #no-print-wrapper { display: none !important; } }`. Include the `setTimeout(window.print, 200)` script.

### Step 2: Build GET /api/pos/returns/{id}/receipt/

Add `ReturnReceiptView` to `backend/apps/pos/views/return_views.py`. Use `JWTAuthentication` and `HasTenantPermission`. The `get` method: verify session and tenant, fetch the Return with all related data (lines, original sale, `initiated_by`, `authorized_by`, tenant name and address). If not found, return an `HttpResponse` with a minimal "Receipt not found" HTML page and status 404. Call `build_return_receipt_html(return_record, tenant)`. Return `HttpResponse(html_string, content_type='text/html')` with headers `Cache-Control: no-store, no-cache` and the same `Content-Security-Policy` as the sale receipt endpoint.

Register the URL at `GET /api/pos/returns/{id}/receipt/` in `backend/apps/pos/urls.py`.

### Step 3: Build ReturnReceiptDialog

Create `frontend/components/pos/ReturnReceiptDialog.tsx`. Props: `return_id: string`, `open: boolean`, `onOpenChange`, `onDone` (called when cashier returns to POS terminal).

Content:

- Header: a success checkmark icon in `success` green (`#22C55E`) in a circle, and "Return Processed" heading in Inter.
- Summary: refund method `Badge`, refund amount in JetBrains Mono large ("Rs. X,XXX.XX"), return reference in `text-muted` (`#64748B`).
- WhatsApp Dispatch: a phone number input pre-labelled with Sri Lanka country code (+94), a "Send via WhatsApp" button using `orange` colour (`#F97316`). On click, call `POST /api/pos/sales/{sale_id}/send-receipt/` with `type: "return"` and `return_id`. On success, show a "Sent ✓" confirmation. On failure, show an inline error.
- Print section: a "Print Return Receipt" button that opens `GET /api/pos/returns/{return_id}/receipt/` in a new tab. The new tab triggers `window.print()` automatically.
- Footer: a primary "Done — Return to Terminal" button calling `onDone()`, and a smaller "Skip Receipt" link-style button also calling `onDone()`.

### Step 4: Trigger the Dialog After Return Completion

In `ReturnWizardSheet.tsx`, after a successful `POST /api/pos/returns/` response where `refund_method !== EXCHANGE`: store the returned `return_id` in component state, set a `show_receipt: true` flag, and render `ReturnReceiptDialog`. Wire `onDone` to close both the receipt dialog and `ReturnWizardSheet`, then call the parent's `onReturnComplete()` callback to refresh the Sale History query.

---

## Expected Output

- `backend/apps/pos/utils/return_receipt_renderer.py` generates correct 80 mm HTML for any Return record
- `GET /api/pos/returns/{id}/receipt/` returns the HTML receipt
- `ReturnReceiptDialog` shows after every non-exchange return with WhatsApp and print options

---

## Validation

- `build_return_receipt_html` returns a valid HTML5 string with `<!DOCTYPE html>`
- `GET /api/pos/returns/{id}/receipt/` returns 200 with `Content-Type: text/html`
- Opening the receipt URL in a browser triggers the print dialog automatically
- The "RETURN RECEIPT" label is visually prominent and distinguishes from the sale receipt
