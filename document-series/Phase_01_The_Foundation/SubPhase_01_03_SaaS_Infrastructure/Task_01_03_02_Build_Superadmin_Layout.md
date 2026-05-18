# Task 01.03.02 — Build Super Admin Layout

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.02 |
| Title | Build Super Admin Layout |
| Working Directory | `frontend/` |
| Prerequisites | Task 01.02.03 (Login page), Task 01.02.05 (Middleware auth guard), jose library installed |
| Estimated Time | 2 hours |
| Status | [ ] Not Started |

---

## Objective

Create the persistent shell that wraps every super-admin page in the LankaCommerce console. This layout provides a fixed dark navy sidebar containing the brand wordmark, navigation links, and a user footer, alongside a scrollable main content area with a slate-100 background. The layout is also responsible for the JWT role guard: it reads the access token from the request cookies, decodes the payload using the jose library, and confirms that the role claim equals SUPER_ADMIN before rendering any children. Any visitor without a valid super-admin token is immediately redirected to the login page.

---

## Instructions

### Step 1: Confirm the Route Group Structure

Inside the Next.js `frontend/src/app/` directory, verify that the super-admin route group exists. The route group should be structured as a folder named `(superadmin)` (with parentheses, so Next.js treats it as a layout group without affecting the URL path). Inside this group, the folder tree will eventually contain the dashboard, tenants list, and other super-admin pages.

If the folder does not yet exist, create `frontend/src/app/(superadmin)/` now. This group's layout file will be created in the following steps.

### Step 2: Implement the JWT Role Guard

Create the layout file at `frontend/src/app/(superadmin)/layout.tsx`. This file must be a Server Component (no `"use client"` directive at the top).

At the top of the file, import the `cookies` function from `next/headers` and the `jwtVerify` or `decodeJwt` functions from the `jose` library. Import `redirect` from `next/navigation`.

Inside the layout's exported async function, call `cookies()` to obtain the cookie store, then read the value of the cookie named `access_token`. If this cookie is absent or contains an empty string, call `redirect("/login")` immediately.

Next, decode the JWT payload. Use the `jose` library's `decodeJwt` function (for signature-less payload inspection, acceptable here because the Django API will enforce the token on every subsequent data request) or use `jwtVerify` with the JWT secret from the `JWT_SECRET` environment variable for full verification. Extract the `role` claim from the decoded payload.

If the `role` claim is not present, or if its value does not equal the string `"SUPER_ADMIN"`, call `redirect("/login")`. Do not render any layout content for unauthorised visitors.

If the role check passes, proceed to render the layout markup.

### Step 3: Define the Root Container

The outermost element returned by the layout is a `div` (or equivalent semantic element) that spans the full screen height and uses a horizontal flex layout. The Tailwind classes for this container are `h-screen overflow-hidden flex`. The `overflow-hidden` on the outer container ensures that the sidebar stays fixed in height while the main content area scrolls independently.

### Step 4: Build the Fixed Sidebar

Inside the root container, add the sidebar element. The sidebar is a `nav` or `aside` element with Tailwind classes that produce: a fixed width of `w-60`, full height `h-full`, a navy background colour matching `#1B2B3A` (use the custom navy colour from the Tailwind config or an arbitrary value class), a flex column layout `flex flex-col`, and no horizontal shrinking `flex-shrink-0`.

The sidebar contains three vertical sections stacked from top to bottom: the wordmark section, the navigation section, and the user footer section. The navigation section should grow to fill available space using `flex-1` so that the footer stays pinned to the bottom of the sidebar.

### Step 5: Build the Wordmark Section

At the top of the sidebar, add a wordmark section. This section contains the brand name "LankaCommerce" displayed in Inter Bold weight. Apply white text colour. Add horizontal and vertical padding consistent with the rest of the sidebar.

Below the wordmark text, add a narrow horizontal rule or a `div` with a height of 1 pixel and an orange background colour (`#F97316`) that spans the full width of the sidebar. This orange line acts as a subtle accent divider between the wordmark and the navigation links.

Do not use any icon, logo image, or decorative typeface. The wordmark is purely the text "LankaCommerce" in Inter Bold.

### Step 6: Extract Navigation Into a Client Component

Create a new file at `frontend/src/app/(superadmin)/_components/SuperAdminNav.tsx`. This component must be a Client Component because it uses the `usePathname` hook from `next/navigation` to determine the active navigation item.

Add the `"use client"` directive at the top of this file.

Define an array of navigation items. Each item has a `label` (human-readable string), an `href` (the path string), and an optional `icon` (a Lucide React icon component). The navigation items for this sub-phase are:

- Dashboard — href `/superadmin`
- Tenants — href `/superadmin/tenants`
- System Health — href `/superadmin/health`

Inside the component, call `usePathname()` to get the current path string. For each navigation item, determine whether the item is active by checking whether the current pathname starts with the item's href (or exactly equals it for the dashboard root).

For each navigation item, render an anchor or `Link` element. Apply base styles for padding, text colour (white), and font weight. When the item is active, apply an orange left border (use `border-l-4` and an orange border colour), a slightly lighter navy background fill (a few shades lighter than the base sidebar navy, achievable via an arbitrary Tailwind value or a custom colour token), and bold font weight. When the item is hovered but not active, apply orange text colour.

Export this component as the default export.

### Step 7: Import Navigation Into Server Layout

Return to the main `layout.tsx` file. Import the `SuperAdminNav` component from its path and place it inside the sidebar's flex-1 growing section, between the wordmark section and the user footer section.

### Step 8: Build the Sidebar Footer

At the bottom of the sidebar, add a footer section. This section should display the email address of the currently logged-in super admin, derived from the decoded JWT payload. Display the email in a small, muted style (white text at reduced opacity or a lighter grey tone, `text-xs`).

Below the email, render a "Log out" button. This button must be a Client Component or use a form action because it performs an interactive operation. Create a small `LogoutButton.tsx` component at `frontend/src/app/(superadmin)/_components/LogoutButton.tsx`.

The logout button, when clicked, performs the following sequence:

1. Sends a POST request to the Django backend endpoint at `POST /api/auth/logout/` with the current refresh token (read from the `refresh_token` cookie) in the request body. This call blacklists the refresh token on the Django side.
2. Sends a request (or calls a Next.js Server Action) to clear both the `access_token` and `refresh_token` cookies from the browser.
3. Uses `window.location.href` or Next.js's `router.push` to redirect the user to `/login`.

The logout button should display a small exit icon (Lucide's `LogOut` icon) alongside the text "Log out". Apply white text colour and an orange hover colour. Keep the button visually minimal — no background fill in its default state.

Pass the decoded email and refresh token (as props or via context) from the server layout down to the client `LogoutButton` component.

### Step 9: Build the Main Content Area

After the sidebar in the root container, add the main content element. This element should use the classes `flex-1 overflow-y-auto` to grow and scroll independently of the sidebar. Apply the slate-100 background colour (`bg-slate-100` or the equivalent `#F1F5F9` arbitrary value). Add `p-6` padding so that page content is not flush against the edges.

Inside the main content area, render `{children}` so that individual super-admin pages are displayed here.

### Step 10: Add a Desktop-Only Notice

The super-admin console is designed for desktop use only. On smaller screens (below the `md` Tailwind breakpoint), show a warning banner instead of the full layout. Add a `div` with the class `md:hidden` that renders a full-screen message explaining that the LankaCommerce admin console requires a desktop browser. This banner should have a navy background, white centred text, and the LankaCommerce wordmark at the top.

Wrap the main layout content (root container with sidebar and main area) in a `div` with the class `hidden md:flex` so it only appears on medium and larger screens.

---

## Expected Output

After completing this task, the following artifacts exist:

- `frontend/src/app/(superadmin)/layout.tsx` — Server Component that performs the JWT role guard and renders the shell layout.
- `frontend/src/app/(superadmin)/_components/SuperAdminNav.tsx` — Client Component with active state navigation using usePathname.
- `frontend/src/app/(superadmin)/_components/LogoutButton.tsx` — Client Component that calls the Django logout endpoint, clears cookies, and redirects.
- The super-admin layout renders a navy sidebar (width 240px), white wordmark text "LankaCommerce", an orange accent line below the wordmark, white navigation links with orange active indicators, and a slate-100 main content area.

---

## Validation

- [ ] Navigating to `/superadmin` without any cookies in the browser redirects to `/login`.
- [ ] Navigating to `/superadmin` with a cookie containing a JWT whose role claim is `STAFF` redirects to `/login`.
- [ ] Navigating to `/superadmin` with a valid `SUPER_ADMIN` JWT cookie renders the layout without redirecting.
- [ ] The sidebar background is visually dark navy, not black.
- [ ] The wordmark reads "LankaCommerce" in bold Inter font. No serif or display font is used.
- [ ] The orange accent line appears directly below the wordmark.
- [ ] Clicking "Tenants" in the navigation while on the tenants page shows the orange left border active indicator.
- [ ] Clicking "Log out" clears the auth cookies and redirects to `/login`.
- [ ] On a viewport narrower than 768px, the full layout is hidden and the desktop-only notice is visible.
- [ ] Running `pnpm tsc --noEmit` inside `frontend/` produces zero TypeScript errors related to the new layout files.

---

## Notes

- The jose library's `decodeJwt` function does not verify the token signature — it only parses the payload. This is acceptable for the role check in the layout because the Django API will independently verify the token's signature on every data request. If you want to perform client-side signature verification for added defence in depth, use `jwtVerify` with the HS256 algorithm and the shared secret from the `JWT_SECRET` environment variable.
- Do not read the `JWT_SECRET` environment variable value on the client side or expose it in any publicly bundled file. It must only be used in Server Components and Server Actions.
- The email displayed in the sidebar footer is read from the JWT payload's `email` claim and is not fetched from the Django API. This avoids an extra round-trip on every page load and is acceptable since the email is already embedded in the token at login time.
- If the `jose` library is not yet installed, add it by running `pnpm add jose` inside the `frontend/` directory.
- The `(superadmin)` route group parentheses ensure that the group name does not appear in any URL. Pages inside this group will be served at paths beginning with `/superadmin/`, not `/(superadmin)/superadmin/`.
