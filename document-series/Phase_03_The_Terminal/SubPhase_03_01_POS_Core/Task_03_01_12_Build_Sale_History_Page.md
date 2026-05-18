# Task 03.01.12 — Build Sale History Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.12 |
| Task Name | Build Sale History Page |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_03 |
| Output Files | `frontend/app/dashboard/[tenantSlug]/pos/history/page.tsx`, `frontend/components/pos/SaleHistoryTable.tsx`, `frontend/components/pos/SaleDetailModal.tsx` |

---

## Objective

Build the Sale History page accessible from the POS terminal's top bar, providing a searchable, filterable, paginated table of all sales for the current tenant, a sale detail modal with a full line-item breakdown displaying snapshot data, and an authorised void action for eligible completed transactions within the current open shift.

---

## Step 1 — Set Up the Page Route and Layout

Create `frontend/app/dashboard/[tenantSlug]/pos/history/page.tsx` as a Next.js server component. This route is nested under the POS terminal's `/pos/` path, meaning it inherits the `layout.tsx` server component built in Task 03.01.05. Consequently, the history page also renders within the special POS layout — no sidebar, no standard dashboard navigation. The shift-gate check in the layout component runs here too, so the cashier must have an open shift to access sale history.

The history page uses a full-width single-column layout that fills both the left and right panel slots of the POS two-panel grid. To achieve this, the history page should render a container that breaks out of the normal left/right split. The simplest approach is to have the layout conditionally apply the two-column grid only when the current route is the main POS terminal page, not the history sub-page. Use `usePathname()` in a client boundary component within the layout to switch between the two-column grid and a full-width single column.

At the very top of the history page, render a slim header bar of approximately 48px in height with a navy (#1B2B3A) background. On the left side of this bar, place a "← Return to Terminal" link in orange (#F97316) Inter 14px that navigates back to `/dashboard/[tenantSlug]/pos` using Next.js's `<Link>` component. On the right side, display the tenant's store name (from the tenant context) and the current cashier's name (from `getAuthFromCookies()`), both in small Inter 12px in border colour (#E2E8F0). Below this header bar, render the `SaleHistoryTable` client component, passing `tenantId` and the current user's `role` as props.

---

## Step 2 — Build the Filter and Search Controls

At the top of the `SaleHistoryTable` component, render a filter bar. Manage all filter state in a single `filters` object using `useState`, applying partial updates via spread-merge on each change.

The filter bar contains the following controls arranged in a horizontal flex row that wraps to two lines on narrow viewports. A "Date From" date-time input defaulting to the start of today (midnight local time). A "Date To" date-time input defaulting to the current time. A "Cashier" dropdown populated by querying `GET /api/accounts/users/?role=CASHIER&tenant_id={tenantId}` — the dropdown uses "All Cashiers" as its default value, with each subsequent option being a cashier's full name mapped to their `user_id`. A "Status" dropdown with options: "All", "Completed", "Voided", and "Held / Open". A "Payment Method" dropdown with options: "All", "Cash", "Card", "Split". A "Reset Filters" text button in text-muted Inter 13px that resets all filter values to their defaults.

Date inputs are debounced at 300ms to avoid re-querying on every character entered. All other filter control changes immediately update the query key and trigger a refetch. When any filter changes, reset the current page number back to 1 to prevent showing a paginated result where the current page number exceeds the new total page count.

---

## Step 3 — Build the Sales Table

The sales table is the core of the history page. It renders server-side paginated sale records from TanStack Query, with the query key composed of all current filter values and the page number. Each filter change or page navigation triggers a new `GET /api/pos/sales/` call with the updated parameters. The backend service returns both the sale list and a total count for pagination math.

Provide a page size selector (a small dropdown) with options for 20, 50, and 100 rows per page. Pagination controls render below the table with "Previous" and "Next" buttons and a page indicator ("Page 3 of 14").

The table columns and their rendering rules are as follows.

**Sale Reference column**: display the first 8 characters of the sale UUID in uppercase, rendered in JetBrains Mono 12px navy. The full UUID is shown in a native browser tooltip via the `title` attribute. The entire cell is a clickable link that opens `SaleDetailModal` for that sale. The Short Reference column is sortable by clicking the column header.

**Date and Time column**: display `created_at` formatted as "DD MMM YYYY, HH:MM" — for example "15 Mar 2026, 14:32". Use the locale-aware date formatting utility already established in the codebase. This column is sortable. Default sort order is descending by this column (newest first).

**Cashier column**: display the cashier's full name in Inter 13px. If the sale's `authorizing_manager_id` is non-null (indicating a manager-authorised discount was applied), render a small "Mgr Override" badge to the right of the name in orange (#F97316) text on a light orange background. This badge serves as a quick visual audit signal in the table view, allowing a manager reviewing history to immediately spot transactions that involved discount overrides.

**Lines column**: display the count of `SaleLine` records as a centred pill badge in text-muted background with text-muted Inter 13px text. This provides a quick indication of transaction size.

**Sub-total, Discount, Tax columns**: display right-aligned values in JetBrains Mono 12px. The Discount value is shown in danger (#EF4444) text when greater than zero, without a sign prefix — the label "Discount" provides the negative context. Sub-total and Tax are in navy text.

**Total column**: display `total_amount` in JetBrains Mono 14px navy bold, right-aligned. This is the most important monetary figure in the row and receives slightly larger text than the other monetary columns.

**Payment Method column**: render as a badge. CASH uses success green (#22C55E) background with white text. CARD uses info blue (#3B82F6) background with white text. SPLIT uses orange (#F97316) background with white text. OPEN (held) sales have no payment badge — instead only the Status badge is shown for these rows.

**Status column**: render as a badge. COMPLETED uses success green (#22C55E) background. VOIDED uses danger (#EF4444) background. OPEN uses warning amber (#F59E0B) background with the label "Held" rather than "Open" to use retail-friendly language.

**Actions column**: render a "View" button (eye icon, Inter 13px text-muted) for every row, which opens `SaleDetailModal`. Render a "Void" button (ban-circle icon in danger #EF4444) conditionally: the Void button is shown only when all three of the following conditions are true — the sale's `status` is `COMPLETED`, the sale's `shift_id` matches the current user's open shift ID (voiding across shifts is not permitted in Phase 03), and the current user has the `pos:void_sale` RBAC permission. When any condition is false, the Void button is completely hidden rather than rendered as disabled.

---

## Step 4 — Implement the Void Action Flow

The Void button in the Actions column opens a ShadCN AlertDialog — a smaller, inline confirmation dialog rather than a full modal, appropriate for a destructive single-record action. The AlertDialog title is "Void Sale [SHORT_ID]?" where SHORT_ID is the first 6 characters of the sale UUID, uppercased. The description reads: "This will permanently reverse the transaction and restore stock for all [N] line items. This action cannot be undone."

Below the description, render an optional text input labelled "Reason for void:" in Inter 13px text-muted. The reason is collected for the audit log but is not required. The input has a `maxLength` of 200 characters.

Two buttons in the AlertDialog footer: "Cancel" (closes the dialog with no action) and "Confirm Void" in danger (#EF4444) fill with white text. Clicking "Confirm Void" calls `POST /api/pos/sales/{id}/void/` with the optional `reason` in the request body. Show a loading state on the button during the API call.

On a successful void: call `queryClient.invalidateQueries(["pos-sales", tenantId])` to trigger a table refresh. The voided row's status badge will update to danger red "VOIDED" and the Void button will disappear. Show a success toast: "Sale [SHORT_ID] has been voided and stock for all line items has been restored."

On a failure response — for example HTTP 409 because the shift associated with that sale has since been closed — show a danger toast with the error message returned by the server. Do not close the AlertDialog on failure so the cashier can read the error message before dismissing.

---

## Step 5 — Build the SaleDetailModal

Create `frontend/components/pos/SaleDetailModal.tsx` as a client component using ShadCN Dialog with `max-width: 2xl` (approximately 672px) and scrollable modal content (the line items section may be long for large transactions).

The modal content is divided into distinct sections.

**Header section**: "Sale [SHORT_ID]" in Inter 18px navy on the left, `created_at` formatted timestamp on the right in Inter 13px text-muted.

**Metadata strip**: a horizontal row of compact chips with background (#F1F5F9) fill showing: the cashier's full name, a shift reference (first 8 characters of the shift UUID), the payment method badge (styled identically to the table's payment badge), and the status badge (styled identically to the table's status badge). This strip gives a quick overview of the transaction context without requiring vertical space.

**Line items table**: a compact table with the following columns: Product Name and Variant Description as a two-line stack (first line Inter 14px navy, second line Inter 12px text-muted), SKU in JetBrains Mono 11px text-muted, Unit Price in JetBrains Mono 13px right-aligned, Qty as a centred integer, Discount in danger (#EF4444) JetBrains Mono 13px (shown only when greater than zero), and Line Total in JetBrains Mono 13px navy bold right-aligned. The table rows use alternating background (#F1F5F9) and surface (#FFFFFF) fills for readability. All product name and variant description values displayed in this table must come from the `product_name_snapshot` and `variant_description_snapshot` fields of each `SaleLine` record — never from a live join to the current `ProductVariant` or `Product` tables. The snapshot data is the authoritative record of what was sold.

**Financial breakdown section**: a vertical stack of label-amount rows below the line items table. Display: Sub-total, Line Discounts (the sum of per-line `discount_amount` values), Cart Discount (from `sale.discount_amount`), Tax Amount, and Total Amount. All amounts in JetBrains Mono right-aligned. Labels in Inter 13px. If `authorizing_manager_id` is non-null, add a small informational note below the Cart Discount row: "Cart discount authorised by [Manager Full Name]." Retrieve the manager's name by performing a lookup on the already-loaded user data (from TanStack Query cache) or by making a separate request to `GET /api/accounts/users/{managerId}/`.

**Void banner**: if `sale.status === 'VOIDED'`, render a full-width banner with danger (#EF4444) background at the top of the modal content (above the metadata strip). The banner text: "This sale was voided on [voided_at formatted as DD MMM YYYY, HH:MM] by [voided_by display name]."

**WhatsApp indicator**: if `sale.whatsapp_receipt_sent_at` is non-null, render a small success indicator below the metadata strip: a green checkmark icon followed by "WhatsApp receipt sent" in success green (#22C55E) Inter 12px text.

**Footer**: two buttons side by side at the bottom of the modal content. "Print Receipt" and "Send WhatsApp Receipt", both rendered as disabled ShadCN buttons at 40% opacity with a tooltip on hover reading "Available in the next update — coming in SubPhase 03.02." These placeholder buttons are important UI scaffolding: they communicate to the cashier and to reviewers of the interface that receipt delivery is a planned feature already anticipated in the design, preventing the modal from needing structural changes when SubPhase 03.02 implements them.

---

## Expected Output

After this task, the Sale History page is accessible from the POS top bar at `/dashboard/[tenantSlug]/pos/history`. It renders a filterable, paginated, sortable table of all tenant sales. `SaleDetailModal` opens when a sale row is clicked, displaying full snapshot-based line item data, financial breakdown, void banner if applicable, and placeholder receipt action buttons. Eligible sales can be voided from both the table's Void button and from `SaleDetailModal`, with proper TanStack Query cache invalidation and user feedback.

---

## Notes

The Sale History page is designed for brief lookups during an active shift — for example, reprinting a receipt for a customer who has just completed a purchase. It is not designed for extended management workflows or cross-shift analysis. Comprehensive sales reporting with charts, date-range comparisons, and export functionality is deferred to Phase 05.

The "Mgr Override" badge in the table view serves as a quick audit signal. When a manager or owner reviews the day's transactions, they can visually identify all sales where a cashier's discount threshold was exceeded and a manager authorisation was obtained. Combined with `SaleDetailModal`'s "Authorised by [Manager Name]" note, the accountability chain is fully visible without requiring a separate audit log query.

The snapshot display in `SaleDetailModal` always shows what was sold at the time of the transaction, regardless of any subsequent catalog changes. This is essential for customer disputes and receipt reprints: if a product name or price has changed since the sale was made, the modal must still show the original name and price, not the current one. Never join `SaleLine` data to live product tables for display in the history page or modal.

The disabled Print Receipt and Send WhatsApp Receipt buttons prevent the modal from needing structural or layout changes when SubPhase 03.02 implements them. By including them as visible but disabled placeholders now, the transition to active buttons in the next sub-phase is a simple state change rather than a layout redesign.
