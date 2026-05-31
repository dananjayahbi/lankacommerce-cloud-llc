# Order Creation/Edit Feature Specification

## Executive Summary

The Order Creation/Edit Page is a sophisticated feature that enables staff to create new orders or modify existing ones with complete control over customer selection, line items, pricing, discounts, taxes, shipping, and payment information. This feature integrates multiple business processes including inventory management, pricing rules, tax calculation, and customer relationship management. It supports draft saving, concurrent edit handling, and comprehensive validation to ensure data integrity and business rule compliance across multi-warehouse and multi-tenant environments.

## Current State Analysis

### Existing Functionality
- Basic order model in backend with customer and item relationships
- Customer data available in system
- Product and inventory data accessible
- Basic pricing and tax calculation logic exists
- Partial API endpoints for order creation

### Identified Gaps
- No comprehensive order creation form interface
- Missing customer selection with search/autocomplete
- No product selector with inventory validation
- Line items management not fully implemented
- Discount calculation logic incomplete
- Tax calculation not integrated with form
- Draft order saving not implemented
- Address management not integrated
- Shipping method selection missing
- Expected delivery date calculation not present
- Internal notes with visibility control missing
- Concurrent edit handling not implemented
- Form auto-save functionality absent
- Mobile-optimized form layout missing
- Form validation not comprehensive

### Performance Issues
- N+1 query problems when loading customer and product data
- No caching of pricing tiers and tax rates
- Large form causes excessive re-renders on value changes
- Missing database indexes for product search
- No debouncing on autocomplete requests
- Form state serialization inefficient

## Detailed Requirements

### Frontend Requirements

#### Form Structure and Layout
- Multi-section form with logical grouping
- Step-by-step guidance through order creation process
- Collapsible sections for advanced options
- Save progress indication
- Required field indicators
- Form validation error display
- Help text and tooltips
- Mobile-friendly responsive layout
- Two-column layout for desktop, single column for mobile

#### Order Header Section
- Order date field with date picker
- Auto-populated with current date for creation
- Editable for order edit mode
- Order notes field (textarea)
- Internal notes field (textarea) with visibility toggle
- Only staff can access internal notes
- Customer-facing checkbox for notes visibility
- Word count display for notes fields
- Rich text editing optional for notes

#### Customer Selector Section
- Customer search/autocomplete input
- Display customer name, email, phone
- Show customer status (VIP, regular, etc.)
- Display customer credit limit
- Show available credit
- Show customer default addresses with selector
- Quick customer creation option (inline or modal)
- Recent customers list (MRU - Most Recently Used)
- Load customer's default addresses
- Load customer's payment methods
- Display customer's order history summary
- Show customer's contact information

#### Line Items Management Section
- Add new line item button
- Product search/autocomplete input
- Product selector with:
  - Product name and description
  - SKU display
  - Product category
  - Product image thumbnail
  - Unit price display
  - Available stock at selected warehouse
  - Variant selector if applicable
- Quantity field with validation
- Unit price field with pricing rule indicator
- Quantity multiplied by unit price for line total
- Discount field for item-level discount (percentage or fixed amount)
- Tax calculation for line item
- Line total display (auto-calculated)
- Remove line item button with confirmation
- Drag-to-reorder functionality
- Duplicate line item button
- Add multiple items quickly feature
- Maximum line items validation
- Batch line item import (copy/paste)

#### Stock and Inventory Information
- Real-time stock availability display
- Show stock at selected warehouse
- Show total available stock across warehouses
- Show reserved stock (for pending orders)
- Show low stock warning if quantity exceeds available
- Prevent order creation if insufficient stock (configurable)
- Show stock reservation status
- Link to inventory management if out of stock

#### Pricing and Totals Section
- Subtotal calculation (auto, read-only)
- Subtotal breakdown by tax jurisdiction if multi-region
- Tax section with detailed breakdown
- Show applicable tax rates
- Tax by category display
- Discount section (order-level)
- Discount type selector (percentage or fixed amount)
- Discount amount input with validation
- Show discount savings
- Grand total calculation (auto, read-only)
- Payment status indicator
- Remaining balance display
- Comparison with previous order if applicable

#### Shipping Information Section
- Shipping address selector
- Option to use customer default address
- Option to select from customer addresses
- Option to enter new address
- Address form with fields: street, city, state, postal code, country
- Address validation and suggestions
- Address book icon to select from addresses
- Billing address section
- Same as shipping address toggle
- Separate billing address option
- Contact information for delivery
- Delivery instructions field

#### Shipping Method and Delivery
- Shipping method selector (if applicable)
- Shipping cost display
- Estimated delivery date calculation
- Manual override of delivery date
- Shipping carrier selector (if integrated)
- Tracking information preparation
- Insurance option (if applicable)
- Gift wrapping option (if applicable)
- Special handling instructions

#### Order Type and Warehouse Selection
- Order type selector (standard, rush, etc.) if applicable
- Priority level selector
- Warehouse selector (for multi-warehouse fulfillment)
- Fulfill from specific warehouse or auto-select
- Split fulfillment option if items in different warehouses
- Lead time display based on warehouse selection

#### Payment Information Section
- Payment method selector (credit card, bank transfer, cash, etc.)
- Show available payment methods for customer
- Payment status display
- Record partial payment option
- Prepayment requirement display
- Payment terms selector
- Due date display
- Credit card save option for future orders

#### Form Actions
- Save button (create/update order)
- Save and continue editing button
- Save and view button (navigate to detail after save)
- Cancel button
- Clear form button
- Preview button (show order summary)
- Calculate tax button (manual trigger if needed)
- Discard changes confirmation dialog
- Form dirty state tracking

#### Draft Management
- Auto-save draft every 30 seconds
- Manual save draft button
- Show last saved timestamp
- Recover draft on form abandonment
- Multiple draft versions not required
- Draft expiration (7 days)
- View saved draft vs current edits comparison

#### Form Validation
- All required fields marked with asterisk
- Real-time field-level validation
- Summary error display at top of form
- Inline error messages below fields
- Validation on blur and on submit
- Show field validation status (valid, invalid, warning)
- Prevent form submission until valid
- Show validation errors as list
- Clear errors when field corrected
- Contextual validation rules

#### Mobile Responsive Design
- Single column layout
- Full-width inputs
- Large touch targets
- Keyboard optimizations
- Collapsible sections for better scrolling
- Sticky action buttons at bottom
- Modal for product selection on mobile
- Swipe to delete line items
- Pinch-to-zoom disabled for form

#### Accessibility and Keyboard Navigation
- ARIA labels for all fields
- Form landmarks for screen readers
- Keyboard navigation through form
- Tab order optimization
- Focus indicators
- Error announcements for screen readers
- Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
- Placeholder text as additional label
- Field group descriptions
- Required field announcements

#### UI Feedback and States
- Loading indicators for autocomplete
- Loading states during save
- Success notification after save
- Error notifications with retry option
- Warning for unsaved changes
- Quantity validation feedback
- Stock availability feedback
- Pricing rule application indication
- Tax calculation indication
- Real-time calculation updates

### Backend Requirements

#### API Endpoints

POST /api/sales/orders/
- Purpose: Create new order
- Request Body:
  - customer_id: Integer (required)
  - order_date: Date (required)
  - order_type: String (optional, default: standard)
  - warehouse_id: Integer (optional)
  - shipping_address: Object with address fields
  - billing_address: Object with address fields or null (use shipping if same)
  - shipping_method_id: Integer (optional)
  - expected_delivery_date: Date (optional)
  - payment_method: String
  - line_items: Array of objects with product_id, quantity, unit_price, discount, tax
  - notes: String (optional)
  - internal_notes: String (optional)
  - discount_amount: Decimal (order-level discount)
  - discount_type: String (percentage or fixed)
- Response:
  - id: Order ID
  - order_number: Generated order number
  - status: Initial status (pending)
  - total_amount: Calculated total
  - tax_amount: Calculated tax
  - discount_amount: Applied discount
  - created_at: Timestamp
- Authentication: Required
- Permissions: Create orders (role-based)

PATCH /api/sales/orders/{id}/
- Purpose: Update existing order
- Request Body: Same fields as POST (partial update)
- Response: Updated order object
- Authentication: Required
- Permissions: Edit specific order (status-based)

GET /api/sales/orders/{id}/draft/
- Purpose: Retrieve draft order
- Response: Order object with draft data
- Authentication: Required
- Permissions: View draft order

DELETE /api/sales/orders/{id}/
- Purpose: Delete or cancel order
- Query Parameters:
  - reason: Cancellation reason (optional)
- Response:
  - success: Boolean
  - message: Confirmation message
- Authentication: Required
- Permissions: Delete orders (status-based)

POST /api/sales/orders/validate-pricing/
- Purpose: Validate pricing rules for line items
- Request Body:
  - customer_id: Integer
  - line_items: Array with product_id, quantity, unit_price
  - warehouse_id: Integer (optional)
- Response:
  - valid: Boolean
  - line_items: Array with adjusted prices if rules apply
  - warnings: Array of warnings if any
  - applied_rules: Array of applied pricing rules
- Authentication: Required
- Permissions: Calculate pricing

POST /api/sales/orders/calculate-tax/
- Purpose: Calculate tax for order
- Request Body:
  - subtotal: Decimal
  - shipping_address: Object with address details
  - shipping_cost: Decimal (optional)
  - tax_region: String (optional)
  - line_items: Array with product_id, quantity, unit_price
  - discount_amount: Decimal (optional)
- Response:
  - total_tax: Decimal
  - tax_breakdown: Array of taxes by rate
  - tax_rate: Decimal (effective tax rate)
  - tax_jurisdiction: String
- Authentication: Required
- Permissions: Calculate tax

GET /api/customers/search/
- Purpose: Search customers for selector
- Query Parameters:
  - query: String (search term)
  - limit: Integer (default: 10)
- Response:
  - results: Array of customer objects with id, name, email, phone, status
- Authentication: Required
- Permissions: View customers

GET /api/customers/{id}/
- Purpose: Retrieve customer details for form
- Response:
  - id, name, email, phone, status, credit_limit, available_credit
  - default_addresses: Array of addresses
  - payment_methods: Array of payment methods
  - order_history: Last 5 orders summary
- Authentication: Required
- Permissions: View customer

GET /api/products/search/
- Purpose: Search products for line item selector
- Query Parameters:
  - query: String (search term)
  - warehouse_id: Integer (optional)
  - limit: Integer (default: 20)
- Response:
  - results: Array of product objects with id, name, sku, price, available_stock
- Authentication: Required
- Permissions: View products

GET /api/products/{id}/
- Purpose: Retrieve product details
- Query Parameters:
  - warehouse_id: Integer (optional)
- Response:
  - id, name, sku, description, price, tax_category, variants
  - stock: Object with warehouse stock levels
  - pricing_rules: Applied pricing rules for customer/quantity
  - related_products: Cross-sell suggestions
- Authentication: Required
- Permissions: View product

GET /api/inventory/stock-levels/
- Purpose: Get current stock levels
- Query Parameters:
  - product_id: Integer
  - warehouse_id: Integer (optional)
- Response:
  - total_stock: Integer
  - available_stock: Integer
  - reserved_stock: Integer
  - warehouses: Array of warehouse stock levels
- Authentication: Required
- Permissions: View inventory

GET /api/shipping/methods/
- Purpose: Get available shipping methods
- Query Parameters:
  - warehouse_id: Integer (optional)
- Response:
  - results: Array of shipping methods with id, name, cost, estimated_days
- Authentication: Required
- Permissions: View shipping methods

#### Customer Selector Logic
- Real-time search with debouncing (300ms)
- Filter customers by tenant
- Show customer status and credit information
- Load customer default addresses when selected
- Load customer payment methods when selected
- Prevent ordering from suspended/blocked customers
- Show customer warnings (credit limit exceeded, past due)
- Cache recent customers (last 10)

#### Product Selector Logic
- Real-time search with debouncing (300ms)
- Filter by warehouse availability (if warehouse selected)
- Show current stock for product
- Show reserved stock
- Check stock availability before adding to line items
- Prevent adding products not available in selected warehouse
- Show product variants if applicable
- Show pricing based on customer and quantity

#### Pricing Calculation Logic
- Apply customer-specific pricing tiers
- Apply quantity-based discounts
- Apply promotional pricing if active
- Validate unit price against pricing rules
- Flag if price differs from suggested price
- Calculate line total: quantity × unit_price - discount
- Calculate subtotal: sum of line totals
- Apply order-level discount (percentage or fixed)
- Calculate grand total: subtotal + tax + shipping - discount

#### Tax Calculation Logic
- Determine tax jurisdiction from shipping address
- Apply tax rates based on product category and location
- Handle tax-exempt customers
- Calculate tax on subtotal, shipping, and discounts
- Support multiple tax rates per jurisdiction
- Show tax breakdown by rate
- Handle tax rounding rules
- Support tax inclusive pricing mode (if configured)

#### Stock Validation Logic
- Check available stock before order creation
- Reserve stock for pending orders (configurable)
- Show warning if insufficient stock
- Allow override with manager approval
- Handle backorder capability
- Validate stock before order confirmation
- Release reserved stock if order cancelled

#### Address Validation Logic
- Validate address format
- Suggest corrections for typos
- Geocode address if required
- Validate postal code format for region
- Check address within allowed delivery areas
- Show address validation errors

#### Concurrent Edit Handling
- Use optimistic locking with version field
- Show warning if order modified by another user
- Allow reload from server or keep local changes
- Prevent conflicting updates
- Log edit conflicts for audit trail

#### Form State Management
- Auto-save draft every 30 seconds
- Track form dirty state
- Preserve form state on page navigation
- Serialize form to localStorage
- Restore form on page reload
- Compare current state with last saved state

#### Validation and Error Handling
- Validate all required fields
- Validate field formats (email, phone, postal code)
- Validate numeric fields (quantity, price, discount)
- Validate date fields (order_date <= delivery_date)
- Validate business rules (customer has credit, product available)
- Show validation errors inline
- Prevent form submission if invalid
- Show comprehensive error summary

#### Permission-Based Field Availability
- Show/hide internal notes based on role
- Show/hide discount fields based on permissions
- Show/hide payment method based on role
- Show/hide warehouse selector based on role
- Disable certain fields for non-managers
- Show read-only fields for limited roles

### Database Requirements

#### Database Indexes
- Index on customer_id for customer lookup
- Index on tenant_id for multi-tenancy
- Index on order_date for sorting
- Index on status for order state queries
- Index on warehouse_id for warehouse-specific orders
- Full-text index on customer name for search

#### Query Optimization
- Prefetch customer and address data
- Prefetch product and variant data
- Cache pricing rules and tax rates
- Lazy load order history
- Batch load available stock
- Use connection pooling

#### Data Consistency
- Use transactions for order creation
- Ensure stock reservation atomicity
- Validate business rules at database level
- Lock rows during update to prevent race conditions
- Enforce referential integrity

## Validation & Edge Cases

### Input Validation
- Customer ID must be valid integer and customer must exist
- Quantity must be positive integer
- Unit price must be positive decimal
- Discount must be non-negative decimal
- Discount amount cannot exceed subtotal
- Date fields must be valid dates
- Address fields must not be empty
- Notes must not exceed 5000 characters
- Internal notes must not exceed 5000 characters
- Order date must be today or in past (not future orders)

### Business Logic Validation
- Customer must have available credit for order amount
- All products must be available in selected warehouse
- Quantity ordered must not exceed available stock (unless backorder allowed)
- Unit price must match pricing rules for customer/quantity
- Tax calculation must be performed correctly
- Shipping address must be in allowed delivery zone
- At least one line item required for order
- Payment method must be available to customer
- Order type must be valid

### Edge Cases
- Customer with zero credit limit: Allow order if prepayment required
- Product with variants: Show variant selector
- Decimal quantities (e.g., 2.5kg): Support based on product UOM
- Very large orders (1000+ line items): Handle efficiently
- Extremely long customer names: Truncate display
- Product price changes during order creation: Show warning and allow update
- Stock depletion by other orders: Show warning and allow quantity adjustment
- Tax rate changes: Recalculate on save
- Shipping address outside service area: Show warning and prevent save
- Zero-price products: Allow for promotional bundles
- Orders with all discounts: Prevent negative totals
- Concurrent edits: Show conflict resolution dialog
- Form submission timeout: Show retry option
- Autocomplete search returns many results: Implement pagination
- Customer not found in search: Allow manual entry
- Product not found in inventory: Show error and prevent add
- Network error during save: Show retry with state preservation

### Concurrency Handling
- Two users editing same order: Last save wins with version conflict check
- Stock reserved by another order: Show real-time stock update
- Customer credit limit changed: Validate on submit
- Pricing rules updated: Recalculate on next field change
- Tax rates changed: Recalculate on submit

### Accessibility Edge Cases
- Screen reader announcements for validation errors
- Focus management after error messages
- Keyboard navigation for dropdown selectors
- ARIA live regions for real-time calculations
- Accessible date picker alternatives
- Keyboard accessible drag-and-drop

## Testing Requirements

### Unit Testing
- Customer search logic
- Product selector logic
- Pricing calculation logic
- Tax calculation logic
- Stock validation logic
- Discount calculation logic
- Form validation logic
- Address validation logic
- Draft auto-save logic

### Integration Testing
- Complete order creation workflow
- Order update workflow
- Draft save and recovery
- Customer selection and default address loading
- Product selection and stock checking
- Pricing rule application
- Tax calculation with multiple rates
- Concurrent edit handling
- Form validation with various inputs

### End-to-End Testing
- Create order with single item
- Create order with multiple items
- Add/remove line items
- Apply discounts (item and order level)
- Verify tax calculation
- Save draft and reload form
- Edit draft order
- Publish draft to order
- Edit pending order
- Cancel order
- Verify order number generation
- Test on mobile devices

### Performance Testing
- Form load with 100 recent customers
- Autocomplete search responsiveness
- Calculation performance with 100 line items
- Auto-save performance
- Form submission performance
- Concurrent form submissions

### Validation Testing
- Submit form with missing required fields
- Enter invalid data in each field type
- Test boundary conditions (min/max values)
- Test special characters in text fields
- Test date range validation
- Test quantity vs available stock
- Test discount greater than subtotal

### Accessibility Testing
- Navigate form with keyboard only
- Test screen reader announcements
- Verify focus management
- Test ARIA labels and descriptions
- Test color contrast
- Test with zoom enabled

### Mobile Testing
- Form responsiveness on various devices
- Touch interactions and gestures
- Keyboard behavior on mobile
- Autocomplete on mobile
- Date picker on mobile
- Modal dialogs on mobile

### Security Testing
- SQL injection attempts
- XSS attempts in text fields
- Authorization checks
- Customer isolation in multi-tenant
- Permission checks for role-based fields

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Implement POST /api/sales/orders/ endpoint
- [ ] Implement PATCH /api/sales/orders/{id}/ endpoint
- [ ] Implement GET /api/sales/orders/{id}/draft/ endpoint
- [ ] Implement order validation logic
- [ ] Add pricing calculation service
- [ ] Add tax calculation service
- [ ] Add stock validation service
- [ ] Implement GET /api/customers/search/
- [ ] Implement GET /api/products/search/
- [ ] Write unit tests for calculation logic

### Phase 2: Advanced Backend Features
- [ ] Implement POST /api/sales/orders/validate-pricing/
- [ ] Implement POST /api/sales/orders/calculate-tax/
- [ ] Implement inventory reservation on order creation
- [ ] Implement draft auto-save functionality
- [ ] Add concurrent edit handling (optimistic locking)
- [ ] Implement form state persistence
- [ ] Add comprehensive validation
- [ ] Write integration tests

### Phase 3: Frontend - Core UI
- [ ] Create Order Creation page component
- [ ] Build order header section (date, notes)
- [ ] Build customer selector section
- [ ] Build line items section
- [ ] Build pricing and totals section
- [ ] Build shipping information section
- [ ] Build payment information section
- [ ] Build form action buttons

### Phase 4: Frontend - Interactions
- [ ] Connect customer search to API
- [ ] Implement customer selection and default address loading
- [ ] Connect product search to API
- [ ] Implement product selection
- [ ] Implement stock validation display
- [ ] Implement line item add/remove
- [ ] Implement drag-to-reorder
- [ ] Connect pricing calculation

### Phase 5: Frontend - Calculations and Validation
- [ ] Implement real-time price calculation
- [ ] Implement real-time tax calculation
- [ ] Implement real-time total calculation
- [ ] Implement form validation
- [ ] Connect validation to API
- [ ] Show validation error messages
- [ ] Implement field-level error display
- [ ] Implement error summary

### Phase 6: Frontend - Advanced Features
- [ ] Implement draft auto-save
- [ ] Implement draft recovery
- [ ] Implement concurrent edit handling
- [ ] Implement form state persistence
- [ ] Implement discard changes confirmation
- [ ] Implement address validation
- [ ] Implement quick customer creation modal
- [ ] Implement pricing rule indicators

### Phase 7: Edit Mode Implementation
- [ ] Implement edit order form
- [ ] Load existing order data
- [ ] Show order status
- [ ] Disable fields based on order status
- [ ] Implement order modification validation
- [ ] Show edit history
- [ ] Implement change tracking

### Phase 8: Responsive Design
- [ ] Implement mobile layout
- [ ] Test responsive breakpoints
- [ ] Optimize touch interactions
- [ ] Mobile form layout
- [ ] Mobile autocomplete
- [ ] Mobile date picker

### Phase 9: Accessibility
- [ ] Add ARIA labels
- [ ] Implement keyboard navigation
- [ ] Add keyboard shortcuts
- [ ] Test with screen readers
- [ ] Verify focus management
- [ ] Test with accessibility tools

### Phase 10: Testing & Optimization
- [ ] Write comprehensive tests
- [ ] Performance testing
- [ ] Security testing
- [ ] Accessibility testing
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Phase 11: Documentation & Deployment
- [ ] Write API documentation
- [ ] Write user documentation
- [ ] Create troubleshooting guide
- [ ] Create deployment guide
- [ ] Set up monitoring
- [ ] Deploy to staging
- [ ] Deploy to production

## Deployment Strategy

### Pre-Deployment Checklist
- All tests passing (unit, integration, E2E)
- Database migrations created and tested
- API documentation updated
- User documentation ready
- Performance benchmarks met
- Security review completed
- Monitoring configured

### Database Migration Strategy
- Create any new tables or columns
- Create new indexes
- Test migration with production data copy
- Create rollback script

### Deployment Steps
1. Deploy backend to staging
2. Run tests on staging
3. Deploy frontend to staging
4. Perform UAT on staging
5. Backup production database
6. Deploy to production (blue-green)
7. Monitor error rates and performance
8. Verify functionality in production

### Rollback Strategy
- Keep previous API version available
- Database rollback script ready
- Frontend can rollback via CDN
- Document rollback procedures

## Performance Targets

### Response Time
- Form initial load: < 1s
- Customer search results: < 300ms
- Product search results: < 300ms
- Pricing calculation: < 200ms
- Tax calculation: < 200ms
- Form submission: < 1s
- Draft auto-save: < 500ms

### Database Performance
- Customer search query: < 100ms
- Product search query: < 100ms
- Stock lookup: < 50ms
- Pricing rule lookup: < 50ms
- Tax rate lookup: < 50ms
- Order creation: < 500ms

### Frontend Performance
- Page load time: < 2s
- Time to interactive: < 3s
- Form interaction response: < 100ms
- Calculation display update: < 200ms

### Scalability
- Support 50+ concurrent users
- Support large customer base (10,000+)
- Support large product catalog (100,000+)
- Support large order with 1000+ line items

## Monitoring & Alerting

### Metrics to Monitor
- Form completion time (average, p95, p99)
- Form abandonment rate
- Auto-save success rate
- API endpoint response times
- Database query performance
- Customer search performance
- Product search performance
- Validation error rates
- Order creation success rate
- Concurrent edit conflicts

### Alerts
- Form load time > 3 seconds: Warning
- API response time > 1 second: Warning
- API error rate > 5%: Critical
- Auto-save failure rate > 5%: Warning
- Pricing calculation errors > 1%: Warning
- Tax calculation errors > 1%: Critical

### Dashboard
- Form completion metrics
- API performance metrics
- Error rate trends
- Most common validation errors
- Auto-save status
- Concurrent edit conflict rate
- Customer search popularity
- Product search popularity

### Logging
- Log form submissions with payload
- Log auto-save operations
- Log pricing rule applications
- Log tax calculations
- Log stock validations
- Log validation errors
- Log concurrent edit conflicts
- Log API errors with stack trace

## Documentation Requirements

### API Documentation
- POST /api/sales/orders/ - Complete endpoint spec
- PATCH /api/sales/orders/{id}/ - Update endpoint spec
- GET /api/sales/orders/{id}/draft/ - Draft retrieval
- POST /api/sales/orders/validate-pricing/ - Pricing validation
- POST /api/sales/orders/calculate-tax/ - Tax calculation
- All search and lookup endpoints
- Request/response examples
- Error codes and messages
- Validation rules
- Permission requirements

### User Documentation
- How to create new order
- How to add line items
- How to apply discounts
- How to set shipping information
- How to save as draft
- How to edit order
- How to cancel order
- Keyboard shortcuts
- Accessibility features
- Mobile usage

### Developer Documentation
- Form architecture
- State management
- Calculation logic
- Validation framework
- Auto-save implementation
- Concurrent edit handling
- Component structure
- Performance optimization techniques

### Troubleshooting Guide
- Form validation errors explained
- Stock validation issues
- Pricing calculation problems
- Tax calculation issues
- Auto-save failures
- Concurrent edit conflicts
- Performance problems
- Mobile-specific issues

## Future Enhancements

### Phase 2 Considerations
- Order templates for frequently ordered items
- Suggested products based on customer history
- Advanced discount configuration (volume, tiered, promotional)
- Complex tax rules engine
- Integration with loyalty programs
- Customer group pricing
- Recurring order functionality

### Phase 3 Considerations
- Order approval workflow
- Multi-currency support
- Advanced inventory allocation rules
- Drop-shipping integration
- Supplier direct fulfillment
- Kit/bundle order handling
- Subscription order integration
- Custom field support

### Phase 4 Considerations
- AI-powered product recommendations
- Order risk assessment
- Fraud detection integration
- Predictive inventory
- Advanced reporting and analytics
- Order forecasting
- Machine learning-based pricing
- Integration with advanced shipping carriers

### Performance Optimization
- Implement caching layer (Redis)
- Client-side state caching
- Optimize form rendering
- Virtual scrolling for line items
- Lazy load product catalog
- GraphQL endpoint alternative
- Service worker for offline support

### Scalability Enhancements
- Microservice for order calculations
- Message queue for long-running operations
- Elasticsearch for product search
- Database read replicas
- API gateway for rate limiting

