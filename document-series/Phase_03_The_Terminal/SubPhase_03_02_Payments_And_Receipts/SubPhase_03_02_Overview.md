# SubPhase 03.02 — Payments, Receipts & Offline Mode

## Overview

| Field | Value |
|---|---|
| Sub-Phase | 03.02 |
| Name | Payments, Receipts & Offline Mode |
| Phase | 03 — The Terminal |
| Complexity | High |
| Depends On | SubPhase 03.01 complete |

## Objective

Complete the sale transaction lifecycle for LankaCommerce by implementing the full payment processing pipeline, receipt generation, and offline resilience layer. By the end of this sub-phase, the POS terminal can accept cash, card, and split payments; generate and print 80 mm thermal receipts; dispatch receipts via WhatsApp using the Meta Cloud API; manage cashier shifts through a RESTful DRF API; and persist in-progress carts and queued offline sales to IndexedDB in the browser.

## Scope

### In Scope

- The `Payment` Django model in `backend/apps/pos/models.py` with `PaymentLegMethod` choices and the migration `add_payment_model`.
- The `payment_service.py` service module in `backend/apps/pos/services/` providing `create_payment`, `get_payments_for_sale`, and `compute_change` functions.
- The `CashPaymentModal`, `CardPaymentModal`, and `SplitPaymentModal` frontend components in `frontend/components/pos/`.
- Django DRF views for sale creation, sale listing, sale detail, sale void, and receipt serving — routed under `/api/pos/sales/`.
- The `whatsapp_service.py` backend service module for Meta Cloud API integration, and the DRF view at `POST /api/pos/sales/{id}/send-receipt/`.
- The `receipt_renderer.py` Python utility that produces self-contained 80 mm thermal receipt HTML returned by the `GET /api/pos/sales/{id}/receipt/` endpoint.
- The `ReceiptPreviewDialog` frontend component in `frontend/app/[tenantSlug]/terminal/components/`.
- Django DRF views for shift lifecycle management — routed under `/api/pos/shifts/`.
- The `usePersistCartEffect` and `useOfflineSync` frontend hooks in `frontend/hooks/` that implement IndexedDB-backed cart persistence and offline sale queuing.
- The `seed_demo_sales` Django management command at `backend/apps/pos/management/commands/seed_demo_sales.py` that creates 20 completed demo sales.

### Out of Scope

- Returns and refunds (covered in SubPhase 03.03).
- PayHere payment gateway integration (Phase 05).
- Email receipts.
- Multi-currency support.

## Architecture Notes

All payment processing, shift management, and receipt generation logic lives in the Django backend. The frontend components are thin — they collect user input, call DRF endpoints, and render the returned data. No monetary calculation happens in the browser except change display and the split payment allocation summary, both of which are for UX purposes only and are re-validated server-side before the sale is persisted.

The `Payment` model stores individual payment legs. A cash sale creates one `Payment` record. A card sale creates one `Payment` record. A split sale creates two `Payment` records — one `CASH` and one `CARD`. The split is handled entirely by the service layer inside a `transaction.atomic()` block.

The receipt renderer is a pure Python function. It returns an HTML string that is served with `Content-Type: text/html` by the DRF receipt view. The browser opens this in a new tab and the embedded script calls `window.print()` automatically, routing the output to any configured 80 mm thermal printer.

Offline mode is implemented entirely in the frontend using the browser's IndexedDB API via the `idb` library. The `usePersistCartEffect` hook continuously snapshots the cart to `lankacommerce_offline_db`. The `useOfflineSync` hook listens for the browser `online` event and replays any queued sale payload to `POST /api/pos/sales/` when connectivity is restored. The backend enforces a staleness check on the `queued_at` field.

## Tasks

| Task | Name | Complexity |
|---|---|---|
| 03.02.01 | Create Payment Model | Low |
| 03.02.02 | Build Payment Service Layer | Medium |
| 03.02.03 | Build Cash Payment Modal | Medium |
| 03.02.04 | Build Card Payment Modal | Medium |
| 03.02.05 | Build Split Payment Modal | High |
| 03.02.06 | Build Sale API Routes | High |
| 03.02.07 | Build WhatsApp Receipt Dispatch | Medium |
| 03.02.08 | Build Thermal Print Receipt | Medium |
| 03.02.09 | Build Receipt Preview Dialog | Medium |
| 03.02.10 | Build Shift API Routes | Medium |
| 03.02.11 | Implement Offline Mode Cart Persistence | High |
| 03.02.12 | Seed Demo Sales Data | Low |
