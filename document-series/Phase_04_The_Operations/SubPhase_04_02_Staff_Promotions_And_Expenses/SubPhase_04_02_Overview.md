# SubPhase 04.02 — Staff, Promotions and Expenses

## Metadata

| Field | Value |
|---|---|
| SubPhase ID | 04.02 |
| Name | Staff, Promotions and Expenses |
| Phase | Phase 04 — The Operations |
| Status | Planned |
| Complexity | Very High |
| Task Count | 12 |
| Depends On | Phase 03 complete (Sale, Return, Shift, Z-Report) + SubPhase_04_01 complete |
| Primary Technologies | Django REST Framework, Next.js 15, TanStack Query, Zustand, ShadCN/UI |

---

## Objective

SubPhase 04.02 extends LankaCommerce with the operational infrastructure that connects staff activity directly to financial outcomes. It introduces a commission tracking system that records earnings at the point of sale and adjusts them on returns. It adds a PIN management and time-clock feature for workforce accountability. It provides a promotions engine capable of evaluating multiple concurrent discount strategies at cart-calculation time. Finally, it delivers an expense and cash-flow ledger that gives operators a complete view of daily financial health.

Together these capabilities transform LankaCommerce from a transaction processor into a full operational platform — one where a manager can see not only what was sold but who sold it, what it cost the business, and whether discount strategies are performing as intended.

---

## Scope

### In Scope

- Seven new Django models: `CommissionRecord`, `CommissionPayout`, `TimeClock`, `Promotion`, `CustomerPricingRule`, `Expense`, and `CashMovement`.
- New fields on existing models: `User.commission_rate` (`DecimalField`, nullable), `User.clocked_in_at` (`DateTimeField`, nullable), and `Sale.applied_promotions` (`JSONField`, nullable).
- Staff management UI with role badges, active/inactive toggles, and a tabbed detail view covering Profile, PIN Management, Commission History, and Time Clock History.
- PIN management flow allowing Managers and Owners to set or reset staff PINs securely using Django's built-in `make_password`/`check_password` functions (which use bcrypt internally at cost factor 12).
- Commission service covering creation at sale completion, negative-record creation on returns, period-based payout aggregation, and per-staff and per-tenant reporting.
- Time clock feature enabling staff to clock in and out from the dashboard widget, with a full history tab on each staff member's detail page.
- Promotions engine supporting six promotion types: `CART_PERCENTAGE`, `CART_FIXED`, `CATEGORY_PERCENTAGE`, `BOGO`, `MIX_AND_MATCH`, and `PROMO_CODE`.
- Promotions management UI for creating, editing, activating, and deactivating promotions.
- POS cart integration that debounces evaluation requests on every cart change and displays promotion pills under affected line items.
- Expense logger with category filtering, optional receipt image upload via S3 presigned URL, and an expense detail sheet.
- Cash flow statement aggregating income, expenses, and cash movements for any operator-selected date range.
- Idempotent seed data management command `seed_demo_staff_promotions`.

### Out of Scope

- External payroll or HR system integrations (e.g., ADP, QuickBooks Payroll).
- Tax calculation on commissions or expenses.
- Advanced loyalty points or customer reward programmes.
- Stock valuation adjustments triggered by expense categories.
- Tiered commission structures (e.g., accelerators above a sales threshold).
- Recurring expense scheduling or automated expense approvals.

---

## Technical Context

### Django App Structure for This SubPhase

This subphase introduces two new Django applications and extends one existing application:

**`backend/apps/hr/`** — New application containing all staff-related models (`CommissionRecord`, `CommissionPayout`, `TimeClock`), service layers (`commission_service.py`, `timeclock_service.py`), DRF views (`staff_views.py`, `pin_views.py`, `commission_views.py`, `timeclock_views.py`), and the seed management command.

**`backend/apps/promotions/`** — New application containing the promotions engine models (`Promotion`, `CustomerPricingRule`), the evaluation service (`promotion_service.py`), and DRF views (`evaluate_views.py`, `promotion_views.py`).

**`backend/apps/pos/`** — Extended with two new models (`Expense`, `CashMovement`) and new DRF views (`expense_views.py`, `cash_flow_views.py`). The existing `Sale` model gains an `applied_promotions` `JSONField`.

Both `backend.apps.hr` and `backend.apps.promotions` must be added to `INSTALLED_APPS` in `backend/config/settings.py` before running any migrations for this subphase.

### Commission Side-Effect Pattern

Commission creation is a side effect, not a core transaction concern. It is called after the `transaction.atomic()` block commits the sale or return in the respective DRF views. Each call is wrapped in a `try/except` block. If commission creation fails for any reason (e.g., a transient database error, or a data inconsistency), the failure is captured and logged as a `logger.warning(...)` — it must never re-raise and must never roll back the already-committed sale or return. Rolling back a completed sale would be a far worse outcome for the operator than a missing commission record, which can be audited and corrected manually.

### Promotions Evaluation Engine

Evaluation is triggered client-side via a `GET /api/promotions/evaluate/` request after every cart line change, with a 300 ms debounce implemented in the Zustand store. The server-side evaluation follows a fixed priority order that is enforced by the `evaluate_promotions` service function:

1. Customer-specific pricing rules (`CustomerPricingRule` records matching the customer's tags).
2. Category percentage discounts (`CATEGORY_PERCENTAGE` promotions).
3. BOGO and `MIX_AND_MATCH` promotions.
4. Cart-level promotions (`CART_PERCENTAGE` and `CART_FIXED`) — only the highest-value qualifying one is applied.

Manual line discounts applied by the cashier in Phase 03 bypass automatic promotion evaluation on that specific line. Lines with a non-zero `manual_discount_amount` are excluded from all automatic promotion matching. The evaluation engine must be deterministic — identical cart contents must always produce identical results.

Results are stored in Zustand cart state as `applied_promotions` (a list of `AppliedDiscount` objects) and `skipped_promotions` (a list of `SkippedPromotion` objects with reasons). On sale completion, the `applied_promotions` array is serialised and stored in `Sale.applied_promotions` as a JSON snapshot.

### CashMovement and Z-Report

`CashMovement` records are created at the POS terminal during shift operations: `OPENING_FLOAT` when a shift is opened, `PETTY_CASH_OUT` for in-shift cash disbursements, and `MANUAL_IN`/`MANUAL_OUT` for manager adjustments. These records feed both the Z-Report computation from SubPhase_03_02 (which reads `CashMovement` to reconcile the shift's cash position) and the new Cash Flow Statement in Task 04.02.11. The `CashMovement` model lives in `backend/apps/pos/` because it is directly bound to the `Shift` model that already lives there.

### Authentication Pattern

All DRF views in this subphase use `JWTAuthentication` and `HasTenantPermission`. JWT claims accessed within views follow the pattern: `user.tenant_id` for tenant scoping, `user.user_id` for the authenticated user's identity, and `user.role` for RBAC enforcement. Frontend components use `useAuth()` (never `useSession`) for role checks and identity.

### Decimal Arithmetic

All monetary computations in backend services use Python `Decimal` imported from the `decimal` standard library. `ROUND_HALF_UP` is used for all quantisation. Float arithmetic is strictly forbidden for any monetary value. Frontend components continue to use `decimal.js` for display formatting. The API serialises all monetary values as string-formatted decimal numbers (e.g., `"1250.00"`) to avoid JSON float precision loss.

---

## Task Breakdown

| Task ID | Name | Complexity | Key Dependencies |
|---|---|---|---|
| 04.02.01 | Create Staff, Commission and Promotions Models | High | Phase 01 User model, Phase 03 Sale/Shift/Return |
| 04.02.02 | Build Staff Management Pages | Medium | 04.02.01 |
| 04.02.03 | Build PIN Management UI | Medium | 04.02.02 |
| 04.02.04 | Build Commission Service Layer | Very High | 04.02.01, Phase 03 Sale/Return DRF views |
| 04.02.05 | Build Commission Reports Page | Medium | 04.02.04 |
| 04.02.06 | Build Time Clock Feature | Medium | 04.02.01, 04.02.02 |
| 04.02.07 | Build Promotion Service Layer | Very High | 04.02.01, Phase 02 Category/Customer/ProductVariant |
| 04.02.08 | Build Promotions Management Page | High | 04.02.07 |
| 04.02.09 | Build POS Terminal Promotions Integration | High | 04.02.07, Phase 03 cart Zustand store |
| 04.02.10 | Build Expense Logger | Medium | 04.02.01 |
| 04.02.11 | Build Cash Flow Statement | Medium | 04.02.10, Phase 03 Shift/CashMovement |
| 04.02.12 | Seed Demo Staff and Promotions Data | Low | 04.02.01, Phase 01 seed, Phase 03 seed |

---

## Validation Criteria

### Data Layer
- All seven new models import cleanly in the Django shell with no errors.
- `poetry run python manage.py migrate --check` returns zero pending migrations after all four migration steps are applied.
- `CommissionRecord.earned_amount` for a sale with a 5% commission rate exactly equals `sale.total_amount * Decimal('0.05')` rounded to 2 decimal places using `ROUND_HALF_UP`.
- A `CommissionRecord` is never created for a user with `commission_rate = None`.
- `Promotion` with `promo_code` enforces uniqueness per tenant via the `UniqueConstraint`.

### Staff and PIN
- Staff list returns all tenant users ordered by `created_at` descending; credential fields (`hashed_pin`, password hash) are never present in any response.
- PIN hash stored in `User.hashed_pin` is a bcrypt string, not raw digits.
- `PATCH /api/hr/staff/{id}/pin/` returns 403 for CASHIER and STOCK_CLERK roles.
- Staff deactivation with `clear_pin=True` nullifies `hashed_pin` in the same database write.

### Commissions
- Completing a sale with a commissioned salesperson creates a `CommissionRecord` without blocking the sale if commission creation fails.
- Processing a return creates a negative `CommissionRecord`.
- `create_commission_payout` marks all matching records `is_paid=True` atomically; a second call for the same period raises `ValueError`.
- Commission reports page correctly aggregates `total_earned`, `unpaid_total`, `unpaid_count` per staff member for the selected period.

### Promotions
- Evaluation is deterministic — identical cart inputs always produce identical `EvaluationResult`.
- Lines with `manual_discount_amount > 0` are skipped by automatic promotion evaluation.
- Only the highest-value cart-level promotion is applied; others appear in `skipped_promotions`.
- Invalid promo code returns `PROMO_NOT_FOUND`; expired code returns `PROMO_NOT_FOUND` (treated the same way at the API surface).
- `Sale.applied_promotions` is persisted on sale completion and survives a database read-back.

### Expenses and Cash Flow
- Expense category filter and date range filter work independently and in combination.
- Receipt image upload generates a presigned URL, uploads to S3, and stores `receipt_image_url` correctly.
- Cash flow `net_cash_flow` equals `total_income - total_expenses + manual_in_total - petty_cash_out_total - manual_out_total`.
- CASHIER role cannot access expenses or cash flow pages — `useAuth()` redirects them.

### Seed
- Running `seed_demo_staff_promotions` twice does not create duplicate records.
- CASHIER user has `commission_rate = Decimal('5.00')` after seeding.
- Three promotions, five expenses, two cash movements, and mixed-paid commission records are present.

---

## Files Created or Modified

### New Backend Files

- `backend/apps/hr/__init__.py`
- `backend/apps/hr/apps.py`
- `backend/apps/hr/models.py` — `CommissionRecord`, `CommissionPayout`, `TimeClock`
- `backend/apps/hr/serializers.py`
- `backend/apps/hr/admin.py`
- `backend/apps/hr/views/staff_views.py`
- `backend/apps/hr/views/pin_views.py`
- `backend/apps/hr/views/commission_views.py`
- `backend/apps/hr/views/timeclock_views.py`
- `backend/apps/hr/services/commission_service.py`
- `backend/apps/hr/services/timeclock_service.py`
- `backend/apps/hr/urls.py`
- `backend/apps/hr/migrations/0001_add_commission_timeclock_models.py`
- `backend/apps/hr/management/__init__.py`
- `backend/apps/hr/management/commands/__init__.py`
- `backend/apps/hr/management/commands/seed_demo_staff_promotions.py`
- `backend/apps/promotions/__init__.py`
- `backend/apps/promotions/apps.py`
- `backend/apps/promotions/models.py` — `Promotion`, `CustomerPricingRule`, `PromotionType`
- `backend/apps/promotions/serializers.py`
- `backend/apps/promotions/admin.py`
- `backend/apps/promotions/views/evaluate_views.py`
- `backend/apps/promotions/views/promotion_views.py`
- `backend/apps/promotions/services/promotion_service.py`
- `backend/apps/promotions/urls.py`
- `backend/apps/promotions/migrations/0001_add_promotion_pricing_rule_models.py`

### Modified Backend Files

- `backend/apps/accounts/models.py` — add `commission_rate`, `clocked_in_at` fields to `User`
- `backend/apps/accounts/migrations/0002_add_commission_rate_clocked_in_at_to_user.py`
- `backend/apps/pos/models.py` — add `ExpenseCategory`, `CashMovementType`, `Expense`, `CashMovement` models; add `applied_promotions` to `Sale`
- `backend/apps/pos/migrations/0007_add_applied_promotions_to_sale.py`
- `backend/apps/pos/migrations/0008_add_expense_cash_movement_models.py`
- `backend/apps/pos/views/expense_views.py` — new file
- `backend/apps/pos/views/cash_flow_views.py` — new file
- `backend/apps/pos/views/sale_views.py` — commission side effect, `applied_promotions` persistence
- `backend/apps/pos/views/return_views.py` — commission reversal side effect
- `backend/apps/pos/views/shift_views.py` — optional `auto_clock_in` support
- `backend/config/settings.py` — add `backend.apps.hr` and `backend.apps.promotions` to `INSTALLED_APPS`
- `backend/config/urls.py` — register `hr/` and `promotions/` URL namespaces

### New Frontend Files

- `frontend/app/[tenantSlug]/staff/page.tsx`
- `frontend/app/[tenantSlug]/staff/components/StaffTable.tsx`
- `frontend/app/[tenantSlug]/staff/components/CreateStaffModal.tsx`
- `frontend/app/[tenantSlug]/staff/[staffId]/page.tsx`
- `frontend/app/[tenantSlug]/staff/[staffId]/components/ProfileTab.tsx`
- `frontend/app/[tenantSlug]/staff/[staffId]/components/PinManagement.tsx`
- `frontend/app/[tenantSlug]/staff/[staffId]/components/CommissionHistory.tsx`
- `frontend/app/[tenantSlug]/staff/[staffId]/components/TimeClockHistory.tsx`
- `frontend/app/[tenantSlug]/staff/commissions/page.tsx`
- `frontend/app/[tenantSlug]/staff/commissions/components/CommissionTable.tsx`
- `frontend/app/[tenantSlug]/promotions/page.tsx`
- `frontend/app/[tenantSlug]/promotions/components/PromotionsTable.tsx`
- `frontend/app/[tenantSlug]/promotions/components/PromotionForm.tsx`
- `frontend/app/[tenantSlug]/expenses/page.tsx`
- `frontend/app/[tenantSlug]/expenses/components/ExpensesTable.tsx`
- `frontend/app/[tenantSlug]/expenses/components/CreateExpenseModal.tsx`
- `frontend/app/[tenantSlug]/expenses/components/ExpenseDetailSheet.tsx`
- `frontend/app/[tenantSlug]/expenses/cash-flow/page.tsx`
- `frontend/app/[tenantSlug]/expenses/cash-flow/components/CashFlowSummary.tsx`
- `frontend/app/[tenantSlug]/components/TimeClockWidget.tsx`
- `frontend/app/[tenantSlug]/terminal/components/PromotionLabelList.tsx`
- `frontend/app/[tenantSlug]/terminal/components/PromoCodeInput.tsx`
- `frontend/types/promotions.ts` — shared `AppliedDiscount`, `SkippedPromotion`, `EvaluationResult` type definitions

### Modified Frontend Files

- `frontend/stores/cartStore.ts` — promotion state, `evaluatePromotions` action, `setPromoCode` action
