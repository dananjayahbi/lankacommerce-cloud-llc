# Feature Specification: Leave Calendar View (Document 63)

## Executive Summary

Leave calendar visualization providing comprehensive view of all employee leave patterns with analytics and leave balance tracking. This feature serves as the visual planning tool for HR and managers, displaying employee leave schedules across the organization with color-coded leave types, team coverage analysis, and leave balance information for strategic workforce planning and leave approval management.

---

## Current State

### Existing Functionality
- Leave calendar page partially implemented
- Calendar grid display basic
- Color-coded leave types partial
- Statistics panel incomplete
- Leave list partial
- Team view incomplete
- Leave approvals widget incomplete
- Export functionality missing
- Holiday integration incomplete
- Coverage analysis missing

### Gaps and Issues
- Calendar visualization incomplete
- Statistics calculation not comprehensive
- Team view not fully developed
- Export functionality missing
- Holiday/weekend handling incomplete
- Coverage analysis not implemented
- Performance optimization needed
- Mobile responsiveness limited

---

## Detailed Requirements

### Frontend Features

#### Employee Selector Section
- **Employee Selector (Required or Auto-populated)**:
  - Dropdown or search autocomplete
  - Search by employee name or ID
  - Show department name
  - Show designation
  - Option to select "All Employees" (if permission allows)
  - Current employee pre-selected if viewing own leaves

- **Department Selector (Optional)**:
  - Dropdown for team view
  - Lists all departments
  - Shows employee count per department
  - "All Departments" option

- **View Mode Toggle**:
  - Individual employee view (single calendar)
  - Team view (multiple employees in calendar)
  - Department view (entire department with multiple rows)

#### Date Period Selector
- **Month Selector**:
  - Calendar picker for month and year selection
  - Shows current month by default
  - Visual current day indicator

- **Quarter Selector**:
  - Dropdown: Q1, Q2, Q3, Q4
  - Year selector for multi-year selection

- **Year Selector**:
  - Numeric input or dropdown
  - Shows current year by default

- **Custom Date Range Selector**:
  - From date picker
  - To date picker
  - Validation: from <= to

- **Preset Options**:
  - "This Month" button
  - "Next Month" button
  - "This Quarter" button
  - "This Year" button
  - "All Time" button

- **Navigation Buttons**:
  - Previous period button (left arrow)
  - Next period button (right arrow)
  - Current date button (today)

#### Calendar View Section (Primary Display)

##### Month/Period Calendar Grid
- **Calendar Display**:
  - Month/period calendar grid layout
  - Day cells with date numbers
  - Seven-day week layout (Sun-Sat or Mon-Sun based on locale)
  - Month header with month name and year
  - Day of week headers

- **Leave Status Indicators**:
  - Color-coded by leave type:
    - Annual leave: Blue
    - Casual leave: Green
    - Sick leave: Yellow
    - Maternity leave: Pink
    - Paternity leave: Purple
    - Other types: Distinct colors (customizable)
  - Half-day indicator: Diagonal stripe pattern or different shading
  - Pending leave display: Hatched pattern or different opacity
  - Multi-day leave spanning: Visual line/bar connecting days
  - Hover on day shows details:
    - Leave type
    - Status (pending, approved, etc.)
    - Approver name
    - Employee name (if team view)
  - Click on day to view or edit leave (if permission allows)

- **Special Day Indicators**:
  - Weekend highlighting: Gray background or dimmed appearance
  - Holiday highlighting: Different color and indicator
  - Current date highlight: Border or circle around today

- **Calendar Navigation**:
  - Previous period button
  - Next period button
  - Today indicator on current date
  - Month/year display in header

- **Legend**:
  - Color key for leave types
  - Pattern key for statuses (pending, approved, etc.)
  - Holiday and weekend indicators
  - Half-day indication

#### Leave Statistics Panel
- **Location**: Side panel or above calendar (collapsible on mobile)

- **Current Period Metrics**:
  - Total leave days (in selected period)
  - Annual leave days used
  - Casual leave days used
  - Sick leave days used
  - Other leave days used
  - Pending leave days (awaiting approval)

- **Year-to-Date (YTD) Metrics**:
  - Annual leave balance (remaining)
  - Casual leave balance (remaining)
  - Sick leave balance (remaining)
  - Other leave balances
  - Leave carryover from previous year (if applicable)

- **Statistics Cards**:
  - Visual indicators (numbers and progress bars)
  - Color-coded by leave type
  - Comparison to annual allocation
  - Percentage utilization display

- **Progress Bars**:
  - Show leave usage as percentage of allocation
  - Color changes based on usage level:
    - Green: <70%
    - Yellow: 70-90%
    - Red: >90%

#### Leave List View
- **Location**: Below calendar or in separate tab
- **Table Display**:
  - Columns: Employee (if team view), Start Date, End Date, Leave Type, Duration, Status, Approver
  - Sortable by each column
  - Filterable by status and leave type
  - Clickable rows to view details
  - Pagination or infinite scroll

#### Team View Section (If Viewing Department)
- **Layout**:
  - Employee rows with individual mini calendars
  - Color-coded leave indicators per employee
  - Employee name in row header
  - Department identifier

- **Team Coverage**:
  - Total on leave per day counter
  - Availability percentage per day
  - Coverage status indicator

#### Quick Leave Request Modal
- **Trigger**: Click on calendar date
- **Components**:
  - Quick leave request form
  - Click on date to select start date
  - Click another date to select end date
  - Leave type selector
  - Reason field (optional for quick create)
  - Submit button
  - Cancel button

#### Leave Request Actions
- **Buttons in Detail View**:
  - Request new leave button (primary CTA)
  - View leave details button (for selected leave)
  - Edit leave button (if pending, opens edit form)
  - Cancel leave button (if approved)

#### Export & Print Functions
- **Export Calendar Button**:
  - CSV format option
  - PDF format option
  - Excel format option
  - ICS (calendar format) option
  - Select date range for export

- **Print Calendar Button**:
  - Print-optimized layout
  - Includes legend
  - Color prints correctly
  - Multiple-page handling for large periods

#### Leave Approvals Section (If User is Approver)
- **Pending Approvals Badge**:
  - Count of pending approvals
  - Badge on header or sidebar

- **Quick Approval Actions**:
  - Approve button (from calendar)
  - Reject button with reason modal
  - View details button

- **Approval Notifications**:
  - Alert for pending approvals
  - Email digest option

#### Team Coverage Analysis (Optional)
- **Section**: Separate collapsible panel or dashboard tab
- **Coverage Stats**:
  - Which positions/teams are understaffed
  - Critical role availability
  - Backup/substitute coverage
  - Daily coverage percentage

- **Recommendations**:
  - Suggest leave approvals based on coverage
  - Alert on critical role leave
  - Substitute assignment recommendations

#### State Management
- **Loading State**: Skeleton loader for calendar and statistics
- **Empty State**: Message when no leave data exists
- **Error State**: Error message with retry option

---

## Backend API Requirements

### Endpoints

#### GET /api/hr/leave-requests/calendar/
Get leave calendar data for visualization.

**Query Parameters:**
- `employee_id` (integer, optional): Individual employee leave
- `department_id` (integer, optional): Department team view
- `date_from` (date): Period start
- `date_to` (date): Period end
- `view_mode` (string): individual, team, department

**Response:**
```json
{
  "leaves": [
    {
      "id": 1,
      "date": "2026-06-01",
      "leave_type": "annual",
      "status": "approved",
      "employee_id": 5,
      "employee_name": "John Doe",
      "approver_name": "Jane Smith",
      "is_half_day": false,
      "duration_days": 5
    }
  ],
  "statistics": {
    "total_leave_days": 12,
    "annual_leave_days": 8,
    "casual_leave_days": 2,
    "sick_leave_days": 2,
    "pending_leave_days": 1
  },
  "holidays": [
    {
      "date": "2026-06-15",
      "name": "Mid-Year Holiday"
    }
  ]
}
```

#### GET /api/hr/employee/{id}/leave-balance-summary/
Get employee leave balance summary.

**Query Parameters:**
- `year` (integer, optional): Defaults to current year

**Response:**
```json
{
  "employee_id": 5,
  "year": 2026,
  "leave_balances": {
    "annual": {
      "total_allocated": 20,
      "used": 5,
      "pending": 2,
      "balance": 13,
      "carryover": 2
    },
    "casual": {
      "total_allocated": 10,
      "used": 3,
      "pending": 1,
      "balance": 6,
      "carryover": 0
    }
  }
}
```

#### GET /api/hr/leave-types/
Get leave types with color codes.

**Response:**
```json
{
  "leave_types": [
    {
      "id": 1,
      "name": "Annual Leave",
      "color_code": "#3498db"
    },
    {
      "id": 2,
      "name": "Casual Leave",
      "color_code": "#2ecc71"
    },
    {
      "id": 3,
      "name": "Sick Leave",
      "color_code": "#f39c12"
    }
  ]
}
```

#### GET /api/hr/holidays/
Get holidays for period.

**Query Parameters:**
- `date_from` (date): Period start
- `date_to` (date): Period end

**Response:**
```json
{
  "holidays": [
    {
      "date": "2026-06-15",
      "name": "Mid-Year Holiday",
      "description": "Organizational holiday"
    }
  ]
}
```

#### GET /api/hr/leave-requests/team-coverage/
Get team coverage analysis.

**Query Parameters:**
- `department_id` (integer): Department ID
- `date_from` (date): Period start
- `date_to` (date): Period end

**Response:**
```json
{
  "coverage_stats": {
    "date": "2026-06-01",
    "total_employees": 20,
    "on_leave": 3,
    "coverage_percentage": 85,
    "critical_roles_on_leave": 0,
    "understaffed_positions": []
  }
}
```

#### GET /api/hr/leave-requests/pending-approvals/
Get pending approvals (if user is approver).

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "employee_name": "John Doe",
      "start_date": "2026-06-01",
      "end_date": "2026-06-03",
      "leave_type": "annual",
      "days": 3,
      "status": "pending",
      "created_at": "2026-05-28T10:00:00Z"
    }
  ]
}
```

#### POST /api/hr/leave-requests/calendar-export/
Export calendar data.

**Query Parameters:**
- `format` (string): pdf, ics, excel, csv
- `employee_id` (integer, optional): Individual employee
- `department_id` (integer, optional): Department
- `date_from` (date): Export start
- `date_to` (date): Export end

**Response**: File stream (binary)

#### GET /api/hr/employees/{id}/
Get employee details.

**Response:**
```json
{
  "id": 5,
  "name": "John Doe",
  "email": "john@example.com",
  "department_id": 3,
  "department_name": "Sales",
  "designation": "Sales Executive"
}
```

#### GET /api/hr/departments/
Get department list.

**Response:**
```json
{
  "departments": [
    {
      "id": 1,
      "name": "Sales",
      "employee_count": 10
    },
    {
      "id": 2,
      "name": "HR",
      "employee_count": 5
    }
  ]
}
```

---

## Database Requirements

### LeaveRequest Model (Full)
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `employee_id` (Foreign Key to Employee)
- `start_date` (Date)
- `end_date` (Date)
- `leave_type` (Foreign Key to LeaveType)
- `days` (Integer)
- `status` (String: pending, approved, rejected, cancelled)
- `approver_id` (Foreign Key to Employee, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### LeaveType Model
- `id` (Primary Key)
- `name` (String)
- `color_code` (String, hex color)
- `description` (Text, optional)
- `is_active` (Boolean)

### Holiday Model
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `date` (Date)
- `name` (String)
- `description` (Text, optional)
- `is_company_wide` (Boolean)
- `department_id` (Foreign Key, optional)

### Optimized Indexes
- `(tenant_id, employee_id, start_date, end_date)` for calendar queries
- `(tenant_id, status, start_date)` for status filtering
- `(tenant_id, department_id, start_date)` for team view

---

## Validation & Edge Cases

### Employee Validation
- Employee must be active or show terminated employees grayed out
- Access control: Users can only view their own or team leaves (unless admin)

### Date Range Validation
- From date <= to date validation
- Calendar display for different fiscal years

### Calendar Display
- Overlapping leaves display correctly
- Weekend/holiday handling in calculations
- Part-time employees (different working days)
- Employees with mid-year leaves (truncated calendar)
- New employees (no leave balance yet)
- Terminated employees (final leave data visible but grayed out)
- Multi-department team view handling

### Business Logic
- Leave balance calculations must be accurate
- Coverage analysis must reflect reality
- Pending leaves must be included in balance calculations

---

## Testing Checklist

### Employee & Department Selection
- [ ] Employee selector works
- [ ] Employee selector filters on search
- [ ] Department selector works (if team view)
- [ ] View mode toggle works (individual/team/department)
- [ ] Current employee pre-selected

### Date Period Selection
- [ ] Date period selector works (month/quarter/year)
- [ ] Preset date options work
- [ ] Custom date range works
- [ ] Month selector works
- [ ] Quarter selector works
- [ ] Year selector works
- [ ] Previous/Next navigation works
- [ ] Today button works

### Calendar Display
- [ ] Calendar displays correct dates
- [ ] Calendar grid layout correct (7-day weeks)
- [ ] Month/year header displays
- [ ] Day of week headers display
- [ ] Leave indicators display correctly (color-coded)
- [ ] Half-day indicators display correctly
- [ ] Pending leave display (different pattern)
- [ ] Multi-day leave spans correctly across dates

### Holiday & Weekend Handling
- [ ] Weekend highlighting shows
- [ ] Holiday highlighting shows
- [ ] Holiday names display in legend
- [ ] Holidays excluded from working days (if applicable)
- [ ] Weekends excluded from working days (if applicable)

### Interaction & Navigation
- [ ] Hover on day shows leave details
- [ ] Click on day shows leave details
- [ ] Click on leave opens details modal
- [ ] Calendar navigation (previous/next) works
- [ ] Today indicator displays
- [ ] Legend explains colors correctly
- [ ] Legend explains patterns correctly

### Statistics Display
- [ ] Annual leave balance calculates correctly
- [ ] Casual leave balance calculates correctly
- [ ] Sick leave balance calculates correctly
- [ ] Pending leave days count correct
- [ ] YTD metrics display correctly
- [ ] Period metrics display correctly
- [ ] Progress bars show usage correctly
- [ ] Progress bar colors change based on usage
- [ ] Carryover display correct

### Leave List View
- [ ] Leave list table displays correctly
- [ ] Table shows leaves in calendar period
- [ ] Table sortable by each column
- [ ] Table filterable by status and type
- [ ] Row click opens leave details
- [ ] Pagination works (if applicable)

### Team View (If Applicable)
- [ ] Team view shows multiple employees
- [ ] Each employee has mini calendar
- [ ] Employee names display in row headers
- [ ] Color coding consistent across team
- [ ] Total on leave per day displays
- [ ] Availability status displays
- [ ] Team coverage percentage shows

### Leave Actions
- [ ] Request new leave button works
- [ ] View leave details button works
- [ ] Edit leave opens form (if pending)
- [ ] Cancel leave button works (if approved)
- [ ] Quick leave form works on click
- [ ] Quick leave form calculates correctly

### Export & Print
- [ ] Export calendar button works
- [ ] CSV export generates correct file
- [ ] PDF export generates correct file
- [ ] Excel export generates correct file
- [ ] ICS export generates correct file
- [ ] Print calendar button works
- [ ] Print layout optimized

### Pending Approvals (If Approver)
- [ ] Pending approvals badge displays (if approver)
- [ ] Badge shows correct count
- [ ] Quick approval actions work (if approver)
- [ ] Approve from calendar works
- [ ] Reject from calendar works

### Team Coverage Analysis
- [ ] Team coverage analysis displays
- [ ] Coverage recommendations display
- [ ] Understaffed positions identified
- [ ] Critical role alerts display

### State Management
- [ ] Loading state shows skeleton
- [ ] Empty state displays (no data)
- [ ] Error state displays with retry
- [ ] Data refreshes on period change
- [ ] Data refreshes on employee change

### Responsive Design
- [ ] Calendar displays on mobile
- [ ] Calendar displays on tablet
- [ ] Calendar displays on desktop
- [ ] Statistics panel collapses on mobile
- [ ] All buttons accessible on mobile
- [ ] Date pickers work on mobile
- [ ] Swipe navigation works on mobile

---

## Implementation Checklist

### Page Components
- [ ] Leave calendar page component
- [ ] Calendar visualization component (month view)
- [ ] Employee/department selector component
- [ ] View mode toggle component
- [ ] Date period selector component
- [ ] Navigation buttons component

### Display Components
- [ ] Leave statistics panel component
- [ ] Leave list table component
- [ ] Team view component with mini calendars
- [ ] Leave approvals widget
- [ ] Coverage analysis component
- [ ] Color-coded leave indicators
- [ ] Half-day pattern indicators
- [ ] Legend component

### Modal & Forms
- [ ] Quick leave request modal
- [ ] Leave details modal
- [ ] Approval/rejection modal

### Services & Utilities
- [ ] Calendar data retrieval service
- [ ] Leave balance calculation service
- [ ] Team coverage analysis service
- [ ] Holiday lookup service
- [ ] Leave type service (with colors)
- [ ] Export service (PDF, ICS, Excel, CSV)
- [ ] Print service
- [ ] Date utilities (weekends, holidays)

### API Integration
- [ ] API client methods for all endpoints
- [ ] Request/response handling
- [ ] Error handling and transformation
- [ ] Caching for leave types and holidays
- [ ] Loading state management

### State Management
- [ ] Employee selection state
- [ ] Department selection state
- [ ] View mode state
- [ ] Date period state
- [ ] Statistics state
- [ ] Leave data state
- [ ] Pending approvals state

### Responsive & Accessibility
- [ ] Responsive layout for all screen sizes
- [ ] Mobile calendar view
- [ ] ARIA labels for screen readers
- [ ] Keyboard navigation support
- [ ] Color contrast compliance
- [ ] Print stylesheet

---

## Deployment Strategy

### Pre-Deployment
- API deployment: All GET endpoints live and performant
- Database optimization: Create indexes for date range and employee queries
- Caching: Cache leave types, holidays, and employee leaves
- Testing: Test with various date ranges, departments, and employee counts
- Performance profiling: Ensure targets met

### Testing
- Load test with 1000+ employees
- Load test with 5+ years of leave data
- Concurrent access testing
- Different browser testing
- Mobile device testing

### Training & Rollout
- Staff training: Calendar navigation
- Staff training: Statistics interpretation
- Staff training: Team view usage
- Staff training: Export functionality
- FAQ documentation

### Rollback Plan
- Maintain previous leave calendar
- Database rollback procedures documented
- Feature toggle allows quick disable

---

## Performance Targets

- Calendar page load: <500ms
- Calendar render: <300ms
- Statistics calculation: <200ms
- Team view render: <500ms (for 50+ employees)
- Department view render: <1s (for 100+ employees)
- Export generation: <5s (for full year)
- Print generation: <3s
- API response: <300ms
- Cell interaction response: <100ms

---

## Monitoring & Alerting

### Key Metrics
- Track calendar page load time
- Monitor statistics calculation performance
- Alert on export failures
- Track calendar rendering issues
- Monitor team view performance with large datasets
- Track API latency by endpoint

### Alerts
- Alert if page load exceeds 600ms
- Alert if statistics calculation exceeds 300ms
- Alert on export failures
- Alert on rendering performance issues
- Alert on API timeout

---

## Documentation Requirements

### User Documentation
- Leave calendar navigation guide
- Color-coding explanation document
- Statistics interpretation guide
- Team view usage guide
- Export and print guide
- Date range selection guide
- Leave type explanations
- Quick leave request guide
- Pending approvals guide
- Coverage analysis interpretation
- FAQ and troubleshooting

---

## Future Enhancements

### Mobile & User Experience
- Mobile leave calendar app
- Responsive design improvements
- Touch gesture support (swipe calendar)
- Offline mode for calendar view

### Analytics & Reporting
- Leave analytics dashboard
- Predictive leave pattern analysis
- Historical leave comparison
- Department-level leave trends

### Automation & Intelligence
- AI-powered leave recommendations
- Automatic substitute assignment
- Team coverage recommendations
- Auto-approval based on coverage

### Integration & Connectivity
- Integration with personal calendars (Google, Outlook)
- SMS/email leave notifications
- Leave policy enforcement visualization
- Compliance reporting (labor law hours)

### Advanced Features
- Carryover deadline alerts
- Multi-year leave comparison
- Advanced filtering (job role, critical roles)
- Bulk leave operations (approve multiple from calendar)
- Leave transfer between employees
- Leave buy/sell functionality

---

## Success Criteria

✅ Leave calendar page fully functional
✅ All date navigation options working
✅ Calendar visualization accurate
✅ Statistics calculations correct
✅ Team view displaying properly
✅ Export functionality working
✅ Performance targets met
✅ User acceptance testing passed
✅ Staff trained on calendar features
✅ Mobile experience optimized
✅ No data accuracy issues
