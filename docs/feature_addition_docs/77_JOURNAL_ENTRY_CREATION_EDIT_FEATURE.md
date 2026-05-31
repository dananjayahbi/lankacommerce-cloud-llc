# Journal Entry Creation and Edit Feature Specification

## Executive Summary
Journal Entry creation and modification interface enabling accounting teams to create, edit, and manage double-entry journal entries with account selection, amount validation, debit/credit balance verification, and comprehensive form controls for accurate general ledger maintenance.

## Current State Analysis

### EXISTING:
- Form validation framework
- User permission system
- Decimal number input support
- Date picker components

### MISSING (Complete absence):
- Journal entry creation form
- Journal entry edit form
- Journal entry line item management (add/remove debit/credit lines)
- Debit/credit amount input validation
- Account selector (dropdown/search)
- Balance verification (debits = credits)
- Journal entry number generation
- Entry date validation
- Entry description field
- Reference/document attachment field
- Memo field
- Journal entry draft saving
- Journal entry posting logic
- Form submission validation
- Real-time balance calculation
- Account availability checker (only active accounts)
- Automatic number assignment
- Posting date handling
- Reversal reason field (for reversals)
- Source assignment (manual/automatic)

## Frontend Features

### Journal entry creation form:

#### Entry header section:
- Entry number field (auto-populated, read-only)
- Entry date picker (required, defaults to today)
- Date validation (cannot be future date)

#### Description field (required, textarea):
- Max 500 characters
- Guidance text

#### Reference/Document number (optional):
- Link to source document (if automatic entry)
- Manual reference input

#### Memo field (optional, textarea):
- Internal notes
- Max 1000 characters

#### Source indicator (optional, read-only):
- Manual / Automatic (from bill/invoice/etc.)

#### Line items section (journal entry lines):
- Line items table (dynamically editable)
- Columns: Account, Debit Amount, Credit Amount
- Add more lines button (adds new row)
- Remove line button (per row)

##### Account selector (per line):
- Searchable dropdown
- Shows account code and name
- Only shows active accounts
- Real-time search
- Validation: must be valid account

##### Debit amount input (per line):
- Numeric (decimal, 2 places)
- Debits go in left column
- Can be zero (if credit used)
- Validation: must be non-negative

##### Credit amount input (per line):
- Numeric (decimal, 2 places)
- Credits go in right column
- Can be zero (if debit used)
- Validation: must be non-negative

##### Line item features:
- Cannot have both debit and credit on same line
- Line total (display-only): debit or credit amount
- Line account type indicator (Asset, Liability, etc.)

#### Balance verification section (below lines):
- Total debits display (auto-calculated)
- Total credits display (auto-calculated)
- Balance indicator:
  - Green checkmark if balanced (debits = credits)
  - Red X if unbalanced
  - Display difference amount
- Status message: "In balance" or "Out of balance by XXX"
- Prevents posting if unbalanced

#### Form actions:
- Save as draft button (saves unposted entry)
- Save & post button (saves and immediately posts)
- Save & continue button (saves and opens next form)
- Cancel button (discards unsaved changes)
- Delete button (if existing draft entry)

#### Validation messages:
- Real-time validation on blur
- Error messages below fields
- Debit/credit mismatch warning
- Empty line items warning
- Future date warning
- Prevent submission if validation errors

### Journal entry edit form:
- All creation fields present
- Entry number field (disabled, read-only)
- Entry date field (disabled after posting)
- Can only edit: description, memo, reference (if draft)
- Cannot edit: accounts, amounts (if draft)
- Cannot edit any fields if posted
- Can view posted entry details
- Change history link (shows what was edited)
- Posting option (if draft)
- Post button
- Cancel button

### Journal entry reversal form (alternative):
- Original entry display (reference, read-only)
- Reversal date picker:
  - Defaults to today
  - Cannot be before original entry date
  - Cannot be future date
- Reversal reason selector (optional):
  - Dropdown: Error correction, Policy change, Period adjustment, Other
  - If Other, text field for details
- Memo field for reversal note
- Create reversal button
- Cancel button
- Note: "Reversal creates a new entry with opposite amounts"

### Account selector component (reusable):
- Dropdown with search
- Account code and name display
- Account type indicator (Asset, Liability, etc.)
- Account balance display (optional, reference)
- Real-time filtering
- Keyboard navigation support
- Selection clears input and displays selected

### Balance verification widget:
- Live updates as amounts change
- Color coded (green balanced, red unbalanced)
- Shows exact difference
- Prevents posting if unbalanced
- Tooltip explanation

### Loading state:
- Skeleton loader for form
- Loading indicator on submit

### Error states:
- Invalid account error
- Debit/credit mismatch error
- Future date error
- Duplicate account in entry error
- API error messages

### Success state:
- Toast notification on save
- Toast notification on posting
- Redirect to entry list after successful creation

## Backend API Requirements

### POST /api/accounting/journal-entries/
Create new journal entry
- Request body: { entry_date, description, reference (nullable), memo (nullable), source (optional), lines: [{ account_id, debit_amount, credit_amount }] }
- Response: { id, entry_number, entry_date, description, status, lines: [...] }
- Validation: debits = credits, all amounts >= 0, accounts valid, date not future

### PATCH /api/accounting/journal-entries/{id}/
Update journal entry (draft only)
- Request body: { description, reference (nullable), memo (nullable) }
- Response: { id, entry_number, ...updated fields }
- Validation: can only update if status = draft

### POST /api/accounting/journal-entries/{id}/post/
Post journal entry
- Request body: { posted_date (optional, defaults to today) }
- Response: { id, entry_number, status, posted_at, posted_by }
- Validation: debits = credits, date not future, status must be draft

### POST /api/accounting/journal-entries/{id}/reverse/
Create reversal entry
- Request body: { reversal_date, reversal_reason (nullable) }
- Response: { id (of new reversal entry), entry_number, status, reversed_from_entry_id }
- Validation: original entry must be posted, dates valid

### GET /api/accounting/journal-entries/next-entry-number/
Get next entry number
- Response: { next_entry_number: "JE-2024-001234" }

### GET /api/accounting/chart-of-accounts/active/
Get list of active accounts for selector
- Response: [{ id, code, name, type }]

### POST /api/accounting/journal-entries/validate-balance/
Validate debit/credit balance
- Request body: { lines: [{ account_id, debit_amount, credit_amount }] }
- Response: { is_balanced: boolean, total_debits, total_credits, difference }

## Database Requirements

### JournalEntry model:
- id, entry_number, entry_date, description, status, reference (nullable), memo (nullable), source, posted_at (nullable), posted_by_id (nullable), created_at, created_by_id, updated_at, updated_by_id, is_deleted

### JournalEntryLine model:
- id, journal_entry_id, account_id, debit_amount, credit_amount

### Constraints:
- entry_number unique, debits = credits per entry, entry_date <= today
- Validation: At creation and posting

## Current Implementation Status
- Journal entry creation form NOT implemented
- Journal entry edit form NOT implemented
- Journal entry reversal form NOT implemented
- Line item management NOT implemented
- Balance verification NOT implemented
- Account selector NOT implemented
- Entry number generation NOT implemented
- Posting logic NOT implemented
- Reversal logic NOT implemented
- Backend validation NOT implemented
- Frontend form component NOT created
- Tests NOT written

## Validation & Edge Cases
- Entry number must be auto-generated and unique
- Entry date cannot be future
- Entry must have at least 2 lines (minimum debit and credit)
- Each line must have account and either debit or credit (not both, not neither)
- Total debits must exactly equal total credits
- Account must be active
- Duplicate accounts in same entry should be warned (but allowed)
- Cannot post entry if unbalanced
- Cannot edit entry after posting
- Cannot delete entry after posting
- Reversal creates new entry (doesn't modify original)
- All amounts must be non-negative
- Decimal precision: 2 decimal places
- Multi-tenant data isolation
- Audit trail for creation and modifications

## Testing Checklist
- [ ] Create form renders all fields
- [ ] Entry number auto-populated and read-only
- [ ] Entry date defaults to today
- [ ] Entry date validation prevents future dates
- [ ] Description field accepts text
- [ ] Reference field accepts input
- [ ] Memo field accepts text
- [ ] Add line button adds new row
- [ ] Remove line button removes row
- [ ] Account selector shows active accounts
- [ ] Account selector search works
- [ ] Debit amount input accepts decimals
- [ ] Credit amount input accepts decimals
- [ ] Cannot enter both debit and credit on same line
- [ ] Line total displays correctly
- [ ] Total debits calculates correctly
- [ ] Total credits calculates correctly
- [ ] Balance indicator shows green when balanced
- [ ] Balance indicator shows red when unbalanced
- [ ] Shows exact difference when unbalanced
- [ ] Cannot post if unbalanced
- [ ] Save as draft saves entry
- [ ] Save & post saves and posts entry
- [ ] Save & continue saves and opens next
- [ ] Cancel discards changes
- [ ] Edit form disables code/type fields (if applicable)
- [ ] Edit form shows previous values
- [ ] Posted entry shows read-only view
- [ ] Reversal form displays original entry
- [ ] Reversal date validation works
- [ ] Reversal reason selector works
- [ ] Reversal creates new entry with opposite amounts
- [ ] Form validation shows error messages
- [ ] Error messages clear when fixed
- [ ] Success notification displays on save
- [ ] Success notification displays on post
- [ ] Responsive design works
- [ ] Form accessibility standards met

## Implementation Checklist
- [ ] Journal entry creation serializer
- [ ] Journal entry update serializer
- [ ] Entry number generation service
- [ ] Balance validation service
- [ ] Account activation checker
- [ ] Journal entry creation view
- [ ] Journal entry update view
- [ ] Journal entry posting view
- [ ] Journal entry reversal view
- [ ] Balance validation endpoint
- [ ] Account selector API endpoint
- [ ] Journal entry number endpoint
- [ ] Frontend create form component
- [ ] Frontend edit form component
- [ ] Frontend reversal form component
- [ ] Account selector component
- [ ] Balance verification widget component
- [ ] Line items management component
- [ ] Debit/Credit input component
- [ ] Form validation component
- [ ] Error display component
- [ ] Success notification component
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Form submission handling
- [ ] Responsive layout
- [ ] Accessibility support

## Deployment Strategy
- Deploy journal entry serializers and validators
- Deploy journal entry views and API endpoints
- Deploy balance validation service
- Deploy entry number generation service
- Deploy frontend form components
- Testing: Validate form submission, balance verification, posting
- Staff training: Show entry creation, double-entry bookkeeping, posting
- Rollback: Maintain entry creation capability

## Performance Targets
- Form load: <300ms
- Account selector API: <200ms
- Entry number generation: <100ms
- Balance validation: <150ms
- Form submission: <1s
- Reversal creation: <1s

## Monitoring & Alerting
- Track form submission errors
- Monitor balance validation failures
- Alert on posting errors
- Track incomplete draft entries

## Documentation Requirements
- Entry creation guide
- Double-entry bookkeeping guide
- Account selection guide
- Balance verification guide
- Posting workflow guide
- Reversal procedures
- Common entry templates
- Troubleshooting guide

## Future Enhancements
- Entry templates for common transactions
- Multi-line template selection
- Entry batch import from CSV
- Automatic entry creation from bills/invoices
- Entry approval workflow
- Entry scheduling (post on future date)
- Entry recurring/recurrence setup
- Split entry across cost centers
- Multi-currency support
- Attachment upload (supporting documents)
