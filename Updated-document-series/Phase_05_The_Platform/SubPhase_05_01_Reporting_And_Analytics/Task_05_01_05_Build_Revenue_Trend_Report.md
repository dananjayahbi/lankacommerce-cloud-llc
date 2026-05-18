# Task 05.01.05 — Build Revenue Trend Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.05 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-03.01 (POS Core — Sale model), SP-03.03 (Returns and Exchanges — Return model) |
| Produces | `frontend/app/[tenantSlug]/reports/revenue-trend/page.tsx`, `backend/apps/reports/views/revenue_trend_view.py` |
| Blocked By | T-05.01.02, SP-03.01, SP-03.03 |

---

## Objective

The Revenue Trend report visualises how revenue and returns fluctuate over time. Unlike the P&L report which gives a period-summary snapshot, the Revenue Trend report focuses on rhythm and pattern. It answers questions like: Which days of the week are strongest? Is this month's revenue trajectory ahead of last month? At what hour of the day does the store see peak sales? The report provides a granularity toggle — Daily, Weekly, Monthly — so the user can zoom in or out to see the trend at the right level of detail.

The report also includes a peak-hours analysis chart that reveals intraday sales patterns. This is particularly valuable for staffing decisions: if most revenue is concentrated between 10 AM and 2 PM, the manager can schedule more cashiers during that window. The report computes four summary stat cards for at-a-glance context: Total Revenue, Total Transactions, Average Order Value, and Return Rate Percentage.

---

## Instructions

1. Create `backend/apps/reports/views/revenue_trend_view.py`:

   ```
   from decimal import Decimal
   from django.db import connection
   from django.db.models import Sum, Count, Q
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import Sale
   from apps.returns.models import Return
   ```

   GET method with query params `from_date`, `to_date`, `granularity` (one of `daily`, `weekly`, `monthly`), `tenant_id` (from JWT).

   a. **Revenue Buckets**: Use raw SQL with `connection.cursor()` to execute:
      ```sql
      SELECT DATE_TRUNC(%s, s.created_at) AS bucket,
             COALESCE(SUM(s.total_amount), 0) AS revenue,
             COUNT(s.id) AS transactions
      FROM sale s
      WHERE s.tenant_id = %s
        AND s.status = 'COMPLETED'
        AND s.created_at >= %s
        AND s.created_at <= %s
      GROUP BY bucket
      ORDER BY bucket
      ```
      The `%s` for DATE_TRUNC is the granularity value (`'day'`, `'week'`, `'month'`).

   b. **Returns Buckets**: Similar raw SQL:
      ```sql
      SELECT DATE_TRUNC(%s, r.created_at) AS bucket,
             COALESCE(SUM(r.refund_amount), 0) AS returns_total
      FROM "return" r
      WHERE r.tenant_id = %s
        AND r.refund_amount IS NOT NULL
        AND r.created_at >= %s
        AND r.created_at <= %s
      GROUP BY bucket
      ORDER BY bucket
      ```

   c. **Merge Buckets**: In Python, iterate over revenue buckets and look up corresponding returns by matching `bucket` timestamp. For buckets where returns have no revenue entry, include them anyway with revenue=0.

   d. **Summary Stats**:
      ```
      total_revenue = Sale.objects.filter(
          tenant_id=tenant_id, status='COMPLETED',
          created_at__gte=from_date, created_at__lte=to_date
      ).aggregate(total=Sum('total_amount'), count=Count('id'))
      ```
      ```
      total_returns_amount = Return.objects.filter(
          tenant_id=tenant_id, refund_amount__isnull=False,
          created_at__gte=from_date, created_at__lte=to=to_date
      ).aggregate(total=Sum('refund_amount'))
      ```
      Compute:
      - `total_revenue = total['total'] or Decimal('0.00')`
      - `total_transactions = total['count'] or 0`
      - `avg_order_value = total_revenue / total_transactions` if transactions > 0
      - `return_rate = (total_returns / total_revenue) * 100` if revenue > 0

   e. **Peak Hours**: Raw SQL with `EXTRACT(HOUR FROM created_at)`:
      ```sql
      SELECT EXTRACT(HOUR FROM s.created_at) AS hour,
             COALESCE(SUM(s.total_amount), 0) AS revenue,
             COUNT(s.id) AS transactions
      FROM sale s
      WHERE s.tenant_id = %s
        AND s.status = 'COMPLETED'
        AND s.created_at >= %s
        AND s.created_at <= %s
      GROUP BY hour
      ORDER BY hour
      ```
      Returns 24 rows (hours 0–23), with some possibly zero if the store is closed at night.

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "summary": {
         "totalRevenue": "45230.00",
         "totalTransactions": 523,
         "avgOrderValue": "86.48",
         "returnRate": 3.24
       },
       "trendBuckets": [
         {"bucket": "2026-01-01T00:00:00Z", "revenue": "1520.00", "returns": "45.00", "transactions": 18}
       ],
       "peakHours": [
         {"hour": 9, "revenue": "1240.00", "transactions": 14}
       ]
     }
   }
   ```

2. Register URL: `path('api/reports/revenue-trend/', RevenueTrendView.as_view(), name='revenue-trend')`.

3. Create `frontend/app/[tenantSlug]/reports/revenue-trend/page.tsx`:

   This is a client component. It reads `from`, `to`, and `granularity` from URL search params (`granularity` defaults to `monthly`).

   **Granularity Toggle**:
   - Three ShadCN ToggleGroup buttons: "Daily", "Weekly", "Monthly".
   - Clicking a button updates the URL param `granularity` to `daily`, `weekly`, or `monthly`.
   - The API call uses the selected granularity for `DATE_TRUNC`.

   **Data Fetching**: `useQuery` with key `['revenue-trend', from, to, granularity]`.

   **Four Stat Cards** (grid-cols-4):
   - Total Revenue: large font, navy `#1B2B3A` text.
   - Total Transactions: large number.
   - Average Order Value: formatted with two decimals.
   - Return Rate %: with % symbol. Colour-coded: green `<3%`, amber `3-7%`, red `>7%`.

   **Line Chart**:
   - `ResponsiveContainer` width="100%" height={400}.
   - `LineChart` with two lines:
     - Revenue line: `stroke="#F97316"` (orange), strokeWidth=2, dot=false (for daily, use dot=routes={false} to avoid overcrowding).
     - Returns line: `stroke="#64748B"` (text-muted), strokeWidth=1.5, strokeDasharray="5 5" (dashed).
   - `XAxis` dataKey="bucket" with date formatting. For daily: "MMM dd", for weekly: "MMM dd", for monthly: "MMM yyyy".
   - `YAxis` with monetary formatting.
   - `Tooltip`
   - `CartesianGrid` with `#E2E8F0` stroke.
   - `Tooltip` showing both revenue and returns for the hovered point.
   - Legend at top.

   **Peak Hours Chart**:
   - `ResponsiveContainer` width="100%" height={250}.
   - `BarChart` data from `peakHours`.
   - 24 bars (hours 0–23). The bar at the peak hour (max revenue) has full orange fill `#F97316`. Other bars fade to `#E2E8F0` border colour with opacity proportional to their revenue relative to the peak.
   - `XAxis` dataKey="hour"` tick values 0, 2, 4, ..., 22.
   - `Tooltip` with hour label "9:00 AM", revenue and transactions.

   **Loading/Empty/Error States**: Skeletons for stat cards and chart areas; empty-state message when no data; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/revenue_trend_view.py`
- `frontend/app/[tenantSlug]/reports/revenue-trend/page.tsx`

---

## Validation

- [ ] Daily granularity shows one data point per day in the selected range.
- [ ] Weekly granularity groups data by ISO week (Monday start).
- [ ] Monthly granularity groups data by calendar month.
- [ ] Switching granularity re-fetches data with the correct DATE_TRUNC value.
- [ ] Revenue and returns lines render on the same chart; the returns line is dashed and muted.
- [ ] Total Transactions counts each completed sale once (not each sale line).
- [ ] Average Order Value = Total Revenue / Total Transactions, computed with Decimal division.
- [ ] Return Rate % calculation: (Total Returns Amount / Total Revenue) * 100.
- [ ] Peak hours chart shows 24 bars; the highest bar is fully orange.
- [ ] Stat cards update when the date range changes.
- [ ] Loading state shows skeleton placeholders; empty state shows "No revenue data for this period".

---

## Notes

The `DATE_TRUNC` function accepts a granularity parameter directly in SQL, avoiding the need for three separate query methods. The granularity value comes from the URL query parameter and is interpolated into the SQL string. This is safe because the granularity is constrained to one of three known values (`'day'`, `'week'`, `'month'`) by a validator in the view. Never pass user input directly into SQL without validation.

The peak hours chart uses `EXTRACT(HOUR FROM created_at)` which returns an integer 0–23. This query aggregates all sales across the entire date range into hour buckets, losing day-level granularity. The result is a single 24-bar chart showing the aggregate sales pattern. If the date range spans several months, the chart shows the average hourly pattern across that whole period. A future enhancement could add a day-of-week filter or a heatmap view.

The opacity gradient on the peak hours bars is computed on the frontend by finding the max revenue value across all 24 bars, then computing each bar's opacity as `barRevenue / maxRevenue`. The minimum opacity is 0.2 to ensure that even the lowest bars are visible. The colour is always `#F97316` but with dynamic opacity, which creates a natural visual hierarchy.