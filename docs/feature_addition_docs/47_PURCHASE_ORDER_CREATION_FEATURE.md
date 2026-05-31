# Purchase Order Creation Feature Specification

## Executive Summary

The Purchase Order Creation Feature enables procurement staff to create new supplier purchase orders with comprehensive line item management, automatic PO number generation, pricing calculations, and vendor communication. This feature streamlines the order creation process while ensuring accuracy through real-time validation and automatic calculations. The system supports draft saving for incomplete orders and direct vendor notification upon finalization.

**Key Business Value:**
- Streamlined PO creation workflow
- Reduced order entry errors through validation
- Automatic PO number generation
- Real-time price and tax calculations
- Direct vendor notification capability

---

## Current State Analysis

### Existing Implementation
- Basic PO creation form partially implemented
- Vendor selector working
- PO date auto-population working
- Line items section incomplete
- Product selector partially working
- Quantity and unit cost fields working
- Discount/tax calculation partially done
- Payment terms selector incomplete
- Send PO functionality incomplete
- Auto-calculation of totals incomplete

### Known Limitations
- Limited line item management
- Missing product search capability
- Incomplete discount/tax handling
- Missing real-time total calculations
- Incomplete vendor communication
- No draft save option

---

## Detailed Requirements

### Frontend Features

#### 1. Form Structure

**Form Header Section:**
- Page title: "Create New Purchase Order"
- Breadcrumb navigation (optional)
- Save progress indicator
- Form validation status indicator

#### 2. PO Header Section

**PO Number:**
- Display: Auto-generated PO number (read-only)
- Format: "PO-YYYY-XXXXX" (e.g., PO-2026-00001)
- Generated on form load, before user input
- Read-only field (cannot be edited)
- Visual indication it's auto-generated

**PO Date:**
- Auto-populated with current date
- Date input field (allows manual override)
- Cannot be set to future date
- Validation: Must be today or earlier

**Vendor Selector:**
- Required field (marked with asterisk)
- Dropdown with search capability
- Search by vendor name or code
- Show vendor details in dropdown options:
  - Vendor name
  - Vendor code
  - Primary contact
  - Default address
- Quick create vendor link (if vendor not found)
  - Opens vendor creation modal
  - Returns to PO with vendor selected
- Selected vendor displays full details

#### 3. Delivery Information Section

**Expected Delivery Date:**
- Required field
- Date picker input
- Must be future date
- Validation: Cannot be before PO date
- Default: 30 days from PO date

**Shipping Address Selector:**
- Required field
- Radio button options:
  - Use vendor's default address (pre-selected)
  - Custom address input
- If vendor default: Display full address (read-only)
- If custom: Text input for address details
  - Address line 1 (required)
  - Address line 2 (optional)
  - City (required)
  - State/Province (required)
  - Postal code (required)
  - Country (required)

**Delivery Instructions:**
- Optional field
- Text area (max 1000 characters)
- Character counter display
- Helpful placeholder text

#### 4. Line Items Section

**Dynamic Line Items Table:**

Columns:
- Product (searchable dropdown)
- Quantity (numeric input)
- Unit Cost (currency input)
- Discount (currency or percentage)
- Tax (currency or percentage, auto-calculated)
- Line Total (read-only, auto-calculated)
- Delete Action (trash icon)

**Product Selector:**
- Required field per line
- Dropdown with search capability
- Search by product name, SKU, or code
- Show product details in dropdown:
  - Product name
  - SKU
  - Category
  - Default unit cost (optional)
- Can only select one product per line
- Validation: Cannot add same product twice

**Quantity Field:**
- Required field
- Numeric input (integers or decimals depending on unit)
- Validation: Must be > 0
- Error message if invalid
- Unit display (if product has unit)

**Unit Cost Field:**
- Required field
- Currency input with formatting
- Decimal places: 2
- Validation: Must be > 0
- Error message if invalid
- Can be pre-populated from product

**Discount Field:**
- Optional field
- Supports currency amount or percentage
- If percentage: Display format "10%"
- If amount: Display as currency
- Calculation: Reduces line subtotal
- Validation: Cannot exceed line subtotal

**Tax Field:**
- Optional field
- Auto-calculated if tax rate available
- Can be overridden manually
- Supports percentage or fixed amount
- Display format depends on type
- Validation: Reasonable tax percentage (0-50%)

**Line Total:**
- Read-only calculated field
- Formula: (Quantity × Unit Cost) - Discount + Tax
- Auto-updates when any input changes
- Currency formatting
- Displayed prominently

**Add Line Item Button:**
- Secondary button below line items table
- Adds new empty row to table
- Focus moves to new product field
- Can add unlimited line items
- Validation: At least one line item required

**Delete Line Button:**
- Trash icon at end of row
- Click to remove line from table
- Confirmation dialog if only one line
- Message: "Ensure you have at least one line item"

#### 5. Line Items Summary Section

**Below Line Items Table:**

**Subtotal Display:**
- Label: "Subtotal"
- Value: Sum of all line totals (before tax)
- Currency formatting
- Auto-updates

**Tax Total Display:**
- Label: "Tax Total"
- Value: Sum of all tax amounts
- Currency formatting
- Auto-updates

**Discount Display:**
- Label: "Total Discount"
- Value: Sum of all discounts
- Currency formatting
- Only shown if any discounts applied
- Auto-updates

**Grand Total Display:**
- Label: "Total PO Amount"
- Large, prominent display (font size 24+)
- Bold text
- High contrast background
- Currency formatting
- Auto-updates with every line change
- Critical for PO review

#### 6. Payment and Terms Section

**Payment Terms Selector:**
- Required field
- Dropdown with predefined terms:
  - Net 15
  - Net 30
  - Net 45
  - Net 60
  - COD (Cash on Delivery)
  - Prepaid
  - Custom
- If Custom selected: Text input for custom terms
- Display explanation of selected terms

**Notes/Special Instructions:**
- Optional field
- Text area (max 1000 characters)
- Character counter
- Helpful placeholder
- Use for special instructions, delivery notes, etc.

#### 7. Form Validation

**Visual Indicators:**
- Required field markers (red asterisk)
- Field-level validation feedback
- Real-time validation (after field blur)
- Error summary at top of form (if errors present)
- Green checkmark for valid fields (optional)

**Error Messages:**
- Clear, specific messages
- Suggestion for correction
- Location of error highlighted
- Color-coded (red for errors)

**Validation Rules:**
- All required fields populated
- PO date not in future
- Expected delivery after PO date
- Quantity > 0 for all lines
- Unit cost > 0 for all lines
- At least one line item
- Discount < line subtotal
- Total calculation accurate
- No duplicate products

#### 8. Action Buttons

**Save as Draft Button:**
- Secondary button (outlined style)
- Text: "Save as Draft"
- Position: Bottom left
- Color: Gray/neutral
- Saves without sending to vendor
- Disabled until form has required fields
- Loading state during save
- Success notification
- Redirects to PO detail page with draft status

**Save & Send Button:**
- Primary button (solid, prominent color)
- Text: "Save & Send to Vendor"
- Position: Bottom right
- Color: Primary brand color
- Sends PO to vendor via email
- Disabled until form valid and complete
- Loading state during save/send
- Confirmation dialog before sending
- Success notification with confirmation email
- Shows vendor email address in confirmation

**Cancel Button:**
- Tertiary button (text-only)
- Text: "Cancel"
- Position: Bottom left (next to Save as Draft)
- Color: Gray
- Shows unsaved changes warning if form modified
- Confirmation dialog: "Discard unsaved changes?"
- Redirects to PO list on cancel

#### 9. Loading and Success States

**Loading State:**
- Form fields disabled during submission
- Submit buttons show loading spinner
- Button text changes (e.g., "Saving...")
- Cannot navigate away during save
- Loading modal/overlay optional

**Success State:**
- Success notification/toast appears
- Shows: "Purchase Order saved successfully"
- Displays generated PO number
- Auto-dismiss after 3 seconds (or user dismisses)
- Redirects to PO detail page after 1-2 seconds

**Error State:**
- Error notification/toast appears
- Shows: Error message from API
- Actionable error message
- Retry button (resubmit form)
- Stays visible until dismissed
- Form remains editable

---

## Backend API Requirements

### Primary Endpoints

#### POST /api/procurement/purchase-orders/
**Create new Purchase Order**

Request Body:
```
{
  "vendor_id": 5,
  "po_date": "2026-05-20",
  "expected_delivery_date": "2026-06-20",
  "shipping_address": {
    "address_line1": "123 Main St",
    "address_line2": "Suite 100",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "USA",
    "use_vendor_default": false
  },
  "line_items": [
    {
      "product_id": 123,
      "quantity": 100,
      "unit_cost": 25.50,
      "discount": 5.00,
      "tax": 150.00
    },
    {
      "product_id": 456,
      "quantity": 50,
      "unit_cost": 10.00,
      "discount": 0,
      "tax": 25.00
    }
  ],
  "payment_terms": "Net 30",
  "notes": "Special handling required",
  "status": "draft"
}
```

Response:
```
{
  "id": 1,
  "po_number": "PO-2026-00001",
  "tenant_id": 1,
  "vendor_id": 5,
  "po_date": "2026-05-20",
  "expected_delivery_date": "2026-06-20",
  "amount": 2775.00,
  "status": "draft",
  "shipping_address": {...},
  "line_items": [...],
  "payment_terms": "Net 30",
  "notes": "Special handling required",
  "created_at": "2026-05-20T10:30:00Z",
  "updated_at": "2026-05-20T10:30:00Z"
}
```

Validation Rules (Backend):
- Vendor must exist
- PO date must be today or earlier
- Expected delivery must be after PO date
- Line items must have at least one entry
- Product must exist for each line item
- Quantity must be > 0
- Unit cost must be > 0
- Discount must be <= line subtotal
- Tax calculation must be reasonable
- Total calculation must be accurate
- No duplicate products in single PO

Response Codes:
- `201 Created`: PO created successfully
- `400 Bad Request`: Validation error (details in response)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User lacks permission
- `500 Internal Server Error`: Server error

#### GET /api/procurement/vendors/
**Get vendor list for selector**

Query Parameters:
- `search` (optional): Search vendor by name or code
- `page_size` (optional): Number of results (default 20)

Response:
```
{
  "count": 45,
  "results": [
    {
      "id": 5,
      "name": "Supplier Corp",
      "code": "SUP001",
      "primary_contact": "John Doe",
      "contact_email": "john@supplier.com",
      "contact_phone": "555-1234",
      "default_address": {
        "address_line1": "456 Oak Ave",
        "city": "Boston",
        "state": "MA",
        "postal_code": "02101",
        "country": "USA"
      }
    },
    ...
  ]
}
```

#### GET /api/procurement/products/
**Get product list for line item selector**

Query Parameters:
- `search` (optional): Search product by name or SKU
- `vendor_id` (optional): Filter by vendor
- `page_size` (optional): Number of results (default 20)

Response:
```
{
  "count": 150,
  "results": [
    {
      "id": 123,
      "name": "Widget A",
      "sku": "WID-A-001",
      "category": "Widgets",
      "default_unit_cost": 25.50,
      "unit": "unit",
      "tax_rate": 10.0
    },
    ...
  ]
}
```

#### GET /api/procurement/payment-terms/
**Get payment terms options**

Response:
```
{
  "count": 6,
  "results": [
    {
      "id": 1,
      "name": "Net 15",
      "days": 15
    },
    {
      "id": 2,
      "name": "Net 30",
      "days": 30
    },
    {
      "id": 3,
      "name": "Net 45",
      "days": 45
    },
    {
      "id": 4,
      "name": "Net 60",
      "days": 60
    },
    {
      "id": 5,
      "name": "COD",
      "days": 0
    },
    {
      "id": 6,
      "name": "Prepaid",
      "days": 0
    }
  ]
}
```

#### GET /api/procurement/vendors/{id}/default-address/
**Get vendor default address**

Response:
```
{
  "id": 1,
  "vendor_id": 5,
  "address_line1": "456 Oak Ave",
  "address_line2": "",
  "city": "Boston",
  "state": "MA",
  "postal_code": "02101",
  "country": "USA",
  "is_default": true
}
```

#### POST /api/procurement/purchase-orders/{id}/send/
**Send created PO to vendor**

Request Body:
```
{
  "recipient_email": "john@supplier.com",
  "subject": "Purchase Order PO-2026-00001"
}
```

Response:
```
{
  "success": true,
  "message": "PO sent successfully",
  "po_number": "PO-2026-00001",
  "sent_to": "john@supplier.com",
  "sent_date": "2026-05-20T10:35:00Z"
}
```

---

## Database Requirements

### PurchaseOrder Model

Fields (same as list page but for creation context):
- `id`: Primary key
- `tenant_id`: Tenant reference
- `po_number`: Auto-generated unique per tenant
- `vendor_id`: Reference to vendor
- `po_date`: PO creation date
- `expected_delivery_date`: Expected delivery
- `amount`: Total PO amount
- `status`: draft, sent, confirmed, received, invoiced, cancelled
- `shipping_address`: Full address (JSON or relationship)
- `payment_terms`: Payment terms
- `notes`: PO notes
- `created_at`: Creation timestamp
- `updated_at`: Modification timestamp
- `created_by`: User who created
- `last_modified_by`: User who last modified

### PurchaseOrderItem Model

Fields:
- `id`: Primary key
- `purchase_order_id`: Reference to PO
- `product_id`: Reference to product
- `quantity`: Order quantity
- `unit_cost`: Price per unit
- `discount`: Line discount (amount or percentage)
- `tax`: Line tax (amount or percentage)
- `line_total`: Calculated total (Qty × Cost - Discount + Tax)
- `sequence`: Order within PO (for sorting)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Constraints and Indexes

- Unique constraint: `(tenant_id, po_number)`
- Foreign key: `po_id` → `purchase_orders.id`
- Foreign key: `product_id` → `products.id`
- Foreign key: `vendor_id` → `vendors.id`
- Index: `(purchase_order_id)` for line item queries
- Index: `(product_id)` for product lookup

---

## Validation & Edge Cases

### Data Validation

**PO Number Generation:**
- Must be unique per tenant
- Format: PO-YYYY-XXXXX
- Auto-generated in database
- Cannot be null
- Cannot be manually changed

**PO Date:**
- Cannot be in future
- Cannot be null
- Timezone consistency

**Expected Delivery Date:**
- Must be after PO date
- Cannot be null
- Reasonable future date (e.g., not > 2 years)

**Quantity:**
- Must be > 0 (decimal or integer based on product unit)
- Cannot be negative
- Cannot be null

**Unit Cost:**
- Must be > 0
- Precision: 2 decimal places
- Cannot be null
- Cannot be negative

**Discount:**
- Must be >= 0
- Cannot exceed line subtotal
- Can be currency or percentage
- Default: 0 (no discount)

**Tax:**
- Must be >= 0
- Reasonable percentage (0-50%)
- Can be currency or percentage
- Auto-calculated if available

**Totals:**
- Subtotal = Sum(Quantity × Unit Cost) for all lines
- Line Total = (Qty × Cost) - Discount + Tax
- Grand Total = Sum(Line Totals)
- Validation: Totals must be mathematically accurate

### Edge Cases

**Vendor Not Found:**
- Show error message
- Disable form submission
- Suggest vendor creation option
- Link to create vendor flow

**No Line Items:**
- Prevent form submission
- Show error: "At least one line item required"
- Disable Save buttons

**Duplicate Products:**
- Detect if same product added twice
- Warning message: "This product already added"
- Allow or prevent based on business rules

**Concurrent Creations:**
- Race condition on PO number generation
- Use database sequence or atomic increment
- Retry logic if conflict

**Address Validation:**
- Validate all address fields if custom address
- Check postal code format matches country
- Warn if unusual address

**Total Calculation Precision:**
- Currency rounding: Use banker's rounding
- Always round to 2 decimal places
- Validate totals match line item sum

**Missing Products:**
- Product selector cannot find product
- Quick search available
- Option to create new product (maybe future enhancement)

**Payment Terms:**
- Validate selected terms exist
- Custom terms validation (not exceeding reasonable limits)
- Default to Net 30 if available

---

## Testing Checklist

### Form Display Testing

- [ ] Form displays all required fields
- [ ] PO number auto-generated and displayed
- [ ] PO date auto-populated with today
- [ ] Vendor selector dropdown populated
- [ ] Expected delivery date field appears
- [ ] Address selector shows options
- [ ] Line items section visible
- [ ] Payment terms selector populated
- [ ] Notes field present
- [ ] All buttons appear and are enabled

### Field Interaction Testing

- [ ] Vendor selector filters on search
- [ ] Vendor selection populates contact info
- [ ] PO date picker allows date selection
- [ ] Expected delivery date validation works
- [ ] Address selector toggles between default/custom
- [ ] Custom address fields appear when selected
- [ ] Product selector searches products
- [ ] Product selection populates details
- [ ] Quantity field accepts positive numbers
- [ ] Quantity field rejects negative/zero
- [ ] Unit cost field accepts currency
- [ ] Discount field accepts currency/percentage
- [ ] Tax field accepts currency/percentage
- [ ] Line total auto-calculates correctly
- [ ] Subtotal updates when line changes
- [ ] Tax total updates when line changes
- [ ] Grand total updates when line changes

### Line Item Management Testing

- [ ] Add line item button adds new row
- [ ] Delete line button removes row
- [ ] Cannot delete if only one line (shows confirmation)
- [ ] Can add multiple line items
- [ ] Each line calculates independently
- [ ] Cannot add same product twice
- [ ] Line items persist during edits

### Validation Testing

- [ ] Required fields marked with asterisk
- [ ] Form prevents submission without required fields
- [ ] PO date validation prevents future dates
- [ ] Expected delivery validation prevents past dates
- [ ] Expected delivery must be after PO date
- [ ] Quantity validation prevents non-positive numbers
- [ ] Unit cost validation prevents non-positive numbers
- [ ] Discount cannot exceed line subtotal
- [ ] Tax percentage validates 0-50% range
- [ ] At least one line item required
- [ ] Error messages display clearly
- [ ] Error summary shows all issues
- [ ] Validation updates in real-time

### Calculation Testing

- [ ] Line total = (Qty × Cost) - Discount + Tax
- [ ] Subtotal = Sum of all line quantities × costs
- [ ] Discount total correct
- [ ] Tax total correct
- [ ] Grand total correct
- [ ] Calculations update immediately
- [ ] Currency formatting displays correctly
- [ ] Rounding is accurate

### Submission Testing

- [ ] Save as Draft saves without sending
- [ ] Save as Draft redirects to PO detail
- [ ] Save & Send saves and sends to vendor
- [ ] Save & Send shows confirmation dialog
- [ ] Confirmation dialog displays vendor email
- [ ] Send email triggers notification to vendor
- [ ] Success message displays with PO number
- [ ] Error message displays on failure
- [ ] Loading state shows during submission
- [ ] Buttons disabled during submission
- [ ] Can retry on error

### Edge Case Testing

- [ ] Form handles missing vendor gracefully
- [ ] Form handles no products gracefully
- [ ] Form validates duplicate product check
- [ ] Form handles large quantity values
- [ ] Form handles large cost values
- [ ] Form handles special characters in notes
- [ ] Form handles timezone differences
- [ ] Unsaved changes warning shows
- [ ] Cancel with changes shows confirmation

### Responsive Design Testing

- [ ] Mobile layout (< 768px)
- [ ] Tablet layout (768px-1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Form fields stack appropriately
- [ ] Buttons remain accessible on all sizes
- [ ] Line items table scrollable on small screens
- [ ] All inputs functional on touch devices

---

## Implementation Checklist

### Frontend Components

- [ ] PO creation form main component
- [ ] PO header section component (number, date, vendor)
- [ ] Delivery information section component
- [ ] Shipping address selector component
- [ ] Line items management component
- [ ] Line item row component
- [ ] Product selector dropdown component
- [ ] Quantity input component (with validation)
- [ ] Currency input components (cost, discount, tax)
- [ ] Discount selector (amount vs percentage)
- [ ] Tax field component
- [ ] Line total display component
- [ ] Line item summary component (subtotal, tax, discount, total)
- [ ] Payment terms selector component
- [ ] Notes field component
- [ ] Form action buttons component
- [ ] Unsaved changes warning component
- [ ] Success notification component
- [ ] Error notification component
- [ ] Loading state component
- [ ] Form validation display component

### Services/Utilities

- [ ] PO creation API service
- [ ] Vendor fetching service
- [ ] Product search service
- [ ] Payment terms service
- [ ] Currency formatting utility
- [ ] Number validation utility
- [ ] Total calculation service
- [ ] Tax calculation service
- [ ] Discount calculation service
- [ ] Date validation utility
- [ ] Form validation service
- [ ] Email validation utility

### State Management

- [ ] Form data state
- [ ] Vendor selector state
- [ ] Product selector state
- [ ] Line items state
- [ ] Totals calculation state
- [ ] Form errors state
- [ ] Loading state
- [ ] Success state
- [ ] Payment terms state

### Backend Implementation

- [ ] POST /api/procurement/purchase-orders/ endpoint
- [ ] Input validation (server-side)
- [ ] PO number generation logic
- [ ] Line item processing
- [ ] Total calculation (server verification)
- [ ] Database transaction handling
- [ ] Error handling and messaging
- [ ] Authentication/authorization checks
- [ ] Tenant isolation

### Database

- [ ] PurchaseOrder table schema
- [ ] PurchaseOrderItem table schema
- [ ] Add sequences for PO number generation
- [ ] Add unique constraints
- [ ] Add foreign keys
- [ ] Add indexes for performance
- [ ] Add created_by/updated_by fields
- [ ] Add timestamps

### Services/Business Logic

- [ ] Email service for sending PO to vendor
- [ ] PDF generation (optional for PO creation)
- [ ] Audit logging
- [ ] Permission checking
- [ ] Tenant isolation validation

### Testing

- [ ] Unit tests for components
- [ ] Unit tests for utilities
- [ ] Component integration tests
- [ ] API endpoint tests
- [ ] Form submission tests
- [ ] Validation tests
- [ ] Calculation accuracy tests
- [ ] E2E tests (create PO workflow)

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review:** Peer review all changes
2. **Automated Testing:** All unit and integration tests pass
3. **Functional Testing:** Manual testing of complete workflow
4. **Performance Testing:** Form rendering and submission time
5. **Database Backup:** Full backup before migration
6. **Rollback Plan:** Previous PO creation available

### Deployment Steps

1. **Database Migration:**
   - Create PurchaseOrder and PurchaseOrderItem tables
   - Add sequences for PO number generation
   - Create indexes
   - Verify schema

2. **API Deployment:**
   - Deploy POST endpoint
   - Deploy GET endpoints for vendors, products, payment terms
   - Deploy POST send endpoint
   - Verify endpoints responding

3. **Email Service:**
   - Configure email templates for PO notification
   - Test email sending
   - Verify vendor receives PO email

4. **Frontend Deployment:**
   - Deploy form components
   - Deploy utility services
   - Clear browser cache
   - Verify form loads

5. **Feature Toggle:**
   - Use feature flag for PO creation
   - Gradual rollout (10% → 50% → 100%)
   - Can disable if issues

6. **Staff Training:**
   - Form walkthrough
   - PO creation workflow
   - Save vs send explanation
   - Error handling

7. **Monitoring:**
   - Set up alerting on API latency
   - Track form abandonment
   - Monitor email sending

### Rollback Plan

- Maintain previous PO creation form
- Feature flag to disable new form
- Database rollback procedure (if needed)
- Rollback timeline: < 30 minutes

---

## Performance Targets

### Response Times

| Operation | Target | Notes |
|-----------|--------|-------|
| Form render | < 300ms | Initial load |
| Vendor search | < 200ms | Debounced |
| Product search | < 200ms | Debounced |
| PO creation | < 1s | Save to database |
| Email send | < 2s | Async operation |
| Page redirect | < 500ms | After success |

### Resource Usage

- Form component: < 5MB memory
- API payload: < 100KB
- Client-side validation: < 50ms
- No memory leaks on form submit

---

## Monitoring & Alerting

### Metrics to Track

1. **Form Performance:**
   - Form load time
   - Render time for line items
   - Submission time

2. **PO Creation Success:**
   - Successful POs created per day
   - Success rate (%)
   - Failure reasons (top 5)

3. **Email Delivery:**
   - Email send success rate
   - Email delivery failures
   - Bounce rate

4. **User Behavior:**
   - Form completion rate
   - Form abandonment rate
   - Average number of line items
   - Save as Draft vs Save & Send ratio

5. **Validation Errors:**
   - Most common validation errors
   - Form field error frequency

### Alerts

- **Critical:** Email send failures > 5%
- **Critical:** PO creation errors > 2%
- **Warning:** Form load time > 1s
- **Warning:** Email send latency > 3s
- **Info:** High form abandonment rate

---

## Documentation Requirements

### For End Users

1. **PO Creation Guide**
   - Step-by-step walkthrough
   - Screenshots of each section
   - Keyboard shortcuts (if any)

2. **Vendor Selection Guide**
   - How to find vendor
   - How to search vendors
   - Creating new vendor (if needed)

3. **Line Item Entry Guide**
   - How to add line items
   - How to edit line items
   - How to delete line items
   - Product search tips

4. **Pricing & Calculation Guide**
   - How discounts work
   - How taxes calculated
   - Understanding totals
   - Currency handling

5. **Payment Terms Explanation**
   - Available payment terms
   - What each means
   - Custom terms option

6. **Save vs Send Explanation**
   - When to use Save as Draft
   - When to use Save & Send
   - Editing drafts
   - Resending PO

7. **Address Management**
   - Using vendor default address
   - Entering custom address
   - Address field requirements

### For Developers

1. **API Documentation**
   - Endpoint specifications
   - Request/response formats
   - Validation rules
   - Error responses

2. **Component Documentation**
   - Component interfaces
   - Props and state
   - Usage examples

3. **Calculation Logic**
   - Formulas for totals
   - Tax calculation rules
   - Discount application

---

## Future Enhancements

### Phase 2 Features

1. **PO Templates**
   - Save current PO as template
   - Reuse previous PO structure
   - Template library management

2. **Quick Reorder**
   - Reorder from previous purchases
   - Auto-populate line items
   - Modify quantities quickly

3. **Product Suggestions**
   - Recommend products based on vendor
   - Suggest products based on category
   - Show historical pricing

4. **Bulk Line Item Import**
   - Import from spreadsheet
   - CSV upload capability
   - Validate import before creation

### Phase 3 Features

1. **Purchase Approvals Workflow**
   - Approval routing
   - Multi-level approvals
   - SLA tracking

2. **PO Number Customization**
   - Custom format configuration
   - Prefix/suffix options
   - Numbering scheme selection

3. **Multi-Currency Support**
   - Currency selection per PO
   - Exchange rate handling
   - Conversion display

4. **Attachments**
   - Attach specifications
   - Attach drawings
   - Attach documents

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Ready for Development
