# Payroll Run Creation Feature Specification

## Executive Summary

Payroll run creation and processing form enabling HR personnel to generate payroll for employees with automatic calculations, attendance/leave integration, and manual adjustments. This feature provides a comprehensive interface for creating new payroll cycles with intelligent validation, data verification, and employee selection capabilities.

## Current State Analysis

### EXISTING Implementation
- Commission payout creation system for bulk payroll operations
  - Period-based grouping with period_start and period_end fields
  - Employee selection and filtering capabilities
  - Total earned amount calculation (total_earned field)
  - Authorization tracking with authorized_by field
  - Payment status tracking with paid_at field
- Employee selection and filtering mechanisms
- Period-based grouping and management
- Authorization and approval tracking
- User/staff management relationships

### GAPS - NOT YET IMPLEMENTED
- **No payroll run creation form implemented** - No UI for payroll creation
- **No payroll generation engine** - Core calculation engine missing
- **No salary structure integration** - Cannot retrieve salary components
- **No attendance data integration** - No attendance lookup for period
- **No leave impact calculation** - Cannot calculate leave deductions
- **No automatic tax calculation** - PAYE/income tax not calculated
- **No EPF/ETF deduction calculation** - Statutory deductions missing
- **No manual adjustments UI** - No bonus/penalty entry interface
- **No payroll preview before finalization** - No pre-submission review
- **No validation for payroll completeness** - Missing data checks
- **No bulk employee selection** - Cannot select multiple employees efficiently
- **No exclusion mechanism for employees** - Cannot exclude specific employees
- **Frontend form not created** - Complete form component missing
- **API endpoints not implemented** - No creation endpoints
- **No draft saving mechanism** - Cannot save work in progress
- **No rollback from errors** - No error recovery mechanism

## Frontend Features

### Form Header Section
- **Title**: "Create Payroll Run"
- **Form Status Indicator**: Shows current form state (draft, saving, saved)
- **Save Progress Indicator**: Shows auto-save status
- **Help/Guide Button**: Quick access to creation guide

### Payroll Period Section
- **Payroll Period Selector** (required field):
  - Month/Year picker with calendar widget
  - Cannot select future periods (client-side validation)
  - Show selected period prominently
  - Prevent duplicate payroll for same period (validation feedback)
  - Display available periods based on historical data
  - Quick select buttons for common periods (last month, current month)

- **Payroll Run Date** (editable, auto-populated):
  - Date picker widget
  - Default: Current date
  - Reference date for all calculations
  - Tooltip: "This date is used as reference for all salary calculations"
  - Validation: Cannot be before period start date

### Employee Selection Section
- **Employee Filter Options**:
  - **All Active Employees** (checkbox, default on):
    - Selects all employees with active status
    - Show count of selected employees
  - **Specific Departments** (multi-select dropdown):
    - Departments list from organization
    - Search for department name
    - Show employee count per department
    - Combine with other selections
  - **Specific Employees** (multi-select employee picker):
    - Searchable employee picker (by name, ID, email)
    - Show department alongside employee name
    - Show salary status indicator
    - Add selected employees to list
  - **Exclude Employees** (multi-select to exclude):
    - Searchable exclude picker
    - Remove from selected list
    - Show reason for exclusion (optional)

- **Selected Employees Summary**:
  - Total selected count (dynamic)
  - List of selected employees with remove button
  - Search within selected employees
  - Show department for each employee
  - Show salary structure status indicator
  - Bulk actions (remove all, retry failed)

- **Auto-Filter Options** (toggles):
  - **Include only employees with salary structures**:
    - Checkbox, default on
    - Show employees without structures in warning
  - **Exclude terminated employees during period**:
    - Checkbox, default on
    - Automatically filters employees with termination date in period
  - **Exclude employees on leave (entire period)**:
    - Checkbox, default off
    - Filter employees with full-period leave approved
    - Show affected employees count

### Data Verification Section
- **Attendance Data Verification**:
  - Status indicator (green checkmark or warning icon)
  - Text: "Attendance data available for period" (checkbox, read-only)
  - "Missing attendance for X employees" (warning, if applicable)
  - Link to attendance management module
  - Reload attendance data button
  - Show list of employees with missing attendance

- **Leave Data Verification**:
  - Status indicator (green checkmark or warning icon)
  - Text: "Leave data available for period" (checkbox, read-only)
  - "Pending leave approvals for period" (warning, if applicable)
  - Show pending leave count
  - Link to leave management module
  - Reload leave data button
  - Show list of employees with pending leaves

- **Salary Structure Verification**:
  - Status indicator (green checkmark or warning icon)
  - Text: "All selected employees have structures" (checkbox, read-only)
  - "Employees without structures" (warning with list, if applicable)
  - Show employee names without structures
  - Link to salary structure management
  - Ability to remove these employees from selection
  - Suggestion to set up salary structures

### Manual Adjustments Section (Collapsible)
- **Adjustment Entry Table**:
  - Header: "Add Manual Adjustments (Bonuses, Penalties, etc.)"
  - Dynamic rows for adjustments:
    - **Employee Selector** (required, searchable dropdown):
      - Search by name or ID
      - Show department
      - Show only selected employees in payroll
      - Prevent duplicate adjustments for same employee
    - **Adjustment Type** (required, dropdown):
      - Bonus
      - Penalty
      - Advance salary
      - Reimbursement
      - Other (with description field)
    - **Amount Field** (required, positive currency):
      - Decimal input
      - Currency symbol prefix
      - Validation: Must be positive
      - Format: XX,XXX.XX
    - **Reason Field** (required, text area):
      - Max 500 characters
      - Character counter
      - Placeholder: "Enter reason for adjustment"
    - **Remove Button** (X icon, per row):
      - Removes adjustment row
      - Confirmation if adjustment has been saved

  - **Add More Adjustments Button**:
    - Primary button to add new adjustment row
    - Disabled if no employees selected
    - Show next button position

  - **Adjustments Summary** (auto-calculated):
    - Total adjustments by type (bonuses, penalties, etc.)
    - Net adjustment total
    - Impact on gross payroll

### Payroll Generation Section
- **Generate Payroll Button** (primary action):
  - Validates all requirements before enabling
  - Show loading state during generation
  - Progress indicator for employee processing (X of Y processed)
  - Estimated time remaining
  - Shows tooltip on validation failure reasons

- **Preview Button** (secondary):
  - Shows payroll preview before final save
  - Opens preview modal or navigates to preview page
  - Shows all calculations, totals, and statistics
  - Allows edits before final generation

- **Save as Draft Button** (secondary):
  - Saves form state without processing payroll
  - Allows resuming later
  - Shows draft saved confirmation
  - Can resume from draft later

- **Cancel Button** (tertiary):
  - Returns to payroll list without saving
  - Shows confirmation if form has unsaved changes

### Loading State (During Payroll Generation)
- **Progress Bar**: Shows percentage completion
- **Progress Text**: "Processing X of Y employees..."
- **Progress Details**: 
  - Employees processed
  - Current employee being processed
  - Estimated time remaining
- **Cancel Button**: Stops in-progress generation (with confirmation)
- **Animation**: Smooth progress bar animation

### Success State
- **Success Message**:
  - "Payroll run created successfully"
  - Shows payroll run ID
  - Display period and employee count
  - Shows total payroll amount
  - Timestamp of creation
  - Created by information
- **Action Buttons**:
  - "View Payroll Details" (primary)
  - "Create Another" (secondary)
  - "Go to Payroll List" (secondary)

### Error Messages
- **Specific Error Details**:
  - "Failed to create payroll run"
  - Show specific field errors
  - Show validation failures
  - Show calculation errors
  - Show employee-specific errors (list)
- **Error Recovery Options**:
  - "Retry" button
  - "Edit" button (to fix issues)
  - "Save as Draft" (to continue later)
  - Show error log/details (collapsible)

### Warning Messages
- **Verification Issues**:
  - Missing attendance data (non-blocking)
  - Pending leave approvals (non-blocking)
  - Employees without salary structures (blocking)
  - Partial employee coverage
- **Suggestions**:
  - "Complete attendance before generating"
  - "Approve pending leaves"
  - "Set up salary structures for X employees"

## Backend API Requirements

### Create and Generate Payroll Run
```
POST /api/hr/payroll-runs/
```
- **Request Body**:
```json
{
  "period_month": 5,
  "period_year": 2026,
  "payroll_run_date": "2026-05-25",
  "selected_employees": [1, 2, 3, 4, 5],
  "excluded_employees": [6, 7],
  "department_ids": [1, 2],
  "manual_adjustments": [
    {
      "employee_id": 1,
      "adjustment_type": "bonus",
      "amount": "5000.00",
      "reason": "Performance bonus for Q1"
    },
    {
      "employee_id": 2,
      "adjustment_type": "penalty",
      "amount": "1000.00",
      "reason": "Late arrivals in May"
    }
  ],
  "auto_filter_options": {
    "include_only_with_structures": true,
    "exclude_terminated": true,
    "exclude_on_leave": false
  }
}
```

- **Response** (201 Created):
```json
{
  "id": 1,
  "period_month": 5,
  "period_year": 2026,
  "status": "draft",
  "total_employees": 5,
  "total_payroll_amount": "125000.00",
  "payslips_generated": 0,
  "date_processed": null,
  "processed_by_id": null,
  "created_at": "2026-05-25T10:30:00Z",
  "created_by_id": 5,
  "notes": null
}
```

### Get Active Employees List
```
GET /api/hr/employees/active/
```
- **Query Parameters**:
  - department_ids: comma-separated IDs (filter)
  - include_salary_structure: boolean (default: false)
  - search: string (search by name/ID)
  - page: integer
  - page_size: integer

- **Response**:
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "employee_id": "EMP001",
      "department_id": 1,
      "department_name": "Sales",
      "email": "john@example.com",
      "status": "active",
      "has_salary_structure": true,
      "hire_date": "2025-01-01",
      "termination_date": null
    }
  ]
}
```

### Verify Attendance Data for Period
```
GET /api/hr/attendance/verify-period/
```
- **Query Parameters**:
  - period_month: integer
  - period_year: integer
  - employee_ids: comma-separated IDs (optional)

- **Response**:
```json
{
  "period": "2026-05",
  "total_employees": 25,
  "employees_with_attendance": 25,
  "employees_missing_attendance": 0,
  "missing_attendance_employees": [],
  "is_complete": true,
  "last_updated": "2026-05-24T18:00:00Z"
}
```

### Verify Leave Data for Period
```
GET /api/hr/leave-requests/verify-period/
```
- **Query Parameters**:
  - period_month: integer
  - period_year: integer
  - employee_ids: comma-separated IDs (optional)

- **Response**:
```json
{
  "period": "2026-05",
  "total_leave_requests": 5,
  "pending_approvals": 2,
  "approved_leaves": 3,
  "pending_employees": [1, 3],
  "full_period_leaves": [4],
  "is_all_approved": false,
  "pending_approval_details": [
    {
      "employee_id": 1,
      "employee_name": "Jane Smith",
      "leave_type": "annual",
      "start_date": "2026-05-10",
      "end_date": "2026-05-15",
      "status": "pending"
    }
  ]
}
```

### Verify Salary Structures for Period
```
GET /api/hr/salary-structures/verify-period/
```
- **Query Parameters**:
  - period_month: integer
  - period_year: integer
  - employee_ids: comma-separated IDs (optional)

- **Response**:
```json
{
  "period": "2026-05",
  "total_employees": 25,
  "employees_with_structures": 25,
  "employees_missing_structures": 0,
  "missing_structure_employees": [],
  "all_structures_valid": true,
  "structures_effective_date": "2026-01-01"
}
```

### Calculate and Preview Payroll (Optional Endpoint)
```
POST /api/hr/payroll-runs/calculate-preview/
```
- **Request Body**: Same as create payroll run
- **Response**: Preview with calculated salaries (without saving)
```json
{
  "period": "2026-05",
  "payroll_preview": [
    {
      "employee_id": 1,
      "employee_name": "John Doe",
      "basic_salary": "50000.00",
      "allowances": {
        "transport": "2000.00",
        "lunch": "3000.00"
      },
      "allowances_total": "5000.00",
      "deductions": {
        "epf": "2500.00",
        "etf": "500.00",
        "tax": "5000.00"
      },
      "deductions_total": "8000.00",
      "gross_salary": "55000.00",
      "net_salary": "47000.00"
    }
  ],
  "summary": {
    "total_basic": "1250000.00",
    "total_allowances": "125000.00",
    "total_deductions": "200000.00",
    "total_gross": "1375000.00",
    "total_net": "1175000.00"
  }
}
```

### Validate Payroll Before Generation
```
POST /api/hr/payroll-runs/validate/
```
- **Request Body**: Same as create payroll run (optional)
- **Response**:
```json
{
  "is_valid": true,
  "errors": [],
  "warnings": [
    "Missing attendance for 2 employees",
    "Pending leave approvals for 1 employee"
  ],
  "validation_details": {
    "salary_structures_ok": true,
    "attendance_data_ok": false,
    "leave_data_ok": false,
    "period_valid": true,
    "employee_count": 25
  }
}
```

### Save Payroll as Draft
```
POST /api/hr/payroll-runs/save-draft/
```
- **Request Body**: Form data to save (without processing)
- **Response**: Draft payroll run with draft status
```json
{
  "id": 1,
  "status": "draft",
  "period_month": 5,
  "period_year": 2026,
  "form_data": {...},
  "created_at": "2026-05-25T10:30:00Z",
  "message": "Draft saved successfully. You can resume this payroll run later."
}
```

## Database Requirements

### PayrollRun Model (if not already created)
- **Fields**:
  - id (Primary Key)
  - tenant_id (Foreign Key, required)
  - period_month (Integer, 1-12, required)
  - period_year (Integer, required)
  - status (Choice: draft, processed, approved, finalized, cancelled)
  - total_employees (Integer)
  - total_payroll_amount (Decimal)
  - created_at (DateTime, auto)
  - updated_at (DateTime, auto)
  - created_by_id (Foreign Key)
  - payroll_run_date (DateTime)

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
  - status (Choice: included, excluded, error)

### PayrollAdjustment Model
- **Fields**:
  - id (Primary Key)
  - payroll_run_id (Foreign Key, required)
  - employee_id (Foreign Key, required)
  - adjustment_type (Choice: bonus, penalty, advance, reimbursement, other)
  - amount (Decimal, required)
  - reason (Text)
  - created_by_id (Foreign Key)
  - created_at (DateTime, auto)
  - notes (Text, nullable)

### Relationships Required
- PayrollRun → Employees (many-to-many through PayrollRunEmployee)
- PayrollRun → SalaryStructure (employee-based)
- PayrollRunEmployee → Attendance (employee + period)
- PayrollRunEmployee → Leave (employee + period)
- PayrollRun → PayrollAdjustment

## Current Implementation Status

### NOT Implemented
- [ ] Payroll run creation form component
- [ ] Payroll generation engine (calculation logic)
- [ ] Employee selection UI components
- [ ] Attendance integration and verification
- [ ] Leave integration and calculation
- [ ] Salary structure integration
- [ ] Manual adjustments entry interface
- [ ] Payroll preview functionality
- [ ] Form validation service
- [ ] Period uniqueness check service
- [ ] Data verification services (attendance, leave, salary)
- [ ] Form submission handler
- [ ] Error handling and recovery
- [ ] Success notifications
- [ ] Progress tracking during generation
- [ ] Backend API endpoints
- [ ] Database models and migrations
- [ ] Permission and access control

## Validation & Edge Cases

### Payroll Period Validations
- Payroll period must be valid month (1-12) and year
- Cannot process future periods (client and server validation)
- Cannot process same period twice (unique constraint check)
- Period boundaries must align with fiscal/calendar rules
- Previous periods must be finalized before processing next

### Employee and Data Validations
- All selected employees must have salary structures
- Attendance data must be complete for period
- Leave data must be approved before payroll generation
- Cannot include terminated employees in payroll (unless configured)
- Cannot include employees hired after period end date
- Must handle mid-period hire/termination scenarios

### Calculation Validations
- Manual adjustments must be positive amounts
- Deductions cannot exceed gross salary
- Tax calculations must be verified
- EPF/ETF deductions must comply with statutory limits
- Gross salary must equal basic + allowances - deductions (incorrect formula, gross = basic + allowances)
- Net salary must equal gross - tax - statutory deductions
- Leave deductions must be calculated correctly

### Concurrency and State Validations
- Cannot create duplicate payroll for same period (prevent race conditions)
- Prevent concurrent payroll creations for same period (row-level locking)
- Cannot modify salary structures during payroll generation
- Attendance/leave data must not change during generation

### Data Completeness
- All employees must have at least basic salary defined
- Attendance data required for all employees in period
- Leave data must be available for all employees
- Cannot proceed with missing critical data

### Edge Cases
- Employees hired mid-period (pro-rata calculation)
- Employees terminated mid-period (final payslip)
- Employees on leave entire period (zero salary or special handling)
- Bonus/penalty adjustments for excluded employees (validate)
- System outages during payroll generation (recovery)
- Large payroll runs (1000+ employees, performance)
- Partial failure scenarios (some employees fail, others succeed)

## Testing Checklist

### Form Display and Navigation
- [ ] Form displays all sections correctly
- [ ] Period selector shows calendar widget
- [ ] Cannot select future periods (disabled)
- [ ] Cannot select very old periods (validation)
- [ ] Payroll date picker works and shows calendar
- [ ] Date defaults to current date

### Employee Selection
- [ ] All active employees checkbox selects all (with count)
- [ ] Uncheck all employees checkbox deselects all
- [ ] Department multi-select works
- [ ] Employee multi-select works
- [ ] Exclude employees section works
- [ ] Selected count updates correctly
- [ ] Search within selected employees works
- [ ] Add to selection button works
- [ ] Remove from selection button works
- [ ] Show department for each employee

### Auto-Filter Options
- [ ] "Include only with structures" filter works
- [ ] "Exclude terminated" filter works
- [ ] "Exclude on leave" filter works
- [ ] Filters combine correctly
- [ ] Filtered list updates selected count
- [ ] Filter warnings display correctly
- [ ] Show affected employees in warnings

### Data Verification
- [ ] Attendance verification shows status (green/warning)
- [ ] Attendance verification shows missing count
- [ ] Leave verification shows pending approvals
- [ ] Salary structure verification shows missing count
- [ ] Link to related modules works
- [ ] Reload data buttons work
- [ ] Missing data warnings display prominently

### Manual Adjustments
- [ ] Add adjustment row works
- [ ] Remove adjustment row works
- [ ] Employee selector in adjustment works
- [ ] Only selected employees appear in selector
- [ ] Adjustment type dropdown shows all types
- [ ] Amount field accepts valid numbers only
- [ ] Amount field prevents negative values
- [ ] Reason field has character counter
- [ ] Adjustments summary calculates correctly
- [ ] Prevent duplicate adjustments per employee

### Payroll Generation
- [ ] Generate button disabled until valid (shows reason)
- [ ] Generate button validates all requirements
- [ ] Progress bar shows during generation
- [ ] Cancel button stops generation
- [ ] Success message displays on completion
- [ ] Shows payroll run details after creation
- [ ] Error message displays if fails
- [ ] Error message shows specific failures
- [ ] Can retry after error

### Preview Functionality
- [ ] Preview button opens preview modal/page
- [ ] Preview shows all calculated salaries
- [ ] Preview shows totals and statistics
- [ ] Can edit adjustments from preview
- [ ] Back from preview returns to form
- [ ] Generate from preview works

### Draft Functionality
- [ ] Save as draft button saves form state
- [ ] Draft saved message displays
- [ ] Can resume from draft later
- [ ] Draft data persists correctly
- [ ] Can modify draft before generation
- [ ] Can delete draft

### Responsive Design
- [ ] Mobile layout renders correctly (<600px)
- [ ] Tablet layout renders correctly (600-1200px)
- [ ] Desktop layout renders correctly (>1200px)
- [ ] Touch-friendly buttons on mobile
- [ ] Form sections collapse/expand on mobile
- [ ] Table responsive scrolling on mobile

### Accessibility
- [ ] Form labels properly associated with inputs
- [ ] Error messages linked to fields
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Screen reader friendly
- [ ] Color not only indicator of status
- [ ] High contrast text

## Implementation Checklist

### Frontend Components
- [ ] Payroll run creation form component
- [ ] Period selector component with calendar
- [ ] Employee selection section component
- [ ] Department multi-select component
- [ ] Employee multi-select component with search
- [ ] Attendance verification component
- [ ] Leave verification component
- [ ] Salary structure verification component
- [ ] Manual adjustments section with dynamic table
- [ ] Adjustment type selector component
- [ ] Progress bar and progress tracking component
- [ ] Success message component
- [ ] Error state component with details
- [ ] Warning message component
- [ ] Preview modal/component
- [ ] Loading skeleton component
- [ ] Responsive form layout

### Services and Utilities
- [ ] Payroll generation service (orchestrates calculations)
- [ ] Payroll calculation engine (calculates salaries)
- [ ] Attendance retrieval and verification service
- [ ] Leave retrieval and calculation service
- [ ] Salary structure retrieval service
- [ ] Employee selection service
- [ ] Form validation service
- [ ] Period uniqueness validation service
- [ ] Data verification aggregation service
- [ ] Manual adjustment processing service
- [ ] Draft persistence service
- [ ] Error recovery service
- [ ] Progress tracking service
- [ ] Debounce and throttle utilities
- [ ] Currency formatting utility
- [ ] Date formatting utility

### Backend Implementation
- [ ] Payroll generation endpoint (POST /payroll-runs/)
- [ ] Active employees list endpoint
- [ ] Attendance verification endpoint
- [ ] Leave verification endpoint
- [ ] Salary structure verification endpoint
- [ ] Payroll preview/calculation endpoint
- [ ] Payroll validation endpoint
- [ ] Draft save endpoint
- [ ] Payroll generation engine (business logic)
- [ ] Salary calculation logic
- [ ] Tax calculation logic
- [ ] EPF/ETF deduction logic
- [ ] Leave deduction logic
- [ ] Manual adjustment application logic
- [ ] Concurrent request handling
- [ ] Error handling and logging
- [ ] Permission checks
- [ ] Input validation and sanitization
- [ ] Transaction management for consistency

### Testing
- [ ] Unit tests for calculation engine
- [ ] Unit tests for verification services
- [ ] Unit tests for form components
- [ ] Integration tests for API endpoints
- [ ] E2E tests for full creation workflow
- [ ] Performance tests (large employee counts)
- [ ] Concurrency tests (duplicate period prevention)
- [ ] Error scenario tests
- [ ] Data consistency tests

### Documentation
- [ ] Payroll creation user guide
- [ ] Period selection instructions
- [ ] Employee selection guide
- [ ] Data verification steps
- [ ] Manual adjustments guide
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Calculation methodology documentation

## Deployment Strategy

### Phase 1: Calculation Engine Deployment
- Deploy payroll calculation logic (backend service)
- Deploy salary structure integration
- Deploy tax and statutory deduction calculations
- Deploy leave impact calculation
- Test calculations with sample data
- Verify against manual calculations

### Phase 2: Verification Services Deployment
- Deploy attendance verification service
- Deploy leave verification service
- Deploy salary structure verification service
- Deploy data completeness checks
- Test verification with sample data

### Phase 3: Form and Validation Deployment
- Deploy form component (frontend)
- Deploy employee selection UI
- Deploy form validation service
- Deploy period uniqueness checks
- Deploy draft persistence
- Test form with various scenarios

### Phase 4: API Endpoint Deployment
- Deploy create payroll endpoint
- Deploy verification endpoints
- Deploy validation endpoint
- Deploy preview endpoint
- Deploy draft endpoints
- Deploy error handling

### Phase 5: Integration Testing
- Test full workflow from form to payroll creation
- Test error scenarios and recovery
- Test concurrent requests
- Test large payroll runs (100+ employees)
- Test with real organizational data

### Phase 6: Staff Training and Rollout
- Train HR staff on form usage
- Demonstrate verification steps
- Show manual adjustment entry
- Explain calculation methodology
- Provide troubleshooting guidance
- Gradual rollout (pilot → full deployment)

### Rollback Plan
- Maintain ability to revert to draft state
- Keep calculation logic behind feature flag
- Database migration rollback scripts
- Commission payout system remains functional

## Performance Targets

- **Form rendering**: <300ms
- **Employee list API load**: <200ms (page_size=50)
- **Active employee search**: <100ms (debounced)
- **Verification API calls**: <1s (combined)
- **Payroll calculation**: <5s (100 employees)
- **Payroll calculation**: <30s (1000 employees)
- **Preview generation**: <2s
- **Form submission**: <500ms (after calculation)
- **Page load (DOMContentLoaded)**: <1s
- **Time to Interactive**: <2s

## Monitoring & Alerting

### Metrics to Track
- Form completion rate (started vs submitted)
- Average payroll calculation time
- Calculation success rate
- Verification service response time
- Employee selection performance
- Error rate by type
- Form abandonment rate

### Alerts
- Calculation time > 30s
- Verification service latency > 2s
- Calculation failure rate > 1%
- Database lock timeouts on period uniqueness check
- Out of memory during large payroll generation
- Tax/EPF/ETF calculation discrepancies

### Dashboards
- Payroll creation metrics dashboard
- Calculation performance dashboard
- Error tracking dashboard
- User activity dashboard

## Documentation Requirements

### User Documentation
- Payroll creation step-by-step guide
- Period selection guide with examples
- Employee selection best practices
- Data verification interpretation guide
- Manual adjustments guide with examples
- Calculation methodology explanation
- Troubleshooting common issues
- FAQ

### Developer Documentation
- Calculation engine documentation
- API endpoint documentation
- Verification service documentation
- Database schema documentation
- Component architecture
- State management flow
- Error handling patterns
- Deployment runbook

## Future Enhancements

- **Payroll templates**: Save and reuse payroll configurations
- **Auto-recurring payroll**: Automatically generate monthly payroll
- **Scheduled processing**: Generate payroll on defined schedule
- **Payroll forecasting**: Predict future payroll amounts
- **Scenario analysis**: What-if calculations for payroll changes
- **Bulk employee import**: Import employee list for payroll
- **HRIS integration**: Auto-sync attendance from HRIS
- **Automatic approvals**: Auto-approve based on thresholds
- **Payroll variance analysis**: Compare with historical data
- **Mobile app support**: Create payroll on mobile device
- **Offline support**: Create payroll offline, sync when online
- **Payroll audit trail**: Complete audit of all changes
- **Version control**: Track and compare payroll versions
