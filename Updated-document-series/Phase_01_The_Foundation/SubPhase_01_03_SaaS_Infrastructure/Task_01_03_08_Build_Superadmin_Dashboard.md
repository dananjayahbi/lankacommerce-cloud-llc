# Task 01.03.08 — Build Super Admin Dashboard

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.08 |
| Title | Build Super Admin Dashboard |
| Working Directory | `backend/` and `frontend/` |
| Prerequisites | Task 01.03.01 (models), Task 01.03.02 (super-admin layout), Task 01.03.06 (plans seeded), Task 01.03.07 (service layer) |
| Estimated Time | 4 hours |
| Status | [ ] Not Started |

---

## Objective

Build the super-admin home dashboard that provides the platform operator with a real-time snapshot of the LankaCommerce platform's health and revenue. The dashboard displays four metric cards (active tenants, monthly recurring revenue, tenants in grace period, and upcoming renewals), a recent sign-ups panel, and an upcoming renewals panel. All metrics are computed server-side by Django using ORM aggregation and returned in a single API response, minimising the number of round-trips from the Next.js page.

---

## Instructions

### Step 1: Create the Django Dashboard Metrics View

Open `backend/apps/tenants/views.py`. Add a new view class named `SuperAdminDashboardView` inheriting from `rest_framework.views.APIView`. Apply the `IsAuthenticated` permission class and a custom permission class that checks for the `SUPER_ADMIN` role (or use the existing `IsSuperAdmin` permission class if one was defined in SubPhase 01.02).

The view implements a single `get` method. Inside this method, compute all dashboard metrics using Django ORM queries:

**active_tenant_count**: Use `Tenant.objects.filter(status=TenantStatus.ACTIVE, deleted_at__isnull=True).count()`.

**grace_period_count**: Use `Tenant.objects.filter(status=TenantStatus.GRACE_PERIOD, deleted_at__isnull=True).count()`.

**mrr_lkr**: Compute the monthly recurring revenue by summing the `plan__price_monthly` field across all active Subscriptions. Join Subscription with Plan using Django's ORM double-underscore traversal and apply `aggregate(total=Sum("plan__price_monthly"))` to the filtered queryset. The filter should include only subscriptions where the related tenant has `status=TenantStatus.ACTIVE` and `deleted_at__isnull=True`. If no active subscriptions exist, the Sum may return None — handle this by defaulting to zero.

**upcoming_renewals_count**: Count Subscription records where `next_billing_date` falls within the next 7 days from today, the subscription `status=SubscriptionStatus.ACTIVE`, and the related tenant is not deleted. Use `datetime.now(tz=timezone.utc)` and `timedelta(days=7)` to define the 7-day window.

**recent_tenants**: Query the 5 most recently created non-deleted Tenants using `order_by("-created_at")[:5]`. For each tenant, include `id`, `name`, `slug`, `status`, and `created_at`. Use `.values()` for a lightweight projection or serialise the queryset using an inline serializer.

**upcoming_renewals**: Query the 5 Subscription records with the nearest `next_billing_date` within the next 30 days, for active tenants. For each subscription, include the tenant name, plan name, next_billing_date, and subscription status.

Assemble all metrics into a single Python dictionary and return it as a DRF `Response` with HTTP 200 status.

Register the view in `backend/apps/tenants/urls.py` at the path `superadmin/dashboard/`, resulting in the full URL `GET /api/superadmin/dashboard/`.

### Step 2: Create the Dashboard Page File

Create the file `frontend/src/app/(superadmin)/page.tsx` (or `frontend/src/app/(superadmin)/dashboard/page.tsx` depending on the route structure — place it at whatever path maps to `/superadmin`). This is a Next.js Server Component.

### Step 3: Fetch All Dashboard Data From Django

Inside the async page function, read the access token from cookies using `cookies()` from `next/headers`.

Perform a single `fetch` call to the Django dashboard endpoint `GET /api/superadmin/dashboard/`. Set the `Authorization: Bearer [access_token]` header. Set `cache: "no-store"` so the dashboard always reflects current platform state.

Define a TypeScript interface for the expected response shape, including all metric fields: `active_tenant_count` (number), `grace_period_count` (number), `mrr_lkr` (string, because Django's DecimalField serialises to a string), `upcoming_renewals_count` (number), `recent_tenants` (array of tenant summary objects), and `upcoming_renewals` (array of subscription renewal objects).

Parse the JSON response and extract each metric. If the request fails or returns a non-200 status, render a full-page error state with a "Failed to load dashboard data. Please refresh." message and a retry button that refreshes the page.

### Step 4: Build the Metric Cards Row

Render the four metric cards in a responsive grid. Use Tailwind's `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` for the layout.

Create a reusable `MetricCard` component (Step 5 below) and render four instances:

- **Active Tenants**: Shows `active_tenant_count`, label "Active Tenants", icon `Building2` from Lucide React.
- **Monthly Revenue**: Shows the `mrr_lkr` value formatted as LKR currency (Step 6 below), label "Monthly Revenue", icon `TrendingUp` from Lucide React.
- **Grace Period**: Shows `grace_period_count`, label "In Grace Period", icon `Clock` from Lucide React. If this count is greater than zero, apply a warning amber accent to this card instead of the default orange.
- **Upcoming Renewals**: Shows `upcoming_renewals_count`, label "Renewals (7 days)", icon `Calendar` from Lucide React.

### Step 5: Create the MetricCard Component

Create the file `frontend/src/components/MetricCard.tsx`. This component accepts the following props: `label` (string), `value` (string or number), `icon` (a React element, the Lucide icon), and an optional `accentColour` (string, defaulting to orange).

The card renders a white (`bg-white`) div with a slate-200 border, rounded-xl corners, and `p-6` padding.

Inside the card, render two horizontal rows. The first row contains the label on the left (Inter Medium, text-muted colour, small font size) and the icon on the right. The icon is wrapped in a small square div with an orange background tint (using a low-opacity orange like `bg-orange-50`) and rounded corners, and the icon itself uses orange colour. If `accentColour` is amber, swap the orange tints for amber equivalents.

The second row renders the metric value as a large number (Inter Bold, text-2xl or text-3xl, navy or slate-900 colour). Below the value, optionally render a trend indicator string if a `trend` prop is provided (this is a placeholder for Phase 5 analytics).

### Step 6: Format the MRR Value

Define a helper function `formatLKR(value: string | number): string` that uses `Intl.NumberFormat` with the `en-LK` locale and the `LKR` currency style to format the value as a Sri Lankan Rupee string. Pass the MRR metric value through this formatter before passing it to the MetricCard for display.

### Step 7: Build the Recent Sign-Ups Panel

Below the metric cards row, render a two-column panel grid using `grid grid-cols-1 lg:grid-cols-2 gap-6`.

The left panel is the "Recent Sign-Ups" card. Render it as a white card with the same border and padding as the metric cards.

The card heading is "Recent Tenants" in Inter Bold. Below the heading, render a list of the five most recent tenants from the `recent_tenants` array in the Django response. Each list item shows the tenant name in bold, the slug in muted text, the creation date formatted as a relative time string (e.g., "3 days ago" — use a simple date arithmetic approach or a library such as `date-fns`), and the TenantStatusBadge component with the tenant's status.

If the `recent_tenants` array is empty, show a centred "No tenants yet" message.

### Step 8: Build the Upcoming Renewals Panel

The right panel is the "Upcoming Renewals" card. Render it with the same white card styling.

The card heading is "Renewals (Next 30 Days)" in Inter Bold. Below the heading, render a compact table showing the five nearest subscription renewals from the `upcoming_renewals` array. The table columns are: Tenant Name, Plan, and Next Billing Date. Format the billing date as a localised date string. If the billing date is within 3 days, apply a danger red text colour to the date cell to highlight urgency.

If the `upcoming_renewals` array is empty, show a centred "No renewals due soon" message.

### Step 9: Build the Quick Links Row

Below the two-panel section, render a row of three quick-link cards. These are smaller cards that give the super admin one-click access to common tasks:

- "Provision New Tenant" — links to `/superadmin/tenants/new`. Orange button with plus icon.
- "View All Tenants" — links to `/superadmin/tenants`. Navy button.
- "System Health" — links to `/superadmin/health`. Navy button with activity icon.

### Step 10: Wrap Data Sections in Suspense Boundaries

Wrap the metric cards row in a React `Suspense` component with a skeleton loading fallback. The skeleton fallback renders four placeholder grey rectangles in the same grid layout as the actual metric cards. This ensures the page renders with a loading state while the Django API call is in flight, rather than blocking the entire render.

Similarly, wrap the two-panel section in its own `Suspense` boundary with a two-column skeleton fallback.

Note: because the current implementation fetches all data in a single `fetch` call within the parent server component, Suspense boundaries become most useful when you later refactor each panel into separate Server Component functions that perform their own data fetches. For now, the Suspense boundaries provide structure for that future refactor.

---

## Expected Output

After completing this task, the following artifacts exist:

- Django `SuperAdminDashboardView` registered at `GET /api/superadmin/dashboard/`, returning all metrics in a single JSON response.
- `frontend/src/app/(superadmin)/page.tsx` — Server Component that fetches the Django metrics response and renders the dashboard.
- `frontend/src/components/MetricCard.tsx` — reusable metric display component with orange icon wrapper.
- The dashboard renders four orange-accented white metric cards, a recent tenants panel, an upcoming renewals panel, and a quick links row.

---

## Validation

- [ ] Making an authenticated GET request to `/api/superadmin/dashboard/` returns a JSON object with all expected metric fields.
- [ ] Making an unauthenticated GET request to `/api/superadmin/dashboard/` returns HTTP 401.
- [ ] Making a request with a non-SUPER_ADMIN role JWT returns HTTP 403.
- [ ] The dashboard page renders without errors when all metrics are zero (empty database).
- [ ] The MRR value is formatted as "LKR X,XXX" using the correct locale formatting.
- [ ] The "In Grace Period" metric card shows amber accent styling when grace_period_count is greater than zero.
- [ ] The recent tenants panel shows the five most recently created tenants with correct status badges.
- [ ] The upcoming renewals panel shows billing dates within 30 days; dates within 3 days appear in red.
- [ ] Running `pnpm tsc --noEmit` produces zero TypeScript errors.
- [ ] Running `poetry run python manage.py check` produces zero errors for the tenants app.

---

## Notes

- The MRR calculation in the Django view sums the current plan prices for all active subscriptions. This is a simplified approximation of true MRR. In Phase 5, when PayHere integration is added, MRR will be updated to use actual invoiced amounts, which may differ from plan list prices due to discounts and proration. Document this simplification clearly in the view code with a comment.
- The Super Admin Dashboard endpoint requires SUPER_ADMIN authentication. However, the metrics it returns (aggregate counts and plan prices) are not sensitive at the individual tenant level. No individual tenant's financial data is exposed through this endpoint.
- Consider adding an HTTP response cache (Django's cache framework or a simple `Cache-Control` header) to the dashboard endpoint with a 60-second TTL, since aggregate metrics do not need to be perfectly real-time. This is an optional performance optimisation for this task.
