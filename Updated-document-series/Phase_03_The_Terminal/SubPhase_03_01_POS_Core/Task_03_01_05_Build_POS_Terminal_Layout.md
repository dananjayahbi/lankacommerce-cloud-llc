# Task 03.01.05 — Build POS Terminal Layout

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.05 |
| Task Name | Build POS Terminal Layout |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_04 |
| Output Files | `frontend/app/dashboard/[tenantSlug]/pos/layout.tsx`, `frontend/app/dashboard/[tenantSlug]/pos/page.tsx`, `frontend/components/pos/ShiftOpenModal.tsx`, `frontend/components/pos/ShiftCloseModal.tsx` |

---

## Objective

Build the special full-screen POS terminal layout that replaces the standard dashboard sidebar and top navigation bar, enforce the shift-gate access pattern (showing `ShiftOpenModal` fullscreen whenever no open shift exists), define the two-panel responsive grid structure separating the product area from the cart panel, and build the shift open and close modal components.

---

## Step 1 — Create the POS Layout Server Component

Create `frontend/app/dashboard/[tenantSlug]/pos/layout.tsx` as a Next.js server component. This layout component overrides the standard dashboard layout for all routes under the `/pos/` path segment, meaning it will be used by both the main POS terminal page and the sale history page.

Begin the layout by calling `getAuthFromCookies()` from `frontend/lib/auth.ts` to retrieve the authenticated user's JWT. If no valid JWT is present, redirect immediately to the application's login page using Next.js's `redirect()` function from `next/navigation`. Do not render any content before performing this check.

Extract the `tenantSlug` parameter from the route params. Call the Django backend at `GET /api/accounts/tenants/?slug={tenantSlug}` to resolve the slug to a tenant record and retrieve the `tenant_id`. If the tenant cannot be found, redirect to the login page.

Perform an RBAC check confirming the user has the `pos:access` permission, using the `hasPermission` utility function established in Phase 01. The user's permissions are carried as claims in the JWT. If the user lacks `pos:access`, redirect to `/dashboard/[tenantSlug]` — the standard dashboard home page — rather than returning an HTTP 403 error. This is a deliberate UX decision: a cashier who navigates to the wrong URL returns to safe ground with a familiar page rather than encountering a confusing error screen.

After the RBAC check, call `GET /api/pos/shifts/?cashier_id={user_id}&status=OPEN&tenant_id={tenantId}` to check whether the current user has an open shift. This maps to the `get_current_shift` service function on the backend. If the response indicates no open shift exists, render a full-screen wrapper containing only `ShiftOpenModal`. No product grid, no cart panel, and no navigation elements should be visible behind the modal — the terminal is entirely gated until a shift is opened. If an open shift does exist, render the full layout wrapper containing the two-panel structure and `{children}`.

Pass the shift data (particularly the `shift_id` and `opened_at` timestamp) to the client-side components via a React context provider or as props to the page component. The `shift_id` is needed by multiple child components including `CartPanel`, `HoldSaleButton`, and `ShiftCloseModal`.

---

## Step 2 — Define the Two-Panel Layout Structure

The outermost layout container must fill the entire viewport using `height: 100dvh`. The `dvh` (dynamic viewport height) unit is used instead of `vh` (viewport height) because `100vh` on mobile browsers — particularly iOS Safari — includes the browser's address bar height, causing the layout to extend beneath the address bar and making the bottom action buttons unreachable. `100dvh` dynamically adjusts as the browser address bar appears and disappears during scrolling, ensuring the POS terminal always fits correctly on screen regardless of the mobile browser's chrome state.

Set `overflow: hidden` on the outermost container to prevent the browser from showing any scroll affordance. The navy colour (#1B2B3A) should be the background of this outermost container — it fills any small gaps between panels during viewport resizing and gives the terminal a cohesive dark border appearance.

The interior of the container uses `display: flex` with `flex-direction: row`. Two child panels sit side by side on desktop. The left panel occupies approximately 63% of the available width and houses the POS-specific top bar, search input, category tabs, and product grid. The right panel occupies approximately 37% of the available width and houses the `CartPanel`. On viewports narrower than 768px, the panels switch to `flex-direction: column` using a responsive breakpoint, stacking the cart panel below the product grid — this supports tablet-based deployments where the cashier uses a single vertical screen.

The right panel must not scroll with the left panel. Set the right panel to `overflow: hidden` and apply its own internal scrollable container for the cart line items list. The left panel may scroll internally within the product grid area but the top bar and search strip should remain fixed.

---

## Step 3 — Design the POS-Specific Top Bar

Render a slim top bar approximately 48 pixels in height spanning the full width of the terminal. Apply a navy (#1B2B3A) background. The top bar contains three layout zones.

On the left side, display the LankaCommerce wordmark or, if the tenant has a custom store name configured, display the store name. Use Inter font in a small size in border colour (#E2E8F0) to keep the display understated and consistent with the dark navy background.

In the centre, display a compact shift status indicator. This indicator must show the cashier's first name and a live elapsed-time counter showing how long the current shift has been open. For example: "Priya — Shift open 2h 14m". The elapsed time display is a client component that re-renders on a one-minute interval using `setInterval` and derives its value from the `opened_at` timestamp passed down from the layout server component. Use Inter 13px in text-muted (#64748B) colour for the shift indicator text.

On the right side, render two icon buttons. The first is a "History" icon button (such as a clock or list icon) that navigates to `/dashboard/[tenantSlug]/pos/history`. The second is a "Close Shift" icon button (such as a power or door icon) that opens `ShiftCloseModal`. Icon buttons use text-muted (#64748B) as their default colour and transition to surface (#FFFFFF) on hover. Both buttons should have a tooltip on hover showing the action name.

---

## Step 4 — Build the ShiftOpenModal

Create `frontend/components/pos/ShiftOpenModal.tsx` as a client component. This component renders as an absolutely positioned full-screen overlay with a navy (#1B2B3A) background at `z-index: 50` (or any value above the normal terminal z-index stack). The overlay covers the entire viewport.

Critically, this modal must provide no dismiss mechanism. It must not close when the user presses Escape. It must not close when the user clicks outside the card. These interactions are suppressed by not using ShadCN's standard Dialog component (which implements overlay-dismiss by default) and instead building a simple `<div>` overlay with the modal card centred using Flexbox. If you do use a ShadCN Dialog, configure `onPointerDownOutside={(e) => e.preventDefault()}` and `onEscapeKeyDown={(e) => e.preventDefault()}` to suppress the dismiss behaviour.

Centre a white surface card on the overlay. The card is approximately 400px wide with 32px padding. The card contains: the LankaCommerce wordmark or store name at the top in Inter 20px navy; a subtitle "Open Your Shift" in Inter 14px text-muted; a brief instructional paragraph in Inter 13px text-muted reading something like "Enter the opening cash float — the amount of cash in the till at the start of your shift."; a numerical input field for the opening float with a "Rs." prefix label, a border (#E2E8F0) border that transitions to orange (#F97316) on focus, and `step="0.01"` to allow two decimal places; and a full-width "Start Shift" primary button with a navy background and white Inter text.

When the cashier clicks "Start Shift", set the button to a loading state (showing a spinner and disabling the button to prevent double submission) and send a `POST` to `POST /api/pos/shifts/` with the `opening_float` value. On success, call `router.refresh()` from `next/navigation` to re-execute the layout server component. The server component will now find an open shift, causing the full POS terminal to render in place of the modal.

On a `ConflictError` response (indicating a concurrent shift already exists, perhaps opened on another device), display an inline error message in danger (#EF4444) below the button without navigating away. The cashier should contact their manager to resolve the conflict. Do not re-enable the button until the input field has been changed.

---

## Step 5 — Build the ShiftCloseModal

Create `frontend/components/pos/ShiftCloseModal.tsx` as a client component using a ShadCN Dialog component. The dialog is triggered by the "Close Shift" icon button in the POS top bar.

Before showing the closing cash count input, perform a preliminary data fetch when the modal opens. Query `GET /api/pos/sales/?shift_id={shiftId}&status=OPEN` to count any held (OPEN) sales that currently exist for this shift. While this query is in flight, show a loading skeleton inside the modal body. If the count of held sales is greater than zero, display a prominent amber warning banner: "You have [N] held sale(s) that will be cancelled when you close this shift. Retrieve and complete or discard them before closing." The banner appears at the top of the modal body above all other content. Include a "Return to Terminal" button within the banner that closes the dialog and returns focus to the terminal, allowing the cashier to retrieve and process the held sales. The modal does not block closing despite this warning — a manager can choose to proceed and the service layer will void the held sales automatically.

Below the warning banner (or directly as the modal body content when no held sales exist), render: a numerical input labelled "Count your till and enter total cash" with a "Rs." prefix and two decimal places; a live preview section showing the expected cash amount and projected discrepancy, computed from data fetched via `GET /api/pos/shifts/{id}/` or derived from values passed via props from the layout component; an optional notes textarea (maximum 500 characters) for end-of-shift observations.

The "Close Shift & Reconcile" button at the bottom of the dialog calls `POST /api/pos/shifts/{id}/close/` with the entered `closing_cash_count` and optional `notes`. Show a loading state on the button during the API call. On success, show a success toast notification, then redirect the user to `/dashboard/[tenantSlug]` using `router.push`. On error, display the error message inline below the button and re-enable the button.

---

## Expected Output

After this task, the POS terminal layout renders correctly at `/dashboard/[tenantSlug]/pos`. When no open shift exists, only `ShiftOpenModal` is visible. When a shift is open, the two-panel layout with product area and cart panel renders. The POS-specific top bar with cashier name, elapsed shift time, and action buttons is visible. `ShiftCloseModal` opens from the top bar and correctly handles both the held-sales warning case and the normal close flow.

---

## Notes

The decision to use `100dvh` rather than `100vh` is deliberate and important. On iOS Safari and Android Chrome, `100vh` is computed at the time the page loads and does not update when the browser's address bar appears or disappears. This causes the bottom action buttons in the cart panel to be hidden beneath the browser chrome on mobile devices. The `dvh` unit resolves this correctly.

The 63/37 panel split is informed by retail usability research: cashiers scan or search for products rapidly, so the product area benefits from more horizontal space; the cart panel needs enough width to display product names, variant descriptions, quantities, and totals without truncation. These proportions work well on standard 1080p cashier monitors and 12-inch tablets alike.

The POS terminal intentionally omits all standard dashboard navigation elements — no breadcrumbs, no sidebar, no back button, no global navigation bar. The terminal is a focused, single-purpose interface. Navigation to other parts of the dashboard is available only via the "History" link and the post-close redirect, which are deliberate exit points with clear intent.
