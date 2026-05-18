# Task 02.03.10 — Build Stock Valuation View

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.10 |
| Task Name | Build Stock Valuation View |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | Task_02_03_01 complete |
| Output Path | `frontend/app/dashboard/[tenantSlug]/stock-control/valuation/page.tsx` |

---

## Objective

Build the Stock Valuation page at `/dashboard/[tenantSlug]/stock-control/valuation`. This page presents a financial summary of the store's current inventory including retail value, cost value, estimated gross margin, and a per-category breakdown table. Access is strictly restricted to users who hold the `product:view_cost_price` permission, since cost pricing data is commercially sensitive and must not be exposed to general staff. The page supports manual data refresh and CSV export for financial reporting purposes.

---

## Step 1 — Create the Route and Permission Check

Create `frontend/app/dashboard/[tenantSlug]/stock-control/valuation/page.tsx`. This is a client component. Retrieve the authenticated user from the JWT via the `useAuth()` hook.

Check the `product:view_cost_price` permission. If the user lacks this permission, do not redirect — render an inline permission-denied card in place of the full page. The denial card is a white surface panel (#FFFFFF) with border (#E2E8F0) containing: a lock icon in muted grey, an H2 heading in Inter: "Access Restricted", and a body paragraph in Inter muted text (#64748B): "Stock valuation data includes cost prices, which are restricted to store owners and authorised managers. Contact your store owner to request access." Below the body text, render a standard secondary link button labelled "Return to Stock Control" navigating back to `/dashboard/[tenantSlug]/stock-control/`.

Render the breadcrumb trail regardless of permission state: Dashboard → Stock Control → Stock Valuation. The breadcrumb must always be visible above the denial card so the user can orient themselves and navigate away without using the browser back button.

---

## Step 2 — Render the Page Header

For users who do hold the `product:view_cost_price` permission, render the full page with the standard background (#F1F5F9).

Render an H1 heading in Inter: "Stock Valuation". Directly below the H1, render a subtitle in Inter muted text (#64748B): "As of [date and time]" where the date and time are populated from the `calculated_at` field returned by the valuation API, formatted as "17 Mar 2026, 10:42 AM". While the data is still loading on first mount, render a ShadCN `Skeleton` placeholder in place of the "As of" subtitle text.

On the same row as the H1, aligned to the right edge, place two secondary outline action buttons:

- **"Refresh"** with a rotating arrows icon. When clicked, this button explicitly invalidates the TanStack Query cache for the valuation data and triggers an immediate refetch. While a refetch is in progress, disable this button and animate the arrows icon with a CSS rotation.
- **"Export Valuation Report"** with a download icon. This button triggers the CSV export described in Step 6.

---

## Step 3 — Fetch Valuation Data

Use a TanStack Query hook named `useGetStockValuation` that calls `GET /api/catalog/stock/valuation/`. Set the stale time to 5 minutes. Valuation is computed synchronously on the server using ORM aggregations — on very large catalogs this can take a moment, so caching the result for 5 minutes prevents repeated slow queries when the user navigates away and back within a work session. The "Refresh" button in Step 2 bypasses the cache by performing explicit query invalidation.

**While loading on initial fetch:** Render ShadCN `Skeleton` placeholders for all four KPI cards and for the category breakdown table. Preserve the card grid layout during loading so the page does not experience a large layout shift when data arrives.

**On error:** Render a ShadCN `Alert` component in danger styling with the error message from the response body. Include the "Refresh" button inside the alert so the user can retry without scrolling to the top of the page.

---

## Step 4 — Render the Four Summary KPI Cards

Below the page header, render four summary KPI cards in a responsive grid — four columns on large screens, two on medium, one on small. Each card uses a white surface background (#FFFFFF), border colour (#E2E8F0) border, and Inter throughout.

**Card 1 — Total Retail Value.** The primary value is the total `retail_value` from the API response, formatted as a rupee amount in Inter semibold, navy (#1B2B3A). Below the value, render subtext in muted Inter: "What your stock could sell for at retail prices."

**Card 2 — Total Cost Value.** The primary value is the total `cost_value` formatted as a rupee amount in Inter semibold. Same muted subtext format. Subtext: "What your current stock cost to acquire."

**Card 3 — Estimated Gross Margin.** The primary displayed value is `estimated_margin_percent` formatted to one decimal place as a percentage (e.g. "58.1%") in a large Inter font size. Below the percentage, render the absolute margin value as a secondary line (e.g. "Rs. 1,245,000 in margin"). Apply colour to the percentage value based on these thresholds: success green (#22C55E) if margin percent is greater than 30%, warning amber (#F59E0B) if between 10% and 30% inclusive, danger red (#EF4444) if below 10%. Subtext: "Based on retail minus cost value."

**Card 4 — Variants in Stock.** Display `variant_count` from the API response — the count of distinct variants with at least one unit in stock. Subtext: "Variants with at least one unit currently available."

---

## Step 5 — Build the Category Breakdown Table

Below the four KPI cards, render a section with the heading "Category Breakdown" in Inter semibold. This section provides the per-category financial breakdown from the `category_breakdown` array in the API response.

Render the data in a ShadCN `Table` with a border (#E2E8F0) header row. The default sort is by retail value descending, placing the highest-value categories at the top. Allow column header clicks to re-sort by that column — toggle between descending and ascending on repeated clicks.

The columns are as follows:

**Category.** The category name in Inter. Products with no category assigned are grouped in a row labelled "Uncategorised" and sorted to the bottom of the table regardless of other sort criteria.

**Variants in Stock.** The count of distinct variants in this category with `stock_quantity > 0`, displayed in regular Inter.

**Retail Value.** The sum of `stock_quantity × retail_price` for all in-stock variants in the category, formatted as a rupee value in JetBrains Mono for precise numeric readability.

**Cost Value.** The sum of `stock_quantity × cost_price` for all in-stock variants in the category, formatted in JetBrains Mono.

**Margin %.** The category-level gross margin percentage, computed as `(retail_value - cost_value) / retail_value × 100` rounded to one decimal place. Apply the same threshold colouring as Card 3: green above 30%, amber 10–30%, red below 10%.

**Share of Total.** The percentage of the store's total retail value accounted for by this category. Display the percentage as text, followed by a thin horizontal progress bar immediately below or alongside it. The progress bar width is proportional to the share percentage. Use the border colour (#E2E8F0) as the bar track background and navy (#1B2B3A) as the fill colour. Keep the bar height small — approximately 4 pixels — so it reads as an inline data visualisation rather than a chart element.

---

## Step 6 — Implement the Export

When the "Export Valuation Report" button is clicked, construct a request to `GET /api/catalog/stock/valuation/?format=csv`. The server returns a file with `Content-Type: text/csv` and a `Content-Disposition: attachment` header, triggering an automatic browser download.

The CSV file contains two sections separated by a blank row. The first section is the summary header with two-column rows: label in the first column, value in the second. Rows: "Total Retail Value (Rs.)", "Total Cost Value (Rs.)", "Estimated Margin (Rs.)", "Estimated Margin (%)". The second section is the full category breakdown with column headers: "Category", "Variants in Stock", "Retail Value (Rs.)", "Cost Value (Rs.)", "Margin %", "Share of Total (%)".

While the export request is in flight, disable the "Export Valuation Report" button and change its label to "Preparing Export…" with a spinner. Re-enable the button once the download has been initiated or an error toast has been shown.
