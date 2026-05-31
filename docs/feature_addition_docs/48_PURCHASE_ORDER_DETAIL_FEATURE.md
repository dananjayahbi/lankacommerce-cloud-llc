# Purchase Order Detail Feature Specification

## Executive Summary

The Purchase Order Detail Page provides a comprehensive, read-only view of individual purchase order information, line items, status tracking, receiving workflow, and integration with billing. This feature enables procurement staff to monitor PO progression through its lifecycle, receive goods, track deliveries, and create associated bills. The interface emphasizes transparency through status timelines, audit trails, and related document links.

**Key Business Value:**
- Complete PO visibility and tracking
- Streamlined goods receiving workflow
- Audit trail and status history
- Integrated billing creation
- Vendor communication facilitation
- Compliance and record-keeping

---

## Current State Analysis

### Existing Implementation
- PO detail page partially implemented
- Header and vendor info display working
- Line items table basic display
- Totals calculation working
- Receive goods section incomplete
- Bill creation link missing
- Audit trail incomplete
- Timeline display missing
- Export/print functionality partial

### Known Limitations
- Limited status tracking
- Missing receive goods workflow
- Incomplete audit trail
- No visual timeline
- Missing related documents
- Limited action buttons

---

## Detailed Requirements

### Frontend Features

#### 1. PO Header Section (Read-Only Display)

**PO Number:**
- Large, prominent display
- Format: "PO-YYYY-XXXXX"
- Copy-to-clipboard button
- Unique identifier highlight

**PO Status Badge:**
- Color-coded status display
  - Draft: Gray
  - Sent: Blue
  - Confirmed: Green
  - Received: Purple
  - Invoiced: Gold
  - Cancelled: Red/Strikethrough
- Status text inside badge
- Hover tooltip explaining status
- Status change timestamp

**PO Dates:**
- PO Date (creation date)
- Expected Delivery Date
- Display format: "May 20, 2026"
- Formatted with time zone

**Status Timeline:**
- Visual representation of PO lifecycle
- Horizontal timeline showing:
  - Created (always first)
  - Sent (if applicable, with date)
  - Confirmed (if applicable, with date)
  - Received (if applicable, with date)
  - Invoiced (if applicable, with date)
- Completed steps highlighted/filled
- Future steps grayed out
- Connect steps with visual line
- Hover to see timestamp for each step

#### 2. Vendor Information Section (Read-Only)

**Vendor Details:**
- Vendor name (as clickable link to vendor profile)
- Vendor code (if applicable)
- Primary contact person name
- Contact phone number (clickable to call, if supported)
- Contact email (clickable to email)
- Default vendor address (full address)

**Quick Actions:**
- "Contact Vendor" button
  - Opens email compose dialog
  - Pre-fills vendor email
  - Shows PO number in subject
- "View Vendor Profile" link (opens vendor details page)

#### 3. Line Items Section (Read-Only)

**Line Items Table:**

Columns:
- Product (product name with link to product details)
- Quantity (ordered quantity)
- Unit Cost (price per unit)
- Discount (applied discount, if any)
- Tax (tax amount)
- Line Total (calculated total: Qty × Cost - Discount + Tax)

Features:
- All columns read-only
- Sortable by clicking header (optional)
- Row highlighting on hover
- Clickable row to view product details
- Scrollable if many line items
- Mobile-friendly scrolling

**Quantity Tracking:**
- Ordered quantity display
- Received quantity display (if goods received)
- Pending quantity display (if partial receipt)
- Visual indicators for:
  - Fully received (checkmark, green)
  - Partially received (progress bar)
  - Not received (pending, yellow)
  - Overage (more received than ordered, warning icon)

#### 4. PO Totals Section

**Summary Display:**

Subtotal:
- Label: "Subtotal"
- Value: Sum of (Qty × Cost) for all lines
- Currency formatted

Tax Total:
- Label: "Tax Total"
- Value: Sum of all line taxes
- Currency formatted

Total Discount:
- Label: "Total Discount"
- Value: Sum of all line discounts
- Currency formatted
- Only shown if discounts applied

Grand Total:
- Label: "TOTAL PO AMOUNT"
- Large, prominent display (font 28+)
- Bold text
- High contrast background
- Currency formatted
- Color-coded (green = normal, red = overdue or cancelled)

#### 5. Delivery Information Section

**Expected Delivery:**
- Label: "Expected Delivery Date"
- Display date: "May 20, 2026"
- Countdown display (if not overdue): "3 days remaining"
- Overdue indicator (if past delivery date): "5 days overdue" (in red)

**Shipping Address:**
- Full address display (formatted)
- Address components:
  - Address Line 1
  - Address Line 2 (if applicable)
  - City, State/Province
  - Postal Code
  - Country
- "Edit Address" button (if PO in editable status)

**Delivery Instructions:**
- Label: "Delivery Instructions"
- Display instructions if present
- "No delivery instructions" if empty
- Collapsible section if long text

**Actual Receipt Date:**
- Only appears if goods received
- Display date: "May 15, 2026"
- Shows date goods were received
- Days between expected and actual (early/late indicator)

#### 6. Payment Terms Section

**Payment Terms Display:**
- Label: "Payment Terms"
- Display selected terms (e.g., "Net 30")
- Description of what terms mean (e.g., "Payment due within 30 days")

**Notes/Special Instructions:**
- Label: "Special Instructions"
- Display notes if present
- Read-only text area or plain text display
- "No special instructions" if empty
- Expandable if long text

**Edit Button:**
- Only appears if PO is in draft status
- Opens edit form for payment terms and notes
- "Edit PO Details" button

#### 7. Receive Goods Section

**Visible if PO Status is Confirmed:**

**Receive Goods Button:**
- Primary action button
- Text: "Receive Goods"
- Opens receive goods modal
- Disabled if already fully received
- Loading state during operation

**Goods Receipt Summary (if applicable):**
- Shows receipt status for each line item:
  - Ordered quantity
  - Received quantity (cumulative)
  - Pending quantity
  - Visual progress bars
  - Status indicators (checkmark = complete, warning = partial, X = not started)
- Summary totals:
  - Total ordered
  - Total received
  - Total pending

**Overages/Shortages:**
- Highlight if received > ordered
- Show overage quantity with warning icon
- Color-code (orange/yellow for issues)
- Helpful explanation tooltip

**View Receipt Details Link:**
- Only shows if goods received
- Opens receipt history page/modal
- Shows all receiving transactions
- Details: date, qty received, received by, notes

**Receive Goods Modal:**
- Opens when "Receive Goods" clicked
- Line items table with:
  - Product name (read-only)
  - Quantity ordered (read-only)
  - Quantity previously received (read-only)
  - Quantity to receive (input field)
  - Notes (optional text field)
- Buttons: "Record Receipt" (primary), "Cancel"
- Validation:
  - Quantity to receive > 0
  - Total received <= Total ordered (warning if over)
  - At least one line item has quantity

#### 8. Bill Creation Section

**Visible if Goods Received:**

**Create Bill Button:**
- Primary action button
- Text: "Create Bill from PO"
- Opens bill creation with PO details pre-filled
- Disabled if bill already created
- Confirmation: "This will create a bill with PO details"

**Related Bill Display (if bill exists):**
- Shows: "Bill created" with link
- Bill number and date
- Link to bill detail page
- Bill status badge

**Bill Status Display:**
- Shows current bill status if created
- Possible statuses: Draft, Submitted, Approved, Paid
- Color-coded status badge

#### 9. Actions Section

**Edit PO Button:**
- Only appears if status is Draft
- Opens edit form
- Can modify: delivery date, payment terms, notes
- Cannot modify: vendor, line items (require cancellation/recreation)

**Send PO Button:**
- Only appears if status is Draft or not yet sent
- Sends PO to vendor via email
- Confirmation dialog: "Send this PO to [vendor email]?"
- Success message with sent date/time

**Cancel PO Button:**
- Only appears if status is not Received or Invoiced
- Shows confirmation dialog
- Asks for cancellation reason
- Notifies vendor of cancellation
- Cannot be undone
- Changes status to Cancelled

**Print PO Button:**
- Opens print dialog
- Generates printer-friendly PDF view
- Includes all PO details, line items, totals
- Can print to physical printer or save as PDF

**Email PO Button:**
- Opens email compose modal
- Pre-fills recipient (vendor email)
- Pre-fills subject: "Purchase Order PO-XXXX"
- Pre-fills body with PO details
- Can customize email before sending
- Logs email in audit trail

**Export PO Button:**
- Dropdown menu with options:
  - Export as PDF (downloads PDF file)
  - Export as CSV (downloads line items as CSV)
  - Export as Excel (downloads formatted Excel file)
- Each format includes all PO details

**More Actions Menu (Three-Dot):**
- Dropdown containing less common actions
- Options may include:
  - Duplicate PO (create new from this one)
  - View related documents
  - Download attachments

#### 10. Audit Trail Section

**Collapsible Audit Trail Panel:**
- Header: "Activity Log" or "Audit Trail"
- Click to expand/collapse
- Shows complete history of changes

**Audit Trail Entries:**

For each entry display:
- Timestamp (e.g., "May 20, 2026 at 2:30 PM")
- Action type (Created, Sent, Confirmed, Received, etc.)
- User who performed action (name, email)
- Additional details specific to action:
  - For "Sent": recipient email, date sent
  - For "Received": qty received, date received, receiver name
  - For "Cancelled": cancellation reason
- Chronological order (newest first or oldest first)

**Entries Include:**
- PO creation entry
- All status changes
- Each goods receipt event
- Bill creation (if applicable)
- Any edits to PO details
- Send/email events

#### 11. Timeline Section

**Visual Timeline Display:**

Shows PO progression chronologically:
- Created (date and time)
- Sent (date and time, if applicable, with "→")
- Confirmed (date and time, if applicable, with "→")
- Received (date and time, if applicable, with "→")
- Invoiced (date and time, if applicable)

Visual representation:
- Vertical or horizontal line connecting events
- Circles/nodes at each event
- Filled circle = completed, Hollow = not started
- Event labels below/beside nodes
- Timeline color gradient (optional)

#### 12. Related Documents Section

**Links to Associated Records:**

**Related Receipts:**
- If goods received: "View Receipts (3)" link
- Shows count of receipt records
- Opens receipt history
- Shows each receipt date and qty

**Related Bills:**
- If bill created: "View Related Bill" link
- Shows bill number
- Shows bill date
- Shows bill status
- Opens bill detail page

**Related Invoices:**
- If invoice created: "View Related Invoice" link
- Shows invoice number
- Shows invoice date
- Opens invoice detail page

#### 13. Permission-Based Display

**Actions Visible Based on Role:**
- Procurement managers: All actions
- Procurement staff: Most actions (except cancel/delete)
- Accountants: View only
- Vendors: View own POs (limited info)

#### 14. State Displays

**Loading State:**
- Skeleton loader showing all sections
- Animated loading indicators
- "Loading PO details..." message

**Error State:**
- Error message box at top
- Error details (if applicable)
- Retry button
- Support contact information
- "Failed to load PO: [error message]"

**Not Found State:**
- "Purchase Order not found"
- Possible reasons: Deleted, no access, invalid ID
- Link back to PO list

---

## Backend API Requirements

### Primary Endpoints

#### GET /api/procurement/purchase-orders/{id}/
**Retrieve full PO details**

Response:
```
{
  "id": 1,
  "po_number": "PO-2026-00001",
  "tenant_id": 1,
  "vendor_id": 5,
  "vendor_name": "Supplier Corp",
  "vendor_email": "john@supplier.com",
  "vendor_contact": "John Doe",
  "vendor_phone": "555-1234",
  "vendor_default_address": {
    "address_line1": "456 Oak Ave",
    "city": "Boston",
    "state": "MA",
    "postal_code": "02101",
    "country": "USA"
  },
  "po_date": "2026-05-20",
  "expected_delivery_date": "2026-06-20",
  "amount": 2775.00,
  "status": "confirmed",
  "shipping_address": {...},
  "payment_terms": "Net 30",
  "notes": "Special handling required",
  "created_at": "2026-05-20T10:30:00Z",
  "updated_at": "2026-05-20T10:30:00Z",
  "created_by": "user@company.com",
  "sent_date": "2026-05-20T11:00:00Z",
  "confirmed_date": "2026-05-21T09:30:00Z",
  "received_date": null,
  "line_items": [
    {
      "id": 1,
      "product_id": 123,
      "product_name": "Widget A",
      "sku": "WID-A-001",
      "quantity": 100,
      "unit_cost": 25.50,
      "discount": 5.00,
      "tax": 150.00,
      "line_total": 2745.00
    },
    ...
  ]
}
```

#### GET /api/procurement/purchase-orders/{id}/line-items/
**Get line items with receive tracking**

Response:
```
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "product_id": 123,
      "product_name": "Widget A",
      "quantity_ordered": 100,
      "quantity_received": 75,
      "quantity_pending": 25,
      "receipt_status": "partial",
      "receipts": [
        {
          "date": "2026-05-25",
          "quantity": 50
        },
        {
          "date": "2026-05-27",
          "quantity": 25
        }
      ]
    },
    ...
  ]
}
```

#### PATCH /api/procurement/purchase-orders/{id}/
**Update PO (if draft status)**

Request Body:
```
{
  "expected_delivery_date": "2026-06-25",
  "payment_terms": "Net 45",
  "notes": "Updated instructions"
}
```

Response: Updated PO object

#### POST /api/procurement/purchase-orders/{id}/send/
**Send PO to vendor**

Request Body:
```
{
  "recipient_email": "john@supplier.com",
  "subject": "Purchase Order PO-2026-00001",
  "message": "Optional custom message"
}
```

Response:
```
{
  "success": true,
  "message": "PO sent successfully",
  "sent_date": "2026-05-20T11:00:00Z",
  "sent_to": "john@supplier.com"
}
```

#### POST /api/procurement/purchase-orders/{id}/cancel/
**Cancel PO**

Request Body:
```
{
  "reason": "No longer needed",
  "notify_vendor": true
}
```

Response: Updated PO with cancelled status

#### GET /api/procurement/purchase-orders/{id}/receive-status/
**Get receive tracking information**

Response:
```
{
  "po_id": 1,
  "status": "partial",
  "total_ordered": 150,
  "total_received": 75,
  "total_pending": 75,
  "receipt_percentage": 50,
  "has_overages": false,
  "line_item_statuses": [
    {
      "po_item_id": 1,
      "ordered": 100,
      "received": 75,
      "pending": 25,
      "status": "partial"
    }
  ]
}
```

#### POST /api/procurement/purchase-orders/{id}/receive-goods/
**Record goods receipt**

Request Body:
```
{
  "receipt_date": "2026-05-25",
  "line_items": [
    {
      "po_item_id": 1,
      "quantity_received": 50,
      "notes": "Partial shipment"
    }
  ],
  "received_by": "warehouse_user@company.com",
  "receipt_notes": "Received at receiving dock"
}
```

Response: Updated PO with receipt info

#### GET /api/procurement/purchase-orders/{id}/audit-trail/
**Get status change and activity history**

Response:
```
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "timestamp": "2026-05-20T10:30:00Z",
      "action": "created",
      "user": "user@company.com",
      "details": "PO created"
    },
    {
      "id": 2,
      "timestamp": "2026-05-20T11:00:00Z",
      "action": "sent",
      "user": "user@company.com",
      "details": "PO sent to john@supplier.com"
    },
    {
      "id": 3,
      "timestamp": "2026-05-21T09:30:00Z",
      "action": "status_changed",
      "user": "vendor@supplier.com",
      "status_from": "sent",
      "status_to": "confirmed",
      "details": "Vendor confirmed order"
    }
  ]
}
```

#### GET /api/procurement/purchase-orders/{id}/related-documents/
**Get related bills, invoices, receipts**

Response:
```
{
  "receipts": [
    {
      "id": 1,
      "receipt_number": "GR-001",
      "date": "2026-05-25",
      "quantity": 50
    }
  ],
  "bills": [
    {
      "id": 1,
      "bill_number": "BILL-001",
      "date": "2026-05-25",
      "amount": 1375.00,
      "status": "draft"
    }
  ],
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-001",
      "date": "2026-05-25",
      "amount": 1375.00,
      "status": "submitted"
    }
  ]
}
```

#### POST /api/procurement/purchase-orders/{id}/create-bill/
**Create bill from PO**

Request Body:
```
{
  "create_for_partial": false
}
```

Response:
```
{
  "success": true,
  "bill_id": 1,
  "bill_number": "BILL-001",
  "message": "Bill created successfully"
}
```

#### GET /api/procurement/purchase-orders/{id}/export-pdf/
**Export PO as PDF**

Response: PDF file (binary)

---

## Database Requirements

### PurchaseOrder Model

All fields from list/creation features, plus:
- `received_date` (DateTime, nullable): Date goods fully received
- `cancelled_date` (DateTime, nullable): Date PO cancelled
- `cancelled_reason` (Text, nullable): Reason for cancellation

### GoodsReceipt Model

New model for tracking goods receipts:

Fields:
- `id`: Primary key
- `po_id`: Foreign key to PurchaseOrder
- `receipt_date`: Date of receipt
- `quantity_total`: Total items received in this receipt
- `received_by`: User who received goods
- `notes`: Receipt notes
- `created_at`: Timestamp
- `updated_at`: Timestamp

### GoodsReceiptItem Model

New model for line-level receipt tracking:

Fields:
- `id`: Primary key
- `receipt_id`: Foreign key to GoodsReceipt
- `po_item_id`: Foreign key to PurchaseOrderItem
- `quantity_received`: Quantity received for this item
- `notes`: Item-specific notes
- `created_at`: Timestamp

### PurchaseOrderAuditTrail Model

New model for audit logging:

Fields:
- `id`: Primary key
- `po_id`: Foreign key to PurchaseOrder
- `action`: Type of action (created, sent, status_changed, received, etc.)
- `status_from` (nullable): Previous status
- `status_to` (nullable): New status
- `changed_by`: User who made change (or system)
- `change_timestamp`: When change occurred
- `details`: Action details (JSON)
- `created_at`: Timestamp

### Indexes

- `(po_id)`: Detail page queries
- `(po_id, created_at)`: Audit trail queries
- `(po_id, receipt_date)`: Receipt history
- `(status)`: Status-based queries
- `(expected_delivery_date)`: Overdue tracking
- `(received_date)`: Receipt tracking

---

## Validation & Edge Cases

### Data Validation

**Null/Missing Fields:**
- Handle missing delivery date gracefully
- Handle missing shipping address
- Handle missing payment terms
- Display "Not specified" for optional missing fields

**PO Status:**
- Validate status matches expected state
- Ensure status transitions are logical
- Cannot transition backwards

**Dates:**
- Timezone consistency
- Format dates consistently
- Display relative dates (e.g., "3 days away")

**Quantities:**
- Received quantity cannot exceed ordered quantity (warning if exceeds)
- Display pending/received accurately
- Show overage if received > ordered

**Permissions:**
- Check user role for action availability
- Prevent unauthorized updates
- Log unauthorized access attempts
- Tenant isolation

### Edge Cases

**Cancelled PO:**
- Display cancelled status prominently
- Show cancellation reason
- Disable all action buttons
- Show cancellation timestamp

**Fully Received PO:**
- Receive button becomes disabled
- Show "Fully Received" status
- Show receipt details
- Enable bill creation

**Partially Received PO:**
- Show progress bar (received vs pending)
- Allow more goods to be received
- Show overage if applicable
- Enable bill creation for received portion

**Overdue PO:**
- Highlight delivery date in red
- Show "X days overdue"
- Visual indicator (warning icon)
- Alert user to take action

**Concurrent Updates:**
- Handle race conditions on status updates
- Use optimistic/pessimistic locking
- Show refresh message if data changed
- Reload on stale data

**Missing Related Documents:**
- Handle no receipts gracefully
- Handle no bills created
- Hide sections if no related docs
- Show "No receipts recorded" vs empty

**Large Line Item Counts:**
- Virtualized table for performance
- Pagination or scrolling
- Maintains performance with 1000+ items

**Special Characters:**
- Handle vendor names with special chars
- Handle addresses with special chars
- Handle notes with newlines/formatting
- Proper escaping for security

---

## Testing Checklist

### Display & Rendering

- [ ] Page header displays PO number correctly
- [ ] Status badge shows correct status
- [ ] Status timeline shows correct progression
- [ ] PO dates display correctly
- [ ] Vendor information displays accurately
- [ ] Line items table renders all columns
- [ ] Line item quantities display correctly
- [ ] Pricing displays correctly (cost, discount, tax)
- [ ] Line totals calculate correctly
- [ ] Subtotal displays correct value
- [ ] Tax total displays correct value
- [ ] Grand total displays correct value
- [ ] Delivery address displays completely
- [ ] Delivery instructions display (if present)
- [ ] Payment terms display correctly
- [ ] Special notes display correctly

### Conditional Display

- [ ] Receive goods section appears (if confirmed)
- [ ] Receive goods section hidden (if not confirmed)
- [ ] Bill creation button appears (if received)
- [ ] Bill creation button hidden (if not received)
- [ ] Edit button appears (if draft)
- [ ] Edit button hidden (if not draft)
- [ ] Send button appears (if not sent)
- [ ] Send button hidden (if sent)
- [ ] Cancel button appears (if not received/invoiced)
- [ ] Cancel button hidden (if received/invoiced)
- [ ] Audit trail appears and displays history
- [ ] Timeline shows correct progression
- [ ] Related documents display (if any)

### Functionality

- [ ] View vendor profile link works
- [ ] Contact vendor button opens email
- [ ] Product links navigate to product details
- [ ] Edit button opens edit form (if editable)
- [ ] Send button opens confirm dialog
- [ ] Cancel button shows reason prompt
- [ ] Receive goods button opens modal
- [ ] Create bill button works
- [ ] View bill link opens bill details
- [ ] Print button generates PDF
- [ ] Export button generates file
- [ ] Email button opens compose
- [ ] More actions menu displays options
- [ ] Back button returns to list
- [ ] Refresh button reloads data

### Receive Goods Workflow

- [ ] Receive modal displays line items
- [ ] Quantity field accepts input
- [ ] Quantity validation works
- [ ] Can specify partial quantities
- [ ] Overage warning appears if qty > ordered
- [ ] Record receipt saves data
- [ ] Receipt updates line item status
- [ ] Quantity tracking updates (ordered/received/pending)
- [ ] Receive button becomes disabled (if fully received)

### Quantity Tracking

- [ ] Shows ordered quantity
- [ ] Shows received quantity (if received)
- [ ] Shows pending quantity (if partial)
- [ ] Progress bar displays correctly
- [ ] Status indicators show correct state
- [ ] Overage highlighted with warning
- [ ] Shortages highlighted if applicable

### Audit Trail

- [ ] Shows all status changes
- [ ] Shows who made each change
- [ ] Shows timestamps
- [ ] Shows action details
- [ ] Chronological order correct
- [ ] Collapse/expand works

### Timeline

- [ ] Shows created date/time
- [ ] Shows sent date/time (if applicable)
- [ ] Shows confirmed date/time (if applicable)
- [ ] Shows received date/time (if applicable)
- [ ] Shows invoiced date/time (if applicable)
- [ ] Visual progression correct
- [ ] Completed steps highlighted

### Responsive Design

- [ ] Mobile layout (< 768px)
- [ ] Tablet layout (768px-1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Table scrolls horizontally on mobile
- [ ] Buttons accessible on all sizes
- [ ] Content readable on all sizes
- [ ] Sections stack appropriately

### Error Handling

- [ ] Handles API errors gracefully
- [ ] Displays error messages clearly
- [ ] Provides retry option
- [ ] Handles missing PO (404)
- [ ] Handles permission denied (403)
- [ ] Handles server errors (500)
- [ ] Handles network timeout

### Accessibility

- [ ] ARIA labels on buttons
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Screen reader announces content

---

## Implementation Checklist

### Frontend Components

- [ ] PO detail page main component
- [ ] PO header component (number, status, dates)
- [ ] Status badge component
- [ ] Status timeline component
- [ ] Vendor information component
- [ ] Contact vendor button component
- [ ] Line items table component
- [ ] Line item row component
- [ ] Quantity tracking component (ordered/received/pending)
- [ ] Receipt progress bar component
- [ ] PO totals component (subtotal, tax, discount, total)
- [ ] Delivery information component
- [ ] Payment terms component
- [ ] Receive goods modal component
- [ ] Receipt form component
- [ ] Bill creation component
- [ ] Actions menu component
- [ ] Audit trail component
- [ ] Timeline component
- [ ] Related documents component
- [ ] Loading state component
- [ ] Error state component
- [ ] Not found state component

### Services/Utilities

- [ ] PO detail API service
- [ ] Receive goods service
- [ ] Bill creation service
- [ ] Export service (PDF)
- [ ] Email service (compose)
- [ ] Permission checking service
- [ ] Date formatting utilities
- [ ] Currency formatting utilities
- [ ] Status badge color mapping
- [ ] Quantity status calculation

### State Management

- [ ] PO detail state
- [ ] Loading state
- [ ] Error state
- [ ] Receipt state (during receive workflow)
- [ ] Selected line items state (for partial receipt)
- [ ] Audit trail state
- [ ] Permission state

### Backend Implementation

- [ ] GET /api/procurement/purchase-orders/{id}/ endpoint
- [ ] GET /api/procurement/purchase-orders/{id}/line-items/ endpoint
- [ ] GET /api/procurement/purchase-orders/{id}/receive-status/ endpoint
- [ ] GET /api/procurement/purchase-orders/{id}/audit-trail/ endpoint
- [ ] GET /api/procurement/purchase-orders/{id}/related-documents/ endpoint
- [ ] PATCH /api/procurement/purchase-orders/{id}/ endpoint
- [ ] POST /api/procurement/purchase-orders/{id}/send/ endpoint
- [ ] POST /api/procurement/purchase-orders/{id}/cancel/ endpoint
- [ ] POST /api/procurement/purchase-orders/{id}/receive-goods/ endpoint
- [ ] POST /api/procurement/purchase-orders/{id}/create-bill/ endpoint
- [ ] GET /api/procurement/purchase-orders/{id}/export-pdf/ endpoint
- [ ] Query optimization
- [ ] Permission validation
- [ ] Error handling

### Database

- [ ] GoodsReceipt table schema
- [ ] GoodsReceiptItem table schema
- [ ] PurchaseOrderAuditTrail table schema
- [ ] Add indexes for performance
- [ ] Add foreign key constraints
- [ ] Add timestamps
- [ ] Tenant isolation verification

### Services/Business Logic

- [ ] Goods receipt processing
- [ ] Bill creation from PO
- [ ] Email composition service
- [ ] PDF generation service
- [ ] Permission checking
- [ ] Audit logging
- [ ] Status transition validation

### Testing

- [ ] Unit tests for components
- [ ] Unit tests for utilities
- [ ] Integration tests for API calls
- [ ] E2E tests for workflows
- [ ] Permission tests
- [ ] Edge case tests
- [ ] Performance tests

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review:** Peer review all changes
2. **Automated Testing:** All tests pass
3. **Manual Testing:** Complete workflow testing
4. **Performance Testing:** Load test detail page with large datasets
5. **Database Backup:** Full backup before migration
6. **Rollback Plan:** Previous detail page available

### Deployment Steps

1. **Database Migration:**
   - Create GoodsReceipt table
   - Create GoodsReceiptItem table
   - Create PurchaseOrderAuditTrail table
   - Add indexes
   - Migrate existing PO data to audit trail

2. **API Deployment:**
   - Deploy detail endpoint
   - Deploy line items endpoint
   - Deploy receive goods endpoint
   - Deploy audit trail endpoint
   - Deploy related documents endpoint
   - Deploy bill creation endpoint
   - Deploy PDF export endpoint
   - Verify all endpoints responding

3. **Services:**
   - Configure email service
   - Configure PDF generation
   - Test email delivery
   - Test PDF generation

4. **Frontend Deployment:**
   - Deploy detail page components
   - Deploy modal components
   - Clear browser cache
   - Verify page loads

5. **Feature Toggle:**
   - Use feature flag for detail page
   - Gradual rollout (10% → 50% → 100%)
   - Can disable if issues

6. **Staff Training:**
   - Show PO detail page layout
   - Demonstrate receive goods workflow
   - Show bill creation process
   - Explain audit trail
   - Email/print/export capabilities

7. **Monitoring:**
   - Set up alerting on API latency
   - Monitor error rates
   - Track feature usage
   - Monitor PDF generation

### Rollback Plan

- Maintain previous detail page
- Feature flag to disable new detail page
- Database rollback (if needed)
- Rollback timeline: < 30 minutes

---

## Performance Targets

### Response Times

| Operation | Target | Notes |
|-----------|--------|-------|
| Load PO details | < 500ms | Cold cache |
| Load line items | < 300ms | With detail page |
| Load audit trail | < 300ms | Full history |
| Receive goods | < 1s | Save to database |
| Create bill | < 1s | Bill generation |
| PDF export | < 3s | PDF generation |
| Page render | < 300ms | DOM rendering |

### Resource Usage

- Detail page component: < 10MB memory
- API payload: < 200KB
- PDF file: < 2MB
- No memory leaks on page navigation

---

## Monitoring & Alerting

### Metrics to Track

1. **Page Performance:**
   - Page load time
   - API response time
   - PDF generation time

2. **Receipt Operations:**
   - Goods receipts created per day
   - Average receipt quantity
   - Receipt errors

3. **Bill Creation:**
   - Bills created from POs per day
   - Success rate

4. **User Actions:**
   - Most used actions
   - PO send frequency
   - PO cancel frequency

5. **Document Views:**
   - Most viewed POs
   - Export frequency
   - Print frequency

### Alerts

- **Critical:** Detail page load > 2s
- **Critical:** Receipt operation failures > 1%
- **Warning:** Detail page load > 1s
- **Warning:** PDF export > 5s
- **Warning:** Bill creation failures
- **Info:** High PO cancellation rate

---

## Documentation Requirements

### For End Users

1. **PO Detail Page Guide**
   - Overview of all sections
   - Understanding status timeline
   - Location of key information

2. **Receive Goods Guide**
   - Step-by-step receive process
   - How to record partial receipts
   - Handling overages/shortages

3. **Bill Creation Guide**
   - How to create bill from PO
   - When bill creation is available
   - Bill linking to PO

4. **Status Workflow Guide**
   - PO status progression
   - What each status means
   - Status transition rules

5. **Export/Print Guide**
   - How to export PO
   - Export format options
   - Print options

6. **Audit Trail Guide**
   - Understanding activity log
   - Who changed what/when
   - Tracking PO progression

### For Developers

1. **API Documentation**
   - Endpoint specifications
   - Request/response formats
   - Error handling

2. **Component Documentation**
   - Component interfaces
   - Props and state
   - Usage examples

3. **Workflow Documentation**
   - Receive goods workflow
   - Bill creation flow
   - State transitions

---

## Future Enhancements

### Phase 2 Features

1. **Multi-Step Delivery Tracking**
   - Track shipment/tracking number
   - Receive goods at multiple locations
   - Detailed delivery tracking per line item

2. **Quality Inspection Workflow**
   - QC approval required on receipt
   - Mark items as defective
   - Create return to vendor

3. **Return to Vendor Option**
   - Create return authorization
   - Track returned goods
   - Update PO status for returns

4. **PO Amendment Workflow**
   - Modify PO after sent
   - Track amendments
   - Vendor approval of amendments

### Phase 3 Features

1. **Receipt Photo Upload**
   - Attach photos to receipts
   - Photo storage and retrieval
   - Photo gallery view

2. **Advanced Analytics**
   - On-time delivery rate per vendor
   - Average delivery time
   - Vendor performance scoring
   - Delivery variance analysis

3. **Integration with Inventory**
   - Auto-update inventory on receipt
   - Track inventory by PO
   - Inventory reconciliation

4. **Notification System**
   - Notify when approaching delivery date
   - Notify on delay
   - Notify on receipt
   - Custom notification rules

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Ready for Development
