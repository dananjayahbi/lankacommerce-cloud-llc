# Journal Entries List Page Feature Specification

## Executive Summary
Journal Entries management interface enabling accounting teams to view, create, manage, post, and audit all general journal entries with comprehensive filtering, searching, status tracking, and batch operations for maintaining the general ledger.

## Current State Analysis

### EXISTING:
- Django REST Framework API infrastructure
- Multi-tenant database with PostgreSQL
- User authentication and permissions
- Audit logging framework (AuditLog model)
- Transaction support for database operations

### MISSING (Complete absence - new accounting module):
- JournalEntry database model
- JournalEntryLine model (debit/credit lines per entry)
- Journal entry numbering system
- Journal entry status tracking (draft, posted, reversed)
- Double-entry bookkeeping validation (debits = credits)
- Journal entry posting logic
- Journal entry reversal capability
- Journal entry audit trail
- Entry date validation rules
- Account validation for entries
- Amount validation (positive, decimal precision)
- Journal entry filtering and search
- Journal entry list view (backend)
- Journal entry creation form (backend)
- Journal entry posting workflow
- Journal entry deletion rules (only draft allowed)
- Journal entry source tracking (manual, automatic - e.g., from bills, invoices)
- Journal entry approval workflow (optional)
- Journal entry reference/document attachment
- Journal entry memo/notes field
- API endpoints for journal management
- Serializers for journal data
- Views for journal CRUD operations
- Posting service
- Reversal service
- Trial balance calculation
- Permissions for accounting module
- Tests for journal functionality
- Frontend components not created

## Frontend Features

### Journal entries data table:
- Columns: Entry #, Date, Description, Amount (auto-calculated from lines), Status, Posted Date, Actions
- Sortable columns (click to sort)
- Row selection checkboxes (for bulk operations)
- Click row to view entry details
- Status badge indicator (draft, posted, reversed)
- Posted date and posted by user
- Entry number (unique per tenant)
- Transaction amount (sum of debit lines or credit lines)
- View details button
- Edit button (if draft)

### Search functionality:
- Search by entry number
- Search by description
- Search by reference (document number)
- Debounced real-time search
- Search highlighting

### Filter section (collapsible):
- Status filter (draft, posted, reversed) - checkboxes
- Date range filter (from/to date picker)
- Source filter (manual, automatic from bills/invoices)
- Posted by filter (user selector)
- Amount range filter (min/max)
- Clear all filters button
- Filter count badge

### Sort options:
- Sort by: Entry #, Date, Amount, Status, Posted Date
- Sort direction: Ascending/Descending
- Default sort: By date descending (most recent first)

### Pagination controls:
- Page size selector (10, 25, 50, 100 entries per page)
- Previous/Next buttons
- Page number input
- Total records count display

### Bulk action toolbar (appears when rows selected):
- Bulk post entries button (post selected draft entries)
- Bulk reverse entries button (only for posted)
- Bulk delete entries button (only for draft)
- Bulk export button

### Quick action buttons (per row):
- View entry button (opens detail view)
- Edit entry button (opens edit form, if draft)
- Post entry button (if draft) - single action
- Reverse entry button (if posted)
- Delete entry button (if draft)
- Duplicate entry button (creates copy)

### Journal statistics section (above table):
- Total entries (period)
- Total posted entries
- Total draft entries
- Total reversed entries
- Total entry amount (sum of all debits)

### Period selector (prominent):
- Date range picker (from/to)
- Preset options (This Month, Last Month, This Quarter, This Year, Last Year)
- Previous/Next period buttons
- Month/year selector dropdown

### Trial Balance quick link (button):
- Opens trial balance view filtered to selected period
- Shows total debits and total credits for verification

### Additional controls:
- Create new entry button (prominent)
- Column visibility toggle (customize display columns)
- Refresh button (reload journal data)
- Export entries list button (CSV, Excel, PDF with summaries)
- Generate trial balance button (exports TB as PDF/Excel)

### State displays:
- Loading state (skeleton loader)
- Empty state (when no entries, with "Create Entry" prompt)
- Error state (error message if API fails)

## Backend API Requirements

### GET /api/accounting/journal-entries/
List journal entries with filters, search, sorting, pagination
- Query params: search, status (draft/posted/reversed), date_from, date_to, source, posted_by_id, amount_min, amount_max, page, page_size, ordering
- Response: { count, next, previous, results: [{ id, entry_number, date, description, amount (auto-calculated), status, posted_at, posted_by, source, reference (nullable) }] }

### GET /api/accounting/journal-entries/{id}/
Retrieve single journal entry details

### POST /api/accounting/journal-entries/
Create new journal entry

### PATCH /api/accounting/journal-entries/{id}/
Update journal entry (draft only)

### DELETE /api/accounting/journal-entries/{id}/
Delete journal entry (draft only)

### POST /api/accounting/journal-entries/{id}/post/
Post journal entry (transition from draft to posted)
- Request body: { posted_date (optional, defaults to today) }

### POST /api/accounting/journal-entries/{id}/reverse/
Reverse journal entry (create reversal entry)
- Request body: { reversal_date (optional, defaults to today), reversal_reason (optional) }

### POST /api/accounting/journal-entries/bulk-post/
Bulk post multiple entries
- Request body: { entry_ids: [...], posted_date (optional) }

### POST /api/accounting/journal-entries/bulk-reverse/
Bulk reverse multiple entries
- Request body: { entry_ids: [...], reversal_date (optional) }

### DELETE /api/accounting/journal-entries/bulk-delete/
Bulk delete draft entries
- Request body: { entry_ids: [...] }

### GET /api/accounting/journal-entries/statistics/
Get journal statistics
- Response: { total_entries, posted_count, draft_count, reversed_count, total_amount }

### POST /api/accounting/journal-entries/duplicate/
Duplicate existing entry
- Request body: { entry_id }

### GET /api/accounting/trial-balance/
Generate trial balance
- Query params: as_of_date
- Response: [{ account_id, account_code, account_name, debit_balance, credit_balance }]

## Database Requirements

### JournalEntry model:
- id, tenant_id, entry_number (unique per tenant), date, description, status (draft/posted/reversed), posted_at (nullable), posted_by_id (nullable), source (manual/automatic), reference (nullable), created_at, created_by_id, updated_at, updated_by_id, is_deleted (soft delete)

### JournalEntryLine model:
- id, journal_entry_id, account_id, debit_amount, credit_amount, created_at

### TrialBalance model (cached):
- id, tenant_id, as_of_date, account_id, debit_total, credit_total, calculated_at

### Indexes:
- (tenant_id, entry_number), (tenant_id, date DESC), (tenant_id, status), (entry_id, account_id), (posted_at)

### Constraints:
- entry_number unique per tenant, entry_date cannot be future, debits must equal credits per entry

## Current Implementation Status
- Journal entries list page NOT implemented
- Journal entry model NOT created
- Journal entry posting logic NOT implemented
- Search/filter functionality NOT implemented
- Statistics calculation NOT implemented
- Bulk operations NOT implemented
- Backend API endpoints NOT implemented
- Frontend components NOT created
- Trial balance NOT implemented
- Permissions NOT defined
- Tests NOT written
- No accounting module exists

## Validation & Edge Cases
- Entry number must be unique per tenant
- Entry date cannot be future date
- Entry must have at least one debit and one credit line
- Total debits must equal total credits
- Account must be active and exist
- Account code must be valid
- Cannot post entry with invalid accounts
- Cannot post entry with zero amounts
- Cannot delete posted or reversed entries
- Cannot edit posted or reversed entries
- Reversal creates new entry (not modifying original)
- Reversals must balance
- Draft entries can be edited and reposted
- Multi-currency support (if applicable)
- Decimal precision (2 decimal places for amounts)
- Multi-tenant data isolation
- Audit trail for all operations
- Posted entries cannot be modified

## Testing Checklist
- [ ] Table renders all columns correctly
- [ ] Search by entry number finds entries
- [ ] Search by description finds entries
- [ ] Debounced search works
- [ ] Status filter works (all status types)
- [ ] Date range filter works
- [ ] Source filter works
- [ ] Posted by filter works
- [ ] Amount range filter works
- [ ] Multiple filters combine (AND logic)
- [ ] Clear filters resets all
- [ ] Sort by each column works
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows
- [ ] Bulk select checkbox works
- [ ] Bulk post posts selected entries
- [ ] Bulk reverse reverses selected entries
- [ ] Bulk delete deletes selected draft entries
- [ ] View entry opens detail view
- [ ] Edit entry opens edit form (draft only)
- [ ] Post entry button works
- [ ] Reverse entry button works
- [ ] Delete entry button works (draft only)
- [ ] Duplicate entry creates copy
- [ ] Statistics display correctly
- [ ] Period selector works
- [ ] Trial balance link works
- [ ] Create new entry button works
- [ ] Column visibility toggle works
- [ ] Refresh button reloads data
- [ ] Export button generates CSV/Excel/PDF
- [ ] Empty state displays
- [ ] Error state displays
- [ ] Loading state shows skeleton
- [ ] Responsive design works
- [ ] Debits equal credits validation
- [ ] Posted entries cannot be edited
- [ ] Posting updates status correctly
- [ ] Reversal creates new entry

## Implementation Checklist
- [ ] JournalEntry model
- [ ] JournalEntryLine model
- [ ] TrialBalance cache model
- [ ] Journal entry serializers
- [ ] Journal entry views (list, create, retrieve, update, partial_update)
- [ ] Journal entry viewsets
- [ ] URL routing
- [ ] Permissions for accounting module
- [ ] Journal entry number generation service
- [ ] Journal posting service (validates debits=credits, creates GL transactions)
- [ ] Journal reversal service (creates offsetting entry)
- [ ] Double-entry validation logic
- [ ] Trial balance calculation service
- [ ] Search/filter logic
- [ ] Statistics calculation
- [ ] Bulk operations service
- [ ] Posting API endpoints
- [ ] Reversal API endpoints
- [ ] Bulk operation endpoints
- [ ] Frontend journal entries list component
- [ ] Table component
- [ ] Search component
- [ ] Filter panel component
- [ ] Statistics panel component
- [ ] Period selector component
- [ ] Bulk action toolbar
- [ ] Create entry button
- [ ] Posting workflow component
- [ ] Reversal workflow component
- [ ] Loading and error states
- [ ] Export service (CSV, PDF)
- [ ] Trial balance export
- [ ] Responsive design
- [ ] Accessibility support
- [ ] Tests (models, serializers, views, services)
- [ ] Integration tests

## Deployment Strategy
1. **Phase 1**: Deploy JournalEntry and JournalEntryLine models with migrations
2. **Phase 2**: Deploy journal entry API endpoints and serializers
3. **Phase 3**: Deploy posting and reversal services
4. **Phase 4**: Deploy frontend journal entries list component
5. **Phase 5**: Deploy trial balance calculation
- Database migration: Run migrations to create journal tables
- Testing: Validate model relationships, API responses, debit/credit validation
- Staff training: Show entry creation, posting workflow, trial balance
- Rollback plan: Maintain backup of journal entries before changes

## Performance Targets
- List API (100 entries): <400ms
- Search query: <200ms (debounced)
- Statistics calculation: <200ms
- Table render: <300ms
- Page load: <2s
- Trial balance calculation: <500ms (for 500+ accounts)

## Monitoring & Alerting
- Track API latency for journal list
- Monitor posting success rate
- Alert on debit/credit mismatch
- Track bulk operation performance
- Monitor trial balance accuracy
- Alert on accounting data integrity issues

## Documentation Requirements
- Journal entry creation guide
- Journal entry posting guide
- Reversal procedures
- Double-entry bookkeeping explanation
- Trial balance interpretation
- Common entry types (templates)
- Error troubleshooting guide

## Future Enhancements
- Recurring journal entries (templates)
- Journal entry approval workflow
- Multi-currency support
- Journal entry allocation to cost centers
- Journal entry reversals with reasons tracking
- Batch import from CSV
- Integration with automatic entries (from bills, invoices, payroll)
- Journal entry drill-down to source documents
- Exception reporting (invalid entries)
- Journal entry templates
