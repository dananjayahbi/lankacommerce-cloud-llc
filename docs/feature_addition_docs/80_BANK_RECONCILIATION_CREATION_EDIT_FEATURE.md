# Bank Reconciliation Creation & Edit Feature

## Executive Summary

Bank Reconciliation creation and editing interface enabling accounting teams to set up new reconciliations, manage outstanding checks and deposits, match transactions, and investigate variances for comprehensive bank account reconciliation with the general ledger.

## Current State Analysis

### EXISTING:
- Form validation framework
- User permission system
- Date picker components
- Modal dialogs for nested content

### MISSING (Complete absence):
- Reconciliation creation form
- Reconciliation edit form
- Outstanding checks/deposits management UI
- Bank statement input fields
- Book balance display and verification
- Variance calculation display
- Transaction matching interface
- Outstanding items tracking
- Variance investigation form
- Reconciliation confirmation logic
- Period selection with validation
- Bank account selector
- Statement upload feature (optional)
- Balance reconciliation workflow
- Form submission validation
- Real-time balance calculations
- Variance investigation section

## Frontend Features

### Reconciliation Creation Form

#### Bank Account Selector Section
- Bank account selector (required, dropdown)
  - Shows account name and code
  - Only shows bank accounts (GL type = bank)
  - Account balance display (current GL balance)

#### Reconciliation Period Section
- Period start date (required, date picker)
- Period end date (required, date picker)
- Validation: start <= end, end <= today
- Cannot overlap with existing reconciliation

#### Bank Statement Section (Required)
- Statement opening balance field (currency input)
  - As-of period start
  - Format: currency with 2 decimals
- Statement closing balance field (required, currency input)
  - As-of period end
  - Matches bank statement closing balance
- Statement reference/memo (optional)
  - Bank statement ID or reference number
  - For audit trail

#### Book Balance Section (Read-Only Display)
- Book opening balance (auto-calculated from GL)
  - Pulled from account balance at period start
  - Linked to journal entries
- Book closing balance (auto-calculated from GL)
  - Pulled from account balance at period end
  - Includes all posted transactions
- Recalculate button (refreshes from GL)
  - Updates balances from journal entries
  - Shows refresh timestamp

#### Variance Section (Auto-Calculated)
- Variance amount display
  - Statement Balance - Book Balance
  - Color-coded: Green if $0, Red if variance > 0
- Variance status
  - "In Balance" or "Out of Balance by $XXX"
- Variance reason selector (if variance > 0)
  - Outstanding checks
  - Outstanding deposits
  - Bank charges
  - Deposits in transit
  - Interest income
  - NSF checks
  - Other (with text field)

#### Outstanding Checks Section (Collapsible)
- Add check button (adds new row)
- Outstanding checks table (editable)
  - Columns: Check #, Check Date, Amount, Outstanding Since, Actions (Remove)
  - Check number input (alphanumeric)
  - Check date input (date picker)
  - Amount input (currency)
  - Outstanding since (auto-calculated or manual)
  - Remove button per row
  - Total checks amount (auto-calculated)
- Total outstanding checks display (prominent)

#### Outstanding Deposits Section (Collapsible)
- Add deposit button (adds new row)
- Outstanding deposits table (editable)
  - Columns: Deposit Date, Amount, Outstanding Since, Actions (Remove)
  - Deposit date input (date picker)
  - Amount input (currency)
  - Outstanding since (auto-calculated or manual)
  - Remove button per row
  - Total deposits amount (auto-calculated)
- Total outstanding deposits display (prominent)

#### Reconciled Balance Section (Auto-Calculated)
- Calculation: Book Closing Balance + Outstanding Deposits - Outstanding Checks
- Reconciled balance display (large)
- Should equal Statement Closing Balance if reconciled
- Status indicator: "Balances Match" or "Variance of $XXX"

#### Notes Section (Optional)
- Reconciliation notes (textarea)
  - Max 1000 characters
  - Internal notes for reviewers
  - Discrepancy investigation notes

#### Form Actions
- Save as draft button
- Mark as reconciled button (if balanced)
  - Only appears if variance = 0
  - Updates status to reconciled
- Save & continue button (saves and opens detail view)
- Cancel button (discards changes)

#### Validation Messages
- Real-time validation on blur
- Error messages for invalid inputs
- Prevent submission if validation errors
- Warn if variance exists

### Reconciliation Edit Form

- All creation fields present
- Bank account field (disabled, read-only)
- Period dates (disabled, read-only after saving)
- Can edit: outstanding items, notes, status
- Cannot edit: bank/period info after saving
- Can only edit if reconciliation is pending
- Re-reconcile button (if previously reconciled with variance)
- Cancel button

### Outstanding Checks Modal (Alternative)
- Quick add multiple checks
- Check details form
- Save and add another option
- List of existing checks with edit/delete

### Outstanding Deposits Modal (Alternative)
- Quick add multiple deposits
- Deposit details form
- Save and add another option
- List of existing deposits with edit/delete

### Variance Investigation Form (If Variance > 0)
- Variance summary display
- Variance reason selector (dropdown)
- Investigation details (textarea)
- Approval section
  - Can approve variance (if authorized)
  - Approval date and user
- Mark as under investigation button
- Resolve variance button (when resolved)

## Backend API Requirements

### POST /api/accounting/bank-reconciliations/
Create new reconciliation
- **Request body:** `{ bank_account_id, period_start, period_end, statement_opening_balance, statement_closing_balance, statement_reference (nullable), outstanding_checks: [{check_number, check_date, amount}], outstanding_deposits: [{deposit_date, amount}], notes (nullable) }`
- **Response:** `{ id, account_id, period, status, book_balance, statement_balance, variance, outstanding_checks: [...], outstanding_deposits: [...] }`
- **Validation:** account valid, period valid, balances numeric, no overlapping reconciliation

### PATCH /api/accounting/bank-reconciliations/{id}/
Update reconciliation (pending only)
- **Request body:** `{ outstanding_checks: [...], outstanding_deposits: [...], notes (nullable), status (optional) }`

### GET /api/accounting/bank-accounts/
Get bank accounts for selector
- **Response:** `[{ id, account_code, account_name, current_balance }]`

### GET /api/accounting/bank-reconciliations/{id}/book-balance-as-of/
Get book balance for date
- **Query params:** as_of_date
- **Response:** `{ opening_balance, closing_balance }`

### POST /api/accounting/bank-reconciliations/{id}/calculate-variance/
Recalculate variance
- **Response:** `{ variance, reconciled_balance, status }`

### POST /api/accounting/bank-reconciliations/{id}/mark-reconciled/
Mark as reconciled (if balanced)
- **Response:** `{ id, status, reconciled_at }`

## Database Requirements

### BankReconciliation Model
All fields from list specification

### OutstandingCheck Model
- id
- reconciliation_id
- check_number
- check_date
- amount
- outstanding_since
- marked_cleared_at

### OutstandingDeposit Model
- id
- reconciliation_id
- deposit_date
- amount
- outstanding_since
- marked_cleared_at

### Constraints
- Period dates valid
- Amounts non-negative

## Current Implementation Status

- Reconciliation creation form NOT implemented
- Reconciliation edit form NOT implemented
- Outstanding items management NOT implemented
- Balance calculation display NOT implemented
- Variance calculation NOT implemented
- Form validation NOT implemented
- Backend API endpoints NOT implemented
- Outstanding checks/deposits models NOT created

## Validation & Edge Cases

- Bank account must exist and be active
- Period dates must be valid (start <= end, end <= today)
- Cannot create overlapping reconciliations for same account
- Statement balance required
- Book balance calculated from GL (read-only)
- Variance calculated automatically
- Cannot mark reconciled if variance exists (unless approved)
- Outstanding items affect reconciled balance
- Decimal precision: 2 decimal places
- Multi-tenant data isolation
- Concurrent reconciliation prevention per account

## Testing Checklist

- [ ] Form renders all fields
- [ ] Bank account selector shows only bank accounts
- [ ] Account balance displays correctly
- [ ] Period date validation prevents future dates
- [ ] Period date validation prevents overlapping
- [ ] Statement opening balance accepts currency input
- [ ] Statement closing balance accepts currency input
- [ ] Book opening balance displays (read-only)
- [ ] Book closing balance displays (read-only)
- [ ] Variance calculates correctly
- [ ] Variance color codes correctly (green/red)
- [ ] Add check button adds row
- [ ] Remove check button removes row
- [ ] Check number input accepts alphanumeric
- [ ] Check date input accepts dates
- [ ] Amount input accepts currency
- [ ] Total checks calculates correctly
- [ ] Add deposit button adds row
- [ ] Remove deposit button removes row
- [ ] Deposit date input accepts dates
- [ ] Amount input accepts currency
- [ ] Total deposits calculates correctly
- [ ] Reconciled balance calculates correctly
- [ ] Reconciled balance matches statement if balanced
- [ ] Notes field accepts text
- [ ] Save as draft saves form
- [ ] Mark as reconciled button works (if balanced)
- [ ] Save & continue saves and opens detail
- [ ] Cancel discards changes
- [ ] Form validation shows error messages
- [ ] Error messages clear when fixed
- [ ] Responsive design works
- [ ] Form accessibility standards met

## Implementation Checklist

- [ ] Reconciliation creation serializer
- [ ] Reconciliation update serializer
- [ ] Outstanding checks/deposits serializers
- [ ] Reconciliation creation view
- [ ] Reconciliation update view
- [ ] Book balance calculation service
- [ ] Variance calculation service
- [ ] Reconciliation validation service
- [ ] Period overlap checker
- [ ] Bank account selector API
- [ ] Book balance API endpoint
- [ ] Variance calculation endpoint
- [ ] Frontend create form component
- [ ] Frontend edit form component
- [ ] Outstanding checks component
- [ ] Outstanding deposits component
- [ ] Variance investigation component
- [ ] Balance verification component
- [ ] Form validation component
- [ ] Error display component
- [ ] Success notification component
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Responsive layout
- [ ] Accessibility support

## Deployment Strategy

- Deploy reconciliation serializers and validators
- Deploy reconciliation views and API endpoints
- Deploy balance calculation service
- Deploy frontend form components
- Testing: Validate form submission, balance calculations, variance detection
- Staff training: Show reconciliation creation, outstanding items entry, variance investigation
- Rollback: Maintain reconciliation capability

## Performance Targets

- Form load: <300ms
- Book balance API: <200ms
- Variance calculation: <150ms
- Form submission: <1s

## Monitoring & Alerting

- Track form submission errors
- Monitor variance detection accuracy
- Alert on balance mismatch issues
- Track incomplete reconciliations

## Documentation Requirements

- Reconciliation creation guide
- Outstanding items entry guide
- Variance investigation guide
- Balance verification guide
- Troubleshooting guide

## Future Enhancements

- Bank statement file upload (CSV, OFX)
- Automatic transaction matching
- Bank fee configuration
- Interest income entry
- Recurring reconciliation setup
- Batch reconciliation entry
- Multi-account reconciliation
- Reconciliation templates
