# Task 04.02.11 — Build Cash Flow Statement

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.11 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.10 (`Expense` model and page); Phase 03 `Shift`, `CashMovement`, `Sale`, `Return`, `Payment` models |
| Produces | `backend/apps/pos/views/cash_flow_views.py`, `frontend/app/[tenantSlug]/expenses/cash-flow/page.tsx`, `frontend/app/[tenantSlug]/expenses/cash-flow/components/CashFlowSummary.tsx` |
| Blocked By | Task 04.02.10 |

---

## Objective

Build the cash flow statement that aggregates three data sources for any operator-selected date range: income from completed sales (net of returns), outflows from recorded expenses, and cash movements from POS shifts. The result is displayed as a reconciled financial summary with metric cards, expense breakdown with visual progress bars, income breakdown by payment method, and a cash movement table with net position.

---

## Instructions

### Step 1: Build the Cash Flow DRF View

Create `backend/apps/pos/views/cash_flow_views.py`.

Required imports: `Decimal`, `Sum`, `Count`, `Q` from `django.db.models`, `django.utils.timezone`, all relevant models from `backend.apps.pos.models`.

Define `CashFlowView` extending `APIView` with `JWTAuthentication` and `HasTenantPermission`.

**`get` method** — `GET /api/pos/expenses/cash-flow/`:

1. Enforce MANAGER or OWNER.
2. Validate query params with `CashFlowQuerySerializer`: `date_from` (DateField, required — ISO format `YYYY-MM-DD`), `date_to` (DateField, required). In `validate(attrs)`: if `attrs['date_from'] > attrs['date_to']`: raise `ValidationError("date_from must not be after date_to.")`.
3. Extract `tenant_id = user.tenant_id`.

**Query 1 — Net Income**:

`gross_sales = Sale.objects.filter(tenant_id=tenant_id, status='COMPLETED', completed_at__date__gte=date_from, completed_at__date__lte=date_to).aggregate(gross=Sum('total_amount'))['gross'] or Decimal('0.00')`.

`total_refunds = Return.objects.filter(tenant_id=tenant_id, created_at__date__gte=date_from, created_at__date__lte=date_to).aggregate(refunds=Sum('refund_amount'))['refunds'] or Decimal('0.00')`.

`total_income = gross_sales - total_refunds`.

**Payment method breakdown** (only for completed sales in the period — join via `Payment.sale`): `payment_breakdown = Payment.objects.filter(sale__tenant_id=tenant_id, sale__status='COMPLETED', sale__completed_at__date__gte=date_from, sale__completed_at__date__lte=date_to).values('method').annotate(total=Sum('amount'))`. Convert to a dict: `{ row['method']: str(row['total']) for row in payment_breakdown }`.

**Query 2 — Expenses by Category**:

`expense_breakdown = Expense.objects.filter(tenant_id=tenant_id, expense_date__gte=date_from, expense_date__lte=date_to).values('category').annotate(total=Sum('amount'))`.

`total_expenses = sum((Decimal(row['total']) for row in expense_breakdown), Decimal('0.00'))`.

Convert to list of dicts: `[{ 'category': row['category'], 'total': str(row['total']) } for row in expense_breakdown]`.

**Query 3 — Cash Movements by Type**:

`movement_breakdown = CashMovement.objects.filter(tenant_id=tenant_id, created_at__date__gte=date_from, created_at__date__lte=date_to).values('type').annotate(total=Sum('amount'), count=Count('id'))`.

Convert to a dict keyed by type: `{ row['type']: { 'total': row['total'], 'count': row['count'] } for row in movement_breakdown }`.

`manual_in_total = Decimal(str(movement_breakdown_dict.get('MANUAL_IN', {}).get('total', '0') or '0'))`.
`petty_cash_out_total = Decimal(str(movement_breakdown_dict.get('PETTY_CASH_OUT', {}).get('total', '0') or '0'))`.
`manual_out_total = Decimal(str(movement_breakdown_dict.get('MANUAL_OUT', {}).get('total', '0') or '0'))`.
`opening_float_total = Decimal(str(movement_breakdown_dict.get('OPENING_FLOAT', {}).get('total', '0') or '0'))`.

**Net Cash Flow**:
`net_cash_flow = total_income - total_expenses + manual_in_total + opening_float_total - petty_cash_out_total - manual_out_total`.

**Response**:

`{ "success": true, "data": { "period": { "date_from": str(date_from), "date_to": str(date_to) }, "income": { "gross_sales": str(gross_sales), "total_refunds": str(total_refunds), "net_income": str(total_income), "payment_breakdown": payment_breakdown_dict }, "expenses": { "total": str(total_expenses), "by_category": expense_breakdown_list }, "cash_movements": { "by_type": movement_breakdown_dict, "net_movement": str(manual_in_total + opening_float_total - petty_cash_out_total - manual_out_total) }, "net_cash_flow": str(net_cash_flow) } }`.

Register URL in `backend/apps/pos/urls.py`: `'expenses/cash-flow/'` → `CashFlowView.as_view()`. Confirm this path is registered before `'expenses/<uuid:id>/'` to avoid UUID pattern capture.

### Step 2: Build the Cash Flow Page

Create `frontend/app/[tenantSlug]/expenses/cash-flow/page.tsx` as a Client Component.

Role guard: redirect CASHIER and STOCK_CLERK.

**Tab navigation**: same two-tab row as the Expenses page ("Expense Log" / "Cash Flow Statement"). The "Cash Flow Statement" tab is now the active one.

**Date range picker**: two ShadCN date pickers ("From", "To"). Default to first and last day of the current calendar month (same calculation as Task 04.02.05). Store selected dates in local state `dateFrom: Date | null` and `dateTo: Date | null`.

**"Generate Report" button**: `disabled={!dateFrom || !dateTo}`, `orange` (#F97316) background. On click: set local state `reportRequested: true` which triggers the TanStack Query.

TanStack Query key `['cash-flow', tenantSlug, dateFrom?.toISOString(), dateTo?.toISOString()]`. `enabled: reportRequested && !!dateFrom && !!dateTo`. Manual `refetch` is also available via a "Refresh" icon button shown after the report is loaded.

**Empty state** (before "Generate Report" is clicked or when `!reportRequested`): a neutral ShadCN `Card` centred on the page: "Select a date range and click Generate Report to view your financial summary." with a chart icon in `text-muted` (#64748B).

On success: render all report sections (Steps 3–6).

On loading: render skeleton metric cards and skeleton table rows.

On error: error card with "An error occurred loading the cash flow report." and a "Try Again" button that calls `queryClient.invalidateQueries(...)` to re-trigger.

### Step 3: Build the CashFlowSummary Component

Create `frontend/app/[tenantSlug]/expenses/cash-flow/components/CashFlowSummary.tsx`.

**Props**: `totalIncome: string`, `totalExpenses: string`, `netCashFlow: string`.

Three ShadCN `Card` components in a three-column responsive grid (using Tailwind `grid grid-cols-1 sm:grid-cols-3 gap-4`).

**Total Income card**: title "Total Income" in Inter 14px `text-muted` (#64748B). Value `Rs. [totalIncome]` in JetBrains Mono. When `Decimal(totalIncome) > 0`: subtle `#22C55E` tinted background (use `rgba(34, 197, 94, 0.08)` for a light tint). When zero: `background` (#F1F5F9) background.

**Total Expenses card**: title "Total Expenses". Value in JetBrains Mono. When `Decimal(totalExpenses) > 0`: `#EF4444` tinted background (`rgba(239, 68, 68, 0.08)`). When zero: `background` (#F1F5F9) background.

**Net Cash Flow card**: title "Net Cash Flow". Value in JetBrains Mono at larger size (32px Inter font). When positive: `#22C55E` tinted background. When negative: `#EF4444` tinted background. When zero: `background` (#F1F5F9) background. Subtitle below the value in `text-muted` (#64748B) 12px: "Income minus expenses and outflows" — gives context about what the net represents.

Use `decimal.js` for all sign checks: `new Decimal(netCashFlow).isPositive()`, `new Decimal(netCashFlow).isNegative()`.

### Step 4: Build the Income Section

Below the metric cards, render an "Income" section as a ShadCN `Card`.

Card header: "Income" in Inter 16px.

Card content: "Net Income: Rs. [net_income]" as the headline figure.

Payment method breakdown sub-section: if `payment_breakdown` has more than one key, render a ShadCN `Table` (compact) with two columns: "Payment Method" and "Total (Rs.)". Payment method labels: map `CASH` → "Cash", `CARD` → "Card / Tap", `SPLIT` → "Split". If only one method, display inline: `"All via [method]: Rs. [total]"`.

Helper text below in `text-muted` (#64748B) 12px Inter: "Net income = gross sales minus returns for the period. Gross: Rs. [gross_sales] / Returns: Rs. [total_refunds]."

### Step 5: Build the Expense Breakdown Section

Below the Income section, render an "Expense Breakdown" ShadCN `Card`.

Card header: "Expense Breakdown" in Inter 16px.

If `expense_breakdown_list` is empty: "No expenses recorded for this period." in `text-muted` (#64748B).

Otherwise: ShadCN `Table` (compact) with columns "Category" (using `EXPENSE_CATEGORY_BADGE_CONFIG` badges from Task 04.02.10) and "Total (Rs.)" (JetBrains Mono). Rows sorted by total descending. A bold "Total" row at the bottom summing all categories.

Below the table, a horizontal bar chart section using ShadCN `Progress`:
- For each category with a non-zero total, compute `percentage = (category_total / total_expenses) * 100`.
- Render a row: category label on the left (12px Inter), `<Progress value={percentage} />` in the middle, `Rs. [total]` (JetBrains Mono 12px) on the right.
- The `Progress` component fill colour matches the category badge colour from `EXPENSE_CATEGORY_BADGE_CONFIG`. Since ShadCN `Progress` uses a CSS variable for fill colour, override it with an inline style `style={{ '--progress-foreground': categoryBgColor } as React.CSSProperties}` on the `Progress` element.

### Step 6: Build the Cash Movement Summary Section

Below Expense Breakdown, render a "Cash Movement Summary" ShadCN `Card`.

Define a `CASH_MOVEMENT_LABELS` object at module level:
- `OPENING_FLOAT` → `'Opening Float'`.
- `PETTY_CASH_OUT` → `'Petty Cash Out'`.
- `MANUAL_IN` → `'Manual Cash In'`.
- `MANUAL_OUT` → `'Manual Cash Out'`.

ShadCN `Table` (compact): columns "Movement Type", "Count", "Amount". For each type present in `movement_breakdown`:
- `MANUAL_IN` amount: text colour `#22C55E`.
- `OPENING_FLOAT` amount: text colour `#1B2B3A` (navy, neutral).
- `PETTY_CASH_OUT` and `MANUAL_OUT` amounts: text colour `#EF4444`.

A bold "Net Movement" row at the bottom: value = `MANUAL_IN total + OPENING_FLOAT total − PETTY_CASH_OUT total − MANUAL_OUT total`. Colour the net row based on sign.

If `movement_breakdown` is empty: "No cash movements recorded for this period." in `text-muted` (#64748B).

Tooltip on the "Net Movement" row: "Opening float + manual inflows minus petty cash and manual outflows."

### Step 7: Handle Empty, Loading, and Error States

**Loading state**: when `reportRequested` is true and TanStack Query is fetching:
- Three `CashFlowSummary` placeholder skeleton cards using ShadCN `Skeleton` at the appropriate heights.
- A skeleton table placeholder for the expense breakdown.
- A skeleton table placeholder for the cash movement section.
- All skeletons use `animate-pulse` from Tailwind.

**Error state**: a single ShadCN `Card` with `Alert` variant `'destructive'` inside. Title "Report Error". Description "An error occurred loading the cash flow report. This may be a temporary issue." Below the alert, a "Try Again" ShadCN `Button` (variant `'outline'`) that calls `refetch()` from the TanStack Query `useQuery` hook.

**Empty data state** (report loaded but all three data sources have no records for the period): render `CashFlowSummary` with all zeros. Below it, a single `Card` with "No financial activity recorded for this period. Try a different date range." in `text-muted` (#64748B) centred text.

---

## Expected Output

- `backend/apps/pos/views/cash_flow_views.py` with `CashFlowView` aggregating sales, returns, expenses, and cash movements into a single API response.
- `frontend/app/[tenantSlug]/expenses/cash-flow/page.tsx` with date pickers, Generate Report button, empty/loading/error/success states.
- `frontend/app/[tenantSlug]/expenses/cash-flow/components/CashFlowSummary.tsx` with three metric cards.
- Expense breakdown table with horizontal ShadCN Progress bars.
- Income section with payment method breakdown.
- Cash Movement Summary table with colour-coded amounts.

---

## Validation

- Select a period with known completed sales: `total_income` in the API response matches `Sale.total_amount` sum minus `Return.refund_amount` sum for the period — verify via Django shell.
- Select a period with known expenses: `total_expenses` matches the sum of `Expense.amount` for the period.
- Add a `PETTY_CASH_OUT` cash movement for the period: Cash Movement Summary table shows the record; net movement decreases by the amount.
- Add an `OPENING_FLOAT` cash movement: net movement increases.
- Period with no financial activity (fresh database, narrow date range with no records): all metric cards show Rs. 0.00; "No financial activity" message shown.
- Select a period where `date_from > date_to`: API returns 400 validation error.
- CASHIER attempts to access the cash flow page — redirected by `useAuth()` guard before any API request.
- "Try Again" button in error state re-triggers the TanStack Query fetch.
- Payment method breakdown: if sales include both CASH and CARD payments, both rows appear in the Income section table.

---

## Notes

All three database queries in `CashFlowView` are executed sequentially within a single request. For the current scale of LankaCommerce (a small-to-medium retail operation), this is acceptable — each query is a simple aggregation with date range filters and indexed tenant-scoped lookups. If response time becomes an issue, the three queries can be parallelised using `concurrent.futures.ThreadPoolExecutor` with Django's `close_old_connections()` called before each thread uses the ORM.

The `or Decimal('0.00')` pattern after each `aggregate()` call is essential. When no rows match the filter, Django's `Sum` aggregation returns `None`, not `Decimal('0')`. Without the null guard, arithmetic like `total_income - total_expenses` would raise `TypeError: unsupported operand type(s) for -: 'NoneType' and 'Decimal'`.

The `CashMovement.amount` field is always stored as a positive value. The `type` field determines whether the movement is an inflow or outflow. The "Net Movement" computation in the view uses additive and subtractive logic based on type — not positive/negative stored amounts. This convention must be consistent across the seed command (Task 04.02.12), the POS shift views, and this cash flow view.
