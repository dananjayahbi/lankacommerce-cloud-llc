# Task 04.02.05 — Build Commission Reports Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.05 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.04 (commission service layer complete) |
| Produces | `backend/apps/hr/views/commission_views.py`, `frontend/app/[tenantSlug]/staff/commissions/page.tsx`, `frontend/app/[tenantSlug]/staff/commissions/components/CommissionTable.tsx`, updated `frontend/app/[tenantSlug]/staff/[staffId]/components/CommissionHistory.tsx` |
| Blocked By | Task 04.02.04 |

---

## Objective

Build the commission reports page and the per-staff `CommissionHistory` tab. Managers and Owners can review per-staff commission breakdowns for any selected date range, inspect individual commission records with type labels (Credit/Debit), and trigger the Mark as Paid payout action. Cashiers can view only their own commission history through the tab on their staff detail page.

---

## Instructions

### Step 1: Build the Commission Summary DRF View

Create `backend/apps/hr/views/commission_views.py`.

Define `CommissionSummaryView` extending `APIView` with `JWTAuthentication` and `HasTenantPermission`.

**`get` method** — `GET /api/hr/commissions/`:
1. Enforce `user.role in ['MANAGER', 'OWNER']` — return 403 if not.
2. Validate query params with `CommissionSummaryQuerySerializer`: `period_start` (DateTimeField — ISO 8601 string), `period_end` (DateTimeField). Raise 400 if either is missing or malformed. Raise 400 if `period_start > period_end`.
3. Call `get_commission_summary_for_tenant(user.tenant_id, period_start, period_end)` from the commission service.
4. For each item in the result, convert all `Decimal` values to string before serialising (use `str(d)` — never `float(d)`).
5. Return `{ "success": true, "data": { "summary": [...], "period_start": ..., "period_end": ... } }`.

Register URL in `backend/apps/hr/urls.py`: Path `'commissions/'` → `CommissionSummaryView.as_view()`, name `'commission-summary'`.

### Step 2: Build the Commission Payout DRF View

In the same `commission_views.py`, define `CommissionPayoutView` at `POST /api/hr/commissions/payout/`.

**`post` method**:
1. Enforce MANAGER or OWNER role.
2. Validate body with `CommissionPayoutSerializer`: `user_id` (UUIDField, required), `period_start` (DateTimeField, required), `period_end` (DateTimeField, required), `notes` (CharField, optional, max_length 500).
3. Verify `target_user = User.objects.filter(id=user_id, tenant_id=user.tenant_id).first()` — return 404 if not found (prevents paying out commissions for staff from another tenant).
4. Set `authorized_by_id = user.user_id` from JWT — the payout is always authorised by the requesting manager, never by the target staff member.
5. Call `create_commission_payout(tenant_id=user.tenant_id, user_id=user_id, period_start=period_start, period_end=period_end, authorized_by_id=authorized_by_id)`.
6. On `ValueError` from the service: return 400 with `{ "success": false, "error": { "code": "NO_UNPAID_RECORDS", "message": str(e) } }`.
7. On success: return 201 with the serialised `CommissionPayout` record.

Register URL: Path `'commissions/payout/'` → `CommissionPayoutView.as_view()`, name `'commission-payout'`.

### Step 3: Build the Staff Commission Detail DRF View

In `commission_views.py`, define `StaffCommissionDetailView` at `GET /api/hr/staff/{id}/commissions/`.

**`get` method**:
1. RBAC: if `user.role in ['MANAGER', 'OWNER']`, allow access to any staff member's commissions. If `user.role` is `CASHIER` or `STOCK_CLERK`, allow access only if `str(id) == str(user.user_id)` — return 403 if the IDs do not match.
2. Validate query params: `page` (positive integer, default 1), `page_size` (positive integer, max 100, default 20).
3. Verify the target user belongs to `user.tenant_id` — return 404 if not.
4. Call `get_commissions_for_user(tenant_id=user.tenant_id, user_id=id, page=page, page_size=page_size)`.
5. Also call `get_unpaid_total(tenant_id=user.tenant_id, user_id=id)` for the summary metrics.
6. Return `{ "success": true, "data": { "records": [...serialised records...], "pagination": {...}, "unpaid_total": str(unpaid_total['total']), "unpaid_count": unpaid_total['count'] } }`.

Register URL: Path `'staff/<uuid:id>/commissions/'` → `StaffCommissionDetailView.as_view()`, name `'staff-commission-detail'`.

### Step 4: Build the Commission Reports Page

Create `frontend/app/[tenantSlug]/staff/commissions/page.tsx` as a Client Component.

Role guard: read `auth.role` from `useAuth()`. If role is `CASHIER` or `STOCK_CLERK`, redirect to `/${tenantSlug}/dashboard` immediately in a `useEffect`.

Layout:
- ShadCN `Breadcrumb`: Dashboard → Staff → Commission Reports.
- Page header: Inter heading "Commission Reports".
- Date range controls: two ShadCN date pickers ("From" and "To") side-by-side. Default to first and last day of the current calendar month. Compute defaults using `new Date(now.getFullYear(), now.getMonth(), 1)` and `new Date(now.getFullYear(), now.getMonth() + 1, 0)` for a robust cross-month calculation. Convert to ISO 8601 strings when passed to the query.
- TanStack Query key `['commissions', tenantSlug, periodStart, periodEnd]`. When `periodStart` or `periodEnd` is null, the query is disabled (`enabled: !!periodStart && !!periodEnd`).
- Pass the summary array to `CommissionTable`.

### Step 5: Build the CommissionTable Component

Create `frontend/app/[tenantSlug]/staff/commissions/components/CommissionTable.tsx`.

**Props**: `summary: CommissionSummaryItem[]`, `tenantSlug: string`, `periodStart: string`, `periodEnd: string`.

ShadCN `Table` with columns: Staff Name, Role badge (using `ROLE_BADGE_CONFIG` from Task 04.02.02), Sales Count, Total Earned, Unpaid Amount, Actions.

Formatting:
- "Total Earned" cell: JetBrains Mono font, `Rs. [amount]` formatted to 2 decimal places.
- "Unpaid Amount" cell: if `unpaid_total > 0`, render the amount in `#F97316` (orange) text on a `#F1F5F9` (background) tinted background. If `unpaid_total === 0` or zero after netting negative records, render `Rs. 0.00` in `#64748B` (text-muted).

Actions column: "Mark as Paid" button. Show only when `item.unpaid_count > 0` and `auth.role in ['MANAGER', 'OWNER']`. When clicked, set local state `selectedStaff = item` and `payoutDialogOpen = true`.

### Step 6: Build the Mark as Paid Action

Within `CommissionTable.tsx`, add ShadCN `AlertDialog` controlled by `payoutDialogOpen` state.

Dialog title: "Confirm Commission Payout".

Dialog description: "You are about to mark [selectedStaff.unpaid_count] commission records as paid for [selectedStaff.user_name] for the period [formatted period_start] to [formatted period_end]. Total payout: Rs. [selectedStaff.unpaid_total]."

"Cancel" button: close dialog, clear `selectedStaff`.

"Confirm Payout" button: trigger `useMutation` to `POST /api/hr/commissions/payout/` with body `{ user_id: selectedStaff.user_id, period_start: periodStart, period_end: periodEnd }`. On success: close dialog, `toast({ description: "Commission payout recorded for [selectedStaff.user_name]." })`, invalidate `['commissions', tenantSlug, periodStart, periodEnd]`. On error with `NO_UNPAID_RECORDS`: close dialog, `toast({ variant: "destructive", description: "No unpaid records found. The period may have already been paid." })`. On other errors: `toast({ variant: "destructive", description: "Payout failed. Please try again." })`.

### Step 7: Build the CommissionHistory Tab

Replace the placeholder at `frontend/app/[tenantSlug]/staff/[staffId]/components/CommissionHistory.tsx`.

**Props**: `staffMember: StaffMember`, `tenantSlug: string`.

TanStack Query key `['staff-commissions', tenantSlug, staffMember.id, page]` fetching `GET /api/hr/staff/${staffMember.id}/commissions/?page=${page}&page_size=20`. The `page` value is local state starting at 1.

**Summary metric chips** above the table — three chips rendered as small ShadCN `Badge` elements with `#F1F5F9` (background) fill and Inter 13px text:
- "Total Earned (All Time)": requires a separate query without date filtering — `GET /api/hr/staff/${staffMember.id}/commissions/?page=1&page_size=1` and read `total_earned_all_time` from the response (the view must include this in the response as an aggregate over all time for the user, not just the current page).
- "Unpaid Balance": formatted as `Rs. [unpaid_total]` from the response.
- "Unpaid Records": `[unpaid_count] records`.

Paginated ShadCN `Table` with columns: Sale Reference (JetBrains Mono), Sale Date, Base Amount (JetBrains Mono), Commission Rate (snapshot from record), Earned Amount (JetBrains Mono), Type, Status.

"Type" column values: if `earned_amount >= 0`, render "Credit" pill with `#22C55E` background; if `earned_amount < 0`, render "Debit" pill with `#EF4444` background. The negative sign on the amount itself (`−Rs. X.XX`) makes the debit status visually redundant — the pill reinforces it.

"Status" column: "Paid" badge in `#64748B` (text-muted) or "Unpaid" badge in `#F97316` (orange).

Pagination controls below the table: "Previous" and "Next" buttons; current page number and total pages shown between them in `text-muted` (#64748B). Disable "Previous" when `page === 1`, disable "Next" when `page === total_pages`.

"Export CSV" button at the top right of the card: `onClick={() => toast({ description: "This feature is coming soon." })}`. Do not implement the actual export in this task.

---

## Expected Output

- `backend/apps/hr/views/commission_views.py` with `CommissionSummaryView`, `CommissionPayoutView`, and `StaffCommissionDetailView`.
- `frontend/app/[tenantSlug]/staff/commissions/page.tsx` — reports page with date pickers and RBAC guard.
- `frontend/app/[tenantSlug]/staff/commissions/components/CommissionTable.tsx` — summary table with Mark as Paid action.
- `frontend/app/[tenantSlug]/staff/[staffId]/components/CommissionHistory.tsx` — replaces placeholder with paginated history and summary metrics.

---

## Validation

- Commission reports page as MANAGER shows summary table for current month with correct totals.
- Filter to a custom period — table reflects the filtered period.
- "Mark as Paid" AlertDialog shows correct staff name, record count, and payout total.
- Confirming payout: database shows all matching `CommissionRecord` rows with `is_paid=True`. `CommissionPayout` record created. Summary table refreshes with `unpaid_total = 0` for that staff member.
- "Mark as Paid" for a period already fully paid: returns `NO_UNPAID_RECORDS` — destructive toast shown, no duplicate payout record created.
- CASHIER accessing `GET /api/hr/staff/${own_id}/commissions/` — 200 response with own records.
- CASHIER accessing `GET /api/hr/staff/${other_id}/commissions/` where `other_id !== own_id` — 403 response.
- CASHIER navigating to `/[tenantSlug]/staff/commissions` — redirected by `useAuth()` check.
- Paginating CommissionHistory tab: page 2 loads next 20 records; "Previous" disables on page 1.

---

## Notes

The `total_earned_all_time` aggregate for the CommissionHistory tab summary should be computed in a separate, dedicated query in the view rather than re-running `get_commission_summary_for_tenant` for a single user. A specific query `CommissionRecord.objects.filter(tenant_id=tenant_id, user_id=user_id).aggregate(total_all_time=Sum('earned_amount'))['total_all_time']` is more efficient and precise for this use case. Add this as an extra field in the `StaffCommissionDetailView` response.

The commission reports page uses two date pickers rather than a single date-range picker component because ShadCN UI's date-range picker requires more complex state management and the two-input approach gives managers more control when adjusting one end of the range independently.

All `Decimal` values from the commission service must be converted to strings before JSON serialisation in the DRF response. DRF's default `DecimalField` on a serializer handles this correctly — it serialises `Decimal` as a string representation. If using `SerializerMethodField` with manual value computation, always call `str(decimal_value)` before returning.
