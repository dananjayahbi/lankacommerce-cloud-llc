# Task 02.03.02 — Build Manual Stock Adjustment Form

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.02 |
| Task Name | Build Manual Stock Adjustment Form |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | Task_02_03_01 complete |
| Output Paths | `frontend/app/dashboard/[tenantSlug]/stock-control/adjust/page.tsx` |

---

## Objective

Build the manual stock adjustment form at `/dashboard/[tenantSlug]/stock-control/adjust`. This form lets authorised staff locate a product variant and apply a precise stock quantity change with a reason code and an optional explanatory note. The form provides a live preview of the projected stock level before submission, coloured semantically to warn staff when an adjustment would push a variant into low-stock or out-of-stock territory. The form posts to the Django backend's `POST /api/catalog/stock/adjust/` endpoint and handles all response states gracefully with contextual toast notifications.

---

## Step 1 — Create the Route and Permission Check

Create `frontend/app/dashboard/[tenantSlug]/stock-control/adjust/page.tsx`. This page is a client component because it manages interactive form state. Retrieve the authenticated user's JWT via the `useAuth()` hook and verify the user holds the `stock:adjust` permission. If the permission is absent, render the standard inline permission-denied card rather than redirecting.

Render a breadcrumb trail at the top of the page: Dashboard → Stock Control → Adjust Stock.

---

## Step 2 — Render the Page Header

Render an H1 heading in Inter: "Manual Stock Adjustment". Below it, render a subtitle paragraph in Inter muted text (#64748B): "Search for a product variant and record a precise stock change with a reason." The header is consistent with other form pages in the dashboard and signals clearly to the user what action they are about to perform.

---

## Step 3 — Build the Product Search Combobox

The first interactive element in the form is a searchable combobox labelled "Search Product" using a ShadCN `Combobox` or equivalent. As the user types, the component must wait until at least two characters have been entered before initiating a search request — this prevents unnecessary API calls on single-character input. After the two-character threshold is met, use a TanStack Query hook with a 300 millisecond debounce to fetch `GET /api/catalog/products/?search={query}&include_variants=true` from the Django backend.

Display the matching products as selectable options in a dropdown list. Each option shows the product name in Inter medium as the primary label, with the category name rendered below it in smaller muted Inter text. If no products match, display a "No products found" message within the dropdown. If the search request is in flight, display a loading spinner within the combobox input.

When the user selects a product from the dropdown, store the selected product and its variants in component state and advance the focus to the variant selector described in Step 4.

---

## Step 4 — Build the Variant Selector

Once a product has been selected, display a second select input labelled "Select Variant". Populate the options from the `variants` array returned by the product search. Each option displays three pieces of information: the variant SKU in JetBrains Mono as the primary identifier, followed by the size and colour attributes in regular Inter text.

Alongside each option, render a small stock status pill showing the current `stock_quantity`. If `stock_quantity` is exactly zero, display a danger red (#EF4444) pill labelled "Out of Stock". If `stock_quantity` is greater than zero but at or below `low_stock_threshold`, display a warning amber (#F59E0B) pill showing the count. If `stock_quantity` is comfortably above the threshold, display a success green (#22C55E) pill showing the count. This colour-coded context helps staff immediately understand the urgency of any pending adjustment.

When the user selects a variant, store the `variant_id`, `stock_quantity`, and `low_stock_threshold` values in component state for use by the live preview described in Step 6.

---

## Step 5 — Build the Adjustment Type Toggle

Immediately below the variant selector, render a toggle or segmented control with two options: "Add Stock" and "Remove Stock". The default selected option is "Add Stock". The selected option determines how the `quantity_delta` is computed for the API call — positive for additions, negative for removals — and affects the live preview colour logic.

Style the active segment in navy (#1B2B3A) with white text. Style the inactive segment in the surface colour (#FFFFFF) with navy text and a border colour (#E2E8F0) border.

---

## Step 6 — Build the Quantity Field with Live Preview

Render a numeric input field labelled "Quantity". This field accepts only positive integers; reject decimal or negative input at the browser level using the appropriate input constraints.

As the user types a quantity value, immediately compute the projected post-adjustment stock level using the formula: if "Add Stock" is selected, `new_stock = current_stock + quantity`; if "Remove Stock" is selected, `new_stock = current_stock - quantity`. Update the projected stock display in real time on every keystroke.

Render the projected stock level in a preview panel directly beneath the quantity input. The panel label reads "Projected stock:" followed by the computed value and the word "units". Apply colour to the projected value based on these thresholds:

- If `new_stock` is greater than `low_stock_threshold`, display the value in success green (#22C55E) — inventory remains healthy.
- If `new_stock` is greater than zero but less than or equal to `low_stock_threshold`, display the value in warning amber (#F59E0B) — the adjustment will put the variant into low-stock territory.
- If `new_stock` is zero or negative, display the value in danger red (#EF4444) — the adjustment would result in an out-of-stock or impossible negative quantity.

If the projected stock would fall below zero, disable the "Record Adjustment" submit button immediately and display an inline validation error message directly below the quantity input: "Adjustment would result in negative stock. Please check the quantity." This prevents the user from even attempting to submit an invalid adjustment.

---

## Step 7 — Build the Reason Selector

Render a dropdown select input labelled "Reason for Adjustment". This field is required — the form must not submit without a reason selected. Display the following human-readable labels mapped to their `StockMovementReason` values:

- "Found" maps to `FOUND`
- "Damaged" maps to `DAMAGED`
- "Stolen or Lost" maps to `STOLEN`
- "Data Entry Correction" maps to `DATA_ERROR`
- "Returned to Supplier" maps to `RETURNED_TO_SUPPLIER`
- "Initial Stock Entry" maps to `INITIAL_STOCK`
- "Sale Return" maps to `SALE_RETURN`
- "Purchase Received" maps to `PURCHASE_RECEIVED`
- "Stock Take Adjustment" maps to `STOCK_TAKE_ADJUSTMENT`

The default placeholder label reads "Select a reason…" and is not a valid submission value.

---

## Step 8 — Build the Note Field

Render an optional `textarea` input labelled "Note (optional)". This field allows staff to provide additional context not captured by the reason code — for example, a supplier invoice number for a `PURCHASE_RECEIVED` adjustment or a brief description of damage for a `DAMAGED` adjustment. The maximum permitted length is 500 characters. Below the textarea, render a live character counter that updates on every keystroke, formatted as "X / 500 characters". When the count exceeds 480 characters, change the counter text to the warning amber colour (#F59E0B) to signal the approaching limit.

---

## Step 9 — Build the Submit Logic

Render a "Record Adjustment" primary button at the bottom of the form in navy (#1B2B3A) background with white text. The button is disabled in any of these conditions: no variant selected, no quantity entered, no reason selected, or the projected stock would fall below zero.

When the button is clicked, submit a POST request to `POST /api/catalog/stock/adjust/` with the following body fields: `variant_id`, `quantity_delta` (the quantity as a positive integer for additions or a negative integer for removals, matching the selected adjustment type), `reason`, and the optional `note`. Derive the `tenant_id` from the authenticated user's JWT — it is not submitted explicitly from the form, but is extracted on the backend from the JWT claim.

Handle the response as follows:

**On a successful 200 response:** Display a ShadCN toast with success green (#22C55E) styling: "Stock adjusted successfully." If the response body includes `low_stock_triggered: true`, additionally display a second toast with warning amber (#F59E0B) styling: "Low stock alert: this adjustment has triggered a low stock notification for relevant staff." After both toasts are displayed, reset the entire form to its empty initial state — clear the product search, variant selector, quantity, reason, and note fields. This makes it straightforward to record multiple sequential adjustments without navigating away.

**On a 422 error response with error code `BELOW_ZERO_STOCK`:** Display an error toast using the message returned in the response body, which will include the variant's current stock level for clarity. Keep all form values intact so the staff member can correct the quantity without reselecting the product and variant.

**On any other error response:** Display a generic error toast: "An unexpected error occurred. Please try again." Keep all form values intact.

While the submission is in flight, show a spinner on the submit button and disable all form controls to prevent double-submission.
