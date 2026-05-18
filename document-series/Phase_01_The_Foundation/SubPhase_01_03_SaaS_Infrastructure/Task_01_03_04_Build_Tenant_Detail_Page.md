# Task 01.03.04 — Build Tenant Detail Page

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.04 |
| Title | Build Tenant Detail Page |
| Working Directory | `frontend/` |
| Prerequisites | Task 01.03.01 (Django models), Task 01.03.03 (Tenant list page), Task 01.03.07 (tenant service layer providing suspend/reactivate endpoints) |
| Estimated Time | 3 hours |
| Status | [ ] Not Started |

---

## Objective

Build the tenant detail page at `/superadmin/tenants/[id]` that presents a complete operational view of a single tenant. This page displays the tenant's core identity (name, slug, status, logo), subscription information (plan name, billing dates, subscription status), recent invoices, and a list of active staff users. It also exposes administrative action buttons — Suspend, Reactivate, and Trigger Grace Period — that post to the Django API and immediately reflect the updated tenant state. All page data is fetched server-side from the Django API using the tenant UUID from the dynamic route segment.

---

## Instructions

### Step 1: Create the Dynamic Route Page File

Create the file `frontend/src/app/(superadmin)/tenants/[id]/page.tsx`. This is a Server Component — no `"use client"` directive. Export an async function as the default export. The function receives a `params` prop containing the `id` string (the tenant UUID from the URL segment).

### Step 2: Define TypeScript Interfaces

Define the TypeScript interfaces needed by this page. Create a `TenantDetail` interface that includes all fields from the tenant list interface (Task 01.03.03) plus the additional fields returned by the Django tenant detail endpoint:

- `grace_ends_at` (string ISO date or null)
- `custom_domain` (string or null)
- `settings` (an object with keys `currency`, `timezone`, `vatRate`, `ssclRate`, `receiptFooter`)
- `subscription` (an object with `id`, `plan_name`, `plan_id`, `status`, `current_period_start`, `current_period_end`, `next_billing_date`)
- `invoices` (an array of invoice objects, each with `id`, `invoice_number`, `amount`, `status`, `billing_date`)
- `users` (an array of user objects, each with `id`, `email`, `role`, `is_active`)

### Step 3: Fetch Tenant Data From the Django API

Inside the async page function, read the access token from cookies using the `cookies()` function from `next/headers`. Perform a server-side `fetch` to the Django API endpoint `GET /api/tenants/{id}/`, constructed from the `DJANGO_API_BASE_URL` environment variable and the `params.id` dynamic segment. Set the `Authorization: Bearer [access_token]` header and `cache: "no-store"`.

If the Django API returns 404 (tenant not found), call Next.js's `notFound()` function to render the built-in 404 page. If the response returns 401, call `redirect("/login")`. On any other error, render an error card with a message explaining that the tenant data could not be loaded.

On success, parse the JSON response body into the `TenantDetail` interface.

### Step 4: Build the Page Header

At the top of the returned JSX, render a breadcrumb navigation trail. The breadcrumb should show: "Super Admin" → "Tenants" → the tenant's name. Each segment except the last should be a `Link` to its respective page. The final segment (tenant name) is plain text. Use muted text colour and a right-pointing chevron separator between segments.

Below the breadcrumb, render the page title row. The left side contains the tenant's name as an `h1` in Inter Bold and the slug below it in muted monospace-style text. The right side contains the `TenantStatusBadge` component showing the tenant's current status with the same colour tokens defined in Task 01.03.03.

### Step 5: Build the Information Cards Grid

Below the header, render a responsive two-column grid using Tailwind's `grid grid-cols-1 md:grid-cols-2 gap-6`. Each card in the grid is a white `div` with a slate-200 border, rounded corners, and `p-6` padding.

**Tenant Identity Card:** Displays the tenant's name, slug, status badge, logo (if `logo_url` is present, show the image with a maximum width; otherwise show a placeholder grey box), created date formatted as a localised date string, and custom domain if set.

**Store Settings Card:** Displays the settings from the tenant's settings JSON field. Show currency, timezone, VAT rate (as a formatted percentage), SSCL rate (as a formatted percentage), and receipt footer text. Label each value with a muted descriptor.

**Subscription Card:** Displays the subscription plan name in Inter Bold (large), the subscription status as a badge, the current period start and end dates, and the next billing date. If the subscription's current period end date is within 7 days of today (compute this client-side or pass a boolean from the server), display a warning amber notice: "Billing cycle ends soon."

**Invoice History Card:** Renders a compact table of the tenant's most recent invoices (up to 10). Each row shows the invoice number, billing date, amount formatted as LKR with `Intl.NumberFormat`, and an invoice status badge. The invoice status badge uses: paid → green, unpaid → amber, overdue → red.

### Step 6: Build the Active Users Section

Below the grid, render a full-width card for the tenant's users. The heading is "Active Staff" in Inter Bold. Render a table with columns: Email, Role, and Status (active/inactive). The Role values from the Django API will be strings such as OWNER, MANAGER, CASHIER — display them in title case. The Status column shows a green "Active" badge or a muted "Inactive" badge depending on the `is_active` field.

If the tenant has no users (empty array), display a centred message "No staff accounts yet."

### Step 7: Build the Admin Actions Panel

Create the Client Component file `frontend/src/app/(superadmin)/tenants/[id]/_components/TenantAdminActions.tsx`. Add the `"use client"` directive. This component receives the tenant's `id`, current `status`, and the access token as props.

The component renders an "Administrative Actions" card with a danger-zone visual style (a subtle red left-border accent or a heading in danger red text). Inside the card, render the following action buttons:

- **Suspend Tenant**: Rendered as a danger red outlined button. Visible only when the current status is ACTIVE or GRACE_PERIOD. When clicked, the component calls a POST request to the Django endpoint `POST /api/tenants/{id}/suspend/` with the access token in the Authorization header. After a successful response, calls `router.refresh()` to trigger a server-side re-fetch of the page data.
- **Reactivate Tenant**: Rendered as a success green outlined button. Visible only when the current status is SUSPENDED or GRACE_PERIOD. Posts to `POST /api/tenants/{id}/reactivate/`.
- **Trigger Grace Period**: Rendered as a warning amber outlined button. Visible only when the current status is ACTIVE. Posts to `POST /api/tenants/{id}/grace-period/` with a grace period duration in days in the request body. After clicking, prompt the super admin for the number of grace days using a small inline number input before confirming the action.

Each button should show a loading spinner while the request is in flight. After any successful action, display a brief success toast or an inline green confirmation message. After any failed action, display a red inline error message with the error text returned by the Django API.

Add a confirmation modal (or an `AlertDialog` component from the component library) before executing Suspend and Trigger Grace Period actions, since these are impactful operations.

### Step 8: Compose the Full Page

Import the `TenantAdminActions` Client Component into the server page file. Pass the tenant `id`, `status`, and the access token (read from cookies) as props to the component. Place the actions panel below the invoice and users sections.

The complete page layout from top to bottom is: breadcrumb, title row, information cards grid, active users section, admin actions panel.

---

## Expected Output

After completing this task, the following artifacts exist:

- `frontend/src/app/(superadmin)/tenants/[id]/page.tsx` — Server Component that fetches and renders all tenant detail data.
- `frontend/src/app/(superadmin)/tenants/[id]/_components/TenantAdminActions.tsx` — Client Component with suspend, reactivate, and grace period action buttons.
- The tenant detail page shows a breadcrumb, title, four information cards (identity, settings, subscription, invoices), an active users table, and an administrative actions panel.

---

## Validation

- [ ] Navigating to `/superadmin/tenants/[valid-id]` renders the page with all tenant data populated.
- [ ] Navigating to `/superadmin/tenants/[invalid-id]` renders the Next.js 404 page.
- [ ] The TenantStatusBadge on the detail page uses the same colour tokens as on the list page.
- [ ] The subscription card displays a "Billing cycle ends soon" warning when the period end date is within 7 days.
- [ ] Clicking "Suspend Tenant" shows the confirmation modal before sending any request.
- [ ] After confirming suspension, the button shows a loading spinner, the request is sent to `POST /api/tenants/{id}/suspend/`, and the page refreshes to show the SUSPENDED status badge.
- [ ] The "Suspend Tenant" button is not rendered when the tenant is already SUSPENDED.
- [ ] The invoice amounts are formatted as LKR with the `Intl.NumberFormat` locale.
- [ ] Running `pnpm tsc --noEmit` produces zero TypeScript errors.

---

## Notes

- Passing the access token as a prop from the Server Component to the `TenantAdminActions` Client Component is an acceptable pattern when the token is already present in server-side cookies and needs to be forwarded for client-side API calls. Do not expose the token in any publicly rendered HTML attribute — pass it as a React prop, which is kept in the component's in-memory state.
- The `router.refresh()` call after a successful action is the Next.js App Router mechanism for re-running Server Component data fetching without a full page navigation. It is the preferred pattern for post-mutation updates when using Server Components for data fetching.
- The `TenantAdminActions` component should not hold a copy of the full tenant data in its own state. It only holds the tenant ID, current status (to control button visibility), and loading/error states for in-flight requests. All authoritative data lives in the Server Component.
- In a later phase, the admin actions panel will also include a "View Audit Log" link that opens a filtered view of the AuditLog table for this specific tenant. That link can be added as a placeholder in this task.
