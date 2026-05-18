# Task 05.01.04 — Build Sales Reports

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.04 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-02.01 (Product Data Models — Product, ProductVariant), SP-02.02 (Product Management UI — product/category relationships), SP-03.01 (POS Core — Sale, SaleLine models), SP-03.03 (Returns and Exchanges — ReturnLine), SP-04.02 (Staff Promotions and Expenses — CommissionRecord) |
| Produces | `frontend/app/[tenantSlug]/reports/sales-by-product/page.tsx`, `frontend/app/[tenantSlug]/reports/sales-by-staff/page.tsx` |
| Blocked By | T-05.01.02, SP-02.01, SP-03.01, SP-03.03, SP-04.02 |

---

## Objective

Sales reports give store owners and managers granular visibility into what is selling and who is selling it. The Sales by Product report breaks down every completed sale line item grouped by product variant, revealing which products, showing units sold, gross revenue, returns, net revenue, and the percentage of total revenue each product represents. The Sales by Staff report shifts the lens to the cashier: it aggregates sales totals and transaction counts per staff member and overlays commission data so that owners can evaluate both revenue generation and the cost of sales commissions.

Both reports share a common technical foundation: they query `SaleLine` and `Sale` records filtered by tenant, date range, and completed status, then group results using Django ORM `values()` and `annotate()`. The frontend renders an interactive sortable table and a top-10 bar chart. All monetary values use `decimal.js` formatting.

---

## Instructions

### Sales by Product

1. Create `backend/apps/reports/views/sales_by_product_view.py`:

   ```
   from django.db.models import Sum, Count, Q
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import SaleLine
   from apps.returns.models import ReturnLine import returnLine
   ```

   GET method with query params `from_date`, `to_date`, `tenant_id` (from JWT).

   a. **Gross Sales per Variant**:
      ```
      SaleLine.objects.filter(
          sale__tenant_id=tenant_id,
          sale__status='COMPLETED',
          sale__created_at__gte=from_date,
          sale__created_at__lte=to_date
      ).values('product_variant_id').annotate(
          gross_revenue=Sum('line_total'),
          units_sold=Sum('quantity'),
          sale_count=Count('id')
      ).order_by('-gross_revenue')
      ```

   b. **Returns per Variant**:
      ```
      ReturnLine.objects.filter(
          return__tenant_id=tenant_id,
          return__created_at__gte=from_date,
          return__created_at__lte=to_date
      ).values('product_variant_id').annotate(
          returned_units=Sum('quantity'),
          refund_total=Sum('refund_amount')
      )
      ```
      Convert to a dict keyed by `product_variant_id` for JS-side merge.

   c. **Join with ProductVariant and Product**:
      For each variant ID in the gross sales result, fetch:
      ```
      ProductVariant.objects.filter(id__in=variant_ids).select_related('product').only(
          'id', 'sku', 'name', 'product__name', 'product__category'
      )
      ```

   d. Compute for each row:
      - `net_revenue = Decimal(gross_revenue) - Decimal(refund_total or 0)`
      - `total_revenue = sum of all net_revenue across all rows`
      - `pct_of_total = (net_revenue / total_revenue) * 100` if total_revenue > 0

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "rows": [
         {
           "productVariantId": "uuid",
           "productName": "Classic T-Shirt",
           "variantName": "Large / Red",
           "sku": "CTS-L-RED",
           "unitsSold": 42,
           "grossRevenue": "2100.00",
           "returns": "150.00",
           "returnedUnits": 3,
           "netRevenue": "1950.00",
           "pctOfTotal": 12.45
         }
       ],
       "totalRevenue": "15660.00"
     }
   }
   ```

2. Register URL: `path('api/reports/sales-by-product/', SalesByProductView.as_view(), name='sales-by-product')`.

3. Create `frontend/app/[tenantSlug]/reports/sales-by-product/page.tsx`:

   **Data Fetching**: Use TanStack Query with `useQuery`, key `['sales-by-product', from, to]`. URL: `/api/reports/sales-by-product/?from_date=${from}&to_date=${to}`.

   **Sortable Table**:
   - Columns: Product, Variant, SKU, Units Sold, Gross Revenue, Returns, Net Revenue, % of Total.
   - Clicking a column header sorts ascending, clicking again sorts descending. Default sort by Net Revenue descending.
   - Each row has a subtle hover background (`#F8FAFC`).
   - Monetary columns use JetBrains Mono font, right-aligned.
   - % of Total rendered as a small bar visual (width proportional to percentage) behind the text.

   **Top-10 Bar Chart**:
   - `ResponsiveContainer` width="100%" height={300}.
   - `BarChart` horizontal (`layout="vertical"`) for readability with product names on the y-axis.
   - `Bar` dataKey="netRevenue" fill="#F97316" (orange).
   - Only the top 10 rows by net revenue are charted.
   - `XAxis` with monetary formatting.
   - `YAxis` dataKey="productName" with product name labels (truncate at 25 chars with ellipsis).

   **Loading/Empty/Error States**: Same pattern as P&L — skeleton, empty-state illustration, error alert with retry.

### Sales by Staff

4. Create `backend/apps/reports/views/sales_by_staff_view.py`:

   a. **Sales by Cashier**:
      ```
      Sale.objects.filter(
          tenant_id=tenant_id,
          status='COMPLETED',
          created_at__gte=from_date,
          created_at__lte=to_date
      ).values('cashier_id').annotate(
          total_revenue=Sum('total_amount'),
          transaction_count=Count('id')
      ).order_by('-total_revenue')
      ```

   b. **Commission by User**:
      ```
      CommissionRecord.objects.filter(
          tenant_id=tenant_id,
          created_at__gte=from_date,
          created_at__lte=to_date
      ).values('user_id').annotate(
          total_commission=Sum('commission_amount')
      )
      ```

   c. **Fetch User Records**:
      For each `cashier_id` / `user_id`, fetch `User.objects.filter(id__in=user_ids).only('id', 'name', 'role')`.

   d. For each row compute:
      - `avg_transaction_value = total_revenue / transaction_count` if count > 0.

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
           "transactionCount": 156,
           "totalRevenue": "12450.00",
           "avgTransactionValue": "42.31",
           "commissionEarned": "312.00"
         }
       ]
     }
   }
   ```

5. Register URL: `path('api/reports/sales-by-staff/', SalesByStaffView.as_view(), name='sales-by-staff')`.

6. Create `frontend/app/[tenantSlug]/reports/sales-by-staff/page.tsx`:

   **Data Fetching**: `useQuery` with key `['sales-by-staff', from, to]`.

   **Sortable Table**:
   - Columns: Staff Name, Role, Transactions, Total Revenue, Avg Transaction Value, Commission Earned.
   - Default sort by Total Revenue descending.
   - Role column: shadcn Badge with role-specific colouring (OWNER=navy, MANAGER=orange, CASHIER=sand/`#E2E8F0`).

   **Top-10 Bar Chart**:
   - Horizontal `BarChart`.
   - `Bar` dataKey="totalRevenue" fill="#E2E8F0" (border colour) as specified in the design.
   - Only the top 10 staff by revenue.

   **Loading/Empty/Error States**: Same as above.

---

## Expected Output

- `backend/apps/reports/views/sales_by_product_view.py`
- `backend/apps/reports/views/sales_by_staff_view.py`
- `frontend/app/[tenantSlug]/reports/sales-by-product/page.tsx`
- `frontend/app/[tenantSlug]/reports/sales-by-staff/page.tsx`

---

## Validation

- [ ] Sales by Product correctly nets returns against gross revenue for each variant.
- [ ] % of Total sums to 100.00% across all rows (within rounding tolerance of 0.02%).
- [ ] Top-10 chart renders exactly the 10 highest-revenue products.
- [ ] Sortable table sorts correctly by each column in both directions.
- [ ] Sales by Staff correctly aggregates all completed sales for each cashier.
- [ ] Commission data joins correctly — if a staff member has sales but no commission, commission shows 0.00.
- [ ] Average Transaction Value = Total Revenue / Transaction Count (not using SQL AVG to avoid integer division issues).
- [ ] Staff with zero sales in the period still appear with zero values (LEFT JOIN semantics considered — if they have no sales, they may not appear; this is acceptable and documented).
- [ ] Role badges render with correct colours.
- [ ] Both pages handle loading, empty, and error states gracefully.

---

## Notes

The Sales by Product query uses a two-phase approach: first fetch aggregated sale line data, then fetch product variant details with a `select_related('product')` call. This is more efficient than a single giant query with joined aggregates because the aggregation runs on a relatively small set of rows (one per variant), and the join to Product and Category happens in a second query. For most retail stores with fewer than 10,000 active variants, this approach completes in under 200ms.

The Sales by Staff report has an important limitation: staff members with no sales in the selected period will not appear in the results because the query groups only by `cashier_id` values that exist in the Sale table for that period. This is intentional behaviour — showing a row with all zeros for a staff member who did not work that period would be misleading. The staff attendance report (SubPhase 04.02) is the appropriate place to see who was scheduled vs. who actually worked.

Commission data in the Sales by Staff report shows earned commission, not paid commission. The distinction matters because commission may be earned in one period but paid in a later period. The `CommissionRecord` model tracks both; this report uses the `commission_amount` field (earned amount) summed across the selected date range. A future enhancement could add a toggle to switch between earned and paid views.