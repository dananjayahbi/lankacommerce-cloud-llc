# Purchase Orders List Page Feature Specification

## Executive Summary

The Purchase Orders List Page provides a comprehensive procurement interface for managing all supplier purchase orders within the LankaCommerce Cloud platform. This feature delivers a complete view of the PO lifecycle with advanced filtering, search, sorting, and bulk operation capabilities. The interface enables procurement staff to track order status, monitor delivery expectations, and efficiently manage vendor relationships.

**Key Business Value:**
- Centralized PO visibility and management
- Streamlined procurement workflow
- Reduced time to find and process orders
- Improved vendor relationship management
- Enhanced supply chain transparency

---

## Current State Analysis

### Existing Implementation
- Basic PO list page partially implemented
- Search by PO number functional
- Filter by status operational
- Sorting partially implemented
- Pagination working
- Bulk operations incomplete
- Export functionality missing
- Vendor filtering incomplete
- Date range filtering partial
- Overdue indicator missing

### Known Limitations
- Limited search capabilities
- Missing vendor filtering
- Incomplete date range filtering
- No bulk operation support
- Missing export functionality
- No overdue tracking display
- Limited status visibility

---

## Detailed Requirements

### Frontend Features

#### 1. Purchase Orders Data Table
**Responsive, sortable, filterable table displaying all POs**

Column Headers:
- PO # (Purchase Order Number)
- Vendor (Supplier name)
- Date (PO creation date)
- Amount (Total PO value)
- Status (Current PO status)
- Expected Delivery (Anticipated delivery date)

Table Characteristics:
- Fully responsive design (adapts to mobile, tablet, desktop)
- Sortable columns (click header to toggle ascending/descending)
- Row selection checkboxes for bulk operations
- Clickable rows to view full PO details
- Status badge indicators with color-coding (draft: gray, sent: blue, confirmed: green, received: purple, invoiced: gold)
- Overdue indicator (red highlight/icon if delivery date passed)
- Visual feedback on hover (row highlighting)
- Smooth scrolling for large datasets

#### 2. Search Functionality
**Multi-field search with debouncing**

Search Capabilities:
- Search by PO number (exact and partial matches)
- Search by vendor name (partial matching)
- Real-time search results (debounced, 300ms delay)
- Clear search button (X icon in search field)
- Search count badge showing results

Implementation Details:
- Single search input field
- Debounced API calls to prevent excessive requests
- Instant UI feedback during search
- Preservation of other filters during search

#### 3. Filter Section
**Collapsible filter panel with multiple filter options**

Filter Types:

**Status Filter:**
- Draft (unsent POs)
- Sent (POs sent to vendor, awaiting confirmation)
- Confirmed (vendor confirmed order)
- Received (goods received)
- Invoiced (invoice created from PO)
- Cancelled (cancelled POs)
- Multi-select support

**Date Range Filter:**
- From date picker (filter by PO creation start date)
- To date picker (filter by PO creation end date)
- Validation: To date must be >= From date
- Timezone-aware date handling

**Vendor Filter:**
- Dropdown with searchable vendor list
- Multi-select for filtering by multiple vendors
- Displays vendor name and code
- Lazy-load vendor list for performance

**Payment Status Filter (Optional):**
- Not Started
- In Progress
- Completed
- Overdue

Filter Controls:
- Filter count badge showing active filters
- Clear All Filters button
- Individual filter reset (X on each filter)
- Filter persistence during session

#### 4. Sort Options
**Configurable sorting**

Available Sort Fields:
- PO # (alphanumeric)
- Vendor (alphabetical)
- Date (chronological)
- Amount (numeric)
- Status (by status order)
- Expected Delivery (chronological)

Sort Direction:
- Ascending (A→Z, 0→9, oldest→newest)
- Descending (Z→A, 9→0, newest→oldest)

Default Sort:
- Primary: By date descending (newest POs first)
- Maintains user preference in session

#### 5. Pagination Controls
**Flexible pagination**

Features:
- Page size selector (10, 25, 50, 100 rows per page)
- Previous/Next buttons (disabled when at boundaries)
- Page number input (jump to specific page)
- Total records count display
- Current page indicator (e.g., "Page 3 of 15")
- Records displayed indicator (e.g., "Showing 21-40 of 150")

#### 6. Bulk Action Toolbar
**Appears when rows selected**

Features:
- Shows count of selected rows
- Bulk Send PO (email selected POs to vendors)
- Bulk Cancel (cancel multiple POs with confirmation dialog)
- Bulk Export (download selected POs to file)
- Bulk Print (print selected POs)
- Clear Selection button
- Select All / Deselect All toggle

#### 7. Individual Row Actions
**Contextual actions per PO**

Actions:
- Create New PO Button (prominent CTA, primary color)
- View Details Link/Button (opens detail page)
- Edit Button (editable if draft or confirmed status)
- Send Button (email to vendor if not sent)
- Cancel Button (with confirmation, if not received/invoiced)
- Receive Goods Button (if confirmed status)
- Print Button (opens print dialog)
- More Actions Menu (three-dot dropdown)

#### 8. Additional Display Elements

**Vendor Contact Quick Link:**
- Hover to show vendor contact info
- Click to open vendor communication

**Expected Delivery Countdown:**
- Display days until delivery
- Red color if past expected delivery date
- Yellow if within 3 days
- Green if more than 3 days away

**Refresh Button:**
- Manual reload of PO list
- Shows last refresh timestamp

**Status Indicators:**
- Visual badges with status colors
- Tooltips on hover explaining status

#### 9. State Displays

**Loading State:**
- Skeleton loader showing table structure
- Animated loading indicators
- Prevents user interaction during load

**Empty State:**
- "No purchase orders found" message
- Contextual help text
- Create New PO button
- Link to help documentation

**Error State:**
- Error message with context
- Retry button
- Support contact information

---

## Backend API Requirements

### Primary Endpoints

#### GET /api/procurement/purchase-orders/
**List Purchase Orders with filtering, search, sorting, pagination**

Query Parameters:
- `search` (string): Search by PO number or vendor name
- `status` (string): Filter by status (draft,sent,confirmed,received,invoiced,cancelled)
- `vendor_id` (integer): Filter by vendor
- `date_from` (date): Filter POs from this date forward (format: YYYY-MM-DD)
- `date_to` (date): Filter POs up to this date (format: YYYY-MM-DD)
- `page` (integer): Page number (1-based)
- `page_size` (integer): Records per page (10, 25, 50, 100)
- `ordering` (string): Sort field with direction (e.g., "-po_date" for descending date)

Response Format:
```
{
  "count": 150,
  "next": "url_to_next_page",
  "previous": "url_to_previous_page",
  "results": [
    {
      "id": 1,
      "po_number": "PO-2026-001",
      "vendor_name": "Supplier Corp",
      "po_date": "2026-05-15",
      "amount": 15000.00,
      "status": "confirmed",
      "expected_delivery": "2026-06-15",
      "is_overdue": false,
      "vendor_id": 5
    },
    ...
  ]
}
```

#### GET /api/procurement/purchase-orders/{id}/
**Retrieve PO details**

Response: Full PO object with all fields and related line items

#### DELETE /api/procurement/purchase-orders/{id}/
**Delete PO (only if draft status)**

Preconditions:
- PO must be in draft status
- User must have delete permission

Response: 204 No Content or error response

#### PATCH /api/procurement/purchase-orders/{id}/
**Update PO status**

Request Body:
```
{
  "status": "sent"
}
```

Response: Updated PO object

#### POST /api/procurement/purchase-orders/{id}/send/
**Send PO to vendor via email**

Request Body:
```
{
  "recipient_email": "vendor@example.com",
  "subject": "Custom subject (optional)"
}
```

Response:
```
{
  "success": true,
  "message": "PO sent successfully",
  "po_number": "PO-2026-001",
  "sent_date": "2026-05-20T10:30:00Z"
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

#### POST /api/procurement/purchase-orders/bulk-export/
**Export multiple POs to file**

Request Body:
```
{
  "po_ids": [1, 2, 3, ...],
  "format": "csv|excel|pdf",
  "include_line_items": true
}
```

Response: File download (binary)

#### GET /api/procurement/vendors/
**Get vendor list for filtering**

Response:
```
{
  "count": 45,
  "results": [
    {
      "id": 1,
      "name": "Supplier A",
      "code": "SUP001",
      "contact_email": "contact@suppliera.com"
    },
    ...
  ]
}
```

---

## Database Requirements

### PurchaseOrder Model Schema

Fields:
- `id` (Primary Key): Auto-incremented integer
- `tenant_id` (Foreign Key): Reference to tenant
- `po_number` (String, unique per tenant): Auto-generated PO identifier
- `vendor_id` (Foreign Key): Reference to vendor
- `po_date` (DateTime): Purchase order creation date
- `expected_delivery_date` (DateTime): Anticipated delivery date
- `amount` (Decimal): Total PO amount (includes tax)
- `status` (Enum): draft, sent, confirmed, received, invoiced, cancelled
- `notes` (Text): Additional notes/instructions
- `created_at` (DateTime): Record creation timestamp
- `updated_at` (DateTime): Last modification timestamp
- `deleted_at` (DateTime, nullable): Soft delete timestamp
- `sent_date` (DateTime, nullable): Date PO was sent to vendor
- `confirmed_date` (DateTime, nullable): Date vendor confirmed order
- `received_date` (DateTime, nullable): Date goods received
- `created_by` (Foreign Key, nullable): User who created PO
- `last_modified_by` (Foreign Key, nullable): User who last modified PO

### Required Indexes

For optimal query performance:
- `(tenant_id, status)`: Filter by status
- `(tenant_id, po_date)`: Sort by date
- `(tenant_id, vendor_id)`: Filter by vendor
- `(expected_delivery_date)`: Track overdue orders
- `(status)`: Status distribution queries
- `(tenant_id, deleted_at)`: Exclude soft-deleted records
- `(po_number)`: Unique constraint per tenant

---

## Validation & Edge Cases

### Data Validation

**PO Number:**
- Must be unique per tenant
- Auto-generated in format: PO-YYYY-XXXXX
- Cannot be manually changed after creation

**Dates:**
- Expected delivery date must be in future
- PO date cannot be in future
- Timezone consistency across system

**Amount:**
- Must be positive number
- Cannot be zero
- Maximum precision: 2 decimal places

**Status Transitions:**
- Draft → Sent → Confirmed → Received → Invoiced
- Can be Cancelled from any status except Invoiced
- Cannot transition backwards (e.g., Confirmed → Sent)

### Edge Cases

**PO with No Line Items:**
- Should prevent creation
- Cannot save PO without at least one line item

**Cancelled POs:**
- Must display with cancelled status
- Cannot be edited after cancellation
- Cannot transition out of cancelled status

**Received POs:**
- Must have receipt confirmation
- Transition to received only after goods receipt recorded
- Cannot be cancelled after goods received

**Overdue POs:**
- If expected_delivery_date < current date and status != received/invoiced
- Display overdue indicator
- Show days overdue

**Multiple POs from Same Vendor:**
- Support normal filtering and grouping
- No artificial restrictions

**Large Dataset Pagination:**
- Support 1000+ POs efficiently
- Indexes must prevent timeout
- Optimize query performance

**Concurrent PO Operations:**
- Prevent race conditions during status updates
- Use pessimistic or optimistic locking
- Atomic update operations

**Permission Validation:**
- Only procurement users can view POs
- Only certain roles can send/cancel
- Tenant isolation enforced

**Soft Delete Handling:**
- Exclude deleted_at != null from queries by default
- Include soft-deleted records only in admin view
- Maintain audit trail of deleted records

**Timezone Handling:**
- Store all dates in UTC
- Convert to user timezone for display
- Handle daylight saving transitions

---

## Testing Checklist

### Functional Testing

- [ ] Table renders all columns correctly
- [ ] Table displays correct data from API
- [ ] Search by PO number finds matching POs
- [ ] Search by vendor name finds POs from that vendor
- [ ] Debounced search works correctly (waits before querying)
- [ ] Status filter shows all available status options
- [ ] Status filter filters POs correctly
- [ ] Date range filter validates correct date range
- [ ] Date range filter prevents To < From
- [ ] Vendor filter populated with vendor list
- [ ] Vendor filter filters POs correctly
- [ ] Multiple filters combine correctly with AND logic
- [ ] Clear filters button resets all filters
- [ ] Sorting by PO # works (ascending/descending)
- [ ] Sorting by Vendor works
- [ ] Sorting by Date works
- [ ] Sorting by Amount works
- [ ] Sorting by Status works
- [ ] Sorting by Expected Delivery works
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows displayed
- [ ] Bulk select checkbox selects/deselects row
- [ ] Select All checkbox selects all visible rows
- [ ] Bulk send PO works for multiple selected
- [ ] Bulk cancel requires confirmation dialog
- [ ] Bulk export generates file in correct format
- [ ] Bulk print generates print output
- [ ] Create PO button navigates to creation page
- [ ] Edit PO button opens form (if editable status)
- [ ] View details link opens detail page
- [ ] Send PO button works (if not already sent)
- [ ] Cancel button shows confirmation dialog
- [ ] Receive goods button appears (if confirmed)
- [ ] Expected delivery countdown displays correctly
- [ ] Overdue POs highlighted appropriately
- [ ] Empty state displays when no POs match filters
- [ ] Error state displays when API fails
- [ ] Loading state shows skeleton loader
- [ ] Vendor contact link displays contact info

### Responsive Design Testing

- [ ] Mobile layout (< 768px): Single column, collapsible filters
- [ ] Tablet layout (768px - 1024px): Two column possible
- [ ] Desktop layout (> 1024px): Full multi-column
- [ ] Table scrolls horizontally on small screens
- [ ] Buttons remain accessible on all screen sizes
- [ ] Filters accessible on mobile (toggle/drawer)
- [ ] Pagination readable on all sizes

### Performance Testing

- [ ] List loads in < 500ms for page_size=25
- [ ] Search completes in < 200ms after debounce
- [ ] Bulk operations complete in < 2s per 100 records
- [ ] Table renders in < 300ms
- [ ] Export generates in < 5s for 5000 records
- [ ] No memory leaks on list pagination
- [ ] Efficient with large datasets (1000+ records)

### Edge Case Testing

- [ ] Handles no POs gracefully
- [ ] Handles API error responses
- [ ] Handles network timeout
- [ ] Handles session expiration during operation
- [ ] Handles concurrent updates (refresh shows latest)
- [ ] Handles special characters in search
- [ ] Handles deleted POs (soft delete)
- [ ] Handles permission restrictions

### Accessibility Testing

- [ ] ARIA labels on all buttons
- [ ] ARIA labels on form inputs
- [ ] Keyboard navigation works (Tab, Shift+Tab)
- [ ] Enter key activates buttons
- [ ] Screen reader announces table correctly
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Focus indicators visible

---

## Implementation Checklist

### Frontend Components

- [ ] PO list page component (main container)
- [ ] PO data table component with sorting
- [ ] Table row component with actions
- [ ] Status badge component
- [ ] Overdue indicator component
- [ ] Search input component with debounce
- [ ] Filter section component (collapsible)
- [ ] Filter controls (status, date, vendor)
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Bulk action toolbar component
- [ ] Row selection checkbox component
- [ ] Loading skeleton component
- [ ] Empty state component
- [ ] Error state component
- [ ] Vendor contact popover component
- [ ] Action menu component (three-dot)
- [ ] Confirmation dialogs (cancel, delete, etc.)
- [ ] Success notification component
- [ ] Date picker component (date range filter)

### Services/Utilities

- [ ] API client methods for PO endpoints
- [ ] Search debounce utility
- [ ] Date formatting utilities
- [ ] Currency formatting utilities
- [ ] Status badge color mapping
- [ ] Overdue status calculation
- [ ] Permission checking service
- [ ] Export service (CSV, Excel, PDF)
- [ ] Bulk operation handlers
- [ ] Filter state management

### State Management

- [ ] PO list state
- [ ] Active filters state
- [ ] Search query state
- [ ] Sort configuration state
- [ ] Pagination state
- [ ] Loading state
- [ ] Error state
- [ ] Selected rows state
- [ ] Bulk operation state

### Backend Implementation

- [ ] GET /api/procurement/purchase-orders/ endpoint
- [ ] Query parameter validation
- [ ] Filter logic implementation
- [ ] Search implementation
- [ ] Sorting implementation
- [ ] Pagination implementation
- [ ] Response formatting
- [ ] Error handling
- [ ] Authentication/authorization
- [ ] Rate limiting
- [ ] Query optimization

### Database

- [ ] Create PurchaseOrder table
- [ ] Create required indexes
- [ ] Add soft delete support
- [ ] Add created_by/updated_by tracking
- [ ] Add timestamps (created_at, updated_at)
- [ ] Tenant isolation verification

### Testing

- [ ] Unit tests for components
- [ ] Unit tests for utilities
- [ ] Integration tests for API calls
- [ ] E2E tests for user workflows
- [ ] Performance tests (load testing)
- [ ] Accessibility tests

### Documentation

- [ ] API endpoint documentation
- [ ] Component documentation
- [ ] State management documentation
- [ ] Database schema documentation
- [ ] Troubleshooting guide

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review:** Peer review of all changes
2. **Automated Testing:** All tests pass (unit, integration, e2e)
3. **Performance Testing:** Load test with 5000+ POs
4. **Security Review:** Permission checks verified
5. **Database Backup:** Full backup before migration

### Deployment Steps

1. **API Deployment:**
   - Deploy GET endpoint to production
   - Verify endpoint is live and responding
   - Monitor for errors in first 30 minutes

2. **Database Migration:**
   - Run migration for PurchaseOrder table
   - Create required indexes
   - Verify indexes are built
   - Check query performance

3. **Caching Strategy:**
   - Implement vendor list caching (TTL: 1 hour)
   - Implement status options caching (static)
   - Cache invalidation on relevant updates

4. **Feature Toggle:**
   - Use feature flag for PO list page
   - Can be disabled if issues arise
   - Gradual rollout (10% → 50% → 100%)

5. **Frontend Deployment:**
   - Deploy UI components
   - Clear browser cache
   - Verify page loads correctly

6. **Staff Training:**
   - Show search functionality
   - Demo filter combinations
   - Explain workflow (status progression)
   - PO creation and management walkthrough

7. **Monitoring Setup:**
   - Set up alerting on API latency
   - Monitor error rates
   - Track feature usage

### Rollback Plan

- Maintain previous PO list version
- Feature flag to disable new list
- Database rollback (if needed)
- Timeline: Can rollback within 5 minutes

---

## Performance Targets

### Response Time

| Operation | Target | Notes |
|-----------|--------|-------|
| List POs (page_size=25) | < 500ms | Cold cache |
| Search query | < 200ms | After debounce |
| Filter application | < 300ms | Immediate update |
| Sort action | < 300ms | Immediate update |
| Pagination | < 400ms | Load next page |
| Bulk operations (100 records) | < 2s | Export, send, cancel |
| Table render | < 300ms | DOM rendering |
| Export generation (5000 records) | < 5s | CSV, Excel, PDF |

### Resource Usage

- API endpoint < 100MB memory
- Database query < 2GB temp space
- Client-side < 50MB memory
- No memory leaks on pagination

---

## Monitoring & Alerting

### Metrics to Track

1. **API Performance:**
   - Response time percentiles (p50, p95, p99)
   - Error rate (4xx, 5xx)
   - Request volume
   - Timeout rate

2. **Search Performance:**
   - Search query response time
   - Search result accuracy
   - Search usage patterns

3. **Filter Usage:**
   - Most used filters
   - Filter combination patterns
   - Performance by filter

4. **Bulk Operations:**
   - Bulk operation success rate
   - Bulk operation duration
   - Failure reasons

5. **User Behavior:**
   - Page views
   - Feature adoption rate
   - Most accessed pages
   - User retention

### Alerts

- **Critical:** API latency > 2s (for > 5 minutes)
- **Critical:** Error rate > 5% (for > 5 minutes)
- **Warning:** API latency > 1s
- **Warning:** Error rate > 1%
- **Warning:** Bulk operations timing out
- **Info:** Unusual usage patterns

---

## Documentation Requirements

### For End Users

1. **PO List Navigation Guide**
   - How to access PO list
   - Understanding table columns
   - Status explanations

2. **Search Tips**
   - How to search by PO number
   - How to search by vendor
   - Partial matching examples

3. **Filter Guide**
   - How to use status filter
   - How to use date range filter
   - How to use vendor filter
   - Combining multiple filters
   - Clearing filters

4. **Bulk Operations Guide**
   - How to select multiple POs
   - How to perform bulk actions
   - Confirmation dialogs

5. **Export Guide**
   - Export formats available
   - What data is included
   - How to export

6. **Status Workflow Explanation**
   - Status progression
   - What each status means
   - Possible transitions

7. **Troubleshooting**
   - Common issues
   - How to refresh
   - When to contact support

### For Developers

1. **API Documentation**
   - Endpoint specifications
   - Query parameters
   - Response formats
   - Error responses

2. **Component Documentation**
   - Component interfaces
   - Props and state
   - Usage examples

3. **State Management**
   - Store structure
   - Actions and reducers
   - Data flow

---

## Future Enhancements

### Phase 2 Features

1. **Vendor Performance Metrics**
   - On-time delivery rate
   - Quality metrics
   - Price competitiveness
   - Vendor rating dashboard

2. **PO Aging Analysis**
   - Days pending by status
   - Aging report
   - Alerts for old POs

3. **Spend Analysis**
   - Spend by vendor
   - Spend by category
   - Spend trends
   - Budget tracking

4. **Auto-PO Generation**
   - Low stock triggers automatic PO creation
   - Configurable thresholds
   - Supplier-specific ordering rules

5. **PO Approval Workflow**
   - Multi-level approvals
   - Approval routing
   - SLA tracking

### Phase 3 Features

1. **Multi-Step Delivery Tracking**
   - Partial receipt capability
   - Multi-location delivery
   - Detailed receipt tracking

2. **PO Comparison**
   - Compare prices across vendors
   - Compare terms and conditions
   - Historical price tracking

3. **Scheduled Delivery Alerts**
   - Notify before expected delivery
   - Alert on delays
   - Proactive follow-up

4. **Advanced Analytics**
   - PO trends
   - Supplier analysis
   - Category analysis
   - Predictive insights

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Ready for Development
