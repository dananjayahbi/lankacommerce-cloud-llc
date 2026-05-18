# Task 05.01.08 — Build Customer Analytics Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.08 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-03.01 (POS Core — Sale model), SP-04.01 (CRM and Supplier Management — Customer model) |
| Produces | `frontend/app/[tenantSlug]/reports/customers/page.tsx`, `backend/apps/reports/views/customer_analytics_view.py` |
| Blocked By | T-05.01.02, SP-03.01, SP-04.01 |

---

## Objective

The Customer Analytics report gives store owners insight into their customer base across three dimensions: top spenders, new versus returning customers, and churn risk. The Top Customers section ranks customers by lifetime spend, helping owners identify their most valuable patrons. The New vs Returning section tracks acquisition versus retention by classifying customers based on when they made their first-ever purchase. The Churn Risk section flags customers who have not visited in 60 to 365 days, colour-coded by severity.

Customer phone numbers are masked for privacy: cashiers see only the last four digits. Managers and owners see the full number. This role-based masking is enforced on the backend based on the JWT `user.role` claim. The report uses data from the `Sale` table (customer purchases) and the `Customer` table (profile information). No new models are required.

---

## Instructions

1. Create `backend/apps/reports/views/customer_analytics_view.py`:

   ```
   from decimal import Decimal
   from datetime import timedelta, date as date_module
   from django.db import connection
   from django.db.models import Sum, Count, Q, Min
   from django.utils.timezone import now
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.sales.models import Sale
   from apps.customers.models import Customer
   ```

   GET method with query params `from_date`, `to_date`, `tenant_id`, and `role` (from JWT user.role).

   a. **Top Customers**:
      ```
      top_customers = Sale.objects.filter(
          tenant_id=tenant_id,
          status='COMPLETED',
          created_at__gte=from_date,
          created_at__lte=to_date,
          customer_id__isnull=False
      ).values('customer_id').annotate(
          total_spend=Sum('total_amount'),
          visit_count=Count('id')
      ).order_by('-total_spend')[:50]
      ```
      Fetch Customer records for all customer IDs in the result: `Customer.objects.filter(id__in=customer_ids).only('id', 'name', 'phone', 'email')`.

      For each customer, apply phone masking based on `user.role`:
      - If `role == 'CASHIER'`: mask all but last 4 digits, e.g. `*******1234`.
      - If `role in ('MANAGER', 'OWNER')`: show full phone number.

      Compute `avg_spend_per_visit = total_spend / visit_count` where visit_count > 0.

   b. **New vs Returning**:
      Use raw SQL to find each customer's first-ever sale date:
      ```sql
      SELECT customer_id, MIN(created_at) AS first_purchase_date
      FROM sale
      WHERE tenant_id = %s
        AND customer_id IS NOT NULL
      GROUP BY customer_id
      ```
      Then classify customers per week in the selected date range:
      - A "new" customer this week: first_purchase_date falls within that week.
      - A "returning" customer this week: they made at least one purchase that week but their first_purchase_date is before that week.

      Return as weekly buckets:
      ```sql
      SELECT DATE_TRUNC('week', s.created_at) AS week,
             COUNT(DISTINCT s.customer_id) FILTER (
               WHERE fc.first_purchase_date >= DATE_TRUNC('week', s.created_at)
             ) AS new_customers,
             COUNT(DISTINCT s.customer_id) FILTER (
               WHERE fc.first_purchase_date < DATE_TRUNC('week', s.created_at)
             ) AS returning_customers
      FROM sale s
      JOIN (...) fc ON s.customer_id = fc.customer_id
      WHERE ...
      GROUP BY week
      ORDER BY week
      ```
      The subquery `fc` is the first-purchase query above. A simpler approach: compute in Python by joining the two datasets.

   c. **Churn Risk**:
      ```sql
      SELECT
        c.id, c.name, c.phone, c.email,
        MAX(s.created_at) AS last_visit_date,
        COALESCE(SUM(s.total_amount), 0) AS lifetime_spend
      FROM customer c
      LEFT JOIN sale s ON c.id = s.customer_id AND s.tenant_id = %s
      WHERE c.tenant_id = %s
      GROUP BY c.id
      HAVING MAX(s.created_at) >= %s
         AND MAX(s.created_at) < %s
      ```
      The `HAVING` clause selects customers whose last visit is between 60 and 365 days ago. Compute `days_since_last_visit = (today - last_visit_date).days`. Classify:
      - `days_since_last_visit < 60`: not at risk (excluded from HAVING).
      - `60 <= days_since_last_visit < 90`: "At Risk" — warning badge (`#F59E0B`).
      - `90 <= days_since_last_visit <= 365`: "Churned" — danger badge (`#EF4444`).

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "topCustomers": [
         {
           "customerId": "uuid",
           "name": "Nimal Fernando",
           "phone": "*******1234",
           "totalSpend": "45200.00",
           "visitCount": 34,
           "avgSpendPerVisit": "1329.41"
         }
       ],
       "newVsReturning": [
         {"week": "2026-01-06T00:00:00Z", "new": 5, "returning": 18}
       ],
       "churnRisk": [
         {
           "customerId": "uuid",
           "name": "Priya Jayawardena",
           "lastVisitDate": "2025-11-12T14:30:00Z",
           "daysSinceLastVisit": 187,
           "lifetimeSpend": "12500.00",
           "riskLevel": "churned"
         }
       ]
     }
   }
   ```

2. Register URL: `path('api/reports/customers/', CustomerAnalyticsView.as_view(), name='customer-analytics')`.

3. Create `frontend/app/[tenantSlug]/reports/customers/page.tsx`:

   **Data Fetching**: `useQuery` with key `['customers', from, to]`.

   **Section 1 — Top Customers**:
   - Heading "Top Customers by Spend" in Inter bold.
   - Table: Rank, Name, Phone, Total Spend, Visits, Avg Spend/Visit.
   - Default sort by Total Spend descending.
   - Top 3 rows highlighted with a subtle gold background (`#FFFBEB`) and a small trophy icon.

   **Section 2 — New vs Returning**:
   - Heading "New vs Returning Customers".
   - Stacked bar chart via Recharts:
     - `ResponsiveContainer` width="100%" height={300}.
     - `BarChart` data from `newVsReturning`.
     - Two bars stacked via `stackId="a"`:
       - New: fill `#E2E8F0` (border colour).
       - Returning: fill `#F97316` (orange).
     - `XAxis` dataKey="week" formatted as "MMM dd".
     - `YAxis` tick count integers.
     - `Tooltip` showing new and returning counts.
     - Legend: "New Customers", "Returning Customers".

   **Section 3 — Churn Risk**:
   - Heading "Churn Risk".
   - Summary stat card: "At Risk" count (amber) and "Churned" count (red).
   - Table: Name, Phone, Last Visit, Days Since Last Visit, Lifetime Spend, Status.
   - Status column renders a badge: "At Risk" (`#F59E0B` amber background) or "Churned" (`#EF4444` red background).
   - Sortable by Days Since Last Visit descending (most at-risk first).

   **Loading/Empty/Error States**: Skeletons per section; empty-state text when no customer data; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/customer_analytics_view.py`
- `frontend/app/[tenantSlug]/reports/customers/page.tsx`

---

## Validation

- [ ] Top Customers list is ordered by total spend descending, limited to 50.
- [ ] Phone masking: CASHIER role sees `*******1234` format; MANAGER/OWNER sees full number.
- [ ] New vs Returning chart shows exactly one bar group per week in the selected range.
- [ ] Stacked bar correctly shows new + returning = total unique customers that week.
- [ ] Churn Risk correctly computes `days_since_last_visit` from today's date.
- [ ] Churn Risk filters: only customers with last visit 60–365 days ago appear.
- [ ] "At Risk" badge is amber (`#F59E0B`); "Churned" badge is red (`#EF4444`).
- [ ] Customers with `lastVisitDate` exactly 365 days ago are included; customers at 366 days are not.
- [ ] Empty state shown when no customers exist or no sales are linked to customers.
- [ ] Top 3 rows in Top Customers have distinct visual highlighting.

---

## Notes

Customer analytics relies on the `customer_id` field being populated on `Sale` records. If the POS system allows anonymous sales (where `customer_id` is null), those sales will not contribute to customer analytics. This is a deliberate trade-off: anonymous sales still count toward revenue reports, but they are invisible in customer-level analysis. Store owners who want accurate customer analytics should enforce customer identification at the point of sale.

The churn risk window (60–365 days) is optimised for retail stores where customers typically visit every 2–4 weeks. A 60-day gap without a visit suggests the customer has changed their shopping behaviour. The upper bound of 365 days prevents the dataset from including customers who may have moved away or stopped shopping entirely years ago. Stores with longer sales cycles (e.g., furniture, electronics) may want to adjust these thresholds. They are hardcoded in the backend view but could be made configurable via tenant settings in a future enhancement.

Phone masking is enforced on the backend, not the frontend. The backend view checks the `user.role` claim from the JWT and returns the masked or full phone number accordingly. This prevents a CASHIER from inspecting network responses or modifying frontend code to reveal full phone numbers. The frontend simply renders whatever the backend returns — it never stores or transforms the unmasked number.