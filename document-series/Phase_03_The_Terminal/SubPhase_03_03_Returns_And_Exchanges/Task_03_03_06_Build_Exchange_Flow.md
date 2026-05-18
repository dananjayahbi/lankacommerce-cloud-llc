# Task 03.03.06 — Build Exchange Flow

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.06 |
| Name | Build Exchange Flow |
| SubPhase | 03.03 |
| Complexity | HIGH |
| Dependencies | Task 03.03.05 + Task 03.03.07 |
| Produces | modifications to `frontend/stores/cartStore.ts`, `frontend/components/pos/CartPanel.tsx`, and all three payment modals |

---

## Objective

Implement the exchange workflow where a completed Return with `refund_method: EXCHANGE` pre-populates the POS terminal with an exchange credit that offsets the total of the new cart. The exchange is not a separate model — it is a Return record linked to a new Sale via `Sale.linked_return_id`.

---

## Instructions

### Step 1: Extend the Zustand Cart Store

In `frontend/stores/cartStore.ts`, add these fields to the cart state: `linked_return_id: string | null`, `exchange_credit: Decimal | null` (from `decimal.js`), `exchange_return_ref: string | null` (a short display reference like "RET-00042"). Add corresponding actions:

- `setExchangeCredit(return_id, credit, ref)` — sets all three fields together
- `clearExchangeCredit()` — resets all three to null

Persist these fields to IndexedDB via the same `usePersistCartEffect` hook already managing cart state, so an exchange cart survives a browser refresh.

### Step 2: Trigger Exchange Mode After Return Submission

In `ReturnWizardSheet`'s submission handler, after a successful `POST /api/pos/returns/` response with `refund_method: EXCHANGE`:

1. Extract `return_id`, `refund_amount`, and the return reference from the response.
2. Call `useCartStore.getState().clearCart()` to discard any existing items.
3. Call `useCartStore.getState().setExchangeCredit(return_id, refund_amount, return_ref)`.
4. Close `ReturnWizardSheet`.
5. Navigate to the POS terminal main route using `router.push(posTerminalRoute)`.

For all other refund methods, open `ReturnReceiptDialog` instead.

### Step 3: Render the Exchange Mode Banner in CartPanel

In `frontend/components/pos/CartPanel.tsx`, read `linked_return_id` and `exchange_credit` from the cart store. When `linked_return_id` is set, render a banner at the top of the cart panel (above line items) with `success` green (`#22C55E`) translucent background and `navy` border (`#1B2B3A`). Banner text: "Exchange Mode — Return [exchange_return_ref]" on the first line, "Applied Credit: Rs. [exchange_credit]" on the second line in JetBrains Mono. Add an "×" dismiss button that triggers a ShadCN `AlertDialog`: "Cancel the exchange? The return has already been processed. The exchange credit cannot be automatically reversed." with "Keep Exchange" (closes dialog) and "Discard Credit" (calls `clearExchangeCredit()` — does NOT reverse the Return).

### Step 4: Apply Exchange Credit in Payment Totals

Wherever the cart total is computed and displayed, update the formula: `net_payable_amount = max(0, cart_total - exchange_credit)`. Display a three-row total in the cart footer: "Cart Total" in `text-muted` style (`#64748B`) (struck through if exchange credit covers it fully), "Exchange Credit" in `success` green (`#22C55E`) with a leading "–", and "Amount Due" in `navy` (`#1B2B3A`) bold. Render the Exchange Credit row only when exchange mode is active.

### Step 5: Update Payment Modals for Exchange Credit

In `CashPaymentModal`, `CardPaymentModal`, and `SplitPaymentModal`, accept `exchange_credit: Decimal | null` and `net_payable_amount: Decimal` as props or read from cart store. Display `net_payable_amount` (not `cart_total`) as the amount the customer owes.

Zero-net case: when `net_payable_amount <= 0`, the payment modals never open. Instead, the CartPanel charge button becomes "Complete Exchange (No Payment Due)". Clicking it calls `POST /api/pos/sales/` directly with `payment_method: "EXCHANGE"` and `linked_return_id`. No payment records are created.

When `net_payable_amount > 0` and exchange credit applies, each payment modal shows a three-line summary: "Sale Total: Rs. [cart_total]", "Exchange Credit Applied: – Rs. [exchange_credit]", "Amount to Collect: Rs. [net_payable_amount]" in bold.

### Step 6: Persist Exchange Context on Sale Completion

When `POST /api/pos/sales/` is called for an exchange cart, include `linked_return_id` in the request body. The sale DRF view must accept this optional field and persist it to `Sale.linked_return_id`. After the sale completes, call `clearExchangeCredit()` in the cart store.

---

## Expected Output

- Exchange credit fields in the Zustand cart store, persisted to IndexedDB
- Exchange banner in CartPanel when `linked_return_id` is set
- Payment modals deduct exchange credit from displayed total
- Zero-net exchanges complete without opening a payment modal
- Completed exchange sale has `linked_return_id` populated in the database

---

## Validation

- Exchange credit of Rs. 1,500 on a cart totalling Rs. 1,200 results in "No Payment Due" path
- Exchange credit of Rs. 800 on a cart totalling Rs. 1,500 shows Rs. 700 as amount due
- Refreshing the browser while in exchange mode restores the banner (IndexedDB persistence)
- "Discard Credit" does NOT reverse the Return record

---

## Notes

In Phase 04, excess exchange credit (when return value exceeds new cart total) will be automatically converted to a `StoreCredit` record. In Phase 03, discarded excess should be visible in the Z-Report for the shift as "Exchange Credit Discarded: Rs. [amount]" so managers are aware.
