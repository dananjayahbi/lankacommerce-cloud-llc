# Task 03.01.06 — Build Product Grid And Category Navigation

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.06 |
| Task Name | Build Product Grid And Category Navigation |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_05 |
| Output Files | `frontend/components/pos/ProductGrid.tsx`, `frontend/components/pos/ProductCard.tsx`, `frontend/components/pos/CategoryTabs.tsx` |

---

## Objective

Build the left panel of the POS terminal: a horizontally scrollable category filter strip, a debounced product search input, and an auto-filling product card grid displaying all active products with real-time stock status badges. The product data layer uses TanStack Query with a five-minute stale time, supporting both client-side filtering for typical catalog sizes and an automatic API-search fallback for tenants with very large catalogs.

---

## Step 1 — Fetch Product Data with TanStack Query

In the POS terminal page at `frontend/app/dashboard/[tenantSlug]/pos/page.tsx`, or in a dedicated data hook at `frontend/hooks/usePOSProducts.ts`, set up a TanStack Query with the query key `["pos-products", tenantId]`. This query fetches all active, non-archived products with their variants and current stock levels by calling `GET /api/catalog/products/?pos=true&tenant_id={tenantId}`. The `pos=true` query parameter signals the Django backend to return a compact representation suitable for the POS grid — including `id`, `name`, `image_url` (nullable), and the full `category` object — along with each active variant's `id`, `sku`, `size` attribute, `colour` attribute, `retail_price`, and `stock_quantity`.

Configure `staleTime` at five minutes. This means the product data will be considered fresh for five minutes after the last successful fetch. During that window, switching between category tabs or typing in the search box triggers no additional network requests — all filtering happens against the cached data in memory. This is an explicit performance trade-off: in a retail environment, catalog changes (price updates, new products) are rare during active trading hours, and the five-minute window is acceptable. When a manager does update a product, the cashier will see the change on the next refetch.

Each product object in the response must include all of its active variants. The product data serves as the single source of truth for both the `CategoryTabs` component (which derives the unique category list from this data) and the `ProductGrid` component (which renders the cards and filters them). No secondary API calls are made for category filtering or in-catalog searching.

After the initial query resolves, check the total count of active products. If the count exceeds 500, set an `isAPIsearchMode` flag in the component's state. When `isAPIsearchMode` is true, the search input's debounced handler calls `GET /api/catalog/products/?search={query}&tenant_id={tenantId}` instead of filtering the local cache. The threshold of 500 is configurable via `frontend/config/pos.config.ts`. This prevents degraded performance on tablets or older hardware where filtering a 2,000-product catalog in JavaScript on every keystroke would be noticeably slow.

---

## Step 2 — Build the CategoryTabs Component

Create `frontend/components/pos/CategoryTabs.tsx` as a fully controlled client component. It receives two props: `categories` (an array of category objects, each with `id` and `name`, derived from the loaded product data) and `selectedCategoryId` (either null for "All Products" or a specific category ID string).

Render a horizontal strip of pill-shaped tab buttons. The container must use `overflow-x: auto` with `scrollbar-width: none` (Firefox) and a pseudo-element to hide the scrollbar in WebKit browsers, enabling touch-swipe scrolling on tablets without a visible scrollbar cluttering the interface. Add `-webkit-overflow-scrolling: touch` for smooth momentum scrolling on iOS.

The first tab in the strip is always "All Products" with a null category ID value. This tab is followed by one tab per unique category, ordered alphabetically. Duplicate category names must be deduplicated — derive the category list from a `useMemo` call over the product data array.

Active tab styling (the currently selected category): border (#E2E8F0) background fill, navy (#1B2B3A) text, Inter 13px, a 2px bottom border in border colour to give a subtle underline emphasis. Inactive tab styling: transparent background, orange (#F97316) text, Inter 13px, transitioning to border background at 50% opacity on hover. Apply a 150ms ease-in-out transition on both background and colour properties so tab switching feels responsive.

Each tab button calls the `onSelectCategory` callback prop with its category ID when clicked. The component holds no internal selection state — it is fully controlled by the parent `ProductGrid` component.

---

## Step 3 — Build the POS Search Input

Within the `ProductGrid` component, render a search input bar above the `CategoryTabs` strip. The input has a magnifying-glass SVG icon on the left side, rendered in text-muted (#64748B), and a circular "×" clear button on the right side that appears only when the input contains at least one character. The "×" button's click handler clears the input value and resets focus back to the input.

Style the input with a border (#E2E8F0) border that transitions to orange (#F97316) outline on focus, navy (#1B2B3A) text colour, a surface (#FFFFFF) background, and Inter 14px font. The placeholder text reads "Search products or scan barcode…" in text-muted colour. The input should have a width of 100% within its container, with the icon and clear button positioned absolutely or using a flex wrapper.

Debounce search input changes at 200ms using a `useEffect` + `useRef` or the `use-debounce` utility package. This prevents the filtering logic from running on every single keystroke, which is important for the API search mode where each debounced value triggers a network request.

When a non-empty search term is entered, clear the active category selection by calling the category setter with null — product search across all categories is almost always the user intent when typing.

---

## Step 4 — Build the ProductCard Component

Create `frontend/components/pos/ProductCard.tsx` as a client component. Each card is approximately 140 pixels wide and 165 pixels tall.

The upper 60% of the card (approximately 99px) is the image area. If the product has a non-null `image_url`, render it using Next.js's `<Image>` component with `object-cover` fill so it always fills the image area without distortion. If `image_url` is null, render a placeholder: a light background (#F1F5F9) fill with a clothing-hanger SVG icon centred in orange (#F97316) at 32px. The placeholder communicates "product image not yet uploaded" without displaying a broken image symbol.

The lower 40% is the information area. It contains three elements stacked vertically with tight spacing: the product name in Inter 13px navy with `overflow: hidden`, `text-overflow: ellipsis`, and `WebkitLineClamp: 2` to prevent overflow for long names while allowing two-line names to display fully; the price of the cheapest active variant (or the single variant's price) formatted as "Rs. X,XXX.00" in JetBrains Mono 13px orange (#F97316) — use JetBrains Mono here because monospace rendering allows cashiers to scan and compare prices across the grid at a glance; and a stock status badge.

The stock badge logic derives from the sum of `stock_quantity` across all of the product's active variants. If total stock equals zero, show a small "Out of Stock" badge in danger (#EF4444) with a filled red dot indicator on the left. If total stock is between 1 and 5 inclusive, show a "Low" badge in warning amber (#F59E0B) with a filled amber dot. If total stock is greater than 5, no badge is shown — the product is considered well-stocked and displaying a badge would add visual noise without value.

For a product with total stock of zero, apply 60% opacity to the entire card, add a semi-transparent surface (#FFFFFF at 60% opacity) overlay over the image area, and centre the text "Out of Stock" in Inter 12px orange on the overlay.

Card click handling has three paths. If the product's total stock is zero, intercept the click and show a ShadCN toast notification "This product is out of stock — please remove it from the display or restock it." Do not open the variant modal and do not add anything to the cart. If the product has exactly one active variant with stock greater than zero, call the `onAddDirectly` callback prop directly, bypassing the variant selection modal entirely. If the product has two or more active variants, call the `onOpenVariantModal` callback prop with the product's `id`, which causes `ProductGrid` to set `activeProductId` state and render `VariantSelectionModal`.

---

## Step 5 — Build the ProductGrid Component

Create `frontend/components/pos/ProductGrid.tsx` as the parent client component that owns `selectedCategoryId` and `searchQuery` state and orchestrates the product display.

Derive the filtered product list using a `useMemo` hook that depends on the TanStack Query data, `selectedCategoryId`, and `searchQuery`. When a category is selected and a search term is empty, filter to products whose `category.id` matches `selectedCategoryId`. When a search term is non-empty (and the API search mode flag is false), filter to products whose `name` (lowercased) contains the lowercased search term, or whose any active variant's `sku` contains the search term. When both a category is selected and a search term is present, apply both filters.

The grid container uses CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))` and a gap of 12px and padding of 16px. The `auto-fill` approach means the grid automatically computes how many columns fit in the available space and adds or removes columns as the panel is resized — no explicit responsive breakpoints are required.

During the initial TanStack Query loading state, render a skeleton grid of 8 placeholder tiles. Each skeleton tile is the same dimensions as a product card and shows an animated shimmer effect using a background gradient animation, with a background (#F1F5F9) base fill. This gives the cashier visual feedback that content is loading rather than an empty panel.

When the query has loaded but the filtered list is empty (no products match the current search or category filter), render a centred empty state: a grey circular illustration or simple icon in text-muted colour above the message "No products found" in Inter 14px text-muted. Include a secondary line: "Try a different search or category" in Inter 12px text-muted.

The grid passes two callbacks to each `ProductCard`: `onAddDirectly` which calls `addItem` from `useCartStore` with the single variant's data, and `onOpenVariantModal` which sets `activeProductId` in the `ProductGrid` component's local state. When `activeProductId` is non-null, render `VariantSelectionModal` with that product's data and an `onClose` handler that resets `activeProductId` to null.

---

## Expected Output

After this task, the POS left panel renders a fully functional product browsing experience. `CategoryTabs` correctly derives and displays all unique categories from the loaded product data. The search input filters the grid in real time with a 200ms debounce. `ProductCard` correctly shows images or placeholders, prices in JetBrains Mono, and appropriate stock badges. Single-variant products are added to the cart directly on click. Multi-variant products trigger `VariantSelectionModal`.

---

## Notes

The five-minute `staleTime` is appropriate for a retail POS environment. If a product is updated in the backend during a cashier's shift, the cashier will see the stale price until the cache expires or until they navigate away and return. This is acceptable for Phase 03 and can be shortened or supplemented with WebSocket push updates in a later phase.

The `auto-fill` CSS grid approach is preferable to a fixed column count because it adapts gracefully to any panel width. On a 27-inch retail display, you might see 8 columns; on a 10-inch tablet, you might see 4. The grid reflows automatically without any JavaScript-based layout calculation.

JetBrains Mono for prices is a deliberate design decision in LankaCommerce, not just a stylistic one. Monospace fonts align the decimal points and thousands separators vertically across a grid of product cards, enabling cashiers to compare prices at a glance without reading each individual number carefully. This is a documented advantage of monospace typography for numerical data in retail and financial interfaces.
