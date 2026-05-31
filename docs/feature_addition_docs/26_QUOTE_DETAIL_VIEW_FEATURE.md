# 26. Quote Detail View Feature

## Executive Summary

The Quote Detail View provides comprehensive visualization and management capabilities for individual quotes throughout their lifecycle. This feature displays all quote information including customer details, line items, pricing summary, terms and conditions, and complete audit trail. The detail view enables sales teams to monitor quote progress, track customer responses, perform critical actions (send, accept, convert to order), and maintain detailed records of all quote interactions. The implementation emphasizes usability, real-time status updates, and seamless integration with quote lifecycle management.

## Current State Analysis

### Gaps and Issues

The platform currently lacks quote detail viewing capabilities. Users cannot:
- View complete quote information in organized format
- Monitor quote lifecycle status and timeline
- Track customer response to quotes
- View quote modification history and audit trail
- Send quotes to customers from detail view
- Accept or reject quotes
- Convert accepted quotes to orders
- Print or email quotes
- View related orders if quote was converted
- Track validity countdown and expiration
- Monitor quote access and viewing history by customer
- Manage quote attachments
- Compare current quote with other quotes
- Send reminders for unanswered quotes

### Business Impact

Lack of detail view prevents sales teams from effectively managing quote lifecycle, tracking customer engagement, and converting quotes to orders. This impacts visibility into sales pipeline and conversion funnel effectiveness.

## Detailed Requirements

### Frontend Requirements

#### Page Layout and Structure
- Header section with quote identification and status
- Breadcrumb navigation showing path from list to detail
- Main content area with tabbed navigation for different sections
- Sticky action bar at top with quick action buttons
- Mobile: Single column layout with collapsible sections
- Desktop: Two-column layout with sidebar for related information
- Footer with pagination to previous/next quote (optional)

#### Quote Header Section
- Quote ID prominently displayed (e.g., "QUOTE-2026-05-00123")
- Quote date display (e.g., "Created on May 15, 2026")
- Status badge (Draft, Sent, Accepted, Rejected, Expired)
- Status badge color-coded and with icon
- Validity countdown timer:
  - Days remaining display (e.g., "Valid for 14 more days")
  - Time remaining display (e.g., "Expires on May 29, 2026 at 2:00 PM")
  - Countdown bar showing remaining time visually
  - Color-coded urgency: Green (7+ days), Yellow (3-7 days), Orange (1-3 days), Red (<1 day or expired)
- Quick action buttons in header (Edit, Send, Delete, Convert to Order, Print, Email)
- Share quote button (generate shareable link)
- Notification badge if quote requires attention

#### Customer Information Section
- Customer name (clickable link to customer profile)
- Customer ID reference
- Customer status indicator (Active, Inactive, VIP, etc.)
- Contact information:
  - Primary contact name
  - Email address (mailto link)
  - Phone number (tel link)
  - Secondary contact information if available
- Billing address
- Shipping address
- Customer credit limit (e.g., "Credit Limit: $50,000 / Used: $45,000")
- Customer pricing tier display (e.g., "Tier: Gold - 5% volume discount")
- Last purchase date and amount
- View full customer profile link

#### Quote Line Items Section
- Table display with columns: Product, SKU, Description, Quantity, Unit Price, Discount, Tax, Line Total
- Product name with link to product details
- SKU display
- Product description (truncated with expand option)
- Quantity display with unit (e.g., "10 units")
- Unit price display with currency
- Discount display (if applicable, with percentage or amount)
- Tax display with rate (e.g., "Tax 10%: $100")
- Line total display with currency
- Subtotal for line items (sum of all line totals)
- Expandable rows showing full product details
- Print-friendly table formatting

#### Quote Summary Section
- Subtotal amount
- Tax breakdown:
  - Tax rate description (e.g., "Sales Tax 10%")
  - Tax amount for each rate
  - Total tax amount
- Quote-level discount (if applicable)
- Grand total amount prominently displayed
- Currency display consistent throughout
- All calculations clearly shown
- Print-friendly layout

#### Terms and Conditions Section
- Terms and conditions text display
- Formatted text with proper line breaks
- Scroll container if T&C is lengthy
- Print button for T&C alone
- Export T&C option
- Version history of T&C changes (if applicable)
- Show modifications from previous versions (diff view)

#### Notes Section
- Customer-visible notes display
- Formatted text with proper styling
- Markdown rendering if applicable
- Note creation date and author
- Update history toggle (show when note was last modified)

#### Internal Notes Section
- Staff-only notes display
- Access control: Only staff with permission can view
- Visibility indicator: "Internal notes - Not visible to customer"
- Formatted text display
- Note creation date and author
- Add new internal note capability (with reply functionality)
- Thread view if multiple internal notes

#### Status Timeline Section
- Visual timeline showing quote lifecycle events
- Timeline events:
  - Quote created: Date, time, created by user
  - Quote sent: Date, time, sent by user, recipient email
  - Quote viewed by customer: Date, time, viewing details
  - Quote accepted: Date, time, if applicable
  - Quote rejected: Date, time, if applicable
  - Quote converted to order: Date, time, order ID (if applicable)
  - Quote modified: Date, time, modified by user, changes summary
- Color-coded event types
- Expandable event details
- Download timeline as report option

#### Customer Response Status Section (if quote is sent)
- Response status indicator:
  - Not viewed: "Awaiting customer review"
  - Viewed: "Customer viewed on [date] at [time]"
  - Accepted: "Customer accepted on [date]"
  - Rejected: "Customer rejected on [date]"
  - No response yet: "Awaiting customer response"
- Last viewed timestamp (if available)
- Number of views by customer
- Time between send and first view
- Time between view and response

#### Quote History and Audit Trail Section
- Collapsible section showing complete history
- Chronological list of all quote modifications
- Changes tracked:
  - Field modified
  - Old value
  - New value
  - Modified by user
  - Modified date and time
- Sortable by date (newest first, oldest first)
- Filterby change type (all, line items, pricing, customer, terms, etc.)
- Export history as CSV or PDF
- Search within history
- Full query interface showing complete audit trail

#### Actions Section
- Edit Quote button (visible if status is draft)
- Send Quote button (visible if status is draft)
- Resend Quote button (visible if status is sent)
- Delete Quote button (visible if status is draft)
- Convert to Order button (visible if status is accepted)
- Accept Quote button (visible if customer action required)
- Reject Quote button (visible if customer action required)
- Print Quote button (generates printable version)
- Email Quote button (opens email form to resend)
- Send Reminder button (visible if sent but not responded)
- Clone Quote button (create new quote based on this)
- Compare with another quote button (opens comparison view)
- Archive Quote button (for old quotes)
- Action buttons shown based on:
  - Quote status
  - User role and permissions
  - Time since sent
  - Customer response status

#### Related Orders Section
- Display if quote was converted to order
- Order ID link to order detail
- Order date
- Order amount
- Order status
- Link to full order detail
- Multiple orders if quote created multiple orders

#### Attachments Section
- List of attached files
- File name and size
- Upload date
- Download links for each attachment
- Preview capability for supported formats (PDFs, images)
- Remove attachment option (if permissions allow)
- Add attachment option
- Attachment access tracking (who downloaded, when)

#### Mobile Responsive Design
- Single column layout on mobile
- Collapsible sections for better space usage
- Touch-friendly tab navigation
- Horizontal scrolling for tables
- Larger action button targets (44x44 pixels minimum)
- Full-screen modal for action confirmation
- Mobile-optimized timeline display
- Bottom sheet for secondary actions

#### Accessibility Features
- ARIA labels for all interactive elements
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Focus management and visible focus indicators
- Screen reader friendly status descriptions
- Color-blind friendly status indicators (icons + color)
- Sufficient color contrast ratios (WCAG AA minimum)
- Skip to main content link
- Logical tab order
- Form labels and descriptions

#### Loading and Error States
- Skeleton loading for quote details on initial load
- Spinner for real-time updates
- Placeholder state while loading related data
- Error message if quote not found (404)
- Error message if access denied (403)
- Error message if quote deleted
- Retry button for failed loads
- Fallback to cached data if available

#### Real-time Updates
- Live status changes reflected without page refresh
- New timeline events appearing automatically
- Customer response status updated in real-time
- Quote modification notifications (if user not creator)
- Visual notification for important events
- Configurable real-time update frequency
- Option to pause real-time updates

### Backend Requirements

#### API Endpoints

##### Get Quote Detail Endpoint: GET /api/sales/quotes/{id}/
- Returns complete quote information
- Query parameters: include_history (boolean), include_related_orders (boolean)
- Response includes:
  - Quote header (ID, date, status)
  - Customer details
  - Line items with product information
  - Pricing summary (subtotal, tax, discount, total)
  - Terms and conditions
  - Notes (customer-visible and internal)
  - Attachments metadata
- Permissions check: User can view this quote
- Response time target: < 500ms
- ETag support for caching
- Vary header based on user role

##### Get Quote History Endpoint: GET /api/sales/quotes/{id}/history/
- Returns complete audit trail of quote
- Query parameters: page, page_size, change_type
- Response includes:
  - Chronological list of changes
  - Field modified, old value, new value
  - User who made change
  - Timestamp of change
- Sorting: Newest first by default
- Response time target: < 300ms

##### Send Quote Endpoint: POST /api/sales/quotes/{id}/send/
- Send quote to customer via email
- Request body: recipient_email, custom_message (optional), email_template_id (optional)
- Changes quote status from draft to sent
- Updates sent_at and sent_by fields
- Response: Confirmation with email delivery status
- Email validation (recipient exists, is valid)
- Logging of email delivery attempt
- Response time target: < 2 seconds (async email)

##### Accept Quote Endpoint: POST /api/sales/quotes/{id}/accept/
- Mark quote as accepted by customer
- Request body: accepted_by_user_id, acceptance_timestamp (optional)
- Updates status to accepted
- Updates accepted_at timestamp
- Response: Confirmation
- Webhook notification if configured
- Response time target: < 500ms

##### Reject Quote Endpoint: POST /api/sales/quotes/{id}/reject/
- Mark quote as rejected by customer
- Request body: rejection_reason (optional), rejected_by_user_id
- Updates status to rejected
- Updates rejected_at timestamp
- Response: Confirmation
- Webhook notification if configured
- Response time target: < 500ms

##### Convert to Order Endpoint: POST /api/sales/quotes/{id}/convert-to-order/
- Convert accepted quote to order
- Request body: auto_send_customer (boolean), order_date (optional)
- Creates Order entity with line items from quote
- Maintains reference back to original quote
- Updates quote to mark as converted
- Response: Created order ID and details
- Transaction: Atomic operation
- Response time target: < 2 seconds
- Validation: Quote must be in accepted status

##### Delete Quote Endpoint: DELETE /api/sales/quotes/{id}/
- Delete draft quote (soft delete)
- Validation: Only draft quotes can be deleted
- Soft delete with deleted_at timestamp
- Audit logging of deletion
- Permissions check: Only creator or admin
- Response: Confirmation
- Response time target: < 500ms

##### Print Quote Endpoint: POST /api/sales/quotes/{id}/print/
- Generate printable PDF version of quote
- Request body: include_logo (boolean), include_terms (boolean)
- Response: PDF file or download link
- Async processing for large quotes
- Response time target: < 5 seconds

##### Email Quote Endpoint: POST /api/sales/quotes/{id}/email/
- Send quote via email to customer
- Request body: recipient_email, subject (optional), custom_message (optional), email_template_id
- Same as send endpoint but for resending
- Supports multiple recipients
- Response: Confirmation
- Response time target: < 2 seconds (async email)

##### Send Reminder Endpoint: POST /api/sales/quotes/{id}/send-reminder/
- Send reminder email to customer for unanswered quote
- Request body: custom_message (optional), reminder_type (follow_up, expiration_warning)
- Validation: Quote must be in sent status and not responded
- Response: Confirmation
- Response time target: < 2 seconds (async email)

##### Get Related Orders Endpoint: GET /api/sales/quotes/{id}/related-orders/
- Get orders created from this quote
- Response: Array of order objects with basic details
- Response time target: < 300ms

#### Data Structures
- Quote entity with complete metadata
- Line items with product and pricing details
- Customer reference with denormalized data
- Audit trail entries with change tracking
- Status history with timestamps
- Attachments metadata
- Related order references

#### Validations
- Quote must exist and belong to tenant
- User must have permission to view quote
- Status transitions must be valid
- Quote expiration validation
- Customer reference validation
- Order conversion validation (only accepted quotes)

### Database Requirements

#### Indexes
- Index on (tenant_id, id) for direct quote lookup
- Index on (tenant_id, created_at) for list operations
- Index on (tenant_id, status, updated_at) for status queries
- Index on quote_number for uniqueness
- Index on customer_id for customer queries
- Full-text search indexes on notes fields

#### Query Optimization
- Use denormalization for customer name and email
- Pre-calculate totals for quicker display
- Cache frequently accessed quotes
- Batch load line items efficiently
- Use appropriate JOIN strategies

### Security Requirements

#### Authentication and Authorization
- Verify user is authenticated
- Check user has permission to view this quote
- Role-based access: Managers can view team's quotes
- Implement view tracking for audit
- Support quote sharing with permission controls

#### Data Protection
- Encrypt sensitive customer data
- Validate all inputs
- Prevent unauthorized quote modifications
- Audit logging of all accesses
- PII masking in logs and exports
- Secure file download for attachments

#### Tenant Isolation
- All queries include tenant_id
- Verify tenant ownership
- Prevent cross-tenant data leakage

## Validation and Edge Cases

### Data Validation
- Quote exists and hasn't been deleted
- User has permission to view
- Status is valid enum value
- Customer still exists (handle archived customers)
- Products in line items still exist
- Calculations are correct
- Dates are in valid format

### Edge Cases
- Quote created very recently (cache issues)
- Quote modified by another user during viewing
- Quote deleted while being viewed
- Customer deleted after quote created
- Product deleted after line item created
- Quote expiration during viewing (countdown changes)
- Concurrent status updates (optimistic locking)
- Quote with no line items (should not exist but handle gracefully)
- Network disconnection during real-time updates
- Very long notes or T&C text (scrolling, rendering performance)
- Large number of line items (1000+)
- Quote with ancient history (performance of loading)
- User's permissions change while viewing quote
- Timezone conversion issues for timestamps

### Error Handling
- HTTP 404: Quote not found
- HTTP 403: Access denied
- HTTP 410: Quote has been deleted
- HTTP 409: Quote modified by another user
- HTTP 500: Server error
- Network timeout: Show offline indicator
- Real-time update connection loss: Show warning, allow retry

## Testing Requirements

### Unit Testing
- Quote status determination logic
- Validity countdown calculation
- Timeline event generation
- Permission checks
- Data transformation and formatting
- Price calculation verification
- Tax calculation verification
- Status transition validation

### Integration Testing
- Complete quote detail retrieval
- Quote modification and history tracking
- Send quote functionality
- Accept/reject quote functionality
- Convert to order functionality
- Real-time update subscription
- Attachment handling
- Email functionality

### End-to-End Testing
- User navigates to quote detail from list
- User views complete quote information
- User sees real-time status updates
- User sends quote to customer
- User marks quote as accepted
- User converts quote to order
- User prints quote
- User emails quote to customer
- User views quote history
- Mobile user views quote on small screen
- Accessibility: Screen reader user navigates detail page
- User follows customer profile link
- User navigates to related order

### Performance Testing
- Quote detail page load time < 2 seconds
- Real-time updates don't impact performance
- History page with 1000+ entries loads efficiently
- Attachment list with 50+ files displays quickly
- Large notes field renders without lag
- Timeline rendering performance
- Memory usage with large quote
- Database query performance

### Security Testing
- Verify user cannot view other tenant's quotes
- Verify user can only view quotes they have permission for
- Verify audit logging works
- Verify SQL injection prevention
- Test attachment download security
- Verify email functionality respects permissions

### Usability Testing
- User understands quote status
- User knows how to perform available actions
- User understands validity countdown
- User can navigate between sections easily
- User knows where to find customer information
- User understands timeline view
- Mobile user can navigate detail view
- User can print quote successfully
- User can email quote successfully

## Implementation Checklist

### Phase 1: Core Detail View
- [ ] Create Quote Detail component
- [ ] Implement GET /api/sales/quotes/{id}/ endpoint
- [ ] Display quote header with ID, date, status
- [ ] Display customer information section
- [ ] Display line items table
- [ ] Display pricing summary
- [ ] Display validity countdown
- [ ] Add loading and error states
- [ ] Test basic functionality
- [ ] Deploy to staging

### Phase 2: Content Sections
- [ ] Display terms and conditions
- [ ] Display customer notes
- [ ] Display internal notes section
- [ ] Display attachments section
- [ ] Add print functionality
- [ ] Implement section collapsibility
- [ ] Style all sections consistently
- [ ] Test content display

### Phase 3: Timeline and History
- [ ] Create timeline component
- [ ] Implement GET /api/sales/quotes/{id}/history/
- [ ] Display status timeline
- [ ] Display customer response status
- [ ] Add timeline filtering
- [ ] Add history details view
- [ ] Export history functionality
- [ ] Test timeline accuracy

### Phase 4: Actions
- [ ] Implement edit quote button (if draft)
- [ ] Implement send quote button
- [ ] Implement resend quote button
- [ ] Implement delete quote button
- [ ] Implement convert to order button
- [ ] Implement print quote button
- [ ] Implement email quote button
- [ ] Implement send reminder button
- [ ] Add action confirmation dialogs
- [ ] Add action success/error notifications

### Phase 5: Related Information
- [ ] Display related orders (if applicable)
- [ ] Implement GET /api/sales/quotes/{id}/related-orders/
- [ ] Add order links
- [ ] Add customer profile link
- [ ] Add product detail links
- [ ] Add navigation to previous/next quote

### Phase 6: Real-time Updates
- [ ] Set up WebSocket connection
- [ ] Implement real-time status updates
- [ ] Implement real-time timeline updates
- [ ] Add visual indicators for updates
- [ ] Handle connection loss gracefully
- [ ] Test real-time functionality

### Phase 7: Mobile and Accessibility
- [ ] Implement responsive mobile layout
- [ ] Optimize touch interactions
- [ ] Test on various devices
- [ ] Implement keyboard navigation
- [ ] Add ARIA labels
- [ ] Test with screen reader
- [ ] Verify color contrast
- [ ] Implement focus management

### Phase 8: Performance and Optimization
- [ ] Implement component memoization
- [ ] Optimize bundle size
- [ ] Add code splitting
- [ ] Optimize images and attachments
- [ ] Implement lazy loading
- [ ] Test performance
- [ ] Monitor Core Web Vitals
- [ ] Profile memory usage

### Phase 9: Sending Capabilities
- [ ] Implement POST /api/sales/quotes/{id}/send/
- [ ] Implement POST /api/sales/quotes/{id}/email/
- [ ] Implement POST /api/sales/quotes/{id}/send-reminder/
- [ ] Integrate with email service
- [ ] Add email template selection
- [ ] Add custom message field
- [ ] Test email delivery
- [ ] Add delivery status tracking

### Phase 10: Conversion
- [ ] Implement POST /api/sales/quotes/{id}/convert-to-order/
- [ ] Implement POST /api/sales/quotes/{id}/accept/
- [ ] Implement POST /api/sales/quotes/{id}/reject/
- [ ] Add conversion confirmation
- [ ] Add acceptance/rejection forms
- [ ] Test conversion process
- [ ] Verify order creation

### Phase 11: Testing and Documentation
- [ ] Complete unit test coverage
- [ ] Complete integration test coverage
- [ ] Complete end-to-end test coverage
- [ ] Security testing
- [ ] Performance testing
- [ ] Write user documentation
- [ ] Write API documentation
- [ ] Create video tutorials

### Phase 12: Deployment
- [ ] Code review and approval
- [ ] Security audit
- [ ] Staging environment testing
- [ ] Load testing
- [ ] Prepare rollback plan
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Gather feedback

## Deployment Strategy

### Pre-Deployment Checklist
- All tests passing
- Code review completed
- Security audit passed
- Performance tests acceptable
- Documentation complete
- Database migrations tested
- Feature flag configured
- Rollback plan documented

### Deployment Steps
1. Deploy database schema if needed
2. Deploy API endpoints to canary environment
3. Monitor canary (30 minutes)
4. Roll out to 50% of servers
5. Monitor metrics (1 hour)
6. Roll out to 100% of servers
7. Deploy frontend with feature flag disabled
8. Enable feature flag for 10% of users
9. Monitor error rates and performance
10. Increase to 50%, then 100%
11. Disable feature flag when stable

### Database Considerations
- Ensure quote and related tables exist
- Verify indexes are created
- Test query performance
- Plan for historical data migrations

## Performance Targets

### Response Time
- Quote detail page load: < 2 seconds (p95)
- Quote detail API: < 500ms (p95)
- History API: < 300ms (p95)
- Related orders API: < 300ms (p95)
- Send quote: < 2 seconds (async)
- Convert to order: < 2 seconds
- Page interactive: < 3 seconds (p95)

### Throughput
- Support 100 concurrent quote views
- Support quote with 1000+ line items
- Support history with 5000+ entries
- Handle 50 real-time updates per second

### Frontend Performance
- Initial render: < 1 second
- Section expansion/collapse: < 100ms
- Timeline rendering: < 500ms
- Memory usage: < 100MB for large quote
- Real-time updates: Smooth, no jank

### Database Performance
- Quote lookup: < 100ms
- History retrieval: < 200ms
- Related orders: < 100ms
- All queries: < 300ms (p95)

## Monitoring and Alerting

### Key Metrics
- Quote detail page view count
- Quote detail page load time
- Error rate on detail page
- Send quote success rate
- Convert to order success rate
- Real-time update latency
- API response times
- Database query times
- User actions (send, convert, etc.)

### Alerts
- Quote detail load time > 2 seconds
- Error rate > 1% for 5 minutes
- Send quote failure rate > 5%
- Convert to order failure > 10%
- Real-time update delay > 5 seconds
- API response time > 1 second
- Database query > 500ms

### Dashboard
- Real-time quote detail views
- Quote status distribution
- User action frequency
- Error rate trends
- Performance metrics
- Conversion funnel
- Customer response rate

## Documentation Requirements

### User Documentation
- How to view quote details
- How to send quote
- How to convert quote to order
- How to print quote
- How to email quote
- How to view quote history
- How to add internal notes
- Troubleshooting guide

### API Documentation
- OpenAPI specification
- Request/response examples
- Status transitions documentation
- Error codes reference
- Sending and conversion workflows

### Developer Documentation
- Quote detail component architecture
- Real-time update implementation
- Email integration guide
- Order conversion process
- Security implementation details

## Future Enhancements

### Phase 2 Features
- Quote versioning and comparison
- Approval workflows
- Collaborative editing with real-time sync
- Customer portal for quote viewing
- Automated status transitions
- Smart reminders based on behavior
- Integration with CRM activities

### Phase 3 Features
- Advanced analytics on detail view
- Quote performance metrics
- Predictive acceptance probability
- AI-powered recommendations
- Integration with communication tools
- Video/audio attachments support
- Integration with document management

### Phase 4 Features
- Quote simulation tools
- Scenario comparison
- Integration with forecasting systems
- Advanced audit trail with video replay
- Machine learning insights
- Integration with business intelligence tools
- Voice-activated actions
