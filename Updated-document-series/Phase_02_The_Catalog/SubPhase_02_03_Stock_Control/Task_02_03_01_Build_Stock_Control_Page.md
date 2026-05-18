# Task 02.03.01 — Build Stock Control Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.01 |
| Task Name | Build Stock Control Page |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Low |
| Dependencies | SubPhase_02_01 complete, SubPhase_02_02 complete |
| Output Paths | `frontend/app/dashboard/[tenantSlug]/stock-control/page.tsx` |

---

## Objective

Build the stock control dashboard landing page at `/dashboard/[tenantSlug]/stock-control/`. This page serves as the central hub for all inventory operations, giving authorised staff an immediate summary of inventory health through KPI cards, surfacing low-stock conditions via the alert widget, providing quick navigation links to all sub-sections, and presenting a recent activity table showing the ten most recent stock movements across the tenant.

---

## Step 1 — Create the Route and Permission Check

Create `frontend/app/dashboard/[tenantSlug]/stock-control/page.tsx` as a server component. At the top of the component, retrieve the authenticated user's JWT payload using `getAuthFromCookies()`. Check that the resolved user holds at least the `stock:view` permission via the tenant RBAC system. If the permission is absent, render the standard inline permission-denied card used consistently across the LankaCommerce dashboard — this card should display a lock icon, a heading stating the user does not have access, a brief explanation, and a link back to the main dashboard. Do not redirect; render the denial inline so the breadcrumb remains visible.

Apply the standard background colour (#F1F5F9) as the page-level background. All text on this page uses the Inter font family.

---

## Step 2 — Render the Page Header

At the top of the page content area, render a breadcrumb trail showing: Dashboard → Stock Control. Use the standard breadcrumb component established in Phase 01 layout work.

Below the breadcrumb, render an H1 heading in Inter: "Stock Control". Directly beneath the H1, render a subtitle paragraph in Inter with muted text colour (#64748B): "Manage inventory levels, track movements, and conduct stock takes." The header occupies the full content width, with the page content starting below it.

---

## Step 3 — Build the KPI Card Grid

Render four KPI summary cards in a responsive grid that collapses from four columns to two columns on medium viewports and to a single column on small viewports. Each card uses a white surface background (#FFFFFF) with a border using the border colour (#E2E8F0) and subtle rounded corners consistent with the rest of the dashboard.

The four cards are as follows:

**Card 1 — Total Products.** Show the count of non-archived `Product` records belonging to the current tenant. Use a box or package icon. Display the numeric value in Inter semibold, navy colour (#1B2B3A). Below the value, show the label "Total Products" in muted Inter.

**Card 2 — Low Stock Variants.** Show the count of `ProductVariant` records whose `stock_quantity` is at or below their configured `low_stock_threshold`. Use a warning triangle icon. Apply the warning colour (#F59E0B) to both the value and the icon to draw attention. If this count is exactly zero, revert the value and icon to the muted text colour (#64748B) to avoid alarming staff unnecessarily when inventory is healthy.

**Card 3 — Pending Stock Takes.** Show the count of `StockTakeSession` records in `PENDING_APPROVAL` status for the current tenant. Use a clipboard or checklist icon. Apply the info colour (#3B82F6) to the value and icon. This surfaces sessions awaiting an approver's decision without requiring the approver to navigate to the stock takes section.

**Card 4 — Total Stock Value.** Show the total retail value of all current stock across the tenant, computed as the sum of `stock_quantity × retail_price` for all non-archived variants with stock greater than zero. This KPI is only visible to users who hold the `product:view_cost_price` permission. If the current user lacks this permission, render the card shell normally but replace the value area with a lock icon and the text "Restricted" in muted text (#64748B). Do not hide the card entirely — its consistent position in the grid preserves layout stability.

---

## Step 4 — Place the Low Stock Alert Widget

Between the KPI card grid and the navigation grid described in Step 5, render the `LowStockAlertBadge` component built in Task 02.03.06. Pass the current `tenantSlug` as a prop. This component fetches the low-stock count independently and renders nothing when no variants are below threshold. When variants are at or below threshold, it renders an amber warning banner containing the variant count and a link to the full low-stock list page. The banner must not duplicate any information already shown in the KPI cards; its purpose is to provide a one-click call to action rather than just a number.

---

## Step 5 — Build the Quick Actions Navigation Grid

Below the low-stock banner area, render a grid of action navigation cards. Each card is a clickable Next.js Link containing an icon, a title in Inter medium, and a one-line description in muted Inter. The grid uses a three-column layout on large viewports, collapsing to two then one column on smaller screens.

Render only the action cards the current user has permission to access based on their RBAC role:

- **Adjust Stock** — links to `/dashboard/[tenantSlug]/stock-control/adjust`. Requires `stock:adjust`. Description: "Apply a manual quantity change to any variant." Icon: pencil or edit.
- **Movement History** — links to `/dashboard/[tenantSlug]/stock-control/movements`. Requires `stock:view`. Description: "Browse and export the full audit trail of stock changes." Icon: list or history.
- **Stock Takes** — links to `/dashboard/[tenantSlug]/stock-control/stock-takes`. Requires `stock:take:manage`. Description: "Start, manage, and review physical inventory counts." Icon: clipboard with checkmark.
- **Valuation** — links to `/dashboard/[tenantSlug]/stock-control/valuation`. Requires `product:view_cost_price`. Description: "View the retail and cost value of current stock by category." Icon: chart or currency.
- **Low Stock List** — links to `/dashboard/[tenantSlug]/stock-control/low-stock`. Requires `stock:view`. Description: "Review all variants at or below their stock threshold." Icon: warning triangle.

Each card uses a white surface background (#FFFFFF) with a border (#E2E8F0). On hover, apply a navy (#1B2B3A) left border accent to indicate interactivity. On the currently active card, apply an orange (#F97316) left border accent. Use a smooth CSS transition on the left border so the effect feels responsive rather than abrupt.

---

## Step 6 — Build the Recent Activity Table

Below the navigation grid, render a section with the heading "Recent Activity" in Inter semibold. This section provides an at-a-glance view of recent inventory changes without requiring a full navigation to the Movement History page.

Fetch the ten most recent `StockMovement` records for the current tenant, ordered by `created_at` descending. Display these records in a ShadCN `Table` component. The table header row uses the border colour (#E2E8F0) as its bottom border. The columns are as follows:

**Date/Time.** The `created_at` timestamp formatted as "17 Mar 2026, 10:42 AM". This column is sortable but defaults to descending order.

**Product + Variant SKU.** Display the parent product name in regular Inter above the variant SKU in JetBrains Mono. This visual hierarchy helps staff quickly identify which product was affected while still having the precise SKU available for reference.

**Reason.** Render a small badge with the reason code rendered as a human-readable label. Use the following colour semantics for reason badges: `DAMAGED`, `STOLEN`, and `DATA_ERROR` use warning amber (#F59E0B) background; `INITIAL_STOCK` and `PURCHASE_RECEIVED` use info blue (#3B82F6) background; `FOUND` and `SALE_RETURN` use success green (#22C55E) background; `STOCK_TAKE_ADJUSTMENT` uses the muted text colour (#64748B) as a neutral muted badge.

**Delta.** Display `quantity_delta` formatted as "+N" in success green (#22C55E) for positive deltas and "−N" in danger red (#EF4444) for negative deltas. Zero deltas should not appear — a zero-delta movement is semantically invalid and must not be stored.

**Actor.** Display the display name of the staff member who recorded the adjustment. Use regular Inter text.

Below the table, render a "View All Movements" text link that navigates to `/dashboard/[tenantSlug]/stock-control/movements` for staff who want the full paginated history.
