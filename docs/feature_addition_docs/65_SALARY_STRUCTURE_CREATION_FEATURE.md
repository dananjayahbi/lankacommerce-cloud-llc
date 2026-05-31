# Feature 65: Salary Structure Creation

## Executive Summary

Salary structure creation and editing form enabling HR personnel to define comprehensive employee salary configurations with base salary, allowances, and deductions.

## Current State Analysis

### EXISTING IMPLEMENTATION

- Commission calculation system (user commission_rate field exists)
- Form-based staff management

### GAPS & MISSING COMPONENTS

- No salary structure creation form implemented
- No allowance configuration UI
- No deduction configuration UI
- No salary calculation engine (base + allowances - deductions)
- No effective date management form
- No allowance type selector/creation
- No deduction type selector/creation
- Missing validation for salary components
- No gross salary auto-calculation
- No template-based salary creation
- Frontend form components not created
- API endpoints not implemented

## Frontend Features

### Form Header
- Title: "Create Salary Structure" or "Edit Salary Structure"

### Employee Information Section
- **Employee Selector** (required, searchable dropdown)
  - Search by name or ID
  - Show current department
  - Show current designation
  - Show employment type
  - Disable if employee inactive
- **Current Salary Display** (if editing, read-only reference to previous structure)

### Basic Salary Section
- **Basic Salary Field** (required, currency input)
  - Must be positive
  - Real-time validation
  - Currency formatting

### Allowances Section (Collapsible)
- **Allowances Table** with dynamic rows:
  - Allowance type selector (required, dropdown):
    - House rent allowance
    - Transport allowance
    - Special allowance
    - Other (with description)
  - Amount field (required, positive currency)
  - Add more allowances button
  - Remove allowance button (for each row)
- **Allowances Subtotal** (auto-calculated, read-only)

### Deductions Section (Collapsible)
- **Deductions Table** with dynamic rows:
  - Deduction type selector (required, dropdown):
    - EPF (Employee Provident Fund)
    - ETF (Employment Trust Fund)
    - PAYE tax
    - Insurance
    - Loan repayment
    - Other (with description)
  - Amount or percentage selector (dropdown):
    - Fixed amount (currency input)
    - Percentage of gross (number input with %)
  - Amount field (required, positive)
  - Auto-calculate checkbox (if fixed, show calculated value)
  - Add more deductions button
  - Remove deduction button (for each row)
- **Deductions Subtotal** (auto-calculated, read-only)

### Salary Calculation Section (Auto-Calculated, Read-Only)
- Basic salary display
- \+ Total allowances
- = Subtotal
- \- Total deductions
- = **Gross Salary** (large, prominent display)
- Salary breakdown percentage chart (visual)

### Effective Date Section
- **Effective Date Picker** (required)
  - Cannot be past date (or configurable)
  - Show date in local format
- **End Date Picker** (optional)
  - Only if replacing existing structure
  - Must be after effective date
- **Status Selector** (optional)
  - Pending approval
  - Active
  - Draft

### Notes Section
- Notes field (optional, text area, max 500 chars)

### Form Validation Messages
- Required field indicators
- Real-time validation feedback
- Error summary at top
- Gross salary warnings (if excessive or too low)
- Deduction percentage warnings

### Form Buttons
- Save salary structure button (primary)
- Save and create another button (secondary)
- Cancel button (with unsaved changes warning)
- Preview button (show salary breakdown before saving)

### Form States
- Loading state (during submission)
- Success message (with salary structure confirmation)
- Error messages (with specific error details)

## Backend API Requirements

### Endpoints

**POST /api/hr/salary-structures/** - Create salary structure
- Request body: `{ employee_id, basic_salary, effective_date, end_date (nullable), status, notes, allowances: [{allowance_type_id, amount}], deductions: [{deduction_type_id, amount_or_percentage, is_percentage}] }`
- Response: `{ id, employee_id, basic_salary, total_allowances, total_deductions, gross_salary, ... }`

**PUT /api/hr/salary-structures/{id}/** - Update salary structure (if editable)

**GET /api/hr/allowance-types/** - Get available allowance types

**GET /api/hr/deduction-types/** - Get available deduction types

**GET /api/hr/employees/{id}/current-salary/** - Get employee's current salary structure

**POST /api/hr/salary-structures/calculate-gross/** - Calculate gross salary (for preview)

**GET /api/hr/employees/** - Get employee list

## Database Requirements

### Models & Relationships
- SalaryStructure, SalaryAllowance, SalaryDeduction models with proper relationships
- AllowanceType and DeductionType lookup tables
- Unique constraint: (tenant_id, employee_id, effective_date) - no overlapping active structures
- Check constraints: basic_salary > 0, effective_date <= end_date

## Current Implementation Status

- ❌ Salary structure creation form NOT implemented
- ❌ Allowance configuration UI NOT implemented
- ❌ Deduction configuration UI NOT implemented
- ❌ Gross salary calculation NOT implemented
- ❌ Backend endpoints NOT created
- ❌ Allowance/deduction type selectors NOT implemented
- ❌ Form validation NOT implemented
- ❌ Effective date management NOT implemented

## Validation & Edge Cases

- Employee must be active and have hire date before structure effective date
- Basic salary must be positive
- No overlapping active salary structures
- Allowances must be positive
- Deductions: percentage 0-100, fixed amount positive
- Total deductions cannot exceed gross salary
- Effective date cannot be before employee hire date
- End date must be after effective date
- Gross salary should be within reasonable range
- Partial month salary calculations
- Salary component rounding
- Leave impact on salary (unpaid leave deductions)

## Testing Checklist

- [ ] Form displays all sections
- [ ] Employee selector shows employees
- [ ] Employee search works
- [ ] Current salary displays if editing
- [ ] Basic salary input accepts valid numbers
- [ ] Basic salary rejects negative/zero
- [ ] Add allowance row works
- [ ] Remove allowance row works
- [ ] Allowance type selector shows types
- [ ] Allowance amount accepts valid numbers
- [ ] Add deduction row works
- [ ] Remove deduction row works
- [ ] Deduction type selector shows types
- [ ] Fixed amount deduction works
- [ ] Percentage deduction calculates correctly
- [ ] Auto-calculate for percentage works
- [ ] Allowances subtotal calculates
- [ ] Deductions subtotal calculates
- [ ] Gross salary calculates correctly
- [ ] Salary breakdown chart displays
- [ ] Effective date picker works
- [ ] Cannot select past dates
- [ ] End date must be after effective date
- [ ] Status selector works
- [ ] Notes field accepts text
- [ ] Submit saves structure
- [ ] Submit and create opens new form
- [ ] Cancel shows unsaved warning
- [ ] Success message displays
- [ ] Error message displays if fails
- [ ] Form prevents submission without required fields
- [ ] Deduction percentage validation (0-100)
- [ ] Deductions cannot exceed gross warning

## Implementation Checklist

- [ ] Salary structure form component
- [ ] Employee selector component
- [ ] Basic salary input component
- [ ] Allowances section component
- [ ] Deductions section component
- [ ] Dynamic table row management
- [ ] Allowance type selector component
- [ ] Deduction type selector component
- [ ] Effective date picker component
- [ ] End date picker component
- [ ] Salary calculation service
- [ ] Gross salary display component
- [ ] Salary breakdown chart component
- [ ] Form validation service
- [ ] Overlap check service
- [ ] Form submission handler
- [ ] Error handling and display
- [ ] Success notification
- [ ] Responsive form layout
- [ ] Accessibility

## Deployment Strategy

- API deployment: POST/PUT endpoints live
- Database setup: Create allowance and deduction type seed data
- Form testing: Test various salary configurations
- Staff training: Form walkthrough, salary calculation, allowance/deduction types
- Rollback: Maintain previous salary data

## Performance Targets

- Form rendering: <300ms
- Employee list load: <200ms
- Allowance/deduction type load: <200ms
- Salary structure creation: <1s
- Gross salary calculation: <200ms

## Monitoring & Alerting

- Track form submission success rate
- Monitor form validation errors
- Alert on creation failures
- Track form abandonment rate

## Documentation Requirements

- Salary structure creation guide
- Allowance type explanations
- Deduction type explanations
- Effective date guide
- Salary calculation guide
- Form validation guide
- Troubleshooting

## Future Enhancements

- Salary templates (pre-configured structures)
- Department-based salary ranges
- Auto-apply salary increases
- Bulk salary updates
- Salary negotiation workflows
- Approval workflows for salary changes
- Integration with payroll
- Historical salary versioning UI
