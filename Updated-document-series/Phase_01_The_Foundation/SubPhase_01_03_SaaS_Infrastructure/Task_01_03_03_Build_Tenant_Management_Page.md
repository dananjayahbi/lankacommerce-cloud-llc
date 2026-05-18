# Task 01.03.03 — Build Tenant Management Page

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.03 |
| Title | Build Tenant Management Page |
| Working Directory | `frontend/` |
| Prerequisites | Task 01.03.01 (Django tenant models), Task 01.03.02 (super-admin layout), Django API running on port 8000 |
| Estimated Time | 3 hours |
| Status | [ ] Not Started |

---

## Objective

Build the paginated, searchable, and filterable tenant list page at `/superadmin/tenants`. This page is the primary management surface for the LankaCommerce platform operator. It shows all tenant stores with their current subscription status, provides controls for filtering by status and searching by name or slug, and links to each tenant's detail page. All data is fetched server-side from the Django API, keeping the page performant and SEO-ready without any client-side loading states for the initial render.

---

## Instructions

### Step 1: Create the Page File

Create the file `frontend/src/app/(superadmin)/tenants/page.tsx`. This is a Next.js Server Component — do not add a `"use client"` directive. The file exports an async function as its default export. The function receives a `searchParams` prop from Next.js, which contains the URL query string parameters.

Because this is the tenant list page, it will receive query parameters such as `search`, `status`, `page`, and `limit`. These parameters are passed through to the Django API to implement server-side filtering and pagination.

### Step 2: Define the Search Params Interface

Near the top of the page file, define a TypeScript interface describing the expected search parameters. The interface should declare:

- `search` as an optional string, representing the search query for tenant name or slug.
- `status` as an optional string, representing the TenantStatus enum value to filter by.
- `page` as an optional string (not number — Next.js searchParams values are always strings).
- `limit` as an optional string.

Define a second TypeScript interface for a single tenant record as returned by the Django API. This interface should include: `id` (string UUID), `name` (string), `slug` (string), `status` (string matching one of the TenantStatus enum values), `created_at` (string ISO date), `logo_url` (string or null), and a nested `subscription` object with `plan_name` (string) and `status` (string).

Define a third interface for the paginated response shape from the Django API, which includes `results` (array of tenant records), `count` (total number of matching records), `next` (nullable URL string), and `previous` (nullable URL string). Django REST Framework's built-in pagination returns this shape by default.

### Step 3: Fetch Tenant Data From the Django API

Inside the async page function, before rendering any markup, fetch the tenant list from the Django backend.

First, read the current access token from the request cookies using the `cookies()` function imported from `next/headers`. Store it as a string variable.

Next, construct the query string by reading the relevant search parameters from the `searchParams` prop. Append each non-empty parameter to a URLSearchParams object: `search`, `status`, `page`, and `limit`. Use a default page of 1 and a default limit of 20 if not provided.

Perform a server-side `fetch` call to the Django API URL, constructed by joining the `DJANGO_API_BASE_URL` environment variable (read via `process.env.DJANGO_API_BASE_URL`) with the path `/api/tenants/` and the query string. Set the `Authorization` header to `Bearer [access_token]`. Set the `cache` option to `no-store` so that the page always reflects the latest tenant data without serving a stale cached response.

If the fetch response status is 401, call `redirect("/login")`. If the response is not ok for any other reason, render a user-friendly error message. If the response is successful, parse the JSON body into the paginated response interface.

### Step 4: Build the Page Header

At the top of the returned JSX, render the page header. The header contains:

- An `h1` element with the text "Tenants" styled in Inter Bold, a large font size, and navy or dark text colour (text-slate-900 or equivalent).
- A subtitle paragraph with the text "Manage all LankaCommerce retail store tenants." styled in a muted colour.
- A `Link` component pointing to `/superadmin/tenants/new` that visually appears as a button. Apply an orange background (`#F97316`), white text, Inter Medium font, rounded corners, and horizontal padding. Include a plus icon (Lucide's `Plus` icon) to the left of the text "New Tenant".

Lay out the header so that the title and subtitle stack vertically on the left, and the "New Tenant" button aligns to the right of the same row.

### Step 5: Build the Search and Filter Controls as a Client Component

The search input and status filter require interactivity (updating the URL on user input), so they must be extracted into a Client Component.

Create the file `frontend/src/app/(superadmin)/tenants/_components/TenantFilters.tsx`. Add the `"use client"` directive at the top.

The component accepts the current search value and current status filter value as props, so the server can pre-populate the controls on first render from the URL parameters.

Inside the component:

- Import `useRouter` and `usePathname` from `next/navigation` and `useCallback` from React.
- Render a search input with a magnifying glass icon. Use a debounced `onChange` handler (300ms debounce is sufficient) that updates the `search` query parameter in the URL using `router.push` with the updated URLSearchParams string. Reset to page 1 when the search changes.
- Render a status select/dropdown with options: All Statuses, Active, Grace Period, Suspended, and Cancelled. Map each option to the corresponding TenantStatus string value or an empty string for "All". Use an `onChange` handler that updates the `status` query parameter in the URL.

Both controls should read their initial values from the props passed by the server page component so that the browser displays the current filters on render without requiring a client-side effect.

### Step 6: Build the Tenant Data Table

Below the filters component, render the tenant data table using the fetched results array.

The table element should span the full width with a white (`bg-white`) background, rounded corners, and a slate-200 border (`border border-border`). Use a standard HTML table with a `thead` and `tbody`.

The table header row should contain these columns: Store Name, Slug, Plan, Status, Created, and Actions. Apply a subtle background to the header row (slate-50) and use medium-weight Inter for column labels.

For each tenant in the results array, render a `tr` element. In the cells:

- **Store Name**: Show the tenant's `name` in bold. Below it, show the `logo_url` as a small image if present, or a placeholder icon if absent.
- **Slug**: Show the slug in a monospace-style cell with muted text.
- **Plan**: Show the subscription's `plan_name` string.
- **Status**: Render a `TenantStatusBadge` component (defined in the next paragraph) with the tenant's status string.
- **Created**: Format the `created_at` date using `Intl.DateTimeFormat` with locale `en-LK` and a short date format.
- **Actions**: Render a `Link` to `/superadmin/tenants/[id]` with the text "View" styled as a small navy text button or a subtle outlined button.

Create the `TenantStatusBadge` component at `frontend/src/components/TenantStatusBadge.tsx`. This component accepts a `status` string prop and returns a small badge `span` element. Apply badge styles based on the status value using the following mappings:

- ACTIVE: success green background tint, green text (`#22C55E` family).
- GRACE_PERIOD: warning amber background tint, amber text (`#F59E0B` family).
- SUSPENDED: danger red background tint, red text (`#EF4444` family).
- CANCELLED: slate background tint, muted text (`#64748B`).

Display the status string in the badge with spaces replacing underscores for readability.

### Step 7: Build Server-Side Pagination Controls

Below the data table, render a pagination control row that shows the current page range and provides "Previous" and "Next" buttons.

Because this is a Server Component, pagination works by rendering `Link` components that update the `page` query parameter in the URL, triggering a new server-side render with the next page of data.

Compute the total number of pages by dividing the `count` from the API response by the page limit. Compute the current page number from the `searchParams.page` value, defaulting to 1.

Show a label such as "Showing 1–20 of 142 tenants" (where the numbers are computed from the current page and total count). 

Render a "Previous" `Link` that decrements the page by 1, disabled (rendered as a non-interactive span) if on page 1. Render a "Next" `Link` that increments the page by 1, disabled if on the last page. Both links preserve the current `search` and `status` query parameters.

### Step 8: Note the Absence of a Next.js API Route

There is no Next.js Route Handler file for the tenant list in this task. The page communicates directly with the Django API endpoint at `GET /api/tenants/`. No intermediary is needed. The Django DRF view handles authentication (via the Bearer token), filtering, ordering, and pagination. This simplifies the Next.js codebase and ensures a single source of truth for tenant data logic.

---

## Expected Output

After completing this task, the following artifacts exist:

- `frontend/src/app/(superadmin)/tenants/page.tsx` — Server Component that fetches tenant data from Django and renders the full list page.
- `frontend/src/app/(superadmin)/tenants/_components/TenantFilters.tsx` — Client Component with debounced search input and status dropdown.
- `frontend/src/components/TenantStatusBadge.tsx` — Reusable badge component used here and on other pages.
- The tenant management page renders with: a header containing the "LankaCommerce" super-admin wordmark (from the layout), an "Tenants" h1 heading, an orange "New Tenant" button, search and filter controls, a data table with status badges, and pagination links.

---

## Validation

- [ ] Navigating to `/superadmin/tenants` with a valid SUPER_ADMIN JWT renders the page without error.
- [ ] The data table displays tenant records fetched from the Django API.
- [ ] The TenantStatusBadge shows green for ACTIVE, amber for GRACE_PERIOD, red for SUSPENDED, and muted for CANCELLED.
- [ ] Typing in the search input updates the URL query string with the `search` parameter and triggers a new page render with filtered results.
- [ ] Selecting "Suspended" from the status dropdown filters the table to show only SUSPENDED tenants.
- [ ] The "New Tenant" button is orange with white text and links to `/superadmin/tenants/new`.
- [ ] Clicking "View" in the actions column navigates to the tenant detail page for that tenant.
- [ ] The "Next" pagination link on the last page is rendered as a non-interactive disabled element.
- [ ] Running `pnpm tsc --noEmit` inside `frontend/` produces zero TypeScript errors.
- [ ] The page returns a non-200 status or shows an error message if the Django API is unreachable.

---

## Notes

- Because this page is a Server Component that fetches data on every request (no-store cache), it will re-render with fresh data on every navigation. For the tenant management use case, this is correct behaviour: super admins always see the current state.
- If the Django API returns a 403 Forbidden (the token is valid but the user does not have super-admin permissions at the API level), render a user-facing "Access Denied" message rather than redirecting to login, since the token is technically valid.
- The `TenantStatusBadge` component is extracted to `frontend/src/components/` (not inside the superadmin route group) because it will be reused on the tenant detail page, the provisioning wizard confirmation step, and potentially tenant-facing pages in later phases.
- Do not use any client-side data fetching library (TanStack Query, SWR) for the initial tenant list render. The full list is fetched on the server. TanStack Query is appropriate for subsequent mutations (such as suspending a tenant on the detail page) where optimistic UI updates are beneficial.
