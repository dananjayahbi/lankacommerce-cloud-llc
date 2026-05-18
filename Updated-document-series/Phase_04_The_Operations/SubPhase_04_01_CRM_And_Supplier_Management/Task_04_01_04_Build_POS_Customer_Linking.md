# Task 04.01.04 — Build POS Customer Linking and Store Credit

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.04 |
| Complexity | High |
| Dependencies | 04.01.02 + SubPhase_03_01 (CartPanel and Zustand cart store) |
| Produces | Modified `frontend/stores/cartStore.ts`, new `frontend/components/customers/CustomerSearchDropdown.tsx`, modified `frontend/components/pos/CartPanel.tsx`, modified `backend/apps/pos/views/sale_views.py` |

---

## Objective

Extend the POS terminal checkout flow to support linking a customer to an active cart, displaying the customer's store credit balance, and providing a toggle to apply that credit as a payment offset. The sale completion API is updated to persist `customer_id`, call `redeem_credit`, and call `add_to_spend_total` within the existing `transaction.atomic()` block.

---

## Instructions

### Step 1: Extend the Zustand Cart Store

In `frontend/stores/cartStore.ts`, add four new fields to the cart state interface:

- `linked_customer_id: string | null` — UUID of the linked customer, or `null`
- `linked_customer_name: string | null` — display name for rendering in the cart header
- `linked_customer_credit_balance: string | null` — Decimal-serialised string (e.g. `"1500.00"`) captured at link time; stored as a string to preserve precision via `decimal.js`
- `applied_store_credit: string` — Decimal-serialised string, default `"0"`

Add three new actions to the store:

- `linkCustomer(id: string, name: string, creditBalance: string): void` — sets all four fields; sets `applied_store_credit` to `"0"` (credit is not auto-applied on link)
- `unlinkCustomer(): void` — resets all four fields to their defaults (`null`, `null`, `null`, `"0"`)
- `setAppliedStoreCredit(amount: string): void` — updates `applied_store_credit`

Update the cart `reset` action to explicitly clear all four fields back to their defaults. This prevents customer state from leaking into the next transaction after a sale completes or is voided.

### Step 2: Build CustomerSearchDropdown

Create `frontend/components/customers/CustomerSearchDropdown.tsx` as a Client Component.

Props:

- `onSelect: (customer: { id: string; name: string; credit_balance: string }) => void`
- `onClear: () => void`

Local state: `searchValue: string` (controlled input), `isOpen: boolean`.

Debounce `searchValue` with a 300 ms delay. When debounced value has at least 2 characters, activate TanStack Query `useQuery` with key `['customer-search', debouncedSearch]` fetching `GET /api/crm/customers/?search=[debouncedSearch]&limit=5`. Set `enabled: debouncedSearch.length >= 2`.

Render: an `Input` with placeholder "Search customer by name or phone..." and a magnifying glass icon on the left. When the query is loading, show a `Loader2` spinner inside the input on the right side. When results are available, render a dropdown list below the input (absolutely positioned, `z-50`, `border`, `rounded-md`, `bg-white`, `shadow-md`). Each result row shows the customer's name in Inter and phone in muted text below. Clicking a result calls `onSelect` with `{ id, name, credit_balance }` and sets `isOpen` to false. Pressing Escape closes the dropdown.

If the debounced query returns an empty array, show a single disabled row: "No customers found." Clicking outside the dropdown closes it (use a `useEffect` with a `mousedown` listener or a ShadCN `Popover` wrapper).

### Step 3: Add Customer Linking Section to CartPanel

In `frontend/components/pos/CartPanel.tsx`, add a "Customer" section near the top of the cart panel, above the line items list. Read the four new fields from the Zustand cart store via `useCartStore`.

**When no customer is linked:**

Render `CustomerSearchDropdown`. On `onSelect`, call `linkCustomer(id, name, credit_balance)` from the cart store.

**When a customer is linked:**

Hide the search dropdown. Render a customer summary row:

- Customer name in Inter `font-medium`
- Subtitle: "Store Credit: Rs. [credit_balance]" in `text-muted-foreground text-sm` — only shown when `linked_customer_credit_balance > "0"`
- × icon button (`X` from `lucide-react`) on the far right — clicking calls `unlinkCustomer()`

Wrap the section in a subtle `border-b pb-3 mb-3` divider to visually separate it from line items.

### Step 4: Add the Store Credit Toggle

Immediately below the customer summary row (only rendered when a customer is linked and `linked_customer_credit_balance > "0"`), render a store credit row:

- ShadCN `Switch` component with label "Use Store Credit" in Inter `text-sm font-medium`
- Sub-label below: "Rs. [linked_customer_credit_balance] available" in `text-muted-foreground text-xs`

On toggle on (`checked = true`):

Compute `cartTotal` from the Zustand store (sum of all line item totals, before any discounts applied at the cart level). Compute `creditToApply = Decimal.min(new Decimal(linked_customer_credit_balance), new Decimal(cartTotal)).toFixed(2)`. Call `setAppliedStoreCredit(creditToApply)`.

On toggle off (`checked = false`):

Call `setAppliedStoreCredit("0")`.

In the cart totals section (subtotal, discount, total area), when `applied_store_credit > "0"`, insert a "Store Credit Applied" row between the discount row and the Amount Due row. Render the credit amount in `#22C55E` green with a minus prefix (e.g. "− Rs. 1,500.00") in JetBrains Mono. Update the "Amount Due" row to `cartTotal - applied_store_credit`. If the credit amount equals or exceeds the cart total, Amount Due renders "Rs. 0.00" — the sale can still be completed with zero cash collected.

### Step 5: Update the Sale Submission Payload

In the sale submission function (inside `CartPanel.tsx` or the sale form component responsible for triggering checkout), add two new fields to the POST body sent to `/api/pos/sales/`:

- `customer_id: linked_customer_id ?? null`
- `applied_store_credit: applied_store_credit` (the string from the store; the backend serializer accepts a decimal string)

### Step 6: Update the Sale DRF View

In `backend/apps/pos/views/sale_views.py`, update the `CreateSaleSerializer` to accept two new optional fields:

- `customer_id` — `UUIDField(allow_null=True, required=False, default=None)`
- `applied_store_credit` — `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), required=False)`

Inside the `with transaction.atomic():` block, after recording the `Sale` and all payment records, add the following logic:

**Pre-flight (outside the atomic block):**

Before entering `transaction.atomic()`, call `apply_credit_to_cart(tenant_id, customer_id, applied_store_credit)` from `backend.apps.crm.services.customer_service`. Use the returned `valid_amount` as the actual redemption amount — this prevents a race condition where the customer's balance was reduced by a concurrent sale between the time the cart was built and the time the sale commits.

**Inside `transaction.atomic()`:**

1. Persist `customer_id` and `applied_store_credit` (using `valid_amount`, not the raw input) on the `Sale` record.
2. If `customer_id` is set and `valid_amount > Decimal('0.00')`, call `redeem_credit(tenant_id, customer_id, valid_amount)`.
3. If `customer_id` is set (regardless of credit redemption), call `add_to_spend_total(tenant_id, customer_id, sale_total)` where `sale_total` is the gross sale total before the credit offset — this preserves the semantic of `total_spend` as cumulative value transacted.

---

## Expected Output

- `frontend/stores/cartStore.ts` — extended with four customer fields and three actions; `reset` clears them.
- `frontend/components/customers/CustomerSearchDropdown.tsx` — debounced search, dropdown results, `onSelect` callback.
- `frontend/components/pos/CartPanel.tsx` — customer linking section, credit balance display, store credit toggle, Amount Due updated.
- `backend/apps/pos/views/sale_views.py` — `CreateSaleSerializer` updated; sale creation pipeline calls `apply_credit_to_cart`, `redeem_credit`, and `add_to_spend_total`.

---

## Validation

- Linking a customer shows their name and (if positive) credit balance in the cart header.
- A customer with `credit_balance = "0.00"` or negative does not show the store credit toggle.
- Toggling "Use Store Credit" on for a customer with `credit_balance = "1500.00"` and a cart total of Rs. 1,200 sets `applied_store_credit = "1200.00"` (not 1500.00 — capped at cart total).
- Completing a sale with credit applied: `Sale.customer_id` is set, `Customer.credit_balance` is decremented by the correct `valid_amount`, and `Customer.total_spend` is incremented by the gross sale total — all within one atomic transaction.
- `total_spend` is incremented by the gross total, not the after-credit amount.
- Completing or voiding a sale and starting a new cart: all four customer fields in the Zustand store reset to defaults.

---

## Notes

- The cart `reset` action is typically called after a successful sale POST or after a void. Ensure the reset is invoked in both code paths to prevent stale customer state.
- Decimal values from the Zustand store are strings (`"1500.00"`). Always wrap in `new Decimal(value)` before comparisons or arithmetic — never use `parseFloat` which introduces floating-point errors for monetary values.
- The `apply_credit_to_cart` pre-flight call outside `transaction.atomic()` intentionally avoids locking the customer row for a long period. The `redeem_credit` inside the atomic block performs the actual `F()` decrement against the live database value, making the system safe against concurrent sales for the same customer.
