# Task 03.03.11 — Build Z Report Page

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.11 |
| Name | Build Z Report Page |
| SubPhase | 03.03 |
| Complexity | HIGH |
| Dependencies | SubPhase_03_01 + SubPhase_03_02 + Task 03.03.07 |
| Produces | `frontend/app/[tenantSlug]/pos/shift-close/page.tsx`, `GET /api/pos/shifts/{id}/z-report/` DRF view, `build_z_report_data` added to `backend/apps/pos/services/shift_service.py` |

---

## Objective

Build the Z-Report (shift summary) page that appears when a cashier closes their shift. The report aggregates all sales, payments, returns, and cash movements for the shift and presents a complete financial reconciliation. The report can be printed for physical records.

---

## Instructions

### Step 1: Build the Z-Report Data Function

Add `build_z_report_data(tenant_id, shift_id)` to `backend/apps/pos/services/shift_service.py`:

1. Fetch the `Shift` record (scoped to `tenant_id`) with its related `ShiftClosure` (if closed).
2. Fetch all `Sale` records for the shift using `Sale.objects.filter(shift_id=shift_id)` with their related `Payment` records.
3. Fetch all `Return` records where `created_at` falls within the shift period (`shift.opened_at` to `shift.closed_at`), including `ReturnLine` records.
4. Compute these aggregates using Python `Decimal` arithmetic and Django `aggregate()`:

Sales aggregates:

- `total_sales_count` — count of COMPLETED sales
- `total_sales_amount` — sum of `total_amount` for COMPLETED sales
- `cash_sales_amount` — sum of `Payment.amount` where `method="CASH"`
- `card_sales_amount` — sum of `Payment.amount` where `method="CARD"`
- `voided_sales_count` — count of VOIDED sales
- `total_discount_amount` — sum of `cart_discount_amount` for COMPLETED sales

Returns aggregates:

- `total_returns_count` — count of all Return records in the shift window
- `total_refund_amount` — sum of `Return.refund_amount`
- `cash_refund_amount` — sum where `refund_method="CASH"`
- `card_refund_amount` — sum where `refund_method="CARD_REVERSAL"`
- `credit_refund_amount` — sum where `refund_method="STORE_CREDIT"`
- `exchange_count` — count where `refund_method="EXCHANGE"`

Cash reconciliation:

- `opening_float` — `Shift.opening_cash_float`
- `expected_cash_in_drawer` — `opening_float + cash_sales_amount - cash_refund_amount`
- `actual_cash_counted` — `ShiftClosure.closing_cash_count` if shift is closed, else `None`
- `cash_difference` — `actual_cash_counted - expected_cash_in_drawer`; positive = over, negative = short

Item breakdown: `top_products_sold` — top 10 product variants by total quantity from `SaleLine` records for the shift, computed using `SaleLine.objects.filter(sale__shift_id=shift_id).values('product_name_snapshot', 'variant_description_snapshot').annotate(total_qty=Sum('quantity'), total_revenue=Sum('line_total')).order_by('-total_qty')[:10]`.

Return the assembled `ZReportData` dict.

### Step 2: Build GET /api/pos/shifts/{id}/z-report/

Add `ShiftZReportView` to `backend/apps/pos/views/shift_views.py`. Use `JWTAuthentication` and `HasTenantPermission`. The `get` method: verify session, call `build_z_report_data(tenant_id, shift_id)`. Return `{ "success": true, "data": z_report_data }` in a 200 response. Register at `GET /api/pos/shifts/{id}/z-report/`.

### Step 3: Build the Z-Report Page

Create `frontend/app/[tenantSlug]/pos/shift-close/page.tsx`. This page receives a `shift_id` query parameter (or from the POS terminal's Zustand shift state). If the shift is OPEN, show the pre-close form (Step A). If CLOSED, show the Z-Report view (Step B).

Step A — Pre-Close Form (shift OPEN): A "Cash Count" input where the cashier enters total cash in the drawer. A summary of expected cash drawn from the Z-Report API (poll on page focus). A "Close Shift" button that calls `POST /api/pos/shifts/{id}/close/` with `closing_cash_count`. On success, transition to Step B.

Step B — Z-Report View (shift CLOSED): A "Z-Report" page header with the shift date range and a "Print Report" button.

The Z-Report renders in six sections:

**Section 1 — Shift Summary:** two-column grid with Shift ID (short), Cashier Name, Date Opened ("DD/MM/YYYY HH:mm"), Date Closed, Shift Duration (hours and minutes).

**Section 2 — Sales Summary:** table rows for Total Sales Count, Total Sales Amount, Cash Sales, Card Sales, Voided Sales Count, Total Discounts Given. All amounts in JetBrains Mono.

**Section 3 — Returns Summary:** table rows for Total Returns Count, Total Refund Amount, Cash Refunds, Card Reversals, Store Credits Issued, Exchanges Completed.

**Section 4 — Net Revenue:** a prominent box showing "Net Revenue = Total Sales – Total Refunds = Rs. [amount]" in JetBrains Mono, `navy` (`#1B2B3A`) bold. Include a sub-line for "Net Cash Position = Cash Sales – Cash Refunds = Rs. [amount]".

**Section 5 — Cash Reconciliation:** table rows for Opening Float, Cash Sales (collected), Cash Refunds (disbursed), Expected in Drawer, Actual Counted, Difference (shown in `success` green (`#22C55E`) if ≥ 0, `danger` red (`#EF4444`) if negative). The difference row uses a Lucide `AlertTriangle` icon in `warning` amber (`#F59E0B`) if the absolute difference exceeds Rs. 100.

**Section 6 — Top Products Sold:** a compact table of the top 10 product variants with Product Name, Variant, Units Sold, and Revenue. Each row has a JetBrains Mono revenue cell.

The Print Report button calls `window.print()` directly on the page. Add `@media print` CSS to hide navigation, filter bars, and non-report elements.

---

## Expected Output

- `build_z_report_data` added to `backend/apps/pos/services/shift_service.py`
- `GET /api/pos/shifts/{id}/z-report/` returns correct aggregated data
- `frontend/app/[tenantSlug]/pos/shift-close/page.tsx` renders the pre-close form and the full Z-Report

---

## Validation

- The Z-Report correctly shows `expected_cash_in_drawer` matching `opening_float + cash_sales - cash_refunds`
- The cash difference highlights correctly in green (over) or red (short)
- The top-10 products table is sorted by units sold descending
- Printing the Z-Report hides navigation elements

---

## Notes

The Z-Report data is aggregated at report generation time from live tables — it is not pre-aggregated at `ShiftClosure` creation. This keeps the `ShiftClosure` model lean while ensuring the report always reflects the final database state.
