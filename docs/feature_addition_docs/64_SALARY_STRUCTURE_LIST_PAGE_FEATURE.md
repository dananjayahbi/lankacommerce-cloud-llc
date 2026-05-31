# Feature 64: Salary Structure List Page

## Executive Summary

Salary structure management list interface enabling HR personnel to view, manage, and track employee salary configurations with allowances and deductions breakdowns.

## Current State Analysis

### EXISTING IMPLEMENTATION

- Commission tracking system (CommissionPayout, CommissionRecord models)
- User/staff management views
- Tenant-based data isolation

### GAPS & MISSING COMPONENTS

- No salary structure model exists
- No way to define base salary components
- No allowance configuration system
- No deduction configuration system (EPF, ETF, PAYE tax, insurance)
- No salary history/versioning
- No effective date management
- No salary component templates
- Missing allowance type definitions
- Missing deduction type definitions
- No salary breakdown calculation engine
- API endpoints missing for salary structure CRUD
- Frontend components for salary display not implemented

## Frontend Features

### Data Table (Responsive, Sortable, Filterable)
- **Column Headers:** Employee ID, Employee Name, Basic Salary, Total Allowances, Total Deductions, Gross Salary, Effective Date, Status
- **Sortable Columns:** Click to sort ascending/descending
- **Row Selection:** Checkboxes for bulk export operations
- **Row Actions:** Click row to view salary details
- **Status Badges:** Visual indicators (active, inactive, expired, pending approval)
- **Quick Actions:** Quick edit button (opens modal), Delete structure button (with confirmation)
- **Department Color-Coding:** Optional visual grouping

### Search Functionality
- Search by employee name
- Search by employee ID
- Debounced real-time search (optimized performance)

### Filter Section (Collapsible)
- Employee selector/filter (dropdown or multi-select)
- Department filter (dropdown)
- Status filter (active, inactive, expired, pending)
- Date range filter (effective date from/to)
- Salary range filter (gross salary min/max)
- Filter count badge
- Clear all filters button

### Sort Options
- Sort by: Employee, Basic Salary, Gross Salary, Effective Date, Status
- Sort direction: Ascending/Descending
- Default sort: By employee name ascending

### Pagination Controls
- Page size selector (10, 25, 50, 100 rows)
- Previous/Next buttons
- Page number input
- Total records count display

### Quick Actions Toolbar
- Create new salary structure button (primary action)
- Duplicate salary structure button (duplicates from selected row)
- Export salary list button (CSV, Excel)
- Bulk deactivate button (mark inactive)
- Bulk activate button (mark active)

### Salary Statistics Section (Above Table)
- Total employees on salary
- Average gross salary
- Salary range (min/max)
- Total monthly payroll (sum)
- Pending approvals count
- Expired structures count

### Additional UI Elements
- Column visibility toggle (customize display columns)
- Refresh button (reload salary data)
- Loading state (skeleton loader)
- Empty state (when no salary structures)
- Error state (error message if API fails)

## Backend API Requirements

### Endpoints

**GET /api/hr/salary-structures/** - List salary structures with filters, search, sorting, pagination
- Query params: `search`, `employee_id`, `department_id`, `status`, `effective_date_from`, `effective_date_to`, `salary_min`, `salary_max`, `page`, `page_size`, `ordering`
- Response: `{ count, next, previous, results: [{ id, employee_id, employee_name, basic_salary, total_allowances, total_deductions, gross_salary, effective_date, status, created_at }] }`

**GET /api/hr/salary-structures/{id}/** - Retrieve salary structure details

**POST /api/hr/salary-structures/duplicate/** - Duplicate existing salary structure

**DELETE /api/hr/salary-structures/{id}/** - Delete salary structure

**PATCH /api/hr/salary-structures/bulk-deactivate/** - Bulk deactivate structures

**PATCH /api/hr/salary-structures/bulk-activate/** - Bulk activate structures

**GET /api/hr/salary-statistics/** - Get salary statistics summary

**GET /api/hr/employees/** - Get employee list for filtering

**GET /api/hr/departments/** - Get department list for filtering

## Database Requirements

### Models

**SalaryStructure**
- id (UUID)
- tenant_id (FK)
- employee_id (FK)
- basic_salary (Decimal)
- effective_date (Date)
- end_date (Date, nullable)
- status (CharField: active/inactive/expired/pending)
- created_at (DateTime)
- updated_at (DateTime)
- created_by (FK to User)
- approved_by (FK to User, nullable)
- approval_date (DateTime, nullable)
- notes (TextField, nullable)

**SalaryAllowance**
- id (UUID)
- salary_structure_id (FK)
- allowance_type_id (FK)
- amount (Decimal)

**SalaryDeduction**
- id (UUID)
- salary_structure_id (FK)
- deduction_type_id (FK)
- amount_or_percentage (Decimal)
- is_percentage (Boolean)

**AllowanceType**
- id (UUID)
- tenant_id (FK)
- name (CharField)
- description (TextField, nullable)
- category (CharField: house_rent, transport, special_allowance, etc.)

**DeductionType**
- id (UUID)
- tenant_id (FK)
- name (CharField)
- description (TextField, nullable)
- category (CharField: epf, etf, tax, insurance, etc.)

### Indexes
- (tenant_id, employee_id, effective_date)
- (tenant_id, status)
- (employee_id, effective_date DESC)

## Current Implementation Status

- ❌ Salary structure list page NOT implemented
- ❌ Search functionality NOT implemented
- ❌ Filter system NOT implemented
- ❌ Salary statistics NOT implemented
- ❌ Backend models NOT created
- ❌ API endpoints NOT implemented
- ❌ Frontend table component NOT created
- ❌ Export functionality NOT implemented

## Validation & Edge Cases

- Employee must be active
- Basic salary must be positive
- Allowances sum must be reasonable
- Deductions cannot exceed gross salary
- Effective date cannot be in past (or configurable)
- No overlapping active salary structures per employee
- End date must be after effective date
- Percentage deductions vs fixed amount handling
- Salary year boundaries
- Mid-year salary changes
- Promotions with salary increases
- Department transfers with salary adjustments
- Termination (final salary structure)
- Inactive employees (no new structures)

## Testing Checklist

- [ ] Table renders all columns correctly
- [ ] Search by employee name finds structures
- [ ] Search by employee ID finds structures
- [ ] Debounced search works
- [ ] Status filter shows correct statuses
- [ ] Department filter populated
- [ ] Date range filter works
- [ ] Salary range filter works
- [ ] Multiple filters combine (AND logic)
- [ ] Clear filters resets all
- [ ] Sorting by each column works (asc/desc)
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows
- [ ] Bulk select checkbox works
- [ ] Create new structure button navigates to creation form
- [ ] Duplicate structure creates copy
- [ ] Export salary list generates file
- [ ] Bulk deactivate deactivates all selected
- [ ] Bulk activate activates all selected
- [ ] Statistics display correctly
- [ ] Status badges display correctly
- [ ] Column visibility toggle works
- [ ] Refresh button reloads data
- [ ] Empty state displays
- [ ] Error state displays
- [ ] Loading state shows skeleton
- [ ] Responsive design works

## Implementation Checklist

- [ ] Salary structures table component
- [ ] Search input with debounce
- [ ] Filter section component
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Quick actions toolbar
- [ ] Row selection checkboxes
- [ ] Statistics panel component
- [ ] Column visibility toggle
- [ ] API client methods
- [ ] State management
- [ ] Loading and error states
- [ ] Empty state component
- [ ] Export service
- [ ] Bulk operation handlers
- [ ] Permission checks
- [ ] Responsive design
- [ ] Accessibility

## Deployment Strategy

- **Phase 1:** Deploy database migrations (SalaryStructure, SalaryAllowance, SalaryDeduction, AllowanceType, DeductionType models)
- **Phase 2:** Deploy API endpoints and services
- **Phase 3:** Deploy frontend components
- **Testing:** Load test with 1000+ salary structures
- **Staff Training:** Show filtering, statistics, bulk operations
- **Rollback Plan:** Maintain previous salary data

## Performance Targets

- Salary structures list API: <500ms (page_size=25)
- Search query: <200ms (debounced)
- Statistics calculation: <300ms
- Table render: <300ms
- Export generation: <5s (for 5000 records)

## Monitoring & Alerting

- Track API latency
- Monitor search performance
- Alert on export failures
- Track filter usage patterns

## Documentation Requirements

- Salary structure list navigation guide
- Filtering tips guide
- Statistics interpretation guide
- Search guide
- Export guide
- Bulk operations guide

## Future Enhancements

- Salary structure version history
- Automatic salary reviews
- Merit increase templates
- Salary comparison reports
- Cost center allocation
- Salary forecasting
- Integration with payroll module
- Salary equity analysis
