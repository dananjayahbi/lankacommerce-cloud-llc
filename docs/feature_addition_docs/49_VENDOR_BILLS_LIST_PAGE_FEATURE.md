# Feature 49: Vendor Bills List Page

## Executive Summary

The Vendor Bills List Page provides a comprehensive management interface for viewing all supplier billing documents within the LankaCommerce Cloud platform. This page enables accounting staff to efficiently manage vendor payables through an advanced filtering, search, and payment status tracking system. The interface supports comprehensive workflow management including payment recording, export functionality, and bulk operations for streamlined accounting operations.

---

## Current State Assessment

### Existing Implementation Status

- **Basic bill list page**: Partially implemented with core table structure
- **Search functionality**: Bill number search working; PO and vendor name search incomplete
- **Filtering**: Status filter implemented; date range, vendor, and amount filters only partially functional
- **Sorting**: Partially implemented; not all columns sortable
- **Pagination**: Working with basic page navigation
- **Bulk operations**: Framework exists but incomplete; mark as paid and payment recording not functional
- **Export functionality**: Missing (CSV, Excel, PDF export not available)
- **Vendor filtering**: Incomplete; needs full vendor list population
- **Date range filtering**: Partially implemented with validation gaps
- **Overdue indicator**: Missing visual indicators for overdue bills
- **Payment recording**: Incomplete workflow integration
- **Responsive design**: Basic responsive layout exists; mobile optimization needed

### Known Gaps

- Debounced search not implemented
- Bulk export service not integrated
- Performance optimization for large datasets needed
- Permission-based UI visibility not enforced
- Timezone handling for date comparisons incomplete
- Soft delete handling for cancelled bills not visible

---

## Detailed Requirements

### Frontend Features

#### Bills Data Table (Responsive, Sortable, Filterable)

**Column Headers:**
- Bill # (Bill number)
- PO # (Purchase Order reference)
- Vendor (Vendor name)
- Date (Bill date)
- Amount (Bill amount in tenant currency)
- Status (Current status with visual badge)
- Due date (Payment due date)

**Table Behaviors:**
- Click column headers to sort ascending/descending
- Row selection checkboxes for bulk operations
- Click row to navigate to bill details page
- Status badges with color-coding by status (draft: gray, submitted: blue, paid: green, partially paid: orange, overdue: red)
- Overdue indicator displays above bill amount if due date has passed
- Amount displayed in tenant currency with proper formatting
- Hover effects showing additional row actions
- Striped rows for better readability

#### Search Functionality (Multi-field)

**Search Capabilities:**
- Search by bill number (exact or partial match)
- Search by PO number (cross-references related POs)
- Search by vendor name (partial name matching)
- Debounced real-time search with 300ms delay
- Search indicator showing results count
- Clear search button to reset search query
- Search applies across filtered results

#### Filter Section (Collapsible)

**Filter Options:**
- **Status Filter**: Dropdown/multi-select for (draft, submitted, paid, partially paid, overdue)
- **Date Range Filter**: From/to date pickers with calendar UI
- **Vendor Filter**: Dropdown or multi-select populated from vendor list
- **Amount Range Filter**: Optional min/max currency inputs
- **Overdue Filter**: Yes/No toggle for overdue bills
- **Filter count badge**: Shows number of active filters
- **Clear all filters button**: Resets all filters to default
- **Filter persistence**: Maintains filters during session
- **AND logic combination**: Filters apply combinatorially

#### Sort Options

- **Sort by**: Bill #, Vendor, Date, Amount, Status, Due date
- **Sort direction**: Ascending/Descending toggle
- **Default sort**: By date descending (newest bills first)
- **Multi-column sort**: Supports secondary sort criteria

#### Pagination Controls

- **Page size selector**: 10, 25, 50, 100 rows per page
- **Previous/Next buttons**: Navigate between pages
- **Page number input**: Jump directly to specific page
- **Total records count**: Display "Showing X of Y records"
- **Disabled state**: Previous button disabled on first page, Next disabled on last page

#### Bulk Action Toolbar (Appears When Rows Selected)

**Available Actions:**
- **Bulk mark as paid button**: Marks selected bills as fully paid with confirmation dialog
- **Bulk record payment button**: Opens payment modal for selected bills
- **Bulk export button**: Exports selected bills to CSV
- **Bulk print button**: Generates print layout for selected bills
- **Selection counter**: Shows "X bills selected"
- **Select all checkbox**: Toggles selection of all visible bills

#### Row-Level Actions

- **View bill details link/button**: Navigate to detail page
- **Edit bill button**: Opens edit form (only if draft status)
- **Record payment button**: Primary action button, opens payment modal
- **Create refund button**: For overpaid bills or refund scenarios
- **Print bill button**: Generates printer-friendly bill view
- **Export bill button**: Single bill export to PDF

#### Additional UI Elements

- **Create new bill button**: Prominent CTA button, navigates to bill creation page
- **Export bills list button**: Export entire list (CSV, Excel, PDF formats)
- **Vendor contact quick link**: Shows vendor details on hover
- **Due date countdown display**: Shows "Due in X days" or "Overdue X days"
- **Refresh button**: Reloads bill list from server
- **Loading state**: Skeleton loaders for table rows during data fetch
- **Empty state**: Custom message when no bills match filters ("No bills found")
- **Error state**: Error message display if API request fails with retry button

---

### Backend API Requirements

#### Core List Endpoint

**Endpoint:** `GET /api/accounting/vendor-bills/`

**Query Parameters:**
- `search` (string): Multi-field search query
- `status` (string, comma-separated): Filter by status
- `vendor_id` (integer): Filter by vendor
- `date_from` (date): Filter bills from date (YYYY-MM-DD)
- `date_to` (date): Filter bills to date (YYYY-MM-DD)
- `page` (integer): Page number (1-indexed)
- `page_size` (integer): Records per page (10, 25, 50, 100)
- `ordering` (string): Sort field with direction (+field or -field)

**Response Structure:**
```
{
  "count": 150,
  "next": "http://api/accounting/vendor-bills/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "bill_number": "VB-001",
      "po_number": "PO-2024-001",
      "vendor_name": "Acme Supplies",
      "bill_date": "2026-05-15",
      "amount": 5000.00,
      "status": "paid",
      "due_date": "2026-06-15",
      "is_overdue": false,
      "paid_amount": 5000.00
    }
  ]
}
```

#### Detail Endpoint

**Endpoint:** `GET /api/accounting/vendor-bills/{id}/`

**Response:** Full bill object with all details, line items, payments

#### Delete Endpoint

**Endpoint:** `DELETE /api/accounting/vendor-bills/{id}/`

**Conditions:** Only allowed if bill status is draft
**Response:** 204 No Content

#### Status Update Endpoint

**Endpoint:** `PATCH /api/accounting/vendor-bills/{id}/`

**Request Body:**
```
{
  "status": "submitted"
}
```

#### Payment Recording Endpoint

**Endpoint:** `POST /api/accounting/vendor-bills/{id}/record-payment/`

**Request Body:**
```
{
  "amount": 1000.00,
  "payment_date": "2026-05-30",
  "payment_method": "bank_transfer",
  "reference": "CHQ-12345"
}
```

#### Refund Creation Endpoint

**Endpoint:** `POST /api/accounting/vendor-bills/{id}/create-refund/`

**Request Body:**
```
{
  "amount": 500.00,
  "reason": "Overpayment correction",
  "reference": "REF-001"
}
```

#### Bulk Export Endpoint

**Endpoint:** `POST /api/accounting/vendor-bills/bulk-export/`

**Request Body:**
```
{
  "bill_ids": [1, 2, 3],
  "format": "csv"
}
```

**Response:** File download (CSV, Excel, or PDF)

#### Vendor List Endpoint

**Endpoint:** `GET /api/accounting/vendors/`

**Query Parameters:**
- `search` (string): Filter vendors by name

**Response:**
```
{
  "results": [
    {"id": 1, "name": "Acme Supplies"},
    {"id": 2, "name": "Global Parts Co."}
  ]
}
```

#### Payment Methods Endpoint

**Endpoint:** `GET /api/accounting/payment-methods/`

**Response:** List of available payment methods

---

### Database Requirements

#### VendorBill Model

**Fields:**
- `id` (Primary Key): Unique identifier
- `tenant_id` (Foreign Key): Multi-tenant context
- `bill_number` (String, Unique per tenant): Unique bill identifier
- `po_id` (Foreign Key, Nullable): Link to Purchase Order
- `vendor_id` (Foreign Key): Link to Vendor
- `bill_date` (Date): Date bill was issued
- `due_date` (Date): Payment due date
- `amount` (Decimal): Total bill amount
- `status` (Enum): draft, submitted, paid, partially_paid, overdue
- `paid_amount` (Decimal): Amount paid so far
- `notes` (Text, Nullable): Additional notes
- `created_at` (DateTime): Creation timestamp
- `updated_at` (DateTime): Last update timestamp
- `deleted_at` (DateTime, Nullable): Soft delete timestamp
- `submitted_date` (DateTime, Nullable): Date bill was submitted

**Indexes:**
- Composite index: (tenant_id, status)
- Composite index: (tenant_id, bill_date)
- Composite index: (tenant_id, vendor_id)
- Single index: (due_date)
- Single index: (status)
- Single index: (po_id)
- Composite index: (tenant_id, deleted_at)

---

## Validation & Edge Cases

### Data Validation Rules

- Bill with no line items: Should prevent creation and display validation error
- Partial payments: System supports multiple payments per bill, each tracked separately
- Overpayments: System allows paid_amount to exceed bill amount, triggers refund workflow
- Cancelled bills: Display with "cancelled" status, exclude from payment workflow by default
- Fully paid bills: Automatically transition to "paid" status when paid_amount equals bill amount
- Overdue bills: Due date passed without full payment, display overdue indicator
- Multiple bills from same vendor: System supports and displays all bills grouped
- Large dataset pagination: System tested with 1000+ bills, maintains performance
- Concurrent bill payments: Database locking prevents race conditions
- Permission validation: API enforces accounting role for all operations
- Soft delete handling: Soft-deleted bills excluded from list by default
- Timezone handling: All dates stored in UTC, converted to user timezone on display
- Refund interactions: Refunds reduce paid_amount, may transition bill back to partially_paid status

---

## Testing Checklist

### Functional Testing

- [ ] Table renders all seven columns correctly with proper headers
- [ ] Search by bill number finds matching bills (exact and partial matches)
- [ ] Search by PO number finds bills linked to POs
- [ ] Search by vendor name finds bills from matching vendors
- [ ] Debounced search prevents excessive API calls during typing
- [ ] Status filter shows all five status options
- [ ] Date range filter validates correctly (from ≤ to)
- [ ] Vendor filter populated with vendors from system
- [ ] Amount range filter correctly filters by min/max
- [ ] Overdue filter shows only bills with due_date < today
- [ ] Multiple filters combine correctly with AND logic
- [ ] Clear filters button resets all filters to default state
- [ ] Sorting by each column works ascending/descending correctly
- [ ] Pagination displays correct page of results
- [ ] Page size selector changes rows per page correctly
- [ ] Total count display accurate
- [ ] Bulk select checkbox toggles all rows on page
- [ ] Select all across pages works (if implemented)
- [ ] Bulk mark as paid marks selected bills as paid status
- [ ] Bulk record payment opens payment modal for all
- [ ] Bulk export generates CSV file with correct data
- [ ] Bulk print generates printable output
- [ ] Create bill button navigates to bill creation page
- [ ] Edit bill button opens form for draft bills only
- [ ] View details link navigates to detail page
- [ ] Record payment button opens payment modal
- [ ] Create refund button appears for overpaid bills
- [ ] Due date countdown displays "Due in X days" or "Overdue X days"
- [ ] Overdue bills highlighted with red status badge
- [ ] Paid amount displays correctly for partially paid bills
- [ ] Empty state displays with helpful message
- [ ] Error state displays error message with retry button
- [ ] Loading state shows skeleton loaders correctly
- [ ] Responsive design works on mobile (320px width)
- [ ] Responsive design works on tablet (768px width)

### Performance Testing

- [ ] Bill list loads in <500ms for page_size=25
- [ ] Search query completes in <200ms with debounce
- [ ] Bulk operations complete in <2s per 100 records
- [ ] Table rendering completes in <300ms
- [ ] Export generation completes in <5s for 5000 records
- [ ] API handles 5000+ records without timeout
- [ ] Database queries use indexes effectively

### Edge Case Testing

- [ ] Bills with null/missing PO reference display correctly
- [ ] Bills with cancelled status display (if applicable)
- [ ] Fully paid bills display correctly with paid status
- [ ] Partially paid bills show payment progress
- [ ] Overpaid bills show overpayment amount
- [ ] Multiple payments per bill display correctly
- [ ] Concurrent updates don't cause display conflicts
- [ ] Soft-deleted bills don't appear in list
- [ ] Permission-denied state displays appropriate message

---

## Implementation Checklist

### Frontend Components

- [ ] Bills data table component with sortable columns
- [ ] Search input component with debounce timer
- [ ] Filter section component (status, date, vendor, amount, overdue)
- [ ] Sort selector component with direction toggle
- [ ] Pagination component with page controls
- [ ] Bulk action toolbar component
- [ ] Row selection checkbox component
- [ ] Status badge component with color-coding
- [ ] Overdue indicator component
- [ ] Empty state component with message
- [ ] Error state component with retry action
- [ ] Loading skeleton component for table

### Backend Implementation

- [ ] Bill list API endpoint with all query parameters
- [ ] Search functionality across bill number, PO, vendor
- [ ] Status filter implementation
- [ ] Date range filter with validation
- [ ] Vendor filter implementation
- [ ] Amount range filter (optional)
- [ ] Sorting implementation for all columns
- [ ] Pagination with cursor or offset
- [ ] Query optimization with indexes
- [ ] Permission checks (accounting role)
- [ ] Soft delete handling in queries
- [ ] Bulk operations handler
- [ ] Export service (CSV, Excel, PDF)

### State Management

- [ ] Filter state management (Redux/Context)
- [ ] Search query state
- [ ] Sort state (field, direction)
- [ ] Pagination state (current page, page size)
- [ ] Selected rows state (for bulk operations)
- [ ] Loading state
- [ ] Error state
- [ ] Success notification state

### Services

- [ ] API client methods for all endpoints
- [ ] Search service with debounce
- [ ] Export service (CSV, Excel, PDF generation)
- [ ] Bulk operation handlers
- [ ] Permission checking service
- [ ] Currency formatting service
- [ ] Date formatting and timezone service

### Accessibility & UX

- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation support (Tab, Arrow keys)
- [ ] Screen reader compatibility
- [ ] Color contrast ratio compliance (WCAG AA)
- [ ] Focus indicators visible
- [ ] Error messages associated with inputs
- [ ] Loading state announcements

### Responsive Design

- [ ] Mobile layout (320px+): Stack columns, horizontal scroll if needed
- [ ] Tablet layout (768px+): Adjust column widths
- [ ] Desktop layout (1024px+): Full-width table with all columns
- [ ] Touch-friendly button sizes (44px minimum)
- [ ] Collapsible filter section on mobile

---

## Deployment Strategy

### Phased Rollout Plan

**Phase 1: Backend API Deployment**
- Deploy list endpoint ensuring GET performance <500ms
- Enable database indexes for query optimization
- Validate filtering and search logic
- Test with production-like data volume

**Phase 2: Frontend Deployment**
- Deploy bill list page component
- Enable feature flag for gradual rollout (10% → 50% → 100%)
- Monitor performance metrics
- Collect user feedback

**Phase 3: Supporting Features**
- Deploy bulk operations (mark as paid, export)
- Deploy payment recording integration
- Deploy audit trail tracking

### Database Migrations

- Create VendorBill table with all fields
- Create appropriate indexes as listed
- Create VendorBillItem table for line items
- Create BillPayment table for payment tracking
- Backfill existing bills if migrating from legacy system
- Validate data integrity after migration

### Caching Strategy

- Cache vendor list (10-minute TTL)
- Cache payment methods list (24-hour TTL)
- Cache payment terms list (24-hour TTL)
- Implement Redis cache for frequently-queried bills
- Invalidate cache on bill status changes

### Feature Toggles

- `vendor_bills_list_enabled`: Enable/disable feature
- `vendor_bills_bulk_operations`: Enable bulk operations
- `vendor_bills_export`: Enable export functionality
- `vendor_bills_payment_recording`: Enable payment workflow

### Testing Requirements

- Load test with 5000+ bills to verify performance
- Concurrent user testing (20+ simultaneous users)
- Data validation testing for various bill states
- Permission-based access control testing
- Integration testing with vendor and PO modules

### Staff Training

- Show search functionality (bill number, PO, vendor)
- Demonstrate filter usage for common workflows
- Train on bulk operations and export
- Explain payment recording workflow
- Document status transitions and overdue handling

### Rollback Plan

- Maintain previous bill list interface available
- Database rollback scripts prepared
- Feature toggle allows instant disable
- Monitoring alerts for issues requiring rollback

### Performance Monitoring

- Monitor API latency for list endpoint
- Track search query performance
- Monitor bulk operation latency
- Alert if latency exceeds SLA (>500ms)
- Monitor database query performance

---

## Performance Targets

- **Bill list API response**: <500ms for page_size=25 (p95)
- **Search query execution**: <200ms with debounce (p95)
- **Bulk operations**: <2s per 100 records (p95)
- **Table initial render**: <300ms after data arrival (p95)
- **Export file generation**: <5s for 5000 records (p95)
- **Database query response**: <100ms for indexed queries (p95)

---

## Monitoring & Alerting

### Key Metrics

- **API Response Time**: Track list endpoint latency percentiles (p50, p95, p99)
- **Search Performance**: Monitor search query completion time
- **Filter Usage**: Track which filters are used most frequently
- **Export Operations**: Monitor export generation time and success rate
- **Payment Recording**: Track payment operation success rate and latency
- **Error Rate**: Monitor API error rate (4xx, 5xx responses)

### Alerting Rules

- Alert if API latency exceeds 500ms (p95)
- Alert if search performance exceeds 200ms
- Alert if bulk operation exceeds 2s per 100 records
- Alert if export fails or exceeds 5s generation
- Alert if payment recording fails
- Alert on high error rate (>5% of requests)

### Dashboards

- Create Grafana dashboard showing:
  - API latency trends
  - Search performance metrics
  - Filter usage patterns
  - Error rate tracking
  - Bulk operation performance
  - Export generation metrics

---

## Documentation Requirements

### User Documentation

- **Bill List Navigation Guide**: How to access and navigate the bills list
- **Search Tips**: Best practices for effective searching
- **Filter Guide**: Explanation of each filter and how to use them
- **Bulk Operations Guide**: How to perform bulk actions
- **Export Guide**: How to export bills in different formats
- **Status Workflow Explanation**: What each status means and transitions
- **Payment Recording Guide**: How to record payments
- **Troubleshooting Guide**: Common issues and solutions

### Developer Documentation

- **API Endpoint Documentation**: OpenAPI/Swagger specs for all endpoints
- **Database Schema**: ERD and field descriptions
- **Component Architecture**: Component structure and props
- **State Management**: How filters and data flow through system
- **Testing Guide**: How to test components and API
- **Performance Optimization**: Database query optimization tips
- **Deployment Guide**: Step-by-step deployment instructions

---

## Future Enhancements

### Phase 2 Features (Next Quarter)

- **Vendor Payment Performance Metrics**: Track on-time payment percentage by vendor
- **Bill Aging Analysis**: Visualize distribution of bills by age (0-30, 30-60, 60-90, 90+ days)
- **Spend Analysis**: Track spending by vendor and category over time
- **Automatic Bill Generation**: Auto-create bills from PO receipt
- **Bill Approval Workflow**: Multi-level approval process for bills
- **Advanced Filtering**: Save and recall custom filter combinations

### Phase 3 Features (Following Quarter)

- **Multi-Currency Support**: Handle bills in multiple currencies with conversion
- **Bill Comparison**: Compare bill amounts with linked PO amounts
- **Scheduled Payment Alerts**: Notify users of upcoming payment due dates
- **Vendor Statement Reconciliation**: Match vendor statements against recorded bills
- **Early Payment Discount Calculation**: Identify and calculate available discounts
- **Advanced Analytics**: Predictive analytics for payment timing
- **Integration with Payment Systems**: Direct payment processing from bill interface
- **Bank Reconciliation Matching**: Auto-match paid bills with bank statements

---

## Appendix

### Status Code Reference

- **draft**: Bill created but not yet submitted
- **submitted**: Bill submitted to accounting workflow
- **paid**: Bill fully paid
- **partially_paid**: Some payment received, balance outstanding
- **overdue**: Due date passed without full payment

### Payment Terms Examples

- Due on Receipt: Payment due immediately
- Net 15: Payment due 15 days after bill date
- Net 30: Payment due 30 days after bill date
- 2/10 Net 30: 2% discount if paid within 10 days, otherwise full payment due in 30 days

### Currency Formatting

All currency amounts displayed with:
- Two decimal places
- Thousands separator (comma)
- Currency symbol appropriate to tenant locale
- Example: $1,234.56 or ₹1,234.56
