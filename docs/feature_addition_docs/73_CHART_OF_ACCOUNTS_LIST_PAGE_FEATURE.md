# Chart of Accounts List Page Feature

## Executive Summary

Chart of Accounts management interface enabling accounting teams to view, create, manage, and organize the complete account hierarchy with filtering, searching, and hierarchical visualization of the general ledger account structure.

## Current State Analysis

### EXISTING
- Django models framework available
- Multi-tenant database infrastructure
- REST API framework (Django REST Framework)
- User authentication and permissions system

### MISSING (Complete absence - new module)
- ChartOfAccounts database model
- Account master data structure
- Account hierarchy/tree structure
- Account type classification (asset, liability, equity, income, expense)
- Account sub-category system
- Account numbering/coding system
- Opening balance tracking
- Account status management (active/inactive/archived)
- Account balance queries and calculations
- Hierarchical account tree API
- Account filtering and search backend
- Account status transitions
- Account archival workflow
- Account relationship constraints
- Account balance validation rules
- Account type rules (debit-balanced vs credit-balanced accounts)
- Account closing procedures
- Account reconciliation capabilities
- Account transaction audit trails
- Account-wise balance calculations
- Account activity monitoring
- Integration between Account and JournalEntry models
- API endpoints for account management
- Serializers for account data
- Views for account list/create/retrieve/update
- Permissions for accounting module
- Tests for chart of accounts functionality
- Frontend components not created

## Frontend Features

### Hierarchical accounts tree view
- Expandable/collapsible account types (Asset, Liability, Equity, Income, Expense)
- Sub-accounts nested under parents
- Account balance display (in parentheses, debit/credit indicator)
- Account code display
- Account status indicator (active, inactive, archived)
- Drag & drop reordering (optional)
- Account count per category
- Total balance per category (auto-calculated)

### Accounts table view (alternative to tree)
- Columns: Account Code, Account Name, Type, Category, Balance, Status
- Sortable columns (click to sort)
- Search by account code or name
- Filter by account type (asset, liability, equity, income, expense)
- Filter by status (active, inactive, archived)
- Pagination or infinite scroll
- Row selection checkboxes
- View details button
- Edit button
- Archive/Activate toggle

### Search functionality
- Search by account code (exact match preferred)
- Search by account name (fuzzy matching)
- Real-time search results
- Debounced search
- Search highlighting

### Filter panel
- Account type multi-select filter
- Status filter (checkboxes: active, inactive, archived)
- Category filter (hierarchical tree)
- Balance range filter (min/max)
- Clear filters button
- Filter count badge

### Additional features
- Column visibility toggle (customize which columns display)
- Create new account button (opens creation modal/page)
- View account details button (opens detail view)
- Edit account button (opens edit form)
- Archive account button (with confirmation)
- Activate archived account button
- Delete account button (with safeguards - only if no transactions)
- Bulk operations toolbar (appears when rows selected):
  - Bulk archive accounts
  - Bulk activate accounts
  - Bulk export selected
  - Bulk assign category

### Account tree statistics panel
- Total accounts count
- Active accounts count
- Archived accounts count
- Total assets balance
- Total liabilities balance
- Total equity balance
- Total income
- Total expenses
- Net income/loss (auto-calculated)

### Period selector (to view balances for different periods)
- Month/year picker
- Fiscal year selector
- Custom date range
- Balance as-of date

### Chart/visualization (optional)
- Asset/Liability/Equity pie chart
- Income/Expense breakdown bar chart

### Additional display elements
- Account nature indicator (Debit-balanced vs Credit-balanced)
- Opening balance display
- Last transaction date display
- Refresh button
- Export accounts list button (CSV, PDF with chart)
- Loading state (skeleton loader)
- Empty state (when no accounts, with "Create Account" prompt)
- Error state (error message display)

## Backend API Requirements

### List Endpoint
- **GET /api/accounting/chart-of-accounts/** - List accounts with filters, search, hierarchy
  - Query params: search, type (asset/liability/equity/income/expense), status, category, balance_min, balance_max, page, page_size, ordering, parent_id (for sub-accounts)
  - Response: { count, next, previous, results: [{ id, code, name, type, category, opening_balance, current_balance, status, parent_account_id, is_leaf_node, child_count }] }

### Hierarchy Endpoint
- **GET /api/accounting/chart-of-accounts/tree/** - Get hierarchical account tree
  - Response: [{ id, code, name, type, category, balance, children: [...] }]

### Detail Endpoint
- **GET /api/accounting/chart-of-accounts/{id}/** - Retrieve single account details

### Creation Endpoint
- **POST /api/accounting/chart-of-accounts/** - Create new account
  - Request body: { code, name, type, category, parent_account_id (nullable), opening_balance, status, description (nullable) }

### Update Endpoint
- **PATCH /api/accounting/chart-of-accounts/{id}/** - Update account
  - Request body: { code, name, category, parent_account_id (nullable), status, description (nullable) }

### Delete Endpoint
- **DELETE /api/accounting/chart-of-accounts/{id}/** - Archive/soft-delete account (if no transactions)

### Reactivation Endpoint
- **POST /api/accounting/chart-of-accounts/{id}/activate/** - Reactivate archived account

### Bulk Update Endpoint
- **POST /api/accounting/chart-of-accounts/bulk-update/** - Bulk update status/category

### Statistics Endpoint
- **GET /api/accounting/chart-of-accounts/statistics/** - Get account statistics
  - Response: { total_accounts, active_count, archived_count, total_assets, total_liabilities, total_equity, total_income, total_expenses, net_income }

### Balances Endpoint
- **GET /api/accounting/chart-of-accounts/balances/** - Get balances as-of date
  - Query params: as_of_date (date picker)
  - Response: [{ account_id, code, name, balance }]

### Type Options Endpoint
- **GET /api/accounting/account-types/** - Get list of valid account types

### Category Options Endpoint
- **GET /api/accounting/account-categories/** - Get list of valid account categories

## Database Requirements

### ChartOfAccount Model
- id
- tenant_id
- code (unique per tenant)
- name
- type (asset/liability/equity/income/expense)
- category
- parent_account_id (nullable, for sub-accounts)
- opening_balance
- status (active/inactive/archived)
- description
- created_at
- updated_at
- created_by_id
- updated_by_id
- is_deleted (soft delete)

### AccountBalance Model
- id
- account_id
- period_date
- debit_total
- credit_total
- balance (calculated)
- created_at

### Indexes
- (tenant_id, code)
- (tenant_id, type)
- (tenant_id, status)
- (tenant_id, parent_account_id)
- (account_id, period_date)

### Constraints
- code must be unique per tenant
- type must be in enum
- parent account type must match hierarchy rules

## Current Implementation Status

- [ ] ChartOfAccounts model NOT created
- [ ] Account list page NOT implemented
- [ ] Hierarchical view NOT implemented
- [ ] Search/filter functionality NOT implemented
- [ ] Statistics calculation NOT implemented
- [ ] Backend API endpoints NOT implemented
- [ ] Frontend components NOT created
- [ ] Permissions NOT defined
- [ ] Tests NOT written
- [ ] No accounting module structure exists

## Validation & Edge Cases

- Account code must be unique per tenant
- Account code format validation (alphanumeric, hyphens allowed)
- Account name required
- Account type must be from predefined enum
- Parent account must exist and be active
- Cannot archive account with active child accounts (cascade rule)
- Cannot archive account with transactions (validation rule)
- Cannot delete account if transactions exist
- Opening balance required for new accounts
- Balance calculations must be accurate across periods
- Account type rules: Assets (debit-normal), Liabilities (credit-normal), Equity (credit-normal), Income (credit-normal), Expense (debit-normal)
- Sub-account rules: parent and child must follow type hierarchy
- Period-end closing considerations
- Multi-tenant data isolation
- Accounting equation validation (Assets = Liabilities + Equity)

## Testing Checklist

- [ ] Tree view renders hierarchically
- [ ] Tree view expands/collapses correctly
- [ ] Table view renders all columns
- [ ] Search by code finds accounts
- [ ] Search by name finds accounts
- [ ] Type filter works
- [ ] Status filter works
- [ ] Category filter works
- [ ] Balance range filter works
- [ ] Multiple filters combine (AND logic)
- [ ] Clear filters resets all
- [ ] Sort by code works
- [ ] Sort by name works
- [ ] Sort by balance works
- [ ] Sort by type works
- [ ] Pagination works
- [ ] Create account button opens form
- [ ] View details button opens detail view
- [ ] Edit button opens edit form
- [ ] Archive button disables account
- [ ] Activate button reactivates account
- [ ] Delete button prevents deletion if transactions exist
- [ ] Bulk select checkbox works
- [ ] Bulk archive works
- [ ] Bulk activate works
- [ ] Statistics display correctly
- [ ] Period selector changes displayed balances
- [ ] Opening balances display
- [ ] Current balances calculate correctly
- [ ] Last transaction date displays
- [ ] Column visibility toggle works
- [ ] Export button generates CSV/PDF
- [ ] Empty state displays
- [ ] Error state displays
- [ ] Loading state shows skeleton
- [ ] Responsive design works
- [ ] Tree visualization loads quickly
- [ ] Large account charts (1000+ accounts) perform well

## Implementation Checklist

### Backend
- [ ] ChartOfAccount model
- [ ] AccountBalance model
- [ ] Account serializers
- [ ] Account views (list, create, retrieve, update, partial_update)
- [ ] Account viewsets
- [ ] URL routing
- [ ] Permissions for accounting module
- [ ] Search/filter logic
- [ ] Statistics calculation logic
- [ ] Balance calculation service
- [ ] Account hierarchy validation
- [ ] Account archival service
- [ ] Accounting API endpoints

### Frontend
- [ ] Frontend chart of accounts list component
- [ ] Tree view component
- [ ] Table view component
- [ ] Search component
- [ ] Filter panel component
- [ ] Statistics panel component
- [ ] Period selector component
- [ ] Create account modal
- [ ] Edit account modal
- [ ] Archive confirmation modal
- [ ] Bulk operations toolbar
- [ ] Loading and error states
- [ ] Export service (CSV, PDF)
- [ ] Responsive design
- [ ] Accessibility support

### Testing & Documentation
- [ ] Tests (backend serializers, views, models)
- [ ] Tests (frontend components)
- [ ] Integration tests (end-to-end)

## Deployment Strategy

### Phases
1. **Phase 1**: Deploy ChartOfAccount and AccountBalance models with migrations
2. **Phase 2**: Deploy accounting API endpoints and serializers
3. **Phase 3**: Deploy frontend chart of accounts list component
4. **Phase 4**: Deploy search, filter, and statistics functionality

### Database Migration
- Run migrations to create accounting tables

### Data Setup
- Populate standard chart of accounts template (if using template)

### Testing
- Validate model relationships, API responses, frontend rendering

### Staff Training
- Teach account structure, hierarchy, code assignment conventions

### Rollback Plan
- Maintain backup of chart of accounts before changes

## Performance Targets

- List API (100 accounts): <300ms
- Tree API (500+ accounts): <500ms
- Search query: <200ms (debounced)
- Statistics calculation: <150ms
- Table render: <250ms
- Page load: <2s

## Monitoring & Alerting

- Track API latency for account list
- Monitor balance calculation accuracy
- Alert on accounting data integrity issues
- Track account creation/modification audit trail
- Monitor tree performance with large datasets

## Documentation Requirements

- Chart of Accounts structure documentation
- Account code assignment guide
- Account hierarchy rules
- Account type explanation
- Status transition guide
- Account management procedures
- Troubleshooting guide

## Future Enhancements

- Account reconciliation workflow
- Period-end closing procedures
- Account consolidation (for groups)
- Multi-level sub-accounts
- Account alias support
- Account dormancy detection
- Account automation rules
- Account dimension tracking (cost center, project, etc.)
- Account budget allocation
- Account actuals vs budget variance analysis
- Intercompany account linking (for groups)
- Account API for third-party integrations
