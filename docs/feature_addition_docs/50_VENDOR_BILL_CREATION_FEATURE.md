# Feature 50: Vendor Bill Creation

## Executive Summary

The Vendor Bill Creation feature provides an intuitive form-based interface for accounting staff to create and record supplier billing documents within the LankaCommerce Cloud platform. This feature enables comprehensive bill entry including line item management, automatic pricing calculations, payment terms assignment, and optional PO linking with automatic line item population. The creation workflow supports both draft saving and submission to accounting workflows, ensuring accurate financial record-keeping with validation at every step.

---

## Current State Assessment

### Existing Implementation Status

- **Basic bill creation form**: Partially implemented with core structure
- **Vendor selector**: Working with dropdown interface
- **Bill date auto-population**: Implemented with current date as default
- **Due date selector**: Date picker implemented
- **Line items section**: Basic structure incomplete; needs full functionality
- **Description field**: Implemented and accepting text input
- **Quantity field**: Implemented but validation incomplete
- **Unit cost field**: Implemented but currency formatting incomplete
- **Discount/tax calculation**: Partially implemented; rounding issues remain
- **Payment terms selector**: Incomplete; dropdown needs population
- **PO linking**: Partially implemented; auto-fill incomplete
- **Amount validation**: Incomplete; bill vs PO comparison missing
- **Form submission**: Basic save functionality; draft/submit distinction needed
- **Error handling**: Partial implementation; validation messages incomplete

### Known Gaps

- Auto-fill from PO line items not implemented
- Multi-line item support incomplete
- Discount calculation (fixed vs percentage) needs implementation
- Tax calculation service incomplete
- Real-time total calculation incomplete
- Vendor quick-create functionality missing
- Unsaved changes warning not implemented
- Success notification with bill number missing
- Form state persistence incomplete

---

## Detailed Requirements

### Frontend Features

#### Form Header

**Title and Navigation:**
- Page title: "Create New Vendor Bill"
- Back button: Navigates to bills list with unsaved changes warning
- Progress indicator: Shows current step if multi-step form (optional)
- Help icon: Displays form instructions on hover

#### Bill Header Section

**Bill Number Field:**
- Display: Read-only if auto-generated
- Auto-generation: System generates next bill number in sequence
- Manual entry: Option to override if custom numbering allowed
- Format: VB-XXXX or configurable format
- Validation: Unique per tenant
- Placeholder: "Auto-generated"

**Bill Date Field:**
- Default: Current date pre-populated
- Type: Date picker with calendar UI
- Validation: Cannot be in future
- Timezone: Respects user timezone
- Display format: Consistent with user locale

**Vendor Selector (Required):**
- Type: Searchable dropdown/autocomplete
- Search capability: By vendor name, partial matching
- Dropdown display: Vendor name, vendor code if available
- Quick create link: "Create new vendor" link if vendor not found
- Vendor info: Show contact info on hover/selection
- Error state: Required field indicator if not selected
- Accessibility: Keyboard navigable, screen reader friendly

**PO Selector (Optional):**
- Type: Searchable dropdown/autocomplete
- Filtered scope: Only open/received POs for selected vendor
- Display: PO number, date, amount
- Auto-fill option: "Auto-fill line items from PO" checkbox
- Link display: "Link to PO" text
- Validation: Validates PO total vs bill amount if linked
- Error state: Shows warning if bill exceeds PO amount

#### Delivery and Payment Section

**Due Date Field (Required):**
- Type: Date picker with calendar UI
- Default: 30 days from bill date (configurable)
- Validation: Must be on or after bill date
- Display format: User locale specific
- Timezone: Respects user timezone

**Payment Terms Selector (Required):**
- Type: Dropdown with predefined terms
- Options: Due on receipt, Net 15, Net 30, Net 60, Custom
- Display: Term name and description (e.g., "Net 30 - Payment due 30 days after bill date")
- Custom terms: Allow manual entry if needed
- Auto-calculation: Auto-calculates due date based on term selection
- Error state: Required field indicator

**Payment Method Selector (Optional):**
- Type: Dropdown
- Options: Bank transfer, check, credit card, ACH, other
- Purpose: For tracking and payment workflows
- Conditional display: May be required in some tenants

#### Line Items Section (Required, Minimum 1 Item)

**Dynamic Line Items Table:**
- Add line button: "Add Line Item" button below table
- Delete button: Trash icon on each line (except if only item, disable)
- Columns:
  1. **Description (Required)**: Text field, 1-500 characters
  2. **Quantity (Required)**: Numeric input, > 0, decimal support
  3. **Unit Cost (Required)**: Currency input, > 0, formatted with currency symbol
  4. **Discount (Optional)**: Toggle between fixed amount or percentage
  5. **Tax (Optional)**: Fixed amount or percentage, auto-calculated option
  6. **Line Total (Read-only)**: Auto-calculated based on formula

**Line Item Calculations:**
- Formula: `Line Total = (Quantity × Unit Cost - Discount) × (1 + Tax Rate)`
- Precision: Always round to 2 decimal places
- Update trigger: Real-time as user types
- Validation: Show error if calculation results in negative

**Add Line Item Button:**
- Label: "Add Line Item"
- Position: Below line items table
- Icon: Plus icon
- Behavior: Adds new empty row to table
- Default values: All fields empty except auto-populated if from PO

**Delete Line Item:**
- Icon: Trash/delete icon on each row
- Disabled: Only available if more than one line item exists
- Confirmation: Show confirmation dialog before delete
- Behavior: Removes line and recalculates totals

#### Bill Totals Section

**Automatic Calculations (Read-only Display):**
- **Subtotal**: Sum of all line totals before discounts
  - Formula: Σ (Quantity × Unit Cost) for all lines
  - Display: Large, prominent currency amount
  
- **Tax Total**: Sum of tax amounts from all lines
  - Formula: Σ (Line Amount × Tax Rate) for all lines
  - Display: Clear indication of tax component
  
- **Discount Total**: Sum of all discounts
  - Formula: Σ (Discount Amount) for all lines
  - Display: Shown separately
  
- **Grand Total**: Final bill amount
  - Formula: Subtotal + Tax - Discount
  - Display: Large, prominent, highlighted styling
  - Validation: Cannot be negative or zero

**Recalculation Trigger:**
- Automatic: On every line item change
- Real-time: No page refresh required
- Debounced: If performance needed (100ms)

#### Additional Information Section

**Reference/Invoice Number Field (Optional):**
- Label: "Vendor Invoice #" or "Reference #"
- Type: Text field
- Length: Max 100 characters
- Purpose: Store vendor's invoice number for reference
- Validation: None required

**Notes Field (Optional):**
- Type: Text area
- Max length: 1000 characters
- Character counter: Display remaining characters
- Purpose: Internal notes about bill (e.g., "Invoice attached", "Price adjustment noted")
- Placeholder: "Add any additional notes..."

**Attachment Section (Optional):**
- Display: File upload area with drag-and-drop
- Accepted formats: PDF, JPG, PNG, XLSX, DOC, DOCX
- Max file size: 10MB per file
- Multiple files: Allow up to 5 attachments
- Display: List of attached files with delete buttons
- Purpose: Attach scanned invoices or supporting documents

#### Form Validation Messages

**Real-time Validation:**
- Required field indicators: Red asterisk (*) on required fields
- Inline error messages: Below each field showing specific error
- Error summary: At top of form showing all errors
- Field highlighting: Red border on fields with errors
- Validation timing: On blur or after user interaction

**Error Message Examples:**
- "Vendor is required"
- "Quantity must be greater than 0"
- "Unit cost must be a valid currency amount"
- "At least one line item is required"
- "Bill total must equal PO total (difference: $500)"
- "Due date must be on or after bill date"

#### Form Buttons and Actions

**Save as Draft Button (Secondary):**
- Label: "Save as Draft"
- Styling: Secondary button style
- Action: Saves bill with status="draft"
- Validation: Performs validation but allows incomplete form
- Response: Success message with bill number and link to view
- Navigation: Option to stay on form or go to bill list

**Submit Bill Button (Primary):**
- Label: "Submit Bill"
- Styling: Primary button style (prominent color)
- Action: Saves bill and submits to accounting workflow
- Validation: Requires all fields to be valid
- Response: Success message, navigates to bill detail or list
- Disabled: If required fields empty or validation errors

**Cancel Button:**
- Label: "Cancel"
- Styling: Tertiary button style
- Action: Navigates away from form
- Unsaved changes: Shows confirmation warning if form modified
- Behavior: Returns to previous page (bills list or vendor detail)

#### State and Loading

**Loading State:**
- Show during vendor/PO data loading
- Disable form inputs while loading
- Display spinner/skeleton loaders
- Show "Loading..." text

**Success State:**
- Toast notification: "Bill created successfully"
- Display bill number: "Bill #VB-001234 created"
- Link to view: "View bill" link in notification
- Auto-dismiss: After 5 seconds or user dismisses
- Navigation: Optional auto-navigate to detail page

**Error State:**
- Toast notification: "Error creating bill"
- Error details: Show API error message
- Retry action: "Retry" button in notification
- Form preservation: Keep form data for user to correct

---

### Backend API Requirements

#### Create Bill Endpoint

**Endpoint:** `POST /api/accounting/vendor-bills/`

**Request Body:**
```json
{
  "bill_number": "VB-001",
  "vendor_id": 5,
  "bill_date": "2026-05-30",
  "due_date": "2026-06-30",
  "po_id": 12,
  "line_items": [
    {
      "description": "Office Supplies - Pens",
      "quantity": 100,
      "unit_cost": 0.50,
      "discount": 5.00,
      "tax": 2.50
    },
    {
      "description": "Notebooks",
      "quantity": 50,
      "unit_cost": 2.00,
      "discount": 0,
      "tax": 5.00
    }
  ],
  "payment_terms": "net_30",
  "payment_method": "bank_transfer",
  "reference_number": "INV-2024-001",
  "notes": "Price adjustment applied",
  "status": "draft"
}
```

**Response:**
```json
{
  "id": 1,
  "bill_number": "VB-001",
  "vendor_id": 5,
  "bill_date": "2026-05-30",
  "due_date": "2026-06-30",
  "po_id": 12,
  "amount": 152.50,
  "status": "draft",
  "paid_amount": 0,
  "payment_terms": "net_30",
  "reference_number": "INV-2024-001",
  "notes": "Price adjustment applied",
  "created_at": "2026-05-30T10:30:00Z",
  "updated_at": "2026-05-30T10:30:00Z"
}
```

**Status Codes:**
- 201 Created: Bill created successfully
- 400 Bad Request: Validation error (invalid vendor, missing fields, etc.)
- 403 Forbidden: User lacks accounting permissions
- 409 Conflict: Bill number already exists for tenant

#### Vendor List Endpoint

**Endpoint:** `GET /api/accounting/vendors/`

**Query Parameters:**
- `search` (string): Filter vendors by name or code
- `page_size` (integer): Results per page

**Response:**
```json
{
  "results": [
    {
      "id": 5,
      "name": "Acme Office Supplies",
      "code": "ACME",
      "contact_person": "John Smith",
      "email": "john@acme.com",
      "phone": "+1-555-0100"
    }
  ]
}
```

#### Purchase Order List Endpoint

**Endpoint:** `GET /api/procurement/purchase-orders/`

**Query Parameters:**
- `vendor_id` (integer): Filter to specific vendor
- `status` (string): Filter to open/received orders
- `search` (string): Filter by PO number
- `page_size` (integer): Results per page

**Response:**
```json
{
  "results": [
    {
      "id": 12,
      "po_number": "PO-2024-001",
      "vendor_id": 5,
      "po_date": "2026-05-01",
      "total_amount": 500.00,
      "status": "received"
    }
  ]
}
```

#### Purchase Order Line Items Endpoint

**Endpoint:** `GET /api/procurement/purchase-orders/{id}/line-items/`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "description": "Office Supplies - Pens",
      "quantity": 100,
      "unit_cost": 0.50,
      "line_total": 50.00
    }
  ]
}
```

#### Payment Terms Endpoint

**Endpoint:** `GET /api/accounting/payment-terms/`

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "code": "due_on_receipt",
      "label": "Due on Receipt",
      "description": "Payment due immediately"
    },
    {
      "id": 2,
      "code": "net_30",
      "label": "Net 30",
      "description": "Payment due 30 days after bill date"
    }
  ]
}
```

#### Vendor Details Endpoint

**Endpoint:** `GET /api/accounting/vendors/{id}/`

**Response:**
```json
{
  "id": 5,
  "name": "Acme Office Supplies",
  "code": "ACME",
  "contact_person": "John Smith",
  "email": "john@acme.com",
  "phone": "+1-555-0100",
  "address": "123 Business St, City, State 12345",
  "tax_id": "12-3456789"
}
```

#### Update Bill Endpoint (Draft Only)

**Endpoint:** `PATCH /api/accounting/vendor-bills/{id}/`

**Request Body:** Same as create, any subset of fields

**Conditions:** Only allowed if bill status is "draft"

**Response:** Updated bill object

---

### Database Requirements

#### VendorBill Model

**Fields:**
- `id` (Primary Key): Unique identifier
- `tenant_id` (Foreign Key): Multi-tenant isolation
- `bill_number` (String, Unique per tenant): Unique bill identifier
- `vendor_id` (Foreign Key): Reference to Vendor
- `po_id` (Foreign Key, Nullable): Reference to PurchaseOrder
- `bill_date` (Date): Date bill was issued
- `due_date` (Date): Payment due date
- `amount` (Decimal): Total bill amount (cached from line items)
- `status` (Enum): draft, submitted, paid, partially_paid, overdue
- `paid_amount` (Decimal): Amount paid to date
- `payment_terms` (String): Term code (due_on_receipt, net_30, etc.)
- `payment_method` (String, Nullable): Payment method code
- `reference_number` (String, Nullable): Vendor's invoice number
- `notes` (Text, Nullable): Internal notes
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp
- `submitted_date` (DateTime, Nullable): Date bill was submitted
- `deleted_at` (DateTime, Nullable): Soft delete timestamp

**Constraints:**
- Unique constraint: (tenant_id, bill_number)
- Not null: vendor_id, bill_date, due_date, payment_terms, status
- Foreign keys: vendor_id → Vendor, po_id → PurchaseOrder, tenant_id → Tenant
- Check: due_date >= bill_date
- Check: amount >= 0
- Check: paid_amount >= 0

#### VendorBillItem Model

**Fields:**
- `id` (Primary Key): Unique identifier
- `bill_id` (Foreign Key): Reference to VendorBill
- `description` (String): Item description
- `quantity` (Decimal): Quantity ordered
- `unit_cost` (Decimal): Cost per unit
- `discount` (Decimal): Discount amount (fixed)
- `tax` (Decimal): Tax amount (fixed)
- `line_total` (Decimal): Total for line (calculated)
- `created_at` (DateTime): Timestamp

**Constraints:**
- Foreign key: bill_id → VendorBill (CASCADE delete)
- Not null: bill_id, description, quantity, unit_cost
- Check: quantity > 0
- Check: unit_cost > 0
- Check: discount >= 0
- Check: tax >= 0
- Check: line_total >= 0

**Indexes:**
- Index: (bill_id)
- Index: (bill_id, created_at)

#### Bill Number Sequence

**Implementation:**
- Auto-increment sequence: `vendor_bill_number_seq` per tenant
- Format: VB-XXXX (padded with zeros)
- Reset: Per fiscal year if needed
- Lock: Database-level lock to prevent duplicates

---

## Validation & Edge Cases

### Form Validation Rules

- **Vendor selection required**: Cannot submit without selecting vendor
- **At least one line item required**: Form prevents submission with empty line items
- **Quantity validation**: Must be numeric, greater than 0, supports decimals
- **Unit cost validation**: Must be positive currency amount
- **Total calculation precision**: All calculations rounded to 2 decimal places (currency standard)
- **Discount validation**: Cannot exceed line item total (shows error)
- **Tax calculation**: Supports both fixed amount and percentage (10%, $5.00)
- **Due date validation**: Must be on or after bill date
- **Vendor exists**: Cannot create bills for deleted vendors
- **PO validation**: If PO selected, validates bill amount vs PO total
- **Bill number uniqueness**: System ensures unique per tenant
- **Concurrent operations**: Database constraints prevent race conditions

### Edge Cases

- **No selected vendor**: Form disabled, error message shown
- **Vendor not found in dropdown**: Quick-create vendor link offered
- **PO with no line items**: Option to manually add items
- **PO line items used**: System copies to bill, user can modify
- **Large quantity orders**: System handles numeric precision
- **Multiple decimal places**: Currency rounding applies (e.g., 10.345 → 10.35)
- **Zero-amount line items**: System prevents (validation error)
- **Negative amounts**: System prevents through validation
- **Empty line items on submit**: Validation error shown
- **PO amount mismatch**: Warning displayed if bill exceeds PO
- **Concurrent bill creation**: Unique constraint prevents duplicate bill numbers
- **Session timeout**: Form data lost (no persistence across sessions)
- **Network failure during save**: Error shown, form data preserved
- **Browser back button**: Unsaved changes warning shown

---

## Testing Checklist

### Functional Tests

- [ ] Form displays all required and optional fields
- [ ] Bill number auto-generated correctly on page load
- [ ] Bill number follows format VB-XXXX
- [ ] Bill date auto-populated with current date
- [ ] Bill date cannot be in future
- [ ] Vendor selector displays vendor list on click
- [ ] Vendor search filters list correctly
- [ ] Vendor selection populates vendor info on form
- [ ] PO selector filters to vendor's open POs
- [ ] PO selection shows amount and details
- [ ] Auto-fill from PO checkbox works
- [ ] PO line items populate as bill line items
- [ ] Due date picker displays calendar
- [ ] Due date defaults to 30 days from bill date
- [ ] Due date must be >= bill date
- [ ] Payment terms selector shows all terms
- [ ] Payment terms displays description
- [ ] Payment method selector works
- [ ] Line item description accepts text (1-500 chars)
- [ ] Line item quantity accepts numbers
- [ ] Quantity rejects non-numeric input
- [ ] Quantity must be > 0
- [ ] Quantity supports decimals (e.g., 10.5)
- [ ] Unit cost accepts currency amounts
- [ ] Unit cost rejects non-numeric input
- [ ] Unit cost must be > 0
- [ ] Discount field accepts amounts
- [ ] Discount percentage option works
- [ ] Tax field accepts amounts
- [ ] Tax percentage option works
- [ ] Line total auto-calculates correctly
- [ ] Line total formula: (Qty × Cost - Discount) × (1 + Tax%)
- [ ] Add line item button adds new row
- [ ] Delete line item button removes row (if >1 item)
- [ ] Delete button disabled if only 1 item
- [ ] Subtotal calculates as sum of line totals
- [ ] Tax total calculates correctly
- [ ] Discount total calculates correctly
- [ ] Grand total = Subtotal + Tax - Discount
- [ ] Grand total updates in real-time
- [ ] Reference number field accepts text (100 chars max)
- [ ] Notes field accepts text (1000 chars max)
- [ ] Notes character counter works
- [ ] Attachment upload accepts PDF, JPG, PNG, XLSX
- [ ] Attachment upload rejects files >10MB
- [ ] Attachment upload allows up to 5 files
- [ ] Save as draft saves bill with draft status
- [ ] Save as draft shows success notification
- [ ] Save as draft shows bill number
- [ ] Submit button disabled if required fields empty
- [ ] Submit button enabled when form valid
- [ ] Submit bill validates all required fields
- [ ] Submit bill shows validation errors
- [ ] Submit bill saves and submits to workflow
- [ ] Submit shows success notification
- [ ] Cancel button shows unsaved changes warning
- [ ] Unsaved changes warning has proceed/cancel options
- [ ] PO amount validation warns if bill > PO
- [ ] Bill creation success shows bill number
- [ ] Bill creation error shows error message
- [ ] Form responsive on mobile (320px)
- [ ] Form responsive on tablet (768px)
- [ ] Form responsive on desktop (1024px+)

### Validation Tests

- [ ] Required field indicators show (red asterisks)
- [ ] Inline error messages appear on blur
- [ ] Error summary appears at top of form
- [ ] Error messages clear when corrected
- [ ] Field highlighting shows on error
- [ ] Field highlighting clears on correction
- [ ] Negative totals prevented
- [ ] Zero totals prevented
- [ ] Concurrent submissions handled (no duplicates)
- [ ] Bill number uniqueness enforced per tenant
- [ ] Vendor validation rejects deleted vendors
- [ ] PO validation checks amount vs bill
- [ ] Date validation correct for timezone

### Performance Tests

- [ ] Form renders in <300ms
- [ ] Vendor dropdown loads in <200ms
- [ ] Vendor search completes in <200ms
- [ ] PO dropdown loads in <200ms
- [ ] PO auto-fill completes in <500ms
- [ ] Line total recalculates in <50ms
- [ ] Grand total recalculates in <50ms
- [ ] Bill submission completes in <1s
- [ ] Large quantity handled correctly (1000+)
- [ ] Many line items (50+) handled smoothly

### Edge Case Tests

- [ ] Form handles vendor with no name
- [ ] Form handles PO with $0 amount
- [ ] Form handles discount > line amount (error)
- [ ] Form handles network timeout (error shown)
- [ ] Form handles API 500 error (error shown)
- [ ] Form handles concurrent edits (last write wins)
- [ ] Form preserves data on validation error
- [ ] Form clears on successful submit

---

## Implementation Checklist

### Frontend Components

- [ ] Bill creation form container
- [ ] Bill header section component
- [ ] Bill number field (auto-generated display)
- [ ] Bill date picker component
- [ ] Vendor selector component (searchable dropdown)
- [ ] PO selector component (conditional display)
- [ ] Payment information section component
- [ ] Due date picker component
- [ ] Payment terms selector component
- [ ] Payment method selector component
- [ ] Line items management component
- [ ] Line item row component
- [ ] Description input field
- [ ] Quantity input with validation
- [ ] Unit cost input with currency formatting
- [ ] Discount input (fixed/percentage toggle)
- [ ] Tax input (fixed/percentage toggle)
- [ ] Line total display (read-only, auto-calculated)
- [ ] Add line item button component
- [ ] Delete line item button component
- [ ] Bill totals section component
- [ ] Subtotal display component
- [ ] Tax total display component
- [ ] Discount total display component
- [ ] Grand total display component
- [ ] Additional information section component
- [ ] Reference number input
- [ ] Notes textarea with character counter
- [ ] Attachment uploader component
- [ ] Form action buttons component
- [ ] Save as draft button
- [ ] Submit bill button
- [ ] Cancel button
- [ ] Validation error summary component
- [ ] Field-level error messages
- [ ] Loading state component
- [ ] Success notification component
- [ ] Error notification component

### Services and Utilities

- [ ] Bill calculation service
- [ ] Line total calculation function
- [ ] Subtotal calculation function
- [ ] Tax total calculation function
- [ ] Grand total calculation function
- [ ] Currency formatting service
- [ ] Decimal precision rounding service
- [ ] Date formatting and validation service
- [ ] Form state management (Redux/Context)
- [ ] API client for bill creation
- [ ] API client for vendor list
- [ ] API client for PO list
- [ ] API client for PO line items
- [ ] API client for payment terms
- [ ] Auto-fill service (PO to bill)
- [ ] Validation service (all form rules)
- [ ] Unsaved changes detection service
- [ ] Permission checking service

### State Management

- [ ] Vendor state (selected, list)
- [ ] PO state (selected, list)
- [ ] Line items state (array of items)
- [ ] Form values state (all inputs)
- [ ] Validation errors state
- [ ] Loading state
- [ ] Error notification state
- [ ] Success notification state
- [ ] Unsaved changes state

### Accessibility & UX

- [ ] ARIA labels on all form inputs
- [ ] ARIA labels on all buttons
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Required field indication (aria-required)
- [ ] Form accessibility testing
- [ ] Keyboard navigation (Tab, Shift+Tab)
- [ ] Keyboard submission (Enter on submit)
- [ ] Screen reader compatibility
- [ ] Color contrast compliance (WCAG AA)
- [ ] Focus indicators visible
- [ ] Placeholder text not used as labels

### Testing

- [ ] Unit tests for calculation service
- [ ] Unit tests for validation rules
- [ ] Component tests for form rendering
- [ ] Component tests for input changes
- [ ] Integration tests for form submission
- [ ] Integration tests for API calls
- [ ] E2E tests for complete workflow
- [ ] E2E tests for error scenarios
- [ ] Performance tests for large datasets

---

## Deployment Strategy

### Pre-deployment Checklist

- [ ] API endpoints deployed and tested
- [ ] Database migrations applied
- [ ] Bill number sequence initialized
- [ ] Test data created for testing
- [ ] API response times verified (<1s)
- [ ] Calculation accuracy verified
- [ ] Permission checks tested
- [ ] Multi-tenant isolation tested

### Phased Deployment

**Phase 1: API Backend**
- Deploy POST /api/accounting/vendor-bills/ endpoint
- Deploy supporting GET endpoints (vendors, POs, payment terms)
- Test with production-like data volume
- Verify database performance

**Phase 2: Frontend**
- Deploy bill creation form
- Enable feature flag (start at 10% users)
- Monitor form submission success rate
- Collect user feedback

**Phase 3: Integration**
- Deploy status update endpoint
- Integrate with accounting workflow
- Test submission to workflow

### Testing Requirements

- Create test bills with various configurations
- Verify calculations accuracy with accounting team
- Perform stress testing (100+ concurrent submissions)
- Test multi-tenant isolation
- Verify permission enforcement
- Test error scenarios (API failures, network issues)

### Staff Training

- Show form walkthrough (all fields)
- Demonstrate line item entry
- Explain PO linking and auto-fill
- Show save vs submit difference
- Demonstrate error handling
- Show successful bill creation workflow

### Rollback Plan

- Keep previous bill creation method available
- Database rollback scripts prepared
- Feature flag allows instant disable
- Monitor submission success rate
- Alert thresholds defined

### Performance Monitoring

- Monitor API latency for bill creation
- Track form submission success rate
- Monitor calculation accuracy
- Alert on slow submissions (>1s)
- Track vendor/PO data loading time

---

## Performance Targets

- **Form rendering**: <300ms (initial page load)
- **Vendor dropdown loading**: <200ms
- **Vendor search execution**: <200ms
- **PO dropdown loading**: <200ms
- **PO line items auto-fill**: <500ms (copy to bill items)
- **Bill creation API call**: <1s (p95)
- **Line item calculation**: <50ms (real-time updates)
- **Grand total recalculation**: <50ms
- **Form submission**: <1s end-to-end

---

## Monitoring & Alerting

### Key Metrics

- **Form Submission Success Rate**: Percentage of successful bill creations
- **Form Abandonment Rate**: Users who start but don't complete
- **Calculation Accuracy**: Verify totals match expected values
- **API Latency**: Track bill creation endpoint response time
- **Vendor Lookup Performance**: Time to load vendor data
- **PO Auto-fill Success**: Percentage of successful auto-fills
- **Error Rate**: Track validation and API errors

### Alerting Rules

- Alert if submission success rate <95%
- Alert if form rendering takes >300ms (p95)
- Alert if bill creation API takes >1s (p95)
- Alert if vendor search takes >200ms
- Alert if calculation errors detected
- Alert on permission denial spike

### Dashboards

- Form submission funnel (pages viewed → submitted)
- API latency trends for bill creation
- Vendor/PO lookup performance
- Calculation accuracy metrics
- Error rate tracking
- Form field abandonment rates

---

## Documentation Requirements

### User Documentation

- **Bill Creation Guide**: Step-by-step walkthrough of form
- **Vendor Selection Guide**: How to find and select vendors
- **Line Item Entry Guide**: How to enter items and calculations
- **PO Linking Guide**: How and when to link to POs
- **Auto-fill Feature Guide**: How auto-fill works and when used
- **Payment Terms Explanation**: Different payment term options
- **Save vs Submit Explanation**: Difference between draft and submitted
- **Error Messages Guide**: Common errors and how to fix them
- **Keyboard Shortcuts**: Tab order, form submission with Enter

### Developer Documentation

- **API Endpoint Documentation**: OpenAPI specs for POST endpoint
- **Bill Calculation Service**: How calculations are performed
- **State Management**: Form state handling and updates
- **Validation Rules**: Complete validation logic documentation
- **Testing Guide**: How to test form and calculations
- **Performance Optimization**: Database and API optimization
- **Deployment Checklist**: Pre-deployment requirements

---

## Future Enhancements

### Phase 2 Features

- **Bill Templates**: Save and reuse bill templates with line items
- **Quick Rebill**: Create bill from previous bill (duplicate + modify)
- **Line Item Suggestions**: Suggest items based on vendor/category
- **Bulk Line Item Import**: Import line items from spreadsheet (CSV/Excel)
- **Bill Approval Workflow**: Multi-level approval before submission
- **Custom Bill Number Format**: Allow configurable bill numbering scheme
- **Multi-currency Support**: Create bills in multiple currencies

### Phase 3 Features

- **OCR for Bill Scanning**: Scan paper invoices and auto-populate form
- **Duplicate Bill Detection**: Alert user if bill appears to be duplicate
- **Recurring Bill Creation**: Create recurring bills for vendors
- **Integration with Vendor Portal**: Vendors submit bills through portal
- **Advanced Tax Calculation**: Complex tax rules (HST, VAT, etc.)
- **Early Payment Discount**: Show available discounts for early payment
- **Bill Routing Workflow**: Route bills for approval based on amount/vendor

---

## Appendix

### Payment Terms Reference

| Term Code | Label | Description |
|-----------|-------|-------------|
| due_on_receipt | Due on Receipt | Payment due immediately |
| net_15 | Net 15 | Payment due 15 days after bill date |
| net_30 | Net 30 | Payment due 30 days after bill date |
| net_60 | Net 60 | Payment due 60 days after bill date |
| 2_10_net_30 | 2/10 Net 30 | 2% discount if paid within 10 days, else 30 days |

### Bill Number Format Examples

- **Auto-generated**: VB-0001, VB-0002, VB-9999
- **Custom format** (if allowed): ACME-INV-001, INV-2024-001

### Currency Formatting Examples

- USD: $1,234.56
- EUR: €1.234,56 (European locale)
- GBP: £1,234.56
- INR: ₹1,23,456.00

### Line Item Calculation Examples

**Example 1: Simple item**
- Quantity: 10
- Unit Cost: $50.00
- Discount: $0
- Tax: 10%
- Line Total: (10 × $50 - $0) × (1 + 0.10) = $550.00

**Example 2: Item with discount**
- Quantity: 100
- Unit Cost: $1.00
- Discount: $10.00 (fixed)
- Tax: 5%
- Line Total: (100 × $1 - $10) × (1 + 0.05) = $94.50

**Example 3: Item with percentage discount and tax**
- Quantity: 50
- Unit Cost: $2.00
- Discount: 10% ($10.00)
- Tax: 8%
- Line Total: (50 × $2 - $10) × (1 + 0.08) = $86.40
