# Task 05.01.10 — Build Return Rate Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.10 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-02.01 (Product Data Models — Product, ProductVariant, Category), SP-03.01 (POS Core — Sale model), SP-03.03 (Returns and Exchanges — Return, ReturnLine models) |
| Produces | `frontend/app/[tenantSlug]/reports/returns/page.tsx`, `backend/apps/reports/views/return_rate_view.py` |
| Blocked By | T-05.01.02, SP-02.01, SP-03.01, SP-03.03 |

---

## Objective

The Return Rate report is a critical quality assurance and profitability tool. High return rates erode gross margins (returned items are often unsaleable or must be discounted), increase operational overhead (staff time processing returns), and may signal product quality issues. The report computes the overall return rate percentage for the selected period, breaks it down by product category to identify problem categories, visualises reasons for returns in a donut chart, and lists the top 10 most-returned products for targeted investigation.

The overall return rate is calculated as `total refund amount / total revenue * 100`. A rate below 3% is considered healthy (green), 3–7% is a warning (amber), and above 7% is critical (red). Category-level analysis uses raw SQL to join `ReturnLine` through `ProductVariant` and `Product` to `Category`. The reasons donut chart groups returns by the `reason` field from the `Return` model, with null reasons grouped as "No Reason Given". The top-10 most-returned products table ranks products by total returned units.

---

## Instructions

1. Create `backend/apps/reports/views/return_rate_view.py`:

   ```
   from decimal import Decimal
   from django.db import connection
   from django.db.models import Sum, Count, Q
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import Sale
   from apps.returns.models import Return, ReturnLine
   ```

   GET method with query params `from_date`, `to_date`, `tenant_id` (from JWT).

   a. **Overall Stats**:
      ```
      total_revenue = Sale.objects.filter(
          tenant_id=tenant_id, status='COMPLETED',
          created_at__gte=from_date, created_at__lte=to_date
      ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
      ```
      ```
      total_refunds = Return.objects.filter(
          tenant_id=tenant_id, refund_amount__isnull=False,
          created_at__gte=from_date, created_at__lte=to_date
      ).aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
      ```
      ```
      return_count = Return.objects.filter(
          tenant_id=tenant_id, refund_amount__isnull=False,
          created_at__gte=from_date, created_at__lte=to_date
      ).count()
      ```
      `return_rate = (total_refunds / total_revenue) * 100` if revenue > 0, else `Decimal('0.00')`.

   b. **Category-Level Return Rate**:
      Raw SQL:
      ```sql
      SELECT
        cat.id AS category_id,
        cat.name AS category_name,
        COALESCE(SUM(rl.refund_amount), 0) AS return_amount,
        COALESCE(SUM(rl.quantity), 0) AS returned_units,
        COALESCE(SUM(sl.line_total), 0) AS category_revenue
      FROM return_line rl
      JOIN "return" r ON rl.return_id = r.id
      JOIN product_variant pv ON rl.product_variant_id = pv.id
      JOIN product p ON pv.product_id = p.id
      JOIN category cat ON p.category_id = cat.id
      WHERE r.tenant_id = %s
        AND r.created_at >= %s
        AND r.created_at <= %s
        AND r.refund_amount IS NOT NULL
      GROUP BY cat.id, cat.name
      ORDER BY return_amount DESC
      ```
      For each category, compute `category_return_rate = (return_amount / category_revenue) * 100` if revenue > 0.

   c. **Reasons Breakdown**:
      ```
      reasons = Return.objects.filter(
          tenant_id=tenant_id, refund_amount__isnull=False,
          created_at__gte=from_date, created_at__lte=to_date
      ).values('reason').annotate(
          count=Count('id'),
          total=Sum('refund_amount'))
      ```
      In Python, replace `None` reasons with "No Reason Given". Sort by `count` descending.

   d. **Top 10 Most-Returned Products**:
      Raw SQL:
      ```sql
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(rl.quantity), 0) AS returned_units,
        COALESCE(SUM(rl.refund_amount), 0) AS returned_amount
      FROM return_line rl
      JOIN "return" r ON rl.return_id = r.id
      JOIN product_variant pv ON rl.product_variant_id = pv.id
      JOIN product p ON pv.product_id = p.id
      WHERE r.tenant_id = %s
        AND r.created_at >= %s
        AND r.created_at <= %s
        AND r.refund_amount IS NOT NULL
      GROUP BY p.id, p.name
      ORDER BY returned_units DESC
      LIMIT 10
      ```

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "overall": {
         "totalRevenue": "45230.00",
         "totalRefunds": "1230.00",
         "returnCount": 45,
         "returnRate": 2.72
       },
       "byCategory": [
         {"categoryId": "uuid", "categoryName": "Clothing", "returnAmount": "450.00", "returnedUnits": 15, "categoryRevenue": "15230.00", "returnRate": 2.95}
       ],
       "byReason": [
         {"reason": "Defective", "count": 18, "total": "520.00"},
         {"reason": "No Reason Given", "count": 10, "total": "310.00"}
       ],
       "topReturnedProducts": [
         {"productId": "uuid", "productName": "Classic T-Shirt", "returnedUnits": 8, "returnedAmount": "160.00"}
       ]
     }
   }
   ```

2. Register URL: `path('api/reports/returns/', ReturnRateView.as_view(), name='return-rate')`.

3. Create `frontend/app/[tenantSlug]/reports/returns/page.tsx`:

   **Data Fetching**: `useQuery` with key `['return-rate', from, to]`.

   **Overall Stats Card** (single large card or 3 sub-cards):
   - Total Revenue, Total Refunds, Return Count.
   - Return Rate %: large number with colour coding:
     - `<3%` → green text `#22C55E` with a checkmark icon and "Healthy" label.
     - `3-7%` → amber text `#F59E0B` with a warning icon and "Elevated" label.
     - `>7%` → red bold text `#EF4444` with an alert icon and "Critical" label.

   **Category Breakdown Table**:
   - Columns: Category, Revenue, Returned Amount, Returned Units, Return Rate %.
   - Return Rate % cell: colour-coded with the same 3/7 thresholds.
   - Sortable by Return Rate descending.

   **Reasons Donut Chart**:
   - Recharts `PieChart` with `Pie` component.
   - `innerRadius={60}`, `outerRadius={120}` to create the donut effect.
   - Data from `byReason`. Each slice:
     - Label: reason name and percentage (e.g. "Defective — 40%").
     - Colours: use a categorical palette based on the number of reasons. If there are 5 or fewer reasons, assign distinct colours from the design system palette. If more, use a single hue with varying opacity.
   - `Tooltip` showing reason, count, and total amount.
   - Legend below the chart.

   **Top 10 Most-Returned Products Table**:
   - Columns: Rank, Product Name, Returned Units, Returned Amount.
   - Default sort by Returned Units descending.
   - Each row has a red-tinted left border as a visual severity indicator (opacity proportional to returned units relative to the top item).

   **Loading/Empty/Error States**: Skeletons; "No return data for this period"; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/return_rate_view.py`
- `frontend/app/[tenantSlug]/reports/returns/page.tsx`

---

## Validation

- [ ] Overall Return Rate % = (Total Refunds / Total Revenue) × 100, computed with Decimal arithmetic.
- [ ] Category-level rates are computed against category-specific revenue, not total revenue.
- [ ] Revenue for category return rate is computed from `SaleLine.line_total` for products in that category (completed sales only).
- [ ] "No Reason Given" is the label for returns with a null `reason` field.
- [ ] Donut chart renders all reasons with proportionate slice sizes.
- [ ] Donut chart `innerRadius=60`, `outerRadius=120`.
- [ ] Top 10 products are ordered by returned units descending, limited to 10.
- [ ] Colour thresholds: green `<3%`, amber `3-7%`, red `>7%`.
- [ ] Empty state shown when there are zero returns in the period (return rate = 0%).
- [ ] Category with zero returns for the period but with revenue does not appear (this is correct — no data, no row).

---

## Notes

The category-level return rate uses a raw SQL query joining five tables (`return_line` → `return` → `product_variant` → `product` → `category`). This level of join complexity is difficult to express with Django ORM annotations, and the raw SQL is more readable for future maintainers. The query is scoped to the tenant and date range, and the number of categories is typically small (fewer than 50), so the performance impact is negligible.

The return reason donut chart includes a "No Reason Given" segment for returns where the cashier did not record a reason. This is a deliberate design choice to surface data quality issues: if "No Reason Given" is the largest segment, the store manager has a coaching opportunity. The ideal state is that all returns have a recorded reason. The donut chart's legend and tooltip make it easy to identify this.

The revenue used for category return rates is computed from completed `SaleLine.line_total` values filtered by product category, not from `Sale.total_amount`. This ensures that the denominator matches the numerator at the line-item level. If a single sale includes products from multiple categories, the sale's total amount cannot be attributed to any single category — only line-item totals can be correctly categorised. This is the correct accounting approach but may produce slightly different revenue totals than the overall P&L report, which uses `Sale.total_amount`.
