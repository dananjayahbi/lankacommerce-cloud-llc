# Task 02.03.04 — Build Stock Take Session Flow

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.04 |
| Task Name | Build Stock Take Session Flow |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | High |
| Dependencies | Task_02_03_01 complete |
| Output Paths | `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/page.tsx`, `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/page.tsx` |

---

## Objective

Build the full stock take session UI covering the session list page, the session creation dialog with scope selection, and the counting interface where staff scan barcodes or manually enter counted quantities per variant. The UI enforces the single-active-session constraint — only one `IN_PROGRESS` session is permitted per tenant at a time — and provides clear visual status indicators for each session across its full lifecycle. The barcode scan input allows high-speed physical counting, while the item table supports inline editing of counted quantities and recount flagging.

---

## Step 1 — Create the Session List Route

Create `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/page.tsx` as a client component. Retrieve the authenticated user's JWT and verify the user holds either `stock:take:manage` or `stock:take:approve` permission. If neither permission is present, render the standard inline permission-denied card.

Render a breadcrumb trail: Dashboard → Stock Control → Stock Takes.

---

## Step 2 — Render the Page Header

Render an H1 heading in Inter: "Stock Takes". Below it, render a subtitle in Inter muted text (#64748B): "Manage physical inventory counts and apply stock corrections."

At the top right of the page, render a "Start New Stock Take" primary button using the navy background (#1B2B3A) with white text. This button must be disabled whenever a session in `IN_PROGRESS` status already exists for the tenant. When disabled, show a tooltip on hover explaining: "A stock take is already in progress. Resume or complete it before starting a new one." This constraint is also enforced server-side, but surfacing it client-side prevents unnecessary failed requests.

---

## Step 3 — Build the Session List

Fetch all stock take sessions for the tenant from `GET /api/catalog/stock-takes/` ordered by `started_at` descending using TanStack Query. Display the sessions in a ShadCN `Table`. The table header row uses the border colour (#E2E8F0) as its bottom separator. The columns are:

**Status.** Render a badge for each session status using these colours and indicators: `IN_PROGRESS` uses info blue (#3B82F6) badge background with a small pulsing dot to convey that activity is ongoing; `PENDING_APPROVAL` uses warning amber (#F59E0B) badge to signal a decision is awaited; `APPROVED` uses success green (#22C55E) badge; `REJECTED` uses muted grey (#64748B) badge, indicating the session was closed without applying changes.

**Scope.** Display "All Products" if no category was specified when the session was created. Display the category name if the session was scoped to a single category.

**Initiated By.** The display name of the staff member who started the session, in regular Inter.

**Started.** The `started_at` timestamp formatted as "17 Mar 2026, 10:42 AM".

**Items.** The total count of `StockTakeItem` records pre-populated into the session when it was created.

**Discrepancies.** The count of items where the final `discrepancy` (counted quantity minus system quantity) is non-zero. This column is only shown for sessions with a status beyond `IN_PROGRESS` — for active sessions it displays a dash since counting is not yet complete.

**Actions.** Context-sensitive per session status: a "Resume" link navigating to the counting interface for `IN_PROGRESS` sessions; a "Review" link navigating to the approval page for `PENDING_APPROVAL` sessions; a "View" link for `APPROVED` and `REJECTED` sessions, rendering them in read-only mode.

When no sessions exist yet for the tenant, render an empty state within the table area containing a clipboard icon, a heading "No stock takes yet", and a brief prompt: "Start your first stock take to reconcile your physical inventory with the system record."

---

## Step 4 — Build the New Session Creation Dialog

When the "Start New Stock Take" button is clicked, open a ShadCN `Dialog`. The dialog has a heading in Inter semibold: "Start New Stock Take". Within the dialog, render a scope selector using a radio group with two mutually exclusive options:

- **All Products (Full Catalog)** — selected by default. The session will include every non-deleted `ProductVariant` in the tenant.
- **Specific Category** — when selected, reveal a category dropdown that fetches the list of categories from `GET /api/catalog/categories/`. The staff member must select a category before proceeding.

Below the scope selector, render two buttons side by side: a "Start Session" confirm button in navy (#1B2B3A) background with white text, and a "Cancel" button as a secondary outline. "Start Session" is disabled if "Specific Category" is selected but no category has yet been chosen.

When "Start Session" is clicked, POST to `POST /api/catalog/stock-takes/` with the body containing the optional `category_id`. While the request is in flight, show a spinner on the "Start Session" button and disable both dialog buttons.

Handle the following response cases:
- On success, close the dialog and navigate directly to `/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]` using the `id` returned in the response body.
- On a 409 response with error code `SESSION_ALREADY_IN_PROGRESS`, close the dialog without showing a generic error toast. Instead, navigate to the existing in-progress session using the `existing_session_id` included in the error response. This handles the edge case where a second user starts a session in the brief moment between the client's button-disabled check and the server response.
- On any other error, close the dialog and display a generic error toast.

---

## Step 5 — Create the Counting Interface Route

Create `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/page.tsx` as a client component. Verify the user holds `stock:take:manage` permission. Fetch the full session including all items from `GET /api/catalog/stock-takes/{sessionId}/` using TanStack Query with the session ID as the query key.

If the session status is not `IN_PROGRESS`, redirect to the review page at `…/review` — this prevents staff from inadvertently editing a completed or approved session via a stale URL.

Render a breadcrumb: Dashboard → Stock Control → Stock Takes → [scope name — either "Full Catalog" or the category name].

---

## Step 6 — Render the Counting Header

At the top of the counting interface, render a white surface info card containing the following metadata: the session scope (category name or "Full Catalog"), the date the session was initiated formatted as a full date-time string, and the display name of the initiating user.

Below the info card, render a progress bar spanning the full content width. The filled portion of the bar represents the percentage of session items where `counted_quantity` is not null. Use the info blue (#3B82F6) colour for the filled section and the border colour (#E2E8F0) for the unfilled track. Below the bar, render the progress label in Inter medium: "X of Y variants counted." This headline figure updates in real time as staff enter counts.

---

## Step 7 — Build the Barcode Scan Input

At the top of the counting area, render a prominently styled text input labelled "Scan Barcode or Search SKU". Style this input with a slightly larger font than body text and a blue focus ring to draw attention — it should be the natural focal point when staff arrive at the counting interface with a handheld scanner.

When a barcode value is submitted (either by scanner trigger or by pressing Enter on a keyboard), search the session item list client-side for a variant whose `barcode` or `sku` matches the entered value. If a match is found, scroll the item table to the matching row and briefly apply a left border flash in orange (#F97316) for approximately one second before removing it. Clear the scan input immediately so it is ready for the next scan.

If the entered code matches no variant within the current session scope, display an inline warning alert below the scan input: "Variant not found in this session's scope. You may search the full catalog and add it manually." Clear the scan input after showing this alert so further scans are not blocked.

---

## Step 8 — Build the Item Counting Table

Display all session items in a ShadCN `Table` below the scan input. The table is the primary work surface of the counting interface and must be highly usable on both desktop and tablet devices. The columns are:

**Variant.** Three lines stacked: the product name in regular Inter above, the SKU in JetBrains Mono in the middle, and the size plus colour attributes in muted Inter below.

**System Quantity.** The `system_quantity` captured at session creation time, displayed in muted text. This is the quantity the system believed was present before the count started.

**Counted Quantity.** An inline editable number cell. For variants that have not yet been counted, display an empty dash with a subtle placeholder. When the user clicks or tabs into the cell, it transforms into a number input. When the user moves focus away from the cell (via tab, enter, or click elsewhere) and a value has been entered, automatically send a PATCH request to `PATCH /api/catalog/stock-takes/{sessionId}/items/{itemId}/` with the new `counted_quantity`. Show a brief loading indicator on the cell while the request is in flight. On success, the cell settles into its display state showing the confirmed count. On failure, revert the cell to its previous value and display an error tooltip.

**Discrepancy.** Auto-calculated client-side as `counted_quantity - system_quantity` when both values are present. Display as "+N" in success green (#22C55E) if positive, "−N" in danger red (#EF4444) if negative, and "0" in muted text (#64748B) if zero. Display an empty dash if `counted_quantity` is null.

**Recount Flag.** A checkbox control. When checked, PATCH the item with `needs_recount: true` set to `true`. Rows where `needs_recount` is true display a warning amber (#F59E0B) left border accent along the full row height, visually distinguishing them from clean rows so a supervisor can locate flagged items quickly during a second pass.

---

## Step 9 — Build the Footer Action Buttons

At the bottom of the counting page, render a sticky footer or a clearly separated footer section containing two buttons:

**"Save Progress" (secondary outline button).** Clicking this button does not change the session status. It triggers any pending PATCH requests for unsaved count values, then displays a brief "Progress saved" toast confirmation. Staff can leave and return to the counting page without losing work — partial saves are safe at any point during an `IN_PROGRESS` session.

**"Complete Session" (primary navy button).** This button is only enabled when at least one item in the session has a non-null `counted_quantity`. When clicked, open a ShadCN confirmation dialog before making any API call. The dialog heading reads "Submit Session for Approval" and the body text reads: "You are about to submit this session for approval. All uncounted variants will be treated as matching their system quantities. This action cannot be undone. Are you sure?"

The dialog has two buttons: "Submit for Approval" in navy and "Cancel" as a secondary outline. On cancel, dismiss the dialog and return to the counting interface without any changes.

On confirm, POST to `POST /api/catalog/stock-takes/{sessionId}/complete/`. While the request is in flight, disable both dialog buttons and show a spinner. On success, close the dialog and navigate to the review page at `/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/review`. On failure, show an error toast and dismiss the dialog so the staff member can retry.
