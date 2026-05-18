# Task 05.02.11 — Build MRR Dashboard (Super Admin)

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.11 |
| SubPhase | 05.02 — Billing and WhatsApp Automation |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | Task 05.02.05 (PayHere IPN webhook handler) |
| Produces | `backend/apps/billing/views/metrics_views.py`, `frontend/app/super-admin/metrics/page.tsx`, `frontend/components/super-admin/MetricsCharts.tsx`, `frontend/components/super-admin/TenantMetricsTable.tsx`, `frontend/lib/format.ts` |
| Blocked By | Task 05.02.05 |

---

## Objective

Build the Super Admin financial metrics dashboard at `frontend/app/super-admin/metrics/page.tsx`. Expose MRR, ARR, subscriber counts, trial conversion, churn, and a Recharts PieChart revenue breakdown. Include a searchable, filterable tenant table with subscription status and last payment date. This dashboard gives the platform operator full visibility into the business's recurring revenue health.

---

## Instructions

### Step 1: Build the Metrics API View

Create `backend/apps/billing/views/metrics_views.py`. Define `MetricsView` at `GET /api/billing/admin/metrics/` with `JWTAuthentication` and `HasTenantPermission`. Enforce SUPER_ADMIN role only.

Compute the following metrics using Django ORM queries:

**MRR**: Query `Subscription.objects.filter(status='ACTIVE').select_related('plan')`. Sum `plan.monthly_price` for all active subscriptions using Python `Decimal` addition. Never use float.

**ARR**: Multiply MRR by 12.

**active_subscribers**: `Subscription.objects.filter(status='ACTIVE').count()`.

**trial_subscribers**: `Subscription.objects.filter(status='TRIAL').count()`.

**trial_to_paid_last_30_days**: Count subscriptions where `status='ACTIVE'` and `created_at` is within the last 30 days.

**churned_last_30_days**: Count subscriptions where `status='CANCELLED'` and `cancelled_at` is within the last 30 days.

**net_churn_rate**: Compute as `(churned_last_30_days / (active_subscribers + churned_last_30_days)) * 100`, rounded to two decimal places. Return 0 if the denominator is zero.

**revenue_by_plan**: Use `SubscriptionPlan.objects.annotate(active_count=Count('subscriptions', filter=Q(subscriptions__status='ACTIVE')))`. For each plan, compute `monthly_cumulative_revenue = plan.monthly_price * plan.active_count`.

**tenants**: Use `Tenant.objects.all().select_related('subscription__plan')`. For each tenant, include `id`, `name`, `slug`, `subscription_status`, `plan_name` (from subscription), `last_payment_date` (from most recent PAID invoice), and `next_billing_date` (from subscription's `current_period_end`).

Return the full metrics object as JSON. Convert all `Decimal` values to strings using `str()` before JSON serialisation.

### Step 2: Build the Metrics Page Server Component

Create `frontend/app/super-admin/metrics/page.tsx` as a Client Component. Validate the session using `useAuth()` — redirect non-SUPER_ADMIN sessions. Fetch the metrics via TanStack Query key `['admin-metrics']` calling `GET /api/billing/admin/metrics/`.

Apply a `background` (#F1F5F9) page background. Render a page heading "Business Metrics" in Inter with `navy` colour, and a subtitle showing the computation timestamp: "As of [formatted run_at]."

### Step 3: Build the Summary Stat Cards

Below the heading, render a responsive grid: 4 columns on desktop (`lg:grid-cols-4`), 2 columns on tablet (`sm:grid-cols-2`), 1 column on mobile. Each grid cell is a ShadCN `Card` component.

Define cards for: MRR, ARR, Active Subscribers, Trials Active, Trial Conversion (last 30 days as percentage), Churned (last 30 days), Net Churn Rate, and a placeholder "MRR Growth" card displaying "— (Coming Soon)" in muted text.

Each card contains: a top border of 3px `navy` colour, a metric label in Inter uppercase 11px muted text, and a metric value in Inter 28px `navy`. For monetary values (MRR, ARR), render in JetBrains Mono with the LKR prefix (formatted using `Intl.NumberFormat` with locale `"en-LK"` and currency `"LKR"`). For subscriber counts, render as plain integers. For percentage values, append the "%" symbol.

### Step 4: Build the Revenue Breakdown PieChart

Create `frontend/components/super-admin/MetricsCharts.tsx` as a Client Component. Accept a `revenueByPlan` prop typed as an array of objects with fields `plan_name`, `active_count`, and `monthly_cumulative_revenue` (Number).

Import `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend`, and `ResponsiveContainer` from `recharts`. Define slice colours: STARTER maps to `border` (#E2E8F0), GROWTH maps to `orange` (#F97316), ENTERPRISE maps to `navy` (#1B2B3A). Any other plan name falls back to `text-muted` (#64748B).

Render a `ResponsiveContainer` with `width="100%"` and `height={300}`. Inside, render a `PieChart` with a `Pie` component: set `data` to the `revenueByPlan` array, `dataKey="monthly_cumulative_revenue"`, `nameKey="plan_name"`, `cx="50%"`, `cy="50%"`, `outerRadius={110}`, `innerRadius={50}` (donut style). Render a `Cell` for each slice with the relevant fill colour. Include a `Tooltip` that formats the value as "LKR [value]". Include a `Legend` positioned below the chart.

### Step 5: Build the Tenant Status Table

Create `frontend/components/super-admin/TenantMetricsTable.tsx` as a Client Component. Accept a `tenants` prop as the full array. Use two pieces of `useState`: one for the search query string and one for the selected status filter (defaulting to `"ALL"`).

Filter the tenants array on each render: include a tenant if the tenant's name or slug contains the search query (case-insensitive substring match) AND the status filter is `"ALL"` or matches the tenant's `subscription_status` exactly.

Render a ShadCN `Table` with columns: Tenant Name, Slug, Status (Badge), Current Plan, Last Payment, Next Billing, and View. The View cell contains a ShadCN `Button` `variant="ghost"` `size="sm"` linking to `/super-admin/tenants/[tenantId]`. Status Badges follow the same colour scheme as the billing dashboard. Last Payment and Next Billing dates are formatted with `date-fns` `format` as "dd MMM yyyy". If last payment is null, show "—" in muted text.

### Step 6: Implement the LKR Formatter Utility

Create `frontend/lib/format.ts`. Export a `formatLKR` function: it accepts a number or string and returns a formatted string using `new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2 }).format(amount)`. This function is used on the metrics page, billing dashboard, invoices, and anywhere else LKR amounts are displayed.

### Step 7: Add Navigation Entry

In the Super Admin sidebar navigation component, add a "Metrics" navigation link at `/super-admin/metrics`, positioned below the "Plans" link. Use the `BarChart2` or `TrendingUp` icon from Lucide React. This link should be visible only when the session role is SUPER_ADMIN.

---

## Expected Output

- `GET /api/billing/admin/metrics/` — returns all KPI fields as a typed JSON object.
- `/super-admin/metrics` — page with stat cards, PieChart, and tenant table.
- `MetricsCharts.tsx` — Recharts donut PieChart with LankaCommerce colour palette.
- `TenantMetricsTable.tsx` — searchable and filterable client-side table.
- `formatLKR` utility in `frontend/lib/format.ts`.

---

## Validation

- `GET /api/billing/admin/metrics/` returns 403 for non-SUPER_ADMIN sessions.
- MRR value equals the sum of `plan.monthly_price` for all ACTIVE subscriptions.
- ARR equals MRR multiplied by 12.
- Net Churn Rate returns 0 when no subscriptions have been cancelled in last 30 days.
- PieChart renders three slices for STARTER, GROWTH, and ENTERPRISE with correct colours.
- Tenant table shows all seeded tenants.
- Search input filters tenants by name case-insensitively.
- Status filter "SUSPENDED" narrows the table to only SUSPENDED tenants.
- LKR values on stat cards use JetBrains Mono font and correct currency formatting.
- Navigation link to /metrics appears in the Super Admin sidebar.

---

## Notes

MRR computation using Python `Decimal` addition is safer than a raw SQL SUM query because `Decimal` preserves precision beyond what PostgreSQL NUMERIC returns via JSON serialisation. Always use `Decimal` for financial aggregation in application code. For future SubPhases, MRR Growth (month-over-month) can be computed by comparing the current MRR snapshot to a stored daily snapshot. Add a `DailyMrrSnapshot` model to the schema in Phase 06 to enable this metric retroactively. Client-side filtering is acceptable for the tenant list at Phase 05 scale (expected tenant count below 500). If the tenant count exceeds 1000, replace with a server-side paginated query with a debounced search parameter.
