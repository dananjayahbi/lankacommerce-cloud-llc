# Payroll Preview Feature Specification

## Executive Summary

Payroll preview and validation interface providing comprehensive view of all calculated employee salaries with approval controls before finalization. This feature enables HR managers and approvers to review all payroll details, validate calculations, identify discrepancies, and manage the approval workflow before final payroll processing.

## Current State Analysis

### EXISTING Implementation
- Commission payout creation with total_earned field tracking
- Bulk commission payouts with period tracking (period_start, period_end)
- User authorization for payouts (authorized_by field)
- Payment status tracking (paid_at field)
- Commission record linking to sales and users
- Authorization workflows and approver roles

### GAPS - NOT YET IMPLEMENTED
- **No payroll preview view implemented** - No comprehensive payroll review interface
- **No per-employee salary breakdown display** - Cannot view individual salary calculations
- **No payroll validation before approval** - No pre-approval validation mechanism
- **No edit individual payroll functionality** - Cannot modify employee payroll after initial run
- **No payroll variance detection** - No anomaly detection for salary discrepancies
- **No payroll summary statistics** - No high-level payroll metrics display
- **No approval workflow UI** - No visual approval process management
- **No finalization mechanism** - Cannot lock payroll after approval
- **Frontend preview component not created** - Complete preview UI missing
- **API endpoints not implemented** - No preview/approval endpoints
- **No approval history tracking** - No audit trail for approval actions
- **No rejection workflow** - Cannot reject and request changes
- **No comment/annotation system** - No approver communication mechanism
- **No pay slips generation preview** - Cannot preview individual pay slips
- **No concurrent approval handling** - No protection against simultaneous approvals

## Frontend Features

### Header Section
- **Payroll Period Display**: "May 2026" prominently shown
- **Payroll Status Indicator**: 
  - Status badge (Draft, Pending Approval, Approved, Finalized, Rejected)
  - Color coding (gray=draft, yellow=pending, green=approved, blue=finalized, red=rejected)
- **Metadata Display**:
  - Total employee count (e.g., "25 Employees")
  - Total payroll amount (prominently displayed, large font, formatted currency)
  - Created by (HR staff name)
  - Created date and time
  - Version number (if multiple versions)

### Summary Statistics Section
- **Salary Aggregates** (card layout):
  - **Total Basic Salary**: Sum of all basic salaries
  - **Total Allowances**: Sum of all allowance totals
  - **Total Deductions**: Sum of all deduction totals
  - **Total Gross Salary**: Calculated (basic + allowances)
  - **Total Net Salary**: Calculated (gross - tax - statutory deductions)

- **Average and Range Metrics**:
  - **Average Salary**: Mean of all net salaries
  - **Salary Range**: Min and Max net salaries
  - **Highest Paid Employee**: Name and amount
  - **Lowest Paid Employee**: Name and amount

- **Statistics Visualization**:
  - Summary cards with large numbers
  - Visual indicators (up/down arrows for variance vs previous period)
  - Color-coded cards (blue for salaries, green for allowances, red for deductions)
  - Quick insights (e.g., "8% higher than last month")

### Payroll Table (Main Display)
- **Column Headers** (sortable):
  - Employee ID
  - Employee Name
  - Department
  - Basic Salary
  - Allowances (total)
  - Deductions (total)
  - Gross Salary
  - Net Salary

- **Row Features**:
  - Row highlighting on hover
  - Status indicator per employee (processed, error, included, excluded)
  - Quick action buttons per row:
    - **View Details** button (opens employee payroll detail modal)
    - **Edit Payroll** button (opens edit form, if permissions)
    - **Remove from Payroll** button (with confirmation)
  - Sorting on click (asc/desc)
  - Alternating row colors for readability
  - Text overflow handling (ellipsis or truncation)

- **Pagination Controls**:
  - Page size selector (10, 25, 50, 100 rows)
  - Previous/Next buttons
  - Page number input
  - "Showing X to Y of Z" text
  - Jump to page functionality

- **Additional Table Features**:
  - Export table as CSV (all or current page)
  - Export table as Excel (all or current page)
  - Print table functionality
  - Column visibility toggle (customize which columns show)
  - Freeze first column (Employee Name)

### Filter Section (Optional, Collapsible)
- **Filter by Department**: Multi-select dropdown
- **Filter by Salary Range**: Min/Max input fields (currency)
- **Search by Employee**: Name or ID search (real-time)
- **Quick Filters** (buttons):
  - Show Errors (employees with calculation errors)
  - Show Highest Paid (top 10)
  - Show Lowest Paid (bottom 10)
  - Show Excluded (employees excluded from payroll)
- **Clear Filters** button

### Payroll Validation Section
- **Validation Checks Display** (checklist):
  - ✓/✗ All salary structures present
  - ✓/✗ All attendance data complete
  - ✓/✗ All leave data processed
  - ✓/✗ Tax calculations valid
  - ✓/✗ No payroll variance errors
  - ✓/✗ No deductions exceed salary (per employee)
  - ✓/✗ All mandatory fields populated
  - ✓/✗ Period boundaries valid

- **Validation Warnings/Errors List**:
  - Display each issue with:
    - Employee with issue (name, ID)
    - Issue description
    - Severity (warning vs error)
    - Suggested action
  - Collapsible list (show/hide details)
  - Count of issues (e.g., "3 issues found")

- **Fix Issues Link**:
  - Navigate to specific module for remediation
  - "Go to Attendance Module" link
  - "Go to Salary Structure Module" link
  - "Go to Leave Module" link
  - In-page issue fixing (inline edit)

### Manual Adjustments Review Section
- **Adjustments Table Header**: "Manual Adjustments Applied (X adjustments)"
- **Adjustments Display**:
  - Employee Name
  - Adjustment Type (Bonus, Penalty, Advance, Reimbursement, Other)
  - Amount (formatted currency)
  - Reason (truncated with tooltip)
  - Quick edit button (edit adjustment)
  - Quick remove button (remove adjustment)

- **Adjustments Summary** (below table):
  - Total bonuses: Amount
  - Total penalties: Amount (shown as negative)
  - Total other adjustments: Amount
  - Net adjustments total: Amount
  - Impact on payroll percentage

### Approval Workflow Section
- **Approval Status Display**:
  - Current status (Draft, Pending Review, Approved, Rejected)
  - Approver information (if already approved)
  - Approval date/time
  - Approval comments (if any)

- **Approval Actions** (conditional on status and permissions):
  - **Approve Payroll Button** (primary, if draft/pending):
    - Shows confirmation modal before approval
    - Allows entering optional comment
    - Lock checkbox: "Lock payroll after approval"
    - Approval timestamp automatically set
    - Approver name automatically set
  - **Reject Payroll Button** (secondary, if draft/pending):
    - Opens rejection reason modal
    - Requires reason (required field)
    - Allows detailed feedback (text area)
    - Allows reverting to draft for changes
    - Sends notification to creator
  - **Request Changes Button** (alternate to reject):
    - Allows leaving specific comments/feedback
    - Does not change payroll status
    - Notifies creator of changes needed
    - Allows creator to modify and resubmit

- **Comment Section** (for approver notes):
  - Display existing comments
  - Add new comment (textarea)
  - Comment history (who, when, what)
  - Support for @ mentions of other approvers
  - Comment threading (reply to specific comments)

- **Approval History Display** (below actions):
  - Approver name
  - Approval date/time
  - Approval comments (if any)
  - Previous approval attempts (if multiple)
  - Timestamp format with timezone awareness

### Individual Payroll Detail Modal
- **Modal Header**: Employee name, ID, department
- **Employee Information**:
  - Employee ID
  - Department
  - Job Title
  - Employment Status
  - Salary Structure Name (effective date)

- **Salary Breakdown Section**:
  - **Basic Salary**: Amount (labeled as per salary structure)
  - **Allowances**:
    - Each allowance itemized (name, amount)
    - Subtotal for allowances
  - **Subtotal**: Basic + Allowances

- **Deductions Breakdown Section**:
  - **Statutory Deductions**:
    - EPF (Employee Provident Fund): Amount, calculation basis
    - ETF (Employee Trust Fund): Amount, calculation basis
    - Tax (PAYE/Income Tax): Amount, calculation basis
  - **Other Deductions**: Each deduction itemized
  - **Deductions Subtotal**

- **Salary Calculations**:
  - **Gross Salary**: (Basic + Allowances)
  - **Total Deductions**: Sum of all deductions
  - **Net Salary**: (Gross - Deductions)

- **YTD Information** (if available):
  - Year-to-date gross salary
  - Year-to-date deductions
  - Year-to-date net salary
  - Comparison with previous periods

- **Manual Adjustments** (if any):
  - Show adjustments for this employee
  - Impact on gross/net salary

- **Verification Status**:
  - Attendance complete: Yes/No
  - Leave data: Yes/No
  - Salary structure valid: Yes/No

- **Modal Actions**:
  - **Edit Payroll** link (opens edit form)
  - **Remove from Payroll** button (with confirmation)
  - **Print Pay Slip** button (generates individual pay slip)
  - **Close** button

### Edit Individual Payroll Form (Modal or Page)
- **Employee Information** (read-only):
  - Name, ID, Department, Job Title

- **Editable Fields**:
  - Basic Salary (numeric, currency)
  - Allowances (dynamic rows):
    - Allowance type selector
    - Amount field
    - Add/Remove row buttons
  - Deductions (dynamic rows):
    - Deduction type selector
    - Amount field or calculation basis
    - Add/Remove row buttons
  - Manual Adjustments (if applicable)
  - Notes field (reason for edit)

- **Form Actions**:
  - **Save Changes** button (recalculates totals)
  - **Cancel** button (discards changes)
  - **Reset to Original** button (restore initial calculation)

- **Calculated Display** (auto-updated as user edits):
  - Gross Salary calculation
  - Total Deductions calculation
  - Net Salary calculation
  - Show calculation formula (transparency)

### Actions Section (Bottom of Page)
- **Navigation Buttons**:
  - **Back to Edit** button (if draft, navigates back to creation)
  - **Go to Payroll List** button

- **Payroll Operations**:
  - **Save as Final Draft** button (save without approval)
  - **Approve Payroll** button (primary action)
  - **Reject Payroll** button (secondary)
  - **Request Changes** button (alternate)

- **Output/Export Options**:
  - **Print Preview** button (opens print-friendly view)
  - **Download as PDF** button (generates PDF report)
  - **Send for Approval** button (if pending, notifies approvers)

### Page States
- **Loading State**: Skeleton loader showing page structure
- **Error State**: Error message with retry button
- **Empty State**: "No payroll data" message (if applicable)
- **Success State**: Confirmation toast after approval

## Backend API Requirements

### Get Payroll Preview with All Details
```
GET /api/hr/payroll-runs/{id}/preview/
```

- **Response** (200 OK):
```json
{
  "id": 1,
  "period_month": 5,
  "period_year": 2026,
  "status": "pending_approval",
  "created_by": {
    "id": 5,
    "name": "HR Manager",
    "email": "hr@example.com"
  },
  "created_at": "2026-05-25T09:00:00Z",
  "total_employees": 25,
  "payroll_employees": [
    {
      "id": 1,
      "employee_id": 101,
      "employee_name": "John Doe",
      "department_id": 1,
      "department_name": "Sales",
      "basic_salary": "50000.00",
      "allowances": {
        "transport": "2000.00",
        "lunch": "3000.00",
        "performance": "5000.00"
      },
      "allowances_total": "10000.00",
      "deductions": {
        "epf": "2500.00",
        "etf": "500.00",
        "tax": "5000.00",
        "other": "0.00"
      },
      "deductions_total": "8000.00",
      "gross_salary": "60000.00",
      "net_salary": "52000.00",
      "ytd_gross": "300000.00",
      "status": "included"
    }
  ],
  "adjustments": [
    {
      "id": 1,
      "employee_id": 101,
      "employee_name": "John Doe",
      "adjustment_type": "bonus",
      "amount": "5000.00",
      "reason": "Performance bonus",
      "created_by": "HR Manager"
    }
  ],
  "statistics": {
    "total_basic": "1250000.00",
    "total_allowances": "250000.00",
    "total_deductions": "200000.00",
    "total_gross": "1500000.00",
    "total_net": "1300000.00",
    "average_net": "52000.00",
    "salary_min": "40000.00",
    "salary_max": "80000.00",
    "highest_paid": "John Doe - 80000.00",
    "lowest_paid": "Jane Smith - 40000.00"
  },
  "validation_results": {
    "is_valid": true,
    "errors": [],
    "warnings": [
      {
        "employee_id": 5,
        "employee_name": "Employee Name",
        "issue": "Deduction exceeds salary",
        "severity": "warning",
        "suggested_action": "Review and adjust deductions"
      }
    ]
  },
  "approval_status": {
    "current_status": "pending_approval",
    "approved_by": null,
    "approved_at": null,
    "rejected_by": null,
    "rejected_at": null,
    "rejection_reason": null,
    "approval_comments": null
  }
}
```

### Validate Payroll Before Approval
```
GET /api/hr/payroll-runs/{id}/validate/
```

- **Response**:
```json
{
  "id": 1,
  "is_valid": true,
  "errors": [],
  "warnings": [
    {
      "type": "missing_attendance",
      "employee_id": 3,
      "employee_name": "Employee Name",
      "message": "Missing attendance data for May 2026",
      "fix_link": "/hr/attendance?employee_id=3&period=2026-05"
    }
  ],
  "validation_checks": {
    "salary_structures_ok": true,
    "attendance_data_ok": false,
    "leave_data_ok": true,
    "tax_calculations_ok": true,
    "no_deduction_excess": true,
    "all_mandatory_fields": true
  }
}
```

### Approve Payroll Run
```
PATCH /api/hr/payroll-runs/{id}/approve/
```

- **Request Body**:
```json
{
  "approver_comment": "Payroll approved - all figures verified",
  "lock_payroll": true
}
```

- **Response** (200 OK):
```json
{
  "id": 1,
  "status": "approved",
  "approved_by": {
    "id": 10,
    "name": "Approval Manager",
    "email": "approver@example.com"
  },
  "approved_at": "2026-05-26T14:30:00Z",
  "approval_comment": "Payroll approved - all figures verified",
  "is_locked": true,
  "message": "Payroll approved successfully"
}
```

### Reject Payroll Run
```
PATCH /api/hr/payroll-runs/{id}/reject/
```

- **Request Body**:
```json
{
  "rejection_reason": "Tax calculations appear incorrect for senior staff",
  "detailed_feedback": "Please review EPF calculations, seems too high"
}
```

- **Response** (200 OK):
```json
{
  "id": 1,
  "status": "rejected",
  "rejected_by": {
    "id": 10,
    "name": "Approval Manager"
  },
  "rejected_at": "2026-05-26T14:30:00Z",
  "rejection_reason": "Tax calculations appear incorrect",
  "message": "Payroll rejected and reverted to draft",
  "creator_notification_sent": true
}
```

### Request Changes on Payroll
```
PATCH /api/hr/payroll-runs/{id}/request-changes/
```

- **Request Body**:
```json
{
  "comment": "Please verify allowances for department heads - seem high",
  "specific_issues": [
    {
      "employee_id": 5,
      "issue": "Transport allowance seems excessive"
    }
  ]
}
```

- **Response** (200 OK):
```json
{
  "id": 1,
  "status": "changes_requested",
  "requested_by": "Approval Manager",
  "requested_at": "2026-05-26T14:30:00Z",
  "comment": "Please verify allowances...",
  "creator_notification_sent": true
}
```

### Get Individual Employee Payroll Details
```
GET /api/hr/payroll-runs/{id}/payroll-employees/{employee_id}/
```

- **Response**:
```json
{
  "id": 1,
  "employee_id": 101,
  "employee": {
    "id": 101,
    "name": "John Doe",
    "employee_id": "EMP001",
    "department": "Sales",
    "job_title": "Sales Manager",
    "status": "active"
  },
  "basic_salary": "50000.00",
  "allowances": {
    "transport": "2000.00",
    "lunch": "3000.00",
    "performance": "5000.00"
  },
  "allowances_total": "10000.00",
  "deductions": {
    "epf": "2500.00",
    "etf": "500.00",
    "tax": "5000.00"
  },
  "deductions_total": "8000.00",
  "gross_salary": "60000.00",
  "net_salary": "52000.00",
  "ytd_gross": "300000.00",
  "ytd_net": "260000.00",
  "attendance_status": "complete",
  "leave_status": "processed",
  "salary_structure_valid": true,
  "verification": {
    "attendance_ok": true,
    "leave_ok": true,
    "salary_structure_ok": true
  }
}
```

### Update Individual Employee Payroll
```
PATCH /api/hr/payroll-runs/{id}/payroll-employees/{employee_id}/
```

- **Request Body**:
```json
{
  "basic_salary": "52000.00",
  "allowances": {
    "transport": "2000.00",
    "lunch": "3000.00",
    "performance": "5000.00"
  },
  "deductions": {
    "epf": "2500.00",
    "etf": "500.00",
    "tax": "5200.00"
  },
  "edit_reason": "Corrected tax calculation"
}
```

- **Response** (200 OK):
```json
{
  "id": 1,
  "employee_id": 101,
  "basic_salary": "52000.00",
  "gross_salary": "62000.00",
  "net_salary": "54300.00",
  "message": "Employee payroll updated successfully"
}
```

### Remove Employee from Payroll
```
DELETE /api/hr/payroll-runs/{id}/payroll-employees/{employee_id}/
```

- **Response** (204 No Content)

### Export Payroll Data
```
POST /api/hr/payroll-runs/{id}/export/
```

- **Request Body**:
```json
{
  "format": "csv",
  "include_filters": {
    "departments": [1, 2, 3],
    "salary_range": {"min": 0, "max": 100000}
  }
}
```

- **Response**: File download (CSV, Excel, or PDF)

### Get Payroll Print Format
```
GET /api/hr/payroll-runs/{id}/print/
```

- **Response**: HTML printable format or PDF

### Add Comment to Payroll
```
POST /api/hr/payroll-runs/{id}/comments/
```

- **Request Body**:
```json
{
  "comment": "Payroll looks good, proceeding with approval",
  "mentions": [10, 11]
}
```

- **Response** (201 Created):
```json
{
  "id": 1,
  "author": "Approval Manager",
  "comment": "Payroll looks good...",
  "created_at": "2026-05-26T14:30:00Z",
  "mentions": [...]
}
```

## Database Requirements

### PayrollRun Model
- **Additional Fields** (beyond create):
  - approved_at (DateTime, nullable)
  - approved_by_id (Foreign Key, nullable)
  - approval_comment (Text, nullable)
  - rejected_at (DateTime, nullable)
  - rejected_by_id (Foreign Key, nullable)
  - rejection_reason (Text, nullable)
  - is_locked (Boolean, default False)
  - finalized_at (DateTime, nullable)
  - finalized_by_id (Foreign Key, nullable)

### PayrollRunEmployee Model
- **Additional Fields**:
  - attendance_complete (Boolean)
  - leave_processed (Boolean)
  - salary_structure_valid (Boolean)
  - ytd_gross (Decimal, nullable)
  - ytd_net (Decimal, nullable)

### PayrollComment Model
- **New Model**:
  - id (Primary Key)
  - payroll_run_id (Foreign Key)
  - author_id (Foreign Key to User)
  - comment_text (Text)
  - mentions (JSON or ManyToMany)
  - created_at (DateTime, auto)
  - updated_at (DateTime, auto)
  - is_edited (Boolean)

### Indexes
- (payroll_run_id) on PayrollComment
- (created_at DESC) on PayrollComment
- (approved_by_id) on PayrollRun
- (status, approved_at) on PayrollRun

## Current Implementation Status

### NOT Implemented
- [ ] Payroll preview page component
- [ ] Header section with status indicator
- [ ] Summary statistics panel component
- [ ] Payroll table with sorting and pagination
- [ ] Filter section component
- [ ] Validation check list component
- [ ] Manual adjustments review component
- [ ] Approval workflow section component
- [ ] Individual payroll detail modal component
- [ ] Edit individual payroll form component
- [ ] Approval history component
- [ ] Comment section component
- [ ] Validation service
- [ ] Calculation verification service
- [ ] API client methods (preview, validate, approve, reject)
- [ ] State management
- [ ] Loading and error states
- [ ] Print service
- [ ] Export service (CSV, PDF)
- [ ] Permission checks
- [ ] Responsive layout
- [ ] Accessibility features

## Validation & Edge Cases

### Approval Workflow Validations
- Only users with approval permissions can approve
- Cannot approve already approved payroll
- Cannot approve finalized payroll
- Cannot reject already approved payroll
- Cannot modify finalized payroll (read-only view only)
- Approval permissions based on role and department

### Data Integrity Edge Cases
- Deductions cannot exceed gross salary (per employee)
- Salary calculations must match formula (gross = basic + allowances)
- Net salary must be positive (or zero in exceptional cases)
- YTD calculations must be cumulative and accurate
- Cannot edit after finalization
- Concurrent approval attempts protection

### Calculation Verification
- Tax calculations verified against statutory requirements
- EPF and ETF deductions verified against legal limits
- Allowance calculations verified against salary structure
- Leave deductions verified against leave records
- Manual adjustments verified for correctness

### Approval Workflow Edge Cases
- Multiple approvers (sequential or parallel)
- Approval delegation
- Revoked approvals (if needed)
- Rejection with feedback and resubmission
- Changes requested vs outright rejection
- Approval notifications and reminders
- Approval timeout/escalation (optional)

### User Permission Edge Cases
- Only HR and finance roles can view payroll
- Only authorized approvers can approve
- Employees can only view their own payroll slip
- Managers can view their department's payroll
- Admin can override approvals (with audit)

## Testing Checklist

### Page Display and Navigation
- [ ] Page displays all sections correctly
- [ ] Header shows period correctly
- [ ] Status indicator displays with correct color
- [ ] Employee count shows accurately
- [ ] Total payroll amount displays prominently
- [ ] Created by information displays

### Summary Statistics
- [ ] Total basic salary calculated correctly
- [ ] Total allowances calculated correctly
- [ ] Total deductions calculated correctly
- [ ] Total gross salary calculated correctly
- [ ] Total net salary calculated correctly
- [ ] Average salary calculated correctly
- [ ] Salary range (min/max) displays correctly
- [ ] Statistics update after employee edits

### Payroll Table
- [ ] Table displays all employees
- [ ] All columns display correctly
- [ ] Table is sortable on each column
- [ ] Sorting toggles asc/desc
- [ ] Pagination works correctly
- [ ] Page size selector changes rows
- [ ] View details button opens modal
- [ ] Edit button opens edit form
- [ ] Remove button removes employee
- [ ] Row highlighting works on hover
- [ ] Currency formatting is correct
- [ ] Column freezing works
- [ ] Column visibility toggle works

### Filtering
- [ ] Filter by department works
- [ ] Filter by salary range works
- [ ] Search by employee works
- [ ] Quick filters (errors, highest, lowest) work
- [ ] Clear filters resets all

### Validation Display
- [ ] Validation checks display
- [ ] Checkmarks show for valid checks
- [ ] X marks show for failed checks
- [ ] Warnings/errors list displays
- [ ] Fix issues links work
- [ ] Validation warnings count accurate

### Manual Adjustments
- [ ] Adjustments display in table
- [ ] All adjustment types show
- [ ] Amounts display correctly
- [ ] Reasons truncate with tooltip
- [ ] Edit adjustment button works
- [ ] Remove adjustment button works
- [ ] Adjustments total calculated correctly

### Individual Payroll Modal
- [ ] Modal opens on view details
- [ ] Employee info displays
- [ ] Salary breakdown shows all components
- [ ] Calculations display correctly
- [ ] Deductions itemized correctly
- [ ] YTD info displays (if available)
- [ ] Edit button works
- [ ] Remove button works
- [ ] Print button works
- [ ] Modal closes properly

### Approval Workflow
- [ ] Approve button shows confirmation
- [ ] Approve button requires comment (optional)
- [ ] Lock payroll checkbox works
- [ ] Reject button shows reason modal
- [ ] Reject button requires reason (required)
- [ ] Request changes button works
- [ ] Approval history displays
- [ ] Approver name and date correct
- [ ] Approval comments display
- [ ] Status updates after approval

### Edit Individual Payroll
- [ ] Edit form opens from modal
- [ ] All fields editable
- [ ] Calculations update as edited
- [ ] Save changes button works
- [ ] Cancel button discards changes
- [ ] Reset to original works
- [ ] Edit reason field captures reason
- [ ] Validation prevents invalid data

### Output Options
- [ ] Print preview works
- [ ] Print generates correct format
- [ ] Download PDF works
- [ ] CSV export works
- [ ] Excel export works
- [ ] Export includes current filters

### Permissions
- [ ] Non-approvers cannot approve
- [ ] Read-only view for viewers
- [ ] Finalized payroll not editable
- [ ] Permission-based button visibility

### Responsive Design
- [ ] Mobile layout works (<600px)
- [ ] Tablet layout works (600-1200px)
- [ ] Desktop layout works (>1200px)
- [ ] Touch-friendly buttons on mobile
- [ ] Table scrolling on mobile

## Implementation Checklist

### Frontend Components
- [ ] Payroll preview page component
- [ ] Header section component
- [ ] Summary statistics panel component
- [ ] Payroll table component
- [ ] Filter section component
- [ ] Validation check list component
- [ ] Manual adjustments review component
- [ ] Approval workflow section component
- [ ] Individual payroll detail modal component
- [ ] Edit individual payroll form component
- [ ] Approval history component
- [ ] Comment section component
- [ ] Loading state component
- [ ] Error state component
- [ ] Success state component
- [ ] Print-friendly component

### Services and Utilities
- [ ] Payroll preview API client
- [ ] Payroll validation API client
- [ ] Approval workflow API client
- [ ] Export service (CSV, Excel, PDF)
- [ ] Print service
- [ ] State management
- [ ] Validation service
- [ ] Calculation verification service
- [ ] Permission checks service
- [ ] Currency formatting utility
- [ ] Date formatting utility

### Backend Implementation
- [ ] Preview API endpoint
- [ ] Validation API endpoint
- [ ] Approve API endpoint
- [ ] Reject API endpoint
- [ ] Request changes API endpoint
- [ ] Individual payroll detail endpoint
- [ ] Update individual payroll endpoint
- [ ] Remove from payroll endpoint
- [ ] Export endpoint
- [ ] Print format endpoint
- [ ] Add comment endpoint
- [ ] Validation logic
- [ ] Approval workflow logic
- [ ] Permission checks
- [ ] Audit logging

### Testing
- [ ] Unit tests for components
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests for approval workflow
- [ ] Performance tests (large payroll)
- [ ] Permission tests
- [ ] Accessibility tests

### Documentation
- [ ] Payroll preview user guide
- [ ] Statistics interpretation guide
- [ ] Approval workflow guide
- [ ] Individual payroll edit guide
- [ ] Rejection and feedback guide
- [ ] Export and print guide
- [ ] API documentation

## Deployment Strategy

### Phase 1: Validation Engine Deployment
- Deploy payroll validation service
- Deploy validation API endpoint
- Deploy validation checks logic
- Test validation with sample data

### Phase 2: Preview UI Deployment
- Deploy preview page component
- Deploy header and statistics
- Deploy payroll table and filters
- Deploy summary display
- Test UI with sample data

### Phase 3: Approval Workflow Deployment
- Deploy approval logic (backend)
- Deploy approval workflow UI
- Deploy rejection workflow
- Deploy comment system
- Test approval workflow end-to-end

### Phase 4: Individual Payroll Edit Deployment
- Deploy individual payroll detail modal
- Deploy edit individual payroll form
- Deploy update endpoint
- Deploy permission checks
- Test individual edits

### Phase 5: Export and Print Deployment
- Deploy export service (CSV, Excel)
- Deploy print service
- Deploy PDF generation
- Test export and print formats

### Phase 6: Integration and Testing
- Full E2E testing of approval workflow
- Performance testing with large payroll
- Permission testing
- Concurrent approval handling
- Audit trail verification

### Phase 7: Staff Training and Rollout
- Train approvers on preview interface
- Show approval workflow
- Demonstrate individual payroll edits
- Explain validation checks
- Explain export and print options
- Gradual rollout to approvers

### Rollback Plan
- Maintain previous payroll view
- Keep approval workflows intact
- Database rollback scripts
- Feature flag for gradual rollout

## Performance Targets

- **Preview page load**: <500ms
- **Payroll table render**: <300ms (50 employees)
- **Payroll table render**: <2s (1000 employees)
- **Validation checks**: <500ms
- **Individual detail modal load**: <200ms
- **Print/export generation**: <5s
- **Approval operation**: <500ms
- **Comment save**: <300ms
- **Page load (DOMContentLoaded)**: <1s
- **Time to Interactive**: <2s

## Monitoring & Alerting

### Metrics to Track
- Preview page load time
- Payroll table render time
- Validation check latency
- Approval operation duration
- Export generation time
- Error rate by operation type
- Approval success rate

### Alerts
- Page load > 1s
- Table render > 3s
- Validation latency > 1s
- Approval operation failures > 1%
- Export generation timeout
- Concurrent approval conflicts

### Dashboards
- Payroll preview metrics dashboard
- Approval workflow dashboard
- Export operations dashboard
- Error tracking dashboard

## Documentation Requirements

### User Documentation
- Payroll preview navigation guide
- Summary statistics interpretation guide
- Validation check explanations
- Approval workflow step-by-step guide
- Individual payroll edit guide
- Rejection and feedback guide
- Export and print guide
- Troubleshooting guide
- FAQ

### Developer Documentation
- API endpoint documentation
- Preview data structure documentation
- Validation logic documentation
- Approval workflow documentation
- Component architecture
- State management
- Permission model
- Audit trail documentation
- Deployment runbook

## Future Enhancements

- **Payroll comparison**: Compare current period with previous periods
- **Payroll variance analysis**: Highlight significant changes
- **Automatic approval**: Based on thresholds and rules
- **Approval delegation**: Delegate approvals to others
- **Multi-level approval**: Multiple approval stages
- **Payroll simulation**: What-if analysis before approval
- **Integration with accounting**: Auto-sync approved payroll
- **Automated compliance checks**: Validate against regulations
- **Payroll audit trail**: Complete audit log visualization
- **Payroll version history**: Track all versions with diffs
- **Bulk payroll corrections**: Edit multiple employees at once
- **Payroll forecasting**: Project future payroll amounts
- **Department-based approval**: Different approval workflows per department
- **Email notifications**: Automated notifications to approvers
- **Mobile approval**: Approve payroll via mobile app
- **Electronic signatures**: Digital signature for approval
- **Compliance reports**: Generate compliance documentation
