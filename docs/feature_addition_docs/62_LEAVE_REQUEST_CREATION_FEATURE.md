# Feature Specification: Leave Request Creation (Document 62)

## Executive Summary

Leave request creation form enabling employees to submit leave requests with automatic balance validation and management approval workflow. This feature provides a user-friendly interface for employees to request leave while ensuring compliance with organizational policies, automatic calculation of leave duration, and enforcement of available leave balance constraints. The workflow integrates with the approval system to enable smooth leave request processing.

---

## Current State

### Existing Functionality
- Basic leave request form partially implemented
- Employee selector working
- Leave type selector working
- Date pickers partially working
- Duration calculation partial
- Available balance display incomplete
- Reason field working
- Document upload incomplete
- Form validation incomplete
- Notification preferences incomplete

### Gaps and Issues
- Incomplete date picker functionality
- Missing duration calculation
- Incomplete balance validation
- Document upload not fully implemented
- Form validation needs enhancement
- Notification preferences not functional
- Missing overlap detection
- Incomplete error messaging

---

## Detailed Requirements

### Frontend Features

#### Form Header
- Title: "Request Leave" or "Create Leave Request"
- Subtitle indicating form purpose
- Save progress indicator (optional)

#### Leave Information Section

##### Employee Selector
- **Optional if current employee** submitting own leave request
- **Required if HR** creating leave for another employee
- Search by employee name or ID
- Show additional information:
  - Department
  - Designation
  - Available leave balance
  - Active status indicator
- Dropdown or autocomplete component
- Default to current employee if applicable

##### Leave Type Selector
- **Required field** with visual indicator
- Dropdown/select component
- Available options:
  - Annual leave
  - Casual leave
  - Sick leave
  - Maternity leave
  - Paternity leave
  - Other (configurable types)
- Dynamic display of available balance for selected type
- Color-coded leave type display
- Help text explaining each leave type

##### Leave Duration Section
- **Start Date Picker (Required)**:
  - Calendar component
  - Cannot select past dates (configurable)
  - Show calendar with holidays/weekends highlighted in different color
  - Cannot select dates with overlapping approved leave
  - Visual warning if date has existing leave
  - Clear date button
  - Today button for quick selection

- **End Date Picker (Required)**:
  - Must be after start date (enforced)
  - Calendar component with same features as start date
  - Cannot select dates with overlapping approved leave
  - Visual warning if date has existing leave
  - Clear date button

- **Duration in Days Display (Read-Only)**:
  - Auto-calculated field
  - Calculated as: excluding weekends/holidays if configured
  - Display format: "X working days" or "X calendar days"
  - Updates in real-time as dates change
  - Shows calculation methodology hint

- **Available Leave Balance Display (Read-Only)**:
  - Shows remaining balance for selected leave type
  - Shows year-to-date usage
  - Shows total allocated for the year
  - Red highlight if insufficient balance
  - Warning message: "Insufficient leave balance"
  - Breakdown by month/period (optional)

- **Half-Day Toggle (Optional)**:
  - Toggle for first day half-day option
  - Toggle for last day half-day option
  - Recalculate duration on toggle
  - Visual indication when half-day selected
  - Only appears for applicable leave types

#### Leave Reason Section
- **Reason/Description Field (Required)**:
  - Text area component
  - Maximum 500 characters with counter
  - Placeholder text: "Enter reason for leave request"
  - Mandatory field indicator
  - Character count display

- **Additional Details Field (Optional)**:
  - Text area component
  - Additional information or context
  - No character limit
  - Collapsible or expandable

- **Document Upload Section (Optional, for specific leave types)**:
  - File upload field (appears for sick leave, medical leaves)
  - Allowed file types: PDF, JPG, PNG
  - Max file size display: "Max 5MB"
  - Drag-and-drop support
  - File preview
  - Multiple file upload capability
  - File validation messages

#### Notification Preferences Section (Optional)
- **Email Notification Checkbox**:
  - Default: checked (on)
  - Label: "Notify via Email"

- **SMS Notification Checkbox**:
  - Default: checked (on) if phone provided
  - Label: "Notify via SMS"

- **WhatsApp Notification Checkbox**:
  - Default: unchecked (off)
  - Label: "Notify via WhatsApp"

#### Form Validation
- **Required field indicators** (red asterisk)
- **Real-time validation feedback**:
  - Highlight invalid fields in red
  - Show validation error messages inline
- **Insufficient balance warning** (red highlight)
- **Overlapping leave warning** (yellow highlight)
- **Holiday/weekend notification** (informational)
- **Error summary at top** of form listing all validation errors
- **Start date cannot be in past** warning/error

#### Form Buttons
- **Submit Leave Request** (Primary button):
  - Label: "Submit Leave Request"
  - Saves and returns to leave list
  - Shows loading state during submission
  - Disabled if form invalid

- **Submit and Create Another** (Secondary button):
  - Label: "Submit and Create Another"
  - Saves and opens new form
  - Useful for HR creating multiple requests

- **Cancel** (Tertiary button):
  - Label: "Cancel"
  - Shows unsaved changes warning modal
  - Returns to previous page/list

- **Save as Draft** (Optional):
  - Label: "Save as Draft"
  - Only if drafts are supported
  - Stores incomplete form for later completion

#### Approval Information Display
- **Approver Information Section**:
  - Display who will approve the leave request
  - Show approver name
  - Show approver email and phone
  - Approval level indicator (direct manager, department head, etc.)

#### State Management
- **Loading state** (during submission):
  - Loading spinner with "Submitting..." message
  - Buttons disabled during submission
  
- **Success message**:
  - Confirmation message after submission
  - Display leave request confirmation and reference number
  - Link to view the request
  - Link to return to leave list
  
- **Error messages**:
  - Display specific error details
  - Allow retry
  - Show error resolution steps

---

## Backend API Requirements

### Endpoints

#### POST /api/hr/leave-requests/
Create leave request.

**Request Body:**
```json
{
  "employee_id": 5,
  "leave_type": "annual",
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "first_day_half": false,
  "last_day_half": false,
  "reason": "Planned vacation",
  "attachment_url": "https://...",
  "notify_via_email": true,
  "notify_via_sms": true,
  "notify_via_whatsapp": false
}
```

**Response:**
```json
{
  "id": 1,
  "employee_id": 5,
  "leave_type": "annual",
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "days": 5,
  "status": "pending",
  "reference_number": "LR-2026-001",
  "created_at": "2026-05-31T10:30:00Z",
  "approver_name": "Jane Smith"
}
```

#### GET /api/hr/employees/{id}/leave-balance/
Get leave balance for employee and type.

**Query Parameters:**
- `leave_type` (string, optional): Filter by leave type
- `year` (integer, optional): Filter by year

**Response:**
```json
{
  "employee_id": 5,
  "leave_balances": [
    {
      "leave_type": "annual",
      "total_allocated": 20,
      "used_to_date": 5,
      "pending": 2,
      "balance": 13,
      "year": 2026
    },
    {
      "leave_type": "casual",
      "total_allocated": 10,
      "used_to_date": 3,
      "pending": 1,
      "balance": 6,
      "year": 2026
    }
  ]
}
```

#### GET /api/hr/leave-requests/check-overlap/
Check for overlapping leave.

**Query Parameters:**
- `employee_id` (integer): Employee ID
- `start_date` (date): Leave start date
- `end_date` (date): Leave end date
- `leave_request_id` (integer, optional): Exclude from check (for editing)

**Response:**
```json
{
  "overlaps": false,
  "existing_leaves": []
}
```

Or if overlapping:
```json
{
  "overlaps": true,
  "existing_leaves": [
    {
      "start_date": "2026-06-01",
      "end_date": "2026-06-03",
      "status": "approved"
    }
  ]
}
```

#### GET /api/hr/holidays/
Get holidays for date calculation.

**Query Parameters:**
- `date_from` (date): Holiday period start
- `date_to` (date): Holiday period end

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

#### POST /api/hr/leave-requests/validate-dates/
Validate leave dates.

**Request Body:**
```json
{
  "employee_id": 5,
  "start_date": "2026-06-01",
  "end_date": "2026-06-05",
  "leave_type": "annual"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Date includes 1 weekend"],
  "days_calculated": 5
}
```

#### GET /api/hr/leave-types/
Get available leave types.

**Response:**
```json
{
  "leave_types": [
    {
      "id": 1,
      "name": "Annual Leave",
      "description": "Annual paid leave",
      "requires_attachment": false,
      "color_code": "#3498db"
    },
    {
      "id": 2,
      "name": "Sick Leave",
      "description": "Medical leave",
      "requires_attachment": true,
      "color_code": "#e74c3c"
    }
  ]
}
```

#### GET /api/hr/employees/
Get employee list (for HR creating leave for employees).

**Query Parameters:**
- `search` (string, optional): Search by name or ID
- `department_id` (integer, optional): Filter by department

---

## Database Requirements

### LeaveRequest Model
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `employee_id` (Foreign Key to Employee)
- `leave_type` (Foreign Key to LeaveType)
- `start_date` (Date)
- `end_date` (Date)
- `first_day_half` (Boolean, default: false)
- `last_day_half` (Boolean, default: false)
- `days` (Integer, auto-calculated or stored)
- `reason` (Text)
- `attachment_url` (String, nullable)
- `status` (String, choices: pending, approved, rejected, cancelled)
- `approver_id` (Foreign Key to Employee, nullable)
- `approval_comment` (Text, nullable)
- `notify_via_email` (Boolean)
- `notify_via_sms` (Boolean)
- `notify_via_whatsapp` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `created_by` (Foreign Key to User)

### LeaveBalance Model
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `employee_id` (Foreign Key to Employee)
- `leave_type` (Foreign Key to LeaveType)
- `year` (Integer)
- `balance` (Decimal)
- `used` (Decimal)
- `available` (Decimal, calculated: balance - used)

### Constraints
- **Unique constraint**: Ensure no overlapping leaves per employee and leave type
- **Check constraints**:
  - `end_date > start_date`
  - `days >= 0`
  - `available >= 0` (on leave balance)

---

## Validation & Edge Cases

### Employee Validation
- Employee must be active (not terminated or on leave of absence)
- Employee must not be in probation period (if policy exists)
- Employee must have leave balance for requested type and duration

### Date Validation
- Employee start date cannot be in past (or configurable)
- Leave end date must be after start date
- No overlapping approved leave for same employee
- Cannot create leave in past for future leaves
- Leave dates must be valid calendar dates

### Leave Balance Validation
- Available balance must be >= requested days
- Account for pending leave in available balance calculation
- Respect minimum balance retention policy (if configured)
- Handle carryover leave from previous year
- Employees with variable working days (part-time)
- Mid-year join (prorated leave balance)
- Year boundary handling (leave spanning calendar year boundary)

### Business Logic Validation
- Employee on notice period (may have leave restrictions)
- Leaves spanning weekends and holidays (calculation)
- Different leave types have different rules
- Pending leave count in balance display
- First-time requestor (special rules)
- Max consecutive days limit (if configured)

### Document Validation
- File size validation (max 5MB)
- File type validation (PDF, JPG, PNG)
- File must be present for mandatory leaf types (sick leave)
- File virus scan (optional)

---

## Testing Checklist

### Form Display & Components
- [ ] Form displays all sections
- [ ] All fields display correctly
- [ ] Form title and subtitle display

### Employee Selector
- [ ] Employee selector shows employees (if HR creating)
- [ ] Employee dropdown filters on search
- [ ] Employee name shows in selector
- [ ] Employee department shows
- [ ] Employee designation shows
- [ ] Available balance shows for employee

### Leave Type Selection
- [ ] Leave type selector shows all types
- [ ] Selected leave type shows available balance
- [ ] Balance updates when leave type changes
- [ ] Color-coding displays correctly
- [ ] Help text displays for each type
- [ ] Required field indicator shows

### Date Selection
- [ ] Start date picker opens
- [ ] Cannot select past dates (if configured)
- [ ] End date picker opens
- [ ] End date must be after start date (enforced)
- [ ] Calendar displays correctly
- [ ] Holidays/weekends highlighted
- [ ] Today button works
- [ ] Clear date button works

### Duration Calculation
- [ ] Duration auto-calculates correctly
- [ ] Duration excludes weekends/holidays
- [ ] Duration displays in working or calendar days
- [ ] Duration recalculates on date change
- [ ] Half-day toggle works
- [ ] Duration recalculates on half-day toggle
- [ ] Half-day days reduce duration correctly

### Available Balance
- [ ] Available balance displays correctly
- [ ] Balance updates on leave type change
- [ ] Insufficient balance warning shows
- [ ] Insufficient balance highlighted in red
- [ ] YTD usage displays
- [ ] Total allocated displays

### Overlapping Leave
- [ ] Overlapping leave detection works
- [ ] Existing leave warning displays
- [ ] Cannot submit overlapping leave
- [ ] Existing leave dates show in warning

### Reason Section
- [ ] Reason field accepts text
- [ ] Character counter works
- [ ] Max character limit enforced (500)
- [ ] Additional details field optional
- [ ] Additional details accepts text

### Document Upload
- [ ] Document upload appears (for applicable leave types)
- [ ] File upload accepts files
- [ ] File size validation works
- [ ] File type validation works (PDF, JPG, PNG)
- [ ] File preview works
- [ ] Multiple file upload works
- [ ] Drag-and-drop works

### Notification Preferences
- [ ] Email notification checkbox works
- [ ] SMS notification checkbox works
- [ ] WhatsApp notification checkbox works
- [ ] Defaults set correctly

### Form Validation
- [ ] Required fields validated
- [ ] Invalid date range prevented
- [ ] Insufficient balance prevented
- [ ] Overlapping leave prevented
- [ ] Error summary displays
- [ ] Inline error messages display
- [ ] Real-time validation works

### Form Actions
- [ ] Submit button saves form
- [ ] Submit and create opens new form
- [ ] Cancel shows unsaved warning
- [ ] Save as draft works (if enabled)
- [ ] Loading state shows during submission

### Success & Error Handling
- [ ] Success message displays after submission
- [ ] Confirmation number displays
- [ ] Leave request link displays
- [ ] Return to list link works
- [ ] Error message displays if fails
- [ ] Specific error details shown
- [ ] Retry option available

### Approver Information
- [ ] Approver name displays
- [ ] Approver email displays
- [ ] Approver phone displays
- [ ] Approval level indicator shows

### Responsive Design
- [ ] Form displays correctly on mobile
- [ ] Form displays correctly on tablet
- [ ] Form displays correctly on desktop
- [ ] All buttons accessible on mobile
- [ ] Date pickers work on mobile

---

## Implementation Checklist

### Components
- [ ] Leave request form component
- [ ] Employee selector component with search
- [ ] Leave type selector component
- [ ] Date picker components with validation
- [ ] Half-day toggle component
- [ ] Reason field component
- [ ] Document upload component
- [ ] Notification preferences section
- [ ] Approver information display
- [ ] Error summary component
- [ ] Success message component

### Services & Utilities
- [ ] Duration calculation service
- [ ] Available balance lookup service
- [ ] Overlap check service
- [ ] Holiday and weekend service
- [ ] Approver lookup service
- [ ] Leave type service
- [ ] Date validation service
- [ ] File upload service

### API Integration
- [ ] API client methods
- [ ] Request/response handling
- [ ] Error handling and transformation
- [ ] Loading state management

### Form Management
- [ ] Form validation rules
- [ ] Form submission handler
- [ ] Form state management
- [ ] Field-level error display
- [ ] Form-level error display
- [ ] Unsaved changes tracking

### State Management
- [ ] Employee selection state
- [ ] Leave type selection state
- [ ] Date selection state
- [ ] Balance display state
- [ ] Validation state
- [ ] Submission state
- [ ] Success/error state

### Responsive & Accessibility
- [ ] Responsive form layout
- [ ] Mobile-friendly date pickers
- [ ] ARIA labels for form fields
- [ ] Keyboard navigation support
- [ ] Screen reader support
- [ ] Color contrast compliance

---

## Deployment Strategy

### Pre-Deployment
- API deployment: POST endpoint live
- Database migration: Add leave request and balance tables
- Leave balance initialization: Populate for all active employees
- Caching: Cache leave types for quick form load

### Testing
- Test various date ranges
- Test overlaps and balance scenarios
- Test file uploads
- Test concurrent submissions
- Load testing (concurrent form submissions)

### Training & Rollout
- Staff training: Form walkthrough
- Balance interpretation training
- Attachment upload guidance
- FAQ preparation

### Rollback Plan
- Maintain previous leave request creation
- Database rollback procedures documented
- Feature toggle allows quick disable

---

## Performance Targets

- Form rendering: <300ms
- Employee list load: <200ms
- Leave balance fetch: <200ms
- Leave request creation: <1s
- Validation checks: <200ms
- Overlap check: <300ms
- Holiday fetch: <100ms
- Total form page load: <500ms

---

## Monitoring & Alerting

### Key Metrics
- Track leave request submission success rate
- Monitor form validation error patterns
- Alert on balance insufficiency denials
- Track form abandonment rate
- Monitor attachment upload success rate

### Alerts
- Alert if form submission takes >2s
- Alert on validation service failures
- Alert on balance calculation errors
- Alert on overlap detection failures
- Alert on high form abandonment rates (>40%)

---

## Documentation Requirements

### User Documentation
- Leave request guide with screenshots
- Leave type explanations
- Balance calculation guide
- Date selection guide
- Document upload guide
- Approval workflow explanation
- Half-day leave guide
- Notification preferences guide
- Troubleshooting
- FAQ

---

## Future Enhancements

### Mobile & Communication
- Mobile leave request app
- SMS-based leave requests
- WhatsApp leave requests
- Email-based leave requests
- Voice-based leave requests

### Advanced Features
- Bulk leave requests (for planned leave)
- Template-based leave patterns
- Recurrence patterns (annual leave same dates)
- Alternative approver selection
- Automatic approval for certain types
- Leave forecasting (predict when to take)
- Team view before submitting (see team leave)

### Workflow Improvements
- Multi-level approvals
- Conditional approval rules
- Leave policy templates
- Auto-rejection based on rules
- Leave substitute assignment

### Integration & Automation
- Calendar integration (Google, Outlook)
- Attendance system integration
- Email confirmation workflow
- SMS notifications
- WhatsApp notifications
- Slack notifications

---

## Success Criteria

✅ Leave request creation form fully functional
✅ Balance validation working correctly
✅ Overlap detection preventing duplicate leaves
✅ All validation checks passing
✅ Performance targets met
✅ User acceptance testing passed
✅ Staff trained on form usage
✅ Zero leave balance calculation errors
✅ No double bookings of leave
