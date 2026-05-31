# Payroll Runs List Page Feature Specification

## Executive Summary

Payroll runs management interface enabling HR personnel to view, manage, and track payroll processing cycles with approval workflows and status tracking. This interface provides comprehensive management capabilities for all payroll cycles within the organization, including filtering, searching, bulk operations, and payroll statistics.

## Current State Analysis

### EXISTING Implementation
- Commission payout tracking system (CommissionPayout model with period tracking)
  - Period-based grouping via period_start and period_end fields
  - Authorization tracking with authorized_by field
  - Tenant-based data isolation for multi-tenant support
  - Payment status tracking with paid_at field
- Commission authorization and payment tracking
- Tenant-based data isolation and multi-tenancy support
- User/staff management views and employee relationships
- Period-based aggregation capabilities

### GAPS - NOT YET IMPLEMENTED
- **No payroll run model exists** - Core PayrollRun entity missing
- **No payroll period management system** - No period boundary enforcement
- **No payroll status workflow** - No draft/processed/approved/finalized/cancelled states
- **No employee filter for payroll processing** - No targeted payroll selection
- **No payroll statistics dashboard** - No metrics/KPI display
- **No approval workflow implementation** - No approval state transitions
- **No payroll finalization/locking mechanism** - No payroll protection after finalization
- **No payroll undo functionality** - Cannot revert finalized payroll
- **No bulk payroll operations** - No batch approve/finalize capabilities
- **API endpoints missing for payroll run management** - No REST API for payroll operations
- **Frontend list component not implemented** - No UI for payroll management
- **No payroll history/archive system** - No payroll data retention/versioning

## Frontend Features

### Payroll Runs Data Table (Responsive, Sortable, Filterable)
- **Column Headers**:
  - Period (Month/Year)
  - Status
  - Total Employees
  - Total Payroll Amount
  - Payslips Generated
  - Date Processed
  - Processed By

- **Interactive Table Features**:
  - Sortable columns (click to sort)
  - Row selection checkboxes (for bulk operations)
  - Click row to view payroll details
  - Status badge indicator (draft, processed, approved, finalized, cancelled)
  - Period display (month/year format)
  - Employee count display
  - Total payroll amount display (formatted currency)
  - Processed date and by display
  - Quick action buttons (view, approve, finalize, undo)
  - Edit payroll button (if draft)
  - Delete payroll button (only if draft)

### Search Functionality
- Search by payroll period (month/year)
- Search by processed by user name
- Debounced real-time search to reduce API calls
- Clear search button
- Search history (optional)

### Filter Section (Collapsible)
- **Status filter** (multi-select): draft, processed, approved, finalized, cancelled
- **Period range filter** (from/to month/year)
- **Payroll amount range filter** (min/max currency)
- **Processed by filter** (employee/approver selector)
- **Employee count range filter** (min/max)
- Filter count badge display
- Clear all filters button
- Save filter presets (optional)

### Sort Options
- Sort by: Period, Status, Total Payroll, Total Employees, Date Processed
- Sort direction: Ascending/Descending
- Default sort: By period descending (most recent first)
- Remember last sort preference (optional)

### Pagination Controls
- Page size selector (10, 25, 50, 100 rows)
- Previous/Next buttons
- Page number input
- Total records count display
- Jump to page functionality

### Payroll Statistics Section (Above Table)
- Total payroll runs (all-time)
- Pending approval count (current month)
- Approved runs (current month)
- Total employees processed (current month)
- Average payroll amount (monthly average)
- Last processed date display
- Statistics cards with visual indicators

### Quick Actions Toolbar
- Create new payroll run button (primary action)
- Bulk approve button (approve all selected with confirmation)
- Bulk finalize button (finalize all selected with confirmation)
- Bulk undo button (undo all selected, with confirmation dialog)
- Export payroll runs button (CSV, Excel formats)
- Refresh button (reload payroll data)

### Additional UI Features
- Column visibility toggle (customize display columns)
- Loading state (skeleton loader)
- Empty state (when no payroll runs with CTA)
- Error state (error message if API fails with retry option)
- Responsive design for mobile/tablet

## Backend API Requirements

### List Payroll Runs
```
GET /api/hr/payroll-runs/
```
- **Query Parameters**:
  - search: string (period or processed by name)
  - status: string (comma-separated: draft, processed, approved, finalized, cancelled)
  - period_from: date (YYYY-MM)
  - period_to: date (YYYY-MM)
  - amount_min: decimal
  - amount_max: decimal
  - processed_by_id: integer (user ID)
  - employee_count_min: integer
  - employee_count_max: integer
  - page: integer (default: 1)
  - page_size: integer (default: 25, max: 100)
  - ordering: string (default: -period_year,-period_month)

- **Response**: 
```json
{
  "count": 150,
  "next": "...",
  "previous": "...",
  "results": [
    {
      "id": 1,
      "period_month": 5,
      "period_year": 2026,
      "status": "approved",
      "total_employees": 25,
      "total_payroll_amount": "125000.00",
      "payslips_generated": 25,
      "date_processed": "2026-05-25T10:30:00Z",
      "processed_by_id": 5,
      "processed_by_name": "HR Manager Name",
      "created_at": "2026-05-25T09:00:00Z"
    }
  ]
}
```

### Retrieve Payroll Run Details
```
GET /api/hr/payroll-runs/{id}/
```

### Approve Payroll Run
```
POST /api/hr/payroll-runs/{id}/approve/
```
- Request body: `{ approver_comment: string (optional) }`
- Response: Updated payroll run with approval status

### Finalize Payroll Run
```
POST /api/hr/payroll-runs/{id}/finalize/
```
- Request body: `{ finalization_notes: string (optional) }`
- Response: Updated payroll run with finalized status

### Undo Payroll Run
```
POST /api/hr/payroll-runs/{id}/undo/
```
- Reverts payroll run to draft status
- Request body: `{ undo_reason: string (optional) }`
- Response: Updated payroll run with draft status

### Delete Payroll Run
```
DELETE /api/hr/payroll-runs/{id}/
```
- Only allowed if status is draft
- Returns 204 No Content on success

### Bulk Approve Payroll Runs
```
PATCH /api/hr/payroll-runs/bulk-approve/
```
- Request body: `{ ids: [integer], comment: string (optional) }`
- Response: `{ updated_count: integer, results: [...] }`

### Bulk Finalize Payroll Runs
```
PATCH /api/hr/payroll-runs/bulk-finalize/
```
- Request body: `{ ids: [integer], notes: string (optional) }`
- Response: `{ updated_count: integer, results: [...] }`

### Bulk Undo Payroll Runs
```
PATCH /api/hr/payroll-runs/bulk-undo/
```
- Request body: `{ ids: [integer], reason: string (optional) }`
- Response: `{ updated_count: integer, results: [...] }`

### Get Payroll Statistics
```
GET /api/hr/payroll-statistics/
```
- Response: Statistics summary with counts and amounts

### Export Payroll Runs List
```
POST /api/hr/payroll-runs/export/
```
- Request body: `{ format: "csv" | "excel", filters: {...} }`
- Response: File download or file URL

## Database Requirements

### PayrollRun Model
- **Fields**:
  - id (Primary Key)
  - tenant_id (Foreign Key, required)
  - period_month (Integer, 1-12, required)
  - period_year (Integer, required)
  - status (Choice: draft, processed, approved, finalized, cancelled, default: draft)
  - total_employees (Integer)
  - total_payroll_amount (Decimal)
  - payslips_generated (Integer)
  - date_processed (DateTime, nullable)
  - processed_by_id (Foreign Key to User, nullable)
  - created_at (DateTime, auto)
  - updated_at (DateTime, auto)
  - created_by_id (Foreign Key to User)
  - finalized_at (DateTime, nullable)
  - finalized_by_id (Foreign Key to User, nullable)
  - cancelled_at (DateTime, nullable)
  - notes (Text, nullable)
  - approved_at (DateTime, nullable)
  - approved_by_id (Foreign Key to User, nullable)
  - approval_comment (Text, nullable)

- **Indexes**:
  - (tenant_id, status, period_month, period_year)
  - (tenant_id, period_month, period_year) - Unique constraint
  - (created_at DESC)
  - (status)
  - (processed_by_id)

- **Constraints**:
  - Unique: (tenant_id, period_month, period_year)
  - Check: period_month >= 1 AND period_month <= 12

### PayrollRunEmployee Model
- **Fields**:
  - id (Primary Key)
  - payroll_run_id (Foreign Key, required)
  - employee_id (Foreign Key, required)
  - basic_salary (Decimal)
  - allowances_total (Decimal)
  - deductions_total (Decimal)
  - gross_salary (Decimal)
  - net_salary (Decimal)
  - status (Choice: included, excluded, error, default: included)
  - error_message (Text, nullable)

- **Indexes**:
  - (payroll_run_id)
  - (employee_id)
  - (payroll_run_id, employee_id) - Unique constraint
  - (status)

## Current Implementation Status

### NOT Implemented
- [ ] Payroll runs list page
- [ ] Search functionality
- [ ] Filter system
- [ ] Payroll statistics display
- [ ] Backend models (PayrollRun, PayrollRunEmployee)
- [ ] API endpoints for payroll run management
- [ ] Frontend table component
- [ ] Approval workflow implementation
- [ ] Finalization workflow implementation
- [ ] Undo functionality implementation
- [ ] Bulk operations backend and frontend
- [ ] Export functionality
- [ ] Permission and access control

## Validation & Edge Cases

### Business Rule Validations
- Cannot process payroll for future periods
- Cannot process same period twice (unique constraint or override with confirmation)
- Must have salary structures for all active employees
- Must have attendance/leave data for period
- Approval permissions required for approval operations
- Cannot finalize already finalized payroll
- Cannot undo finalized payroll (unless admin override with audit)
- Cannot edit finalized payroll
- Payroll period boundaries must be valid

### Data Integrity Edge Cases
- Mid-period employee hire/termination handling
- Leave impact calculations on deductions
- Concurrent payroll processing protection (row-level locking)
- Partial employee inclusion in payroll (some excluded)
- Payroll cancellation with employee notification
- Status transition validation (draft → processed → approved → finalized)
- Prevent reverting cancellation directly

### Performance Edge Cases
- Large payroll runs (1000+ employees)
- Bulk operations with hundreds of payroll runs
- Search performance with historical data
- Statistics calculation efficiency
- Export generation for large datasets

## Testing Checklist

### Table Rendering
- [ ] Table renders all columns correctly
- [ ] Column headers display properly
- [ ] Status badges display with correct colors
- [ ] Currency formatting is correct
- [ ] Row highlighting on hover works

### Search Functionality
- [ ] Search by period finds payroll runs
- [ ] Search by processed by name finds runs
- [ ] Debounced search reduces API calls
- [ ] Search results update in real-time
- [ ] Clear search button resets search

### Filter Functionality
- [ ] Status filter shows correct statuses
- [ ] Period range filter works correctly
- [ ] Amount range filter shows correct runs
- [ ] Employee count range filter works
- [ ] Processed by filter finds correct runs
- [ ] Multiple filters combine with AND logic
- [ ] Clear filters resets all to defaults
- [ ] Filter count badge updates

### Sorting
- [ ] Sorting by Period works (asc/desc)
- [ ] Sorting by Status works
- [ ] Sorting by Total Payroll works
- [ ] Sorting by Total Employees works
- [ ] Sorting by Date Processed works
- [ ] Default sort (recent first) works

### Pagination
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows displayed
- [ ] Previous/Next buttons work
- [ ] Page number input navigates correctly
- [ ] Total records count is accurate

### Bulk Operations
- [ ] Bulk select checkbox selects all on page
- [ ] Bulk select checkbox for page updates count
- [ ] Bulk approve approves all selected
- [ ] Bulk finalize finalizes all selected
- [ ] Bulk undo undoes all selected
- [ ] Confirmation dialog appears for bulk ops
- [ ] Partial failure handling in bulk ops

### Quick Actions
- [ ] Create new payroll button navigates to creation
- [ ] View button opens payroll details
- [ ] Approve button approves payroll
- [ ] Finalize button finalizes payroll
- [ ] Undo button undoes payroll
- [ ] Edit button opens edit form (draft only)
- [ ] Delete button deletes (draft only)

### Statistics Display
- [ ] Statistics display correctly
- [ ] Statistics update after payroll changes
- [ ] Statistics calculations are accurate
- [ ] Statistics for current month only

### Export Functionality
- [ ] Export payroll list generates file
- [ ] CSV export format is correct
- [ ] Excel export format is correct
- [ ] Export includes current filters
- [ ] Export file naming is descriptive

### UI/UX
- [ ] Column visibility toggle works
- [ ] Refresh button reloads data
- [ ] Empty state displays with CTA
- [ ] Error state displays with retry
- [ ] Loading state shows skeleton
- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet

### Permissions
- [ ] Non-approvers cannot approve
- [ ] Non-HR users cannot access
- [ ] Row-level security enforced
- [ ] Tenant isolation verified

## Implementation Checklist

### Frontend Components
- [ ] Payroll runs table component
- [ ] Search input with debounce
- [ ] Filter section component
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Quick actions toolbar
- [ ] Row selection checkboxes
- [ ] Statistics panel component
- [ ] Column visibility toggle
- [ ] Status badge component
- [ ] Loading skeleton component
- [ ] Empty state component
- [ ] Error state component

### Services and Utilities
- [ ] API client methods (list, get, approve, finalize, undo, delete, bulk ops)
- [ ] State management (Redux, Zustand, Context)
- [ ] Loading and error states handler
- [ ] Export service (CSV, Excel, PDF)
- [ ] Bulk operation handlers
- [ ] Permission checks service
- [ ] Debounce search utility
- [ ] Date formatting utility
- [ ] Currency formatting utility

### Backend Implementation
- [ ] PayrollRun model and migrations
- [ ] PayrollRunEmployee model and migrations
- [ ] Serializers for API responses
- [ ] ViewSets for API endpoints
- [ ] Permissions and access control
- [ ] Status workflow validation
- [ ] Bulk operation handlers
- [ ] Statistics calculation service
- [ ] Export service

### Testing
- [ ] Unit tests for components
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests for user workflows
- [ ] Performance tests for large datasets
- [ ] Security tests for permissions

### Responsive Design
- [ ] Mobile layout (<600px)
- [ ] Tablet layout (600px-1200px)
- [ ] Desktop layout (>1200px)
- [ ] Touch-friendly buttons
- [ ] Responsive table scrolling

## Deployment Strategy

### Phase 1: Data Model Deployment
- Deploy PayrollRun model
- Deploy PayrollRunEmployee model
- Create database migrations
- Test data schema integrity

### Phase 2: API Deployment
- Deploy serializers
- Deploy ViewSets and endpoints
- Deploy permissions and access control
- Deploy approval workflow backend
- Deploy finalization workflow backend
- Deploy undo functionality backend
- Deploy bulk operation handlers

### Phase 3: Frontend Deployment
- Deploy table component
- Deploy search functionality
- Deploy filters
- Deploy sorting and pagination
- Deploy quick actions
- Deploy statistics display
- Deploy export functionality

### Phase 4: Testing & QA
- Load test with 100+ payroll runs
- Performance test with 1000+ employees per run
- User acceptance testing
- Security testing

### Phase 5: Staff Training & Rollout
- Train HR staff on payroll runs list navigation
- Demonstrate filtering capabilities
- Show approval workflow
- Explain statistics interpretation
- Rollout to production

### Rollback Plan
- Maintain previous payroll data display
- Keep commission payout system intact
- Database migration rollback scripts prepared
- Feature flag for gradual rollout

## Performance Targets

- **Payroll runs list API**: <500ms (page_size=25, average case)
- **Search query**: <200ms (debounced)
- **Statistics calculation**: <300ms
- **Table render**: <300ms (with 25 rows)
- **Export generation**: <5s (100+ payroll runs)
- **Bulk operations**: <2s (100 payroll runs)
- **Page load (DOMContentLoaded)**: <1s
- **Time to Interactive**: <2s

## Monitoring & Alerting

### Metrics to Track
- Average API latency for list endpoint
- Search query latency (p50, p95, p99)
- Statistics calculation time
- Export generation time
- Bulk operation duration
- Error rate for approve/finalize operations

### Alerts
- API latency > 1s
- Search latency > 500ms
- Approval operation failures > 1%
- Finalization operation failures > 1%
- Statistics calculation timeout
- Concurrent request issues

### Dashboards
- Payroll operations dashboard
- Approval workflow metrics
- Performance dashboard
- Error tracking dashboard

## Documentation Requirements

### User Documentation
- Payroll runs list navigation guide
- Filtering tips and tricks
- Statistics interpretation guide
- Approval workflow step-by-step guide
- Finalization guide with considerations
- Undo guide and when to use
- Export guide (CSV vs Excel)
- Troubleshooting common issues

### Developer Documentation
- API endpoint documentation
- Database schema documentation
- Component architecture
- State management flow
- Permission and access control
- Deployment runbook
- Monitoring setup guide

## Future Enhancements

- **Scheduled payroll processing**: Automatic payroll generation on defined schedules
- **Automatic payroll approvals**: Approve based on configurable thresholds
- **Payroll variance analysis**: Compare current period with historical data
- **Payroll forecasting**: Predict future payroll amounts
- **Departmental payroll breakdown**: Show payroll by department
- **Cost center allocation reporting**: Allocate payroll by cost centers
- **Payroll audit trail**: Complete audit log with who changed what and when
- **Payroll version comparison**: Compare different versions of payroll runs
- **Advanced filtering**: Save and reuse filter presets
- **Payroll timeline view**: Visual timeline of payroll cycles
- **Integration with accounting**: Auto-sync approved payroll to accounting system
- **Multi-period payroll view**: Compare multiple periods side-by-side
- **Custom payroll reports**: User-defined payroll reports
