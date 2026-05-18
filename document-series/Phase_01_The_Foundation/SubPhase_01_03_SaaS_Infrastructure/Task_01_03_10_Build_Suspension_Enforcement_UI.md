# Task 01.03.10 — Build Suspension Enforcement UI

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.10 |
| Title | Build Suspension Enforcement UI |
| Working Directory | `frontend/` |
| Prerequisites | Task 01.03.09 (middleware redirecting SUSPENDED tenants to /suspended, GRACE_PERIOD tenants receiving x-grace-period header) |
| Estimated Time | 2 hours |
| Status | [ ] Not Started |

---

## Objective

Build two pieces of suspension enforcement UI: a full-page suspension screen shown to users of suspended tenants, and a persistent grace period warning banner shown to users of tenants in grace period. The suspension page gives the tenant's users clear information about their account status, shows any outstanding invoice, and provides a path to contact support or resolve the payment. The grace period banner is mounted non-intrusively at the top of the store layout and urges users to renew before suspension occurs.

---

## Instructions

### Step 1: Create the Suspended Page Route

Create the file `frontend/src/app/suspended/page.tsx`. This page sits outside the store route group and outside the super-admin route group, at the root application level. This placement is critical: the page must not be wrapped by the store layout (which could itself try to check tenant status, causing a redirect loop) or by the super-admin layout (which requires a SUPER_ADMIN role).

This file is an async Server Component. It reads data from cookies and the Django API, then renders the suspension screen.

### Step 2: Build the Suspension Overlay Layout

The page's root element is a `div` that fills the entire viewport and centres its content. Apply Tailwind classes for: `min-h-screen`, `bg-slate-100`, `flex`, `flex-col`, `items-center`, `justify-center`, and `p-6`. The slate-100 background (`#F1F5F9`) provides a clean, light surface distinct from both the dark navy sidebar and the white card backgrounds.

Inside the root div, render a centred content card. The card is a white div with `rounded-2xl`, `shadow-lg`, `border border-slate-200`, `p-8`, and a maximum width of `max-w-lg`. All suspension content renders inside this card.

### Step 3: Render the LankaCommerce Brand Element

At the top of the content card, render the brand name. The brand element is the text "LankaCommerce" in Inter Bold, navy colour, and a large font size (text-2xl or text-3xl). Centre-align it horizontally. Add a small bottom margin to separate it from the icon below.

Do not use a logo image in this version. The wordmark alone is sufficient to establish brand identity on this page.

### Step 4: Render the Suspension Icon and Heading

Below the brand element, render a centred danger icon. Use Lucide React's `AlertTriangle` icon with a large size (48×48px or 64×64px) and apply the danger red colour (`#EF4444`). Add a bottom margin below the icon.

Below the icon, render the heading "Your Account Has Been Suspended" as an `h1` element in Inter Bold, a large font size, dark navy or slate-900 text colour, and centre alignment.

Below the heading, render a paragraph of explanatory body text: "Access to your LankaCommerce store has been suspended. This may be due to an outstanding payment or a violation of our terms of service. Please resolve the issue below or contact our support team." Style this paragraph in muted text colour (slate-500), normal font weight, and centre alignment.

### Step 5: Fetch the Outstanding Invoice From the Django API

Inside the async page function, read the access token from the `access_token` cookie using `cookies()` from `next/headers`. Also attempt to read the `tenant_id` from the decoded JWT payload using `decodeJwt` from `jose`.

If the tenant ID is available, perform a server-side `fetch` to the Django API endpoint for unpaid invoices. The endpoint URL pattern should be `GET /api/tenants/{tenant_id}/invoices/?status=UNPAID`, constructed from the `DJANGO_API_BASE_URL` environment variable. Set the `Authorization: Bearer [access_token]` header and `cache: "no-store"`.

If the fetch is successful and returns one or more invoices, extract the most recent unpaid invoice from the response. Store it for rendering in the next step. If the fetch fails or returns an empty array, continue rendering without invoice data.

### Step 6: Display the Outstanding Invoice Card

If an unpaid invoice was found in Step 5, render an invoice information card inside the main content card. Apply a warning amber border (border-amber-300 or equivalent), a faint amber background tint, rounded corners, and padding.

Inside the invoice card, display:

- A heading "Outstanding Balance" in Inter Medium, amber text colour.
- The invoice number in a small muted font.
- The invoice amount formatted as LKR currency using `Intl.NumberFormat` with the `en-LK` locale and `LKR` currency style. Render the formatted amount in a large, bold font with amber text.
- The billing date formatted as a localised date string.
- A note: "Please settle this invoice to restore access to your store."

### Step 7: Add Contact and Payment Instructions

Below the invoice card (or below the explanation paragraph if no invoice was found), render an action section. The action section contains:

- A primary button labelled "Contact Support" in orange background (`#F97316`), white text, Inter Medium font, rounded corners, and horizontal padding. This button is an anchor tag with `href="mailto:support@lankacommerce.lk"`. Add the `MailIcon` from Lucide React to the left of the button text.
- Below the button, a smaller muted text line: "Or call us at +94 11 XXX XXXX" (use a placeholder phone number that can be updated in Phase 5).

Centre both elements horizontally within the card.

### Step 8: Ensure the /suspended Path Bypasses Middleware Tenant Checks

Open `frontend/src/middleware.ts`. Verify that the middleware's store route matcher from Task 01.03.09 explicitly excludes the `/suspended` path. If the `/suspended` path is included in the matcher, a suspended tenant's users would be redirected to `/suspended` and then the middleware would run again on the `/suspended` page request, attempting another tenant check, creating a redirect loop.

Confirm that either the middleware's path exclusion logic in Step 3 of Task 01.03.09 covers `/suspended`, or that the middleware `config.matcher` excludes it. Test this by verifying that a direct browser navigation to `/suspended` does not trigger a further redirect.

### Step 9: Create the GracePeriodBanner Component

Create the file `frontend/src/components/GracePeriodBanner.tsx`. This is a Client Component — add the `"use client"` directive. The component is a dismissable warning banner.

The component renders a horizontal banner bar with:

- A warning amber background (`#F59E0B` or `bg-amber-500` — use a tint or the full amber).
- Left-aligned content: a `AlertTriangle` icon from Lucide React in amber, followed by bold text "Your account is in a grace period." and regular-weight text "Please renew your subscription to avoid suspension."
- If a `graceEndsAt` prop is provided (an ISO date string), append to the body text: "Access will be suspended on [formatted date]."
- A right-aligned "Resolve Now" link that is an anchor tag styled as a small white outlined button. The `href` should point to a billing or account management page (use `/settings/billing` as a placeholder for the current phase).
- A dismiss button (`X` icon from Lucide) at the far right that hides the banner when clicked. Store the dismissed state in React's `useState` hook. Once dismissed, the banner does not reappear within the same browser session (use `sessionStorage` to persist the dismissed state across page navigations within the session).

Export the component as the default export.

### Step 10: Mount GracePeriodBanner in Store Layout

Open the store route group's layout file (likely `frontend/src/app/(store)/layout.tsx` or the equivalent path established in SubPhase 01.01). This is a Server Component.

Import the `headers` function from `next/headers`. At the top of the layout function body, read the `x-grace-period` header from the request headers using `headers().get("x-grace-period")`. Also read the `x-grace-ends-at` header for the grace end date.

If the `x-grace-period` header value is `"true"`, render the `GracePeriodBanner` component at the very top of the layout output, above all other content including the navigation bar. Pass the `graceEndsAt` value (from the `x-grace-ends-at` header) as a prop.

If the header is absent or its value is not `"true"`, do not render the banner.

Because `GracePeriodBanner` is a Client Component and the store layout is a Server Component, the banner will be hydrated and made interactive (dismissable) on the client after the initial server render.

---

## Expected Output

After completing this task, the following artifacts exist:

- `frontend/src/app/suspended/page.tsx` — Server Component rendering the full suspension screen with the LankaCommerce brand, danger icon, explanation, optional invoice card, and contact button.
- `frontend/src/components/GracePeriodBanner.tsx` — dismissable amber warning banner Client Component.
- The store layout mounts the GracePeriodBanner when the `x-grace-period: true` header is present.
- Navigating to `/suspended` (as a suspended tenant's user) shows the suspension screen without a redirect loop.
- Store pages for GRACE_PERIOD tenants show the amber banner at the top of every page.

---

## Validation

- [ ] Navigating directly to `/suspended` renders the suspension page without redirecting again.
- [ ] The suspension page shows the "LankaCommerce" brand, the AlertTriangle danger icon, and the "Your Account Has Been Suspended" heading.
- [ ] The suspension page shows an outstanding invoice card (with amber border and formatted LKR amount) when an UNPAID invoice exists.
- [ ] The "Contact Support" button has an orange background and links to `mailto:support@lankacommerce.lk`.
- [ ] A store route request for a GRACE_PERIOD tenant renders the GracePeriodBanner at the top of the page.
- [ ] The GracePeriodBanner shows the grace end date when the `x-grace-ends-at` header is present.
- [ ] Clicking the dismiss button on the GracePeriodBanner hides it, and navigating to another store page does not bring it back within the same session.
- [ ] Running `pnpm tsc --noEmit` produces zero TypeScript errors.

---

## Notes

- The suspension page intentionally fetches invoice data server-side rather than rendering a client-side loading state. Suspended users are not expected to be performing real-time operations, so the slight additional server-side latency of the invoice fetch is acceptable and produces a better first-render experience than a loading spinner.
- The `x-grace-period` and `x-grace-ends-at` headers are set by the Next.js middleware and are available to Server Components via the `headers()` function. They are not exposed to the browser as response headers visible to the end user. This is intentional to prevent client-side manipulation.
- If the invoice fetch in Step 5 fails (for example, because the Django server is temporarily unreachable), the suspension page should still render completely — just without the invoice card. Never block the entire suspension page render on the invoice fetch.
- The GracePeriodBanner uses `sessionStorage` (not `localStorage`) for the dismissed state so that the banner reappears in a new browser session. This ensures users are reminded of the grace period on their next login even if they dismissed the banner in a previous session.
