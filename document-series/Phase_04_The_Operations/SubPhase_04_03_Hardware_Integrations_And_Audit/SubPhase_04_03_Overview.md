# SubPhase 04.03 — Hardware Integrations and Audit

## Metadata

| Field | Value |
|-------|-------|
| SubPhase ID | 04.03 |
| Name | Hardware Integrations and Audit |
| Phase | Phase 04 — The Operations |
| Status | Planned |
| Complexity | Very High |
| Estimated Effort | 12-15 days |
| Task Count | 12 |
| Depends On | SubPhase 04.02 (Staff, Promotions and Expenses) + Phase 03 (The Terminal) complete |
| Primary Technologies | Django REST Framework, Next.js 15, python-escpos, SSE/StreamingHttpResponse, WhatsApp Business API |

---

## Objective

This subphase connects the LankaCommerce POS to physical hardware peripherals that transform the browser-based terminal into a real-world checkout station. You will integrate ESC/POS thermal printers (Network and USB modes) for sale receipts and Z-Reports, wire automatic cash drawer kicks triggered by cash payments and cash refunds, and build a Customer Facing Display (CFD) that streams live cart state to a second monitor via Server-Sent Events. These hardware integrations are essential for any retail or hospitality deployment where the POS must produce physical receipts, open cash drawers, and show transaction details to customers on a separate screen.

In parallel, you will implement a comprehensive audit trail that logs every business-critical mutation across the entire application — sales, returns, customer credit changes, staff permission changes, expense modifications, stock adjustments, promotion lifecycle events, shift closures, and settings changes. The audit system is designed as a fire-and-forget side effect so that a failed audit write never blocks or rolls back the parent transaction. A dedicated audit log viewer page with a before/after diff modal gives managers and owners full visibility into who changed what and when.

Finally, this subphase covers WhatsApp-based customer engagement (birthday automation and marketing broadcast builder), promotion auto-apply and promo code validation inside the live POS cart, shift cash movements (petty cash out, manual cash in), and a seed command that populates demo hardware config and audit records for development and testing.

---

## Technical Context

### Two New Django Apps

Two new Django apps are introduced:

- `backend/apps/audit/` — Contains the `AuditLog` model (extending what was scaffolded in SubPhase 01.02), the centralized audit service at `backend/apps/audit/services/audit_service.py`, and audit log views at `backend/apps/audit/views/audit_log_views.py`.
- `backend/apps/hardware/` — Contains all printer, cash drawer, and CFD modules using the `python-escpos` library. Views are split across `printer_views.py`, `drawer_views.py`, and `cfd_views.py`.

Both `backend.apps.audit` and `backend.apps.hardware` must be added to `INSTALLED_APPS` in the Django settings file.

### Model Changes

The `Customer` model in `backend/apps/crm/models.py` gains a `last_birthday_message_sent_year = IntegerField(null=True, blank=True)` field for birthday automation deduplication. A migration must be generated and applied after this field is added.

### CRON_SECRET Validation

All cron-triggered endpoints use a shared `CRON_SECRET` Django setting. Validation uses `hmac.compare_digest()` from the Python `hmac` module to compare the incoming `Authorization: Bearer <secret>` header against the configured secret. This timing-safe comparison prevents timing side-channel attacks and must be used instead of direct string comparison.

### SSE and Django Channels

SSE streaming uses Django's `StreamingHttpResponse` from `django.http`. This works reliably only in single-process development or single-worker Gunicorn deployments. The CFD implementation is explicitly documented as a single-instance solution: only one browser window should open the SSE stream at a time. A production upgrade via Django Channels + Redis pub/sub is documented as the recommended path when multi-worker or multi-server support is needed.

### python-escpos Library

The `python-escpos` library provides native Python bindings for ESC/POS thermal printers over Network (TCP/IP) and USB transports. On Windows, USB printer detection requires the libusb driver installed via the Zadig tool. On Linux, `libusb` is typically available via the system package manager (e.g., `apt install libusb-1.0-0-0-dev`). Printer configuration is stored in each Tenant's settings JSON under the `hardware` sub-object.

### WhatsApp Integration

WhatsApp integration depends on `Tenant.settings.whatsapp` (set up in SubPhase 04.01) for the API key and phone number ID configuration. The birthday cron endpoint reads `Tenant.settings.whatsapp` to determine if WhatsApp messaging is enabled for each tenant. The broadcast builder uses the same configuration.

### Design Tokens Reference

- Navy: `#1B2B3A`
- Orange: `#F97316`
- Border: `#E2E8F0`
- Text muted: `#64748B`
- Background: `#F1F5F9`
- Surface: `#FFFFFF`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Info: `#3B82F6`

---

## Task Breakdown

| # | Task | Complexity | Estimated Effort | Produces |
|---|---------|---------|-----------------|----------|
| 04.03.01 | Build Audit Service Layer | High | 2 days | `backend/apps/audit/services/audit_service.py`, `backend/apps/audit/views/audit_log_views.py`, audit calls wired into all service files |
| 04.03.02 | Build Audit Log Viewer Page | Medium | 1.5 days | Frontend audit log viewer with filter panel, data table, detail modal |
| 04.03.03 | Build ESC/POS Printer Integration | High | 2 days | `backend/apps/hardware/services/printer_service.py`, `backend/apps/hardware/views/printer_views.py` |
| 04.03.04 | Build Cash Drawer Integration | Medium | 1 day | `backend/apps/hardware/services/cash_drawer_service.py`, `backend/apps/hardware/views/drawer_views.py`, updated sale/return views |
| 04.03.05 | Build Hardware Settings Page | Medium | 1.5 days | Frontend hardware settings page, form, PATCH endpoint |
| 04.03.06 | Build Customer Facing Display | Medium | 1.5 days | CFD page with SSE subscription, idle/active/complete states |
| 04.03.07 | Build CFD SSE Endpoint | Medium | 1 day | SSE emitter service, CFD view, cart store updates |
| 04.03.08 | Build WhatsApp Birthday Automation | Medium | 1 day | Birthday cron view, Customer model migration |
| 04.03.09 | Build Marketing Broadcast Builder | Medium | 2 days | Broadcast frontend pages, filter panel, composer, backend views |
| 04.03.10 | Build Promotion Auto-Apply in POS | High | 2 days | Cart store updates, evaluate views, validate code views |
| 04.03.11 | Build Shift Petty Cash and Cash Movements | Medium | 1 day | Cash movement views, record form, Z-Report updates |
| 04.03.12 | Seed Demo Hardware and Audit Data | Low | 0.5 days | Management command for demo data |

---

## Validation Criteria

1. Audit service creates `AuditLog` records without blocking or rolling back the parent transaction.
2. Audit log viewer paginates correctly with page numbers and page size controls.
3. Entity type filter in the audit log viewer narrows results correctly for each of the 9 badge-coloured types.
4. Date range filter in the audit log viewer returns only records within the specified range (inclusive).
5. Actor filter in the audit log viewer returns only records for the selected user.
6. Diff modal in the audit log viewer correctly displays before/after values with colour-coded columns and handles creation-only events.
7. ESC/POS printer prints a sale receipt with correct line width (32 chars for 58mm, 48 chars for 80mm).
8. ESC/POS printer prints a Z-Report with shift totals and cash reconciliation.
9. Test print endpoint returns 200 on success and 500 on printer connection failure.
10. Cash drawer kicks automatically on CASH sale completion and CASH return refund.
11. Cash drawer does NOT kick on CARD sale or CARD refund.
12. Cash drawer kick error is swallowed and does not propagate to the sale transaction.
13. Hardware settings page saves printer configuration correctly using read-then-write JSON merge.
14. Test Printer and Test Drawer buttons on the hardware settings page trigger the correct API endpoints and display success/destructive toasts.
15. CFD page displays Idle state with store name, Welcome tagline, and live clock.
16. CFD page transitions to Active state when SSE stream sends cart data.
17. CFD page transitions to Complete state and auto-resets to Idle after 8 seconds.
18. Undefined SSE stream (no active cart) does not throw errors or flash the CFD display.
19. Birthday cron endpoint processes customers grouped by tenant and sends WhatsApp messages.
20. Broadcast builder filter count matches server-side count endpoint.
21. Promotion auto-apply evaluates cart lines and returns correct discount amounts.
22. Promo code validation returns 404 for unknown codes and 422 for unmet conditions.
23. Cash movements are recorded against open shifts and displayed in Z-Report correctly.
24. Seed command is idempotent — running it multiple times does not create duplicate records.

---

## Files Created or Modified

### Backend — New Files

- `backend/apps/audit/services/audit_service.py`
- `backend/apps/audit/views/audit_log_views.py`
- `backend/apps/audit/management/commands/seed_demo_hardware_audit.py`
- `backend/apps/hardware/services/printer_service.py`
- `backend/apps/hardware/services/cash_drawer_service.py`
- `backend/apps/hardware/services/cfd_emitter.py`
- `backend/apps/hardware/views/printer_views.py`
- `backend/apps/hardware/views/drawer_views.py`
- `backend/apps/hardware/views/cfd_views.py`
- `backend/apps/crm/views/birthday_cron_view.py`
- `backend/apps/crm/views/broadcast_views.py`
- `backend/apps/crm/views/customer_count_view.py`
- `backend/apps/promotions/views/evaluate_views.py`
- `backend/apps/promotions/views/validate_code_views.py`
- `backend/apps/pos/views/cash_movement_views.py`

### Backend — Modified Files

- `backend/apps/crm/models.py` — add `last_birthday_message_sent_year` field
- `backend/apps/accounts/views/settings_views.py` — add PATCH hardware endpoint
- `backend/apps/pos/views/sale_views.py` — add audit + cash drawer calls
- `backend/apps/pos/views/return_views.py` — add audit + cash drawer calls
- `backend/apps/crm/services/customer_service.py` — add audit call on credit change
- `backend/apps/hr/views/staff_views.py` — add audit calls for role/PIN/permission changes
- `backend/apps/promotions/services/promotion_service.py` — add audit calls for promotion lifecycle
- `backend/apps/stock/services/stock_service.py` — add audit call for stock adjustments
- `backend/apps/pos/views/expense_views.py` — add audit calls for expense creation/deletion
- `backend/apps/pos/views/shift_views.py` — add audit call for shift close
- Django settings `INSTALLED_APPS` — add `backend.apps.audit`, `backend.apps.hardware`

### Frontend — New Files

- `frontend/app/[tenantSlug]/settings/audit-log/page.tsx`
- `frontend/components/audit/AuditLogFilters.tsx`
- `frontend/components/audit/AuditLogTable.tsx`
- `frontend/components/audit/AuditLogDetailModal.tsx`
- `frontend/app/[tenantSlug]/settings/hardware/page.tsx`
- `frontend/components/settings/HardwareSettingsForm.tsx`
- `frontend/app/[tenantSlug]/cfd/page.tsx`
- `frontend/app/[tenantSlug]/customers/broadcast/page.tsx`
- `frontend/components/broadcast/BroadcastFilterPanel.tsx`
- `frontend/components/broadcast/BroadcastComposer.tsx`
- `frontend/components/shift/RecordCashMovementForm.tsx`

### Frontend — Modified Files

- `frontend/stores/cartStore.ts` — add CFD update, promotion evaluation, promo code actions
- CartPanel component — add promotions section, promo code input
- Z-Report page — add cash movements section
