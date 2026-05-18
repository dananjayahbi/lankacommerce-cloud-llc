# Task 03.01.10 — Build Hold And Retrieve Sales

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.10 |
| Task Name | Build Hold And Retrieve Sales |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_08 |
| Output Files | `frontend/components/pos/HoldSaleButton.tsx`, `frontend/components/pos/RetrieveHeldSalesSheet.tsx` |

---

## Objective

Implement the hold-and-retrieve workflow allowing a cashier to pause a transaction in progress, persist the cart state to the database as an `OPEN` sale, clear the terminal for a new transaction, and later restore any held sale back into the active cart. This workflow enables a single cashier to serve multiple customers simultaneously — a common scenario in boutique retail where one customer steps away to try on a garment while another customer arrives.

---

## Step 1 — Understand the Hold Sale Data Model

A held sale is a `Sale` record in `status=OPEN` with a null `payment_method`. All `SaleLine` records are written to the database at the moment of hold, capturing all snapshot fields and financial values exactly as they were when the cashier clicked "Hold Sale." No `adjust_stock` call is made during the hold operation — inventory levels are completely unchanged. No `StockMovement` records are created. The held sale represents a reservation of intent, not a completed transaction with inventory impact.

The short reference identifier shown to cashiers — referred to in the UI as the "SHORT_ID" — is constructed by taking the first 6 characters of the sale's UUID `id` and converting them to uppercase. For example, a sale with `id = "a3f8c1d2-..."` produces a SHORT_ID of `"A3F8C1"`. This 6-character identifier is easy to communicate verbally between a cashier and a customer ("Your transaction reference is A3F8C1 — I'll retrieve it when you're ready.") and is sufficient to identify a held sale within the context of a single shift.

---

## Step 2 — Build the HoldSaleButton Component

Create `frontend/components/pos/HoldSaleButton.tsx` as a client component. This component is rendered within `CartPanel` as the "Hold Sale" button in the action buttons section.

The button is disabled and at 40% opacity whenever the cart's `items` array is empty. There is nothing to hold when the cart is empty.

When clicked, first check whether `authorizingManagerId` is set in the cart store (indicating that a manager authorised a discount during the current transaction). If it is set, briefly show a confirmation notice (an inline message or a brief toast) reminding the cashier: "This sale includes a manager-authorised discount. The manager must re-authorise the discount when this sale is retrieved and completed." This is important to communicate: the manager's PIN authorisation is not persisted to the held `Sale` record in a way that automatically bypasses the threshold check on retrieval. When the cashier retrieves the held sale, the `authorizingManagerId` from the `SaleLine` discount data is restored into the cart, but if the cashier then modifies any line or attempts to complete the sale, the system will require re-verification of the discount. This is a deliberate security boundary.

After any confirmation message, set the button to a loading state (showing a spinner, disabling click) and POST to `POST /api/pos/sales/hold/`. The request body must include all necessary fields: `tenant_id` (from context), `shift_id` (from the current open shift, passed via context or prop), `cashier_id` (from `useAuth()`), the `items` array (each item with `variant_id`, `quantity`, `discount_percent`, `product_name_snapshot`, `variant_description_snapshot`, `sku`, and `unit_price`), and either `cart_discount_amount` or `cart_discount_percent` depending on which mode is active.

On a successful response from the server: call `clearCart()` in `useCartStore` to empty the terminal; show a persistent success toast notification for 8 seconds: "Sale held — Reference [SHORT_ID]. Tap Retrieve to continue it." Format the SHORT_ID from the first 6 characters of the returned `sale.id`, uppercased; invalidate the TanStack Query for held sales to update the badge count on the Retrieve button in the cart panel header (using `queryClient.invalidateQueries`).

On a failure response: show a danger toast with the server's error message. Do not call `clearCart()`. The cart state is preserved so the cashier can try again or proceed differently.

---

## Step 3 — Build the RetrieveHeldSalesSheet Component

Create `frontend/components/pos/RetrieveHeldSalesSheet.tsx` as a client component using ShadCN Sheet. The Sheet slides in from the right side of the screen, overlapping the cart panel partially. The trigger for this sheet is the "Retrieve" icon button in the cart panel header.

When the sheet opens, immediately fetch the current shift's held (OPEN) sales using TanStack Query with key `["held-sales", shiftId]` targeting `GET /api/pos/sales/?shift_id={currentShiftId}&status=OPEN&tenant_id={tenantId}`. While the query is loading, render a skeleton list of 3 placeholder cards inside the sheet to communicate that data is loading.

Render the held sales entries as a vertical list ordered by `created_at` descending. Each entry is a card with the following layout: the SHORT_ID (first 6 characters of UUID, uppercased, in JetBrains Mono navy) on the left side; the relative time indicator (for example "3 min ago", "1h ago") on the right side in text-muted Inter 12px; a summary line below showing the count of line items and the cart total, for example "4 items · Rs. 4,850.00" where the amount is computed as the sum of `line_total_after_discount` values across the sale's lines. Apply a hover state of background (#F1F5F9) fill on each card to indicate interactivity.

When the cashier clicks a held sale entry card to retrieve it, check whether the current cart (in `useCartStore`) is non-empty. If the cart is non-empty, show a ShadCN AlertDialog before proceeding. The AlertDialog title should be "Replace Current Cart?" and the description should read: "You have items in your current cart. Retrieving this sale will replace your current cart. Your current items will not be lost — they will be automatically held as a new sale." Include two buttons: "Cancel" (which closes the AlertDialog and leaves everything unchanged) and "Hold & Retrieve" (which proceeds). On confirming "Hold & Retrieve", silently POST to `POST /api/pos/sales/hold/` with the current cart state to create a hold record for the in-progress cart. If the hold succeeds, proceed to load the selected held sale. If the hold fails, show a danger toast and abort the retrieval without altering the cart.

If the current cart is empty, proceed directly to loading the held sale without any confirmation prompt.

Loading the held sale into the cart: call `GET /api/pos/sales/{id}/` to retrieve the full held sale record with all line data (or use the already-fetched data from the list if it includes all necessary fields). Reconstruct `CartItem` objects from the `SaleLine` records: `variantId` from `line.variant.id`, `productNameSnapshot` from `line.product_name_snapshot`, `variantDescriptionSnapshot` from `line.variant_description_snapshot`, `sku` from `line.sku`, `unitPrice` as a `new Decimal(line.unit_price)`, `quantity` from `line.quantity`, and `discountPercent` as a `new Decimal(line.discount_percent)`. Also restore cart-level discount values: if `sale.discount_amount` is greater than zero, call `setCartDiscount('fixed', saleDiscountAmount)`. If there was a `cart_discount_percent` stored (if the hold request stored the percentage), restore that instead. Call `replaceCart(items, cartDiscountAmount, cartDiscountPercent, authorizingManagerId)` on the cart store.

Store the retrieved sale's `id` in component-level state or a React Context available to the payment flow. When the cashier proceeds to payment (in SubPhase 03.02), the payment modal will use this held sale `id` to `PATCH` the existing `OPEN` Sale record to `COMPLETED` status rather than creating a brand-new `Sale` record. This is critical to maintaining accurate `SHORT_ID` references and avoiding orphaned records.

Close the sheet and display a success toast: "Sale [SHORT_ID] restored to cart" with success green (#22C55E) styling.

---

## Step 4 — Handle Held Sales at Shift Close

Verify that the `close_shift` function in `backend/apps/pos/services/shift_service.py` correctly handles lingering held sales as part of the shift close sequence. This was described in Task 03.01.04 Step 3, but confirm the implementation is complete before marking this task done.

The `close_shift` function must query `Sale.objects.filter(shift_id=shift_id, status=SaleStatus.OPEN)` and for each result, update the sale's status to `VOIDED` with `voided_at=timezone.now()`. This is not a stock-adjusting void — held sales never affected inventory — but it is a status change that marks the sale as permanently abandoned. An audit log entry with `action="NO_SALE_SHIFT_CLOSED"` should be created for each such voided held sale.

Also verify that `ShiftCloseModal` (from Task 03.01.05) fetches and displays the held-sale warning before the cashier enters their closing cash count. The warning banner with "You have [N] held sale(s) that will be cancelled when you close this shift" must be implemented and tested. Confirm that the count displayed in the `ShiftCloseModal` banner matches the count that would actually be voided by `close_shift`.

---

## Expected Output

After this task, the cashier can hold a sale from the active cart, which persists to the database as an `OPEN` sale and clears the terminal for a new transaction. The Retrieve button in the cart panel header shows a badge count of held sales for the current shift. Opening the Retrieve sheet shows a list of all held sales with SHORT_IDs, item counts, and totals. Selecting a held sale restores it to the cart. If the current cart is non-empty, the "silent auto-hold" AlertDialog flow ensures no in-progress work is discarded.

---

## Notes

The "silent auto-hold" when retrieving a held sale while the cart is non-empty is a deliberate design choice for high-traffic counters. Without it, a cashier would need to manually hold the current cart before retrieving a different held sale — two explicit actions instead of one. The AlertDialog makes the auto-hold behaviour transparent without requiring extra steps.

The snapshot fields on `SaleLine` ensure that even if a product is renamed or repriced between the time a sale is held and the time it is retrieved (which could happen during a long hold period), the retrieved cart items display exactly the product names, variant descriptions, and prices that the customer was quoted when the sale was first created. Never reconstruct the cart item display from live product data when restoring a held sale.

The SHORT_ID (6 characters of the UUID, uppercased) is intentionally short and easy to communicate verbally in a noisy retail environment. It is not guaranteed to be globally unique across all sales — only within a single shift, it is practically unique given the small number of concurrent held sales. Do not use it as a database key; always use the full UUID for API calls and database operations.
