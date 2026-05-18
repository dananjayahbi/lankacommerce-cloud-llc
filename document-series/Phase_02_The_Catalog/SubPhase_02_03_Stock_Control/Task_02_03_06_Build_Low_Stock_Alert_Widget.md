# Task 02.03.06 — Build Low Stock Alert Widget

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.06 |
| Task Name | Build Low Stock Alert Widget |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Low |
| Dependencies | Task_02_03_01 complete |
| Output Paths | `frontend/components/stock/LowStockAlertBadge.tsx`, `frontend/app/dashboard/[tenantSlug]/stock-control/low-stock/page.tsx` |

---

## Objective

Build the `LowStockAlertBadge` reusable component and the full low-stock list page it links to. The badge provides persistent dashboard-wide visibility into inventory health by appearing in the Stock Control landing page, the Inventory List page header, and the main dashboard navigation. The list page gives store managers a sortable, filterable view of all at-risk variants with direct links to adjust their stock levels.

---

## Step 1 — Build the LowStockAlertBadge Component

Create `frontend/components/stock/LowStockAlertBadge.tsx` as a client component. This component accepts two props: `tenantSlug` as a required string, and an optional `initialCount` as a number that allows the server component rendering this badge to pre-hydrate the count from a server-side data fetch, avoiding a loading flash on initial page load.

Internally, use a TanStack Query hook to call `GET /api/catalog/stock/low-stock/?count_only=true`. Set the stale time to 60 seconds — the low-stock count does not need to be real-time, and aggressive polling on this frequently-mounted component would create unnecessary backend load.

**When the count is zero:** The component renders nothing. Returning null keeps the layout clean when inventory is healthy.

**When the count is greater than zero:** Render a clickable banner. The banner uses the warning colour (#F59E0B) as its background with a darker amber text colour for accessibility contrast. The banner contains three elements from left to right: a warning triangle icon, the text "[N] variants low on stock" in Inter medium where N is the live count, and a right-pointing chevron icon. The entire banner is wrapped in a Next.js `Link` component pointing to `/dashboard/[tenantSlug]/stock-control/low-stock`. On hover, deepen the background to a richer amber tone using a CSS transition.

**While loading on first mount:** Render a ShadCN `Skeleton` placeholder that matches the expected banner height and width so the layout does not shift when the count loads.

---

## Step 2 — Register the Widget in Three Locations

The `LowStockAlertBadge` must be rendered in three distinct locations across the dashboard. Each location serves a different user journey:

**Stock Control landing page** (`frontend/app/dashboard/[tenantSlug]/stock-control/page.tsx`): Place the full banner between the KPI card grid and the quick actions navigation grid. This position ensures it is one of the first things a stock manager sees when they open the stock control hub. Pass the `tenantSlug` and optionally the `initialCount` pre-fetched server-side alongside the KPI data.

**Inventory List page** (`frontend/app/dashboard/[tenantSlug]/inventory/page.tsx`, from SubPhase_02_02): Place the full banner in the page header area, directly below the H1 page title and above the filter bar. This gives merchandise managers visibility into stock health while they are browsing or editing product listings, even when they are not in the stock control section.

**Main dashboard navigation** (the sidebar or top navigation bar from Phase 01 layout): In this location, render only the unread count as a small circular badge on a warning amber (#F59E0B) background positioned over a warning triangle or inventory icon in the navigation. Do not render the full banner text in the navigation — only the number. Clicking the badge or its parent icon navigates to `/dashboard/[tenantSlug]/stock-control/low-stock`. When the count is zero, remove the badge entirely rather than showing a zero.

---

## Step 3 — Create the Low Stock List Route

Create `frontend/app/dashboard/[tenantSlug]/stock-control/low-stock/page.tsx` as a client component. Verify the `stock:view` permission. If the permission is absent, render the standard inline permission-denied card.

Render a breadcrumb trail: Dashboard → Stock Control → Low Stock.

---

## Step 4 — Render the Page Header

Render an H1 heading in Inter: "Low Stock Variants". Inline with the H1, render a small warning amber (#F59E0B) badge showing the total count of at-or-below-threshold variants. Position the badge to the right of the heading text.

Below the H1, render a subtitle in Inter muted text (#64748B): "Variants currently at or below their configured low stock threshold."

At the top right of the page, render an "Export Low Stock List" secondary outline button with a download icon. This button triggers the CSV export described in Step 6 below.

---

## Step 5 — Build the Threshold Filter

Below the page header, render a compact filter card on a white surface (#FFFFFF). This filter gives managers flexibility to explore what would be at risk under different threshold scenarios without permanently changing any per-variant settings.

The filter card contains two controls:

**Custom Threshold Override.** A number input labelled "Show variants with stock at or below:". By default, this field is empty and the filter falls back to each variant's individual `low_stock_threshold` for comparison.

**"Use Individual Thresholds" toggle.** A boolean toggle that is on by default. When toggled off, the custom threshold override input is enabled. When toggled back on, the override is cleared and the per-variant thresholds resume.

When a custom override value is active, display a note below the filter controls in muted Inter italic: "Overriding individual thresholds — showing variants with stock ≤ [N]." This note disappears when the toggle reverts to per-variant mode.

Submit the active threshold override as a `threshold_override` query parameter in the data fetch. If no override is active, omit the parameter and let the backend use per-variant thresholds.

---

## Step 6 — Build the Low Stock Table

Fetch the at-risk variants from `GET /api/catalog/stock/low-stock/` with the active threshold override parameter if set. Use TanStack Query so the results automatically refresh when the filter changes. Default sort is by shortfall descending — variants with the greatest gap between their threshold and their current stock appear at the top, representing the most urgent restock needs.

Render the results in a ShadCN `Table` with a border (#E2E8F0) header row. The columns are:

**Product.** Product name in Inter medium as the primary label. Category name in smaller muted Inter text below.

**Variant.** SKU in JetBrains Mono as the primary identifier. Size and colour attributes in muted Inter below.

**Current Stock.** Display `stock_quantity` as a styled badge. If `stock_quantity` is exactly zero, use a danger red (#EF4444) badge labelled "Out of Stock". If between 1 and `low_stock_threshold` inclusive, use a warning amber (#F59E0B) badge showing the numeric quantity.

**Threshold.** The configured `low_stock_threshold` value for this variant, displayed in muted Inter. If a custom override is active, display the override value here with a small annotation "(custom)" in muted text.

**Shortfall.** The difference `low_stock_threshold - stock_quantity`. Format as "−X" in danger red (#EF4444) if the shortfall is greater than zero, indicating how many units are needed to reach the threshold. Display "At threshold" in warning amber (#F59E0B) text if the shortfall is exactly zero — meaning the variant is at its threshold but not yet below it.

**Actions.** A single "Adjust Stock" link styled as a small primary button. The link navigates to `/dashboard/[tenantSlug]/stock-control/adjust?variant_id={id}`, passing the variant ID as a query parameter. The adjustment form reads this parameter on mount and pre-selects the matching variant in the variant selector, eliminating the need for staff to search manually when responding to a specific low-stock alert.

When no variants are at or below threshold (which should only occur if the filter is cleared after the page was already open), render an empty state: a success green checkmark icon, heading "All stock levels are healthy", and body text "No variants are currently at or below their low stock threshold."
