# Account Creation & Edit Feature

## Executive Summary

Account creation and modification interface enabling accounting teams to define new general ledger accounts with complete details, hierarchical relationships, opening balances, and proper account classification within the chart of accounts structure.

## Current State Analysis

### EXISTING
- User permission system
- Tenant isolation infrastructure
- Form validation framework

### MISSING (Complete absence)
- Account creation workflow
- Account edit workflow
- Account form component (frontend)
- Account code validation
- Account type selection logic
- Account category selection logic
- Parent account selection logic
- Opening balance entry
- Account description/notes field
- Account activation/deactivation toggle
- Account creation serializer and validator
- Account update logic
- Account creation permissions
- Account edit permissions
- Account field constraints validation
- Duplicate account code detection
- Account type transition rules
- Parent-child account validation
- Account creation audit trail
- Account modification history
- Draft account saving
- Account template selection (optional)

## Frontend Features

### Account creation form
- **Account code field** (required, unique, alphanumeric + hyphens)
  - Code pattern guidance text
  - Real-time uniqueness validation (with API check)
  - Maximum length indicator

- **Account name field** (required, text, 2-255 characters)

- **Account type selector** (required, dropdown)
  - Asset (debit-normal)
  - Liability (credit-normal)
  - Equity (credit-normal)
  - Income (credit-normal)
  - Expense (debit-normal)
  - Type-specific guidance text

- **Account category dropdown** (required)
  - Current Assets
  - Fixed Assets
  - Current Liabilities
  - Long-term Liabilities
  - Share Capital
  - Reserves & Surplus
  - Sales/Revenue
  - Cost of Goods Sold
  - Operating Expenses
  - Other Income/Expenses
  - Dynamic categories per type

- **Parent account selector** (optional)
  - Searchable dropdown
  - Shows account code and name
  - Only shows active accounts of compatible type
  - "No parent" option for top-level accounts
  - Validation: parent type must match hierarchy rules

- **Opening balance field** (required for new accounts, optional for editing)
  - Numeric input (decimal places: 2)
  - Debit/Credit toggle (based on account nature)
  - Opening balance as-of date
  - Validation: must be non-negative

- **Description/Notes field** (optional, textarea)
  - Max 500 characters
  - Markdown support (optional)

- **Status selector** (optional, default "Active")
  - Radio buttons: Active, Inactive

- **Tax category selector** (optional, dropdown)
  - None
  - Taxable
  - Tax-Exempt
  - Tax-Deductible

- **Form validation**
  - Real-time validation on blur
  - All required fields marked with asterisk
  - Error messages below fields
  - Prevent submission if validation errors

- **Action buttons**
  - Save button (creates account)
  - Save & Continue button (creates and opens next)
  - Save as Draft button (for incomplete entries)
  - Cancel button
  - Reset button (clear form)

- **Help/guidance section**
  - Account type explanation
  - Code naming conventions
  - Category selection tips
  - Common mistakes warning

### Account edit form
- All creation fields present
- Account code field (disabled, read-only)
- Account type field (disabled, prevents type changes)
- Cannot change parent account (if account has transactions)
- Cannot change account nature
- Change history link
- Previous value display (on edit)
- Comparison view (before/after if desired)
- Can only edit: name, category, parent (if no transactions), description, status, tax category
- Opening balance (read-only if transactions exist)
- Save button
- Cancel button
- Delete account button (with safeguards)

### Account creation modal (alternative to full page)
- Modal dialog
- Same fields as page form
- Compact layout
- Save & Close button
- Cancel button

### Account type selection wizard (optional)
- Step 1: Choose account type
- Step 2: Choose category
- Step 3: Set basic info (code, name)
- Step 4: Set opening balance
- Step 5: Review & Create
- Progress indicator
- Next/Previous/Create buttons

### Duplicate code warning
- Real-time API validation
- Toast/notification if code already exists
- Suggestion to use similar code pattern
- "View existing account" link

### Account type guidance
- Asset: Items of value owned by business
- Liability: Amounts owed by business
- Equity: Owner's stake in business
- Income: Money earned from operations
- Expense: Costs incurred in operations
- Examples per type

### Category guidance
- Visual tree of category structure
- Recommended categories per type
- Subcategory selection

## Backend API Requirements

### Account Creation Endpoint
- **POST /api/accounting/chart-of-accounts/** - Create new account
  - Request body: { code, name, type, category, parent_account_id (nullable), opening_balance, status (optional), description (optional), tax_category (optional) }
  - Response: { id, code, name, type, category, parent_account_id, opening_balance, status, created_at }
  - Validation: code unique, code format, name required, type in enum, category valid, parent_account valid

### Account Update Endpoint
- **PATCH /api/accounting/chart-of-accounts/{id}/** - Update account
  - Request body: { name, category, parent_account_id (if no transactions), description (optional), status, tax_category (optional) }
  - Response: { id, code, name, type, category, parent_account_id, opening_balance, status, updated_at }
  - Validation: code cannot change, type cannot change, code must remain unique

### Account Retrieve Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/** - Retrieve account for editing

### Code Validation Endpoint
- **POST /api/accounting/chart-of-accounts/validate-code/** - Check code uniqueness
  - Request body: { code }
  - Response: { is_unique: boolean, suggestion (if not unique) }

### Account Types Endpoint
- **GET /api/accounting/account-types/** - Get valid account types with descriptions

### Account Categories Endpoint
- **GET /api/accounting/account-categories/** - Get valid categories per type
  - Query params: type (optional)
  - Response: [{ id, name, description, parent_category, valid_types }]

### Parent Account Options Endpoint
- **GET /api/accounting/chart-of-accounts/parent-options/** - Get valid parent accounts
  - Query params: type (filter by account type)
  - Response: [{ id, code, name }]

### Change History Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/change-history/** - Get account modification history
  - Response: [{ changed_at, changed_by, old_values, new_values }]

## Database Requirements

### ChartOfAccount Model
- code
- name
- type
- category
- parent_account_id
- opening_balance
- status
- description
- tax_category
- created_by_id
- updated_by_id
- created_at
- updated_at

### AccountChangeHistory Model
- id
- account_id
- changed_by_id
- field_name
- old_value
- new_value
- changed_at

### Validation Rules
- code unique per tenant
- code format validation
- parent account type validation

### Constraints
- type and category must be in valid enum

## Current Implementation Status

- [ ] Account creation form NOT implemented
- [ ] Account edit form NOT implemented
- [ ] Account creation API NOT implemented
- [ ] Account update API NOT implemented
- [ ] Account code validation NOT implemented
- [ ] Duplicate detection NOT implemented
- [ ] Change history tracking NOT implemented
- [ ] Account type/category lists NOT created
- [ ] Form validation service NOT implemented

## Validation & Edge Cases

- Account code must follow format rules (e.g., no spaces, no special chars except hyphen)
- Account code must be unique per tenant
- Account name required and not empty
- Account type cannot be changed after creation
- Account code cannot be changed after creation
- Parent account must be active and exist
- Parent account type must be compatible with child type
- Cannot set account as its own parent
- Opening balance must be non-negative
- Cannot change opening balance if transactions exist
- Cannot change parent account if transactions exist
- Cannot create sub-accounts under archived account
- Account nature (debit/credit) determined by type (immutable)
- Description length limited to prevent database bloat
- Proper error messaging for validation failures

## Testing Checklist

- [ ] Create form renders all fields
- [ ] Account code field validates format
- [ ] Account code uniqueness validated via API
- [ ] Duplicate code warning shows
- [ ] Account name field accepts text
- [ ] Account type selector shows all types
- [ ] Account category dropdown populates per type
- [ ] Parent account selector shows valid accounts
- [ ] Parent account selector filters by type
- [ ] Opening balance accepts decimal input
- [ ] Debit/Credit toggle works
- [ ] Status selector works
- [ ] Tax category selector works
- [ ] All required fields marked
- [ ] Form validation prevents submission if empty
- [ ] Form validation prevents submission if invalid code format
- [ ] Form validation shows error messages
- [ ] Save button creates account
- [ ] Save & Continue creates and opens next form
- [ ] Save as Draft saves incomplete entry
- [ ] Cancel button cancels without saving
- [ ] Reset button clears form
- [ ] Edit form disables code field
- [ ] Edit form disables type field
- [ ] Edit form shows only editable fields
- [ ] Edit form prevents parent change if transactions exist
- [ ] Edit form shows previous values
- [ ] Change history displays modifications
- [ ] Modal create form works
- [ ] Modal create form saves and closes
- [ ] Wizard flow works (if implemented)
- [ ] Real-time validation works
- [ ] Error messages clear when fixed
- [ ] Responsive design works
- [ ] Form accessibility standards met

## Implementation Checklist

### Backend
- [ ] Account creation serializer
- [ ] Account update serializer
- [ ] Account code validator
- [ ] Code uniqueness validator
- [ ] Account type/category enums
- [ ] Account creation view
- [ ] Account update view
- [ ] Account validation service
- [ ] Code validation API endpoint
- [ ] Category population logic
- [ ] Parent account filtering logic
- [ ] Change history service
- [ ] Account creation permissions

### Frontend
- [ ] Frontend create form component
- [ ] Frontend edit form component
- [ ] Account type selector component
- [ ] Category selector component
- [ ] Parent account selector component
- [ ] Opening balance input component
- [ ] Form validation component
- [ ] Error display component
- [ ] Success notification component
- [ ] Duplicate code warning component
- [ ] Type guidance component
- [ ] Category guidance component
- [ ] Modal create component (optional)
- [ ] Wizard form component (optional)
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Responsive layout
- [ ] Accessibility support

## Deployment Strategy

- Deploy account serializers and validators
- Deploy account views and API endpoints
- Deploy account validation service
- Deploy frontend form components
- Testing: Validate form submission, account creation, validation rules
- Staff training: Show account creation workflow, naming conventions, type/category selection
- Rollback: Maintain account creation capability

## Performance Targets

- Form load: <300ms
- Code validation API: <200ms
- Account creation: <500ms
- Form submission: <1s

## Monitoring & Alerting

- Track account creation rate
- Monitor validation error rates
- Alert on code format violations
- Track incomplete draft accounts

## Documentation Requirements

- Account creation guide
- Account code naming conventions
- Account type selection guide
- Account category guide
- Common account setups (templates)
- Troubleshooting guide

## Future Enhancements

- Account templates (pre-defined sets)
- Account bulk import
- Account copy/duplicate
- Account numbering automation
- Account merge functionality
- Account type conversion (with restrictions)
- Account hierarchy templates
- Conditional field requirements per type
- Multi-language account names
- Account approval workflow
