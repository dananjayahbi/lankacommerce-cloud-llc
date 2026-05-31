# Feature 66: Salary Structure Detail View

## Executive Summary

Salary structure detail view providing comprehensive breakdown of employee salary components with change history and related payroll information.

## Current State Analysis

### EXISTING IMPLEMENTATION

- Commission record tracking with history
- User profile views

### GAPS & MISSING COMPONENTS

- No salary structure detail view implemented
- No salary component breakdown display
- No salary change history display
- No related payroll linking
- No effective date timeline display
- No salary comparison (current vs previous)
- No payslip linking
- Frontend detail view component not created
- API endpoints not implemented

## Frontend Features

### Header Section
- Employee name (with link to employee profile)
- Employee ID
- Department
- Designation
- Employment status indicator

### Salary Structure Information Section
- Structure effective date
- Structure end date (if applicable)
- Status indicator (active, inactive, expired, pending)
- Last modified date and by
- Approval date and approver (if applicable)

### Salary Breakdown Section (Cards or Detailed Table)
- **Basic Salary** (large card display)
  - Amount
  - Percentage of gross
- **Allowances Breakdown** (expandable section or cards)
  - Each allowance type with amount
  - Subtotal
  - Percentage of gross
- **Deductions Breakdown** (expandable section or cards)
  - Each deduction type with amount/percentage
  - Calculated amounts (if percentage-based)
  - Subtotal
  - Percentage of gross
- **Gross Salary** (large, prominent display)
  - Amount
  - Monthly display
  - Annual display (calculated)
- **Salary Breakdown Visual Chart**
  - Pie chart: Base vs Allowances vs Deductions
  - Bar chart: Component comparison

### Related Payroll Section
- Link to related payslips (this structure)
- Recent payslips table (showing this structure's usage)
- Total paid under this structure
- Date range effective

### Salary Change History Section (Timeline)
- Previous salary structures
- Effective dates
- Change reasons
- Modified by
- Quick comparison links

### Actions Section
- Edit salary structure button (if editable)
- Deactivate salary structure button (if active)
- Activate salary structure button (if inactive)
- Duplicate this structure button
- Delete salary structure button (with confirmation)
- View related payslips button
- Print salary structure button
- Export salary structure button (PDF, CSV)

### Comparison Section (Optional)
- Previous salary structure comparison
- Side-by-side display
- Differences highlighted
- Change impact calculation

### Additional Sections
- Notes section (if any)
- Loading state (skeleton loader)
- Error state (error message if data fails to load)

## Backend API Requirements

### Endpoints

**GET /api/hr/salary-structures/{id}/** - Retrieve salary structure details
- Response: `{ id, employee_id, employee_name, department, designation, basic_salary, allowances: [{type, amount}], deductions: [{type, amount_or_percentage, is_percentage}], gross_salary, effective_date, end_date, status, created_at, modified_at, notes, related_payslips_count: N, change_history: [...] }`

**GET /api/hr/salary-structures/{id}/history/** - Get salary structure change history
- Response: `[{ id, effective_date, end_date, basic_salary, gross_salary, created_at, created_by }]`

**GET /api/hr/salary-structures/{id}/payslips/** - Get payslips using this structure
- Query params: `page`, `page_size`
- Response: `{ results: [{ id, period, gross_salary, net_salary, paid_date }] }`

**GET /api/hr/salary-structures/{id}/compare/** - Compare with another structure
- Query params: `compare_id` (other structure ID)
- Response: `{ current: {...}, previous: {...}, differences: {...} }`

**GET /api/hr/employees/{id}/** - Get employee details

**DELETE /api/hr/salary-structures/{id}/** - Delete salary structure

**PATCH /api/hr/salary-structures/{id}/deactivate/** - Deactivate structure

**PATCH /api/hr/salary-structures/{id}/activate/** - Activate structure

**POST /api/hr/salary-structures/{id}/duplicate/** - Duplicate structure

**POST /api/hr/salary-structures/{id}/export/** - Export structure

## Database Requirements

### Models & Relationships
- SalaryStructure with full relationships
- SalaryAllowance and SalaryDeduction with history tracking
- Payslip model linkage (when implemented)
- Audit trail for salary changes

## Current Implementation Status

- ❌ Salary structure detail view NOT implemented
- ❌ Salary breakdown display NOT implemented
- ❌ Change history display NOT implemented
- ❌ Payslip linking NOT implemented
- ❌ Comparison view NOT implemented
- ❌ Frontend detail component NOT created
- ❌ API endpoints NOT implemented

## Validation & Edge Cases

- Employee must exist and be active (or show terminated status)
- Salary structure must exist
- Related payslips should only show if payroll module implemented
- Permission check: only manager/HR can view
- Effective date timeline display
- Multiple structures per employee (different periods)
- Payslips may not exist for structure yet
- Salary structure comparison with non-existent structure
- Annual salary calculation handling
- Currency formatting consistency

## Testing Checklist

- [ ] Page displays all sections
- [ ] Employee information displays
- [ ] Basic salary displays
- [ ] Allowances breakdown displays
- [ ] Deductions breakdown displays
- [ ] Gross salary displays correctly
- [ ] Percentage calculations correct
- [ ] Salary breakdown chart displays
- [ ] Monthly salary displays
- [ ] Annual salary calculates and displays
- [ ] Effective date displays
- [ ] End date displays (if applicable)
- [ ] Status indicator displays
- [ ] Modified date and by displays
- [ ] Change history displays
- [ ] Change history links work
- [ ] Related payslips section displays
- [ ] Payslips table shows correct data
- [ ] Edit button opens form (if editable)
- [ ] Deactivate button works (if active)
- [ ] Activate button works (if inactive)
- [ ] Duplicate button creates copy
- [ ] Delete button shows confirmation
- [ ] Print button works
- [ ] Export button generates file (PDF, CSV)
- [ ] Comparison section displays (if available)
- [ ] Notes display (if any)
- [ ] Loading state shows
- [ ] Error state displays
- [ ] Responsive design works
- [ ] Back button/navigation works

## Implementation Checklist

- [ ] Salary structure detail page component
- [ ] Header section component
- [ ] Salary information section
- [ ] Salary breakdown display component
- [ ] Allowances breakdown component
- [ ] Deductions breakdown component
- [ ] Gross salary display component
- [ ] Salary breakdown chart component (D3.js or similar)
- [ ] Related payroll section component
- [ ] Change history timeline component
- [ ] Salary comparison component
- [ ] Actions button group
- [ ] Notes display component
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Print service
- [ ] Export service (PDF, CSV)
- [ ] Permission checks
- [ ] Responsive layout
- [ ] Accessibility

## Deployment Strategy

- API deployment: GET endpoints live
- Database queries optimized for detail retrieval
- Testing: Test with various salary configurations
- Staff training: Show detail view, change history, comparisons
- Rollback: Maintain previous salary data display

## Performance Targets

- Detail page load: <500ms
- Change history load: <300ms
- Payslips table load: <500ms
- Comparison calculation: <200ms
- Print generation: <3s
- Export generation: <5s

## Monitoring & Alerting

- Track detail page load time
- Monitor API latency for history and payslips
- Alert on export failures
- Track page view metrics

## Documentation Requirements

- Salary structure detail view guide
- Salary breakdown interpretation
- Change history guide
- Comparison guide
- Print and export guide
- Related payslips guide

## Future Enhancements

- Approval workflow visualization
- Salary audit trail (who changed what when)
- Integration with performance reviews
- Salary negotiation history
- Cost allocation visualization
- Department salary impact analysis
- Salary structure versioning
- Salary trend analysis
- Payroll integration dashboard
