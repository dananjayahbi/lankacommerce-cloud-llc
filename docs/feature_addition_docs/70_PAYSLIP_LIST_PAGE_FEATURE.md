# Payslip List Page Feature

## Executive Summary

Payslip management list interface enabling employees and HR to view, access, download, and manage generated payslips with comprehensive filtering and bulk operations.

## Current State Analysis

### EXISTING
- Commission payout system (CommissionPayout, CommissionRecord models)
- User/staff management views
- Tenant-based data isolation

### GAPS
- No payslip model exists (no way to store generated payslips)
- No payslip generation engine (depends on missing payroll module)
- No payslip list view implemented
- No payslip search/filter system
- No PDF generation for payslips
- No email delivery tracking
- No bulk payslip operations
- Missing payslip status tracking (draft, finalized, sent, accessed)
- No payslip retention policy
- No YTD calculations per payslip
- No access control (employees see own, HR sees all)
- No delivery method tracking (email, SMS, portal)
- Missing payslip versioning

## Frontend Features

### Payslips Data Table
- Responsive, sortable, filterable table with columns:
  - Employee ID
  - Employee Name
  - Period
  - Gross Salary
  - Deductions
  - Net Salary
  - Status
  - Sent Date
  - Actions
- Sortable columns (click to sort)
- Row selection checkboxes (for bulk operations)
- Click row to view payslip details
- Status badge indicator (draft, finalized, sent, accessed, failed)
- Period display (e.g., "May 2024", "Q2 2024")
- Salary figures (gross, deductions, net)
- Sent date and delivery status
- Download icon (direct PDF access)
- View details button

### Search Functionality
- Search by employee name
- Search by employee ID
- Debounced real-time search

### Filter Section (Collapsible)
- Employee selector/filter (dropdown or multi-select)
- Period filter (month/year picker or quarter selector)
- Department filter (dropdown)
- Status filter (draft, finalized, sent, accessed, failed)
- Salary range filter (gross min/max)
- Date range filter (sent date from/to)
- Filter count badge
- Clear all filters button

### Sort Options
- Sort by: Employee, Period, Gross Salary, Status, Sent Date
- Sort direction: Ascending/Descending
- Default sort: By period descending (most recent first)

### Pagination Controls
- Page size selector (10, 25, 50, 100 rows)
- Previous/Next buttons
- Page number input
- Total records count display

### Bulk Action Toolbar
Appears when rows selected:
- Bulk email payslips button (resend via email)
- Bulk download as ZIP button
- Bulk mark as accessed button
- Bulk generate PDF button (if not generated)
- Bulk SMS notification button (if enabled)

### Quick Action Buttons (Per Row)
- View payslip button (opens detail view)
- Download PDF button (direct download)
- Email payslip button (resend to employee)
- SMS notification button (if enabled)
- Mark as sent button (if not sent)
- Resend button (if failed)

### Payslip Statistics Section
Above table display:
- Total payslips this month
- Total sent
- Total accessed
- Total failed
- Pending email count
- Average gross salary (this period)
- Average net salary (this period)

### Period Selector (Prominent)
- Month/year selector (calendar picker)
- Quarter selector (dropdown)
- Year selector (numeric input)
- Preset options (This Month, Last Month, This Year, Last Year)
- Previous/Next period buttons

### Additional UI Elements
- Column visibility toggle (customize display columns)
- Refresh button (reload payslip data)
- Export payslips list button (CSV, Excel with summaries)
- Generate missing payslips button (if payroll incomplete)
- Loading state (skeleton loader)
- Empty state (when no payslips, with "Generate Payslips" prompt)
- Error state (error message if API fails)

## Backend API Requirements

### Core Endpoints

**GET /api/hr/payslips/**
- List payslips with filters, search, sorting, pagination
- Query params: search, employee_id, period_month, period_year, department_id, status, salary_min, salary_max, sent_date_from, sent_date_to, page, page_size, ordering
- Response: { count, next, previous, results: [{ id, employee_id, employee_name, period, gross_salary, deductions, net_salary, status, sent_at, accessed_at, delivery_status }] }

**GET /api/hr/payslips/{id}/**
- Retrieve payslip details

**GET /api/hr/payslips/{id}/download/**
- Download payslip PDF

**POST /api/hr/payslips/bulk-email/**
- Bulk email payslips

**POST /api/hr/payslips/bulk-download/**
- Bulk download as ZIP

**PATCH /api/hr/payslips/{id}/mark-sent/**
- Mark payslip as sent

**PATCH /api/hr/payslips/bulk-mark-accessed/**
- Mark multiple as accessed

**POST /api/hr/payslips/resend/**
- Resend failed payslip

**POST /api/hr/payslips/generate-missing/**
- Generate payslips for incomplete payroll

**GET /api/hr/payslips/statistics/**
- Get payslip statistics

**GET /api/hr/employees/**
- Get employee list for filtering

**GET /api/hr/departments/**
- Get department list for filtering

## Database Requirements

### Payslip Model
- id
- tenant_id
- employee_id
- payroll_period_id (or month/year)
- gross_salary
- total_deductions
- net_salary
- pdf_url (nullable)
- status (draft/finalized/sent/accessed/failed)
- created_at
- finalized_at
- sent_at
- accessed_at
- delivery_method (email/sms/portal)

### PayslipDeliveryLog Model
- id
- payslip_id
- delivery_method
- sent_at
- delivered_at
- status
- failure_reason (nullable)

### Indexes
- (tenant_id, employee_id, period)
- (tenant_id, status)
- (employee_id, sent_at DESC)
- (created_at DESC)

## Current Implementation Status

- ❌ Payslip list page NOT implemented
- ❌ Payslip model NOT created
- ❌ Search/filter functionality NOT implemented
- ❌ Statistics calculation NOT implemented
- ❌ Bulk operations NOT implemented
- ❌ Backend API endpoints NOT implemented
- ❌ Frontend table component NOT created
- ❌ PDF download NOT implemented
- ❌ Email delivery tracking NOT implemented

## Validation & Edge Cases

- Employee must be active during payslip period
- Payslips generated only after payroll finalized
- Period must have valid month/year
- Gross salary should be reasonable
- Deductions cannot exceed gross (validation rule)
- Payslip access control (employees see own, HR sees all)
- Payslip retention (configurable period)
- Failed email attempts with retry logic
- Payslips for terminated employees (last period only)
- Payslips for new employees (prorated salary)
- Payslips with zero salary (leave without pay period)
- Duplicate payslip prevention
- Payslip versioning (corrections/amendments)

## Testing Checklist

- [ ] Table renders all columns correctly
- [ ] Search by employee name finds payslips
- [ ] Search by employee ID finds payslips
- [ ] Debounced search works
- [ ] Period filter works (month/year)
- [ ] Department filter populated and works
- [ ] Status filter shows all statuses
- [ ] Salary range filter works
- [ ] Date range filter works
- [ ] Multiple filters combine (AND logic)
- [ ] Clear filters resets all
- [ ] Sorting by each column works (asc/desc)
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows
- [ ] Bulk select checkbox works
- [ ] Bulk email emails selected payslips
- [ ] Bulk download creates ZIP file
- [ ] Bulk mark accessed updates status
- [ ] View payslip opens detail view
- [ ] Download PDF downloads file
- [ ] Email payslip sends to employee
- [ ] Mark as sent updates status
- [ ] Resend attempts redelivery
- [ ] Statistics display correctly
- [ ] Period selector works
- [ ] Column visibility toggle works
- [ ] Refresh button reloads data
- [ ] Generate missing payslips button works
- [ ] Empty state displays
- [ ] Error state displays
- [ ] Loading state shows skeleton
- [ ] Responsive design works

## Implementation Checklist

- [ ] Payslip list page component
- [ ] Payslips table component
- [ ] Search input with debounce
- [ ] Filter section component
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Bulk action toolbar
- [ ] Row selection checkboxes
- [ ] Quick action buttons
- [ ] Statistics panel component
- [ ] Period selector component
- [ ] Column visibility toggle
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Empty state component
- [ ] PDF download service
- [ ] Email service integration
- [ ] Bulk operation handlers
- [ ] Permission checks (access control)
- [ ] Responsive design
- [ ] Accessibility

## Deployment Strategy

- **Phase 1**: Deploy database models (Payslip, PayslipDeliveryLog)
- **Phase 2**: Deploy API endpoints for list and download
- **Phase 3**: Deploy frontend list component
- **Phase 4**: Deploy email delivery tracking
- **Testing**: Load test with 10000+ payslips
- **Staff training**: Show filtering, period selection, bulk operations
- **Rollback plan**: Archive payslips, maintain delivery logs

## Performance Targets

- Payslips list API: <500ms (page_size=25)
- Search query: <200ms (debounced)
- Statistics calculation: <300ms
- Table render: <300ms
- PDF download: <2s per file
- ZIP download: <10s (for 100 payslips)
- Bulk email: <3s (per 50 payslips)

## Monitoring & Alerting

- Track API latency for payslip list
- Monitor PDF generation failures
- Alert on email delivery failures
- Track download usage patterns
- Monitor storage usage (PDFs)

## Documentation Requirements

- Payslip list navigation guide
- Period selection guide
- Filtering tips guide
- Download guide
- Email guide
- Statistics interpretation
- Bulk operations guide

## Future Enhancements

- Payslip templates customization
- Digital signature on payslips
- Payslip advance payment option
- Payslip amendment workflow
- Payslip data export (for accounting)
- Payslip correction/reversal
- Payslip tax certificate generation
- Mobile payslip app
- Payslip notifications (SMS, WhatsApp)
- Payslip archival (automated)
- Payslip analytics (salary trends)
