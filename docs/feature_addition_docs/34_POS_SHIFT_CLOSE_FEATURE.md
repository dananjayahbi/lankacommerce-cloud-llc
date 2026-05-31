# POS Shift Close Feature Specification

## Executive Summary

Shift close interface enabling cashiers to finalize their shift by recording closing cash, reconciling transactions, and investigating cash variances before shift completion. This feature ensures proper accountability, detects discrepancies early, and maintains comprehensive audit trails for all cash-handling activities.

---

## Current State

The shift close page is partially implemented with basic summary display:
- Transaction summary calculation is incomplete
- Cash variance calculation is working
- Variance reason selector is missing
- Shift close backend is partially implemented
- Variance logging is not implemented
- Error handling needs improvement

---

## Detailed Requirements

### Frontend Features

#### 1. Shift Summary Information Section (Read-Only)
- **Shift Date and Time Range**
  - Display shift date in locale-appropriate format
  - Display opening time and closing time
  - Calculate and display total shift duration
- **Opening Cash Amount**
  - Display opening cash recorded at shift open
  - Format with currency symbol
- **Cashier Name**
  - Display logged-in cashier name
  - Verify matches shift assignment
- **Terminal Information**
  - Display terminal ID/name
  - Display location if applicable

#### 2. Transaction Summary Section (Read-Only)
- **Transaction Counts**
  - Total transaction count
  - Transaction count per payment method
- **Total Sales Amount**
  - Sum of all sales transactions
  - Exclude refunds and discounts from this calculation
- **Payment Method Breakdown Table**
  - Column: Payment method name (Cash, Card, Check, etc.)
  - Column: Transaction count
  - Column: Total amount for method
  - Column: Percentage of total sales
  - Support for multiple payment types
- **Card Transactions Count**
  - Separate count and total for card payments
- **Total Discounts Given**
  - Sum of all discount transactions
  - Show count and total amount
- **Total Refunds Processed**
  - Sum of all refund transactions
  - Show count and total amount

#### 3. Net Sales Calculation (Auto-Calculated, Prominently Displayed)
- **Calculation**: Cash sales + Card sales + Other payments - Refunds + Discounts
- **Display**: Large, clear format (e.g., "NET SALES: $1,234.56")
- **Visual**: Use color coding to indicate positive/negative

#### 4. Closing Cash Entry
- **Closing Cash Amount Field**
  - Numeric input with currency formatting
  - Accept manual entry from cashier count
  - Validate decimal precision (max 2 decimals)
  - Support same currency format as opening cash

#### 5. System Cash Calculation (Auto-Calculated)
- **Formula**: Opening cash + Net sales
- **Display**: Clearly labeled as "SYSTEM CASH" or "EXPECTED CLOSING"
- **Format**: Large, distinct display
- **Update**: Recalculate as closing cash is adjusted

#### 6. Cash Variance Display (Auto-Calculated)
- **Calculation**: Closing cash - System cash
- **Visual Indicator**
  - Green background/checkmark if variance is zero
  - Red background/warning icon if variance exists
  - Amount displayed prominently (e.g., "$50.00 variance")
- **Absolute Value Display**: Show variance as absolute amount
- **Threshold Indicator**: Show if within acceptable range or exceeds limit
- **Color Coding**
  - Green: $0.00 variance
  - Yellow: Small variance (configurable, e.g., <$5)
  - Red: Large variance (configurable, e.g., >$5)

#### 7. Variance Investigation Section (Conditional)
- **Visibility**: Only display if variance is detected (non-zero)
- **Variance Reason Selector**
  - Dropdown with predefined reasons:
    - "Counting error" - Miscounted physical cash
    - "Customer complaint (refund)" - Undocumented refund
    - "Damaged currency" - Unusable bills/coins
    - "Missing receipt" - Transaction not recorded
    - "Till adjustment" - Authorized correction
    - "Other" - Specify in notes
  - Required field when variance exists
  - Clear explanations for each reason
- **Free Text Notes Field**
  - Text area for detailed explanation
  - Character limit: 1000 characters
  - Example: "Customer returned damaged $20 bill"
  - Optional but recommended when variance exists

#### 8. Shift Status Display
- **Current State Indicator**
  - "Ready to Close" - Waiting for closing cash entry
  - "Variance Detected" - Variance found, needs investigation
  - "Waiting for Investigation" - Reason selection in progress
  - "Ready for Completion" - All required fields filled
  - "Completing Shift..." - Submission in progress
  - "Shift Closed" - Successful completion

#### 9. Primary Actions
- **Complete Shift Button**
  - Primary CTA, styled prominently
  - Enabled only when variance is resolved OR zero
  - Shows loading spinner during submission
  - Disabled state: "Complete Shift" button grayed out until ready
- **Print Shift Summary Button**
  - Available after variance resolution (before or after close)
  - Generates printable report
  - Includes all shift details and variance information

#### 10. Secondary Actions
- **Recount Cash Button**
  - Clears closing cash field
  - Allows cashier to re-enter amount
  - Useful for correcting data entry errors
  - Updates variance calculation in real-time
- **Cancel Close Attempt Button**
  - Returns to POS main screen without saving
  - Confirms user intent (modal warning)
  - Shift remains open for continuation

#### 11. Error and Status Messages
- **Error Messages**
  - Invalid closing cash (negative, non-numeric)
  - Network errors during submission
  - Database errors
  - Insufficient permissions
  - Unclosed refunds detected
- **Informational Messages**
  - Variance explanation (helpful guidance)
  - Success confirmation after close
  - Links to support documentation

### Backend API Requirements

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

#### GET /api/pos/shifts/{shift_id}/summary/
Get transaction summary for shift
- **Response** (200 OK):
  ```
  {
    "shift_id": "uuid",
    "total_transactions": "integer",
    "transaction_count_by_method": {
      "cash": "integer",
      "card": "integer",
      "check": "integer"
    },
    "total_sales": "decimal",
    "payment_method_breakdown": [
      {
        "method": "cash",
        "transaction_count": "integer",
        "total_amount": "decimal",
        "percentage": "decimal"
      }
    ],
    "total_discounts": "decimal",
    "discount_count": "integer",
    "total_refunds": "decimal",
    "refund_count": "integer",
    "net_sales": "decimal",
    "report_generated_at": "ISO 8601 datetime"
  }
  ```

#### PATCH /api/pos/shifts/{shift_id}/
Update shift with closing details
- **Request Body**:
  ```
  {
    "closing_cash": "decimal",
    "variance_reason": "string (optional)",
    "variance_notes": "string (optional)"
  }
  ```
- **Response** (200 OK): Updated shift object

#### POST /api/pos/shifts/{shift_id}/close/
Finalize shift close
- **Request Body**:
  ```
  {
    "closing_cash": "decimal",
    "variance_amount": "decimal (calculated)",
    "variance_reason": "string (optional)",
    "variance_notes": "string (optional)"
  }
  ```
- **Response** (200 OK):
  ```
  {
    "id": "uuid",
    "status": "closed",
    "closing_cash": "decimal",
    "closing_time": "ISO 8601 datetime",
    "variance_amount": "decimal",
    "variance_reason": "string",
    "report_url": "string (optional)"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid closing cash
  - 409 Conflict: Shift already closed or no variance investigation
  - 403 Forbidden: User not authorized to close this shift
  - 500 Internal Server Error: Database or system error

#### GET /api/pos/transactions/?shift_id={id}&date={date}
Get all transactions in shift for variance investigation
- **Query Parameters**:
  - shift_id (required)
  - date (optional, filter by transaction date)
  - offset (optional, for pagination)
  - limit (optional, max results)
- **Response** (200 OK):
  ```
  [
    {
      "id": "uuid",
      "shift_id": "uuid",
      "transaction_type": "sale|refund|discount",
      "amount": "decimal",
      "payment_method": "string",
      "timestamp": "ISO 8601 datetime",
      "items_count": "integer",
      "reference": "string (receipt number, etc.)"
    }
  ]
  ```

### Database Requirements

#### POSShift Model (Additional Fields)
```
New/Modified Fields:
- closing_cash (Decimal, nullable) - Amount counted by cashier
- closing_time (DateTime, nullable) - Time shift was closed
- variance_amount (Decimal, nullable) - Calculated variance
- variance_reason (String, nullable) - Reason selected from dropdown
- variance_notes (Text, nullable) - Detailed explanation
- status (Enum: open, closed) - Use existing field

Indexes:
- (shift_id) - For closing lookup
- (variance_amount) - For variance analysis
- (created_at) - For temporal queries
- (shift_id, status) - For active shift queries
```

#### POSVarianceLog Model (New)
```
Fields:
- id (UUID, Primary Key)
- shift_id (UUID, Foreign Key to POSShift)
- variance_amount (Decimal, not null)
- reason (String, not null)
- notes (Text, nullable)
- resolved_by (UUID, Foreign Key to User)
- created_at (DateTime, auto-set)
- updated_at (DateTime, auto-update)
- deleted_at (DateTime, nullable)

Indexes:
- (shift_id) - For variance history per shift
- (variance_amount) - For variance analysis
- (created_at) - For temporal queries
- (reason) - For reason distribution analysis
```

#### Constraints
- Foreign key references to POSShift and User tables
- Variance log created automatically on shift close if variance detected

---

## Validation & Edge Cases

### Critical Validation Rules

1. **Cash Variance Thresholds**
   - Define acceptable variance range per tenant (e.g., ±$5)
   - Alert if variance exceeds threshold
   - Require investigation notes if exceeds limit
   - Consider percentage-based threshold (e.g., 2% of closing cash)

2. **Negative Closing Cash Handling**
   - Reject negative values
   - Validate during input (prevent submission)
   - Show clear error message

3. **Closing Before All Transactions Settled**
   - Check for pending/incomplete transactions
   - Prevent premature close if transactions pending
   - Alert user about unsettled transactions

4. **Decimal Precision in Closing Cash**
   - Validate max 2 decimal places
   - Handle currency rounding correctly
   - Prevent floating-point precision errors

5. **Timezone Handling**
   - Closing time in terminal timezone
   - Maintain UTC time in database
   - Display time in terminal timezone

6. **Concurrent Close Attempts**
   - Prevent duplicate close via optimistic locking or database constraints
   - Return clear error if already closed
   - Suggest checking shift status

7. **Missing Transaction Records**
   - Detect incomplete transaction data
   - Alert if transaction count mismatch detected
   - Allow manual variance investigation

8. **Variance Investigation Timeout**
   - Prevent indefinite hold-up
   - Set timeout for variance investigation (e.g., 30 minutes)
   - Force variance reason selection after timeout
   - Allow "Technical Issue" reason if timeout exceeded

9. **Permission Verification**
   - Only assigned cashier can close their shift
   - Manager can force close if needed (with audit log)
   - Verify user is still authorized (not suspended/removed)

10. **Closing with Open Refunds**
    - Detect in-progress/pending refunds
    - Prevent close or alert user
    - Require explicit confirmation

### Edge Cases

- **Shift with No Transactions**
  - Net sales = $0.00
  - System cash = Opening cash
  - Expected variance if closing cash differs
  - Allow close even with zero transactions

- **Shift with Only Cash Transactions**
  - Payment method breakdown includes only cash
  - Card transaction count = 0
  - Calculate total correctly

- **Shift with Only Card Transactions**
  - Cash closing should match opening if no cash transactions
  - Variance if different amounts
  - Investigate missing cash transactions

- **Mixed Payment Methods**
  - Correctly sum all payment methods
  - Percentage calculations accurate
  - Net sales includes all methods

- **Large Number of Transactions**
  - Query performance with 5000+ transactions
  - Pagination for transaction list
  - Summary calculation performance

- **Report Generation Timeout**
  - Handle gracefully if PDF generation slow
  - Allow completion without report
  - Generate report asynchronously

- **Currency Rounding Issues**
  - Use proper rounding (banker's rounding or half-up)
  - Consistent rounding throughout
  - Test with edge amounts (0.01, 0.99, etc.)

---

## Testing Checklist

### Functional Tests

- [ ] Shift summary displays correct date/time range
- [ ] Opening cash displays correctly from shift open
- [ ] Total transactions count calculated accurately
- [ ] Total sales amount matches sum of all sales
- [ ] Card transactions count displayed correctly
- [ ] Payment method breakdown shows all methods used
- [ ] Payment method counts are accurate
- [ ] Payment method amounts are accurate
- [ ] Payment method percentages calculated correctly (sum to 100%)
- [ ] Total discounts displayed correctly
- [ ] Total refunds displayed correctly
- [ ] Net sales calculation correct (sum of all positive transactions minus refunds)
- [ ] System cash calculated correctly (opening cash + net sales)
- [ ] Closing cash input accepts valid amounts
- [ ] Closing cash input rejects negative amounts
- [ ] Closing cash input rejects non-numeric input
- [ ] Closing cash field shows currency formatting
- [ ] Cash variance calculated correctly (closing - system)
- [ ] Variance display shows $0.00 when balanced (green indicator)
- [ ] Variance display shows amount when variance exists (red indicator)
- [ ] Variance reason selector appears only when variance >$0.00
- [ ] Variance reason selector displays all reason options
- [ ] Variance reason selection updates form state
- [ ] Free text notes field accepts detailed explanation
- [ ] Notes field enforces 1000 character limit
- [ ] Recount button clears closing cash field
- [ ] Recount button allows re-entry of closing cash
- [ ] Recount updates variance in real-time
- [ ] Complete shift button disabled until all required fields filled
- [ ] Complete shift button shows loading state during submission
- [ ] Complete shift creates shift close record in database
- [ ] Shift close stored with status "closed"
- [ ] Variance logged separately in POSVarianceLog table
- [ ] Shift cannot be closed twice (prevents duplicate)
- [ ] Print button generates printer-ready format
- [ ] Cancel button returns without saving

### Validation Tests

- [ ] Closing cash $100.50 accepted
- [ ] Closing cash -$50.00 rejected
- [ ] Closing cash "abc" rejected
- [ ] Closing cash with >2 decimals rejected or rounded
- [ ] Zero variance (closing = system) shows green indicator
- [ ] $0.01 variance shows red indicator
- [ ] Variance reason required when variance exists
- [ ] Variance reason not required when no variance
- [ ] Notes field optional
- [ ] Timezone correctly applied to closing time
- [ ] Cannot close shift with pending transactions
- [ ] Cannot close shift twice

### Integration Tests

- [ ] API call to GET /api/pos/shifts/{id}/ succeeds
- [ ] API call to GET /api/pos/shifts/{id}/summary/ returns transaction details
- [ ] API call to PATCH with closing cash updates shift
- [ ] API call to POST /api/pos/shifts/{id}/close/ finalizes shift
- [ ] Variance log created in database
- [ ] Transaction query for variance investigation succeeds
- [ ] All fields persist correctly in database
- [ ] Indexes perform efficiently

### Performance Tests

- [ ] Shift summary retrieval completes within 300ms
- [ ] Transaction summary calculation completes within 500ms
- [ ] Shift close submission completes within 1 second
- [ ] Variance log creation completes within 200ms
- [ ] Variance threshold query completes within 100ms
- [ ] Form rendering completes within 300ms

---

## Implementation Checklist

### Frontend Implementation

- [ ] Shift summary component (display read-only shift data)
- [ ] Transaction summary calculation service
- [ ] Payment method breakdown component
- [ ] Net sales calculation logic
- [ ] System cash calculation component
- [ ] Cash variance calculation logic
- [ ] Variance visual indicator component (green/red/yellow)
- [ ] Variance reason selector dropdown component
- [ ] Notes text area component (with character counter)
- [ ] Closing cash input component (with currency formatting)
- [ ] Recount functionality (clear field, allow re-entry)
- [ ] Form validation logic
- [ ] Complete shift button logic (enable when ready)
- [ ] Print functionality (browser print or PDF generation)
- [ ] Cancel button logic (confirm intent)
- [ ] Error message display
- [ ] Loading state management
- [ ] Accessibility implementation:
  - [ ] ARIA labels on all inputs
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] Color not used as only indicator

### Backend Implementation

- [ ] Shift retrieval endpoint (GET /api/pos/shifts/{id}/)
- [ ] Transaction summary endpoint (GET /api/pos/shifts/{id}/summary/)
- [ ] Shift update endpoint (PATCH with closing details)
- [ ] Shift close endpoint (POST /api/pos/shifts/{id}/close/)
- [ ] Transaction query endpoint (GET /api/pos/transactions/)
- [ ] Closing cash validation logic
- [ ] Variance calculation logic
- [ ] Variance logging logic
- [ ] Duplicate close prevention
- [ ] Permission verification
- [ ] Pending transaction detection
- [ ] Database transaction handling (atomicity)
- [ ] Error handling and logging

### Database Implementation

- [ ] Add closing_cash field to POSShift
- [ ] Add closing_time field to POSShift
- [ ] Add variance_amount field to POSShift
- [ ] Add variance_reason field to POSShift
- [ ] Add variance_notes field to POSShift
- [ ] Create POSVarianceLog table
- [ ] Create index on POSVarianceLog (shift_id)
- [ ] Create index on POSVarianceLog (variance_amount)
- [ ] Create index on POSVarianceLog (reason)
- [ ] Test indexes on sample data
- [ ] Test database constraints

---

## Deployment Strategy

### Pre-Deployment

1. **Database Migration**
   - Add new fields to POSShift table
   - Create POSVarianceLog table
   - Create all required indexes
   - Test rollback scenario
   - Run migration on staging
   - Verify data integrity

2. **API Deployment**
   - Deploy all shift close endpoints
   - Deploy transaction query endpoints
   - Verify API responses
   - Test error scenarios
   - Load test with concurrent requests

3. **Frontend Deployment**
   - Build production bundle
   - Test on POS hardware
   - Verify performance targets
   - Test network failures
   - Clear caches

### Feature Toggle

- Implement feature flag for shift close
- Enable/disable without redeployment
- Tenant-level configuration
- Test during operations

### Testing Protocol

1. **Functional Testing**
   - Run all test checklist items
   - Test on actual POS hardware
   - Multiple concurrent shifts
   - Various transaction scenarios

2. **Performance Testing**
   - Shift close submission <1s
   - Transaction summary <500ms
   - Large transaction sets (5000+)
   - Concurrent submissions

3. **Integration Testing**
   - End-to-end workflow
   - Database transaction handling
   - Error scenarios
   - Audit logging

### Staff Training

- Demonstrate shift close process
- Show variance investigation
- Explain variance reasons
- Provide written guides
- Conduct hands-on training
- Video tutorials available

### Rollback Plan

- Maintain previous shift close system for 30 days
- Document rollback procedure
- Test rollback on staging
- Clear rollback decision criteria
- Archive closed shifts safely

### Configuration

- Set variance alert thresholds per tenant
- Configure acceptable variance range
- Set investigation timeout
- Define maximum closing cash amount
- Configure currency formatting

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Shift Summary Retrieval | <300ms | Fetch shift details |
| Transaction Summary Calc | <500ms | Query and aggregate transactions |
| Shift Close Submission | <1s | Database write + API response |
| Variance Log Creation | <200ms | Insert variance record |
| Form Rendering | <300ms | React component render |
| Variance Threshold Check | <100ms | Compare against limit |

---

## Monitoring & Alerting

### Key Metrics

1. **Variance Occurrence Rate**
   - Target: <5% of shifts
   - Alert if exceeds 5%
   - Investigate if trending up

2. **Average Variance Amount**
   - Track distribution (mean, median, std dev)
   - Alert if average increases
   - Detect systematic issues

3. **High Variance Incidents**
   - Count shifts with variance >threshold
   - Alert on sudden increase
   - Investigate root causes

4. **Shift Close Completion Rate**
   - Target: >90% of open shifts closed
   - Alert if drops below 90%
   - Track unclosed shifts

5. **Variance Resolution Time**
   - Time from variance detection to resolution
   - Monitor for long investigations
   - Identify process bottlenecks

6. **Unclosed Shifts**
   - Alert on shifts open >24 hours
   - Track by terminal and cashier
   - Investigate abandoned shifts

7. **Variance Reason Distribution**
   - Track which reasons most common
   - Identify training opportunities
   - Process improvements

### Dashboard Metrics

- Real-time shift close success rate
- Variance occurrence percentage
- Average variance by terminal
- Shift close completion rate
- Average variance resolution time
- Unclosed shifts count

### Alerting Rules

- **Critical**: >10% shifts with variance (page on-call)
- **High**: Variance >threshold (notify team)
- **High**: Shift unclosed >24h (notify manager)
- **Medium**: Variance resolution >30 min (investigate)
- **Medium**: Unusual variance reason distribution (review training)
- **Low**: Shift close success <95% (monitor)

---

## Documentation Requirements

### User Documentation

1. **Shift Close Process Guide**
   - Step-by-step with screenshots
   - Explain each section
   - Common scenarios
   - Video tutorial (3-4 minutes)

2. **Cash Variance Investigation Guide**
   - Common causes of variance
   - How to investigate
   - Resolution steps
   - Examples of each cause

3. **Variance Reason Explanations**
   - What each reason means
   - When to use each
   - Required notes
   - Examples

4. **Acceptable Variance Threshold**
   - What amounts are acceptable
   - Why thresholds exist
   - Investigation requirements
   - Escalation process

5. **Error Message Resolution**
   - "Shift cannot be closed" - reasons and fixes
   - "Large variance detected" - investigation steps
   - "Invalid closing cash" - correction steps
   - "Pending transactions" - resolution

6. **Receipt/Closing Documentation**
   - How to print shift summary
   - What information is included
   - Record retention requirements
   - Format specifications

7. **Variance Dispute Resolution**
   - How to appeal variance
   - Investigation process
   - Escalation path
   - Documentation requirements

### Technical Documentation

1. **API Documentation**
   - Endpoint specifications
   - Request/response examples
   - Error codes and meanings
   - Rate limiting

2. **Database Schema**
   - POSShift table updates
   - POSVarianceLog structure
   - Index definitions
   - Constraints

3. **Configuration Guide**
   - Variance thresholds
   - Investigation timeout
   - Currency settings
   - Alert thresholds

---

## Future Enhancements

### Smart Features

1. **Photo Capture of Closing Cash Drawer**
   - Photo verification of drawer contents
   - Timestamp and geolocation
   - Evidence for disputes
   - Machine learning analysis

2. **Integration with Cash Counting Machine**
   - Automatic variance detection
   - Machine count vs system count
   - Reduces manual counting errors
   - Real-time feedback

3. **Multi-Cashier Shift Close**
   - Manager reconciliation across cashiers
   - Consolidated variance reporting
   - Team-level accountability
   - Bulk close capability

4. **Shift Extension**
   - Allow employee to work longer
   - Automatic shift extension
   - Log reason for extension
   - Impacts scheduling

### Advanced Analytics

5. **Advanced Variance Investigation**
   - Drill down to individual transactions
   - Identify problematic items
   - Transaction-level variance tracking
   - Reverse transaction capability

6. **Variance Prediction ML Model**
   - Identify likely problematic transactions
   - Predict variance based on patterns
   - Recommend investigation focus
   - Learn from resolutions

7. **Automatic Recount Suggestions**
   - Based on variance pattern
   - Recommend section of drawer to recount
   - Accelerate investigation
   - Improve efficiency

### Communication

8. **Email/SMS Shift Close Confirmation**
   - Send confirmation after close
   - Include variance information
   - Provide documentation link
   - Audit trail for compliance

9. **Manager Dashboard Integration**
   - Real-time shift close status
   - Variance alerts
   - Team performance metrics
   - Action items

10. **Scheduled Shift Close Reminders**
    - Alert cashiers to close shift
    - Prevent accidental unclosed shifts
    - Configurable reminder timing
    - Escalation to manager

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
