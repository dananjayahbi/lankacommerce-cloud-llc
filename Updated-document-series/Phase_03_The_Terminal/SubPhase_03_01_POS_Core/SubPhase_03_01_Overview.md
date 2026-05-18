# SubPhase 03.01 — POS Core

## Metadata

| Field | Value |
|---|---|
| Sub-Phase ID | 03.01 |
| Sub-Phase Name | POS Core |
| Parent Phase | Phase_03_The_Terminal |
| Complexity | High |
| Prerequisites | Phase_01 fully complete, Phase_02 fully complete |

---

## Objective

Establish all data models for the POS terminal, build the sale and shift service layers, and construct the complete POS terminal UI. By the end of this sub-phase, the cashier can open a shift, browse and search products, build a cart, apply discounts (with manager authorisation where required), place transactions on hold, retrieve held transactions, scan barcodes, complete a sale, and close their shift with a full cash reconciliation summary.

---

## Scope

### In Scope

- `Sale`, `SaleLine`, `Shift`, and `ShiftClosure` Django ORM models in `backend/apps/pos/models.py`
- `StockMovementReason.SALE` and `StockMovementReason.VOID_REVERSAL` TextChoices additions to `backend/apps/catalog/models.py`
- Django migrations for the POS app: `add_sale_and_saleline_models` and `add_shift_and_closure_models`
- `sale_service.py` implementing `create_sale` (with atomic stock deduction inside a single `transaction.atomic()` block with `select_for_update()`), `get_sale_by_id`, `get_sales` with full pagination and filtering, `void_sale` with stock restoration and audit log entry, and `get_shift_sales` with aggregated totals
- `shift_service.py` implementing `open_shift`, `close_shift` (with automatic voiding of lingering held sales), `get_current_shift`, `get_shift_by_id`, and `get_shifts`
- POS terminal special layout — no sidebar, no top navigation bar — at `frontend/app/dashboard/[tenantSlug]/pos/layout.tsx`
- POS terminal page at `frontend/app/dashboard/[tenantSlug]/pos/page.tsx`
- `ProductGrid` component with category filter tabs and product card tiles (auto-fill CSS grid, 130px minimum tile width)
- POS product search with 200ms debounce and client-side filtering from TanStack Query cache; automatic API-mode switch for catalogs with more than 500 products
- `VariantSelectionModal` presenting a size-colour matrix for multi-variant products, collapsing to a flat chip row for single-axis variants
- `CartPanel` component with scrollable line items list, discount area, totals section, and action buttons
- `LineItemDiscountControl` with percentage/fixed-amount mode toggle and live preview
- `CartDiscountControl` with cart-level discount percentage/fixed input
- `CartManagerPINModal` with a numeric keypad layout for authorising discount overrides
- `useCartStore` Zustand store with decimal.js arithmetic; all computed values derived from the items array rather than stored separately
- `HoldSaleButton` and `RetrieveHeldSalesSheet`
- `useBarcodeScanner` custom React hook wrapping a window-level keydown listener with 50ms inter-keystroke timing detection
- `ShiftOpenModal` (shown fullscreen when no open shift exists) and `ShiftCloseModal`
- Sale History page at `/dashboard/[tenantSlug]/pos/history` with table, filters, void action, and sale detail modal
- DRF serializers for sale creation and shift operations
- Sale API endpoints: `GET /api/pos/sales/`, `POST /api/pos/sales/`, `GET /api/pos/sales/{id}/`, `POST /api/pos/sales/{id}/void/`, `POST /api/pos/sales/hold/`
- Shift API endpoints: `GET /api/pos/shifts/`, `POST /api/pos/shifts/`, `POST /api/pos/shifts/{id}/close/`

### Out of Scope

- Payment modals (CASH change calculation, CARD terminal integration, SPLIT payment entry) — deferred to SubPhase 03.02
- WhatsApp receipt delivery and thermal printer integration — deferred to SubPhase 03.02
- Offline mode — deferred to SubPhase 03.02
- Returns and exchanges — deferred to SubPhase 03.03
- Customer lookup, loyalty points — deferred to Phase 04
- Reporting dashboards — deferred to Phase 05

---

## Technical Context

### Data Architecture

`Sale` is the central transaction document linking the cashier, the active shift, all line items, and the authorising manager. The sale lifecycle flows through three distinct states. A sale begins as `OPEN` when placed on hold — no inventory is affected and no payment has been taken. It transitions to `COMPLETED` once payment is accepted and atomic stock deductions have succeeded. Finally, it moves to `VOIDED` when a completed sale is reversed within the same open shift, restoring all stock levels. The `VOIDED` state is permanent and irreversible.

Only `COMPLETED` sales result in stock adjustments via the `adjust_stock` function from `backend/apps/catalog/services/inventory_service.py`. `tenant_id` is stored as a plain `CharField` or `UUIDField` field — not a foreign key relation — on all POS models, consistent with the tenant isolation pattern established throughout the LankaCommerce codebase. Tenant isolation is enforced at the service layer, not the database foreign-key layer.

### Monetary Precision

All Django model monetary fields use `DecimalField(max_digits=12, decimal_places=2)`. Backend service arithmetic uses Python's built-in `Decimal` from the `decimal` module with `ROUND_HALF_UP` rounding mode. Frontend Zustand store arithmetic uses `decimal.js`. All computed values are rounded to exactly two decimal places at every intermediate computation step, not only at the final output.

### Tax Calculation

Tax is computed at the line level inside `create_sale`. The `tax_rule` field on the `Product` model drives the per-line rate: `STANDARD_VAT` applies 15%, `SSCL` applies 2.5%, and `EXEMPT` applies 0%. Each line's tax amount is computed as the after-discount line total multiplied by the applicable rate. `Sale.tax_amount` is the sum of all per-line tax values. The frontend Zustand store uses an approximate tenant-wide rate for display purposes only — the authoritative tax figure comes from the server.

### Discount Authorisation

A CASHIER-role user may apply up to 10% on a single line item and up to 5% at the cart level without requiring any additional authorisation. Once either threshold is exceeded, `CartManagerPINModal` is displayed, prompting a manager to enter their numeric PIN. The authorising manager's `user_id` is recorded in `Sale.authorizing_manager_id` as an immutable accountability record. MANAGER and OWNER roles bypass all discount thresholds and apply discounts directly without a PIN prompt.

### Shift Management

A shift must be in `OPEN` status before any POS activity can take place. The POS terminal layout enforces this constraint via `ShiftOpenModal`, which renders as a full-screen gate blocking the entire terminal when no open shift exists. All sales carry a `shift_id` foreign key reference tying them to the shift under which they were created. `ShiftClosure` records expected cash, manually counted cash, and the resulting discrepancy as an immutable snapshot that cannot be altered after creation.

---

## Task List

| Task ID | Task Name | Complexity | Dependency |
|---|---|---|---|
| Task_03_01_01 | Create Sale And SaleLine Models | Low | Phase 02 complete |
| Task_03_01_02 | Create Shift And ShiftClosure Models | Low | Task_03_01_01 |
| Task_03_01_03 | Build Sale Service Layer | High | Task_03_01_02 |
| Task_03_01_04 | Build Shift Service Layer | Medium | Task_03_01_02 |
| Task_03_01_05 | Build POS Terminal Layout | Medium | Task_03_01_04 |
| Task_03_01_06 | Build Product Grid And Category Navigation | Medium | Task_03_01_05 |
| Task_03_01_07 | Build Variant Selection Modal | Medium | Task_03_01_06 |
| Task_03_01_08 | Build Cart Panel | High | Task_03_01_05 |
| Task_03_01_09 | Build Discount System | High | Task_03_01_08 |
| Task_03_01_10 | Build Hold And Retrieve Sales | Medium | Task_03_01_08 |
| Task_03_01_11 | Build POS Barcode Scanner Integration | Medium | Task_03_01_07 |
| Task_03_01_12 | Build Sale History Page | Medium | Task_03_01_03 |
