# Financial Report Generation Page Feature Specification

## Executive Summary

Financial Report generation interface enabling accounting teams to configure, generate, and preview financial statements (P&L, Balance Sheet, Cash Flow, Trial Balance) with period selection, filtering options, format choices, and preview capability for accurate financial reporting.

## Current State Analysis

### EXISTING INFRASTRUCTURE:
- Date picker components
- Format selector framework (PDF, Excel, CSV)
- Filter UI components
- Form validation framework
- Report export infrastructure

### MISSING (Partially implemented):
- P&L generation form
- Balance Sheet generation form
- Cash Flow generation form
- Trial Balance generation form
- Account balance calculation
- GL account queries
- Journal entry queries for trial balance
- Report preview functionality
- Filter logic (department, cost center, account type)
- Comparison period configuration
- Sub-account inclusion toggle
- Budget comparison toggle
- Detailed vs summary format selector
- Report parameter validation
- Report generation service
- Async report generation (for large reports)
- Report preview API
- Department/cost center selectors
- Account type filters
- Filter application logic
- Frontend generation form component
- Preview component
- Parameter persistence

---

## Frontend Features

### Report Selection Section:
- **Report type selector** (required, radio buttons or dropdown):
  - Profit & Loss Statement
  - Balance Sheet
  - Cash Flow Statement
  - Trial Balance
  - General Ledger
  - Account Statement
  - Financial Ratio Analysis
  - Back button to reports list

- **Report description** (read-only, displays selected report info)

### Period Configuration Section:
- **Report period**:
  - Start date picker (required)
  - End date picker (required)
  - Validation: start <= end, end <= today

- **Comparison period** (optional, for comparative reports):
  - Enable checkbox
  - Start date picker (if enabled)
  - End date picker (if enabled)
  - Comparison type selector (Year-over-year, Previous period, etc.)

### Filter Section (collapsible, optional):
- **Department filter** (multi-select dropdown):
  - All departments selected by default
  - Select/deselect individual departments
  - Select all / Clear all buttons

- **Cost center filter** (multi-select dropdown, if applicable):
  - All cost centers selected by default
  - Select/deselect individual centers
  - Select all / Clear all buttons

- **Account type filter** (for filtered reports):
  - Select account types to include
  - All types default

- **Clear filters button**

### Report Options Section (toggles and selectors):
- **Include sub-accounts toggle** (for detailed accounts):
  - Default: checked (include sub-accounts)
  - Shows total with and without sub-accounts

- **Include budget comparison toggle** (if budget data available):
  - Default: unchecked
  - Shows budget and variance columns

- **Format selector** (required, radio buttons or dropdown):
  - PDF (default)
  - Excel (.xlsx)
  - CSV (.csv)
  - Guidance text per format

- **Report format level selector** (radio buttons):
  - Summary (totals only)
  - Detailed (itemized by account)
  - Default: Summary

- **Rounding selector** (dropdown):
  - Whole dollars
  - Thousands
  - Millions
  - Default: Whole dollars

### Advanced Options (collapsible):
- **Include zero-balance accounts toggle**
  - Default: unchecked (exclude zero-balance)

- **Include inactive accounts toggle**
  - Default: unchecked

- **Currency selector** (if multi-currency):
  - Display currency
  - Exchange rate date

- **Consolidated view toggle** (for multi-entity, if applicable):
  - Default: unchecked

- **Page break by department toggle**:
  - Default: unchecked

### Preview Section (below form):
- **Generate preview button**:
  - Generates sample of report
  - Shows first page preview
  - Loading indicator

- **Preview pane** (when preview loaded):
  - Report header (company, period, generated date)
  - First page of report
  - Scroll for more preview
  - Print preview button
  - Close preview button

- **Preview generation time display**
- **Preview auto-updates if parameters change**

### Form Actions (buttons):
- **Generate report button** (primary):
  - Validates all required fields
  - Shows loading progress
  - Disables form during generation
  - Success notification on completion

- **Save as template button** (secondary):
  - Opens save template dialog
  - Template name input
  - Template description (optional)
  - Save and close button

- **Cancel button**:
  - Closes form, returns to reports list

- **Reset button**:
  - Clears all inputs to defaults

### Validation Messages:
- Required field indicators
- Error messages below fields
- Prevent submission if validation errors
- Warning for large date ranges (performance)

---

## Backend API Requirements

### Endpoints:

**POST /api/accounting/reports/generate/**
- Generate financial report
- Request body: `{ report_type, period_start, period_end, filters: {departments, cost_centers, account_types}, options: {include_sub_accounts, include_budget, format, level, rounding, include_zero_balance, include_inactive, consolidated}, comparison_period (optional) }`
- Response: `{ id, status, file_url, file_name, generated_at, generation_time_ms }`

**GET /api/accounting/reports/preview/**
- Generate report preview
- Request body: (same as generate)
- Response: `{ preview_html, page_count, sample_page (1-based) }`

**GET /api/accounting/departments/**
- Get departments for filter
- Response: `[{ id, name }]`

**GET /api/accounting/cost-centers/**
- Get cost centers for filter
- Response: `[{ id, name }]`

**GET /api/accounting/account-types/**
- Get account types for filter
- Response: `[{ id, name }]`

**POST /api/accounting/reports/templates/**
- Save report configuration as template
- Request body: `{ name, description, report_type, parameters }`
- Response: `{ id, name, created_at }`

---

## Database Requirements

- **FinancialReport model**: all generation parameters stored
- **ReportTemplate model** (optional): save recurring report configurations
- **Constraints**: period dates valid, format in enum

---

## Current Implementation Status

- P&L generation form NOT implemented
- Balance Sheet generation form NOT implemented
- Cash Flow generation form NOT implemented
- Trial Balance generation form NOT implemented
- Filter UI NOT fully implemented
- Comparison period NOT implemented
- Preview functionality NOT implemented
- Budget comparison NOT implemented
- Advanced options NOT implemented
- Template saving NOT fully implemented
- Department/cost center filters NOT implemented
- Frontend generation form component partially implemented

---

## Validation & Edge Cases

- Period dates must be valid and not future
- Account balance calculations must use GL data
- Trial Balance requires all JE posted
- Cash Flow requires transaction classification
- Large reports may timeout (async generation)
- Preview should use cached data if available
- Sub-account logic (parent includes children)
- Zero-balance account handling
- Inactive account handling
- Currency conversion (if multi-currency)
- Consolidated view logic (if applicable)
- Budget availability check before allowing comparison
- Department/cost center hierarchy handling

---

## Testing Checklist

- [ ] Report type selector shows all options
- [ ] Selecting report type displays appropriate form
- [ ] Period date validation prevents invalid dates
- [ ] Period validation prevents future dates
- [ ] Comparison period section appears when checkbox enabled
- [ ] Department filter shows all departments
- [ ] Department filter select/deselect works
- [ ] Cost center filter shows all centers
- [ ] Account type filter works
- [ ] Include sub-accounts toggle works
- [ ] Budget comparison toggle appears (if budget available)
- [ ] Format selector shows all formats
- [ ] Summary/Detailed selector works
- [ ] Rounding selector works
- [ ] Advanced options expand/collapse
- [ ] Zero-balance toggle works
- [ ] Inactive accounts toggle works
- [ ] Currency selector works (if multi-currency)
- [ ] Consolidated toggle works (if applicable)
- [ ] Page break toggle works
- [ ] Generate preview button works
- [ ] Preview displays correctly
- [ ] Preview updates on parameter change
- [ ] Generate report button creates report
- [ ] Save as template button saves configuration
- [ ] Cancel button closes form
- [ ] Reset button clears inputs
- [ ] Form validation shows error messages
- [ ] Error messages clear when fixed
- [ ] Loading indicator shows during generation
- [ ] Success notification displays
- [ ] Responsive design works
- [ ] Form accessibility standards met

---

## Implementation Checklist

- [ ] Report generation form component
- [ ] Period selector component
- [ ] Filter panel component
- [ ] Report options component
- [ ] Advanced options component
- [ ] Preview component
- [ ] Department selector API endpoint
- [ ] Cost center selector API endpoint
- [ ] Account type selector API endpoint
- [ ] Report generation API endpoint
- [ ] Report preview API endpoint
- [ ] P&L generation service
- [ ] Balance Sheet generation service
- [ ] Cash Flow generation service
- [ ] Trial Balance generation service
- [ ] Account balance calculation service
- [ ] GL account query service
- [ ] JE query service (for trial balance)
- [ ] Report preview service
- [ ] Report template save endpoint
- [ ] Form validation service
- [ ] Parameter persistence
- [ ] Async generation handling
- [ ] Loading and error states
- [ ] Success notification component
- [ ] API client methods
- [ ] State management
- [ ] Responsive layout
- [ ] Accessibility support

---

## Deployment Strategy

- Deploy report generation API endpoints
- Deploy report type-specific generation services
- Deploy account balance calculation service
- Deploy frontend generation form component
- Deploy preview functionality
- Testing: Validate report accuracy, calculations, filtering
- Staff training: Show report generation, option selection, interpretation
- Rollback: Maintain report generation service

---

## Performance Targets

- Form load: <300ms
- Department/cost center API: <200ms
- Preview generation: <2s (small preview)
- Report generation (small): <2s
- Report generation (large): <10s
- Form submission: <1s (async background job)

---

## Monitoring & Alerting

- Track generation errors by report type
- Monitor generation time vs SLA
- Alert on failed generations
- Monitor resource usage (large reports)
- Track preview cache hits

---

## Documentation Requirements

- Report type selection guide
- Period configuration guide
- Filtering guide
- Format selection guide
- Preview interpretation guide
- Template creation guide
- Troubleshooting guide

---

## Future Enhancements

- Batch report generation
- Email delivery on completion
- Report scheduling from generation
- Watermarking (draft vs final)
- Multi-language support
- Advanced filtering (account hierarchies)
- Custom column selection
- Conditional formatting rules
- Report annotations
- Report versioning
