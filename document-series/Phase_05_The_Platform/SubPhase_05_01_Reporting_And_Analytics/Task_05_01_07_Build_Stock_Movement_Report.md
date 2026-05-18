# Task 05.01.07 — Build Stock Movement Report

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.07 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (Report layout shell), SP-02.01 (Product Data Models — Product, ProductVariant), SP-02.03 (Stock Control — StockMovement model) |
| Produces | `frontend/app/[tenantSlug]/reports/stock-movements/page.tsx`, `backend/apps/reports/views/stock_movement_view.py` |
| Blocked By | T-05.01.02, SP-02.01, SP-02.03 |

---

## Objective

The Stock Movement report provides an auditable trail of every inventory change within a selected date range. It is the operational counterpart to the Inventory Valuation report — valuation tells you what you have, stock movements tell you how it got there. Each row represents a single `StockMovement` record: a sale that decremented stock, a purchase receipt that incremented it, an adjustment that corrected a count, or a write-off that removed damaged goods. The report is paginated (50 rows per page) and filterable by variant name and movement type.

This report is essential for inventory reconciliation and loss prevention. If a manager notices that the inventory valuation for a specific product seems incorrect, they can use this report to trace every movement affecting that product and identify the discrepancy. The movement type badges are colour-coded for quick visual scanning: red for write-offs, green for purchase receipts, blue for sales, and so on. The delta column shows the quantity change with an explicit `+` or `-` prefix.

---

## Instructions

1. Create `backend/apps/reports/views/stock_movement_view.py`:

   ```
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework.pagination import PageNumberPagination
   from rest_framework.permissions import IsAuthenticated
   from django.db.models import Sum, Count, Q
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission
   from apps.stock.models import StockMovement
   from apps.products.models import ProductVariant
   ```

   GET method with query params: `from_date`, `to_date`, `tenant_id` (from JWT), `variant_search` (optional), `movement_type` (optional), `page` (default 1).

   a. **Movement Type Choices** (from `StockMovement.movement_type` TextChoices):
      - `SALE`: Sale decrement.
      - `RETURN`: Return increment.
      - `PURCHASE_RECEIPT`: Purchase order receipt increment.
      - `ADJUSTMENT_IN`: Positive inventory adjustment.
      - `ADJUSTMENT_OUT`: Negative inventory adjustment.
      - `WRITE_OFF`: Damaged or expired write-off.

   b. **Base Query**:
      ```
      movements = StockMovement.objects.filter(
          tenant_id=tenant_id,
          created_at__gte=from_date,
          created_at__lte=to_date,
      ).select_related(
          'product_variant__product', 'actor'
      ).order_by('-created_at')
      ```

   c. **Variant Search Filter**:
      If `variant_search` is provided and non-empty, filter:
      ```
      movements = movements.filter(
          Q(product_variant__sku__icontains=variant_search)
          | Q(product_variant__product__name__icontains=variant_search)
          | Q(product_variant__name__icontains=variant_search)
      )
      ```

   d. **Movement Type Filter**:
      If `mover`:
      If `movement_type` is provided, filter:
      ```
      movements = movements.filter(movement_type=movement_type)
      ```

   e. **Composition Summary** (unfiltered — computed before variant/movement type filters):
      ```
      summary = StockMovement.objects.filter(
          tenant_id=tenant_id,
          created_at__gte=from_date,
          created_at__lte=to_date,
      ).values('movement_type').annotate(
          total_delta=Sum('delta'),
          count=Count('id')
      ).order_by('movement_type')
      ```

   f. **Pagination**:
      Use DRF `PageNumberPagination` with `page_size=50`. Serialize each row with:
      - `id`, `created_at` (formatted ISO string)
      - `product_name` (from `product_variant.product.name`)
      - `variant_name` (from `product_variant.name`)
      - `sku` (from `product_variant.sku`)
      - `movement_type` (string value)
      - `delta` (integer, positive or negative)
      - `actor_name` (from `actor.name`)
      - `reference` (optional, e.g. sale ID or PO number)

   Return envelope:
   ```
   {
     "success": True,
     "data": {
       "summary": [
         {"movementType": "SALE", "totalDelta": -342, "count": 120},
         {"movementType": "PURCHASE_RECEIPT", "totalDelta": 500, "count": 15}
       ],
       "results": [...],
       "pagination": {
         "page": 1,
         "pageSize": 50,
         "totalPages": 8,
         "totalCount": 374
       }
     }
   }
   ```

2. Register URL: `path('api/reports/stock-movements/', StockMovementView.as_view(), name='stock-movements')`.

3. Create `frontend/app/[tenantSlug]/reports/stock-movements/page.tsx`:

   **Data Fetching**: `useQuery` with key `['stock-movements', from, to, variantSearch, movementType, page]`.

   **Filters** (above the table):
   - Text input for variant search (placeholder "Search by product name or SKU..."). Debounced by 300ms to avoid excessive API calls on every keystroke.
   - Movement type dropdown: ShadCN Select with options "All Types", "Sale", "Return", "Purchase Receipt", "Adjustment In", "Adjustment Out", "Write Off". Selecting a type sets `movement_type` in URL params.

   **Summary Cards** (4 cards):
   - Net Movement: sum of all deltas (+green, -red).
   - Total In: sum of positive deltas.
   - Total Out: sum of negative deltas (absolute value).
   - Total Movements: count of all movement records.

   Alternatively, render the movement type summary as a compact table showing each type with its total delta and count.

   **Data Table**:
   - Columns: Date, Product, Variant, Movement Type, Delta, Actor, Reference.
   - Date: formatted as "MMM dd, yyyy HH:mm".
   - Movement Type: ShadCN Badge with colour coding:
     - `SALE` — navy background `#1B2B3A`, white text.
     - `RETURN` — border colour `#E2E8F0`, navy text.
     - `PURCHASE_RECEIPT` — green `#22C55E` background, white text.
     - `ADJUSTMENT_IN` — info `#3B82F6` background, white text.
     - `ADJUSTMENT_OUT` — warning `#F59E0B` background, white text.
     - `WRITE_OFF` — danger `#EF4444` background, white text.
   - Delta: prefixed with `+` (green text) or `-` (red text). Bold.
   - Reference: if a sale or purchase order link is available, render as an anchor (`Link` component) to the relevant detail page. Otherwise, show a dash.

   **Pagination Controls**:
   - "Previous" and "Next" buttons at the bottom of the table.
   - Page indicator: "Page 3 of 8 (374 total movements)".
   - Disabled state for Previous when on page 1, and Next when on the last page.

   **Loading/Empty/Error States**: Skeleton rows; "No stock movements found for this period"; error alert with retry.

---

## Expected Output

- `backend/apps/reports/views/stock_movement_view.py`
- `frontend/app/[tenantSlug]/reports/stock-movements/page.tsx`

---

## Validation

- [ ] Pagination returns exactly 50 rows per page (except the last page).
- [ ] Variant search with partial product name returns all matching movements (case-insensitive).
- [ ] Movement type filter returns only movements of that type.
- [ ] Both variant search and movement type filter can be active simultaneously.
- [ ] Movement type summary is **not** affected by filters — it always shows totals for the full date range.
- [ ] Delta column displays `+` for positive values and `-` for negative values; zero delta is never expected but would render as `0`.
- [ ] Badge colours match the specification for each movement type.
- [ ] Previous button is disabled on page 1; Next is disabled on the last page.
- [ ] Navigating pages updates the URL and re-fetches data.
- [ ] Reference column renders a link when the movement is associated with a sale or purchase order.
- [ ] Loading state renders skeleton rows (not a spinner).

---

## Notes

The movement type summary is computed from the unfiltered dataset specifically so that the user always sees the big-picture breakdown regardless of which filters are active. This design choice means the summary may show types that are not present in the filtered results below. For example, if the user filters by `WRITE_OFF`, the summary still shows totals for SALE, RETURN, etc. This gives the manager context: "Write-offs account for only 3 of 120 total movements this month."

The variant search uses `icontains` on three fields (`sku`, `product__name`, `name`). This is intentionally broad: when a manager is looking for a specific product's stock movements, they may not remember the exact SKU or the variant name. The `icontains` across these fields is a "search anywhere" pattern that trades some query performance for usability. For stores with more than 10,000 SKUs, consider adding a full-text search index or switching to `SearchVector` from Django `django.contrib.postgres.search`.

The `select_related('product_variant__product', 'actor')` prevents N+1 queries by fetching the joining `ProductVariant`, `Product`, and `User` tables in a single database round trip. Without `select_related`, each row in the result set would trigger additional queries to look up the product name and actor name, which would be prohibitively slow for the paginated 50-row view.