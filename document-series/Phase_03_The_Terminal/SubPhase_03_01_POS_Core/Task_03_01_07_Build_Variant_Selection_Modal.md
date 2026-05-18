# Task 03.01.07 — Build Variant Selection Modal

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.07 |
| Task Name | Build Variant Selection Modal |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_06 |
| Output Files | `frontend/components/pos/VariantSelectionModal.tsx` |

---

## Objective

Build the `VariantSelectionModal` that presents a size-colour matrix (or a flat chip row for single-axis products) when a cashier clicks a multi-variant product tile, allowing selection of a specific variant and a quantity before adding the line to the cart. The modal is designed for speed: it opens instantly from cached data and supports a single-click confirmation flow for experienced cashiers.

---

## Step 1 — Determine When the Modal Opens and Obtain Its Data

`VariantSelectionModal` is triggered by `ProductGrid` when the cashier clicks a product card that has more than one active (non-deleted, non-archived) variant. Single-variant products always bypass the modal — they are added to the cart directly via the `onAddDirectly` callback.

The modal receives a `productId` as a prop and derives all of its display data from the TanStack Query cache entry with key `["pos-products", tenantId]`. It does not issue a fresh API call to the backend when it opens. Because the full product and variant data was already loaded by the initial product query, the modal can appear instantaneously — well under 100ms from click to render — with no loading state. This is critical in a high-throughput retail environment where a cashier might process dozens of transactions per hour and cannot wait for a spinner before selecting a variant.

---

## Step 2 — Build the Modal Structure

Create `frontend/components/pos/VariantSelectionModal.tsx` as a client component using ShadCN's `Dialog` component. Set `max-width` to the medium size, approximately 448px wide.

Suppress the standard close-on-overlay-click behaviour so that an accidental touch outside the modal during a busy counter does not discard the cashier's in-progress variant selection. A deliberate close mechanism remains: a small "×" text button in the top-right area of the dialog header. The dialog header also contains the product name in Inter 18px navy (#1B2B3A), providing immediate context about which product the cashier is selecting a variant for.

Below the product name, if the product has an `image_url`, render a 64×64px thumbnail using Next.js Image with `object-cover` and rounded corners. This small thumbnail helps cashiers visually confirm they have the correct product when multiple similar products are displayed on the grid.

Directly below the header separator, display the retail price prominently. Use JetBrains Mono font at 20px in orange (#F97316). When the cashier hovers over or taps a variant cell, this price updates to show the hovered variant's `retail_price` — useful for products where different sizes or colours are priced differently.

At the top-right of the modal body, positioned above the variant matrix, place a quantity stepper control. The stepper contains a minus button, a numerical display defaulting to 1, and a plus button. The minimum value is 1. The maximum value is 99. The stepper should prevent decrement below 1 by disabling the minus button when the value is already at 1.

---

## Step 3 — Build the Size-Colour Matrix

Analyse the product's active variants to build the matrix layout. Determine the unique values along each variant dimension (for example, sizes: S, M, L, XL and colours: White, Navy, Black). The axis with fewer distinct values should be placed as the column axis so the resulting matrix tends to be wider than it is tall. This fits better in a modal on a landscape retail display.

Render the matrix as a CSS grid with a column count equal to the number of unique values on the column axis. Render column header labels (the column axis values, for example colour names) above the grid in small Inter 11px text-muted (#64748B) text. Render row header labels (the row axis values, for example size names) to the left of each row in text-muted Inter 11px text.

Each variant cell in the matrix is a button approximately 72px wide and 56px tall. Style each cell according to its stock status: a variant with stock greater than 10 uses a surface (#FFFFFF) background and a border (#E2E8F0) border, transitioning to a background (#F1F5F9) fill with a navy (#1B2B3A) border on hover. A variant with stock between 1 and 10 inclusive shows its surface background plus a small warning amber (#F59E0B) dot in the top-right corner of the cell, with the stock count displayed as a small number beside the dot (for example "3" in amber text at 10px). A variant with stock equal to zero uses a grey fill at reduced opacity, applies a diagonal line SVG overlay (simulating the visual convention for unavailable options), and is rendered as a `disabled` button so keyboard navigation skips it.

The selected cell state uses navy (#1B2B3A) as the background fill, white text, and a 2px solid orange (#F97316) border to make the selection highly visible. Only one cell can be selected at a time.

When the cashier hovers over a cell (and a selected cell already exists), do not deselect the current cell — update only the SKU display and price preview. When the cashier clicks a cell, replace the selected cell with the clicked one.

---

## Step 4 — Handle Single-Axis Products

Some products have only one dimension of variation — for example, a product that comes only in different sizes (no colour variation), or a product that comes in different colours (no size variation). In these cases, the two-dimensional matrix is unnecessary and should be replaced by a flat horizontal chip row.

Detect single-axis products by checking whether all variants share identical values on one of the two variant axes, or by checking whether only a single variant attribute exists on any of the variants. When single-axis mode is detected, render a horizontal row of pill-shaped chip buttons instead of the grid matrix. Each chip displays the variant's single distinguishing attribute (size name or colour name). The chip width adjusts to its content with a minimum width of approximately 56px and horizontal padding of 12px.

Out-of-stock chips use the same grey and reduced-opacity treatment as zero-stock cells in the matrix. Chips for variants with low stock (1–10) show a small amber dot indicator to the right of the attribute label. The selected chip uses a navy fill and white text.

---

## Step 5 — Implement Add to Cart Logic

When the cashier selects a variant cell or chip, the selected state is tracked in the component's local state. The "Add [quantity] to Cart" button at the bottom of the modal is enabled only when a variant is selected and that variant has stock greater than zero (or the tenant's `allow_negative_stock` is true). The button is full-width, navy fill, and white Inter 15px text. The quantity shown in the button label updates dynamically as the cashier uses the quantity stepper (for example: "Add 3 to Cart").

On click, the button calls `addItem` from `useCartStore`. The `addItem` call requires: `variantId`, `productNameSnapshot` (from the product name), `variantDescriptionSnapshot` (assembled from the selected variant's attribute values, using the same assembly logic as the server-side snapshot generation), `sku` (the selected variant's `sku`), `unitPrice` (the selected variant's `retail_price`, as a `Decimal` via `decimal.js`), and `quantity` (from the stepper).

The `addItem` store action must check whether a cart item with the same `variantId` already exists. If it does, the action should increment that existing item's `quantity` by the chosen amount rather than creating a duplicate line item. This prevents the cart from showing the same product twice in separate rows.

After calling `addItem`, close the modal by calling the `onClose` prop callback. Display a brief success toast notification below the POS search bar: "Added [quantity]× [Product Name] [Variant Descriptor]" in success green (#22C55E) background with white text. The toast auto-dismisses after 2.5 seconds.

If the cashier clicks a cell or chip that is disabled due to zero stock, do not close the modal and do not call `addItem`. Instead, display a non-dismissing inline message within the modal body: "No stock available for this variant — it cannot be added to the cart." Style this message in danger (#EF4444) text. The cashier must select a different variant or close the modal manually.

---

## Step 6 — Show SKU and Stock Summary

Below the variant matrix or chip row, render a compact information row. On the left side, display the SKU code of the currently selected or hovered variant in JetBrains Mono 11px text-muted (#64748B). If no variant is selected yet, display "Select a variant" as placeholder text. On the right side, display the stock level text: "12 in stock" in text-muted for healthy stock, "2 left" in warning amber (#F59E0B) for low stock, or "Out of stock" in danger (#EF4444) for zero-stock variants. This display updates in real time as the cashier moves their mouse or touch across the matrix, providing immediate stock feedback without requiring any additional API calls.

---

## Expected Output

After this task, clicking a multi-variant product tile on the POS grid instantly opens `VariantSelectionModal`. The modal displays the size-colour matrix or chip row correctly based on the product's variant structure. The cashier can select a variant, set a quantity, and add the item to the cart in a single click. The modal closes after a successful add and a toast confirms the addition. Out-of-stock variants are clearly disabled and cannot be added.

---

## Notes

The cache-first approach for variant data is critical to the modal's perceived performance. Any approach that issues a fresh API call when the modal opens would introduce a spinner and a 100–500ms delay for every product click — unacceptable at a retail counter where cashiers expect sub-100ms interactions. The TanStack Query cache populated by the initial product list load eliminates this entirely.

The `addItem` function in `useCartStore` must handle the duplicate-variant case. If this de-duplication is not implemented, a cashier who accidentally opens the variant modal for a product already in the cart and selects the same variant would create two separate cart lines for the same variant, which is confusing for the customer and the cashier during payment.
