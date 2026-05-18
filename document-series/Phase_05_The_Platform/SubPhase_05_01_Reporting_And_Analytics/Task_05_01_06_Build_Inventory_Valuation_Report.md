# Task 05.01.06 — Build Inventory Valuation Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.06 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-02.01 (Product Data Models — Product, ProductVariant), SP-02.03 (Stock Control — StockMovement, low_stock_threshold) |
| Produces | `frontend/app/[tenantSlug]/reports/inventory-valuation/page.tsx`, `backend/apps/reports/views/inventory_valuation_view.py` |
| Blocked By | T-05.01.02, SP-02.01, SP-02.03 |

---

## Objective

The Inventory Valuation report gives store owners a clear picture of what their stock is worth. It answers three critical questions: How many units do I have on hand? What is their total cost value? Which items are at risk of stockout or have become dead stock? The report computes stock value as `cost_price * stock_quantity` for every active product variants and surfaces low-stock and dead-stock items through filterable toggles. Low-stock items are those where `stock_quantity <= low_stock_threshold`. Dead-stock items are those with no sale recorded in the last 90 days.

Unlike the transaction-based reports (P&L, Sales, Revenue Trend), the Inventory Valuation report reads primarily from `ProductVariant` — the current state of inventory — rather than from historical transaction tables. The report uses `decimal.js` on the frontend for all stock value calculations because the computation involves multiplying potentially large quantities by cost prices, and floating-point drift would be magnified at scale.

---

## Instructions

1. Create `backend/apps/reports/views/inventory_valuation_view.py`:

   ```
   from decimal import Decimal
   from datetime import timedelta
   from django.db import connection
   from django.db.models import Sum, Q, OuterRef, Subquery
   from django.utils.timezone import now
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from frameworks.reports.models import filters...
   ```

   Actually write correctly:

   ```
   from decimal import Decimal
   from datetime import timedelta
   from django.db import connection
   from django.db.models import Sum, Q
   from django.utils.timezone import now
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.products.models import ProductVariant
   from apps.sales.models import SaleLine
   ```

   GET method with query params `from_date`, `to_date`, `tenant_id` (from JWT), plus optional `low_stock_only` (bool) and `dead_stock_only` (bool).

   a. **Base Query**:
      ```
      variants = ProductVariant.objects.filter(
          tenant_id=tenant_id,
          is_active=True,
      ).select_related('product').only(
          'id', 'sku', 'name', 'stock_quantity', 'cost_price', 'low_stock_threshold',
          'last_sale_date', 'product__name', 'product__sku'
      )
      ```

   b. **Low-Stock Filter**:
      If `low_stock_only` is true, filter: `variants = variants.filter(stock_quantity__lte=F('low_stock_threshold'))`.

   c. **Dead-Stock Filter**:
      If `dead_stock_only` is true, filter: `variants = variants.filter(
          Q(last_sale_date__lt=cutoff_date) | Q(last_sale_date__isnull=True)
      )`. The `cutoff_date` is `timezone.now() - timedelta(days=90)`.

   d. **Compute Dead Stock in Python**:
      For each variant where `last_sale_date` is None or `last_sale_date < cutoff_date`, set `is_dead_stock = True`.

   e. **Compute Stock Value**:
      For each variant, compute `stock_value = cost_price * stock_quantity`. Both are `Decimal` fields, so the multiplication is safe.

   f. **Summary Stats** (computed from the unfiltered set before any filter is applied):
      - `total_skus = variants.count()` (note: this is from the unfiltered set)
      - `total_units = variants.aggregate(total=Sum('stock_quantity'))['total'] or 0`
      - `total_stock_value = sum(v.cost_price * v.stock_quantity for v in variants if v.cost_price and v.stock_quantity)` — computed in Python because Django ORM cannot multiply two fields in `aggregate` without annotating first.

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "summary": {
         "totalSkus": 342,
         "totalUnits": 5842,
         "totalStockValue": "142350.00"
       },
       "rows": [
         {
           "variantId": "uuid",
           "sku": "CTS-L-RED",
           "productName": "Classic T-Shirt",
           "variantName": "Large / Red",
           "stockQuantity": 25,
           "costPrice": "12.50",
           "stockValue": "312.50",
           "lowStockThreshold": 10,
           "isLowStock": false,
           "lastSaleDate": "2026-04-15T10:30:00Z",
           "isDeadStock": false
         }
       ]
     }
   }
   ```

2. Register URL: `path('api/reports/inventory-valuation/', InventoryValuationView.as_view(), name='inventory-valuation')`.

3. Create `frontend/app/[tenantSlug]/reports/inventory-valuation/page.tsx`:

   **Data Fetching**: `useQuery` with key `['inventory-valuation', from, to, lowStockOnly, deadStockOnly]`.

   **Filter Toggles**:
   - Two ShadCN Switch components labelled "Low Stock Only" and "Dead Stock Only".
   - When toggled, update URL search params `low_stock_only` and `dead_stock_only` to `true` or `false`.
   - API call includes these params.

   **Summary Cards** (unfiltered, displayed above the filter toggles):
   - Total SKUs: count of unique product variants.
   - Total Units: sum of `stock_quantity` across all active variants.
   - Total Stock Value: sum of `cost_price * stock_quantity` formatted in JetBrains Mono.

   **Data Table**:
   - Columns: SKU, Product, Variant, Stock Qty, Cost Price, Stock Value, Last Sale.
   - Stock Qty cell: rendered in red (`#EF4444`) and bold if `isLowStock` is true.
   - Last Sale cell: formatted as "MMM dd, yyyy". If `lastSaleDate` is null, display "Never" in muted text.
   - If `isDeadStock` is true, the entire row has a subtle amber (`#F59E0B`) left border.
   - Table body: alternate row backgrounds (`#FFFFFF` and `#F8FAFC`).
   - Sortable by any column.

   **Summary Footer**:
   - Fixed bottom row showing totals: Total Units (sum), Total Stock Value (sum of all displayed rows).

   **Loading/Empty/Error States**: Skeletons for cards and table; empty-state "No active variants found"; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/inventory_valuation_view.py`
- `frontend/app/[tenantSlug]/reports/inventory-valuation/page.tsx`

---

## Validation

- [ ] Summary cards show unfiltered totals even when low-stock or dead-stock filters are active.
- [ ] Stock Value = Cost Price × Stock Quantity for every row, using `decimal.js` multiplication.
- [ ] Low Stock toggle filters to rows where `stock_quantity <= low_stock_threshold`.
- [ ] Dead Stock toggle filters to rows with no sale in 90 days or `last_sale_date` is null.
- [ ] Both toggles can be active simultaneously (low stock AND dead stock).
- [ ] Toggling a filter re-fetches data from the API; the URL params update.
- [ ] Stock Qty in red for low-stock items; normal colour for adequately stocked items.
- [ ] "Never" displayed for variants that have never been sold.
- [ ] Empty state shown when all variants are filtered out.
- [ ] Table sorts correctly by each column (numeric columns sort numerically, not lexicographically).

---

## Notes

The stock value computation (`cost_price * stock_quantity`) uses the current cost price from `ProductVariant.cost_price`. This is a simplification — if cost prices have changed over time, the inventory valuation reflects the current cost, not the weighted average or FIFO cost. For most retail stores using LankaCommerce, this approximation is acceptable because cost prices change infrequently. If accurate inventory valuation by acquisition cost is required, a future enhancement could compute weighted average cost from purchase receipts.

The `last_sale_date` field on `ProductVariant` is updated by the POS system every time a sale line is created for that variant. This field serves double duty: it powers the dead-stock detection in this report and provides a quick sanity check for inventory managers. The report's dead-stock detection queries this field rather than scanning the `SaleLine` table, which would be prohibitively expensive for large datasets. Variants that have never been sold have `last_sale_date = null` and are always classified as dead stock if they are at least 90 days old.

The `is_active` filter ensures that archived or discontinued products are excluded from the valuation. This is intentional — the report represents actionable inventory value. Discontinued products that remain in stock should be valued separately (likely at a discounted rate) in a dedicated write-off analysis.