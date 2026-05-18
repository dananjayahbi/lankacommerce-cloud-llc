# Task 02.03.03 — Build Stock Movement History

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.03 |
| Task Name | Build Stock Movement History |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | Task_02_03_01 complete |
| Output Paths | `frontend/app/dashboard/[tenantSlug]/stock-control/movements/page.tsx` |

---

## Objective

Build the stock movement history page at `/dashboard/[tenantSlug]/stock-control/movements`. This page provides a comprehensive, filterable, paginated audit trail of every stock quantity change recorded for the tenant. Authorised users can narrow the view by date range, reason code, product name or SKU, and the staff member who made the adjustment. A CSV export button allows compliance officers and managers to download filtered records for offline analysis and reporting. Filters are reflected in the URL as query parameters so filtered views are shareable and survive page refreshes.

---

## Step 1 — Create the Route and Permission Check

Create `frontend/app/dashboard/[tenantSlug]/stock-control/movements/page.tsx`. This page is a client component to support interactive filtering. Retrieve the authenticated user's JWT and verify the `stock:view` permission. If the permission is absent, render the standard inline permission-denied card.

Render a breadcrumb trail at the top of the page: Dashboard → Stock Control → Movement History.

---

## Step 2 — Render the Page Header

Render an H1 heading in Inter: "Stock Movement History". Below it, render a subtitle in Inter muted text (#64748B): "A complete audit trail of all stock quantity changes." On the same row as the heading but aligned to the right edge, place an "Export to CSV" secondary outline button with a download icon. This button triggers the CSV export behaviour described in Step 6.

---

## Step 3 — Build the Filter Bar

Render a white surface card (#FFFFFF) below the page header, with a navy (#1B2B3A) left border accent to visually distinguish it from the data table below. This card contains all filter controls arranged in a responsive row that wraps gracefully on smaller screens.

The filter controls are:

**Date Range.** Two date inputs labelled "From" and "To". These accept and display dates in a human-friendly format but submit to the API as ISO date strings via the `from` and `to` query parameters. Clearing both fields removes the date filter entirely.

**Reason Multi-Select.** A chip-style multi-select control allowing staff to choose multiple `StockMovementReason` values simultaneously. Each selected reason appears as a small dismissible chip directly within or below the input. This allows filtering for, say, all `DAMAGED` and `STOLEN` movements together in one query. Map each reason value to its human-readable label as defined in Task 02.03.02, Step 7.

**Product / SKU Search.** A text input that performs a free-text search across product names and variant SKUs. The backend supports partial matching. Submit the value as a `search` query parameter.

**Actor.** A dropdown populated with the display names of all active staff members in the tenant. Selecting a staff member filters the results to show only their adjustments. Submit the selected user's ID as the `actor_id` query parameter. Fetch the staff list from `GET /api/accounts/staff/` on mount.

Below the filter controls, render a "Clear Filters" text link. Clicking this link resets all filter state to its empty default and removes all filter query parameters from the URL, returning to the unfiltered view. All filter values must be immediately reflected as URL query parameters on every change so that refreshing the page or sharing the URL reproduces the same filtered view.

---

## Step 4 — Build the Movement Table

Fetch movement records from `GET /api/catalog/stock/movements/` with the currently active filter parameters appended. Use TanStack Query with the filter state as the query key so data re-fetches automatically whenever any filter changes. Paginate at 25 records per page.

Above the table, display a record count summary in Inter muted text: "Showing X–Y of Z movements." This gives staff an immediate sense of how many records match their current filter.

Render the records in a ShadCN `Table`. The table header row uses the border colour (#E2E8F0) as its bottom separator. The columns are:

**Date/Time.** The `created_at` timestamp formatted as "17 Mar 2026, 10:42 AM". This column is sortable. Default sort is descending (newest first). Clicking the column header cycles through descending → ascending → default.

**Product.** The product name in Inter medium as the primary label. Below it, the category name in smaller muted Inter text. These are fetched via the join performed by the backend query.

**Variant.** The SKU displayed in JetBrains Mono as the primary line, with the size and colour attributes below it in muted Inter text.

**Reason.** A small badge using the same colour semantics defined in Task 02.03.01, Step 6: info blue for `INITIAL_STOCK` and `PURCHASE_RECEIVED`; success green for `FOUND` and `SALE_RETURN`; warning amber for `DAMAGED`, `STOLEN`, `DATA_ERROR`, and `RETURNED_TO_SUPPLIER`; muted grey for `STOCK_TAKE_ADJUSTMENT`.

**Delta.** The `quantity_delta` field formatted as "+N" in success green (#22C55E) for positive values and "−N" in danger red (#EF4444) for negative values. The sign prefix must always be explicit.

**Before.** The `quantity_before` value in muted text, representing stock level immediately prior to the adjustment.

**After.** The `quantity_after` value in regular Inter text, representing stock level immediately following the adjustment.

**Actor.** The display name of the staff member who recorded the adjustment in regular Inter.

**Note.** The adjustment note, if present. Truncate to 60 characters and append "…" if the note is longer. Render a small "See more" expand link inline that reveals the full note in a tooltip or inline expansion on click.

When the records are loading after a filter change, display a skeleton overlay on the table rows to indicate the update is in progress without destroying the layout.

---

## Step 5 — Build Pagination Controls

Render a pagination strip directly below the table. The strip includes a "Previous" button, the current page number and total page count displayed in Inter muted text (e.g. "Page 3 of 12"), and a "Next" button. Both "Previous" and "Next" are disabled when at the respective boundaries.

On each page change, update the `page` query parameter in the URL so the current page is reflected in the URL and survives a refresh. Scrolling to the top of the table on page change is recommended to avoid disorienting the user.

---

## Step 6 — Implement CSV Export

When the "Export to CSV" button in the page header is clicked, construct a request to `GET /api/catalog/stock/movements/?format=csv` with all currently active filter query parameters appended. This request may return up to 10,000 records in a single CSV download. The backend sets the response headers to `Content-Type: text/csv` and `Content-Disposition: attachment; filename="movements-{date_range}.csv"` so the browser automatically triggers a file download dialogue.

The exported CSV must not include any cost price fields — it is designed for operational audit use, not financial analysis. The CSV columns are: Date/Time, Product Name, Category, Variant SKU, Reason, Delta, Quantity Before, Quantity After, Actor, Note.

While the export request is in flight, disable the "Export to CSV" button and change its label to "Preparing Export…" with a spinner to prevent accidental double-clicks. Re-enable the button once the download has been initiated or an error is returned.
