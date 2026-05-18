# Task 03.01.08 — Build Cart Panel

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.08 |
| Task Name | Build Cart Panel |
| Sub-Phase | 03.01 — POS Core |
| Complexity | High |
| Dependency | Task_03_01_05 |
| Output Files | `frontend/components/pos/CartPanel.tsx`, `frontend/components/pos/CartLineItem.tsx`, `frontend/stores/cartStore.ts` |

---

## Objective

Build the `CartPanel` component occupying the right side of the POS terminal, including its scrollable line items list, discount area, totals section, and action buttons. Build the `useCartStore` Zustand store that powers all cart state with decimal.js arithmetic, and establish the monetary computation pipeline that ensures precision throughout the cart lifecycle.

---

## Step 1 — Design and Implement useCartStore

Create `frontend/stores/cartStore.ts`. Import Zustand's `create` function and the `persist` middleware from `zustand/middleware`. Import `Decimal` from `decimal.js`.

Define the `CartItem` TypeScript type with the following fields: `variantId` (string, serves as the unique identifier for cart de-duplication), `productNameSnapshot` (string), `variantDescriptionSnapshot` (string), `sku` (string), `unitPrice` (Decimal, the retail price of one unit at the moment the item was added), `quantity` (positive integer), and `discountPercent` (Decimal, defaulting to zero).

Define the `CartState` TypeScript type with: `items` (CartItem array), `cartDiscountPercent` (Decimal, default zero), `cartDiscountAmount` (Decimal, default zero — only one of these two is active at a time: when a percentage discount is set, the fixed amount is zeroed, and vice versa), `authorizingManagerId` (string or null, the `user_id` of the manager who authorised a cart-level or above-threshold line-level discount), and `activeLineId` (string or null, the `variantId` of the line item currently selected for inline discount editing).

All computed monetary values must be pure functions derived from the `items` array at the time of reading — they must never be stored as separate state fields. Storing derived state introduces synchronisation bugs: if `items` is mutated and the derived totals field is not immediately updated, the displayed figures are wrong. Instead, export a set of selector functions.

The `subtotal` selector iterates all items and computes for each: `lineDiscount = (unitPrice × quantity × discountPercent / 100)` rounded to two decimal places using `Decimal.ROUND_HALF_UP`; `lineTotal = (unitPrice × quantity) - lineDiscount`. Accumulates all `lineTotal` values using Decimal addition.

The `cartDiscountEffective` selector checks `cartDiscountPercent`. If it is greater than zero, returns `subtotal × cartDiscountPercent / 100` rounded to two decimal places. Otherwise returns `cartDiscountAmount`.

The `taxAmount` selector applies an approximate tenant-wide tax rate loaded as a configuration constant at terminal initialisation. This value is approximate because different products in the same cart may carry different tax rules (`STANDARD_VAT`, `SSCL`, `EXEMPT`), but the frontend does not have the full per-product tax rule data in the cart items. The server-side `create_sale` computes the authoritative tax. The client-side `taxAmount` is used only for display purposes to give the cashier an estimate of the total before payment. Clearly label the tax amount as "Est." in the UI to communicate this approximation.

The `totalAmount` selector returns `subtotal - cartDiscountEffective + taxAmount`, rounded to two decimal places.

Define the following mutator actions in the store: `addItem` (checks if a `CartItem` with the same `variantId` already exists — if yes, increments `quantity`; if no, pushes a new item with `discountPercent` set to zero); `removeItem(variantId)` (removes the item from the array); `updateQuantity(variantId, quantity)` (updates the item's quantity, minimum 1, ignores calls with quantity below 1); `setLineDiscount(variantId, discountPercent)` (sets the `discountPercent` on the matching item, range 0 to 100, rounds to two decimal places); `setCartDiscount(mode, value)` where `mode` is either `"percent"` or `"fixed"` — when `"percent"`, sets `cartDiscountPercent` to the value and `cartDiscountAmount` to zero; when `"fixed"`, sets `cartDiscountAmount` to the value and `cartDiscountPercent` to zero; `setAuthorizingManager(managerId)` (sets `authorizingManagerId`); `clearCart` (resets `items` to an empty array, `cartDiscountPercent` and `cartDiscountAmount` to zero, `authorizingManagerId` to null, `activeLineId` to null); `replaceCart(items, cartDiscountAmount, cartDiscountPercent, authorizingManagerId)` (replaces the entire cart state with the values from a retrieved held sale); `setActiveLine(variantId)` (sets `activeLineId` — setting to the same value toggles it off, hiding the inline discount control).

Configure the Zustand store with the `persist` middleware using `localStorage` as the storage provider. This ensures that if the cashier's browser is accidentally refreshed or the tab is closed and reopened, the cart contents are restored. When the terminal reloads, show a toast: "Your previous cart has been restored." This safety net prevents loss of work due to accidental refresh, which is a common concern in browser-based POS terminals.

---

## Step 2 — Build the CartPanel Component Structure

Create `frontend/components/pos/CartPanel.tsx` as a client component. The component uses a flex-column layout filling 100% of the right panel's height, with `overflow: hidden` on the outermost container to prevent the panel itself from scrolling.

Apply a surface (#FFFFFF) background to the entire panel.

The panel is divided into four vertically stacked regions:

The **panel header** region is approximately 52px tall and does not scroll. It contains a "Cart" label in Inter 16px navy (#1B2B3A) on the left, a small pill badge to the right of the label showing the total count of distinct line items in the cart (orange background, white text, Inter 12px), a "Retrieve" icon button (a download or archive icon) on the right side of the header with a badge showing the count of OPEN (held) sales for the current shift if the count is greater than zero, and a "Clear Cart" text button in danger (#EF4444) Inter 13px. The "Retrieve" button opens `RetrieveHeldSalesSheet`. The "Clear Cart" button shows a 3-second undo toast ("Cart cleared — Undo") before committing to `clearCart`. If the "Undo" action on the toast is clicked within 3 seconds, the cart is not cleared and the toast dismisses.

The **middle section** is variable height and fills all remaining vertical space between the header and the totals section. It is internally scrollable using `overflow-y: auto`. It renders the `CartLineItem` component list and the `CartDiscountControl` component.

The **totals section** is fixed at the bottom and does not scroll.

The **action buttons section** is fixed at the very bottom of the panel beneath the totals.

---

## Step 3 — Build the CartLineItem Component

Create `frontend/components/pos/CartLineItem.tsx` as a client component. Each row is approximately 72px tall.

The row uses a horizontal flex layout with four main areas: a 40×40px product image thumbnail on the far left (or a placeholder icon if `image_url` is not available in the cart item — note that the `CartItem` type may not carry `image_url`, in which case always show the placeholder icon), a vertical stack of text in the centre, a quantity stepper, and a far-right remove button.

The text stack contains: the `productNameSnapshot` in Inter 14px navy on the first line; the `variantDescriptionSnapshot` in Inter 12px text-muted (#64748B) on the second line; if the line has a non-zero `discountPercent`, a small success green (#22C55E) badge between the variant description and SKU lines showing the discount as "−10%" (formatted as a negative percentage); the `sku` in JetBrains Mono 11px text-muted on the last line.

The quantity stepper contains minus and plus buttons flanking a compact numerical display. The controls are borderless with orange (#F97316) text. The minimum quantity is 1 — the minus button is disabled at quantity 1. The plus button is unrestricted in Phase 03 (stock validation happens on the server at checkout time). Clicking plus calls `updateQuantity(variantId, quantity + 1)`. Clicking minus calls `updateQuantity(variantId, quantity - 1)`.

The line total display shows the `line_total_after_discount` value — `unitPrice × quantity - discountAmount` — in JetBrains Mono 14px navy bold, right-aligned. This value recomputes automatically as the quantity changes.

The remove button (×) on the far right uses text-muted (#64748B) colour at rest, transitioning to danger (#EF4444) on hover. Clicking it calls `removeItem(variantId)` without any confirmation prompt, as removing a single item is low-stakes and easy to re-add.

Clicking anywhere on the row — excluding the stepper controls and the remove button — calls `setActiveLine(variantId)`. When `activeLineId === variantId` in the store, the `LineItemDiscountControl` panel slides open below this row. Clicking the same row again while it is active calls `setActiveLine(variantId)` again, which toggles the active state off and collapses the discount control.

---

## Step 4 — Build the Cart Middle Section

The scrollable middle section of `CartPanel` renders the list of `CartLineItem` components. A thin 1px text-muted (#64748B) divider line is rendered between each line item using a horizontal rule or a border-bottom on the items.

When the cart `items` array is empty, render the empty state: a shopping bag outline SVG icon centred horizontally in text-muted colour, approximately 48px, followed by the text "Cart is empty — add a product to start" in Inter 14px text-muted. This empty state should be vertically centred in the middle section.

Below the list of `CartLineItem` components (and below the empty state area), render `CartDiscountControl` (built in Task 03.01.09). This component is visible whenever the cart contains at least one item. When the cart is empty, `CartDiscountControl` is hidden.

---

## Step 5 — Build the Totals Section

The totals section is fixed at the bottom of the cart panel, does not scroll, and always shows the current monetary summary. Apply a subtle box-shadow at the top edge of the section (`box-shadow: 0 -4px 12px rgba(0,0,0,0.08)`) to visually separate it from the scrollable line items list above.

Render the totals as a vertical stack of label-amount rows. Each row has the label on the left in Inter 14px and the amount on the right in JetBrains Mono 14px. Rows:

"Subtotal" — always visible. Amount in navy (#0F172A).

"Discount" — visible only when the combined discount amount (sum of line discounts plus cart discount) is greater than zero. Amount prefixed with a minus sign, styled in danger (#EF4444) to indicate a reduction.

"Tax (Est.)" — always visible, with the approximate tax rate displayed in the label (for example "Tax — Est. 15%"). Amount in navy. The "Est." label is important to communicate that this is approximate, pending server-side calculation.

"Total" — the grand total row. Label in Inter 22px navy bold. Amount in JetBrains Mono 22px orange (#F97316). This row is visually larger than all other totals rows, drawing the cashier's eye to the most important figure.

All amounts are formatted using a shared currency formatter utility (for example `frontend/lib/formatCurrency.ts`) that produces the "Rs. X,XXX.XX" format with thousands separators and exactly two decimal places.

---

## Step 6 — Build the Action Buttons

Below the totals section, render two full-width action buttons stacked vertically.

"Hold Sale" button: border (#E2E8F0) border, transparent fill, navy (#1B2B3A) text, Inter 14px, approximately 40px height. Disabled and at 40% opacity when the cart is empty. Calls `HoldSaleButton` behaviour (implemented in Task 03.01.10).

"Charge / Pay" button: navy (#1B2B3A) fill, white text, Inter 16px bold, 48px height. Disabled and at 40% opacity when the cart is empty. Clicking this button opens the payment flow modal — implemented in SubPhase 03.02. In Phase 03, clicking this button shows a ShadCN toast: "Payment collection coming in SubPhase 03.02." This placeholder prevents the button from appearing completely non-functional.

---

## Expected Output

After this task, `frontend/stores/cartStore.ts` is a fully functional Zustand store persisted to localStorage, with all mutators, selectors, and decimal.js arithmetic. `CartPanel.tsx` renders the four regions correctly. `CartLineItem.tsx` displays all line fields and supports the inline discount control toggle. The totals section updates in real time as items are added, removed, or modified.

---

## Notes

All computed monetary state must be derived from the `items` array at read time — storing pre-computed totals as state fields creates synchronisation risks on rapid cart mutations. The small performance cost of recomputing `subtotal`, `taxAmount`, and `totalAmount` on every render is completely negligible for the cart sizes seen in a retail POS (maximum a few dozen items).

The estimated tax label is important. The client store's tax computation uses a simple single-rate approximation. For a cart mixing a standard-VAT garment, an SSCL-rated accessory, and an exempt item, the client-side total will differ from the server-confirmed total. Labelling it as "Est." avoids presenting a figure that may not match the receipt.

Consider configuring Zustand's `persist` middleware to serialise `Decimal` values as strings (since `decimal.js` `Decimal` objects are not natively JSON-serialisable). In the `storage` configuration's `serialize` and `deserialize` functions, convert `Decimal` fields to their string representation on write and reconstruct them as `new Decimal(storedString)` on read.
