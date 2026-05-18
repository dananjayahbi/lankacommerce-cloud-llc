# Task 03.02.03 — Build Cash Payment Modal

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.03 |
| Name | Build Cash Payment Modal |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | SubPhase 03.01 complete |
| Produces | `frontend/components/pos/CashPaymentModal.tsx` |

## Objective

Build the `CashPaymentModal` component presented to the cashier when they select CASH as the payment method. The modal handles cash amount entry, live change calculation, quick banknote selection, and submission of the completed sale payload to `POST /api/pos/sales/`.

## Instructions

### Step 1: Create the Component File

Create `frontend/components/pos/CashPaymentModal.tsx`. Define a TypeScript props interface. The props are: `open` (boolean controlling dialog visibility), `onClose` (void callback for explicit dismissal without completing a sale), `onSaleComplete` (callback accepting the completed sale object returned by the API), `totalAmount` (a `Decimal` from `decimal.js`), and `salePayload` (the assembled sale request body ready to be sent to the API, minus the payment-specific fields this modal contributes). Import `CompletedSale` and `CreateSalePayload` types from the project's shared frontend types.

### Step 2: Build the Dialog Shell

Use ShadCN's `Dialog`, `DialogContent`, `DialogHeader`, and `DialogTitle` components. Set `DialogContent` to `max-w-sm`. The `DialogTitle` reads "Cash Payment" using Inter font (the project's heading font class). Suppress backdrop and Escape key dismissal while an API submission is in progress by intercepting the `onInteractOutside` and `onEscapeKeyDown` events. When not submitting, allow normal dismissal via `onClose`.

### Step 3: Total Due Row

Render the "Total Due" label in a small uppercase tracking-wide style using `text-muted` colour (`#64748B`). Below the label, render the formatted total amount — for example "Rs. 3,750.00" — in JetBrains Mono font, `text-3xl`, bold weight, and `navy` colour (`#1B2B3A`). This large total is the visual anchor of the modal.

### Step 4: Cash Received Input

Render the "Cash Received" label in the same muted small-label style. Implement the input as a flex row with a non-editable "Rs." prefix span and the ShadCN `Input` side by side, sharing a border and background so they appear as one element. Apply `autoFocus` to the input. If `autoFocus` alone does not reliably focus the input after the ShadCN dialog animation, use a `useEffect` with `ref.current.focus()` inside a short `setTimeout` when the `open` prop becomes true.

Maintain the entered value in a `cashReceived` `Decimal` or `null` state variable. Parse the raw input string into a `Decimal` on each `onChange` event. If the string is not a valid number, set the state to `null`.

### Step 5: Quick-Amount Buttons

Render a horizontal row of quick-amount preset buttons displaying Rs. 500, Rs. 1,000, Rs. 2,000, and Rs. 5,000. Clicking a button sets `cashReceived` to the denomination value. Style these as small outline variant buttons using the `border` colour scheme (`#E2E8F0`). Visually dim any denomination less than the total due as a UX hint that the amount is insufficient — this is a hint only, not hard validation.

### Step 6: Change Calculation Display

Render a "Change" label in the muted small style. Compute the change by calling the `computeChange` utility imported from the payment utilities module. Wrap the computation in a try-catch.

When change is zero or positive: display the amount in JetBrains Mono with a large font and `success` green (`#22C55E`).
When `cashReceived` is empty or unparseable: display "—" in `text-muted` colour.
When `cashReceived` is below `totalAmount` (caught exception): display the entered amount in `danger` red (`#EF4444`) and show a warning message below the change row — "Amount entered is insufficient — please enter a higher amount or select a denomination above."

### Step 7: Submit Button

Place the submit button in the dialog footer. Its label is "Complete Sale — Rs. [total formatted]". Apply `navy` background (`#1B2B3A`) and `surface` text (`#FFFFFF`). Disable the button when `cashReceived` is null, when `cashReceived` is less than `totalAmount`, or when an API call is in progress. When in progress, show a Lucide `Loader2` spinning icon instead of the label. Below the submit button, render a plain text "Cancel" link that invokes `onClose`.

### Step 8: API Submission

When the cashier clicks the enabled submit button, merge `salePayload` with the payment fields: set `payment_method` to `"CASH"` and `cash_received` to the numeric value of `cashReceived` (converted to a JavaScript number for JSON serialisation). Call `POST /api/pos/sales/` using the frontend API request utility. Manage submission state with a local `isSubmitting` boolean.

On success, invoke `onSaleComplete` with the returned sale object. The parent component handles opening the `ReceiptPreviewDialog`. On an API error, display an error toast using the project's toast utility, reset `isSubmitting` to false, and leave the dialog open for retry. Reset `cashReceived` to `null` when the dialog closes for any reason so the input is blank on the next open.

## Expected Output

- `frontend/components/pos/CashPaymentModal.tsx` created and integrated into the POS terminal payment flow.
- The modal renders the correct total, accepts cash input, shows live change, and calls the sale API on confirmation.

## Validation

- Open the modal with items in the cart, select CASH — confirm the correct total is displayed.
- Click a quick-amount button — confirm the cash input is pre-filled.
- Enter an amount below the total — confirm danger styling appears and submit is disabled.
- Enter an amount above the total — confirm correct change is shown in success green and submit is enabled.
- Submit — confirm `POST /api/pos/sales/` is called and the `ReceiptPreviewDialog` opens on success.

## Notes

- All currency arithmetic uses `decimal.js` — never JavaScript native number subtraction for monetary values.
- The quick-amount denominations (500, 1000, 2000, 5000) represent the most commonly used banknotes in Sri Lankan retail. Lower denominations are omitted to keep the row compact.
- Reset `cashReceived` to `null` on close — do not retain state across open/close cycles.
