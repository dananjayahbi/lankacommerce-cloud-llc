# Task 02.03.05 — Build Stock Take Approval Workflow

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.05 |
| Task Name | Build Stock Take Approval Workflow |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | Task_02_03_04 complete |
| Output Paths | `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/review/page.tsx` |

---

## Objective

Build the stock take review and approval page at `/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/review`. Managers with the `stock:take:approve` permission can review all discrepancies, approve the session to trigger automatic bulk stock corrections, or reject the session with a recorded reason. Users who hold `stock:take:manage` but not `stock:take:approve` can view the review page in read-only mode to track progress. Approving a session causes the backend to create `STOCK_TAKE_ADJUSTMENT` stock movement records for every variant with a non-zero discrepancy, permanently updating inventory quantities.

---

## Step 1 — Create the Route and Strict Permission Guard

Create `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/review/page.tsx` as a client component. Retrieve the authenticated user's JWT and check the following permission conditions:

- If the user holds neither `stock:take:manage` nor `stock:take:approve`, render the standard inline permission-denied card. Do not show any session data.
- If the user holds `stock:take:manage` but not `stock:take:approve`, render the full review page in read-only mode. The decision panel described in Step 6 must not appear — the entire decision card is hidden, not just disabled.
- If the user holds `stock:take:approve` (with or without `stock:take:manage`), render the full review page including the decision panel.

Render a breadcrumb trail: Dashboard → Stock Control → Stock Takes → Review.

---

## Step 2 — Render the Session Metadata Header

Fetch the session detail from `GET /api/catalog/stock-takes/{sessionId}/` on mount using TanStack Query. While loading, display a skeleton placeholder matching the card dimensions.

Render the session summary in a white surface card (#FFFFFF) with a border (#E2E8F0). The card contains the following labelled fields arranged in a two-column grid:

- **Scope:** the category name or "Full Catalog"
- **Initiated By:** display name of the initiating user
- **Started:** `started_at` formatted as "17 Mar 2026, 10:42 AM"
- **Submitted:** `completed_at` formatted the same way
- **Item Count:** total number of `StockTakeItem` records
- **Status:** the session's current status badge using the same colour semantics as the session list page (`IN_PROGRESS` in info blue with pulsing dot, `PENDING_APPROVAL` in warning amber, `APPROVED` in success green, `REJECTED` in muted grey)

---

## Step 3 — Build the Discrepancy Summary Card

Immediately below the metadata header, render a summary card that gives the approver a headline risk assessment before they read through individual line items.

If no items have a non-zero discrepancy, render a success green (#22C55E) card with a checkmark icon, heading "No Discrepancies Found", and body text: "All counted quantities match system quantities. Approving this session will not change any stock levels."

If one or more discrepancies exist, render a warning amber (#F59E0B) card with a warning icon and the following statistics:

- **Discrepancies:** the count of items where `discrepancy !== 0`
- **Net Additions:** the sum of all positive discrepancies, expressed as "+X units to be added to stock"
- **Net Reductions:** the sum of the absolute values of all negative discrepancies, expressed as "−X units to be removed from stock"

This three-figure summary allows the approver to immediately judge the magnitude of the correction before reviewing the details. If both net additions and net reductions are present in the same session, that is a signal to review carefully for potential counting errors.

---

## Step 4 — Build the Three-Tab Interface

Below the summary card, render a tab strip with three tabs. The active tab has a navy (#1B2B3A) underline indicator. Inactive tabs are in muted text.

**Tab 1 — All Items (X):** Shows every item in the session regardless of discrepancy status. The X in the label is the total item count.

**Tab 2 — Discrepancies (X):** Shows only items where `discrepancy !== 0`. The X is the discrepancy count. The tab label text itself uses warning amber (#F59E0B) to draw attention. If no discrepancies exist, this tab renders an empty state message: "No discrepancies — all counts matched system quantities."

**Tab 3 — Perfect Matches (X):** Shows only items where `discrepancy === 0`. The X is the count of matching items. These rows represent confirmation that the physical count aligned with the system record.

The tab interface enables the approver to focus their attention on problem items without scrolling through the entire catalog.

---

## Step 5 — Build the Review Table

Within each tab's content area, render a read-only ShadCN `Table`. The table is strictly read-only on this page — the approver cannot modify counted quantities, only review them. The columns are:

**Variant.** The product name in regular Inter as the primary label. The SKU displayed in JetBrains Mono below it. Size and colour attributes in muted Inter.

**System Quantity.** The `system_quantity` from the time the session was created, in muted text.

**Counted Quantity.** The `counted_quantity` entered during the counting phase. Displayed in regular Inter. If null (item was not counted and was auto-resolved to `system_quantity` upon session completion), display the value followed by a small muted annotation "(auto)".

**Discrepancy.** The difference `counted_quantity - system_quantity`, formatted as "+N" in success green (#22C55E) for positive, "−N" in danger red (#EF4444) for negative, and "0" in muted grey (#64748B) for zero.

**Recount Flagged.** Display a warning amber badge labelled "Needs Recount" for items where `needs_recount` is true. Display nothing or a neutral dash for items not flagged.

Rows where `discrepancy !== 0` receive a subtle warning amber (#F59E0B) left border accent to remain visually salient even within the "All Items" tab view. Rows with `needs_recount: true` receive a slightly deeper amber left border to indicate they were explicitly flagged.

---

## Step 6 — Build the Decision Panel

Render the decision panel only for users who hold the `stock:take:approve` permission. Place it below the review table. The panel is a white surface card (#FFFFFF) with border (#E2E8F0), with a heading in Inter semibold: "Approval Decision".

The panel contains two action buttons:

**"Approve Session"** — a button with success green (#22C55E) background and white text. Clicking this button opens an approval confirmation dialog. The dialog heading reads "Approve This Stock Take?" and the body text reads: "Approving this session will apply all discrepancy corrections as stock adjustments with reason STOCK_TAKE_ADJUSTMENT. This action is irreversible and will permanently update your inventory quantities. Do you want to proceed?"

The dialog has two buttons: "Approve and Apply Changes" in success green and "Cancel" as a secondary outline. On cancel, dismiss the dialog. On confirm, disable both dialog buttons and show a spinner, then POST to `POST /api/catalog/stock-takes/{sessionId}/approve/`. On success, display a toast in success green: "Stock take approved. All stock levels have been updated." Then navigate to the session list page. On failure, close the dialog and display an error toast with the message from the response body.

**"Reject Session"** — a button styled as a danger red (#EF4444) outline with danger red text. Clicking this button opens a rejection dialog. The dialog heading reads "Reject This Stock Take?" and the body contains a required `textarea` labelled "Rejection Reason". The minimum permitted length for the rejection reason is 10 characters. If fewer characters are entered, disable the "Confirm Rejection" button and display an inline message: "Please provide a rejection reason of at least 10 characters."

The dialog has two buttons: "Confirm Rejection" in danger red background with white text, and "Cancel". On confirm with a valid reason, POST to `POST /api/catalog/stock-takes/{sessionId}/reject/` with the body `{ rejection_reason }`. On success, display a toast in muted styling: "Stock take rejected." and navigate to the session list page. On failure, display an error toast.

If the session status is already `APPROVED` or `REJECTED` (e.g. the approver has navigated back to the review page after taking action), hide the decision panel entirely and replace it with a read-only status note: "This session has already been [approved/rejected] and no further action is required."
