# Journal Entry Detail View and Posting Feature Specification

## Executive Summary
Journal Entry detail view and posting management interface enabling accounting teams to review, verify, post, and reverse journal entries with comprehensive display of entry details, account information, balance verification, and audit trails for accurate financial record maintenance.

## Current State Analysis

### EXISTING:
- Audit logging infrastructure (AuditLog model)
- User permission system
- Transaction management

### MISSING (Complete absence):
- Journal entry detail page component
- Journal entry display logic
- Entry posting workflow
- Entry reversal workflow
- Posted entry read-only view
- Account detail display (linked from entry)
- Line item detail display
- Balance verification on detail page
- Posting confirmation modal
- Reversal confirmation modal
- Edit button conditional logic (only for draft)
- Post button conditional logic (only for draft)
- Reverse button conditional logic (only for posted)
- Entry status transitions display
- Posting user and timestamp display
- Change history display
- Entry audit trail
- API endpoints for detail view
- API endpoints for posting
- API endpoints for reversal

## Frontend Features

### Entry header section:
- Entry number (large, prominent)
- Entry status badge (draft, posted, reversed)
- Edit button (if draft)
- Post button (if draft)
- Reverse button (if posted)
- More options menu (duplicate, export, etc.)

### Entry information section (read-only):
- Entry number
- Entry date
- Entry status
- Created date and created by user
- Last modified date and user
- Posted date and posted by user (if posted)
- Posting user link (to user profile)

### Description section:
- Entry description (full text)
- Reference number (if provided)
- Memo (if provided)
- Source indicator (Manual / Automatic from...)

### Entry lines table (detailed):
- Columns: Account Code, Account Name, Account Type, Debit Amount, Credit Amount
- Sortable columns
- Rows with account information
- Link to account detail (click account name)
- Account balance display (optional, from Chart of Accounts)
- Highlighted totals row:
  - Total Debits
  - Total Credits
  - Balance verification (Debits = Credits)

### Balance verification section (prominent):
- Total debits display
- Total credits display
- Difference (should be 0)
- Status indicator (In balance / Out of balance)
- Color coded (green if balanced)
- Manual verification checkbox (Verified by user)

### Posting section (if draft):
- Verify button (confirms user has reviewed)
- Post date selector (defaults to today)
- Cannot post to future date
- Post button (performs posting)
- Cancel button
- Confirmation modal before posting:
  - Shows entry summary
  - Shows accounts and amounts
  - Shows debit = credit verification
  - Confirm button
  - Cancel button

### Posted entry display (if posted):
- Posted date and time
- Posted by user (with link)
- Cannot edit message (entry is locked)
- Cannot delete message (entry is locked)
- Post date is immutable
- Reverse button available

### Reversal section (if posted):
- Reverse button
- Confirmation modal:
  - Shows original entry details
  - Shows reversal will create offsetting entry
  - Reversal date selector
  - Reversal reason dropdown
  - Confirm button
  - Cancel button
- After reversal:
  - Shows original entry status as "reversed"
  - Shows reversal entry reference
  - Link to reversal entry detail

### Audit trail section:
- Timeline of entry changes
- Created event (user, date, time)
- Edited events (user, date, time, what changed)
- Posted event (user, date, time)
- Reversed event (user, date, time, reason)
- Click event for details

### Related entries section:
- Reversal entry link (if reversed)
- Original entry link (if this is a reversal)
- Automatic entry source (if from bill/invoice)
- Link to source document

### Action buttons:
- Edit button (if draft)
- Delete button (if draft, with confirmation)
- Duplicate button (creates copy)
- Post button (if draft)
- Reverse button (if posted)
- Export button (PDF, CSV)
- Print button
- Download PDF button

### Tabs (alternative view):
- Details tab (default) - entry information
- Posting tab - posting controls
- Audit Trail tab - change history
- Related tab - related entries

### Tabs for different states:
- Draft entry: Details, Posting, Audit Trail, Related
- Posted entry: Details, Reversal, Audit Trail, Related
- Reversed entry: Details, Audit Trail, Original Entry, Reversal Entry

### State displays:
- Loading state (skeleton loader)
- Error state (error message)
- Success notification (after posting/reversal)

## Backend API Requirements

### GET /api/accounting/journal-entries/{id}/
Retrieve journal entry details
- Response: { id, entry_number, date, description, reference (nullable), memo (nullable), status, created_at, created_by, updated_at, updated_by, posted_at (nullable), posted_by (nullable), lines: [{ id, account_id, account_code, account_name, debit_amount, credit_amount }], total_debits, total_credits }

### POST /api/accounting/journal-entries/{id}/post/
Post journal entry
- Request body: { posted_date (optional, defaults to today) }
- Response: { id, entry_number, status, posted_at, posted_by }

### POST /api/accounting/journal-entries/{id}/reverse/
Reverse journal entry
- Request body: { reversal_date, reversal_reason (optional) }
- Response: { id (of new reversal entry), entry_number, status, reversed_from_entry_id }

### GET /api/accounting/journal-entries/{id}/audit-trail/
Get entry audit trail
- Response: [{ timestamp, action (created/edited/posted/reversed), user, details }]

### GET /api/accounting/journal-entries/{id}/related-entries/
Get related entries
- Response: { reversal_entry_id (nullable), original_entry_id (nullable), source_entry_id (nullable) }

### DELETE /api/accounting/journal-entries/{id}/
Delete journal entry (draft only)
- Response: { success: true, message: "Entry deleted" }

### GET /api/accounting/chart-of-accounts/{id}/
Get account details (for linked account view)

### POST /api/accounting/journal-entries/{id}/duplicate/
Duplicate entry
- Response: { id (of new copy), entry_number, status: "draft" }

## Database Requirements

### JournalEntry model with all detail fields:
- id, entry_number, date, description, status, created_at, created_by, updated_at, updated_by, posted_at (nullable), posted_by (nullable), reference (nullable), memo (nullable), source

### JournalEntryLine model with account relationships:
- id, journal_entry_id, account_id, debit_amount, credit_amount

### JournalEntryAuditLog model:
- id, entry_id, action (created/edited/posted/reversed), user_id, timestamp, details

### Indexes:
- (entry_id, timestamp), (user_id, timestamp)

### Constraints:
- entry_number unique, status valid enum

## Current Implementation Status
- Journal entry detail page NOT implemented
- Entry posting workflow NOT implemented
- Entry reversal workflow NOT implemented
- Audit trail display NOT implemented
- Balance verification display NOT implemented
- Related entries display NOT implemented
- API endpoints NOT implemented
- Confirmation modals NOT implemented
- Success notifications NOT implemented
- Permission checks NOT implemented

## Validation & Edge Cases
- Entry must exist
- Entry status determines available actions (draft/posted)
- Posted entries are read-only
- Reversal creates new entry (doesn't modify original)
- Reversal date cannot be before original entry date
- Reversal date cannot be future
- Posting date cannot be future
- Balance must be verified before posting
- Posting marks entry as posted and locks it
- Only draft entries can be edited or deleted
- Only posted entries can be reversed
- Audit trail captures all changes
- Multi-tenant data isolation
- Permission checks for viewing/editing/posting

## Testing Checklist
- [ ] Entry details display correctly
- [ ] Entry status displays correctly
- [ ] Entry lines display with accounts and amounts
- [ ] Account code and name display
- [ ] Debit and credit amounts display correctly
- [ ] Total debits calculates correctly
- [ ] Total credits calculates correctly
- [ ] Balance verification shows balanced (if correct)
- [ ] Balance verification shows unbalanced (if incorrect)
- [ ] Created date and user display
- [ ] Last modified date and user display (if edited)
- [ ] Description displays
- [ ] Reference displays (if provided)
- [ ] Memo displays (if provided)
- [ ] Source indicator displays
- [ ] Edit button appears for draft entries
- [ ] Edit button hidden for posted entries
- [ ] Post button appears for draft entries
- [ ] Post button hidden for posted entries
- [ ] Reverse button appears for posted entries
- [ ] Reverse button hidden for draft entries
- [ ] Delete button appears for draft entries
- [ ] Delete button hidden for posted entries
- [ ] Duplicate button works
- [ ] Post button opens confirmation modal
- [ ] Confirmation modal shows entry details
- [ ] Confirming post changes status to posted
- [ ] Reverse button opens reversal modal
- [ ] Reversal modal shows reason selector
- [ ] Confirming reversal creates new entry
- [ ] Reversal entry links back to original
- [ ] Posted date and user display after posting
- [ ] Audit trail displays all changes
- [ ] Audit trail shows created, edited, posted events
- [ ] Related entries display correctly
- [ ] Account links work
- [ ] Export button works (PDF, CSV)
- [ ] Print button works
- [ ] Success notification displays on post
- [ ] Success notification displays on reversal
- [ ] Responsive design works
- [ ] Large entries (50+ lines) display efficiently
- [ ] Permission checks enforced

## Implementation Checklist
- [ ] Journal entry detail component
- [ ] Entry header component
- [ ] Entry information panel component
- [ ] Entry lines table component
- [ ] Balance verification component
- [ ] Posting workflow component
- [ ] Posting confirmation modal component
- [ ] Reversal workflow component
- [ ] Reversal confirmation modal component
- [ ] Audit trail component
- [ ] Related entries component
- [ ] Action buttons group
- [ ] Tab navigation component
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Posting service
- [ ] Reversal service
- [ ] Duplicate service
- [ ] Export service (PDF, CSV)
- [ ] Print service
- [ ] Audit trail query service
- [ ] Related entries query service
- [ ] Loading and error states
- [ ] Success notification component
- [ ] Permission checks
- [ ] Responsive layout
- [ ] Accessibility support
- [ ] Performance optimization (large ledgers)

## Deployment Strategy
- Deploy journal detail API endpoints
- Deploy posting and reversal services
- Deploy audit trail tracking
- Deploy frontend detail component
- Testing: Verify posting workflow, reversal workflow, audit trail
- Staff training: Show entry review, posting process, reversal procedures
- Rollback: Maintain journal entry data

## Performance Targets
- Entry detail load: <500ms
- Posting action: <1s
- Reversal action: <1s
- Audit trail load: <300ms
- Large entry display (50+ lines): <1s

## Monitoring & Alerting
- Track entry detail page performance
- Monitor posting success rate
- Alert on failed postings
- Monitor reversal operations
- Alert on audit trail discrepancies

## Documentation Requirements
- Entry detail view guide
- Posting procedure guide
- Reversal procedure guide
- Audit trail interpretation
- Balance verification guide
- Confirmation process
- Troubleshooting guide

## Future Enhancements
- Entry approval workflow
- Entry posting scheduling
- Batch posting with progress tracking
- Entry drill-down to GL accounts
- Entry drill-down to source documents
- Entry exception report
- Entry reconciliation workflow
- Entry variance analysis
- Entry drill-down to cost centers
- Advanced audit trail analytics
