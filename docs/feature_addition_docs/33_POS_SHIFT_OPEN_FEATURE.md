# POS Shift Open Feature Specification

## Executive Summary

Shift open interface allowing cashiers to initialize their work shift by recording opening cash, timestamp, and notes for accountability and reconciliation purposes. This feature establishes the baseline for shift accounting and ensures proper audit trails for all transactions conducted during the shift.

---

## Current State

The shift open page is partially implemented with basic form elements in place. However, several critical components remain incomplete:
- Auto-population of cashier name and date is working
- Previous shift lookup is incomplete
- Opening cash validation is partially done
- Shift record creation backend is incomplete
- No proper error handling or edge case management

---

## Detailed Requirements

### Frontend Features

#### 1. User Information Section
- **Cashier Name Display**: Auto-populated from logged-in user profile (read-only)
- **Opening Date Field**: Auto-populated with current date, user-selectable
- **Opening Time Display**: Auto-populated with current time (read-only), real-time update every second
- **Shift Start Time Picker**: Allows override for delayed shift start, uses time picker component

#### 2. Cash Entry Section
- **Opening Cash Amount Field**: Numeric input with currency formatting (e.g., $1,234.56)
- **Currency Symbol**: Automatically display based on tenant configuration
- **Decimal Precision**: Support up to 2 decimal places (cents/paise)
- **Optional Notes Field**: Text area for special circumstances (max 500 characters)

#### 3. Previous Shift Reference Section
- **Read-Only Display** of:
  - Previous cashier name
  - Previous shift closing balance
  - Previous shift end time
- **"No Previous Shift" Message**: Display if this is the first shift on terminal
- **Reference Only**: Cannot be edited, for informational purposes only

#### 4. Status and Actions
- **Status Indicator**: Display "Opening Shift..." during submission
- **Confirm Open Shift Button**: Primary CTA, styled prominently
  - Initially enabled
  - Disabled if opening cash is invalid
  - Shows loading spinner during submission
- **Cancel Button**: Allows user to abandon shift open process
- **Error Message Display**: Clear error messages for:
  - Invalid opening cash amount
  - Network errors
  - Duplicate shift errors
  - Terminal assignment errors

#### 5. Form Validation Feedback
- **Real-time Validation**: Validate opening cash as user types
- **Visual Indicators**: Show validation state (red border for errors, green for valid)
- **Helper Text**: Display acceptable amount ranges

### Backend API Requirements

#### POST /api/pos/shifts/open/
Create new shift record
- **Request Body**:
  ```
  {
    "terminal_id": "string",
    "opening_cash": "decimal",
    "opening_notes": "string (optional)",
    "shift_start_time": "ISO 8601 datetime (optional)"
  }
  ```
- **Response** (201 Created):
  ```
  {
    "id": "uuid",
    "terminal_id": "string",
    "cashier_id": "uuid",
    "opening_cash": "decimal",
    "opening_time": "ISO 8601 datetime",
    "opening_notes": "string",
    "status": "open",
    "created_at": "ISO 8601 datetime"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid opening cash or missing required fields
  - 409 Conflict: Duplicate shift or terminal already has open shift
  - 403 Forbidden: Cashier not authorized or not assigned to terminal
  - 500 Internal Server Error: Database or system error

#### GET /api/pos/shifts/latest/
Retrieve previous shift for reference
- **Query Parameters**: `terminal_id` (required)
- **Response** (200 OK):
  ```
  {
    "id": "uuid",
    "cashier_id": "uuid",
    "cashier_name": "string",
    "closing_balance": "decimal",
    "closing_time": "ISO 8601 datetime",
    "status": "closed"
  }
  ```
- **Response** (204 No Content): If no previous shift exists

#### GET /api/pos/shifts/{shift_id}/
Retrieve current shift details
- **Response** (200 OK):
  ```
  {
    "id": "uuid",
    "terminal_id": "string",
    "cashier_id": "uuid",
    "opening_cash": "decimal",
    "opening_time": "ISO 8601 datetime",
    "opening_notes": "string",
    "status": "open",
    "created_at": "ISO 8601 datetime"
  }
  ```

### Database Requirements

#### POSShift Model
```
Fields:
- id (UUID, Primary Key)
- tenant_id (UUID, Foreign Key)
- terminal_id (String, Foreign Key)
- cashier_id (UUID, Foreign Key)
- opening_cash (Decimal, not null)
- opening_time (DateTime, not null)
- opening_notes (Text, nullable)
- closing_cash (Decimal, nullable)
- closing_time (DateTime, nullable)
- status (Enum: open, closed, default: open)
- created_at (DateTime, auto-set on creation)
- updated_at (DateTime, auto-update on modification)
- deleted_at (DateTime, nullable, for soft deletes)

Indexes:
- (tenant_id, terminal_id, opening_time) - Composite for shift lookup
- (cashier_id, opening_time) - For cashier shift history
- (status) - For active shift queries
- (created_at) - For temporal queries
```

#### Constraints
- Unique constraint on (terminal_id, status='open') to prevent duplicate opens
- Foreign key references to User (cashier_id), Terminal (terminal_id), Tenant (tenant_id)

---

## Validation & Edge Cases

### Critical Validation Rules

1. **Opening Cash Validation**
   - Cannot be negative (reject any negative values)
   - Cannot exceed realistic amount (e.g., max 999,999.99 per tenant configuration)
   - Minimum amount configurable per tenant (e.g., 0.00 minimum)
   - Decimal precision must be valid (max 2 decimals)

2. **Duplicate Shift Prevention**
   - Cashier cannot open a second shift without closing the first
   - Database unique constraint on (terminal_id, status='open')
   - Application-level check before submission

3. **Timezone Handling**
   - Opening time must be converted to terminal's configured timezone
   - Store both local and UTC times in database
   - Display time in terminal's timezone to user

4. **Shift Overlap Detection**
   - Terminal cannot have multiple open shifts simultaneously
   - Check during form submission
   - Provide clear error message if detected

5. **Opening Cash Decimal Precision**
   - Handle currency rounding correctly (half-up rounding)
   - Support different currency denominations
   - Validate against currency rules

6. **Network Failure During Shift Open**
   - Implement retry logic (up to 3 attempts)
   - Detect duplicate shift from previous failed attempt
   - Inform user if shift was already created despite error

7. **Concurrent Shift Opens**
   - Database-level unique constraint prevents duplicates
   - Application-level check for better UX
   - Return conflict error with suggestion to close existing shift

8. **Cashier Permission Verification**
   - Only active cashiers can open shifts
   - Verify cashier is not on leave or suspended
   - Check cashier is assigned to the terminal

9. **Terminal Assignment Validation**
   - Verify cashier is assigned to the terminal
   - Check terminal is active and not in maintenance
   - Verify tenant access to terminal

### Edge Cases

- **First Shift on Terminal**: Previous shift lookup returns null, display "No previous shift"
- **Very High Opening Cash**: Alert user if amount seems unusual but allow override
- **Shift Open After Hours**: Allow but log for monitoring
- **Daylight Saving Time Transitions**: Ensure time calculations remain accurate
- **Multiple Terminals for Same Cashier**: Allow cashier to work different terminals sequentially

---

## Testing Checklist

### Functional Tests

- [ ] Cashier name auto-populates from logged-in user profile
- [ ] Current date auto-populated correctly in date field
- [ ] Current time displays and updates in real-time
- [ ] Opening time picker allows manual override
- [ ] Opening cash field accepts valid currency amounts
- [ ] Opening cash field rejects negative numbers
- [ ] Opening cash field rejects non-numeric input
- [ ] Opening cash field rejects amounts exceeding maximum
- [ ] Previous shift information displays if available
- [ ] Previous shift information shows "No previous shift" if none exists
- [ ] Previous shift information is read-only (cannot be edited)
- [ ] Notes field accepts text and special characters up to 500 chars
- [ ] Notes field rejects characters exceeding limit
- [ ] Confirm button is enabled with valid opening cash
- [ ] Confirm button is disabled until opening cash entered
- [ ] Confirm button shows loading state during submission
- [ ] Confirm button triggers shift creation API call
- [ ] Cancel button returns to previous screen without saving
- [ ] Error message displays for invalid opening cash
- [ ] Error message displays for network errors
- [ ] Error message displays for duplicate shift attempts
- [ ] Shift record created in database with status "open"
- [ ] Shift creation timestamp recorded accurately
- [ ] Shift record linked to correct cashier
- [ ] Shift record linked to correct terminal
- [ ] Shift record linked to correct tenant
- [ ] Opening cash amount stored correctly
- [ ] Opening notes stored correctly
- [ ] Duplicate shift prevention works on second open attempt

### Validation Tests

- [ ] Opening cash $0.00 accepted
- [ ] Opening cash $100.50 accepted
- [ ] Opening cash -$50.00 rejected
- [ ] Opening cash "abc" rejected
- [ ] Opening cash with more than 2 decimals rejected
- [ ] Opening cash exceeding 999,999.99 rejected
- [ ] Timezone correctly applied to opening time
- [ ] Timezone conversion maintains correct time
- [ ] Terminal assignment validation prevents misassigned shifts

### Integration Tests

- [ ] API call to /api/pos/shifts/open/ succeeds with valid data
- [ ] API call to /api/pos/shifts/latest/ returns previous shift
- [ ] API call to /api/pos/shifts/{id}/ retrieves created shift
- [ ] Database indexes perform efficiently on large datasets
- [ ] Unique constraint prevents duplicate shifts

### Performance Tests

- [ ] Shift opening completes within 1 second
- [ ] Previous shift lookup completes within 200ms
- [ ] Form rendering completes within 300ms
- [ ] Shift validation completes within 100ms
- [ ] Concurrent shift checks complete within 50ms

---

## Implementation Checklist

### Frontend Implementation

- [ ] Cashier auto-population component (from authentication context)
- [ ] Date picker component (with validation)
- [ ] Time picker component (with override capability)
- [ ] Currency input field (with formatting)
- [ ] Text area for notes (with character counter)
- [ ] Previous shift lookup component (fetch and display)
- [ ] Status indicator component (loading state)
- [ ] Error message component (clear formatting)
- [ ] Form validation logic (real-time feedback)
- [ ] Success handling (display confirmation, redirect)
- [ ] Loading state management during submission
- [ ] Retry logic for failed submissions (up to 3 attempts)
- [ ] Accessibility implementation:
  - [ ] ARIA labels on all form fields
  - [ ] Keyboard navigation support
  - [ ] Screen reader support for status messages
  - [ ] Color not used as only indicator (validation)

### Backend Implementation

- [ ] Shift creation endpoint (POST /api/pos/shifts/open/)
- [ ] Previous shift lookup endpoint (GET /api/pos/shifts/latest/)
- [ ] Shift details endpoint (GET /api/pos/shifts/{shift_id}/)
- [ ] Opening cash validation logic
- [ ] Duplicate shift prevention logic
- [ ] Timezone conversion logic
- [ ] Permission verification middleware
- [ ] Terminal assignment validation
- [ ] Database model for POSShift
- [ ] Database indexes for performance
- [ ] Error handling and logging
- [ ] Authentication checks
- [ ] Authorization checks

### Database Implementation

- [ ] Create POSShift table with all required fields
- [ ] Create composite index (tenant_id, terminal_id, opening_time)
- [ ] Create index on (cashier_id, opening_time)
- [ ] Create index on (status)
- [ ] Create index on (created_at)
- [ ] Add unique constraint on (terminal_id, status='open')
- [ ] Create foreign key references
- [ ] Test indexes on sample data

---

## Deployment Strategy

### Pre-Deployment

1. **Database Migration**
   - Create POSShift table with all indexes
   - Verify indexes perform efficiently
   - Test rollback scenario
   - Run migration on staging environment

2. **API Deployment**
   - Deploy shift creation endpoints
   - Deploy previous shift lookup endpoint
   - Verify API responses match specification
   - Test error scenarios
   - Validate authentication and authorization

3. **Frontend Deployment**
   - Build production bundle
   - Test on actual POS hardware
   - Verify performance targets
   - Test network failure scenarios
   - Clear browser cache/service workers

### Feature Toggle

- Implement feature flag for shift open functionality
- Allow enable/disable without code redeployment
- Use tenant-level configuration
- Test toggle on/off during shift operations

### Testing Protocol

1. **Functional Testing**
   - Test all checklist items on staging
   - Test on actual POS hardware
   - Test with multiple terminals simultaneously
   - Test with different user roles

2. **Performance Testing**
   - Measure shift opening time (<1s)
   - Measure API response times
   - Test with 1000+ concurrent shifts
   - Identify and optimize slow queries

3. **Integration Testing**
   - Test full workflow end-to-end
   - Test with payment system integration
   - Test with reporting system
   - Test with audit logging

### Staff Training

- Demonstrate shift open process step-by-step
- Explain opening cash requirements and accuracy
- Show how to handle errors
- Provide written guides and video tutorials
- Conduct train-the-trainer sessions

### Rollback Plan

- Maintain ability to revert to previous shift system if critical issues arise
- Keep previous shift endpoints available for 30 days post-deployment
- Document rollback procedure with clear steps
- Test rollback on staging environment
- Establish rollback decision criteria (X% errors, etc.)

### Configuration

- Set realistic opening cash range per tenant (e.g., $0 to $10,000)
- Configure timezone per terminal
- Set maximum opening cash variance alert threshold
- Configure automatic shift close timeout (if applicable)

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Shift Opening | <1s | Database write + API response |
| Previous Shift Lookup | <200ms | Query with indexes |
| Form Rendering | <300ms | React component render |
| Shift Validation | <100ms | Opening cash validation logic |
| Concurrent Shift Checks | <50ms | Database constraint check |
| Timezone Conversion | <10ms | In-memory conversion |
| API Response | <500ms | End-to-end response time |

---

## Monitoring & Alerting

### Key Metrics

1. **Shift Open Success Rate**
   - Target: >95% success rate
   - Alert if drops below 95%
   - Track failed reasons (validation, network, permission)

2. **Opening Cash Variance Detection**
   - Monitor for unusual amounts
   - Alert if opening cash differs significantly from terminal average
   - Flag potential data entry errors

3. **Duplicate Shift Attempts**
   - Track duplicate shift creation attempts
   - Alert if rate increases (potential user confusion)
   - Investigate error messages for clarity

4. **Average Shift Open Time**
   - Track from shift open to first transaction
   - Monitor for delays in cashier workflow
   - Optimize if exceeding baseline

5. **Failed Shift Creations**
   - Monitor database errors
   - Monitor API failures
   - Alert on sudden increase
   - Track error types

6. **Timezone Mismatch**
   - Alert on time conversions resulting in >1 hour difference
   - Log and investigate potential timezone configuration issues

### Dashboard Metrics

- Real-time shift open success rate
- Average shift open time (P50, P95, P99)
- Failed shift creation count
- Duplicate shift attempt count
- Opening cash range distribution
- Terminal utilization (shifts per terminal per day)

### Alerting Rules

- **Critical**: Shift open success rate <90% (page on-call)
- **High**: Shift open success rate <95% (notify team)
- **Medium**: Unusual opening cash amounts detected (log and review)
- **Medium**: High duplicate shift attempt rate (investigate UX)
- **Low**: Slow shift open times (P99 >2s)

---

## Documentation Requirements

### User Documentation

1. **Shift Open Process Guide**
   - Step-by-step instructions with screenshots
   - Common questions and answers
   - Troubleshooting section
   - Video tutorial (2-3 minutes)

2. **Opening Cash Requirements Guide**
   - Expected opening cash amounts
   - How to verify drawer contents
   - Realistic ranges by terminal type
   - Currency handling (if multiple currencies)

3. **Previous Shift Information Explanation**
   - What information is displayed and why
   - How to use previous shift for reference
   - What to do if no previous shift exists

4. **Error Messages and Resolution**
   - "Invalid opening cash" - how to fix
   - "Shift already open" - what it means and resolution
   - "Terminal not assigned" - permission issue explanation
   - "Network error" - retry instructions

5. **Terminal Hardware Setup**
   - POS terminal configuration for shift management
   - How to verify terminal assignment
   - Timezone configuration steps

6. **Multi-Shift Rotation Guide**
   - Shift handover process
   - How to coordinate shift open/close
   - Managing multiple terminals

### Technical Documentation

1. **API Documentation**
   - Endpoint specifications
   - Request/response examples
   - Error codes and meanings
   - Rate limiting (if applicable)

2. **Database Schema Documentation**
   - POSShift table structure
   - Index definitions
   - Constraint specifications
   - Migration instructions

3. **Configuration Guide**
   - Tenant-level settings
   - Terminal-level settings
   - Feature flags
   - Alert thresholds

---

## Future Enhancements

### Quick Access Features

1. **Quick Shift Open Presets**
   - Buttons for common opening balances
   - Cashier-specific typical amounts
   - Reduces data entry time

2. **Recent Opening Cash Suggestions**
   - Autocomplete based on cashier history
   - One-click selection for typical amounts
   - Reduces errors from manual entry

### Advanced Shift Management

3. **Scheduled Shift Start**
   - Allow shift to be set to start at future time
   - Useful for pre-opening setup
   - Prevents early shift opens

4. **Multi-Terminal Shift Open**
   - Manager can open shift for another terminal
   - Useful for coverage scenarios
   - Requires elevated permissions

5. **Shift Start Delay**
   - Allow recording of reason for late start
   - Automatic notification to management
   - Impacts labor scheduling

### Smart Features

6. **Opening Cash Variance Prediction**
   - ML model to predict expected opening amounts
   - Alert if unusual amount detected
   - Learn from historical patterns

7. **Shift Opening Photo Upload**
   - Photo verification of drawer contents
   - Timestamp and location metadata
   - Backup for dispute resolution

8. **Physical Cash Drawer Integration**
   - Auto-detect drawer status via IoT
   - Automatic cash count via hardware
   - Reduces manual error

### Collaboration Features

9. **Shift Opening Comments with Attachments**
   - Receipt images for verification
   - Problem documentation
   - Historical reference trail

10. **Batch Shift Opening**
    - Manager can open multiple shifts at once
    - Useful for store opening procedures
    - Requires appropriate permissions

11. **Shift Opening Notifications**
    - Real-time notification to management
    - Alerts for unusual amounts or delays
    - Escalation procedures for issues

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 31, 2026 | Product Team | Initial specification |

---

## Approval Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
| QA Lead | TBD | | |
| Stakeholder | TBD | | |

---

*This document is confidential and intended for authorized personnel only. Unauthorized distribution is prohibited.*
