# Task 03.02.09 — Build Receipt Preview Dialog

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.09 |
| Name | Build Receipt Preview Dialog |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | Task 03.02.07, Task 03.02.08 |
| Produces | `frontend/app/[tenantSlug]/terminal/components/ReceiptPreviewDialog.tsx` |

## Objective

Build the `ReceiptPreviewDialog` frontend component that appears immediately after a sale is successfully completed. It gives the cashier a clear confirmation view and options to send a WhatsApp receipt, print to the thermal printer, or dismiss without any receipt action.

## Instructions

### Step 1: Create the Component File

Create `frontend/app/[tenantSlug]/terminal/components/ReceiptPreviewDialog.tsx`. Define the TypeScript props interface: `open` (boolean), `onClose` (void callback), `onNewSale` (void callback), `completedSale` (the sale object returned by `POST /api/pos/sales/` — may be null if the dialog renders before a sale is available, in which case render nothing), `changeAmount` (`Decimal | null` — applicable for CASH and SPLIT payments only), and `tenantSlug` (string — used to construct the receipt URL).

Import ShadCN `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, and `DialogDescription`. Import `Decimal` from `decimal.js`.

### Step 2: Dialog Shell

Use ShadCN `Dialog` with `open` controlled by the prop. Set `DialogContent` to `max-w-md`. Remove the default close button. Suppress backdrop and Escape key dismissal entirely — the cashier must make an explicit choice. Only the "No Receipt" link and the "New Sale" button close the dialog.

### Step 3: Sale Complete Header

Render a centred container with a large Lucide `CheckCircle2` icon in `success` green (`#22C55E`) at 48px. Below the icon, render "Sale Complete!" using Inter font (the project's heading font class) at `text-2xl`, centred, in `navy` colour (`#1B2B3A`). This visual confirmation gives the cashier an immediate signal that the transaction succeeded.

### Step 4: Sale Summary Block

Render a summary block with a `background` colour (`#F1F5F9`) rounded container and a `border` colour (`#E2E8F0`) solid border. Three rows:

- "Sale Ref" on the left, first 8 characters of `completedSale.id` in uppercase on the right, in JetBrains Mono `font-medium`.
- "Total" on the left, formatted total on the right, JetBrains Mono `text-xl font-bold` in `navy`.
- "Change Due" on the left (rendered only when `changeAmount` is not null and `payment_method` is `CASH` or `SPLIT`), formatted change on the right in JetBrains Mono `text-xl font-bold` in `success` green (`#22C55E`). If `changeAmount` is exactly zero, render "Rs. 0.00" in `navy` instead of success green.

### Step 5: WhatsApp Receipt Row

Render a "Send Receipt via WhatsApp" label in a small `text-muted` style (`#64748B`). Below, a flex row containing a phone input (`type="tel"`, placeholder "e.g. 077 123 4567", no autoFocus) and a small "Send" outline button with `orange` colour scheme (`#F97316`).

Maintain state: `whatsappNumber` (string), `isWhatsAppSending` (boolean), `whatsappSent` (boolean). The Send button shows "Send" when idle, a `Loader2` spinner when `isWhatsAppSending`, and "Sent ✓" in muted success style for 3 seconds after a successful dispatch (use a `setTimeout` to reset `whatsappSent`). Disable the button when the input is empty, when `isWhatsAppSending`, or when `whatsappSent`.

On clicking Send: set `isWhatsAppSending` to true. Call `POST /api/pos/sales/{completedSale.id}/send-receipt/` with `{ "phone_number": whatsappNumber }`. On `response.success === true`: reset `isWhatsAppSending`, set `whatsappSent` to true, show a success toast "Receipt sent via WhatsApp." On `response.success === false`: reset `isWhatsAppSending`, set `whatsappErrorMessage` to the error string.

### Step 6: WhatsApp Error State

Maintain `whatsappErrorMessage` (string or null). When non-null, render an error panel with a `danger` left border (`#EF4444`) and `background` fill. Show "Receipt not sent" in danger red and the error message below it. Add a "Retry" text button that resets `whatsappErrorMessage` to null and `whatsappSent` to false so the cashier can retry.

### Step 7: Print Button

Render a secondary full-width ShadCN `Button` with outline variant and a Lucide `Printer` icon: "Print Receipt". On click, call `window.open('/api/pos/sales/' + completedSale.id + '/receipt/', '_blank', 'noopener')`. The new tab renders the thermal receipt HTML and triggers the print dialog automatically. This button is never disabled and never shows a loading state.

### Step 8: No Receipt and New Sale Controls

Render a "No Receipt — close" plain text link button (`text-sm text-muted-foreground underline-offset-2 hover:underline`). Clicking it invokes `onClose` without resetting the cart.

Render a primary full-width "New Sale" button with `navy` background (`#1B2B3A`) and `surface` text (`#FFFFFF`) and a Lucide `Plus` icon. Clicking it invokes `onNewSale`. The parent terminal component's `onNewSale` handler resets the Zustand cart store and closes the dialog.

### Step 9: Keyboard Navigation and Accessibility

Tab order: WhatsApp input → Send → Print → No Receipt → New Sale. Apply `tabIndex` if the DOM order deviates. Focus the "Sale Complete!" heading container on dialog open using `autoFocus` or a `useEffect` with `ref.current.focus()`. Add `aria-label` to any icon-only buttons. Ensure `aria-labelledby` points to the `DialogTitle` element.

## Expected Output

- `frontend/app/[tenantSlug]/terminal/components/ReceiptPreviewDialog.tsx` created and wired into the terminal page's `onSaleComplete` callback.
- The dialog appears after every successful sale with correct total, change (if applicable), and WhatsApp/print options.

## Validation

- Complete a cash sale — confirm the dialog appears with correct total and change.
- Complete a card sale — confirm the change row is absent.
- Complete a split sale — confirm the change row shows the cash leg change.
- Enter a phone number and click Send — confirm `POST /api/pos/sales/{id}/send-receipt/` is called and "Sent ✓" appears.
- Simulate a WhatsApp failure — confirm the error panel appears with a retry option.

## Notes

- The `orange` colour scheme (`#F97316`) is used for the Send button, replacing the old `terracotta` scheme.
- The dialog does not manage cart state — that is the parent terminal component's responsibility via the `onNewSale` callback.
