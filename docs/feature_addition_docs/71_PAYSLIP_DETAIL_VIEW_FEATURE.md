# Payslip Detail View Feature

## Executive Summary

Payslip detail view providing comprehensive display of complete salary breakdown with earnings, deductions, net pay, YTD information, and employer contributions for employee and HR review.

## Current State Analysis

### EXISTING
- Commission record display (with details)
- User profile views

### GAPS
- No payslip detail view implemented
- No salary component breakdown display
- No YTD calculations
- No employer contribution display
- No tax breakdown (EPF, ETF, PAYE)
- No bank deposit information display
- No payslip header with employee info
- No signature/approval display
- Frontend detail view component not created
- API endpoint not implemented

## Frontend Features

### Header Section
- Employee name (with link to profile)
- Employee ID
- Department
- Designation
- Employment status
- Payslip period (e.g., "May 2024")
- Payslip generated date
- Payslip status indicator (finalized, sent, accessed)

### Company Information Section (Read-Only)
- Company name
- Company address
- Company tax ID/VAT
- Company logo

### Employee Information Section
- Employee name, ID, department, designation
- Bank account number (masked, last 4 digits visible)
- Employment type

### Earnings Section (Detailed Breakdown)
- Basic salary amount
- Allowances table:
  - House rent allowance
  - Transport allowance
  - Special allowance
  - Other allowances (itemized)
  - Subtotal
- Gross salary (large display, color-highlighted)
- Percentage of components visualization (pie/bar chart)

### Deductions Section (Detailed Breakdown)
- EPF employee contribution (amount and percentage)
- ETF contribution (if applicable, amount and percentage)
- PAYE tax (amount and percentage)
- Insurance/health contributions
- Loan repayment
- Other deductions (itemized)
- Total deductions (large display)
- Percentage breakdown visualization

### Net Salary Section (Prominent Display)
- Net salary amount (large, color-highlighted)
- Monthly display
- Annual display (calculated)

### Year-to-Date (YTD) Section
- YTD gross salary (sum of all months)
- YTD deductions (sum of all months)
- YTD net salary
- YTD EPF contribution
- Comparison to previous year (if available)

### Employer Contributions Section (Reference, Not Paid by Employee)
- Employer EPF contribution
- Employer ETF contribution
- Employer insurance contribution
- Total employer contributions
- Note: "Reference information only"

### Bank Deposit Information Section (Read-Only)
- Bank name
- Account number (masked)
- Deposit date
- Deposit status

### Payslip Notes Section (If Any)
- Notes display (HR remarks)

### Action Section
- Download payslip PDF button
- Print payslip button
- Email payslip button
- Share button (generate shareable link)
- Resend to employee button (if HR/manager)
- Correct payslip button (if editable, generates amendment)
- View previous payslip button (navigation)
- View next payslip button (navigation)

### Approval/Signature Section (If Implemented)
- Approver name
- Approval date
- Digital signature (if applicable)
- Approval comments

### Payslip Footer
- Payslip number/reference
- Generation timestamp
- "Digitally signed" indicator
- Disclaimer text (if configured)

### Loading & Error States
- Loading state (skeleton loader)
- Error state (error message if fails to load)

## Backend API Requirements

### Core Endpoints

**GET /api/hr/payslips/{id}/**
- Retrieve payslip details
- Response: { id, employee_id, employee_name, department, designation, employment_type, bank_account (masked), period, gross_salary, allowances: [{type, amount}], deductions: [{type, amount, percentage}], net_salary, ytd: {gross, deductions, net}, employer_contributions: {epf, etf, insurance, total}, bank_deposit_info, notes, status, created_at, finalized_at, sent_at, accessed_at, approver_name (if signed), approval_date (if signed) }

**GET /api/hr/payslips/{id}/ytd-summary/**
- Get YTD calculations
- Response: { ytd_gross, ytd_deductions, ytd_net, ytd_epf, ytd_comparison }

**GET /api/hr/payslips/{id}/previous/**
- Get previous payslip

**GET /api/hr/payslips/{id}/next/**
- Get next payslip

**GET /api/hr/payslips/{id}/download/**
- Download PDF

**GET /api/hr/employees/{id}/**
- Get employee info

**POST /api/hr/payslips/{id}/mark-accessed/**
- Mark as accessed when viewed

**POST /api/hr/payslips/{id}/send-email/**
- Email payslip

## Database Requirements

### Payslip Model (Full)
- All components for salary breakdown
- Line items for earnings and deductions
- YTD calculations (cached for performance)
- Audit trail for payslip views

## Current Implementation Status

- ❌ Payslip detail view NOT implemented
- ❌ Salary breakdown display NOT implemented
- ❌ YTD calculations NOT implemented
- ❌ Employer contribution display NOT implemented
- ❌ Tax breakdown display NOT implemented
- ❌ Approval/signature feature NOT implemented
- ❌ Frontend detail component NOT created
- ❌ API endpoints NOT implemented

## Validation & Edge Cases

- Employee must exist and be active (or show status if terminated)
- Payslip must exist
- Access control: employees see own, HR sees all
- YTD calculations only for current year
- Employer contributions are reference only (not deducted from employee)
- Bank account masking for security
- Decimal precision (currency rounding)
- Payslip amendment versioning (shows which is current)
- Zero salary payslip (leave without pay)
- Partial month payslip (prorated)

## Testing Checklist

- [ ] Page displays all sections
- [ ] Employee information displays correctly
- [ ] Earnings section displays
- [ ] Basic salary displays
- [ ] Allowances breakdown displays
- [ ] Allowances subtotal correct
- [ ] Gross salary displays and calculates correctly
- [ ] Deductions section displays
- [ ] Each deduction type displays with amount
- [ ] Percentage calculations correct
- [ ] Deductions subtotal correct
- [ ] Net salary calculates and displays correctly
- [ ] Net salary formula correct (Gross - Deductions)
- [ ] YTD gross calculates correctly
- [ ] YTD deductions calculates correctly
- [ ] YTD net calculates correctly
- [ ] YTD comparisons display (if available)
- [ ] Employer contributions display as reference only
- [ ] Bank deposit information displays
- [ ] Bank account number masked correctly
- [ ] Notes display (if any)
- [ ] Payslip status displays
- [ ] Period displays correctly
- [ ] Download PDF button works
- [ ] Print button works
- [ ] Email button works
- [ ] Share button works
- [ ] Resend button works (if HR)
- [ ] Previous/next navigation works
- [ ] Approval signature displays (if signed)
- [ ] Footer information displays
- [ ] Disclaimer text displays
- [ ] Access marked as read in system
- [ ] Loading state shows
- [ ] Error state displays
- [ ] Responsive design works
- [ ] Browser printing works correctly

## Implementation Checklist

- [ ] Payslip detail page component
- [ ] Header section component
- [ ] Employee information component
- [ ] Earnings section component
- [ ] Allowances breakdown component
- [ ] Deductions section component
- [ ] Net salary display component
- [ ] YTD summary component
- [ ] Employer contributions component
- [ ] Bank deposit information component
- [ ] Approval/signature component
- [ ] Action buttons group
- [ ] Notes display component
- [ ] Footer information component
- [ ] Salary breakdown chart component
- [ ] YTD comparison chart component
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] PDF download service
- [ ] Print service
- [ ] Email service integration
- [ ] Access logging service
- [ ] Permission checks
- [ ] Responsive layout
- [ ] Accessibility

## Deployment Strategy

- API deployment: GET endpoints live
- Database queries optimized
- PDF generation tested
- Testing: Test with various salary configurations
- Staff training: Show detail view, YTD info, download/email
- Rollback: Maintain payslip data

## Performance Targets

- Detail page load: <500ms
- YTD calculation: <200ms
- PDF generation: <2s
- Print rendering: <1s

## Monitoring & Alerting

- Track detail page load time
- Monitor PDF generation failures
- Alert on access permission errors
- Track page view metrics

## Documentation Requirements

- Payslip detail view guide
- Salary breakdown interpretation
- YTD information explanation
- Deductions guide
- Employer contributions guide
- Download and print guide
- Bank information guide

## Future Enhancements

- Payslip annotations/comments
- Payslip amendment history
- Payslip comparison (month to month)
- Tax certificate generation
- Payslip data export (to accounting)
- Digital signature verification
- Mobile-optimized payslip view
- Payslip trends visualization
