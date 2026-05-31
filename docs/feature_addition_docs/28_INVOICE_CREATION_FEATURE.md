# Invoice Creation Feature Specification

## Executive Summary

The Invoice Creation Page is a critical transactional component within the LankaCommerce Cloud LLC platform, enabling users to efficiently create, configure, and manage new invoices. This feature provides a comprehensive interface for composing invoices with flexible line item management, automatic calculations, tax handling, and payment configuration. The feature supports both standalone invoice creation and order-based invoice generation, with draft auto-save, template support, and validation logic. It enables businesses to generate accurate, professional invoices quickly while maintaining financial accuracy and compliance requirements.

## Current State Analysis

### Existing Functionality
- Basic invoice data model exists with core fields
- Database schema supports invoice creation
- Basic API endpoint for invoice submission exists

### Identified Gaps
- No comprehensive invoice creation interface implemented
- Missing line item management UI (add, edit, remove, reorder)
- No automatic calculation engine for totals and tax
- Missing customer selector with recent customers
- No order selector for pre-filling invoice from existing orders
- Draft auto-save functionality not implemented
- No invoice preview functionality
- Missing bank details configuration
- No recurring invoice capability
- Tax calculation not comprehensive (single rate only)
- Missing validation for required fields
- No form state persistence across browser refresh
- No customer creation within form
- Missing discount management (item-level and order-level)
- No payment method configuration
- Missing invoice numbering system (auto-generation)
- Keyboard navigation not optimized for form
- No accessibility considerations

### Performance Issues
- Form rendering lag with many line items
- No lazy loading of customer suggestions
- Missing debouncing on autocomplete requests
- No form state caching
- Heavy re-renders on line item changes

## Detailed Requirements

### Frontend Requirements

#### UI Components and Layout
- Main invoice creation form container with logical sections
- Header section showing invoice creation title and status
- Customer selection section with prominent placement
- Order selector section (optional)
- Line items section with table and add item controls
- Tax calculation section showing itemized breakdown
- Discount section for order-level discounts
- Bank details section
- Notes and terms section
- Recurring invoice configuration section (optional)
- Form action buttons (Save Draft, Save & Send, Preview, Cancel)
- Progress indicator for multi-section form
- Error summary section showing all validation errors
- Success/confirmation messages
- Mobile responsive layout

#### Invoice Basic Information
- Invoice number field:
  - Auto-generated display (read-only) with preview of format
  - Manual override option with validation
  - Invoice number format customization (prefix, suffix, counter)
  - Duplicate number detection with warning
- Invoice date field:
  - Auto-populated with current date (read-only initially)
  - Manual override allowed
  - Date picker with calendar interface
  - Validation preventing future dates
- Due date field:
  - Date picker with calendar interface
  - Default value based on payment terms setting
  - Quick options (Net 15, Net 30, Net 60, Due on Receipt)
  - Calculated date display based on selection
  - Manual override allowed

#### Customer Selector
- Search/autocomplete input with:
  - Minimum 2 characters before search triggered
  - Debounced API requests
  - Dropdown showing suggestions
  - Recent customers list (last 5 used)
  - Quick create customer option ("Create new customer")
  - Customer search across name, email, phone
- Selected customer display showing:
  - Customer name
  - Customer contact information (phone, email)
  - Customer credit limit and current credit used
  - Customer discount percentage if applicable
  - Tax exemption status
  - Payment terms for customer
  - Address information
  - Quick unselect button
- Customer change confirmation (if line items already added)

#### Order Selector (Optional)
- Search/autocomplete input with:
  - Search by order ID
  - Search by customer name
  - Filter by unpaid orders only
  - Dropdown showing suggestions
  - Order status display in suggestions
- Optional selector (can create invoice without order)
- Auto-populate line items from selected order:
  - All order items added to invoice
  - Unit prices from order
  - Quantities from order
  - Taxes from order
  - Discounts from order (optional)
- Order reference display after selection:
  - Order ID (clickable link)
  - Order date
  - Order total
  - Quick change order option
- Pre-fill customer from selected order

#### Line Items Section
- Line items table with columns:
  - Description (editable)
  - Quantity (editable with validation)
  - Unit price (editable with pricing rules check)
  - Discount (percentage or fixed amount, editable)
  - Tax (auto-calculated or editable)
  - Amount (auto-calculated display)
  - Actions (edit, delete, move)
- Add line item button:
  - Opens inline form or modal
  - Form validation
  - Auto-add to table
  - Clear form after adding
  - Focus on next item for quick entry
- Add multiple items capability:
  - "Add another" option
  - Batch import from inventory
- Remove item button:
  - Confirmation dialog for destructive action
  - Recalculate totals on removal
- Reorder items:
  - Drag-and-drop support
  - Visual drag handle indicator
  - Keyboard support for reordering
  - Keyboard shortcut (Alt+Up/Down arrow)
- Line item editing:
  - Inline editing for quick updates
  - Modal editing for complex changes
  - Real-time calculation updates
- Line item validation:
  - Description required and non-empty
  - Quantity required and positive number
  - Unit price required and non-negative
  - Discount validation (0-100% or fixed amount)
  - Amount auto-calculated on focus loss

#### Calculations Section
- Subtotal display (auto-calculated):
  - Sum of all line item amounts
  - Read-only display
  - Updates in real-time as items changed
- Tax section:
  - Itemized tax rates display
  - Tax breakdown by rate (if multiple rates)
  - Total tax amount
  - Tax percentage display
  - Option to edit total tax manually (override)
  - Tax calculation settings accessible
  - Show applied tax rate for each item
- Discount section:
  - Order-level discount option
  - Percentage or fixed amount toggle
  - Discount amount display
  - Discount reason field
  - Auto-calculation of discount impact
  - Applied discount visual indicator
- Total calculation:
  - Grand total display (auto-calculated)
  - Formula: Subtotal + Tax - Discount
  - Large, prominent display
  - Currency symbol and formatting
  - Total updates real-time

#### Bank Details Section
- Account information display:
  - Dropdown selector for multiple accounts if configured
  - Account number (masked display)
  - Account name
  - Bank name
  - SWIFT code
  - Routing number
  - IBAN (if applicable)
  - Bank branch
- Display only (not editable):
  - Configured by administrators
  - Shows default account
  - Quick change account option
- Bank details copied to invoice on save

#### Notes and Terms Section
- Invoice notes field:
  - Text area with rich text support
  - Character count (max 1000)
  - Placeholder with example
  - Notes will appear on invoice
- Terms & conditions field:
  - Text area with rich text support
  - Character count (max 2000)
  - Dropdown for preset terms
  - Placeholder with example terms
  - Terms will appear on invoice
- Payment instructions field:
  - Preset payment instructions display
  - Editable payment instructions
  - Banking details auto-populate

#### Recurring Invoice Configuration (Optional)
- Enable recurring toggle:
  - Checkbox to enable recurring
  - Additional fields appear when enabled
  - Instructions for recurring setup
- Frequency selector:
  - Dropdown options (Weekly, Bi-weekly, Monthly, Quarterly, Semi-annual, Annual)
  - Default selected based on customer preference
- End date selector:
  - Optional end date for recurring
  - If no end date, recurring continues indefinitely
  - Date picker interface
- Recurrence pattern display:
  - Summary of recurrence (e.g., "Monthly on the 15th")
  - Next invoice date calculation and display
  - Total estimated invoices if end date set
  - Warning if very long recurrence pattern

#### Form Validation
- Real-time validation:
  - Customer required
  - Invoice date required and valid
  - Due date required and >= invoice date
  - At least one line item required
  - All line items complete and valid
  - Totals calculated correctly
- Validation error display:
  - Inline errors below problematic field
  - Error summary section at top
  - Red border on invalid fields
  - Error icon with tooltip
- Validation on save:
  - All validations triggered before save
  - Error summary displayed
  - Scroll to first error
  - Prevent save if validation fails

#### Form Actions
- Save as draft button:
  - Saves current form state
  - Less strict validation (allow incomplete)
  - Success message with draft ID
  - Option to continue editing
  - Option to view draft from list
- Save & send button:
  - Saves invoice as sent
  - Opens email preview
  - Shows customer email pre-filled
  - Option to customize subject and message
  - Send or cancel options
  - Shows sent confirmation
- Preview button:
  - Opens preview in modal or new tab
  - Shows formatted invoice as customer sees
  - Printable format
  - Download PDF option
  - Back to edit option
- Cancel button:
  - Confirmation dialog if form has unsaved changes
  - Returns to invoice list
  - Preserves draft if created

#### Mobile Responsive Design
- Single column layout
- Stacked sections
- Full-width inputs
- Larger touch targets (44x44px minimum)
- Collapsible sections to reduce scrolling
- Bottom sheet for action buttons
- Simplified table display for line items (card format)
- Optimized autocomplete for mobile
- Mobile-optimized date pickers
- Scrollable sections as needed

#### Accessibility and Keyboard Navigation
- ARIA labels for all form fields
- Form field descriptions
- Required field indicators
- Tab order optimization for logical flow
- Keyboard shortcuts: Ctrl+S for save draft, Ctrl+Shift+S for save & send, Escape to cancel
- Focus indicators on all fields
- Error announcements via ARIA live regions
- Skip links for form sections
- Screen reader instructions for complex sections
- Label-input association with proper HTML structure
- Validation error announcement

#### States and Feedback
- Loading state while submitting
- Success message after save with invoice ID
- Draft auto-save indicator (showing when saving)
- Error states with descriptive messages
- Confirmation dialogs for destructive actions
- Toast notifications
- Unsaved changes indicator
- Network error handling with retry
- Field validation feedback
- Optimistic UI updates

### Backend Requirements

#### API Endpoints

POST /api/billing/invoices/
- Purpose: Create new invoice
- Request Body:
  - customer_id (integer): Required
  - invoice_number (string): Optional (auto-generate if not provided)
  - invoice_date (date): Required, ISO 8601 format
  - due_date (date): Required, >= invoice_date
  - line_items (array): Required, at least one item
    - description (string): Required, max 500 characters
    - quantity (decimal): Required, > 0
    - unit_price (decimal): Required, >= 0
    - discount (decimal): Optional, >= 0, either percentage (0-100) or fixed amount
    - discount_type (string): percentage or fixed_amount
    - tax_rate_id (integer): Optional, specific tax rate
  - subtotal (decimal): Calculated
  - tax_amount (decimal): Calculated or provided for override
  - discount_amount (decimal): Optional
  - discount_reason (string): Optional
  - total_amount (decimal): Calculated
  - notes (string): Optional, max 1000 characters
  - terms (string): Optional, max 2000 characters
  - payment_instructions (string): Optional
  - bank_account_id (integer): Optional, defaults to primary
  - status (string): draft or sent (default: draft)
  - payment_method (string): Optional
  - recurring_enabled (boolean): Optional, default false
  - recurring_frequency (string): Optional (Weekly, Bi-weekly, Monthly, Quarterly, Semi-annual, Annual)
  - recurring_end_date (date): Optional
  - tenant_id (integer): Required for multi-tenancy
- Response:
  - id (integer): Invoice ID
  - invoice_number (string): Generated or provided
  - all request fields
  - created_at (timestamp)
  - created_by (user object)
- Authentication: Required
- Permissions: Create invoices
- Status codes: 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 409 Conflict (duplicate number)

PATCH /api/billing/invoices/{id}/
- Purpose: Update invoice (draft only)
- Request Body: Same fields as POST (all optional)
- Response: Updated invoice object
- Authentication: Required
- Permissions: Update specific invoice
- Validation: Only draft invoices can be updated
- Status codes: 200 OK, 400 Bad Request, 403 Forbidden, 404 Not Found, 409 Conflict (if not draft)

GET /api/sales/orders/
- Purpose: Fetch orders for order selector
- Query Parameters:
  - customer_id (integer): Optional, filter by customer
  - status (string): Optional, filter by order status
  - unpaid_only (boolean): Optional, show only unpaid orders
  - search (string): Optional, search by order ID
  - page (integer): Default 1
  - page_size (integer): Default 10
- Response:
  - results: Array of order objects with: id, order_number, customer_id, customer_name, order_date, total_amount, status, line_items
  - count: Total count
  - next/previous: Pagination URLs
- Authentication: Required

GET /api/crm/customers/
- Purpose: Fetch customers for customer selector
- Query Parameters:
  - search (string): Optional, search by name, email, phone
  - recent (boolean): Optional, get last 5 customers
  - page (integer): Default 1
  - page_size (integer): Default 10
- Response:
  - results: Array of customer objects with: id, name, email, phone, credit_limit, credit_used, tax_exempt, default_payment_terms, address
  - count: Total count
  - next/previous: Pagination URLs
- Authentication: Required

POST /api/crm/customers/
- Purpose: Create customer inline
- Request Body:
  - name (string): Required
  - email (string): Required
  - phone (string): Optional
  - address (object): Optional
- Response: Created customer object
- Authentication: Required

POST /api/billing/invoices/from-order/{order_id}/
- Purpose: Create invoice from existing order
- Request Body:
  - include_discounts (boolean): Optional, default true
  - include_taxes (boolean): Optional, default true
- Response: Invoice object pre-populated with order items
- Authentication: Required
- Permissions: Create invoices

GET /api/billing/invoices/draft/{id}/
- Purpose: Retrieve draft invoice for editing
- Response: Full invoice object
- Authentication: Required
- Permissions: View specific invoice

POST /api/billing/invoices/calculate-tax/
- Purpose: Calculate tax for line items
- Request Body:
  - customer_id (integer): Required
  - items (array): Array of items with description, quantity, unit_price
  - tax_jurisdiction (string): Optional
- Response:
  - items_with_tax: Array with calculated tax for each item
  - total_tax: Sum of taxes
  - tax_breakdown: Breakdown by tax rate
- Authentication: Required

GET /api/config/bank-details/
- Purpose: Retrieve configured bank accounts
- Response:
  - accounts: Array of bank account objects with: id, account_name, account_number (masked), bank_name, swift_code, routing_number, iban, branch, is_primary
  - primary_account_id: ID of default account
- Authentication: Required

GET /api/customers/{id}/
- Purpose: Get customer details
- Response: Customer object with full details
- Authentication: Required

GET /api/sales/orders/{id}/
- Purpose: Get order details
- Response: Order object with line items
- Authentication: Required

#### Data Transformation
- Format dates in ISO 8601 format
- Round currency amounts to 2 decimal places
- Validate totals match calculation (subtotal + tax - discount = total)
- Map tax rate IDs to tax rate percentages
- Include customer information in responses
- Format line item data consistently

#### Validation Logic
- Customer must exist and be for current tenant
- Invoice number must be unique for tenant (if provided)
- Invoice date must not be in future
- Due date must be >= invoice date
- At least one line item required
- Line item quantities must be positive
- Line item unit prices must be non-negative
- Discount values must be non-negative
- Total calculations must be correct
- Tax calculations must match rates
- Only draft invoices can be updated
- Recurring configuration must be valid if provided

#### Calculation Logic
- Subtotal = SUM(line_item.quantity * line_item.unit_price) for all items
- Line item discount = line_item.unit_price * line_item.quantity * discount_rate or fixed_amount
- Line item tax = (line_item.amount - line_item.discount) * tax_rate
- Total tax = SUM(line_item.tax) for all items
- Order-level discount = subtotal * discount_rate or fixed_amount
- Total amount = subtotal + total_tax - order_discount
- All amounts rounded to 2 decimal places
- Tax calculation respects tax exemption status

#### Query Optimization
- Use select_related for customer data
- Use prefetch_related for line items
- Index on customer_id for order retrieval
- Cache bank details (5-minute TTL)
- Cache tax rates (1-hour TTL)
- Lazy load suggested customers only when needed

#### Error Handling
- Return 400 for validation errors with field-specific messages
- Return 400 for invalid date formats with correct format specification
- Return 400 for calculation errors with details
- Return 401 for unauthenticated requests
- Return 403 for insufficient permissions
- Return 404 for non-existent customers or orders
- Return 409 for duplicate invoice number
- Return 500 with descriptive error for server errors

### Database Requirements

#### Invoice Model
- Fields: id, tenant_id, invoice_number, customer_id, order_id (foreign key, nullable), invoice_date, due_date, subtotal, tax_amount, discount_amount, discount_reason, total_amount, notes, terms, payment_instructions, bank_account_id, status, payment_method, created_at, updated_at, created_by, updated_by, deleted_at, recurring_enabled, recurring_frequency, recurring_end_date, next_recurring_date, parent_invoice_id (for recurring)
- Constraints: customer_id required, status in (draft, sent, paid, partially_paid, cancelled), unique on (tenant_id, invoice_number)
- Indexes: (tenant_id, customer_id), (tenant_id, status), (tenant_id, invoice_date)

#### InvoiceLineItem Model
- Fields: id, invoice_id, description, quantity, unit_price, discount, discount_type (percentage/fixed_amount), tax, subtotal, order_line_item_id (nullable)
- Constraints: invoice_id required, quantity > 0, unit_price >= 0
- Indexes: (invoice_id)

#### BankAccount Model
- Fields: id, tenant_id, account_name, account_number (encrypted), bank_name, swift_code, routing_number, iban, branch, is_primary, created_at, updated_at
- Constraints: tenant_id required
- Indexes: (tenant_id, is_primary)

#### Migrations
- Add invoice_number uniqueness constraint (tenant_id, invoice_number)
- Add indexes for performance
- Add encrypted fields for sensitive bank data
- Audit trail for all changes

## Validation & Edge Cases

### Input Validation
- Invoice number format validation against configured pattern
- Customer ID must be valid integer and belong to current tenant
- Order ID must be valid integer and belong to current tenant
- Invoice date must be valid date string (ISO 8601)
- Due date must be valid date string (ISO 8601)
- Due date must be >= invoice date
- Line item description length limit (500 characters)
- Line item quantity must be positive decimal
- Line item unit price must be non-negative decimal
- Discount must be non-negative decimal
- Discount percentage must be 0-100
- Notes length limit (1000 characters)
- Terms length limit (2000 characters)
- Tax rate must be valid configured rate

### Business Logic Validation
- Customer must exist for current tenant
- Order must exist for current tenant
- Only draft invoices can be edited
- Cannot change customer if invoice already sent
- Cannot change line items if invoice sent
- Recurring configuration only valid if enabled
- Recurring end date must be >= invoice date
- Line items must have valid tax rates applied

### Edge Cases
- Invoices with zero discount: Handle correctly without confusion
- Invoices with zero tax: Display correctly
- Invoices with very small amounts (rounding): Handle decimal precision
- Invoices with 100+ line items: Performance considerations
- Very long descriptions: Truncate in display
- Concurrent creation of same invoice number: Prevent with database constraint
- Customer with no address: Handle gracefully
- Draft invoice edits with payment recorded: Prevent invalid state
- Browser refresh during form filling: Preserve state with auto-save
- Very large invoice totals: Handle without display truncation
- Currency conversion if multi-currency: Calculate correctly
- Negative discount values: Reject with validation error
- Zero quantity line items: Reject with validation error

### Concurrency Handling
- Optimistic locking using version numbers
- Detect concurrent edits during update
- Prevent concurrent sends of same draft
- Use database transactions for multi-table updates

## Testing Requirements

### Unit Testing
- Invoice number generation logic
- Date validation logic
- Calculation logic (subtotal, tax, total)
- Discount calculations
- Validation rules
- Recurring invoice logic

### Integration Testing
- Create invoice with order
- Create invoice without order
- Update draft invoice
- Calculate tax for various rates
- Customer selection and auto-fill
- Order selection and line item import
- Bank account selection
- Recurring invoice creation

### End-to-End Testing
- Complete invoice creation flow
- Invoice creation from order
- Edit draft invoice
- Save as draft and resume
- Create and preview invoice
- Create and send invoice
- Form validation errors
- Required field validation
- Keyboard navigation through entire form
- Mobile form submission

### Performance Testing
- Form rendering with 100+ line items
- Autocomplete performance with 10,000+ customers
- Tax calculation performance
- Large invoice total calculations
- Form interaction responsiveness

### Accessibility Testing
- Screen reader navigation of entire form
- Keyboard-only form completion
- Tab order verification
- ARIA label completeness
- Focus indicators visibility
- Form field descriptions

### Mobile Testing
- Responsive form layout on various screen sizes
- Touch interactions and input
- Autocomplete on mobile
- Date picker on mobile
- Large line item table on mobile
- Form submission on mobile

### Security Testing
- SQL injection attempts in form fields
- XSS attempts in text areas
- Unauthorized customer access
- Unauthorized order access
- Bank detail protection (masking)
- Permission verification for creation

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Create invoice, line item, bank account models
- [ ] Implement POST /api/billing/invoices/
- [ ] Implement PATCH /api/billing/invoices/{id}/
- [ ] Implement invoice number auto-generation
- [ ] Implement calculation logic (subtotal, tax, total)
- [ ] Add comprehensive validation
- [ ] Implement database transactions
- [ ] Write unit tests for calculations
- [ ] Write validation tests

### Phase 2: Integration APIs
- [ ] Implement customer selector API
- [ ] Implement order selector API
- [ ] Implement inline customer creation
- [ ] Implement order-to-invoice conversion
- [ ] Implement tax calculation API
- [ ] Implement bank details API
- [ ] Add permission checks

### Phase 3: Frontend - Core UI
- [ ] Create invoice creation form component
- [ ] Build basic information section
- [ ] Build customer selector
- [ ] Build order selector
- [ ] Build line items section
- [ ] Build calculation display
- [ ] Build form action buttons
- [ ] Build mobile responsive layout

### Phase 4: Frontend - Line Items
- [ ] Implement add line item
- [ ] Implement edit line item
- [ ] Implement remove line item
- [ ] Implement drag-to-reorder
- [ ] Implement real-time calculations
- [ ] Implement line item validation

### Phase 5: Frontend - Advanced Features
- [ ] Implement bank details section
- [ ] Implement notes and terms section
- [ ] Implement recurring invoice configuration
- [ ] Implement form validation display
- [ ] Implement error summary
- [ ] Implement draft auto-save

### Phase 6: Frontend - Interactivity
- [ ] Connect form to APIs
- [ ] Implement customer selection flow
- [ ] Implement order selection flow
- [ ] Implement tax calculation
- [ ] Implement form submission
- [ ] Implement preview functionality
- [ ] Implement send email functionality

### Phase 7: Accessibility
- [ ] Add ARIA labels
- [ ] Implement keyboard navigation
- [ ] Test with screen readers
- [ ] Add focus indicators
- [ ] Test keyboard-only usage

### Phase 8: Testing & Optimization
- [ ] Write comprehensive tests
- [ ] Performance testing
- [ ] Optimize form rendering
- [ ] Security testing
- [ ] Mobile testing

### Phase 9: Documentation
- [ ] Write API documentation
- [ ] Write user guide
- [ ] Write developer guide
- [ ] Create troubleshooting guide

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
1. Deploy database migrations
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
- Create invoice: < 500ms
- Update invoice: < 500ms
- Customer search: < 300ms
- Order search: < 300ms
- Tax calculation: < 200ms
- Form load: < 1s

### Frontend Performance
- Form load time: < 2s
- Form interaction response: < 100ms
- Auto-save trigger: < 2s
- Calculation update: < 100ms

## Monitoring & Alerting

### Metrics to Monitor
- Invoice creation success rate
- Average invoice total amount
- Tax calculation accuracy
- Customer search performance
- Form submission errors
- Draft auto-save frequency
- Recurring invoice creation rate

### Alerts to Configure
- Invoice creation failure rate > 5%
- Tax calculation failures
- Database transaction failures
- API response time > 1 second

## Documentation Requirements

### API Documentation
- Endpoint documentation with examples
- Request/response schemas
- Error codes and messages
- Validation rules
- Calculation formulas

### User Documentation
- Step-by-step invoice creation guide
- Creating from order guide
- Tax configuration guide
- Recurring invoice setup
- Mobile usage guide
- Keyboard shortcuts

### Developer Documentation
- Architecture overview
- Database schema
- API integration guide
- Calculation logic documentation
- Validation rules documentation

## Future Enhancements

### Phase 2 Considerations
- Invoice templates for common scenarios
- Line item history and suggestions
- Item favorites
- Bulk invoice creation
- Invoice cloning from previous invoice
- Advanced discount rules
- Custom calculation rules

### Phase 3 Considerations
- Payment plan creation
- Deposit/retainer handling
- Subscription billing support
- Conditional line items
- Item dependency management
- Auto-numbering by department/location
