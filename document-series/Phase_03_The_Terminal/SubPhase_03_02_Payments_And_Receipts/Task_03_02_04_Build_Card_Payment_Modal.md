# Task 03.02.04 — Build Card Payment Modal

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.04 |
| Name | Build Card Payment Modal |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | Task 03.02.03 |
| Produces | `frontend/components/pos/CardPaymentModal.tsx` |

## Objective

Build the `CardPaymentModal` component presented to the cashier when they select CARD as the payment method. The modal confirms the total, instructs the cashier to process the payment on the physical card machine first, captures an optional terminal approval code, and submits the sale to `POST /api/pos/sales/` on confirmation.

## Instructions

### Step 1: Create the Component File

Create `frontend/components/pos/CardPaymentModal.tsx`. Use the same props interface pattern as `CashPaymentModal`: `open`, `onClose`, `onSaleComplete`, `totalAmount`, and `salePayload`. Import the same shared frontend types. Maintain `cardReferenceNumber` as a string state variable initialised to an empty string.

### Step 2: Dialog Shell and Header

Implement the dialog using ShadCN `Dialog`, `DialogContent`, `DialogHeader`, and `DialogTitle`. Set `max-w-sm` on `DialogContent`. The `DialogTitle` reads "Card Payment" using Inter font. Suppress backdrop and Escape dismissal while submitting.

The visual layout from top to bottom is: total amount display, informational guidance banner, terminal reference input, Phase 5 integration slot, and the submit button.

### Step 3: Total Due Display

Render the total due section identically to `CashPaymentModal`: a small "Total Due" label in `text-muted` colour (`#64748B`) followed by the formatted total in JetBrains Mono, `text-3xl`, bold, `navy` colour (`#1B2B3A`).

### Step 4: Informational Guidance Banner

Render a permanent informational banner with a `background` colour (`#F1F5F9`) rounded container and a left border in `info` blue (`#3B82F6`). The banner text reads: "Please process the payment on your card machine before confirming here. This system does not connect to the card terminal directly." The banner is always visible and cannot be dismissed.

### Step 5: Terminal Reference Input

Render a "Terminal Reference / Approval Code" label. Use a ShadCN `Input` with placeholder "e.g. 481200" and `maxLength` of 20. Place a Lucide `Info` icon beside the label wrapped in a ShadCN `Tooltip` with the text: "Enter the approval code from the card terminal receipt for your records. This helps reconcile transactions if a dispute arises. The field is optional." The tooltip trigger must be a focusable button element for keyboard accessibility.

### Step 6: Phase 5 Integration Slot

Add an empty `div` element with the data attribute `data-payhere-integration-slot="true"` below the terminal reference input. Add a developer comment above it explaining that this slot is the designated insertion point for the PayHere hosted payment integration in Phase 05. This element renders nothing visible in the current phase.

### Step 7: Submit Button

Place the submit button in `DialogFooter`. Its label is "Card Payment Confirmed — Rs. [total formatted]". Apply `navy` background and `surface` text. Disable only when submitting. Show a `Loader2` spinner when in progress. Render a plain text "Cancel" link below the button that invokes `onClose`. Allow cancellation mid-submission with a confirmation prompt: "Are you sure? The sale may still be processing."

### Step 8: API Submission

On submit, spread `salePayload` and add `payment_method: "CARD"` and `card_reference_number` (the current string value, which may be empty). Call `POST /api/pos/sales/`. On success, invoke `onSaleComplete`. On error, show an error toast and reset `isSubmitting`. Reset `cardReferenceNumber` to an empty string on dialog close.

## Expected Output

- `frontend/components/pos/CardPaymentModal.tsx` created and integrated into the POS terminal payment flow.
- The Phase 5 integration slot div is present in the rendered DOM.

## Validation

- Select CARD and open the modal — confirm the correct total and the info banner are visible.
- Leave the reference field empty — confirm the submit button remains enabled.
- Enter a reference code and submit — confirm `POST /api/pos/sales/` receives `card_reference_number` with the value.
- Submit without a reference — confirm the field is sent as an empty string.
- Hover the info icon — confirm the tooltip text is visible.

## Notes

- The approval code from a physical card terminal is typically 6 digits but can be alphanumeric. The 20-character free-form text limit accommodates all common formats without restrictive regex validation.
- Reset `cardReferenceNumber` to an empty string on close — consistent with `CashPaymentModal`'s reset behaviour.
