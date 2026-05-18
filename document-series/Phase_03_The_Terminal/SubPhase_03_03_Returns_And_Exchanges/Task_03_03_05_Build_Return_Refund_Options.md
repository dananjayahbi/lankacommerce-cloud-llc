# Task 03.03.05 — Build Return Refund Options

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.05 |
| Name | Build Return Refund Options |
| SubPhase | 03.03 |
| Complexity | LOW |
| Dependencies | Task 03.03.04 |
| Produces | `frontend/components/pos/ReturnRefundOptionsStep.tsx` |

---

## Objective

Build the second step of `ReturnWizardSheet`: a refund method selection panel where the cashier chooses how the customer will receive their refund, confirms the refund total, and provides a reason for the return.

---

## Instructions

### Step 1: Create the Component

Create `frontend/components/pos/ReturnRefundOptionsStep.tsx`. Props:

- `refund_total: Decimal` — from `decimal.js`, computed by the parent
- `refund_method: string` — current selection
- `card_reversal_reference: string`
- `reason: string`
- `onChange(patch)` — callback to update parent state

### Step 2: Display the Refund Total Header

At the top, render a summary card with `background` colour (`#F1F5F9`) and `navy` border (`#1B2B3A`). Inside: a label "Refund Amount" in small uppercase `text-muted` (`#64748B`) text, and the total formatted as "Rs. X,XXX.XX" in JetBrains Mono, `navy` colour (`#1B2B3A`), approximately 2rem font size.

### Step 3: Render the Refund Method RadioGroup

Use a ShadCN `RadioGroup` with four card-style options, each showing an icon, bold label, and description:

- Cash — banknote icon, "Cash", "Return money to the customer from the cash drawer immediately."
- Card Reversal — credit card icon, "Card Reversal", "Process a manual reversal on the card terminal and record the reference number."
- Store Credit — tag icon, "Store Credit", "Issue a credit note. The customer can redeem it on a future purchase."
- Exchange Items — swap icon, "Exchange Items", "Return these items and apply the refund value toward new items immediately."

When "Card Reversal" is selected, reveal a text input labelled "Reversal Reference Number" (max 50 characters) immediately below the radio option. When "Exchange Items" is selected, hide the refund total header and show an information banner in `orange` accent (`#F97316`): "The refund value of Rs. [amount] will be applied as credit on the next cart." When "Store Credit" is selected, show an info note below the group: "A store credit record will be created. The credit can be redeemed at checkout once Phase 04 CRM is complete."

### Step 4: Render the Return Reason Field

Below the radio group, render a `Textarea` labelled "Return Reason" with placeholder "Customer changed their mind — wrong size". Maximum 200 characters with a live character count display (e.g., "48 / 200"). Field is optional — progression is not blocked if empty. Call `onChange({ reason })` on each keystroke.

---

## Expected Output

A `ReturnRefundOptionsStep` with all four refund method options, conditional card reference input, conditional exchange banner, and reason textarea.

---

## Validation

- Selecting Card Reversal reveals the reference number input
- Selecting Exchange hides the refund total header and shows the exchange credit banner
- The reason textarea enforces the 200-character limit
- Each method selection updates parent state via `onChange`

---

## Notes

This component is fully controlled — the parent holds all state. Default selection is `CASH`, set in the parent `ReturnWizardSheet`.
