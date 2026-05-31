# Department Management List Page Feature

## Executive Summary

The Department Management List Page provides HR administrators with a comprehensive interface for viewing and managing organizational structure. This feature enables hierarchical navigation of departments, employee assignment tracking, manager management, and department operations through both tree and table views. The interface supports advanced search, filtering, and reordering capabilities while maintaining clear visual hierarchy and operational efficiency.

---

## Current State Analysis

### Existing Implementation
- Basic department list page partially implemented
- Tree view partially working
- Table view incomplete
- Hierarchical display partial
- Search functionality working
- Filter by status working
- Manager assignment incomplete
- Reordering partial
- Export functionality missing
- Employee count display working
- Delete with cascade checking incomplete

### Gaps & Limitations
- Tree view lacks full visual hierarchy representation
- Table view missing critical columns and sorting
- Manager assignment workflow not fully implemented
- Reordering functionality limited to certain scenarios
- No export capabilities (PDF org chart, CSV)
- Permission validation incomplete
- Performance issues with large hierarchies (100+ departments)

---

## Detailed Requirements

### Frontend Features

#### Department Tree View
- **Hierarchical Display Structure**
  - Collapsible/expandable nodes (click to expand subsidiary departments)
  - Department names with indentation levels showing hierarchy depth
  - Employee count per department displayed in badge format
  - Department manager name displayed below department name
  - Department status indicator with color-coding (Active: green, Inactive: gray)
  - Department code display (optional, shown on hover or in secondary column)
  - Visual hierarchy lines connecting parent to child departments
  - Root departments positioned at top level of tree
  - Maximum three levels of visible indentation at load time

- **Interactive Capabilities**
  - Drag & drop reordering between sibling departments only (not across hierarchy levels)
  - Single-click to expand/collapse department nodes
  - Double-click on department name to open detail view
  - Right-click context menu for quick actions
  - Hover to show full department name (if truncated)
  - Hover to show connection lines between related departments

#### Department Table View
- **Column Structure**
  - Department Name (primary column, sortable)
  - Department Code (sortable)
  - Manager Name (sortable, filterable)
  - Employee Count (sortable, numeric)
  - Status (sortable, filterable)
  - Action buttons (edit, delete, view details)

- **Sorting & Pagination**
  - Multi-column sort capability
  - Sort direction toggle (Ascending/Descending)
  - Default sort: By hierarchy level then alphabetically
  - Pagination with configurable page size (10, 25, 50, 100 items per page)
  - Current page indicator
  - First/Last page navigation buttons

- **Row-Level Actions**
  - Edit department button (pencil icon, opens edit form)
  - View details button (arrow or magnifying glass icon)
  - Delete department button (trash icon, confirms before deletion)
  - View employees button (shows employees in this department)
  - Assign manager button (if not assigned)

#### Search Functionality
- **Search Capabilities**
  - Search by department name (partial match, case-insensitive)
  - Search by department code (exact or partial match)
  - Search by manager name (partial match, case-insensitive)
  - Real-time search with 300ms debounce
  - Clear search button to reset
  - Search result count indicator
  - Highlight matching text in results

#### Filter Section
- **Collapsible Filter Panel**
  - Status filter (checkboxes: Active, Inactive)
  - Manager filter (dropdown with employee list)
  - Parent department filter (dropdown to show only children of selected dept)
  - Filter count badge showing active filter count
  - Clear all filters button with confirmation
  - Filter persistence during session

#### Sort Options
- **Sort Controls (Table View)**
  - Sort field selector (dropdown: Name, Code, Manager, Employee count, Status)
  - Sort direction selector (Ascending/Descending)
  - Default sort: By hierarchy level (for tree structure)
  - Save sort preference to user profile

#### Action Buttons & Controls
- **Primary Call-to-Actions**
  - Create new department button (prominent, top-right)
  - Reorder departments button (toggles drag & drop mode in tree view)
  - Export department structure button (PDF org chart or CSV)
  - Refresh button (reload department list from API)

- **Secondary Actions**
  - View department details link/button
  - Edit department button (row-level or detail view)
  - Delete department button (with child department warning)
  - View employees in department button
  - Assign manager button (if manager slot available)
  - Toggle between tree and table view button

#### Department Detail Quick View
- **Hover Card or Modal Display**
  - Department name and code
  - Manager name and contact information (phone, email)
  - Employee count (total in department)
  - Department description (first 150 characters)
  - Department status (Active/Inactive)
  - Department creation date
  - Quick action buttons (Edit, View Employees, View Manager Profile)

#### Page States

- **Loading State**
  - Skeleton loader showing department list structure
  - Placeholder elements for tree nodes or table rows
  - Animated shimmer effect

- **Empty State**
  - Message: "No departments found"
  - Create new department CTA button
  - Illustration or icon

- **Error State**
  - Error message: "Failed to load departments. Please try again."
  - Retry button
  - Error details (if in debug mode)
  - Support contact information

---

## Backend API Requirements

### API Endpoints

#### List Departments with Hierarchy
```
GET /api/hr/departments/
Query Parameters:
  - search: string (search by name, code, or manager)
  - status: string (active|inactive)
  - manager_id: integer (filter by manager)
  - include_children: boolean (include child departments)
  - page: integer (pagination page number)
  - page_size: integer (items per page, default 25)
  - ordering: string (field name, prefix - for descending)

Response: {
  count: integer,
  next: string|null,
  previous: string|null,
  results: [
    {
      id: integer,
      name: string,
      code: string,
      parent_id: integer|null,
      manager_id: integer|null,
      manager_name: string|null,
      status: string (active|inactive),
      employee_count: integer,
      description: string|null,
      created_at: datetime,
      updated_at: datetime,
      children: [... recursive structure]
    }
  ]
}
```

#### Get Department Details
```
GET /api/hr/departments/{id}/
Response: {
  id: integer,
  name: string,
  code: string,
  parent_id: integer|null,
  parent_name: string|null,
  manager_id: integer|null,
  manager_name: string|null,
  manager_email: string|null,
  manager_phone: string|null,
  status: string,
  employee_count: integer,
  description: string|null,
  budget: decimal|null,
  cost_center: string|null,
  email: string|null,
  phone: string|null,
  created_at: datetime,
  updated_at: datetime,
  created_by: string,
  updated_by: string
}
```

#### Update Department
```
PATCH /api/hr/departments/{id}/
Request Body: {
  name: string (optional),
  code: string (optional),
  parent_id: integer|null (optional),
  manager_id: integer|null (optional),
  status: string (optional),
  description: string (optional)
}
Response: { ... full department object }
```

#### Delete Department
```
DELETE /api/hr/departments/{id}/
Query Parameters:
  - cascade: boolean (delete child departments)
  - transfer_employees: integer|null (transfer employees to this dept)

Response: { success: boolean, message: string }
```

#### Assign Manager to Department
```
POST /api/hr/departments/{id}/assign-manager/
Request Body: { manager_id: integer|null }
Response: { id: integer, manager_id: integer, manager_name: string }
```

#### Reorder Department Hierarchy
```
POST /api/hr/departments/{id}/reorder/
Request Body: {
  parent_id: integer|null,
  display_order: integer
}
Response: { success: boolean, message: string }
```

#### Get Employees in Department
```
GET /api/hr/departments/{id}/employees/
Query Parameters:
  - page: integer
  - page_size: integer

Response: {
  count: integer,
  results: [
    {
      id: integer,
      name: string,
      employee_id: string,
      designation: string,
      status: string
    }
  ]
}
```

#### Get Full Department Hierarchy Tree
```
GET /api/hr/departments/hierarchy/
Query Parameters:
  - include_inactive: boolean

Response: [
  {
    id: integer,
    name: string,
    code: string,
    manager_name: string|null,
    employee_count: integer,
    status: string,
    children: [...recursive]
  }
]
```

#### Export Department Structure
```
POST /api/hr/departments/export-structure/
Request Body: {
  format: string (pdf|csv),
  include_employees: boolean (optional)
}
Response: { file_url: string, file_name: string }
```

---

## Database Requirements

### Department Model Schema
```
Columns:
  - id (Primary Key)
  - tenant_id (Foreign Key - multi-tenancy)
  - name (VARCHAR 255, NOT NULL)
  - code (VARCHAR 50, NOT NULL)
  - parent_id (Foreign Key - self-referencing, nullable)
  - manager_id (Foreign Key to Employee, nullable)
  - status (ENUM: active, inactive; DEFAULT: active)
  - description (TEXT, nullable)
  - budget (DECIMAL 12,2, nullable)
  - cost_center (VARCHAR 50, nullable)
  - email (VARCHAR 255, nullable)
  - phone (VARCHAR 20, nullable)
  - display_order (INTEGER; for ordering within parent)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - deleted_at (TIMESTAMP, nullable - soft delete)
  - created_by (VARCHAR 255)
  - updated_by (VARCHAR 255)

Unique Constraints:
  - (tenant_id, code)
  - (tenant_id, parent_id, display_order)

Foreign Keys:
  - parent_id → Department.id (ON DELETE CASCADE)
  - manager_id → Employee.id (ON DELETE SET NULL)
  - tenant_id → Tenant.id

Check Constraints:
  - parent_id != id (prevent self-reference)
  - name != '' (not empty)
```

### Indexes for Performance
```
CREATE INDEX idx_department_tenant_parent ON Department(tenant_id, parent_id);
CREATE INDEX idx_department_tenant_status ON Department(tenant_id, status);
CREATE INDEX idx_department_tenant_manager ON Department(tenant_id, manager_id);
CREATE INDEX idx_department_name ON Department(tenant_id, name);
CREATE INDEX idx_department_code ON Department(tenant_id, code);
CREATE INDEX idx_department_display_order ON Department(tenant_id, parent_id, display_order);
```

---

## Validation & Edge Cases

### Business Rules
- Cannot delete department that contains employees (require transfer or cascade)
- Cannot delete department that has child departments (require cascade or delete children first)
- Cannot assign an employee as their own manager
- Cannot create circular hierarchy (A → B → C → A)
- Manager must be an active employee
- Manager cannot manage departments at lower organizational level than their own
- Unique department code per tenant (case-insensitive)
- Cannot orphan departments (preserve hierarchy integrity)
- Parent department must be active to add child departments

### Edge Cases Handling
- **Large Hierarchies (100+ departments)**
  - Implement pagination in tree view (lazy loading children)
  - Cache frequently accessed hierarchies
  - Optimize recursive queries with CTEs or path materialization

- **Concurrent Reordering**
  - Implement optimistic locking with version fields
  - Display refresh prompt if hierarchy changes during session

- **Permission Validation**
  - HR Manager role required for all operations
  - Department Manager can view own department only (in future phases)

- **Empty Department**
  - Allow deletion of empty departments
  - Show warnings when deleting departments with employees

---

## Testing Checklist

### Tree View Tests
- [ ] Tree view displays all departments in hierarchical structure
- [ ] Tree view nodes collapse correctly when clicked
- [ ] Tree view nodes expand correctly to show children
- [ ] Employee count displays correctly in badge
- [ ] Manager names display correctly beneath department
- [ ] Status indicators show correct colors (Active: green, Inactive: gray)
- [ ] Department codes display correctly (on hover or selected)
- [ ] Visual hierarchy lines connect parent to child departments
- [ ] Root departments display at top level
- [ ] Tree depth limits to 3 levels on initial load

### Search Tests
- [ ] Search by department name filters results (partial match)
- [ ] Search by department code filters results
- [ ] Search by manager name filters results
- [ ] Debounced search executes after 300ms of inactivity
- [ ] Search result count displays correctly
- [ ] Matching text highlights in search results
- [ ] Clear search button resets search field

### Filter Tests
- [ ] Status filter shows only selected status departments
- [ ] Manager filter shows departments with selected manager
- [ ] Parent department filter shows only children of selected dept
- [ ] Filter combinations work with AND logic
- [ ] Filter count badge shows correct number
- [ ] Clear all filters resets all active filters
- [ ] Filters persist during session (not across sessions)

### Table View Tests
- [ ] Table view displays all departments in rows
- [ ] Sort by Name column works (A→Z, Z→A)
- [ ] Sort by Code column works
- [ ] Sort by Manager column works
- [ ] Sort by Employee count column works (numeric sort)
- [ ] Sort by Status column works
- [ ] Pagination displays correct number of items per page
- [ ] Pagination navigation (next/previous/first/last) works
- [ ] Row-level edit button opens edit form
- [ ] Row-level delete button shows confirmation dialog
- [ ] Delete confirmed deletes department (if no children/employees)
- [ ] View details button opens department details

### View Toggle Tests
- [ ] Toggle between tree and table view works
- [ ] User preference for view mode persists in session
- [ ] Filters carry over when switching views
- [ ] Sort preferences apply in table view

### Action Button Tests
- [ ] Create department button navigates to creation form
- [ ] Edit department button opens edit form
- [ ] Delete button shows warning for departments with children
- [ ] Delete button shows warning for departments with employees
- [ ] View employees button navigates to employee list filtered by dept
- [ ] Assign manager button opens manager selector
- [ ] Export button generates file (PDF or CSV)
- [ ] Refresh button reloads department list from API
- [ ] Reorder button enables drag & drop in tree view

### Drag & Drop Tests
- [ ] Drag & drop reordering works between sibling departments only
- [ ] Cannot drag child department to unrelated hierarchy branch
- [ ] After reordering, display order updates correctly
- [ ] Cannot create circular hierarchy via drag & drop

### Quick View Tests
- [ ] Hovering on department shows quick view card/modal
- [ ] Quick view displays department name and code
- [ ] Quick view displays manager name and contact
- [ ] Quick view displays employee count
- [ ] Quick view displays description (first 150 chars)
- [ ] Quick view displays status
- [ ] Quick view displays creation date
- [ ] Quick view action buttons work (Edit, View Employees, etc.)

### State Tests
- [ ] Loading state displays skeleton loader while data loads
- [ ] Empty state displays when no departments exist
- [ ] Error state displays when API call fails
- [ ] Retry button in error state reloads data

### Responsive Design Tests
- [ ] Desktop layout displays correctly (1920x1080)
- [ ] Tablet layout displays correctly (768x1024)
- [ ] Mobile layout displays correctly (375x667)
- [ ] Tree view responsive on mobile (simplified or list view)
- [ ] Table view scrollable horizontally on mobile
- [ ] Filter panel collapsible on mobile

### Permission Tests
- [ ] Only HR Manager role can access page
- [ ] Non-HR users see access denied message
- [ ] Delete action requires confirmation from HR Manager

### Performance Tests
- [ ] Department list loads in <500ms (full hierarchy)
- [ ] Search query executes in <200ms
- [ ] Sorting performs in <300ms
- [ ] Tree node expansion executes in <150ms
- [ ] Export file generation completes in <5s
- [ ] Large hierarchy (1000+ departments) renders without crash

---

## Implementation Checklist

### Component Development
- [ ] Department tree view component (hierarchical display)
- [ ] Department table view component (tabular display)
- [ ] Tree node component (collapsible, expandable)
- [ ] Department row component (table row with actions)
- [ ] Search input component with debounce
- [ ] Filter section component (status, manager, parent dept)
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Quick view modal/card component
- [ ] Empty state component
- [ ] Loading state component (skeleton loader)
- [ ] Error state component
- [ ] View toggle button component

### Services & Utilities
- [ ] Drag & drop reordering service
- [ ] API client methods for all endpoints
- [ ] Hierarchy validation service
- [ ] Circular hierarchy detection service
- [ ] Search and highlight service
- [ ] Export service (PDF and CSV)
- [ ] Permission check service
- [ ] Debounce utility for search

### State Management
- [ ] View mode state (tree/table)
- [ ] Active filters state
- [ ] Search term state
- [ ] Sort field and direction state
- [ ] Pagination state (current page, page size)
- [ ] Loading state (initial load, searching)
- [ ] Error state and error messages
- [ ] Selected department state (for drill-down)
- [ ] User preferences (view mode, filters)

### UI/UX Implementation
- [ ] Responsive grid layout for page sections
- [ ] Collapsible filter panel
- [ ] Tree view visual hierarchy (indentation, lines)
- [ ] Color-coded status indicators
- [ ] Badge styling for counts and filters
- [ ] Icon library integration (edit, delete, expand, etc.)
- [ ] Hover effects and tooltips
- [ ] Responsive design breakpoints (desktop, tablet, mobile)

### Accessibility Implementation
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Screen reader support for tree view
- [ ] Semantic HTML structure
- [ ] Color contrast compliance (WCAG AA)
- [ ] Focus indicators for keyboard users
- [ ] Alt text for icons
- [ ] Dialog/modal accessibility

### Integration
- [ ] API client integration
- [ ] Authentication token handling
- [ ] Tenant context integration
- [ ] Error handling and user feedback
- [ ] Loading and success notifications

---

## Deployment Strategy

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review approved
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Accessibility audit completed
- [ ] Cross-browser testing completed

### Database Migration Strategy
- [ ] Create Department table with all columns and constraints
- [ ] Create indexes for performance optimization
- [ ] Add unique constraint on (tenant_id, code)
- [ ] Add check constraint for self-reference prevention
- [ ] Add foreign key constraints
- [ ] Run migration in staging environment first
- [ ] Verify data integrity post-migration
- [ ] Create rollback migration

### API Deployment Sequence
1. Deploy API endpoints (GET first, then POST/PATCH/DELETE)
2. Verify endpoints respond correctly
3. Test with sample data
4. Monitor error logs

### Frontend Deployment Sequence
1. Deploy in feature-toggle-disabled state
2. Verify page loads (without data if API not ready)
3. Enable feature toggle when API ready
4. Monitor for client errors

### Caching Strategy
- Cache full hierarchy tree (5-minute TTL)
- Cache individual department details (1-hour TTL)
- Invalidate cache on department create/update/delete
- Use Redis for distributed caching

### Feature Toggle
- Ability to disable department management feature
- Default: enabled in production
- Allow toggling per tenant

### Testing Environment
- Load test with 1000+ departments
- Performance test with concurrent requests
- Stress test export functionality

### Staff Training
- Show hierarchy navigation in tree view
- Demonstrate table view and sorting
- Explain search and filter options
- Show department creation and editing
- Demonstrate manager assignment
- Show reordering capability
- Demonstrate export functionality
- Explain permission requirements

### Rollback Plan
- Maintain feature toggle for quick disable
- Keep previous department list view accessible
- Database rollback scripts prepared
- Monitor for errors post-deployment
- 24-hour support team availability

---

## Performance Targets

### Response Time SLAs
- Department list API (full hierarchy): <500ms
- Department hierarchy retrieval (cached): <300ms
- Search query execution: <200ms
- Table render with pagination: <300ms
- Tree node expansion: <150ms
- Filter application: <250ms
- Export file generation: <5s (for 10,000 departments)

### Frontend Performance
- Initial page load: <2s (with cached hierarchy)
- Tree view scroll performance: 60 FPS
- Responsive UI interaction: <100ms

### Database Performance
- Hierarchy query with CTE: <200ms (1000 departments)
- Search query: <150ms
- Sort query: <200ms

### Caching Effectiveness
- Cache hit rate: >90% for common queries
- Average cache size: <50MB per 10,000 departments

---

## Monitoring & Alerting

### Metrics to Monitor
- Department list API response time (p50, p95, p99)
- Search query performance
- Export operation duration
- Tree view render time (frontend)
- API error rate (4xx, 5xx)
- Failed delete/reorder operations
- Hierarchy consistency checks

### Alerts to Configure
- API response time >500ms (threshold)
- Error rate >1% sustained for 5 minutes
- Failed hierarchy validation attempts
- Export failures (>2 in 1 hour)
- Reorder conflicts (concurrent updates)
- Circular hierarchy detection attempts

### Logging Points
- API request/response logging
- Search query logging (with duration)
- Delete operation logging (with reason)
- Reorder operation logging (with before/after state)
- Export request logging
- Permission check failures

### Dashboard Displays
- Real-time API response times
- Error rate and error types
- Department management operation frequency
- Search query patterns
- Export functionality usage
- Active users on department list page

---

## Documentation Requirements

### User Documentation
- **Department List Navigation Guide**
  - Overview of page layout
  - Tree view explanation
  - Table view explanation
  - How to switch between views

- **Search & Filter Guide**
  - Search field usage and syntax
  - Search result interpretation
  - Filter options and combinations
  - Clearing filters

- **Hierarchy Management Guide**
  - Understanding parent-child relationships
  - Department nesting levels
  - Viewing subordinate departments

- **Department Operations Guide**
  - Creating new departments
  - Editing department information
  - Deleting departments (with warnings)
  - Transferring employees during deletion

- **Manager Assignment Guide**
  - Assigning managers to departments
  - Viewing manager information
  - Manager responsibilities

- **Reordering Departments Guide**
  - Enabling reorder mode
  - Drag & drop mechanics
  - Saving reorder changes
  - Reverting changes

- **Export Guide**
  - Export options (PDF, CSV)
  - Export file contents
  - Using exported data

### Administrator Documentation
- API endpoint specifications
- Database schema documentation
- Caching strategy and configuration
- Feature toggle configuration
- Performance optimization tips
- Backup and recovery procedures

### Troubleshooting Guide
- Common issues and resolutions
- Permission troubleshooting
- API connectivity issues
- Performance issues
- Export failures
- Circular hierarchy prevention

---

## Future Enhancements

### Phase 2 Enhancements
- Department budget tracking and allocation
- Department performance metrics dashboard
- Department-level reporting
- Historical department structure tracking (audit trail)
- Department approval workflows (for creation/deletion)

### Phase 3 Enhancements
- Cost center integration and mapping
- Department-wise leave policies
- Department-wise salary structure
- Inter-department transfer workflows
- Department reporting dashboard with KPIs
- Org chart visualization improvements

### Advanced Features (Phase 4+)
- Multiple organizational hierarchies (location-based, project-based)
- Manager succession planning visualization
- Span of control analytics (reports per manager)
- Department size comparison analytics
- Real-time collaboration (multiple viewers)
- Mobile app for department management
- Department-wise approval workflows
- Integration with payroll for department expenses

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** In Development  
**Owner:** HR Module Team
