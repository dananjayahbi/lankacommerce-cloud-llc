# Account Detail & Ledger Feature

## Executive Summary

Account detail view and ledger displaying complete account information, transaction history, balance calculations, and account-specific operations for accounting review, reconciliation, and reporting purposes.

## Current State Analysis

### EXISTING
- Transaction logging framework (audit logs)
- Database transaction support
- Reporting infrastructure

### MISSING (Complete absence)
- Account detail view implementation
- Account ledger display
- Account balance calculation queries
- Account transaction filtering and pagination
- Account reconciliation data
- Account balance verification
- Period-wise balance display
- Account aging analysis
- Account transaction detail view
- Account balance trend analysis
- Account reconciliation flag tracking
- Ledger export functionality
- Account opening/closing balance display
- Account period-end procedures
- Account transaction drill-down
- API endpoints for account details
- API endpoints for account ledger
- API endpoints for account balances

## Frontend Features

### Account header section
- Account code (large display)
- Account name
- Account type badge (Asset, Liability, etc.)
- Account status indicator (Active, Inactive, Archived)
- Account nature indicator (Debit-normal, Credit-normal)
- Edit button
- Archive/Activate button
- Delete button (if allowed)
- More options menu

### Account summary panel
- Current balance (large prominent display)
- Debit/Credit indicator
- Opening balance display
- Period selector (to view balance for specific period)
- Balance as-of date
- Previous period balance (for comparison)
- Balance change (current vs previous period)
- Reconciliation status (Reconciled/Unreconciled)
- Last reconciliation date
- Reconcile button

### Account information section (read-only)
- Account code
- Account name
- Account type
- Account category
- Parent account (if applicable, with link)
- Opening balance
- Opening balance date
- Status
- Description/Notes
- Tax category (if applicable)
- Created date
- Created by (user)
- Last modified date
- Last modified by (user)

### Account transactions ledger
- **Ledger table** (Journal Entry, Date, Description, Debit Amount, Credit Amount, Balance)
  - Row per journal entry line (where account is debit or credit)
  - Date (sortable)
  - Description/Document reference
  - Debit amount (if debit account)
  - Credit amount (if credit account)
  - Running balance (cumulative after each transaction)
  - Transaction status (posted, reversed)
  - Click row to view full journal entry

- **Period filter**
  - From date
  - To date
  - Preset options (This Month, Last Month, This Year, Last Year)

- **Sort options**
  - By date (ascending/descending)
  - By amount
  - By balance

- **Pagination or infinite scroll**

- **Transaction summary**
  - Transactions count
  - Total debit amount (period)
  - Total credit amount (period)
  - Opening balance (period start)
  - Closing balance (period end)
  - Balance reconciliation check (opening + debits - credits = closing)

### Account aging analysis (for AR/AP accounts)
- Aging table (Current, 0-30 days, 30-60 days, 60-90 days, 90+ days)
- Amount in each aging bucket
- Percentage breakdown
- Bar chart visualization

### Account balance history chart
- Line chart of balance over time (last 12 months)
- Toggle to show in charts library
- Period selector
- Tooltip showing balance on date

### Sub-accounts section (if parent account)
- Table of child accounts
- Code, Name, Type, Balance
- Click to view child account detail
- Expand/collapse in tree view

### Parent account breadcrumb (if sub-account)
- Link to parent account
- Full hierarchy path

### Account reconciliation section
- Reconciliation status
- Last reconciliation date
- Reconciled by (user)
- Reconciliation notes
- Reconcile button (opens reconciliation modal)
- View reconciliation history link

### Action buttons (account-level operations)
- Reconcile button (opens reconciliation modal)
- Export ledger button (PDF, CSV, Excel)
- Print ledger button
- View journal entries button (filtered to this account)
- Create journal entry button (pre-populated with this account)
- Archive account button (if allowed)
- Edit account button (opens edit form)
- Duplicate account button (creates copy)
- View change history button (account modification history)
- Download ledger PDF button

### Tab Navigation
- Ledger tab (default) - transaction history
- Balance History tab - balance trend chart
- Sub-accounts tab (if applicable) - child accounts list
- Reconciliation tab - reconciliation details
- Aging tab (if applicable) - aging analysis
- Change History tab - account modifications

### States
- Loading state (skeleton loader)
- Error state (error message)
- Empty state (no transactions)

## Backend API Requirements

### Account Detail Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/** - Retrieve account details
  - Response: { id, code, name, type, category, parent_account_id, opening_balance, current_balance, status, description, created_at, updated_at, created_by, updated_by }

### Account Ledger Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/ledger/** - Get account ledger (transactions)
  - Query params: from_date, to_date, page, page_size, ordering (date/amount/balance)
  - Response: { count, next, previous, results: [{ id, journal_entry_id, date, description, debit_amount, credit_amount, balance, status }], opening_balance, closing_balance, total_debits, total_credits }

### Balance as-of Date Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/balance-as-of/** - Get balance for specific date
  - Query params: as_of_date
  - Response: { account_id, balance, debit_total, credit_total }

### Balance History Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/balance-history/** - Get balance history for chart
  - Query params: from_date, to_date, period (daily/weekly/monthly)
  - Response: [{ date, balance }]

### Sub-accounts Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/sub-accounts/** - Get child accounts (if parent)
  - Response: [{ id, code, name, balance }]

### Parent Account Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/parent-account/** - Get parent account
  - Response: { id, code, name }

### Aging Analysis Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/aging/** - Get aging analysis (for AR/AP)
  - Query params: as_of_date
  - Response: { current: amount, aged_30: amount, aged_60: amount, aged_90: amount, aged_90_plus: amount }

### Reconciliation Status Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/reconciliation-status/** - Get reconciliation info
  - Response: { is_reconciled, last_reconciliation_date, reconciled_by, reconciliation_notes }

### Reconciliation Endpoint
- **POST /api/accounting/chart-of-accounts/{id}/reconcile/** - Mark account as reconciled
  - Request body: { reconciliation_date, notes (optional) }

### Change History Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/change-history/** - Get account modification history
  - Response: [{ changed_at, changed_by, old_values, new_values }]

### Export Ledger Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/export-ledger/** - Export ledger
  - Query params: format (pdf/csv/excel), from_date, to_date
  - Response: file download

## Database Requirements

### ChartOfAccount Model
- All details as defined in previous features

### JournalEntryLine Model
- id
- journal_entry_id
- account_id
- debit_amount
- credit_amount
- created_at

### AccountBalance Model
- id
- account_id
- period_date
- opening_balance
- closing_balance
- total_debits
- total_credits

### AccountReconciliation Model
- id
- account_id
- reconciliation_date
- reconciled_by_id
- notes
- created_at

### Query Requirements
- Efficient balance calculation
- Ledger filtering
- Period-wise balances

### Indexes
- (account_id, date)
- (account_id, posted_date)
- (account_id, period_date)

## Current Implementation Status

- [ ] Account detail page NOT implemented
- [ ] Account ledger view NOT implemented
- [ ] Balance calculations NOT implemented
- [ ] Ledger filtering NOT implemented
- [ ] Sub-accounts view NOT implemented
- [ ] Balance history chart NOT implemented
- [ ] Reconciliation interface NOT implemented
- [ ] Aging analysis NOT implemented
- [ ] Change history display NOT implemented
- [ ] API endpoints NOT implemented
- [ ] Export functionality NOT implemented

## Validation & Edge Cases

- Account must exist
- Account may be archived (still viewable)
- Balance calculations must use posted transactions only
- Period-end balances must be accurate
- Opening balance plus transactions must equal closing balance
- Reconciliation requires user permission
- Reconciliation date cannot be in future
- Cannot reconcile archived account
- Sub-accounts display only if parent account
- Balance history requires historical journal entries
- Aging analysis only for AR/AP accounts
- Multi-tenant data isolation
- Performance optimization for large ledgers (1000+ transactions)
- Decimal precision in balance calculations

## Testing Checklist

- [ ] Account header displays correctly
- [ ] Account code and name display
- [ ] Account status indicator displays
- [ ] Account type badge displays
- [ ] Current balance displays
- [ ] Opening balance displays
- [ ] Debit/Credit indicator correct
- [ ] Ledger table renders
- [ ] Ledger shows all transactions
- [ ] Ledger pagination works
- [ ] Ledger filters by date range
- [ ] Ledger sorts by date
- [ ] Ledger sorts by amount
- [ ] Ledger shows running balance
- [ ] Balance calculation correct (opening + debits - credits = closing)
- [ ] Period filter works
- [ ] Preset date filters work (This Month, etc.)
- [ ] Total debits and credits display correctly
- [ ] Opening/closing balances correct
- [ ] Sub-accounts display (if parent)
- [ ] Sub-accounts link to child details
- [ ] Parent account breadcrumb displays (if sub-account)
- [ ] Parent account link works
- [ ] Balance history chart renders
- [ ] Balance history shows correct data
- [ ] Aging analysis displays (if AR/AP)
- [ ] Aging table shows correct bucketing
- [ ] Aging chart visualizes data
- [ ] Reconciliation status displays
- [ ] Reconcile button opens modal
- [ ] Reconcile function marks account as reconciled
- [ ] Last reconciliation date displays
- [ ] Change history displays modifications
- [ ] Change history shows user and date
- [ ] Export ledger button works
- [ ] Export generates PDF correctly
- [ ] Export generates CSV correctly
- [ ] Print button prints correctly
- [ ] Edit button opens edit form
- [ ] Archive button archives account (if allowed)
- [ ] Delete button blocked if transactions exist
- [ ] Tabs switch views correctly
- [ ] Responsive design works
- [ ] Large ledgers (1000+ rows) load efficiently
- [ ] Loading state displays
- [ ] Error state displays
- [ ] Empty state displays (no transactions)

## Implementation Checklist

### Backend
- [ ] Account detail view component
- [ ] Balance calculation service
- [ ] Ledger filtering logic
- [ ] Period selection logic
- [ ] Aging calculation logic
- [ ] Reconciliation service
- [ ] All API endpoints as specified
- [ ] Query optimization for performance

### Frontend
- [ ] Account detail view component
- [ ] Account header component
- [ ] Account summary panel component
- [ ] Account information panel component
- [ ] Ledger table component
- [ ] Ledger filter component
- [ ] Ledger pagination component
- [ ] Sub-accounts component
- [ ] Parent account breadcrumb component
- [ ] Balance history chart component
- [ ] Aging analysis component
- [ ] Reconciliation component
- [ ] Change history component
- [ ] Action buttons group
- [ ] Tab navigation component
- [ ] API client methods (all endpoints)
- [ ] State management (account data, ledger data)
- [ ] Export service (PDF, CSV, Excel)
- [ ] Print service
- [ ] Loading and error states
- [ ] Permission checks
- [ ] Responsive layout
- [ ] Accessibility support
- [ ] Performance optimization

## Deployment Strategy

- Deploy account detail API endpoints
- Deploy balance calculation logic
- Deploy ledger filtering and pagination
- Deploy sub-accounts query
- Deploy frontend account detail component
- Testing: Verify balance calculations, ledger accuracy, reconciliation status
- Staff training: Show ledger review, balance verification, reconciliation process
- Rollback: Maintain account queries and ledger data

## Performance Targets

- Account detail load: <500ms
- Ledger API (100 transactions): <400ms
- Ledger API (1000 transactions): <1s
- Balance calculation: <200ms
- Chart rendering: <300ms
- Export PDF: <3s

## Monitoring & Alerting

- Track account detail page performance
- Monitor balance calculation accuracy
- Alert on reconciliation discrepancies
- Monitor ledger query performance
- Alert on failed exports

## Documentation Requirements

- Account detail view guide
- Ledger interpretation guide
- Balance reconciliation guide
- Aging analysis guide
- Reconciliation process
- Account verification procedures
- Troubleshooting guide

## Future Enhancements

- Account drill-down to journal entries
- Account comparison (multiple accounts)
- Account consolidation (for groups)
- Account forecast vs actual
- Account variance analysis
- Account intercompany transactions
- Account cost tracking
- Account dimension analysis
- Advanced reconciliation workflow
- Account automated matching
