# LankaCommerce Cloud LLC — Chat Summary (Updated May 18 2026)

This document is the handoff context for a new chat session. Read it in full before starting any work.

---

## 1. Project Overview

A multi-tenant SaaS Point-of-Sale platform for Sri Lankan apparel retailers. The project follows a structured document-driven development plan stored in `document-series/`. Work proceeds **strictly in document order**, one sub-phase at a time.

---

## 2. Technical Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0.5, Python 3.14, venv at `backend/.venv/` |
| API | Django REST Framework 3.17.1, SimpleJWT 5.5.1 |
| Database | SQLite (development) |
| Frontend | Next.js 16.2.6 App Router, TypeScript strict mode, pnpm |
| Styling | Tailwind CSS v4, ShadCN "base-nova" with `@base-ui/react` |
| Data Fetching | TanStack Query v5 — `placeholderData: (prev) => prev` (NOT `keepPreviousData`) |
| Forms | React Hook Form + Zod v4 (`import { z } from "zod/v4"`) |
| State | Zustand v5 |
| Dev server | `cd backend && make dev` / `cd frontend && pnpm dev` |

### Key Frontend Conventions
- **Auth store**: `useAuthStore` — holds `user` AND `accessToken`. Use `useAuthStore((s) => s.accessToken)` for Bearer tokens.
- **Permissions**: `usePermissions()` hook → `.can()`, `.canAny()`, `.canAll()`; backend: `HasPermission` class in DRF.
- **Routing**: `src/app/(store)/...` — NO `[tenantSlug]` segment in URLs. The store layout is at `src/app/(store)/layout.tsx`.
- **API base**: `process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"`.
- **Design tokens**: navy=`#1B2B3A`, orange=`#F97316`, border=`#E2E8F0`, text-muted=`#64748B`, bg=`#F1F5F9`.
- **Fonts**: JetBrains Mono for monetary/numeric values.

### Key Backend Conventions
- Views follow the `APIView` pattern with `JWTAuthentication` + `IsAuthenticated` + `HasPermission(...)`.
- Response helpers: `_ok(data, status_code=200)` and `_error(code, message, status_code)` — defined at top of `views.py`.
- Service layers in `backend/apps/catalog/services/` — views never write to models directly.
- `adjust_stock()` in `inventory_service.py` returns a **3-tuple**: `(variant, movement, low_stock_triggered: bool)`.

---

## 3. Phase & Task Completion Status

### Phase 01 — The Foundation ✅ COMPLETE
All sub-phases (01.01, 01.02, 01.03) are fully implemented.

### Phase 02 — The Catalog ✅ COMPLETE
All sub-phases fully implemented.

#### SubPhase 02.01 — Product Data Models ✅
#### SubPhase 02.02 — Product Management UI ✅
#### SubPhase 02.03 — Advanced Stock Control ✅ ALL 12 TASKS DONE

| Task | Title | Status |
|------|-------|--------|
| Permissions + Types | Add STOCK_TAKE_MANAGE/APPROVE permissions + catalog.ts types | ✅ |
| 02.03.01 | Stock Control Dashboard Page | ✅ |
| 02.03.02 | Manual Stock Adjustment Form | ✅ |
| 02.03.03 | Stock Movement History Page | ✅ |
| 02.03.04 | Stock Take Session Flow | ✅ |
| 02.03.05 | Stock Take Approval Workflow | ✅ |
| 02.03.06 | Low Stock Alert Widget | ✅ |
| 02.03.07 | Low Stock Notifications (backend app + frontend popover) | ✅ |
| 02.03.08 | Stock Adjustment API Routes | ✅ |
| 02.03.09 | Stock Take API Routes | ✅ |
| 02.03.10 | Stock Valuation View (frontend) | ✅ |
| 02.03.11 | Stock Movement Audit Logging | ✅ |
| 02.03.12 | Seed Stock Levels for Sample Catalog | ✅ |

---

## 4. Next Work — Phase 03, SubPhase 03.01 (POS Core)

The next document to implement is **SubPhase 03.01 — POS Core** (`document-series/Phase_03_The_Terminal/SubPhase_03_01_POS_Core/`).

It contains 12 tasks:

| Task | Title |
|------|-------|
| 03.01.01 | Create Sale and SaleLine Models |
| 03.01.02 | Create Shift and ShiftClosure Models |
| 03.01.03 | Build Sale Service Layer |
| 03.01.04 | Build Shift Service Layer |
| 03.01.05 | Build POS Terminal Layout |
| 03.01.06 | Build Product Grid and Category Navigation |
| 03.01.07 | Build Variant Selection Modal |
| 03.01.08 | Build Cart Panel |
| 03.01.09 | Build Discount System |
| 03.01.10 | Build Hold and Retrieve Sales |
| 03.01.11 | Build POS Barcode Scanner Integration |
| 03.01.12 | Build Sale History Page |

**The overview doc is at:** `document-series/Phase_03_The_Terminal/SubPhase_03_01_POS_Core/SubPhase_03_01_Overview.md`

Read the overview doc first, then implement tasks one at a time in order.

---

## 5. Key Existing Files (Reference)

### Backend
| Path | Description |
|------|-------------|
| `backend/apps/catalog/models.py` | Product, ProductVariant, StockMovement, StockTakeSession, StockTakeItem, etc. |
| `backend/apps/catalog/services/inventory_service.py` | `adjust_stock()`, `complete_stock_take_session()`, `approve_stock_take()`, `reject_stock_take()` |
| `backend/apps/catalog/services/product_service.py` | CRUD for categories, brands, products, variants |
| `backend/apps/catalog/services/audit_service.py` | `log_audit_event()` + `AuditAction` constants |
| `backend/apps/catalog/views.py` | All catalog + stock API views |
| `backend/apps/catalog/urls.py` | All catalog URL patterns (prefixed with `api/catalog/`) |
| `backend/apps/notifications/models.py` | `Notification` model (LOW_STOCK_ALERT, STOCK_TAKE_SUBMITTED, etc.) |
| `backend/apps/notifications/views.py` | List, mark-read, mark-all-read |
| `backend/apps/accounts/constants/permissions.py` | All permission string constants |
| `backend/apps/pos/` | **Empty/stub** — this is where Phase 03 work goes |
| `backend/config/urls.py` | Root URL config |
| `backend/config/settings/base.py` | Installed apps, auth settings |

### Frontend
| Path | Description |
|------|-------------|
| `frontend/src/app/(store)/stock-control/page.tsx` | Stock control dashboard |
| `frontend/src/app/(store)/stock-control/adjust/page.tsx` | Manual adjustment form |
| `frontend/src/app/(store)/stock-control/movements/page.tsx` | Movement history |
| `frontend/src/app/(store)/stock-control/stock-takes/page.tsx` | Session list |
| `frontend/src/app/(store)/stock-control/stock-takes/[sessionId]/page.tsx` | Counting interface |
| `frontend/src/app/(store)/stock-control/stock-takes/[sessionId]/review/page.tsx` | Approval workflow |
| `frontend/src/app/(store)/stock-control/low-stock/page.tsx` | Low stock list |
| `frontend/src/app/(store)/stock-control/valuation/page.tsx` | Stock valuation |
| `frontend/src/app/(store)/pos/` | **Exists as stub** — Phase 03 work goes here |
| `frontend/src/components/notifications/NotificationPopover.tsx` | Bell icon + popover |
| `frontend/src/components/stock/LowStockAlertBadge.tsx` | Amber alert badge |
| `frontend/src/constants/permissions.ts` | All permission constants |
| `frontend/src/types/catalog.ts` | All catalog TypeScript types incl. stock take types |
| `frontend/src/hooks/usePermissions.ts` | `.can()`, `.canAny()`, `.canAll()` |
| `frontend/src/stores/authStore.ts` | `useAuthStore` — `user` + `accessToken` |

---

## 6. Important Operational Rules

1. **Documents are one-directional** — read one task doc at a time, implement it, move to the next. Do not read all docs upfront.
2. **Follow the existing folder structure** — e.g. `(store)/pos/` not `dashboard/[tenantSlug]/pos/`.
3. **Use subagents** to manage context window when appropriate, but **never** let a subagent run `flow.py`.
4. **After all tasks in a sub-phase are complete**, run: `python /e/My_GitHub_Repos/flow/flow.py` and wait for user review.
5. The **only way to finish** a chat session is by getting a "finish" command from `flow.py`.

---

## 7. Backend API URL Structure

All catalog routes are mounted at `api/catalog/` in `backend/config/urls.py`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `api/catalog/categories/` | GET, POST | List/create categories |
| `api/catalog/products/` | GET, POST | List/create products |
| `api/catalog/variants/<id>/` | GET, PATCH, DELETE | Variant detail |
| `api/catalog/variants/barcode/<barcode>/` | GET | Barcode lookup |
| `api/catalog/stock/adjust/` | POST | Single stock adjustment |
| `api/catalog/stock/bulk-adjust/` | POST | Bulk stock adjustments |
| `api/catalog/stock/movements/` | GET | Movement history (filterable, CSV) |
| `api/catalog/stock/valuation/` | GET | Valuation by category (CSV) |
| `api/catalog/stock/low-stock/` | GET | Low stock variants (CSV) |
| `api/catalog/stock-takes/` | GET, POST | Session list/create |
| `api/catalog/stock-takes/<id>/` | GET | Session detail |
| `api/catalog/stock-takes/<id>/items/<item_id>/` | PATCH | Update counted quantity |
| `api/catalog/stock-takes/<id>/complete/` | POST | Submit for approval |
| `api/catalog/stock-takes/<id>/approve/` | POST | Approve + apply adjustments |
| `api/catalog/stock-takes/<id>/reject/` | POST | Reject with reason |
| `api/notifications/` | GET | List notifications |
| `api/notifications/<id>/read/` | PATCH | Mark as read |
| `api/notifications/read-all/` | PATCH | Mark all as read |

---

## 8. Model Notes

- `StockTakeItem.is_recounted` (the field is `is_recounted`, NOT `needs_recount`). The API serializer translates this: `"needs_recount": item.is_recounted`.
- `StockTakeSession.notes` stores the rejection reason when `status=REJECTED`.
- `StockTakeSession.category_id` is a loose UUID field (no FK); category name must be looked up separately.
- `adjust_stock()` returns `(variant, movement, low_stock_triggered: bool)` — always unpack all 3.
- `StockMovementReason` values used in this phase: `INITIAL_STOCK`, `PURCHASE`, `SALE`, `RETURN`, `ADJUSTMENT`, `DAMAGE`, `STOCK_TAKE_ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`.

---

## 9. Permissions Added in Phase 02.03

**Backend** (`backend/apps/accounts/constants/permissions.py`):
```python
STOCK_TAKE_MANAGE = "stock.take.manage"
STOCK_TAKE_APPROVE = "stock.take.approve"
```

**Frontend** (`frontend/src/constants/permissions.ts`):
```ts
STOCK_TAKE_MANAGE: "stock.take.manage",
STOCK_TAKE_APPROVE: "stock.take.approve",
```
