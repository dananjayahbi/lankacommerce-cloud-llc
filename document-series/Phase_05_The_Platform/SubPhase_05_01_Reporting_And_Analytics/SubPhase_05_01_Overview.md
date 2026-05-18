# SubPhase 05.01 — Reporting and Analytics

## Metadata

| Field | Value |
|-------|-------|
| Task ID | SP-05.01 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | High (12 interdependent tasks across backend models, API views, frontend pages, export utilities, and cron jobs) |
| Estimated Effort | 12–15 days |
| Dependencies | Phase 01 (Project Setup, Auth/RBAC, SaaS Infrastructure), Phase 02 (Product Data Models, Product Management UI), Phase 03 (POS Core, Payments and Receipts, Returns and Exchanges), Phase 04 (CRM and Supplier Management, Staff Promotions and Expenses) |
| Produces | Backend: `backend/apps/reports/models.py` (SavedReport, DailySummaryLog), `backend/apps/reports/views/saved_report_views.py`, `backend/apps/reports/views/daily_summary_cron_view.py`, `backend/apps/reports/services/daily_summary_email.py`, `backend/apps/reports/management/commands/seed_demo_reports.py`. Frontend: `frontend/app/[tenantSlug]/reports/layout.tsx`, `frontend/components/reports/ReportLayout.tsx`, `frontend/components/reports/DateRangePicker.tsx`, `frontend/app/[tenantSlug]/reports/profit-loss/page.tsx`, `frontend/app/[tenantSlug]/reports/sales-by-product/page.tsx`, `frontend/app/[tenantSlug]/reports/sales-by-staff/page.tsx`, `frontend/app/[tenantSlug]/reports/revenue-trend/page.tsx`, `frontend/app/[tenantSlug]/reports/inventory-valuation/page.tsx`, `frontend/app/[tenantSlug]/reports/stock-movements/page.tsx`, `frontend/app/[tenantSlug]/reports/customers/page.tsx`, `frontend/app/[tenantSlug]/reports/staff-performance/page.tsx`, `frontend/app/[tenantSlug]/reports/returns/page.tsx`, `frontend/lib/reports/export.ts`, `frontend/lib/reports/ReportContext.tsx`. |
| Blocked By | SP-01.02 (Auth and RBAC), SP-02.01 (Product Data Models), SP-03.01 (POS Core), SP-03.02 (Payments and Receipts), SP-03.03 (Returns and Exchanges), SP-04.01 (CRM and Supplier Management), SP-04.02 (Staff Promotions and Expenses) |

---

## Objective

SubPhase 05.01 delivers the complete reporting and analytics engine for LankaCommerce. This is the platform layer that transforms raw transactional data — sales, returns, inventory movements, expenses, time-clock entries, commissions, and customer records — into actionable business intelligence. Every report page is designed to answer a specific operational question: What is my current profit and loss position? Which products drive the most revenue? Which staff members perform best? What is my inventory worth? How many customers are churning? The reporting subsystem is not an afterthought; it is the primary decision-support tool for store owners, managers, and cashiers who need real-time visibility into their business health.

Architecturally, this subphase introduces two new Django models — `SavedReport` and `DailySummaryLog` — and one new Django app (`reports`). All report pages live under the `frontend/app/[tenantSlug]/reports/` route segment and share a common `ReportLayout` that provides a date-range picker, export dropdown, and save-report dialog. Data fetching uses TanStack Query with tenant-scoped API endpoints. Charts are rendered with Recharts. Monetary values throughout reports are formatted with `decimal.js` to avoid floating-point display errors. The backend aggregates data via Django ORM querysets, `annotate()` and `aggregate()` calls, and carefully scoped raw SQL for date-truncation and hour-extraction queries that PostgreSQL handles efficiently.

The design philosophy emphasises correctness over convenience. Every monetary computation — revenue, cost of goods sold (COGS), gross profit, net profit, inventory valuation — uses Python `Decimal` on the backend and `decimal.js` on the frontend. Report filters (date range, report type, granularity) are encoded in URL search parameters so that report states are shareable and bookmarkable. Export functions produce CSV, Excel (XLSX), and PDF output, with the PDF rendered serverlessly on the client via `@react-pdf/renderer`. The daily email summary cron job reaches into the reporting engine to snapshot yesterday's key metrics and delivers them via the Resend email API to store owners every morning at 8:00 AM (or 2:30 AM Sri Lanka time).

---

## Instructions

1. Create the `reports` Django app under `backend/apps/reports/`. Add it to `INSTALLED_APPS` in the project settings.

2. Define the `SavedReport` model in `backend/apps/reports/models.py` with fields: `id` (UUID primary key, default `uuid.uuid4`), `tenant` (ForeignKey to Tenant), `user` (ForeignKey to User), `name` (CharField max_length=100), `report_type` (CharField max_length=50 — deliberately not an enum so new report types can be added without a migration), `filters` (JSONField, null=True, blank=True), `created_at` (DateTimeField auto_now_add=True), `updated_at` (DateTimeField auto_now=True). Add `Meta.indexes` on (`tenant`, `user`). Run `poetry run python manage.py makemigrations reports --name add_saved_report_model` then `poetry run python manage.py migrate`.

3. Define the `DailySummaryLog` model in the same `models.py` with fields: `id` (UUID PK), `tenant` (ForeignKey), `sent_at` (DateTimeField auto_now_add=True), `status` (CharField max_length=10 with choices `SENT`/`FAILED` via TextChoices), `error_message` (TextField null=True, blank=True), `recipient_email` (EmailField). Run `makemigrations reports --name add_daily_summary_log` then `migrate`.

4. Build `backend/apps/reports/views/saved_report_views.py`: a DRF ViewSet or APIView with `JWTAuthentication` and `HasTenantPermission`. `GET /api/reports/saved/` filters by `request.user.tenant_id` and `request.user.user_id`, orders by `-created_at`, returns serialized list in `{ "success": True, "data": [...] }` envelope. `POST /api/reports/saved/` validates via DRF Serializer: `name` required (non-empty, max 100), `report_type` required (non-empty), `filters` optional dict. On success, `SavedReport.objects.create(tenant_id=..., user_id=..., name=..., report_type=..., filters=...)` and return 201. On validation failure, return 400 with error details.

5. Build `frontend/components/reports/DateRangePicker.tsx`: a ShadCN Popover containing a grid of preset buttons — Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, and Custom Range. Each preset calls a helper from `date-fns` to compute `from` and `to` Date objects, then invokes `onRangeChange({ from, to })`. The parent `ReportLayout` listens to this callback and updates the URL search parameters (`from` and `to` as ISO strings) via `router.push`. Default range is Last 30 Days. The Popover trigger button displays the current range as "From {formatted from} — To {formatted to}".

6. Build `frontend/app/[tenantSlug]/reports/layout.tsx`: imports `ReportContextProvider` from `frontend/lib/reports/ReportContext.tsx`, wraps children. Renders a sidebar with navigation links to all report pages: Profit & Loss, Sales by Product, Sales by Staff, Revenue Trend, Inventory Valuation, Stock Movements, Customer Analytics, Staff Performance, Returns. The active link is highlighted with a left border in orange (`#F97316`). Below the sidebar, renders the `DateRangePicker`, an export dropdown (PDF, CSV, Excel), and a "Save Report" button that opens a ShadCN Dialog with a text input for report name and a submit handler that POSTs to `/api/reports/saved/`.

7. For each report page (Tasks 05.01.03 through 05.01.10), implement as a `page.tsx` under `frontend/app/[tenantSlug]/reports/[report-name]/`. Each page reads `from` and `to` from URL search params, fetches data via TanStack Query from a dedicated backend endpoint (or reuses the main data endpoint with query params), renders Recharts visualisations, and displays a detailed data table. All monetary values use `decimal.js` formatting with two decimal places and JetBrains Mono font.

8. Build `frontend/lib/reports/export.ts` with three named exports: `exportToCSV`, `exportToExcel`, `exportToPDF`. Each accepts `rows` (array of `ReportRow`), `columns` (array of `ReportColumn`), and `filename` (string). CSV uses `papaparse` `unparse`. Excel uses the `xlsx` library to build a workbook. PDF uses `@react-pdf/renderer` to produce a Document with a title header, date range subtitle, alternating-row table, and generation timestamp footer. Monetary columns render in monospace font.

9. Build `backend/apps/reports/views/daily_summary_cron_view.py`: a DRF APIView accepting GET requests with a `CRON_SECRET` query parameter validated via `hmac.compare_digest`. Queries all active `Tenant` objects, then for each tenant fetches the Owner user email, yesterday's total revenue (Sale aggregate), top-selling product (SaleLine groupBy ordered by total line_total descending, first result), and latest shift closing float (Shift ordered by `-opened_at`, first). Composes an HTML email with inline styles (navy header, stats grid, CTA button). Sends via the Python `resend` library. Logs each attempt — success or failure — as a `DailySummaryLog` record. Returns `{ "success": True, "data": { "processed": N, "sent": M, "failed": K } }`.

10. Create `backend/apps/reports/management/commands/seed_demo_reports.py` that generates sample `SavedReport` records for development and demo environments only. Run via `poetry run python manage.py seed_demo_reports`.

11. Add URL routes in `backend/apps/reports/urls.py`:
    - `GET/POST /api/reports/saved/` → `saved_report_views.SavedReportViewSet`
    - `GET /api/reports/cron/daily-summary/` → `daily_summary_cron_view.DailySummaryCronView`
    Include these under the main API urlpatterns.

12. Register the `reports` app URLs in the project-level `urls.py`.

13. Install the Python `resend` package: `poetry add resend`. Add `RESEND_API_KEY` to environment variables.

---

## Expected Output

- `backend/apps/reports/__init__.py`
- `backend/apps/reports/models.py` (SavedReport, DailySummaryLog)
- `backend/apps/reports/views/__init__.py`
- `backend/apps/reports/views/saved_report_views.py`
- `backend/apps/reports/views/daily_summary_cron_view.py`
- `backend/apps/reports/services/__init__.py`
- `backend/apps/reports/services/daily_summary_email.py`
- `backend/apps/reports/urls.py`
- `backend/apps/reports/management/__init__.py`
- `backend/apps/reports/management/commands/__init__.py`
- `backend/apps/reports/management/commands/seed_demo_reports.py`
- `backend/apps/reports/migrations/0001_add_saved_report_model.py`
- `backend/apps/reports/migrations/0002_add_daily_summary_log.py`
- `frontend/app/[tenantSlug]/reports/layout.tsx`
- `frontend/app/[tenantSlug]/reports/profit-loss/page.tsx`
- `frontend/app/[tenantSlug]/reports/sales-by-product/page.tsx`
- `frontend/app/[tenantSlug]/reports/sales-by-staff/page.tsx`
- `frontend/app/[tenantSlug]/reports/revenue-trend/page.tsx`
- `frontend/app/[tenantSlug]/reports/inventory-valuation/page.tsx`
- `frontend/app/[tenantSlug]/reports/stock-movements/page.tsx`
- `frontend/app/[tenantSlug]/reports/customers/page.tsx`
- `frontend/app/[tenantSlug]/reports/staff-performance/page.tsx`
- `frontend/app/[tenantSlug]/reports/returns/page.tsx`
- `frontend/components/reports/DateRangePicker.tsx`
- `frontend/components/reports/ReportLayout.tsx`
- `frontend/lib/reports/export.ts`
- `frontend/lib/reports/ReportContext.tsx`

---

## Validation

- [ ] `SavedReport` model migration runs without errors and creates the `reports_savedreport` table with all expected columns and compound index on (`tenant_id`, `user_id`).
- [ ] `DailySummaryLog` model migration runs successfully and creates `reports_dailysummarylog` table.
- [ ] `POST /api/reports/saved/` with valid payload returns 201 and the saved report object in the response data envelope.
- [ ] `POST /api/reports/saved/` with empty `name` returns 400 with a validation error message.
- [ ] `POST /api/reports/saved/` without valid JWT token returns 401.
- [ ] `GET /api/reports/saved/` returns only reports belonging to the authenticated user's tenant, ordered by most recent first.
- [ ] `GET /api/reports/cron/daily-summary/` without correct `CRON_SECRET` returns 403.
- [ ] `GET /api/reports/cron/daily-summary/` with correct secret processes all active tenants and logs SENT or FAILED for each.
- [ ] Frontend `DateRangePicker` preset buttons correctly compute date ranges and update URL search params.
- [ ] Navigation sidebar highlights the active report page with orange left-border.
- [ ] All report pages render chart and table data correctly for given date range.
- [ ] Export dropdown generates valid CSV, XLSX, and PDF files for each report.
- [ ] Performance: report queries with large date ranges (e.g. 2 years) return in under 5 seconds with proper database indexing.

---

## Notes

The `report_type` field on `SavedReport` is deliberately a plain `CharField` rather than a `TextChoices` enum. This design allows new report types — such as a future "Custom Report Builder" or "Tax Summary" — to be saved without requiring a database migration. The same principle applies to the `filters` JSONField: it stores arbitrary key-value pairs (date range, granularity, category filter) that the frontend rehydrates when a saved report is loaded. This loose schema is appropriate for a feature whose innovation pace outstrips the migration cycle.

URL search parameters are the source of truth for report filters rather than React state or a global store. This ensures that report configurations are shareable (a manager can copy the URL and send it to an owner), bookmarkable, and survive page refresh. The `DateRangePicker` writes `from` and `to` ISO strings into the query string; individual report pages read them via `useSearchParams()`. The `ReportContext` exists solely to cache fetched report data across tab switches so that navigating from Profit & Loss to Sales by Product does not re-fetch the P&L dataset unnecessarily.

The daily summary cron job targets Sri Lanka timezone (UTC+05:30). The Vercel Cron schedule is set to `30 2 * * *` which corresponds to 8:00 AM Sri Lanka time. The backend validates the cron invocation with a shared secret using `hmac.compare_digest` to prevent unauthorised triggering. Each tenant's summary email is sent individually so that a failure for one tenant does not block others; failed deliveries are logged with the error message for debugging.

All report data queries filter by `tenant_id` to enforce data isolation. The backend never permits cross-tenant data access. Frontend report pages derive the tenant slug from the URL params and pass it to API calls. Role-based access for sensitive reports (Staff Performance where cashiers see only their own data) is enforced on both the backend query layer and the frontend rendering layer for defence in depth.
