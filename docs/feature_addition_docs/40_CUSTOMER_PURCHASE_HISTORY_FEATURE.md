# Document 40: Customer Purchase History Feature

## Executive Summary

The Customer Purchase History feature provides a comprehensive, searchable, and filterable view of all customer orders within the LankaCommerce Cloud platform. This tab-based interface enables sales representatives, account managers, and customer service staff to quickly access purchase patterns, apply filters and sorting, view order details, and facilitate rapid reordering for repeat purchases. The feature includes purchase analytics, bulk operations, and export capabilities to support customer relationship management and sales analysis.

---

## Current State

**Partially Implemented**

- Purchase history tab exists but incomplete
- Order table basic display functional (columns, data)
- Date range filter partially working
- Status filter functional but incomplete
- Pagination implemented
- Purchase analytics partially displayed (missing calculations)
- Reorder functionality partially working (needs testing)
- Bulk operations not implemented
- Export functionality incomplete
- Search functionality missing
- Sorting partially implemented

---

## Frontend Features

### Purchase History Table (Sortable, Filterable)
- Columns displayed: Order ID, Date, Items Count, Total Amount, Status
- Row selection checkboxes (for bulk operations and multi-select)
- Sortable column headers (click to sort ascending/descending)
- Click row to view full order details (navigates or opens modal)
- Row hover state for better UX
- Zebra striping for readability
- Responsive table (scrollable on mobile)

### Filters Section (Collapsible Panel)
- **Date Range Filter**: 
  - From date picker with calendar
  - To date picker with calendar
  - Default: Last 12 months
  - Validate: From date <= To date
- **Status Filter**: 
  - Checkboxes for: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
  - Multi-select allowed
  - Show count next to each status
- **Payment Status Filter**:
  - Checkboxes for: Unpaid, Partially Paid, Paid
  - Multi-select allowed
- **Filter Count Badge**: Display active filter count (e.g., "3 filters active")
- **Clear All Filters Button**: Reset all filters to default

### Sort Options
- Sort by dropdown: Date, Order ID, Total, Status
- Sort direction toggle: Ascending/Descending
- Default sort: By date descending (newest first)
- Persist sort preference in session/localStorage

### Pagination Controls
- Page size selector: 10, 25, 50, 100 rows per page
- Previous button (disabled on first page)
- Next button (disabled on last page)
- Page indicator: "Page X of Y"
- Total orders count display: "Showing X-Y of Z orders"
- Jump to page input (optional, for large datasets)

### Purchase Analytics Section (Read-Only Summary Cards)
- **Total Spend Display**: 
  - Large, prominent number (e.g., "$125,450.00")
  - Currency formatted with thousands separator
  - Tooltip showing lifetime value breakdown (optional)
- **Average Order Value**: 
  - Calculated: Total spend / Order count
  - Currency formatted
- **Total Orders Count**: 
  - Number of orders (e.g., "234 orders")
  - Link to filtered view
- **Last Purchase Date/Time**: 
  - Relative time display (e.g., "2 months ago")
  - Absolute date on hover tooltip
- **Most Frequently Purchased Category**: 
  - Category name with order count (e.g., "Electronics (45 orders)")
- **Top Product Purchased**: 
  - Product name with order count

### Bulk Action Toolbar (Conditional Display)
- Displayed when rows are selected
- **Bulk Reorder Button**: 
  - Creates new orders with same items from all selected orders
  - Shows confirmation with item summary
  - Check stock availability first
- **Bulk Export Button**: 
  - Export selected orders to CSV format
  - Includes order details, items, totals

### Individual Order Actions (Per Row)
- **View Order Details Link**: 
  - Opens order detail page or modal
  - Shows complete order info, items, timeline
- **Reorder Button**: 
  - Creates new order with same items
  - Check stock availability
  - Show confirmation with item summary
- **Print Receipt Button**: 
  - Opens print dialog with receipt
  - Formatted for printing
- **Email Receipt Button**: 
  - Opens email composition
  - Pre-filled with customer email
  - Receipt as PDF attachment
- **Cancel Order Button** (if applicable): 
  - Conditional: only show if order can be cancelled
  - Request reason for cancellation
  - Show confirmation
- **Return/Refund Button** (if applicable): 
  - Conditional: only show if return window open
  - Opens return/refund form

### Search Functionality (Optional)
- **Search by Order ID**: 
  - Real-time search (debounced, 300ms delay)
  - Highlight matches in table
  - Case-insensitive
- **Search by Customer Name**: 
  - Search in order details
  - Return matching orders

### Empty State
- Display when no orders found
- Message: "No purchase history yet"
- Secondary message: "This customer hasn't placed any orders yet"
- "Create first order" button (navigates to order creation)
- Illustration/icon for context

### Loading State
- Skeleton loader for table rows
- Placeholder animations
- Loading indicator

### Error State
- Error message displayed clearly
- Error details (if appropriate)
- Retry button (reloads data)
- Contact support link

---

## Backend API Requirements

### GET /api/crm/customers/{id}/orders/
List all customer orders with filtering, sorting, and pagination.

**Query Parameters:**
- `date_from`: Filter orders from this date (YYYY-MM-DD)
- `date_to`: Filter orders up to this date (YYYY-MM-DD)
- `status`: Filter by order status (comma-separated: pending, confirmed, processing, shipped, delivered, cancelled)
- `payment_status`: Filter by payment status (unpaid, partially_paid, paid)
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 25, max: 100)
- `ordering`: Sort field with direction (e.g., "-order_date", "total", "-total")

**Response Format:**
```json
{
  "count": 234,
  "next": "https://api.example.com/...",
  "previous": null,
  "results": [
    {
      "id": "order-123",
      "order_date": "2026-05-15T10:30:00Z",
      "item_count": 3,
      "total": 1250.50,
      "status": "delivered",
      "payment_status": "paid"
    }
  ]
}
```

### GET /api/crm/customers/{id}/purchase-analytics/
Get customer purchase summary and analytics.

**Response Format:**
```json
{
  "total_spend": 125450.00,
  "average_order_value": 537.21,
  "order_count": 234,
  "last_purchase_date": "2026-05-15T10:30:00Z",
  "top_category": "Electronics",
  "top_category_count": 45,
  "top_product": "Widget Pro X",
  "top_product_count": 12
}
```

### GET /api/crm/customers/{id}/orders/{order_id}/
Get specific order details.

**Response includes:**
- Order ID, date, status, payment status
- Customer information
- Items list with quantities and unit prices
- Totals (subtotal, tax, shipping, total)
- Delivery address
- Payment method
- Order timeline/history
- Associated invoice/quote IDs

### POST /api/crm/customers/{id}/reorder/
Create a new order based on a previous order.

**Request Body:**
```json
{
  "source_order_id": "order-123",
  "items": [
    {
      "product_id": "prod-456",
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "id": "order-789",
  "status": "pending",
  "message": "Order created successfully"
}
```

### GET /api/crm/customers/{id}/orders/export/
Export customer orders to CSV format.

**Query Parameters:**
- `format`: Export format (csv, pdf, excel)
- `selected_order_ids`: Comma-separated IDs for bulk export (optional)
- `date_from`, `date_to`, `status`: Apply filters

**Response:**
- CSV file download with headers and order data

---

## Database Requirements

### Order Model
- `id`: UUID primary key
- `customer_id`: UUID - foreign key to Customer
- `order_date`: DATETIME
- `status`: ENUM (pending, confirmed, processing, shipped, delivered, cancelled)
- `payment_status`: ENUM (unpaid, partially_paid, paid)
- `total`: DECIMAL(12,2)
- `item_count`: INTEGER - denormalized for quick access
- `delivery_address_id`: UUID - foreign key
- `created_at`: DATETIME
- `updated_at`: DATETIME

### OrderItem Model
- `id`: UUID primary key
- `order_id`: UUID - foreign key
- `product_id`: UUID - foreign key
- `quantity`: INTEGER
- `unit_price`: DECIMAL(10,2)
- `line_total`: DECIMAL(12,2)

### Indexes Required
- `(customer_id, order_date)` - main query index for filtering by date
- `(customer_id, status)` - for status filtering
- `(customer_id, payment_status)` - for payment filtering
- `(order_date)` - for global date queries
- `(status)` - for status-based reports

---

## Current Implementation Status

**Completion: ~50%**

### Implemented
- ✅ Purchase history tab display
- ✅ Order table with basic columns
- ✅ Date range filter (partial)
- ✅ Status filter (basic)
- ✅ Pagination controls
- ✅ Purchase analytics display (partial)
- ✅ Reorder functionality (basic, needs testing)

### Incomplete/Needs Work
- ❌ Payment status filter
- ❌ Advanced search functionality
- ❌ Sorting options (needs enhancement)
- ❌ Purchase analytics calculations (accuracy)
- ❌ Bulk reorder functionality
- ❌ Bulk export to CSV
- ❌ Print receipt functionality
- ❌ Email receipt functionality
- ❌ Return/Refund button (not implemented)
- ❌ Empty state handling
- ❌ Error handling
- ❌ Loading state animation
- ❌ Responsive design optimization
- ❌ Column sorting UI enhancements

---

## Validation & Edge Cases

### No Purchase History
- Display empty state with helpful message
- Show "Create first order" CTA
- Don't show analytics cards (or show zeros)

### Very Large Number of Orders
- Pagination must be efficient
- Query optimization critical (indexed fields)
- Consider lazy loading for table rows
- Implement virtual scrolling if >10k orders

### Cancelled/Refunded Orders
- Display in status filter options
- Include in analytics but mark differently
- Allow cancellation/refund from table action
- Show reason for cancellation

### Date Range Edge Cases
- Future dates: Prevent or handle gracefully
- Very old dates (>50 years): Handle gracefully
- Date validation: From <= To
- Default to reasonable range (last 12 months)

### Multiple Orders on Same Date
- Sort stability: Use order ID as tiebreaker
- Display time component if available
- Sort by created_at or order_id secondarily

### Large Order Totals
- Format with comma separators (1,234.56)
- Currency formatting respect locale settings
- Maintain precision to 2 decimal places

### Orders with Zero Items
- Edge case, should not occur normally
- Handle gracefully if it does
- Show indicator if item count is zero

### Refunded Orders
- Display as separate status or cancelled
- Handle analytics (exclude from total spend?)
- Show refund date and amount
- Allow viewing refund reason

### Stock Availability for Reorder
- Check stock before reorder confirmation
- Show out-of-stock items with warning
- Allow user to proceed without unavailable items
- Suggest alternative products if available

### Permission Levels
- Who can view: Account managers, customer service, admin
- Who can reorder: Account managers, admin
- Who can export: Account managers, admin
- Who can cancel/refund: Admin, manager (configurable)

---

## Testing Checklist

### Table Display
- [ ] All columns display correctly
- [ ] Data displays in correct formats
- [ ] Row click navigates to order details
- [ ] Zebra striping displays correctly
- [ ] Responsive scrolling on mobile

### Filtering
- [ ] Date range filter works (from and to dates)
- [ ] Status filter shows all status options
- [ ] Status filter multi-select works
- [ ] Payment status filter works
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Filter count badge displays correct count
- [ ] Clear all filters button resets all filters
- [ ] Filters persist when navigating away and back

### Sorting
- [ ] Sort by date ascending works
- [ ] Sort by date descending works
- [ ] Sort by order ID works
- [ ] Sort by total works
- [ ] Sort by status works
- [ ] Default sort (by date desc) applies on load
- [ ] Sort persists when filtering

### Pagination
- [ ] Default page size (25) displays correctly
- [ ] Page size selector changes displayed rows
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] Page indicator shows correct X of Y
- [ ] Total count accurate
- [ ] Jump to page works (if implemented)

### Analytics
- [ ] Total spend calculated correctly
- [ ] Average order value calculated correctly
- [ ] Order count accurate
- [ ] Last purchase date correct
- [ ] Top category identified correctly
- [ ] Top product identified correctly
- [ ] Analytics update when filters applied

### Reorder
- [ ] View order details link works
- [ ] Reorder button creates new order
- [ ] Reorder shows confirmation with items
- [ ] Stock availability checked before reorder
- [ ] Out-of-stock warning displays
- [ ] Reorder completes successfully
- [ ] New order created with same items

### Bulk Operations
- [ ] Row checkboxes select/deselect correctly
- [ ] Select all checkbox selects all rows
- [ ] Bulk action toolbar appears when rows selected
- [ ] Bulk reorder creates orders from selected
- [ ] Bulk export generates CSV file
- [ ] CSV contains correct data and headers

### Search (if implemented)
- [ ] Order ID search works
- [ ] Search results display correctly
- [ ] Search is debounced (no lag)
- [ ] Search is case-insensitive
- [ ] Clear search shows all results

### Print/Email
- [ ] Print receipt button opens print dialog
- [ ] Print format is receipt-like
- [ ] Email receipt button opens email modal
- [ ] Email is pre-filled with customer email
- [ ] Attachment preview shows
- [ ] Email sends successfully

### Empty State
- [ ] Empty state message displays
- [ ] "Create first order" button works
- [ ] Icon/illustration displays

### Loading/Error States
- [ ] Skeleton loader displays while loading
- [ ] Error message displays on failure
- [ ] Retry button works
- [ ] Error state clears on successful retry

### Responsive Design
- [ ] Works on mobile (<768px)
- [ ] Works on tablet (768px-1024px)
- [ ] Works on desktop (>1024px)
- [ ] Table scrolls horizontally on mobile
- [ ] Touch-friendly on mobile

---

## Implementation Checklist

### Components to Create
- [ ] PurchaseHistoryTable (main table component)
- [ ] FilterPanel (filters and controls)
- [ ] PaginationControls (pagination UI)
- [ ] PurchaseAnalyticsSection (summary cards)
- [ ] BulkActionToolbar (multi-select actions)
- [ ] OrderActionButtons (individual row actions)
- [ ] SearchInput (order search, optional)
- [ ] EmptyState (no orders message)
- [ ] LoadingState (skeleton loader)
- [ ] ErrorState (error handling)

### Services to Create
- [ ] OrderService (API calls)
- [ ] AnalyticsService (calculations)
- [ ] ReorderService (reorder logic)
- [ ] ExportService (CSV export)
- [ ] PrintService (receipt printing)

### API Integration
- [ ] GET /api/crm/customers/{id}/orders/ integration
- [ ] GET /api/crm/customers/{id}/purchase-analytics/ integration
- [ ] GET /api/crm/customers/{id}/orders/{order_id}/ integration
- [ ] POST /api/crm/customers/{id}/reorder/ integration
- [ ] GET /api/crm/customers/{id}/orders/export/ integration

### State Management
- [ ] Orders list state
- [ ] Filters state (date, status, payment)
- [ ] Sorting state (field, direction)
- [ ] Pagination state (page, page_size)
- [ ] Selection state (selected row IDs)
- [ ] Loading state
- [ ] Error state

### Styling
- [ ] Table styling with Tailwind or CSS
- [ ] Filter panel styling
- [ ] Card styling for analytics
- [ ] Responsive breakpoints
- [ ] Accessibility color contrast

### Accessibility
- [ ] ARIA labels for filters and buttons
- [ ] Keyboard navigation (Tab through table)
- [ ] Focus states for all interactive elements
- [ ] Sortable column header keyboard support
- [ ] Screen reader friendly table structure
- [ ] Color contrast compliance (WCAG AA)

### Testing
- [ ] Unit tests for filter logic
- [ ] Unit tests for analytics calculations
- [ ] Integration tests for API calls
- [ ] E2E tests for user flows
- [ ] Performance tests with large datasets

---

## Deployment Strategy

### API Deployment
- Order list endpoint must be live and optimized
- Pagination working with large datasets
- Filters performant with indexed queries

### Database Optimization
- Ensure indexes on (customer_id, order_date) and (customer_id, status)
- Query plan analysis for filter combinations
- Consider denormalization if needed for performance

### Performance Testing
- Test with customers having 1000+ orders
- Test pagination with page_size=100
- Test with all filters applied simultaneously

### Feature Toggle
- Feature flag for purchase history tab
- Can disable if needed
- Gradual rollout to users

### Testing Before Deployment
- Full QA testing of all filters and sorts
- Reorder functionality testing
- Export file validation
- Performance benchmarking

### Staff Training
- Purchase history navigation guide
- Filter usage guide
- Reorder process
- Export guide

### Rollback Plan
- Previous order view maintained
- Database migration rollback
- Feature toggle for quick disable

---

## Performance Targets

- **Order list query**: <500ms (for page_size=25)
- **Calculate analytics**: <300ms
- **Reorder creation**: <1 second
- **Export generation**: <5 seconds (for 1000 orders)
- **Table render**: <300ms after API response
- **First meaningful paint**: <2 seconds
- **Search query**: <200ms (debounced)

### Database Query Performance
- Order list query: P95 <500ms
- Filtered queries: P95 <600ms
- Multi-filter combinations: P95 <800ms

---

## Monitoring & Alerting

### Metrics to Track
- Order list query latency (P50, P95, P99)
- Filter combination usage patterns
- Reorder success rate
- Export generation success rate
- CSV file size (for large exports)
- Table render performance
- Page views and user engagement

### Alerts to Configure
- Order list query latency P95 > 500ms
- Reorder failure rate > 2%
- Export generation > 5s
- Filter query timeout
- API error rate > 1%

### Dashboards
- Order query performance dashboard
- Filter usage analytics
- Reorder success metrics
- Export performance tracking

### Logging
- Log all order queries (for audit)
- Log reorder attempts and results
- Log export operations
- Log filter usage patterns

---

## Documentation Requirements

### User Documentation
- Purchase History Navigation Guide
- How to Filter Orders Guide
- How to Sort Orders Guide
- Reorder Process Guide
- Export Orders Guide
- Understanding Order Status Guide
- Payment Status Explanation

### Staff Training Materials
- Purchase History Quick Reference
- Filter Combination Guide (example scenarios)
- Troubleshooting Guide
- Video Walkthrough (3-5 minutes)

### Administrator Documentation
- API Integration Guide
- Database Optimization Guide
- Performance Tuning Guide
- Customization Options

---

## Future Enhancements

### Analytics & Insights
- **Advanced Analytics**: Trend analysis, seasonal patterns, purchase predictions
- **Purchase Forecasting**: Predict next purchase date/amount
- **Spending Trends**: Chart spending over time
- **Category Affinity**: Show product/category preferences
- **Churn Risk**: Identify customers at risk of not reordering

### Automation & Integration
- **Scheduled Reports**: Email order summaries periodically
- **Automatic Reorder**: Set up automatic reorders for regular purchases
- **Saved Filters**: User-defined filter presets
- **Order Subscriptions**: Automatic recurring orders

### UI/UX Enhancements
- **Advanced Search**: Multi-field search with operators
- **Saved Searches**: Quick access to common searches
- **Order Comparison**: Compare multiple orders side-by-side
- **Timeline View**: Visual timeline of customer orders
- **Mobile App**: Native mobile view of purchase history

### Integration Features
- **Inventory Integration**: Real-time stock status in reorder
- **Pricing Integration**: Current pricing for reorder suggestions
- **CRM Integration**: Link to external CRM data
- **Email Integration**: Sync with customer email history
- **Document Management**: Link PDFs and attachments

---

## Related Features

- [Document 39: Customer Profile Overview Feature](39_CUSTOMER_PROFILE_OVERVIEW_FEATURE.md)
- [Document 41: Customer Loyalty & Credits Feature](41_CUSTOMER_LOYALTY_CREDITS_FEATURE.md)
- [Document 42: Customer Communication & Notes Feature](42_CUSTOMER_COMMUNICATION_NOTES_FEATURE.md)

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Ready for Implementation  
**Priority:** High
