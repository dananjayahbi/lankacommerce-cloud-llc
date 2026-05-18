# SubPhase 03.03 — Returns and Exchanges

## Metadata

| Field | Value |
|---|---|
| SubPhase ID | 03.03 |
| Name | Returns and Exchanges |
| Phase | Phase 03 — The Terminal |
| Status | Not Started |
| Complexity | High |
| Estimated Tasks | 12 |
| Dependencies | SubPhase_03_01 complete + SubPhase_03_02 complete |

---

## Objective

Complete the post-sale refund, return, and exchange workflow for LankaCommerce. This sub-phase delivers a fully audited, multi-step return experience covering every post-sale scenario a boutique clothing retailer encounters: cash refunds, card reversals, store credit issuance, and item exchanges. Every return is gated behind mandatory Manager PIN authorization, reusing `CartManagerPINModal` from SubPhase_03_01 to ensure accountability.

The sub-phase also delivers automated inventory restocking per line inside the same `transaction.atomic()` block, return receipts dispatched via WhatsApp and thermal print, a Return History page filterable by date range and refund method, and a Z-Report page that surfaces return totals alongside sales totals at end-of-shift.

---

## In Scope

- `Return`, `ReturnLine`, and `StoreCredit` Django models in `backend/apps/pos/models.py` with `ReturnRefundMethod` and `ReturnStatus` TextChoices
- `Sale.linked_return` — new nullable FK on the existing Sale model to track exchange origin
- `backend/apps/pos/services/return_service.py` — service layer covering eligibility validation, proportional refund computation, transactional creation with per-line restocking, and store credit issuance
- `ReturnWizardSheet` — a 3-step right-side ShadCN Sheet in `frontend/components/pos/` driving the full return flow: item selection → refund options → manager authorization
- Exchange flow — implemented as return-then-pre-populate-cart, with the link tracked via `Sale.linked_return`; no separate Exchange model exists
- Return DRF views: `POST /api/pos/returns/`, `GET /api/pos/returns/`, `GET /api/pos/returns/{id}/` in `backend/apps/pos/views/return_views.py`
- Return History page at `frontend/app/[tenantSlug]/pos/returns/page.tsx`
- Manager PIN reuse — `CartManagerPINModal` integrated into Step 3; `POST /api/accounts/auth/verify-pin/` DRF view in `backend/apps/accounts/views/auth_views.py`
- Return receipt generation and dispatch: `backend/apps/pos/utils/return_receipt_renderer.py` + `GET /api/pos/returns/{id}/receipt/`
- Z-Report shift summary: `build_z_report_data` added to `backend/apps/pos/services/shift_service.py` + `GET /api/pos/shifts/{id}/z-report/` + `frontend/app/[tenantSlug]/pos/shift-close/page.tsx`
- Demo seed command at `backend/apps/pos/management/commands/seed_demo_returns.py`

---

## Out of Scope

- Store credit redemption at the POS checkout step (Phase 04 — Customer CRM)
- Customer CRM linking via `StoreCredit.customer` (field is nullable and unused in Phase 03)
- Supplier returns / purchase-order return flows (Phase 04)
- Cross-tenant return analytics (Phase 05)
- Configurable return window per tenant (Phase 03 hard-codes 30 days)
- Proportional split-refund for original split-payment sales (cashier chooses a single refund method)

---

## Architecture Notes

### The Exchange-as-Return-then-New-Cart Pattern

LankaCommerce does not model exchanges as a first-class database entity. There is no separate Exchange table. Exchanges are tracked through `Sale.linked_return`, a nullable FK added to the Sale model in this sub-phase. This keeps the data model minimal and avoids a complex two-headed atomic operation.

The flow: cashier selects items to exchange and chooses Exchange as the refund method → manager PIN confirmed → `POST /api/pos/returns/` creates the return, restocks inventory, computes a `refund_amount` → instead of a receipt dialog, the system injects `{ linked_return_id, exchange_credit }` into the Zustand cart store and navigates to the POS terminal → cashier adds replacement items → the CartPanel shows an "Exchange Mode" banner deducting the exchange credit → when the exchange sale completes, `POST /api/pos/sales/` receives `linked_return_id` which is persisted to `Sale.linked_return_id`.

If the customer leaves before completing the replacement cart, the return is already permanently recorded. The exchange credit remains in cart state (Zustand + IndexedDB) until the cart is completed or manually cancelled. Cancelling an exchange cart does NOT reverse the return.

### Manager PIN Is Always Mandatory

Return authorization requires a manager PIN without exception. Enforced at the API layer: `POST /api/pos/returns/` validates that `authorized_by_id` refers to a user with the `MANAGER` or `SUPER_ADMIN` role before any write occurs.

### is_restocked — Per-Line Transactional Safety

Within `initiate_return`, each `ReturnLine.is_restocked` is initialized to `False` at creation. After each `adjust_stock` call succeeds for a line, that line's `is_restocked` is updated to `True` inside the same `transaction.atomic()` block. If the transaction rolls back, all `is_restocked` values remain `False`. `is_restocked` is the canonical record of which lines were actually restocked — never a derived computation.

---

## Task Breakdown

| Task ID | Name | Complexity | Dependencies |
|---|---|---|---|
| 03.03.01 | Create Return and StoreCredit Models | MEDIUM | SubPhase_03_01 + SubPhase_03_02 complete |
| 03.03.02 | Build Return Service Layer | HIGH | Task 03.03.01 |
| 03.03.03 | Build Return Initiation Flow | MEDIUM | Task 03.03.02 |
| 03.03.04 | Build Return Item Selection Panel | MEDIUM | Task 03.03.03 |
| 03.03.05 | Build Return Refund Options | LOW | Task 03.03.04 |
| 03.03.06 | Build Exchange Flow | HIGH | Task 03.03.05 + Task 03.03.07 |
| 03.03.07 | Build Return API Routes | MEDIUM | Task 03.03.02 |
| 03.03.08 | Build Return History Page | MEDIUM | Task 03.03.07 |
| 03.03.09 | Build Manager Authorization Reuse | LOW | Task 03.03.03 |
| 03.03.10 | Build Return Receipt Dispatch | MEDIUM | Task 03.03.07 |
| 03.03.11 | Build Z Report Page | HIGH | SubPhase_03_01 + SubPhase_03_02 + Task 03.03.07 |
| 03.03.12 | Seed Demo Returns Data | LOW | Task 03.03.01 + Task 03.02.12 |

---

## Validation Criteria

- All four refund methods (CASH, CARD_REVERSAL, STORE_CREDIT, EXCHANGE) produce correct `Return` and `ReturnLine` records in a single `transaction.atomic()` block
- `ReturnLine.is_restocked` is `True` only for lines where `adjust_stock` succeeded within the same transaction
- A `StoreCredit` record is created if and only if `refund_method` is `STORE_CREDIT`
- `POST /api/pos/returns/` returns 403 if `authorized_by_id` user has a CASHIER role
- `POST /api/pos/returns/` returns 422 if the sale is older than 30 days
- `POST /api/pos/returns/` returns 422 if the requested return quantity exceeds remaining returnable quantity
- Exchange mode: after a successful EXCHANGE return, the Zustand cart store has `linked_return_id` and `exchange_credit` set; the CartPanel shows the Exchange Mode banner
- Exchange credit is deducted from cart total in all payment modals
- A zero-net exchange (credit ≥ cart total) completes without opening a payment modal
- Five failed PIN attempts at `POST /api/accounts/auth/verify-pin/` trigger a rate-limit response for the requesting user
- Return receipt HTML renders with the "RETURN RECEIPT" label, correct line items, refund total, and prints at 80 mm
- Z-Report `expected_cash_in_drawer` equals `opening_float + cash_sales - cash_refunds`
- Cash difference on Z-Report is highlighted in `success` green (#22C55E) when positive and `danger` red (#EF4444) when negative
- `seed_demo_returns` management command is idempotent — running it twice does not create duplicate records
- All monetary values use Python `Decimal` with `ROUND_HALF_UP`; no `float` arithmetic

---

## Files Created in This Sub-Phase

- `backend/apps/pos/models.py` — `Return`, `ReturnLine`, `StoreCredit` models added; `Sale.linked_return` FK added; `ReturnRefundMethod` and `ReturnStatus` TextChoices added
- `backend/apps/pos/services/return_service.py` — full return service layer
- `backend/apps/pos/services/shift_service.py` — `build_z_report_data` function added
- `backend/apps/pos/serializers/return_serializer.py` — `CreateReturnSerializer`, `GetReturnsQuerySerializer`
- `backend/apps/pos/views/return_views.py` — `CreateReturnView`, `ReturnListView`, `ReturnDetailView`, `ReturnReceiptView`
- `backend/apps/pos/views/shift_views.py` — `ShiftZReportView` added
- `backend/apps/accounts/views/auth_views.py` — `VerifyPINView` added
- `backend/apps/pos/utils/return_receipt_renderer.py` — `build_return_receipt_html` pure function
- `backend/apps/pos/management/commands/seed_demo_returns.py` — idempotent demo seed command
- `frontend/components/pos/ReturnWizardSheet.tsx` — 3-step return wizard sheet
- `frontend/components/pos/ReturnItemSelectionStep.tsx` — Step 1 line selection panel
- `frontend/components/pos/ReturnRefundOptionsStep.tsx` — Step 2 refund method selector
- `frontend/components/pos/ReturnReceiptDialog.tsx` — post-return receipt dispatch dialog
- `frontend/components/pos/ReturnDetailModal.tsx` — return history detail modal
- `frontend/components/pos/CartManagerPINModal.tsx` — updated with `required` prop for return context
- `frontend/stores/cartStore.ts` — `linked_return_id`, `exchange_credit`, `exchange_return_ref` fields added
- `frontend/app/[tenantSlug]/pos/returns/page.tsx` — Return History page
- `frontend/app/[tenantSlug]/pos/shift-close/page.tsx` — Shift Close and Z-Report page
- `frontend/app/[tenantSlug]/pos/history/page.tsx` — modified to add Return Items button with eligibility states
