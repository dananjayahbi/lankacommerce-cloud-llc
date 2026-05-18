# Task 03.02.05 — Build Split Payment Modal

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.05 |
| Name | Build Split Payment Modal |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | High |
| Depends On | Task 03.02.04 |
| Produces | `frontend/components/pos/SplitPaymentModal.tsx` |

## Objective

Build the `SplitPaymentModal` component for the scenario where a customer pays part of their bill by card and the remainder in cash. The modal guides the cashier through specifying the card portion, auto-computing the cash portion, accepting the physical cash tendered, calculating change for the cash leg, capturing an approval code for the card leg, and validating all amounts before enabling submission.

## Instructions

### Step 1: Create the Component File

Create `frontend/components/pos/SplitPaymentModal.tsx`. Use the same props interface pattern: `open`, `onClose`, `onSaleComplete`, `totalAmount`, and `salePayload`. Use `max-w-md` (wider than the other modals) to accommodate the additional interactive elements.

Declare five state variables: `cardAmount` (`Decimal | null`), `cashReceived` (`Decimal | null`), `cardReferenceNumber` (string, initially empty), `isSubmitting` (boolean), and `validationMessage` (string or null).

### Step 2: Dialog Header

Set `DialogTitle` to "Split Payment" using Inter font. Add a subtitle paragraph in `text-muted` colour (`#64748B`) at a small font size: "Part card, part cash — both amounts must add up to the total."

### Step 3: Total Due Display

Render the same large JetBrains Mono total in `navy` colour (`#1B2B3A`) at the top of the dialog body, following the identical layout from the other payment modals.

### Step 4: Card Amount Input

Render an "Amount to charge to card" label with an asterisk indicating required. Use a ShadCN `Input` with an inline "Rs." prefix. Parse the input into a `Decimal` on each keystroke and store in `cardAmount`. If the entered value exceeds `totalAmount` (checked with Decimal's `.greaterThan` method), show an inline error below the input in `danger` red (`#EF4444`): "Card amount cannot exceed the total due."

### Step 5: Cash Amount Display

Compute `cashAmount` dynamically as `totalAmount.minus(cardAmount)` whenever `cardAmount` changes. Render it as a read-only field with a `border` colour (`#E2E8F0`) tinted background, rounded border, and label "Remaining cash amount (auto-computed)".

When `cardAmount` is null: show "—". When `cardAmount` equals `totalAmount` exactly: show "Rs. 0.00" with a note "No cash needed — consider using the Card Payment flow instead." When computed `cashAmount` would be negative: show in `danger` red.

### Step 6: Allocation Summary Row

Render a live summary row: "Card: Rs. [cardAmount] + Cash: Rs. [cashAmount] = Rs. [sum]". When the sum equals `totalAmount` using Decimal's `.equals` method, apply `success` green (`#22C55E`) and add a Lucide `CheckCircle2` icon. Otherwise display in `text-muted` colour without an icon.

### Step 7: Cash Received Input

Show this section only when `cardAmount` is valid and the computed `cashAmount` is strictly greater than zero. Use a `transition-opacity` animation for a smooth appearance. The input structure is identical to `CashPaymentModal`. Display live change calculation for the cash leg only (`cashReceived` minus `cashAmount`). Apply the same conditional success/danger styling.

### Step 8: Terminal Reference Input

Below the cash received section, render the "Card Approval Code" input. Functionally identical to `CardPaymentModal` — optional, free-form, max 20 characters, same tooltip explanation.

### Step 9: Submit Button Validation Logic

Evaluate four conditions in order:
1. `cardAmount` is not null and greater than zero.
2. Computed `cashAmount` is greater than zero (i.e. `cardAmount` is less than `totalAmount`).
3. Sum of `cardAmount` and `cashAmount` equals `totalAmount` via Decimal's `.equals` method.
4. `cashReceived` is not null and greater than or equal to `cashAmount` via Decimal's `.greaterThanOrEqualTo`.

Capture the first failing condition's message in `validationMessage`. Render this message above the submit button in `danger` red. The submit button label is "Complete Split Payment — Rs. [total formatted]". Apply `navy` background and `surface` text. Disable when any condition fails or `isSubmitting` is true.

### Step 10: API Submission

On submit, spread `salePayload` and add: `payment_method: "SPLIT"`, `card_amount` (JavaScript number from `cardAmount`), `card_reference_number` (current string value), and `cash_received` (JavaScript number from `cashReceived`). Call `POST /api/pos/sales/`. On success, call `onSaleComplete`. On error, show an error toast and reset `isSubmitting`. Reset all state variables on dialog close.

## Expected Output

- `frontend/components/pos/SplitPaymentModal.tsx` created with all four validation conditions and correct API payload.

## Validation

- Enter a card amount greater than the total — confirm inline danger error and disabled submit.
- Enter a valid card amount — confirm the cash amount auto-computes and the allocation summary turns green.
- Enter a cash received amount below the cash portion — confirm the submit is disabled and validation message appears.
- Enter sufficient cash — confirm change shows in success green.
- Submit — confirm `POST /api/pos/sales/` receives `payment_method: "SPLIT"`, `card_amount`, `cash_received`, and `card_reference_number`.

## Notes

- All Decimal comparisons use Decimal methods — never the `===` operator on Decimal instances, as that checks reference equality.
- The split payment supports exactly two legs: one card and one cash. Three-way splits are not supported in Phase 03.
- Reset all state variables on close — consistent with the other payment modals.
