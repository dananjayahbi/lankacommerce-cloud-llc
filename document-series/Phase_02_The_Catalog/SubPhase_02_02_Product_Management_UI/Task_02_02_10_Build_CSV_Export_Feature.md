# Task 02.02.10 — Build CSV Export Feature

## Metadata

| Field        | Value                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Task ID      | Task_02_02_10                                                                                                  |
| Sub-Phase    | 02.02 — Product Management UI                                                                                  |
| Complexity   | Low                                                                                                            |
| Depends On   | Task_02_02_01                                                                                                  |
| File Target  | Export trigger in `src/components/inventory/InventoryTable.tsx`                                                |

---

## Objective

Build the CSV Export feature that allows OWNER and MANAGER roles to download the current product catalog as a CSV file. The export respects any active filter state from the Inventory List and can optionally include cost prices based on the user's permission level. The resulting file format mirrors the import CSV format to enable a round-trip edit workflow. All export processing is handled entirely by the Django backend — there is no Next.js Route Handler for this feature.

---

## Instructions

### Step 1: Add the Export Button to the Inventory List

On the Inventory List page toolbar (the row containing the search bar and filter controls), add an "Export" button positioned to the right of the filter bar, to the left of the "Import CSV" button. The button uses a border outline style with a navy download-arrow icon prefix.

This button opens a ShadCN Popover (not a Dialog — the interaction is lightweight). The Popover is anchored to the button and appears below it.

### Step 2: Build the Export Popover Content

The Popover body contains three options presented as a vertical list of selectable items:

- "Export visible products" — exports all products matching the current active filters across all pages, not just the visible page. The count to be exported is shown in parentheses: "Export visible products ([N])". If no filters are active, this reads "Export all products ([N total])"
- "Export selected products" — only visible and clickable if at least one product row is checked in the Inventory List. Shows the count: "Export selected products ([N selected])". If no rows are selected, this option appears text-muted with a tooltip "Select products from the list to use this option"
- A checkbox input below the two options labelled "Include cost prices". This checkbox is only rendered for users who have the `product:view_cost_price` permission. CASHIER roles never see this checkbox, and the Django export endpoint ignores the parameter even if a CASHIER somehow sends it

A "Download" navy button at the bottom of the Popover confirms the selection and initiates the download. The Popover closes when Download is clicked.

### Step 3: Implement the Client-Side Download Trigger

When the user clicks "Download", close the Popover and immediately show a ShadCN Sonner toast with the message "Generating export…". This toast does not auto-dismiss — it stays until the download starts.

The recommended approach to authenticate the download is a two-step process that avoids long-lived credentials in the URL. First, the frontend calls `POST /api/catalog/products/export-token/` to request a one-time download token that is valid for 30 seconds. The JWT is sent as a `Bearer` token in the `Authorization` header of this request. The Django endpoint returns a short-lived `download_token` string. Second, the frontend constructs the final download URL as `GET /api/catalog/products/export/?token={download_token}&{filter_params}` and triggers it using an anchor element download pattern: create an `HTMLAnchorElement` programmatically, set its `href` to the constructed Django URL, set its `download` attribute to an empty string (the Django endpoint sets the filename via `Content-Disposition`), append it to the document body momentarily, call `click()` on it, and remove it from the DOM. This pattern triggers the browser's native file download without navigating away from the page and avoids exposing the long-lived JWT in the URL.

If `productIds` are being exported (selected products mode), include them as a comma-separated `product_ids` query parameter. If `include_cost_prices` is checked, include `include_cost_prices=true`.

Dismiss the "Generating export…" toast 1 500 milliseconds after the anchor click, replacing it with a brief "Download started" toast that auto-dismisses after 2 000 milliseconds.

### Step 4: Note on Django Export Endpoint

This step documents the Django backend's responsibility — no Next.js file is created here. The Django endpoint `GET /api/catalog/products/export/` handles all export processing:

- Validates the one-time `token` query param issued by the export-token endpoint; returns 401 if the token is absent, expired, or already used
- Reads filter params from the URL: `search`, `category_ids`, `brand_ids`, `genders`, `statuses`, `product_ids`, and `include_cost_prices`
- If `include_cost_prices` is truthy, additionally checks that the token's associated user has `product:view_cost_price` permission; silently ignores the flag if absent
- Queries the database for all matching products with their variants, applying the same filter logic as the `/api/catalog/products/` list endpoint but without pagination
- Streams the CSV content as a `StreamingHttpResponse` with `FileWrapper` over a queryset iterator, keeping memory usage low for large catalogs
- Sets the `Content-Type` header to `text/csv;charset=utf-8` and the `Content-Disposition` header to `attachment;filename="lankacommerce-inventory-YYYY-MM-DD.csv"` where the date is the current date in YYYY-MM-DD format

### Step 5: Define the CSV Column Specification

The exported CSV columns match the import format exactly so the file can be re-imported after editing. Column order:

| Column              | Source                   | Notes                                                                                                              |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Product Name        | `product.name`           |                                                                                                                    |
| Category            | `category.name`          | Empty string if no category                                                                                        |
| Brand               | `brand.name`             | Empty string if no brand                                                                                           |
| Gender              | `product.gender`         | Exported as the display label: Men, Women, Unisex, etc.                                                            |
| SKU                 | `variant.sku`            |                                                                                                                    |
| Barcode             | `variant.barcode`        | Empty string if not set                                                                                            |
| Size                | `variant.size`           |                                                                                                                    |
| Colour              | `variant.colour`         |                                                                                                                    |
| Cost Price          | `variant.cost_price`     | Only present if `include_cost_prices=true` and user has permission; otherwise column is omitted entirely           |
| Retail Price        | `variant.retail_price`   |                                                                                                                    |
| Wholesale Price     | `variant.wholesale_price`| Empty string if not set                                                                                            |
| Stock Quantity      | `variant.stock_quantity` |                                                                                                                    |
| Low Stock Threshold | `variant.low_stock_threshold` |                                                                                                               |
| Status              | `product.status`         | `ACTIVE` or `ARCHIVED`                                                                                             |
| Tags                | `product.tags`           | Exported as comma-separated string inside a quoted field                                                           |
| Description         | `product.description`    | Quoted to preserve newlines                                                                                        |
| Created At          | `product.created_at`     | ISO 8601 format                                                                                                    |

Archived variants (where `variant.deleted_at` is not null) are excluded from the export.

---

## Expected Output

Clicking the "Export" button on the Inventory List opens the Popover. With no active filters, "Export visible products (47)" shows the full count. Checking "Include cost prices" (if permitted) and clicking Download requests a one-time token, then starts the browser download via the Django streaming endpoint. The downloaded file contains one row per active variant with the columns in the specified order. The filename is "lankacommerce-inventory-2026-05-18.csv" (current date).

---

## Validation

- [ ] Export button is visible on the Inventory List page toolbar
- [ ] Popover opens and closes correctly; clicking outside the Popover dismisses it
- [ ] "Export selected products" option is text-muted when no rows are selected
- [ ] "Include cost prices" checkbox is hidden from users without the permission
- [ ] Frontend first obtains a one-time download token from `POST /api/catalog/products/export-token/`
- [ ] Download anchor click pattern triggers the browser download without page navigation
- [ ] Django endpoint returns 401 for expired or missing download tokens
- [ ] Django endpoint ignores `include_cost_prices` if the user lacks the permission
- [ ] Exported CSV header row contains all expected columns (minus cost price if not included)
- [ ] Each data row corresponds to one non-deleted variant
- [ ] Tags column is correctly quoted to prevent CSV parsing issues
- [ ] Filename in the `Content-Disposition` header contains the correct current date and "lankacommerce" prefix

---

## Notes

- For very large tenants with thousands of products, the Django queryset should use `.only()` or `.values()` to select only the required fields rather than fetching full model instances with all relations, keeping memory usage low during streaming
- If the total variant count exceeds 10 000, consider adding a server-side cap and a warning in the export summary, but do not implement streaming pagination in this task — keep it simple
- The Tags field must be serialised as a quoted comma-separated string within a CSV-quoted field to avoid breaking CSV parsers. If a tag itself contains a comma, it should be wrapped in double quotes according to RFC 4180
- The one-time download token approach is the recommended pattern because it prevents the long-lived JWT from appearing in server access logs, browser history, and referrer headers
