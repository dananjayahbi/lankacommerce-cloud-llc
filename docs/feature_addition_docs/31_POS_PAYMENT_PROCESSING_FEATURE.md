# POS Payment Processing Feature

## Executive Summary

The payment processing feature provides a comprehensive interface for handling multiple payment methods including cash, card, check, and store credit with real-time validation, change calculation, and payment confirmation. This feature integrates with payment gateways (PayHere, WebXPay, KOKO) and ensures secure, reliable payment processing with support for offline payment queueing and transaction reconciliation.

---

## Current State

### Existing Implementation
- Basic payment method selector exists (UI only)
- Cash payment flow partially implemented
- Card payment integration not implemented (requires PayHere/WebXPay setup)
- Check payment backend missing
- Store credit payment logic incomplete
- Payment confirmation receipt generation partially done

### Gaps and Limitations
- Payment gateway integration not established
- No webhook support for async payment confirmation
- Payment status polling mechanism missing
- Duplicate payment submission prevention incomplete
- Payment audit logging insufficient
- Multi-currency support not finalized

---

## Detailed Requirements

### Frontend Features

#### Payment Method Selector
- **Method Display**: Show only enabled payment methods (conditional rendering)
- **Visual Distinction**: Each method has clear, distinct button with icon and label
- **Method Options**:
  - Cash
  - Card (with sub-methods if applicable)
  - Check
  - Store Credit
- **Selection Persistence**: Remember last-used payment method during session

#### Cash Payment Flow
- **Amount Tendered Field**: Numeric input for cash amount received
- **Automatic Change Calculation**: Display change due (tendered - total)
- **Change Notification**: 
  - Verbal alert if speaker available
  - Visual highlight if change is significant
  - Warning if customer underpays (insufficient cash)
- **Confirmation of Cash Received**: Checkbox confirmation before completing transaction
- **Drawer Integration**: Trigger cash drawer open (if available via API)
- **Large Print Display**: Display change amount in large, readable font
- **Visual Feedback**: Color-coded display (green for sufficient cash, red for insufficient)

#### Card Payment Flow
- **Card Method Selector**: 
  - Visa, Mastercard, Amex options
  - Local card schemes (if applicable)
- **Payment Gateway Trigger**: 
  - Display "Processing payment..." message
  - Initiate payment gateway call (PayHere, WebXPay, KOKO)
- **Terminal Status Display**:
  - Spinning loader during processing
  - 20-30 second timeout indication
  - "Do not remove card" message
- **Response Handling**:
  - Success: Approval message with auth code
  - Decline: Decline message with reason
  - Timeout: Retry option or manual entry option
- **Retry Capability**: Retry button appears if payment declined
- **Receipt of Confirmation**: Display transaction reference/receipt number

#### Check Payment Flow
- **Check Details Form**:
  - Check number field (validation: numeric, 6-8 digits typically)
  - Check date field (calendar picker)
  - Bank name field (with autocomplete for common banks)
  - Payee name field (auto-filled from business name, not editable for security)
  - Amount field (auto-filled from transaction total, not editable)
- **Photo Capture** (Optional): Camera button to photograph check front and back
- **Check Validation**: 
  - Check number must be numeric
  - Check date must be same-day or post-dated (not past-dated)
  - All fields required
- **Confirmation Message**: Display check details for verification

#### Store Credit Payment Flow
- **Customer Credit Lookup**: 
  - Display current credit balance from customer profile
  - Show credit expiry date (if applicable)
- **Payment Type Toggle**:
  - Full credit payment (use all remaining credit)
  - Partial credit payment (specify amount, remaining displayed)
- **Credit Balance Display**: 
  - Current balance before payment
  - Balance after payment (preview)
- **Credit Expiry Handling**: Warning if credit expires soon
- **Automatic Deduction**: Deduct credit balance from customer profile on transaction completion

#### Payment Confirmation Display
- **Confirmation Summary**:
  - Payment method used
  - Amount paid
  - Receipt number (unique identifier)
  - Transaction status (completed, pending, failed)
- **Timing**: Display for 3-5 seconds or until dismissed
- **Next Action Options**:
  - Print receipt button
  - Email receipt button
  - Complete transaction/Return to home

#### Duplicate Submission Prevention
- **Button Disable**: Complete payment button disabled after click
- **Loading State**: Button shows "Processing..." state
- **Request Deduplication**: Backend validates idempotency key
- **Prevent Multiple Submissions**: Lock payment flow until response received

#### Error Handling and Feedback
- **Error Messages**: Clear, actionable error messages for common issues
  - "Card declined - please use different card"
  - "Payment gateway timeout - please retry"
  - "Insufficient store credit - please use another payment method"
- **Retry Options**: Retry button for transient failures
- **Fallback Options**: Alternative payment method selection

---

## Backend API Requirements

### Payment Validation Endpoint

**POST /api/pos/payments/validate/**
- Request Body:
  - `tenant_id` (string, required): Tenant identifier
  - `transaction_id` (string, required): Transaction identifier
  - `payment_method` (string, required): Payment method (CASH/CARD/CHECK/CREDIT)
  - `amount` (number, required): Payment amount
  - `customer_id` (string, optional): Customer identifier for credit payment
- Response:
  - `is_valid` (boolean): Whether payment is valid
  - `error_message` (string, nullable): Reason for invalid payment
  - `validation_details` (object): Method-specific details
    - For credit: `available_credit`, `credit_expiry_date`
    - For card: `supported_cards` array
    - For check: `business_name`, `check_requirements`
- Response Time Target: <200ms

### Cash Payment Endpoint

**POST /api/pos/payments/cash/**
- Request Body:
  - `tenant_id` (string, required)
  - `transaction_id` (string, required)
  - `amount_tendered` (number, required): Cash amount given by customer
  - `transaction_total` (number, required): Total to be paid
  - `cashier_id` (string, required): Cashier processing payment
  - `terminal_id` (string, required): Terminal identifier
- Response:
  - `payment_id` (string): Unique payment identifier
  - `change_due` (number): Change amount to give
  - `status` (string): Payment status (COMPLETED)
  - `timestamp` (datetime): Payment timestamp
- Response Time Target: <500ms
- Side Effects: Trigger cash drawer (if available)

### Card Payment Endpoint

**POST /api/pos/payments/card/**
- Request Body:
  - `tenant_id` (string, required)
  - `transaction_id` (string, required)
  - `card_type` (string, required): Visa, Mastercard, Amex, or local scheme
  - `amount` (number, required): Payment amount
  - `currency` (string, required): Currency code (LKR, USD, etc.)
  - `cashier_id` (string, required)
  - `terminal_id` (string, required)
  - `idempotency_key` (string, required): Unique key for duplicate detection
- Response (Immediate):
  - `payment_id` (string): Payment identifier
  - `status` (string): Payment status (PENDING)
  - `gateway_request_id` (string): Request ID for tracking
  - `timeout_seconds` (number): How long to wait for response (20-30 seconds)
- Response Time Target: <1s (async processing)
- Async Response: Via webhook when payment gateway responds

### Check Payment Endpoint

**POST /api/pos/payments/check/**
- Request Body:
  - `tenant_id` (string, required)
  - `transaction_id` (string, required)
  - `check_number` (string, required): Check number (validation: numeric)
  - `check_date` (date, required): Check date
  - `bank_name` (string, required): Bank name
  - `amount` (number, required): Check amount
  - `payee_name` (string, required): Payee (auto-filled, not editable)
  - `check_photo_url` (string, optional): URL to check photo
  - `cashier_id` (string, required)
  - `terminal_id` (string, required)
- Response:
  - `payment_id` (string): Payment identifier
  - `status` (string): Payment status (COMPLETED/PENDING for verification)
  - `receipt_number` (string): Transaction reference
- Response Time Target: <500ms
- Side Effects: Store check details for reconciliation

### Store Credit Payment Endpoint

**POST /api/pos/payments/credit/**
- Request Body:
  - `tenant_id` (string, required)
  - `transaction_id` (string, required)
  - `customer_id` (string, required): Customer making payment
  - `amount` (number, required): Credit amount to use
  - `cashier_id` (string, required)
  - `terminal_id` (string, required)
- Response:
  - `payment_id` (string): Payment identifier
  - `status` (string): Payment status (COMPLETED/FAILED if insufficient credit)
  - `credit_used` (number): Amount deducted from credit
  - `remaining_credit` (number): Remaining credit balance
- Response Time Target: <500ms
- Side Effects: Deduct from customer credit balance

### Payment Gateway Webhook Endpoint

**POST /api/pos/payments/process-webhook/**
- Webhook Source: Payment gateway (PayHere, WebXPay, KOKO)
- Request Body (varies by gateway):
  - `payment_id` (string): Our internal payment ID
  - `gateway_payment_id` (string): Gateway's payment ID
  - `status` (string): Payment status from gateway (SUCCESS/FAILED/CANCELLED)
  - `auth_code` (string): Authorization code if successful
  - `error_reason` (string, nullable): Error description if failed
  - `signature` (string): Webhook signature for validation
- Response:
  - `received` (boolean): Confirmation webhook received
- Response Time Target: <1s (should be fast to unblock gateway)
- Processing: Async update of payment status in database

### Payment Methods Endpoint

**GET /api/pos/payment-methods/**
- Query Parameters:
  - `tenant_id` (string, required): Tenant identifier
- Response: Array of payment methods with:
  - `method_name` (string): Cash, Card, Check, Credit
  - `is_active` (boolean): Whether method is enabled
  - `method_config` (object): Method-specific configuration
    - For card: `supported_card_types`, `gateway_name`
    - For credit: `max_credit_limit`, `expiry_enabled`
- Response Time Target: <50ms (cached)

### Payment Status Endpoint

**GET /api/pos/payments/{transaction_id}/status/**
- Path Parameters:
  - `transaction_id` (string): Transaction identifier
- Query Parameters:
  - `tenant_id` (string, required)
- Response:
  - `payment_id` (string): Payment identifier
  - `status` (string): Current payment status (PENDING/COMPLETED/FAILED)
  - `payment_method` (string): Method used
  - `amount` (number): Payment amount
  - `timestamp` (datetime): Payment time
  - `error_message` (string, nullable): Error if failed
- Response Time Target: <100ms

---

## Database Requirements

### Payment Model
```
Columns:
- id (UUID, primary key)
- tenant_id (UUID, foreign key to Tenant)
- transaction_id (UUID, foreign key to POS_Transaction)
- payment_method (String, enum: CASH/CARD/CHECK/CREDIT)
- amount (Decimal, 2 decimal places)
- status (String, enum: PENDING/COMPLETED/FAILED)
- payment_date (DateTime)
- created_at (DateTime)
- updated_at (DateTime)

Indexes:
- (tenant_id, transaction_id)
- (tenant_id, payment_method)
- (payment_date)
- (status)
```

### CardPayment Model
```
Columns:
- id (UUID, primary key)
- payment_id (UUID, foreign key to Payment)
- card_type (String, enum: VISA/MASTERCARD/AMEX/OTHER)
- card_last_four (String, 4 digits only, no full card number stored)
- card_brand (String)
- auth_code (String): Authorization code from payment gateway
- gateway_response_id (String): Unique ID from payment gateway
- gateway_name (String): PayHere/WebXPay/KOKO
- created_at (DateTime)

Indexes:
- (payment_id)
- (gateway_response_id)
```

### CheckPayment Model
```
Columns:
- id (UUID, primary key)
- payment_id (UUID, foreign key to Payment)
- check_number (String): Check number
- check_date (Date): Date on check
- bank_name (String): Bank name
- check_photo_url (String, nullable): URL to stored check photo
- verification_status (String, enum: PENDING/VERIFIED/REJECTED, default: PENDING)
- verified_by (UUID, nullable): Staff member who verified
- verified_at (DateTime, nullable)
- created_at (DateTime)

Indexes:
- (payment_id)
- (check_number, bank_name)
```

### CreditPayment Model
```
Columns:
- id (UUID, primary key)
- payment_id (UUID, foreign key to Payment)
- customer_id (UUID, foreign key to Customer)
- credit_used (Decimal, 2 decimal places)
- remaining_credit (Decimal, 2 decimal places): Balance after payment
- created_at (DateTime)

Indexes:
- (payment_id)
- (customer_id)
```

### PaymentGatewayLog Model
```
Columns:
- id (UUID, primary key)
- tenant_id (UUID, foreign key to Tenant)
- transaction_id (UUID, foreign key to POS_Transaction)
- payment_id (UUID, foreign key to Payment, nullable)
- gateway_name (String, enum: PAYHEREWEBXPAYKOKO)
- request_payload (JSON): Request sent to gateway
- response_payload (JSON): Response from gateway
- status (String, enum: PENDING/SUCCESS/FAILED/TIMEOUT)
- error_message (Text, nullable)
- created_at (DateTime)

Indexes:
- (tenant_id, gateway_name)
- (transaction_id)
- (payment_id)
- (status)
```

### PaymentIdempotencyKey Model (Duplicate Prevention)
```
Columns:
- id (UUID, primary key)
- idempotency_key (String, unique across system)
- payment_id (UUID, foreign key to Payment)
- tenant_id (UUID)
- created_at (DateTime)

Indexes:
- (idempotency_key)
- (tenant_id, created_at)
```

---

## Validation & Edge Cases

### Amount Validation
- **Payment Amount Limits**: 
  - Cannot exceed transaction total
  - Must be positive (>0)
  - Validate decimal precision (2 decimal places max)
- **Rounding Issues**: Handle floating-point precision in calculations
- **Currency Conversion**: If multi-currency, validate exchange rates

### Payment Method Constraints
- **Partial Payments**: 
  - Support splitting amount between multiple methods
  - Validate total of all payments equals transaction total
  - Prevent overpayment
- **Payment Method Restrictions**: 
  - Certain customers may only use specific methods
  - Check credit limit for credit method
  - Validate card type (if limited to specific cards)

### Insufficient Funds
- **Cash Drawer Low**: Alert if cash drawer balance too low
- **Customer Credit Insufficient**: Prevent credit payment if credit too low
- **Card Declined**: Handle card declines gracefully with retry option

### Payment Gateway Issues
- **Gateway Timeout**: 20-30 second timeout for card gateway response
- **Gateway Downtime**: Fallback to manual entry (if configured)
- **Retry Logic**: Exponential backoff for failed gateway calls
- **Webhook Failures**: Handle missing/delayed webhook confirmations

### Duplicate and Concurrent Payment Prevention
- **Duplicate Submission**: Idempotency key prevents double-processing
- **Button Disable**: Prevent rapid multiple clicks
- **Request Timeout**: Prevent stale requests from processing

### Check Payment Specifics
- **Check Date Validation**: 
  - Cannot be past-dated (security)
  - Can be same-day or post-dated
  - Validate date format
- **Check Number Uniqueness**: Log to prevent duplicate check numbers
- **Fraud Detection**: Optional - flag suspicious check patterns

### Store Credit Specifics
- **Credit Expiry**: Handle expired credits (prevent use or warn)
- **Minimum Credit Balance**: Prevent reduction below minimum (if applicable)
- **Credit Hold Period**: If partial payment, hold remaining credit for limited time

### Multi-Currency Support
- **Currency Consistency**: Validate all amounts in same currency
- **Exchange Rates**: Use consistent exchange rates during transaction
- **Display Formatting**: Format amounts with currency symbols correctly

---

## Testing Checklist

### Payment Method Display
- [ ] Only enabled payment methods display as options
- [ ] Disabled payment methods hidden from selector
- [ ] All enabled methods are functional

### Cash Payment Testing
- [ ] Amount tendered input accepts numeric values only
- [ ] Change calculation correct for various amounts
- [ ] Change calculation shows negative for underpayment (validation prevents)
- [ ] Cash drawer trigger works (if available)
- [ ] Payment status recorded as COMPLETED
- [ ] Change displayed in large, readable font

### Card Payment Testing
- [ ] Card method selector shows correct card types
- [ ] Payment processing message displays during gateway call
- [ ] Successful card payment: Auth code received, status COMPLETED
- [ ] Declined card: Error message displays, retry button appears
- [ ] Card payment timeout: Error message after 30 seconds, retry option
- [ ] Mock successful transaction processed correctly
- [ ] Mock declined card scenario handled properly
- [ ] Payment gateway response logged correctly
- [ ] Duplicate card payment submission prevented
- [ ] Webhook from payment gateway processed correctly

### Check Payment Testing
- [ ] Check number field accepts only numeric input
- [ ] Check date field shows calendar picker
- [ ] Bank name field has autocomplete
- [ ] Payee name auto-filled from business (not editable)
- [ ] Amount field auto-filled from transaction (not editable)
- [ ] Check photo capture works (if camera available)
- [ ] All required fields validated before submission
- [ ] Check payment status recorded as COMPLETED or PENDING
- [ ] Check details stored in database correctly

### Store Credit Payment Testing
- [ ] Customer credit balance displays correctly
- [ ] Full credit payment: Uses all available credit
- [ ] Partial credit payment: Allows specific amount entry
- [ ] Remaining credit calculated correctly
- [ ] Credit deducted from customer profile after payment
- [ ] Credit expiry warning appears (if applicable)
- [ ] Insufficient credit: Payment fails, error message displays
- [ ] Credit payment status recorded correctly

### Duplicate Prevention
- [ ] Complete payment button disabled after first click
- [ ] Button shows "Processing..." state during submission
- [ ] Second click on button ignored (no duplicate payment)
- [ ] Multiple rapid submissions prevented

### Error Handling
- [ ] Clear error messages for all failure scenarios
- [ ] Retry button appears for transient failures
- [ ] Alternative payment method selection available
- [ ] User can cancel payment and select different method

### Payment Confirmation
- [ ] Confirmation display shows payment method, amount, receipt number
- [ ] Confirmation appears for 3-5 seconds (or dismissible)
- [ ] Print receipt button visible from confirmation
- [ ] Email receipt option available (if configured)
- [ ] Transaction completes after confirmation

### Database Recording
- [ ] Payment record created with correct method and amount
- [ ] Card payment: CardPayment record stored with masked card
- [ ] Check payment: CheckPayment record stored with details
- [ ] Credit payment: CreditPayment record shows credit deduction
- [ ] Payment status correctly recorded (PENDING/COMPLETED/FAILED)
- [ ] Timestamps accurate for all payment records

### Payment Gateway Integration
- [ ] Payment gateway called with correct parameters
- [ ] Gateway response received and processed
- [ ] Webhook from gateway processed without error
- [ ] Payment status updated via webhook
- [ ] Gateway errors logged appropriately

---

## Implementation Checklist

### Frontend Components
- [ ] Payment method selector component
- [ ] Cash payment input form (amount tendered, change calculation)
- [ ] Card payment handler (displays processing message, timeout handling)
- [ ] Card method selector (Visa, Mastercard, Amex)
- [ ] Check payment form (check details input)
- [ ] Store credit payment handler (credit lookup, deduction display)
- [ ] Payment confirmation component (method, amount, receipt number)
- [ ] Error message component (actionable error display)
- [ ] Retry button component (appears on transient failures)
- [ ] Loading spinner (during payment processing)

### Backend API Endpoints
- [ ] POST /api/pos/payments/validate/ endpoint
- [ ] POST /api/pos/payments/cash/ endpoint
- [ ] POST /api/pos/payments/card/ endpoint
- [ ] POST /api/pos/payments/check/ endpoint
- [ ] POST /api/pos/payments/credit/ endpoint
- [ ] GET /api/pos/payment-methods/ endpoint
- [ ] POST /api/pos/payments/process-webhook/ endpoint
- [ ] GET /api/pos/payments/{transaction_id}/status/ endpoint

### Business Logic Services
- [ ] Payment validation service (funds check, credit limits, etc.)
- [ ] Cash payment processing service
- [ ] Card payment gateway integration (PayHere, WebXPay, KOKO)
- [ ] Check payment recording service
- [ ] Store credit deduction service
- [ ] Payment status tracking service
- [ ] Duplicate payment prevention service (idempotency)
- [ ] Payment confirmation service

### Payment Gateway Integration
- [ ] PayHere API integration (if used)
- [ ] WebXPay API integration (if used)
- [ ] KOKO API integration (if used)
- [ ] Webhook receiver implementation
- [ ] Payment status polling mechanism
- [ ] Error handling and retry logic
- [ ] Request signing/validation for security

### Database Schema
- [ ] Payment table creation and migration
- [ ] CardPayment table creation
- [ ] CheckPayment table creation
- [ ] CreditPayment table creation
- [ ] PaymentGatewayLog table creation
- [ ] PaymentIdempotencyKey table creation
- [ ] Indexes for query optimization
- [ ] Foreign key constraints

### Utilities and Services
- [ ] Change calculation function (for cash payments)
- [ ] Payment amount validation service
- [ ] Currency formatting service
- [ ] Idempotency key generation and validation
- [ ] Payment timeout handler
- [ ] Error logging and tracking
- [ ] Payment audit logging

---

## Deployment Strategy

### Pre-Deployment
1. **Payment Gateway Setup**:
   - Obtain API credentials from PayHere, WebXPay, KOKO (as applicable)
   - Configure test mode for initial testing
   - Register webhook URLs with payment gateways
   - Test payment gateway connectivity

2. **Database Preparation**:
   - Execute database migration for all payment tables
   - Create necessary indexes
   - Backup existing data

3. **Configuration**:
   - Configure payment gateway credentials in environment
   - Enable/disable payment methods per tenant
   - Set up payment timeouts and retry policies
   - Configure email/SMS for payment receipts

4. **Testing**:
   - Thorough testing with test accounts from payment gateways
   - Test all payment methods (cash, card, check, credit)
   - Test error scenarios (declined cards, timeout, etc.)
   - Verify webhook delivery and processing

### Phased Rollout
1. **Phase 1 - Payment Gateway Only** (1-2 days):
   - Deploy payment validation and backend APIs
   - Do NOT deploy frontend yet
   - Verify API endpoints working correctly
   - Test with internal staff on test terminals

2. **Phase 2 - Frontend Deployment** (Day 3):
   - Deploy payment method selector and cash payment flow
   - Monitor for issues
   - Collect feedback

3. **Phase 3 - Card Payment** (Day 4):
   - Deploy card payment flow
   - Coordinate with payment gateway provider
   - Close monitoring for payment processing

4. **Phase 4 - Check and Credit** (Day 5):
   - Deploy check payment flow
   - Deploy store credit payment flow
   - Full feature complete

### Staff Training
1. **Pre-Training Preparation**:
   - Create training materials for each payment method
   - Prepare demo transactions for hands-on practice

2. **Training Sessions**:
   - Manager pre-training (demo all payment methods)
   - Store cashier training (walk through each payment flow)
   - Emphasis on error handling and retry procedures

3. **Support During Rollout**:
   - Dedicated support line for payment-related issues
   - Quick-reference card with common issues/solutions
   - Video tutorials for common tasks

### Rollback Plan
1. **Version Management**: 
   - Maintain previous payment processing version
   - Database schema backward compatible (new tables, old logic still works)
   - Feature toggles allow disabling new payment methods

2. **Quick Rollback**:
   - Feature toggle to disable new payment processing
   - Revert to old payment endpoints if critical issues
   - Database transaction logs for audit/investigation

3. **Monitoring During Rollout**:
   - Alert on payment failure rate >1%
   - Alert on payment timeout >5%
   - Alert on payment gateway unreachability

---

## Performance Targets

### Response Times
- Payment validation: <200ms
- Cash payment processing: <500ms
- Card payment authorization: <5s (gateway dependent, but we request response within 30s)
- Check payment recording: <500ms
- Store credit payment: <500ms
- Payment status retrieval: <100ms
- Payment methods retrieval: <50ms (cached after first load)

### Throughput
- Support 100+ payment transactions per second
- Handle payment gateway requests/responses within SLAs
- Webhook processing: <1s per webhook (should be async)

### Reliability
- Payment method selector load time: <50ms
- Duplicate prevention: Zero duplicate payments
- Payment status accuracy: 100% (webhook or polling)
- Payment gateway failover (if multiple gateways): <5s

### Resource Usage
- Payment processing memory: <50MB per transaction
- Payment gateway log storage: 1KB-5KB per transaction
- Database storage for payment records: 100 bytes-1KB per payment

---

## Monitoring & Alerting

### Key Metrics
- **Payment Success Rate**: Track successful vs failed payments; alert if <99.5%
- **Card Payment Success Rate**: Separate tracking for card method
- **Payment Processing Latency**: P50, P95, P99 response times
- **Payment Gateway Response Time**: Monitor gateway latency
- **Webhook Delivery**: Track webhook received percentage
- **Payment Retry Rate**: Monitor how often payments are retried
- **Duplicate Submission Attempts**: Track (should be zero)
- **Payment Method Distribution**: Validate all enabled methods used
- **Cash Drawer Status**: Track if cash drawer is low (if integrated)
- **Store Credit Usage**: Track credit payment frequency

### Alerts (Immediate Escalation)
- Payment success rate drops below 99.5%
- Payment gateway unreachable (unable to process card payments)
- Webhook delivery failure (payments not confirmed)
- Card payment timeout rate exceeds 5%
- Duplicate payment detected (should never happen)
- Database payment record failures
- High-value transaction failures (>50x average transaction)

### Dashboards
- Real-time payment success rate
- Payment method distribution pie chart
- Average transaction processing time
- Payment gateway latency heatmap
- Failed payment reasons breakdown
- Duplicate submission prevention status
- Webhook delivery status (received vs processing failures)

---

## Documentation Requirements

### User Documentation
1. **Payment Methods Setup Guide**:
   - How to enable/disable payment methods per tenant
   - Configuration options for each method
   - Testing procedures for each method

2. **Card Payment Troubleshooting**:
   - Common card decline reasons and solutions
   - Timeout handling (what to do if card payment takes >30 seconds)
   - Retry procedures
   - Fallback to manual entry (if applicable)

3. **Check Payment Handling**:
   - Check details required for entry
   - Check date validation (no past-dating)
   - Photo capture procedure (if applicable)
   - Check verification and deposit process

4. **Store Credit Management**:
   - How to allocate credit to customers
   - Customer credit status display
   - Credit expiry handling (if applicable)
   - Credit refund procedures

5. **Payment Reconciliation Guide**:
   - Daily payment settlement procedures
   - Variance investigation for missing payments
   - Payment report generation
   - Refund processing

### Administrative Documentation
1. **Payment Gateway Configuration**:
   - PayHere integration setup
   - WebXPay integration setup
   - KOKO integration setup (if applicable)
   - API credential management
   - Test vs production mode switching

2. **Payment Terminal Hardware Setup**:
   - Card reader driver installation and configuration
   - Cash drawer driver installation (if applicable)
   - Check scanner setup (if applicable)
   - Printer setup for payment receipts

3. **Payment Methods Administration**:
   - Enable/disable payment methods
   - Configure payment timeout values
   - Set up payment retry policies
   - Configure maximum transaction amounts (if applicable)

### Technical Documentation
1. **API Integration Guide**:
   - Payment validation endpoint specification
   - Card payment endpoint with gateway integration details
   - Webhook receiver specification
   - Error codes and handling
   - Idempotency key generation

2. **Payment Gateway Integration**:
   - PayHere API documentation reference
   - WebXPay API documentation reference
   - KOKO API documentation reference
   - Webhook signature validation
   - Request/response format specifications

3. **Database Schema**:
   - Payment table structure and relationships
   - CardPayment, CheckPayment, CreditPayment schemas
   - PaymentGatewayLog structure
   - Query patterns and indexes

---

## Future Enhancements

### Mobile Wallet Support
- **Apple Pay Integration**: Process payments via Apple Pay
- **Google Pay Integration**: Process payments via Google Pay
- **Contactless Payment**: NFC support for mobile wallets

### Buy Now, Pay Later
- **Slice Integration**: BNPL provider integration
- **PayLater Services**: Local BNPL provider support
- **Installment Plans**: Multiple installment payment options

### Advanced Payment Methods
- **Cryptocurrency Payment**: Bitcoin, Ethereum (if market applicable)
- **QR Code Payment**: PayHere QR, Visa QR, other QR payment methods
- **Digital Wallet**: Local digital wallet support

### Payment Management
- **Automated Refund Processing**: Full/partial refunds without manual intervention
- **Multi-Currency Payment**: Automatic conversion with real-time rates
- **Payment Plan Management**: Installment tracking and management

### Receipt and Communication
- **Receipt Delivery**: Auto-send via SMS, Email, WhatsApp
- **Payment Confirmation**: SMS/Email confirmation of payment
- **Receipt Archival**: Long-term storage for compliance

### Analytics and Reporting
- **Payment Analytics Dashboard**: Hourly settlement reports
- **Payment Method Analysis**: Trends and usage patterns
- **Revenue Forecasting**: Based on payment history
- **Fraud Detection**: Pattern analysis for suspicious payments

### Security and Compliance
- **PCI Compliance**: Full PCI-DSS compliance for card payments
- **Tokenization**: Store card tokens instead of full card data
- **3D Secure**: Enhanced card security with 3D Secure protocol
- **Payment Audit Trail**: Complete audit logging for compliance
