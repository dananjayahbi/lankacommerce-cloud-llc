# Task 05.01.03 — Build Profit and Loss Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.03 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | T-05.01.02 (Report layout shell exists), SP-02.01 (Product Data Models — ProductVariant with cost_price), SP-03.01 (POS Core — Sale, SaleLine models), SP-03.03 (Returns and Exchanges — Return, ReturnLine models), SP-04.02 (Staff Promotions and Expenses — Expense model and categories) |
| Produces | `frontend/app/[tenantSlug]/reports/profit-loss/page.tsx` |
| Blocked By | T-05.01.02, SP-02.01, SP-03.01, SP-03.03, SP-04.02 |

---

## Objective

The Profit and Loss (P&L) report is the single most important financial statement in LankaCommerce. It answers the fundamental question every store owner asks: "Am I making money?" The report computes net revenue (gross sales minus returns), cost of goods sold (COGS based on the cost price snapshot stored at sale time), gross profit, expense totals by category, and ultimately net profit. It presents these figures both as a period total (for the selected date range) and as a monthly breakdown chart so the owner can spot trends — Are expenses creeping up? Is gross margin compressing? Which expense category is largest?

The P&L is built entirely from existing transactional data. No new models are required. Revenue comes from completed `Sale` records. Returns come from `Return` records (with non-null `refund_amount`). COGS is computed from `SaleLine.cost_price_snapshot` multiplied by `SaleLine.quantity` — the cost price is snapped at sale time so that historical P&L statements remain accurate even if cost prices change later. Returned COGS is similarly computed from `ReturnLine` records. Expenses come from the `Expense` model grouped by category. All monetary calculations use Python `Decimal` on the backend and `decimal.js` on the frontend.

---

## Instructions

1. Create the backend API endpoint in `backend/apps/reports/views/profit_loss_view.py`:

   ```
   from datetime import datetime
   from decimal import Decimal
   from django.db import connection
   from django.db.models import Sum, Q
   from django.utils.timezone import now
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import Sale, SaleLine
   from apps.returns.models import Return
   from apps.expenses.models import Expense
   ```

   The view has one GET method accepting query params `from_date`, `to_date`, and `tenant_id` (from JWT).

   Step-by-step query logic:

   a. **Revenue**: Filter `Sale` by `tenant_id`, `status='COMPLETED'`, `created_at__gte=from_date`, `created_at__lte=to_date`. Aggregate `total_revenue = Sum('total_amount')`. Also group by `payment_method` to get a payment-method breakdown using `.values('payment_method').annotate(amount=Sum('total_amount'))`.

   b. **Returns**: Filter `Return` by `tenant_id`, `created_at__gte=from_date`, `created_at__lte=to_date`, `refund_amount__isnull=False`. Aggregate `total_returns = Sum('refund_amount')`.

   c. **Net Revenue**: `net_revenue = (total_revenue or Decimal('0.00')) - (total_returns or Decimal('0.00'))`.

   d. **COGS**: Use `connection.cursor()` to execute raw SQL:
      ```sql
      SELECT COALESCE(SUM(sl.cost_price_snapshot * sl.quantity), 0)
      FROM sale_line sl
      JOIN sale s ON sl.sale_id = s.id
      WHERE s.tenant_id = %s
        AND s.status = 'COMPLETED'
        AND s.created_at >= %s
        AND s.created_at <= %s
      ```
      Use `cursor.fetchone()` to get the result. Wrap in `Decimal()`.

   e. **Returned COGS**: Similar raw SQL joining `return_line` to `return`:
      ```sql
      SELECT COALESCE(SUM(rl.refund_amount), 0)
      FROM return_line rl
      JOIN "return" r ON rl.return_id = r.id
      WHERE r.tenant_id = %s
        AND r.created_at >= %s
        AND r.created_at <= %s
      ```

   f. **Net COGS**: `net_cogs = (cogs or Decimal('0.00')) - (returned_cogs or Decimal('0.00'))`.

   g. **Gross Profit**: `gross_profit = net_revenue - net_cogs`.
      **Gross Margin %**: If `net_revenue > 0`, `(gross_profit / net_revenue) * 100`. Else `Decimal('0.00')`.

   h. **Expenses**: `Expense.objects.filter(tenant_id=..., created_at__gte=..., created_at__lte=...).values('category').annotate(total=Sum('amount')).order_by('-total')`.

   i. **Net Profit**: `net_profit = gross_profit - total_expenses`.

   j. **Monthly Breakdown**: Raw SQL with `DATE_TRUNC('month', created_at)`:
      ```sql
      SELECT DATE_TRUNC('month', s.created_at) AS month,
             COALESCE(SUM(s.total_amount), 0) AS revenue,
             COALESCE(SUM(sl.cost_price_snapshot * sl.quantity), 0) AS cogs
      FROM sale s
      JOIN sale_line sl ON sl.sale_id = s.id
      WHERE s.tenant_id = %s
        AND s.status = 'COMPLETED'
        AND s.created_at >= %s
        AND s.created_at <= %s
      GROUP BY month
      ORDER BY month
      ```
      Also fetch monthly expenses with `DATE_TRUNC('month', created_at)`.

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "totalRevenue": "...",
       "totalReturns": "...",
       "netRevenue": "...",
       "totalCogs": "...",
       "returnedCogs": "...",
       "netCogs": "...",
       "grossProfit": "...",
       "grossMargin": "...",
       "totalExpenses": "...",
       "expensesByCategory": [{"category": "Rent", "total": "..."}, ...],
       "netProfit": "...",
       "monthlyBreakdown": [
         {"month": "2026-01-01T00:00:00Z", "revenue": "...", "cogs": "...", "expenses": "...", "grossProfit": "...", "netProfit": "..."}
       ]
     }
   }
   ```
   All monetary values are strings formatted to two decimal places.

2. Register the URL in `backend/apps/reports/urls.py`:
   ```
   path('api/reports/profit-loss/', ProfitLossView.as_view(), name='profit-loss'),
   ```

3. Create `frontend/app/[tenantSlug]/reports/profit-loss/page.tsx`:

   This is a client component (`'use client'`). It imports:
   - `useAuth` from the auth library to get the JWT token for API calls.
   - `useSearchParams` from `next/navigation` to read `from` and `to`.
   - TanStack Query's `useQuery` to fetch data.
   - Recharts components: `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, `ResponsiveContainer`.
   - `decimal.js` `Decimal` for monetary formatting.
   - `useReportContext` from `frontend/lib/reports/ReportContext.tsx` to cache data for export.

   Data fetching:
   - Build the API URL: `/api/reports/profit-loss/?from_date=${from}&to_date=${to}`.
   - Fetch using `fetch` with `Authorization: Bearer ${token}` header.
   - `useQuery` key: `['profit-loss', from, to]`.
   - On success, call `setReportData(response.data)` to cache in context.

   Render structure:

   a. **Summary Cards** (4 cards in a grid, `grid-cols-4` gap-4):
      - Net Revenue (green text `#22C55E`)
      - Gross Profit (navy text `#1B2B3A`)
      - Gross Margin % (with percentage sign)
      - Net Profit (red if negative, green if positive)

   b. **P&L Table** (full-width, striped rows):
      - Section header "Revenue" (bold, navy background `#1B2B3A` white text).
      - Row: Total Sales — right-aligned monetary value.
      - Row: Less Returns — right-aligned (red).
      - Row: Net Revenue — bold, larger font.
      - Section header "Cost of Goods Sold".
      - Row: COGS — right-aligned.
      - Row: Less Returned COGS — right-aligned (red).
      - Row: Net COGS — bold.
      - Section header "Gross Profit".
      - Row: Gross Profit — bold, large.
      - Row: Gross Margin % — bold.
      - Section header "Expenses".
      - Loop over `expensesByCategory`: each row shows category name and amount.
      - Row: Total Expenses — bold.
      - Section header "Net Profit".
      - Row: Net Profit — extra bold, large font, red/green coloured.
      - All monetary values rendered in JetBrains Mono font.

   c. **Monthly Bar Chart**:
      - `ResponsiveContainer` width="100%" height={400}.
      - `BarChart` data from `monthlyBreakdown`.
      - Three bars per month: Revenue (orange `#F97316`), COGS (navy `#1B2B3A`), Net Profit (green `#22C55E`).
      - `CartesianGrid` with `#E2E8F0` stroke.
      - `XAxis` dataKey="month" formatted as "MMM yyyy".
      - `YAxis` with monetary formatting via tick formatter.
      - `Tooltip` with decimal.js formatting.
      - Legend at bottom.

4. Handle loading state: Show a ShadCN Skeleton component while `isLoading` is true.

5. Handle empty state: If `netRevenue` is 0 and no data exists, show an empty-state illustration with "No sales data for this period. Try a different date range."

6. Handle error state: If `isError`, show a danger-coloured (`#EF4444`) alert banner with the error message and a "Retry" button that calls `refetch()`.

---

## Expected Output

- `backend/apps/reports/views/profit_loss_view.py`
- `frontend/app/[tenantSlug]/reports/profit-loss/page.tsx` (updated route registration in `backend/apps/reports/urls.py`)

---

## Validation

- [ ] P&L for a period with known sales, returns, and expenses returns correct Net Revenue = Total Sales − Total Returns.
- [ ] COGS calculation matches manual computation: sum of `cost_price_snapshot * quantity` for all completed sale lines in the period.
- [ ] Gross Profit = Net Revenue − Net COGS is within 0.01 of the expected value.
- [ ] Gross Margin % calculation: `(Gross Profit / Net Revenue) * 100` displayed with one decimal place.
- [ ] Net Profit = Gross Profit − Total Expenses is correctly computed.
- [ ] Payment method breakdown shows correct totals per method (CASH, CARD, etc.).
- [ ] Monthly bar chart renders exactly one bar group per month in the selected range.
- [ ] Negative net profit displays in red; positive in green.
- [ ] Empty period shows appropriate empty-state message, not errors or zeroes.
- [ ] All monetary values are formatted to two decimal places with comma separators for thousands.
- [ ] Error state displays retry button and refetches data on click.
- [ ] Loading state shows skeleton placeholders, not a flash of empty table.

---

## Notes

The P&L report uses raw SQL for COGS computation rather than Django ORM annotations. The reason is the join across three tables (`sale_line` → `sale` → `tenant`) with a computed column (`cost_price_snapshot * quantity`). While Django ORM can express this with `F()` expressions and `Sum`, the raw SQL is more transparent for debugging and easier to optimise with database-level operations. The `connection.cursor()` approach is carefully scoped to read-only queries and uses parameterised queries to prevent SQL injection.

Cost prices are snapped at sale time in `SaleLine.cost_price_snapshot`. This is critical for P&L accuracy. If a product's cost price changes after a sale, the historical P&L for that period must reflect the cost at the time of sale, not the current cost. This pattern — snapshotting mutable values at transaction time — is used consistently across the LankaCommerce codebase for prices, tax rates, and discount percentages.

The monthly breakdown query uses PostgreSQL's `DATE_TRUNC` function, which is not portable to other databases. If the project ever migrates away from PostgreSQL, this query must be replaced with Django ORM's `TruncMonth` database function from `django.db.models.functions`. For now, the raw SQL approach is acceptable because PostgreSQL is the target production database and the query is restricted to a single view.
