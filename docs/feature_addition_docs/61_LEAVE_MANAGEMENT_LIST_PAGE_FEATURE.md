# Feature Specification: Leave Management List Page (Document 61)

## Executive Summary

Leave requests management interface enabling HR personnel to review, approve, and reject employee leave requests with comprehensive filtering and status tracking. This page serves as the central hub for managing all employee leave requests within the organization, providing efficient tools for HR teams to handle leave approvals, rejections, and cancellations while maintaining clear visibility of all leave-related activities.

---

## Current State

### Existing Functionality
- Basic leave requests list page partially implemented
- Leave table display working
- Search by employee working
- Filter by status working
- Leave type filtering partial
- Date range filtering partial
- Approver filtering incomplete
- Sorting partially implemented
- Pagination working
- Approval/rejection workflow incomplete
- Bulk operations incomplete
- Statistics calculation incomplete
- Cancel leave functionality incomplete

### Gaps and Issues
- Incomplete approval/rejection workflow
- Missing bulk operation capabilities
- Statistics dashboard not fully functional
- Cancellation workflow not properly implemented
- Limited filtering options
- Incomplete sorting capabilities
- Missing visual status indicators
- Export functionality not implemented

---

## Detailed Requirements

### Frontend Features

#### Data Table Display
- **Responsive, sortable, filterable table** with the following columns:
  - Employee (name and ID)
  - Start Date
  - End Date
  - Type (leave type with color-coding)
  - Days (duration in days)
  - Status (with color-coded badge)
  - Approver (name or "pending if awaiting approval")
  - Created Date
- **Row selection checkboxes** for bulk operations
- **Click on row** to view leave details in modal
- **Status badge indicators** with color-coding:
  - Pending: Orange/Yellow
  - Approved: Green
  - Rejected: Red
  - Cancelled: Gray
- **Leave type display** with color-coding for different types (annual, casual, sick, maternity, etc.)
- **Sortable columns** (click to sort ascending/descending)

#### Search Functionality
- **Multi-field search**:
  - Search by employee name
  - Search by employee ID
- **Debounced real-time search** (500ms debounce)
- Real-time result update as user types

#### Filter Section
- **Collapsible filter panel**:
  - Employee selector/filter (dropdown or multi-select)
  - Leave type filter (multi-select)
  - Status filter (pending, approved, rejected, cancelled)
  - Date range filter (from/to date pickers for leave start date)
  - Approver filter (dropdown of managers/approvers)
  - Department filter (optional)
  - Filter count badge showing active filters
  - "Clear all filters" button for quick reset

#### Sort Options
- **Sort by**: Employee, Start Date, End Date, Type, Status, Created Date
- **Sort direction**: Ascending/Descending
- **Default sort**: By start date descending (upcoming leaves first)

#### Pagination Controls
- Page size selector (10, 25, 50, 100 rows per page)
- Previous/Next navigation buttons
- Page number input (jump to specific page)
- Total records count display
- Current page indicator

#### Approval Actions
- **Bulk action toolbar** (appears when rows selected):
  - Bulk approve button (approve all selected leaves)
  - Bulk reject button (reject all selected with reason)
  - Bulk cancel button (cancel all selected)
- **Quick action buttons** (per row):
  - Approve button (single approval, opens confirmation modal)
  - Reject button (single rejection, opens reason modal)
  - View details button (opens leave details modal)
  - Edit button (if pending, allows editing leave request)
  - Cancel button (if approved, allows cancellation with reason)

#### Primary Actions
- **New leave request button** (primary CTA, opens leave creation form)
- **View leave calendar button** (navigate to leave calendar view)

#### Leave Statistics Section
Display above the table:
- Total pending requests
- Total approved (this month)
- Total rejected (this month)
- Total employees on leave (today)
- Employees on leave tomorrow
- Upcoming leave count (next 7 days)

#### Additional Controls
- Refresh button (reload leave requests data)
- Export leave list button (CSV, Excel, PDF)

#### State Management
- Loading state with skeleton loader
- Empty state when no leave requests exist
- Error state with error message and retry option

---

## Backend API Requirements

### Endpoints

#### GET /api/hr/leave-requests/
List leave requests with filters, search, sorting, pagination.

**Query Parameters:**
- `search` (string): Search term for employee name/ID
- `employee_id` (integer): Filter by employee
- `leave_type` (string): Filter by leave type
- `status` (string): Filter by status
- `date_from` (date): Filter by leave start date (from)
- `date_to` (date): Filter by leave start date (to)
- `approver_id` (integer): Filter by approver
- `department_id` (integer): Filter by department
- `page` (integer): Page number (default: 1)
- `page_size` (integer): Records per page (default: 25)
- `ordering` (string): Sort field and direction (e.g., "-start_date")

**Response:**
```json
{
  "count": 150,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "employee_id": 5,
      "employee_name": "John Doe",
      "start_date": "2026-06-01",
      "end_date": "2026-06-05",
      "leave_type": "annual",
      "days": 5,
      "status": "approved",
      "approver_id": 2,
      "approver_name": "Jane Smith",
      "created_at": "2026-05-20T10:30:00Z",
      "created_by": 5
    }
  ]
}
```

#### GET /api/hr/leave-requests/{id}/
Retrieve leave request details.

#### PATCH /api/hr/leave-requests/{id}/
Update leave request.

#### POST /api/hr/leave-requests/{id}/approve/
Approve leave request.

**Request Body:**
```json
{
  "approval_comment": "Approved"
}
```

#### POST /api/hr/leave-requests/{id}/reject/
Reject leave request.

**Request Body:**
```json
{
  "rejection_reason": "Reason for rejection"
}
```

#### POST /api/hr/leave-requests/{id}/cancel/
Cancel leave request.

**Request Body:**
```json
{
  "cancellation_reason": "Reason for cancellation"
}
```

#### POST /api/hr/leave-requests/bulk-approve/
Bulk approve leave requests.

**Request Body:**
```json
{
  "leave_request_ids": [1, 2, 3],
  "comment": "Bulk approved"
}
```

#### POST /api/hr/leave-requests/bulk-reject/
Bulk reject leave requests.

**Request Body:**
```json
{
  "leave_request_ids": [1, 2, 3],
  "reason": "Bulk rejection reason"
}
```

#### GET /api/hr/leave-requests/statistics/
Get leave statistics.

**Response:**
```json
{
  "pending_count": 5,
  "approved_this_month": 20,
  "rejected_this_month": 3,
  "on_leave_today": 8,
  "on_leave_tomorrow": 6,
  "upcoming_7_days": 12
}
```

#### GET /api/hr/employees/
Get employee list for filtering.

#### GET /api/hr/departments/
Get department list for filtering.

---

## Database Requirements

### LeaveRequest Model
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `employee_id` (Foreign Key to Employee)
- `start_date` (Date)
- `end_date` (Date)
- `leave_type` (String, choices: annual, casual, sick, maternity, paternity, other)
- `days` (Integer, auto-calculated)
- `reason` (Text)
- `status` (String, choices: pending, approved, rejected, cancelled)
- `approver_id` (Foreign Key to Employee, nullable)
- `approval_comment` (Text, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `created_by` (Foreign Key to User)
- `cancelled_by` (Foreign Key to User, nullable)
- `cancelled_reason` (Text, nullable)

### Indexes
- `(tenant_id, employee_id, status)`
- `(tenant_id, status, start_date)`
- `(tenant_id, approver_id, status)`
- `(employee_id, start_date, end_date)`

---

## Validation & Edge Cases

### Date Validation
- End date must be after start date
- Leave dates cannot be in past (for future leaves)
- Leave dates cannot overlap with existing approved leave
- Leave duration calculation must account for weekends/holidays if configured

### Business Logic Validation
- Available leave balance must be sufficient
- Only manager/approver can approve leaves
- Cannot cancel leave after it has started (or within X configured days)
- Overlapping leave requests (same employee) must be detected
- Concurrent leave approvals (race condition) must be handled
- Permission validation (approver access) required

### Leave Workflow Validation
- Leave balance deduction on approval
- Rehire scenario (leave balance reset)
- Leave year boundary handling
- Mid-year join (prorated leave balance)

---

## Testing Checklist

### Table Display & Columns
- [ ] Table renders all columns correctly
- [ ] All leave request records display properly
- [ ] Column widths are appropriate and responsive

### Search Functionality
- [ ] Search by employee name finds matching requests
- [ ] Search by employee ID finds requests
- [ ] Debounced search works correctly (no excessive API calls)
- [ ] Empty search results display appropriately
- [ ] Search is case-insensitive

### Filter Functionality
- [ ] Leave type filter shows correct types
- [ ] Status filter shows correct statuses
- [ ] Date range filter validates correctly
- [ ] Approver filter populated with approvers
- [ ] Department filter populated with departments
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Clear filters resets all filters
- [ ] Filter count badge updates correctly

### Sorting
- [ ] Sorting by Employee column works (ascending/descending)
- [ ] Sorting by Start Date works
- [ ] Sorting by End Date works
- [ ] Sorting by Type works
- [ ] Sorting by Status works
- [ ] Sorting by Created Date works
- [ ] Default sort (start date descending) applies

### Pagination
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows displayed
- [ ] Page size options (10, 25, 50, 100) work
- [ ] Previous/Next buttons work
- [ ] Page jump works
- [ ] Total records count displays correctly
- [ ] Current page indicator shows correct page

### Row Selection & Bulk Operations
- [ ] Bulk select checkbox works
- [ ] Individual row checkboxes work
- [ ] Selecting all works
- [ ] Deselecting all works
- [ ] Bulk approve approves all selected
- [ ] Bulk reject rejects all selected with reason
- [ ] Bulk cancel cancels all selected with reason
- [ ] Bulk operation toolbar appears/disappears appropriately

### Individual Row Actions
- [ ] Approve button opens confirmation modal
- [ ] Reject button opens reason modal
- [ ] View details button opens leave details modal
- [ ] Edit button opens edit form (if pending)
- [ ] Cancel button opens cancellation form (if approved)
- [ ] Single approval works and updates status
- [ ] Single rejection works and updates status
- [ ] Cancellation works correctly

### Status & Visual Indicators
- [ ] Status badges display correctly (color-coded)
- [ ] Leave type color-coding displays correctly
- [ ] Pending status shows orange/yellow badge
- [ ] Approved status shows green badge
- [ ] Rejected status shows red badge
- [ ] Cancelled status shows gray badge

### Statistics Display
- [ ] Statistics panel displays correctly
- [ ] Total pending requests count accurate
- [ ] Total approved (this month) accurate
- [ ] Total rejected (this month) accurate
- [ ] Total employees on leave (today) accurate
- [ ] Employees on leave tomorrow count accurate
- [ ] Upcoming leave count (next 7 days) accurate

### State Management
- [ ] Empty state displays correctly (no data)
- [ ] Error state displays correctly with error message
- [ ] Loading state shows skeleton loader
- [ ] Refresh button works and reloads data

### Export Functionality
- [ ] Export button visible
- [ ] CSV export works
- [ ] Excel export works
- [ ] PDF export works
- [ ] Exported files contain correct data

### Responsive Design
- [ ] Table responsive on mobile
- [ ] Table responsive on tablet
- [ ] Table responsive on desktop
- [ ] Filters collapse on small screens
- [ ] All buttons accessible on mobile

---

## Implementation Checklist

### Component Structure
- [ ] Leave requests table component with all columns
- [ ] Search input with debounce implementation
- [ ] Filter section component (employee, leave type, status, date range, approver, department)
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Bulk action toolbar component
- [ ] Row selection checkboxes implementation
- [ ] Quick action buttons (approve, reject, view, edit, cancel)

### Modals & Forms
- [ ] Approval modal component with confirmation
- [ ] Rejection modal component with reason input
- [ ] Cancellation modal component with reason input
- [ ] Leave details modal component

### Data & Display
- [ ] Statistics calculation component
- [ ] Leave type color-coding system
- [ ] Status badge component
- [ ] Date formatting utilities

### API Integration
- [ ] API client methods for all endpoints
- [ ] Request/response handling
- [ ] Error handling and display
- [ ] Loading state management

### State Management
- [ ] Filter state management
- [ ] Search state management
- [ ] Sort state management
- [ ] Pagination state management
- [ ] Selection state management

### UI States
- [ ] Loading state with skeleton loader
- [ ] Error state with error message
- [ ] Empty state with appropriate message
- [ ] Success notification on actions

### Features
- [ ] Export service (CSV, Excel, PDF)
- [ ] Bulk operation handlers
- [ ] Permission checks (approver validation)

### Responsive & Accessibility
- [ ] Responsive design for all screen sizes
- [ ] ARIA labels for screen readers
- [ ] Keyboard navigation support
- [ ] Color contrast compliance

---

## Deployment Strategy

### Pre-Deployment
- API deployment: GET endpoint live and performant
- Database migration: Ensure indexes in place
- Caching: Cache employee, department, and leave type lists
- Feature toggle: Can disable leave management if needed

### Testing
- Load test with 10,000+ leave requests
- Performance testing with various filter combinations
- Concurrent approval testing

### Training & Rollout
- Staff training: Show approval workflow, filtering, bulk operations
- Documentation: Prepare user guides and FAQs

### Rollback Plan
- Maintain previous leave list implementation
- Database rollback procedures documented
- Feature toggle allows quick disable

---

## Performance Targets

- Leave requests list API: <500ms (page_size=25)
- Search query: <200ms (debounced)
- Statistics calculation: <300ms
- Bulk operations: <2s (per 100 requests)
- Table render: <300ms
- Export generation: <5s (for 5,000 records)
- Page load: <1s total

---

## Monitoring & Alerting

### Key Metrics
- Track leave requests list API latency
- Monitor approval workflow completion time
- Alert on rejected leaves (notify employee)
- Monitor leave balance sync
- Track filter usage patterns

### Alerts
- Alert if API latency exceeds 500ms
- Alert if approval workflow takes >5 minutes
- Alert on bulk operation failures
- Alert on permission errors

---

## Documentation Requirements

### User Documentation
- Leave requests list navigation guide
- Leave type explanations
- Search and filter tips
- Date range filtering guide
- Approval workflow guide
- Rejection and cancellation guide
- Statistics interpretation
- Troubleshooting guide
- Export functionality guide

---

## Future Enhancements

### Workflow Improvements
- Auto-approval based on policy
- Leave balance forecasting
- Leave carryover automation
- Batch leave requests
- Leave substitute assignment

### Mobile & Notifications
- Mobile leave request interface
- WhatsApp leave notifications
- SMS leave status updates
- Push notifications

### Integration & Automation
- Leave calendar sync (Google Calendar, Outlook)
- Attendance integration for leave days
- Email digest of pending approvals
- Automated leave policy enforcement
- Leave analytics and reporting

### Advanced Features
- AI-powered leave pattern analysis
- Compliance reporting
- Multi-level approval workflows
- Leave policy templates
- Department coverage planning

---

## Success Criteria

✅ Leave requests list page fully functional
✅ All filtering and search features working
✅ Bulk approval/rejection operations available
✅ Performance targets met
✅ User acceptance testing passed
✅ Staff trained on new functionality
✅ Zero data loss during migration
