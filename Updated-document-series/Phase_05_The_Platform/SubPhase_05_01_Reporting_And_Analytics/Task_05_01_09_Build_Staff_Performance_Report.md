# Task 05.01.09 — Build Staff Performance Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.09 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-03.01 (POS Core — Sale model), SP-04.02 (Staff Promotions and Expenses — TimeClock, CommissionRecord models) |
| Produces | `frontend/app/[tenantSlug]/reports/staff-performance/page.tsx`, `backend/apps/reports/views/staff_performance_view.py` |
| Blocked By | T-05.01.02, SP-03.01, SP-04.02 |

---

## Objective

The Staff Performance report provides a consolidated view of each staff member's contribution to the business across three dimensions: sales productivity, hours worked, and commission earned. It answers questions like: Which cashier processes the most transactions? Who has the highest average transaction value? Are commission costs aligned with revenue generation? The report joins data from the `Sale` table (grouped by `cashier_id`), the `TimeClock` table (hours worked computed from clock-in/clock-out timestamps), and the `CommissionRecord` table (commission earned and paid).

Role-based access control is critical for this report. A `CASHIER` can only see their own row — they should not be able to view their colleagues' performance data. A `MANAGER` or `OWNER` can see all staff. A `STOCK_CLERK` is redirected away from this page entirely because stock clerks do not have sales or commission data. These access rules are enforced on both the backend (the view filters data based on the JWT `user.role` and `user.user_id`) and the frontend (the page checks the role and conditionally renders content or a redirect).

---

## Instructions

1. Create `backend/apps/reports/views/staff_performance_view.py`:

   ```
   from decimal import Decimal
   from django.db import connection
   from django.db.models import Sum, Count, Q
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import Sale
   from apps.staff.models import TimeClock, CommissionRecord
   from apps.users.models import User
   ```

   GET method with query params `from_date`, `to_date`, `tenant_id`, `user_id`, `role` (all from JWT).

   a. **Role-Based Access**:
      - If `role == 'STOCK_CLERK'`: return 403 with `{ "success": False": False, "error": { "code": "FORBIDDEN", "message": "Stock clerks cannot access staff performance reports." } }`.
      - If `role == 'CASHIER'`: scope all queries to `user_id` only (the cashier's own ID).
      - If `role in ('MANAGER', 'OWNER')`: no user-level filter — show all staff.

   b. **Sales by Cashier**:
      ```
      ```
      sales_data = Sale.objects.filter(
          tenant_id=tenant_id,
          status='COMPLETED',
          created_at__gte=from_date,
          created_at__lte=to_date,
      )
      if role == 'CASHIER':
          sales_data = sales_data.filter(cashier_id=user_id)
      sales_data = sales_data.values('cashier_id').annotate(
          total_revenue=Sum('total_amount'),
          transaction_count=Count('id')
      ).order_by('-total_revenue')
      ```

   c. **Hours Worked**:
      Use raw SQL with `EXTRACT(EPOCH FROM ...)` to compute total hours:
      ```sql
      SELECT tc.user_id,
             COALESCE(SUM(EXTRACT(EPOCH FROM (tc.clock_out - tc.clock_in))) / 3600.0, 0) AS total_hours
      FROM time_clock tc
      WHERE tc.tenant_id = %s
        AND tc.clock_in >= %s
        AND tc.clock_out <= %s
        AND tc.clock_out IS NOT NULL
      ```
      If `role == 'CASHIER'`, add `AND tc.user_id = %s`.
      Group by `tc.user_id`.

   d. **Commission Data**:
      ```
      commission_data = CommissionRecord.objects.filter(
          tenant_id=tenant_id,
          created_at__gte=from_date,
          created_at__lte=to_date,
      )
      if role == 'CASHIER':
          commission_data = commission_data.filter(user_id=user_id)
      commission_data = commission_data.values('user_id').annotate(
          total_commission=Sum('commission_amount'),
          paid_commission=Sum('commission_amount', filter=Q(is_paid=True))
      paid=True))
      )
      ```

   e. **Fetch User Records**:
      Collect all `user_id` values from the three datasets. Fetch `User.objects.filter(id__in=user_ids).only('id', 'name', 'role')`.

   f. **Merge**:
      For each user, combine:
      - `total_revenue` and `transaction_count` from sales data (default 0).
      - `total_hours` from time clock data (default 0.0).
      - `total_commission` and `paid_commission` from commission data (default 0).
      - Compute `avg_transaction_value = total_revenue / transaction_count` if count > 0.

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "rows": [
         {
           "userId": "uuid",
           "staffName": "Kamal Perera",
           "role": "CASHIER",
           "hoursWorked": 152.5,
           "transactionCount": 312,
           "totalRevenue": "28450.00",
           "avgTransactionValue": "91.19",
           "commissionEarned": "712.00",
           "commissionPaid": "500.00"
         }
       ],
       "isRestricted": false
     }
   }
   ```
   The `isRestricted` field is `true` when the requesting user is a CASHIER (indicating they see only their own data).

2. Register URL: `path('api/reports/staff-performance/', StaffPerformanceView.as_view(), name='staff-performance')`.

3. Create `frontend/app/[tenantSlug]/reports/staff-performance/page.tsx`:

   **Data Fetching**: `useQuery` with key `['staff-performance', from, to]`.

   **Role Check**:
   - Import `useAuth()` to get the current user's role.
   - If `role === 'STOCK_CLERK'`, render a redirect message: "You do not have permission to view this report. Please contact your manager." with a link back to the dashboard.
   - If `role === 'CASHIER'`, render an info alert at the top: "You are viewing your own performance data only." with a muted info icon (`#3B82F6`).

   **Data Table**:
   - Columns: Staff Name, Role, Hours Worked, Sales Count, Total Revenue, Avg Transaction Value, Commission Earned, Commission Paid.
   - Default sort by Total Revenue descending.
   - Role column: ShadCN Badge with colour coding (OWNER=navy, MANAGER=orange, CASHIER=border).
   - Hours Worked: formatted as `152h 30m` (hours and minutes).
   - Monetary columns in JetBrains Mono.

   **Bar Chart**:
   - `ResponsiveContainer` width="100%" height={350}.
   - `BarChart` vertical (`layout="vertical"`).
   - `Bar` dataKey="totalRevenue" fill="#F97316" (orange).
   - An average reference line: a dashed horizontal line at the average revenue across all staff. Use Recharts `ReferenceLine` with `stroke="#64748B"` and `strokeDasharray="5 5"`.
   - `XAxis` with monetary formatting.
   - `YAxis` dataKey="staffName".

   **Loading/Empty/Error States**: Skeletons; "No staff performance data for this period"; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/staff_performance_view.py`
- `frontend/app/[tenantSlug]/reports/staff-performance/page.tsx`

---

## Validation

- [ ] CASHIER role sees only their own row; the info alert "You are viewing your own performance data only" is displayed.
- [ ] MANAGER/OWNER role sees all staff rows; no info alert is displayed.
- [ ] STOCK_CLERK role receives a 403 response and sees a permission-denied message.
- [ ] Hours Worked is computed correctly: `SUM(EXTRACT(EPOCH FROM (clock_out - clock_in))) / 3600.0`.
- [ ] Commission Earned and Commission Paid are distinct columns with correct values.
- [ ] Average Transaction Value = Total Revenue / Transaction Count.
- [ ] Bar chart renders with an average reference line.
- [ ] Staff with sales but no time clock entries show 0 hours (not null).
- [ ] Staff with time clock entries but no sales show 0 revenue (not null).
- [ ] Table sorts correctly by each column.

---

## Notes

The hours-worked computation uses `EXTRACT(EPOCH FROM (clock_out - clock_in))` which returns the difference in seconds. Dividing by 3600 gives decimal hours (e.g., 8.5 for 8 hours 30 minutes). The frontend formats this as `8h 30m` using a helper function. This approach is more accurate than computing hours from integer timestamps because it correctly handles partial hours and avoids rounding errors.

The commission data shows both earned and paid amounts because they can differ. Commission may be earned in one pay period but paid in a later one. The `CommissionRecord.is_paid` boolean field tracks payment status. The report sums `commission_amount` for earned (all records) and filters by `is_paid=True` for paid. If a store pays commissions immediately, the two values will be equal.

The role-based access control is enforced on the backend as the primary gate. The frontend role check is a UX convenience that prevents the CASHIER from seeing an empty table and wondering why. The backend 403 for STOCK_CLERK is the definitive enforcement — even if a STOCK_CLERK somehow navigates to the page, the API directly, they will receive an error response. The frontend redirect is a secondary layer that provides a better user experience.