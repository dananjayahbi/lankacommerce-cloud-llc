# Sub-Phase 02.03 — Advanced Stock Control

## Metadata

| Field | Value |
|---|---|
| Sub-Phase ID | 02.03 |
| Sub-Phase Name | Advanced Stock Control |
| Parent Phase | Phase_02_The_Catalog |
| Complexity | High |
| Prerequisites | SubPhase_02_01 complete, SubPhase_02_02 complete |

---

## Objective

This sub-phase implements the complete advanced stock control system for LankaCommerce. It covers the stock control landing page with a KPI overview, the manual stock adjustment form with live projected quantity preview, the stock movement history page with date-range filtering and CSV export, the full stock take session lifecycle (creation, variant counting, completion for approval, approval, and rejection), the low stock alert widget embedded persistently throughout the dashboard, in-app notifications delivered to tenant owners and managers when a variant crosses its low stock threshold, the backend Django REST Framework API layer powering all stock operations, the stock valuation view restricted to users with cost-price visibility, audit logging for product lifecycle and stock take decision events, and a seed data extension that populates realistic initial stock movement history for the development environment.

---

## Task List

| Task ID | Task Name | Complexity | Key Output Paths |
|---|---|---|---|
| 02.03.01 | Build Stock Control Page | Low | `frontend/app/dashboard/[tenantSlug]/stock-control/page.tsx` |
| 02.03.02 | Build Manual Stock Adjustment Form | Medium | `frontend/app/dashboard/[tenantSlug]/stock-control/adjust/page.tsx` |
| 02.03.03 | Build Stock Movement History | Medium | `frontend/app/dashboard/[tenantSlug]/stock-control/movements/page.tsx` |
| 02.03.04 | Build Stock Take Session Flow | High | `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/page.tsx`, `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/page.tsx` |
| 02.03.05 | Build Stock Take Approval Workflow | Medium | `frontend/app/dashboard/[tenantSlug]/stock-control/stock-takes/[sessionId]/review/page.tsx` |
| 02.03.06 | Build Low Stock Alert Widget | Low | `frontend/components/stock/LowStockAlertBadge.tsx`, `frontend/app/dashboard/[tenantSlug]/stock-control/low-stock/page.tsx` |
| 02.03.07 | Implement Low Stock Threshold Notifications | Medium | `backend/apps/notifications/models.py`, `backend/apps/catalog/services/inventory_service.py` (extended), `frontend/components/notifications/NotificationPopover.tsx` |
| 02.03.08 | Build Stock Adjustment API Routes | Medium | `backend/apps/catalog/views.py` (modified), `backend/apps/catalog/urls.py` (modified) |
| 02.03.09 | Build Stock Take API Routes | High | `backend/apps/catalog/views.py` (modified), `backend/apps/catalog/urls.py` (modified) |
| 02.03.10 | Build Stock Valuation View | Medium | `frontend/app/dashboard/[tenantSlug]/stock-control/valuation/page.tsx` |
| 02.03.11 | Setup Stock Movement Audit Logging | Low | `backend/apps/catalog/services/audit_service.py`, `backend/apps/catalog/services/inventory_service.py`, `backend/apps/catalog/services/product_service.py` |
| 02.03.12 | Seed Stock Levels For Sample Catalog | Low | `backend/apps/catalog/management/commands/seed_catalog.py` (extended) |

---

## Architecture Notes

All stock API endpoints live in the Django REST Framework catalog app. The adjustment and query endpoints are served at `/api/catalog/stock/...` and the stock take session endpoints are served at `/api/catalog/stock-takes/...`. Notification endpoints live in a separate `notifications` Django app served at `/api/notifications/`. Frontend pages for all stock control features live under the route segment `frontend/app/dashboard/[tenantSlug]/stock-control/`. The inventory service at `backend/apps/catalog/services/inventory_service.py` centralises all business logic for stock adjustments, bulk adjustments, low-stock notification triggering, and stock take operations. All mutation operations use `transaction.atomic()` with `select_for_update()` to prevent concurrent adjustment races and ensure data consistency under simultaneous user activity.

The `Notification` model is defined in `backend/apps/notifications/models.py` within a dedicated `notifications` Django app. The `StockMovement` model is defined in `backend/apps/catalog/models.py` and was established during SubPhase 02.01. The `AuditLog` model is defined in `backend/apps/accounts/models.py` and was established during SubPhase 01.02. These three models form the traceability backbone of the stock control sub-system.

---

## RBAC Permissions Required

The following RBAC permission strings are consumed by views and frontend components in this sub-phase:

- `stock:view` — required to view stock movement history, the stock control landing page, and the low stock list
- `stock:adjust` — required to submit manual stock adjustments and bulk adjustments
- `stock:take:manage` — required to create, count, and complete stock take sessions
- `stock:take:approve` — required to approve or reject a completed stock take session
- `product:view_cost_price` — required to access the stock valuation view and its cost-price data

---

## StockMovementReason Values

The `StockMovementReason` TextChoices enum defined in `backend/apps/catalog/models.py` supports the following reason codes used throughout this sub-phase:

- `FOUND` — stock discovered that was not previously recorded
- `DAMAGED` — stock written off due to damage
- `STOLEN` — stock written off due to theft or unexplained loss
- `DATA_ERROR` — correction to a previous data entry mistake
- `RETURNED_TO_SUPPLIER` — stock sent back to a supplier
- `INITIAL_STOCK` — initial quantity entered when a variant is first set up
- `SALE_RETURN` — stock returned by a customer following a sale
- `PURCHASE_RECEIVED` — stock received from a purchase order
- `STOCK_TAKE_ADJUSTMENT` — automated correction applied when a stock take session is approved
