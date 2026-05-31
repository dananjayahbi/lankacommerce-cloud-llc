# Invoice Detail View Feature Specification

## Executive Summary

The Invoice Detail View is a comprehensive transactional page within the LankaCommerce Cloud LLC platform, providing a complete overview of individual invoice records with full payment history, audit trails, and actionable controls. This feature displays detailed invoice information with professional formatting suitable for customer viewing, enables payment recording and reconciliation, supports invoice actions (send, print, refund), and maintains a complete audit trail of all changes. It serves as the primary interface for invoice verification, payment tracking, and customer communication, supporting both internal staff operations and customer-facing transparency.

## Current State Analysis

### Existing Functionality
- Basic invoice data retrieval implemented
- Invoice display with basic information
- Simple status display

### Identified Gaps
- No comprehensive detail view layout
- Missing payment history section
- No payment recording interface
- Missing audit trail display
- No invoice action buttons (send, print, refund)
- No payment status detailed display
- Missing customer information section
- No order reference details
- No line items detailed display
- Missing bank details section
- No notes and terms display
- No responsive design for mobile
- Missing accessibility features
- No real-time status updates
- Missing concurrent edit detection
- No print functionality
- No export to PDF functionality
- No refund processing interface

### Performance Issues
- Slow payment history retrieval for invoices with many payments
- No lazy loading of audit trail
- Missing caching of frequently accessed invoices
- N+1 query problems with related data

## Detailed Requirements

### Frontend Requirements

#### UI Components and Layout
- Main invoice detail container with logical sections
- Invoice header section with key information
- Customer information section
- Order reference section (if applicable)
- Payment status section
- Line items section with summary
- Invoice summary (totals section)
- Bank details section
- Notes and terms section
- Payment history section with detailed table
- Audit trail section with chronological events
- Action buttons panel
- Modal components for dialogs (payment, refund, send)
- Print layout for professional appearance
- Mobile responsive layout

#### Invoice Header Section
- Invoice number displayed prominently
- Invoice status badge with color coding (Draft: Gray, Sent: Blue, Paid: Green, Partially Paid: Orange, Overdue: Red, Cancelled: Black)
- Invoice date display
- Due date display
- Payment status badge and indicator
- Days overdue indicator if applicable (with warning colors)
- Quick actions menu (More options)
- Print button
- Export button
- Share invoice option (email link)

#### Customer Information Section
- Customer name (displayed as clickable link to customer profile)
- Contact information:
  - Phone number (clickable tel link)
  - Email address (clickable mailto link)
  - Website if available
- Billing address:
  - Street address
  - City, state, postal code
  - Country
  - Formatted for display
- Shipping address (if different from billing):
  - Same fields as billing
  - Clearly marked as shipping address
  - Collapse/expand for compact view
- Customer notes or special instructions (if any)
- Customer credit limit and current credit used (for internal use)
- Tax exemption status indicator

#### Order Reference Section
- Conditional display (only if invoice created from order)
- Order ID displayed as clickable link to order detail
- Order date
- Order total
- Quick link to view full order
- Items reference (showing count of items from order)

#### Payment Status Section
- Payment status badge (Unpaid, Partially Paid, Paid, Overpaid)
- Amount due display (large and prominent)
- Amount paid display
- Balance amount display
- Overdue indicator with days overdue count (if applicable)
- Payment progress bar showing percentage collected
- Last payment date if any payments recorded
- Next payment reminder date if scheduled

#### Line Items Section
- Detailed line items table with columns:
  - Description
  - Quantity (with units if applicable)
  - Unit price (with currency)
  - Discount (displayed if applied)
  - Tax (with rate)
  - Amount (total for line item)
- Total rows showing:
  - Subtotal amount
  - Discount amount (if applied)
  - Tax breakdown (itemized by tax rate)
  - Grand total amount
- All amounts clearly formatted with currency
- Subtotals for sections if applicable (if invoices support section grouping)

#### Invoice Summary Section
- Subtotal: Sum of all line items
- Tax breakdown:
  - Each tax rate shown separately with amount
  - If multiple rates, show itemized breakdown
  - Tax percentage displayed with amount
- Discount section:
  - Discount type (percentage or fixed amount)
  - Discount reason (if provided)
  - Discount amount
- Grand total (prominent display with large font)
- All amounts clearly aligned and formatted

#### Bank Details Section
- Account name
- Account number (masked for security, e.g., ***1234)
- Bank name
- SWIFT code
- Routing number
- IBAN
- Bank branch
- Reference text for payment (if configured)
- Payment instructions (if configured)

#### Notes and Terms Section
- Invoice notes display (formatted)
- Terms and conditions display (formatted)
- Rich text rendering if applicable
- Custom formatting preservation

#### Payment History Section
- Detailed payment history table with columns:
  - Payment date
  - Amount paid
  - Payment method
  - Reference/transaction ID (clickable if external reference)
  - Status (Success, Pending, Failed, Disputed)
  - Notes or description
  - Recorded by (user who recorded)
- Chronological ordering (most recent first)
- Total payments display
- Payment status color coding
- Empty state message if no payments recorded
- Quick payment summary above table

#### Payment Recording Section
- Record payment button (visible if unpaid or partially paid)
- Opens modal with fields:
  - Payment date (defaults to today)
  - Amount (defaults to full amount due)
  - Payment method dropdown
  - Reference/transaction ID field
  - Notes field
  - Submit button (Record Payment)
  - Cancel button
- Validation:
  - Amount must be positive and not exceed amount due (unless overpayment allowed)
  - Payment date must be <= today
  - Payment method required
- Confirmation message after successful recording
- Automatic refresh of payment status

#### Partial Payment Section
- Partial payment option (if unpaid or partially paid)
- Opens modal similar to full payment
- Allows recording payment for less than full amount
- Calculates remaining balance after partial payment
- Updates payment status to "Partially Paid"
- Shows updated amount due

#### Mark as Paid Option
- Mark as paid button (if unpaid)
- Confirms that invoice is paid in full
- Opens modal for payment date selection
- Assumes full amount paid on selected date
- Quick mark as paid without detailed recording

#### Refund Section (Conditional)
- Refund button (visible if overpaid)
- Opens refund modal with:
  - Overpaid amount display
  - Refund amount field (editable)
  - Refund method selector
  - Refund date
  - Reference field
  - Notes field
- Refund processing and confirmation
- Updates payment status and amount due

#### Action Buttons
- Edit invoice button (conditional: only if draft status)
  - Opens invoice for editing
  - Shows as disabled if not draft
  - Tooltip explaining why disabled
- Send invoice button
  - Opens email preview modal
  - Pre-filled with customer email
  - Subject line editable
  - Message body editable
  - Attachment selection (invoice PDF)
  - Preview option
  - Send button
  - Success confirmation
- Print invoice button
  - Opens print dialog
  - Professional print layout
  - Optimized for PDF export
  - Header and footer customizable
- Export invoice button
  - Dropdown with format options (PDF, Excel, CSV)
  - Downloads invoice in selected format
- Delete invoice option (conditional: only if draft)
  - Confirmation dialog
  - Warning about permanent deletion
  - Reason field (optional)
  - Delete and Cancel buttons
- Additional actions menu (More options):
  - Archive invoice
  - Mark as disputed
  - Duplicate invoice
  - Create credit note
  - Manage payment reminders

#### Audit Trail Section
- Chronological log of all changes to invoice
- Entries show:
  - Timestamp
  - User who made change
  - Action/change description
  - Old value (if change) and new value (if change)
  - Expandable details for complex changes
- Events tracked:
  - Invoice created
  - Invoice sent
  - Invoice edited
  - Payment recorded
  - Status changed
  - Invoice cancelled
  - Refund issued
  - Any property modified
- Collapsible section (can be hidden to reduce clutter)
- Empty state if no changes since creation

#### Mobile Responsive Design
- Single column layout
- Stacked sections in logical order
- Full-width content
- Bottom sheet for action buttons
- Optimized table display for line items (card format)
- Collapsed audit trail and payment history initially
- Expandable sections to reduce initial scroll
- Touch-friendly button sizes
- Mobile-optimized print layout

#### Accessibility and Keyboard Navigation
- ARIA labels for all interactive elements
- Semantic HTML structure
- Keyboard navigation through all sections
- Tab order optimization
- Keyboard shortcuts: Ctrl+P for print, Ctrl+E for export, Ctrl+R for record payment
- Focus indicators on all buttons
- Screen reader announcements for status changes
- Form labels associated with inputs
- Skip navigation links
- High contrast mode support
- Color not the only indicator of status

#### States and Feedback
- Loading state while fetching details
- Error state with retry option
- Payment recording loading state
- Confirmation messages for actions
- Toast notifications for success/error
- Unsaved changes warning (if editable draft)
- Real-time status updates if invoice changes

### Backend Requirements

#### API Endpoints

GET /api/billing/invoices/{id}/
- Purpose: Retrieve complete invoice details
- Response:
  - id (integer)
  - invoice_number (string)
  - order_id (integer, nullable)
  - customer_id (integer)
  - customer object: id, name, email, phone, billing_address, shipping_address
  - invoice_date (date)
  - due_date (date)
  - line_items (array): id, description, quantity, unit_price, discount, tax, amount
  - subtotal (decimal)
  - tax_amount (decimal)
  - tax_breakdown (array): tax_rate, amount
  - discount_amount (decimal)
  - discount_reason (string)
  - total_amount (decimal)
  - amount_paid (decimal)
  - amount_due (decimal)
  - status (string)
  - payment_status (string)
  - payment_method (string)
  - notes (string)
  - terms (string)
  - bank_account object: account_name, account_number (masked), bank_name, swift_code, routing_number, iban
  - created_at (timestamp)
  - updated_at (timestamp)
  - created_by (user object: id, name, email)
  - updated_by (user object: id, name, email)
  - version (integer for optimistic locking)
  - days_overdue (integer, 0 if not overdue)
- Authentication: Required
- Permissions: View specific invoice
- Rate Limit: 60 requests per minute

GET /api/billing/invoices/{id}/history/
- Purpose: Retrieve audit trail for invoice
- Query Parameters:
  - page (integer): Default 1
  - page_size (integer): Default 25
- Response:
  - results: Array of history events with: id, timestamp, user object, action, old_value, new_value, description, details
  - count: Total events
  - next/previous: Pagination URLs
- Authentication: Required
- Permissions: View specific invoice

GET /api/billing/invoices/{id}/payments/
- Purpose: Retrieve payment history for invoice
- Query Parameters:
  - page (integer): Default 1
  - page_size (integer): Default 25
- Response:
  - results: Array of payment records with: id, date, amount, payment_method, reference_id, status, notes, recorded_by, created_at
  - count: Total payments
  - summary: total_payments, total_amount_paid
  - next/previous: Pagination URLs
- Authentication: Required
- Permissions: View specific invoice

POST /api/billing/invoices/{id}/record-payment/
- Purpose: Record a payment for the invoice
- Request Body:
  - payment_date (date): Required, <= today
  - amount (decimal): Required, > 0
  - payment_method (string): Required (Credit Card, Bank Transfer, Cash, Cheque)
  - reference_id (string): Optional
  - notes (string): Optional
  - invoice_version (integer): Required for optimistic locking
- Response:
  - success (boolean)
  - invoice object: Updated with new amount_paid, amount_due, payment_status
  - payment object: Created payment record
  - updated_at (timestamp)
- Authentication: Required
- Permissions: Record payments
- Validation:
  - Amount <= (total_amount - amount_already_paid)
  - Payment date <= today
  - Invoice not cancelled
- Status codes: 200 OK, 400 Bad Request, 409 Conflict (concurrent edit)

POST /api/billing/invoices/{id}/mark-paid/
- Purpose: Mark invoice as fully paid
- Request Body:
  - payment_date (date): Optional, defaults to today
  - payment_method (string): Optional
  - notes (string): Optional
- Response: Updated invoice object with status: paid, amount_due: 0, payment_status: Paid
- Authentication: Required
- Permissions: Record payments

POST /api/billing/invoices/{id}/refund/
- Purpose: Process refund for overpaid invoice
- Request Body:
  - refund_amount (decimal): Required
  - refund_method (string): Required
  - refund_date (date): Optional, defaults to today
  - reference_id (string): Optional
  - notes (string): Optional
- Response: Updated invoice with refund recorded
- Authentication: Required
- Permissions: Process refunds

POST /api/billing/invoices/{id}/send/
- Purpose: Send invoice via email
- Request Body:
  - recipient_email (string): Optional, defaults to customer email
  - subject (string): Optional, uses template if not provided
  - message (string): Optional, uses template if not provided
  - include_attachment (boolean): Default true
- Response:
  - success (boolean)
  - message_id (string): Email service ID
  - sent_at (timestamp)
  - invoice_updated: true (status changed to sent if was draft)
- Authentication: Required
- Permissions: Send invoices

POST /api/billing/invoices/{id}/print/
- Purpose: Generate printable invoice
- Query Parameters:
  - format (string): pdf (default), html
- Response:
  - If format=pdf: PDF file download
  - If format=html: HTML content for preview
- Authentication: Required
- Permissions: View invoice

POST /api/billing/invoices/{id}/export/
- Purpose: Export invoice
- Query Parameters:
  - format (string): Required (pdf, xlsx, csv)
- Response: File download in requested format
- Authentication: Required
- Permissions: Export invoices

PATCH /api/billing/invoices/{id}/
- Purpose: Update invoice (draft only)
- Request Body: Any updatable fields (depends on status)
- Response: Updated invoice object
- Authentication: Required
- Permissions: Update specific invoice
- Validation: Only draft invoices can be updated

DELETE /api/billing/invoices/{id}/
- Purpose: Delete invoice (draft only)
- Request Body:
  - reason (string): Optional
- Response: Confirmation message
- Authentication: Required
- Permissions: Delete specific invoice
- Validation: Only draft invoices can be deleted

#### Data Transformation
- Format dates in ISO 8601 format
- Round currency amounts to 2 decimal places
- Calculate days overdue (max(0, today - due_date))
- Mask account numbers for security display
- Format tax breakdown for display
- Include calculated fields (amount_due, days_overdue)

#### Query Optimization
- Use select_related for customer, user, order data
- Use prefetch_related for line items, payments, history
- Implement database caching for invoice details (5-minute TTL)
- Lazy load audit trail and payment history only when requested
- Query only required fields
- Aggregate payment history at database level

#### Error Handling
- Return 401 for unauthenticated requests
- Return 403 for insufficient permissions
- Return 404 for non-existent invoices
- Return 409 for concurrent edit conflicts (version mismatch)
- Return 400 for invalid payment amounts
- Return 400 for payment dates in future
- Return 500 with descriptive error for server issues

### Database Requirements

#### Database Indexes
- Index on (tenant_id, id) for fast lookup
- Index on (tenant_id, status)
- Index on (tenant_id, payment_status)
- Indexes on invoice_id for line items, payments, history
- Composite index on (tenant_id, status, invoice_date)

#### Query Performance
- Target detail view load: < 300ms
- Target payment history load: < 200ms
- Target audit trail load: < 200ms
- Cache invoice details for 5 minutes
- Query only needed fields

#### Data Consistency
- Maintain referential integrity
- Ensure payment amounts don't exceed total
- Maintain audit trail consistency
- Use transactions for complex operations

## Validation & Edge Cases

### Input Validation
- Invoice ID must be valid integer
- Payment amount must be positive decimal
- Payment date must be valid date and <= today
- Payment method must be from predefined list
- Refund amount must be non-negative and <= overpaid amount
- Email addresses must be valid format

### Business Logic Validation
- User can only view invoices for their tenant
- Only draft invoices can be edited or deleted
- Cannot record payment if invoice cancelled
- Cannot record payment for more than owed (unless overpayment enabled)
- Cannot refund if not overpaid
- Cannot mark as paid if already cancelled

### Edge Cases
- Invoice with no payments recorded yet
- Invoice with multiple payments
- Invoice with partial payments
- Overpaid invoice
- Very old invoice
- Invoice with zero discount or tax
- Very long customer names or addresses
- Very long line item descriptions
- Concurrent payment recordings
- Payment recorded on same date as invoice created
- Payment recorded after due date (overdue)
- Refund attempt with no overpayment
- Edit attempt on sent invoice

### Concurrency Handling
- Optimistic locking using version numbers
- Detect concurrent modifications
- Prevent concurrent payment recordings
- Handle concurrent sends
- Conflict resolution strategy

## Testing Requirements

### Unit Testing
- Days overdue calculation
- Payment status calculation
- Amount due calculation
- Tax breakdown calculation
- Permission checking logic

### Integration Testing
- Record payment functionality
- Mark as paid functionality
- Refund processing
- Send invoice email
- Audit trail creation
- Payment history retrieval
- Concurrent edit detection

### End-to-End Testing
- View complete invoice detail
- Record payment for unpaid invoice
- Record partial payment
- View updated payment status
- View payment history
- Send invoice via email
- Print invoice
- Export invoice
- View audit trail
- Edit draft invoice
- Delete draft invoice
- Refund overpaid invoice
- Keyboard navigation through entire page
- Mobile view of invoice

### Performance Testing
- Load invoice with 100+ line items
- Load payment history with 100+ payments
- Load audit trail with 1000+ events
- Concurrent payment recordings
- Large PDF generation
- Concurrent user access to same invoice

### Accessibility Testing
- Screen reader navigation
- Keyboard-only usage
- Tab order verification
- ARIA labels completeness
- Focus indicators visibility
- Color contrast verification

### Mobile Testing
- Responsive layout on various screen sizes
- Touch interactions
- Form inputs on mobile
- Table display on mobile
- Performance on mobile devices

### Security Testing
- Unauthorized access attempts
- Permission bypass attempts
- Data exposure in responses
- Payment recording by unauthorized users
- XSS in text fields
- SQL injection attempts

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Implement GET /api/billing/invoices/{id}/
- [ ] Implement GET /api/billing/invoices/{id}/history/
- [ ] Implement GET /api/billing/invoices/{id}/payments/
- [ ] Add permission checks
- [ ] Implement optimistic locking
- [ ] Add database indexes
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 2: Payment Operations
- [ ] Implement POST /api/billing/invoices/{id}/record-payment/
- [ ] Implement POST /api/billing/invoices/{id}/mark-paid/
- [ ] Implement POST /api/billing/invoices/{id}/partial-payment/
- [ ] Implement POST /api/billing/invoices/{id}/refund/
- [ ] Add validation logic
- [ ] Add audit trail creation
- [ ] Add notification emails

### Phase 3: Invoice Actions
- [ ] Implement POST /api/billing/invoices/{id}/send/
- [ ] Implement POST /api/billing/invoices/{id}/print/
- [ ] Implement POST /api/billing/invoices/{id}/export/
- [ ] Add email templates
- [ ] Add PDF generation
- [ ] Add format converters

### Phase 4: Frontend - Core UI
- [ ] Create invoice detail page component
- [ ] Build invoice header section
- [ ] Build customer information section
- [ ] Build order reference section
- [ ] Build payment status section
- [ ] Build line items section
- [ ] Build summary section
- [ ] Build bank details section

### Phase 5: Frontend - Additional Sections
- [ ] Build notes and terms section
- [ ] Build payment history section
- [ ] Build audit trail section
- [ ] Build action buttons
- [ ] Add mobile responsive layout
- [ ] Implement print layout

### Phase 6: Frontend - Interactivity
- [ ] Connect to APIs for data loading
- [ ] Implement payment recording modal
- [ ] Implement partial payment functionality
- [ ] Implement mark as paid
- [ ] Implement refund functionality
- [ ] Implement send invoice email
- [ ] Implement print functionality
- [ ] Implement export functionality

### Phase 7: Accessibility
- [ ] Add ARIA labels
- [ ] Implement keyboard navigation
- [ ] Test with screen readers
- [ ] Add focus indicators
- [ ] Verify color contrast

### Phase 8: Testing & Optimization
- [ ] Write comprehensive tests
- [ ] Performance testing and optimization
- [ ] Security testing
- [ ] Mobile testing
- [ ] Accessibility testing

### Phase 9: Monitoring & Documentation
- [ ] Set up monitoring
- [ ] Write API documentation
- [ ] Write user guide
- [ ] Write troubleshooting guide
- [ ] Create deployment guide

### Phase 10: Deployment
- [ ] Deploy to staging
- [ ] UAT on staging
- [ ] Deploy to production

## Deployment Strategy

### Pre-Deployment Checklist
- All tests passing
- Database migrations created and tested
- API documentation updated
- User documentation completed
- Performance benchmarks met
- Security review completed
- Monitoring configured

### Deployment Steps
1. Deploy database changes
2. Deploy backend changes
3. Deploy frontend changes
4. Test all functionality
5. Monitor error rates

### Rollback Strategy
- Keep previous API version available
- Database rollback script ready
- Frontend version control via CDN

## Performance Targets

### Response Time
- Load invoice details: < 300ms
- Load payment history: < 200ms
- Load audit trail: < 200ms
- Record payment: < 500ms
- Send email: < 2s
- Generate PDF: < 3s

### Frontend Performance
- Page load time: < 2s
- Time to interactive: < 3s
- PDF generation time: < 3s

## Monitoring & Alerting

### Metrics to Monitor
- Invoice detail page load time
- Payment recording response time
- Email sending success rate
- PDF generation success rate
- Error rates by operation
- Concurrent edit conflicts
- Payment history retrieval performance

### Alerts to Configure
- Detail page load > 1 second
- Payment recording failure rate > 5%
- Email sending failure rate > 10%
- PDF generation failure rate > 10%
- Concurrent edit conflicts

## Documentation Requirements

### API Documentation
- Complete endpoint documentation
- Request/response schemas
- Error codes and messages
- Validation rules
- Payment recording procedures
- Refund procedures

### User Documentation
- How to view invoice details
- How to record payments
- How to mark as paid
- How to process refunds
- How to send invoices
- How to print invoices
- How to export invoices
- Understanding payment status
- Understanding audit trail

### Developer Documentation
- Architecture overview
- Database schema
- API integration guide
- Payment logic documentation
- Audit trail implementation
- Optimistic locking implementation

### Troubleshooting Guide
- Common payment recording issues
- Email sending failures
- PDF generation issues
- Permission denied errors
- Concurrent edit conflicts
- Data display issues

## Future Enhancements

### Phase 2 Considerations
- Payment plan management
- Dispute management workflow
- Credit note creation
- Invoice cloning
- Recurring invoice management
- Custom invoice templates
- Multi-language invoice display
- Digital signature capture

### Phase 3 Considerations
- Payment gateway integration
- Customer payment portal link
- Automated payment reminders
- Payment portal UI
- Mobile payment capture
- Blockchain-based invoice verification
- Invoice factoring integration
