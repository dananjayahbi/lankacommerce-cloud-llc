# Vendors List Page Feature Specification

## Executive Summary

The Vendors List Page provides a comprehensive view of all supplier vendors in the system, enabling procurement staff and management to efficiently manage their vendor database. This interface offers advanced search, filtering, categorization, and bulk operations capabilities for streamlined vendor database management and procurement tracking.

---

## Current State

### Existing Implementation
- Basic vendor list page partially implemented
- Search functionality partially working (name search only)
- Filtering by status implemented
- Sorting working for some columns
- Pagination implemented (10, 25, 50 per page)
- Bulk operations partially implemented
- Export functionality incomplete
- Preferred vendor view missing
- Category filtering missing

### Known Limitations
- Limited search capabilities (name-only)
- Incomplete bulk operations
- Missing export features
- No category-based filtering
- No preferred vendor filtering

---

## Detailed Requirements

### Frontend Features

#### Data Table Component
- **Responsive Design**: Adapts to mobile, tablet, and desktop views
- **Sortable Columns**: Click headers to sort ascending/descending
- **Column Headers**:
  - Name
  - Contact
  - Email
  - Phone
  - Total purchases
  - Status
- **Row Selection**: Checkboxes for bulk operations
- **Row Actions**: Click row to view vendor details
- **Dynamic Styling**: Status-based row highlighting

#### Search Functionality
- **Multi-field Search**:
  - Search by vendor name
  - Search by contact person name
  - Search by email
  - Search by phone
- **Debounced Search**: Real-time search (debounce 300ms)
- **Search Input**: Clear button, search icon
- **Results Counter**: Show matching records

#### Filter Section
- **Collapsible Design**: Toggle to expand/collapse
- **Status Filter**: Active, Verified, Pending, Inactive
- **Category Filter**: Vendor category/type selection
- **Preferred Vendor Filter**: Checkbox toggle
- **Filter Count Badge**: Display active filter count
- **Clear All Filters Button**: Reset to default state
- **Filter Combination**: AND logic for multiple filters

#### Sort Options
- **Sort By Options**: Name, Contact, Total purchases, Status
- **Sort Direction**: Ascending/Descending toggle
- **Default Sort**: By name ascending
- **Persist Sort**: Remember user preference

#### Pagination Controls
- **Page Size Selector**: 10, 25, 50, 100 rows per page
- **Navigation**: Previous/Next buttons
- **Page Jumper**: Input field to jump to specific page
- **Records Counter**: Display total records found
- **Current Page Indicator**: Show current page number

#### Bulk Action Toolbar
- **Conditional Display**: Only show when rows selected
- **Bulk Delete**: With confirmation dialog
- **Bulk Export**: To CSV, Excel, PDF formats
- **Bulk Status Change**: Update status for multiple vendors
- **Bulk Assign Category**: Assign category to selected vendors
- **Selection Summary**: Show "X rows selected"

#### Primary Actions
- **Create New Vendor Button**: Prominent call-to-action button
- **View Details Link**: Click to open vendor profile
- **Edit Button**: Opens edit form/modal
- **Delete Button**: With safety confirmation dialog
- **Mark as Preferred Toggle**: Quick action toggle

#### Additional Features
- **Export Vendors List**: CSV, Excel, PDF format options
- **Preferred Vendors View**: Filter toggle to show only preferred
- **Refresh Button**: Manual list reload
- **Loading States**: Skeleton loader for table
- **Empty State**: Message when no vendors match filters
- **Error State**: Display error message if API fails

---

## Validation & Edge Cases

### Data Validation
- Empty search results display appropriate empty state
- Large datasets (pagination efficiency for 1000+ vendors)
- Special characters in search (SQL injection prevention)
- Multi-language vendor names (Unicode support)

### Business Logic
- Concurrent vendor deletions (prevent double delete)
- Permission verification (only managers/admins can view all vendors)
- Soft delete handling (deleted_at field excludes from list)

### Performance
- Search performance should be <200ms for 1000+ vendors
- Bulk operation limits (prevent deletion of all vendors)
- Filter combination validation ensures efficiency

---

## Testing Checklist

### Table Rendering
- [ ] Table renders with all columns correctly
- [ ] Column headers display properly
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Row selection checkboxes function correctly

### Search Functionality
- [ ] Search by vendor name finds matching vendors
- [ ] Search by contact person finds vendors
- [ ] Search by email finds vendors
- [ ] Search by phone finds vendors
- [ ] Debounced search doesn't trigger excessive API calls
- [ ] Special characters in search handled correctly
- [ ] Empty search results show appropriate state

### Filtering
- [ ] Status filter works correctly (active, verified, pending, inactive)
- [ ] Category filter shows available categories
- [ ] Preferred vendor filter shows only marked vendors
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Clear filters button resets all filters
- [ ] Filter count badge shows correct number

### Sorting
- [ ] Sorting by name works (ascending/descending)
- [ ] Sorting by contact works
- [ ] Sorting by total purchases works
- [ ] Sorting by status works
- [ ] Default sort (name ascending) applies on load

### Pagination
- [ ] Pagination displays correct page
- [ ] Page size selector changes rows displayed
- [ ] Previous/Next buttons navigate correctly
- [ ] Page jumper input works
- [ ] Total records count displays correctly

### Bulk Operations
- [ ] Bulk select checkbox selects/deselects all rows
- [ ] Individual row selection works
- [ ] Bulk delete confirms before deletion
- [ ] Bulk export generates file in selected format
- [ ] Bulk status change updates all selected vendors
- [ ] Bulk category assign works correctly

### Individual Actions
- [ ] Create vendor button navigates to creation page
- [ ] Edit vendor button opens edit form
- [ ] Vendor details link opens profile page
- [ ] Delete button shows confirmation dialog
- [ ] Preferred vendor toggle works
- [ ] Export single vendor works

### State Management
- [ ] Empty state displays when no vendors found
- [ ] Error state displays when API fails
- [ ] Loading state shows skeleton loader during fetch
- [ ] Retry functionality works after errors
- [ ] Filter state persists during navigation

---

## Implementation Checklist

### Components
- [ ] Vendor table component with column definitions
- [ ] Search input component with debounce logic
- [ ] Filter section component (status, category, preferred)
- [ ] Sort selector component
- [ ] Pagination component
- [ ] Bulk action toolbar component

### Logic
- [ ] Row selection checkbox logic
- [ ] Filter combination logic (AND)
- [ ] Sort direction toggle
- [ ] Page size handling
- [ ] Debounce search implementation

### API Integration
- [ ] API client methods for vendors endpoint
- [ ] Query parameter construction (search, filters, sort, pagination)
- [ ] Response data handling
- [ ] Error handling and retry logic

### State Management
- [ ] State management for filters
- [ ] State for search query
- [ ] State for pagination
- [ ] State for sorting
- [ ] State for selected rows
- [ ] State for loading/error

### UX
- [ ] Loading states and skeleton loaders
- [ ] Empty state component
- [ ] Error state component
- [ ] Success notifications
- [ ] Confirmation dialogs

### Services
- [ ] Export service (CSV generation)
- [ ] Export service (Excel generation)
- [ ] Export service (PDF generation)
- [ ] Bulk operation handlers

### Accessibility & Responsiveness
- [ ] Permission check before rendering admin features
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation support
- [ ] Mobile-first responsive design
- [ ] Touch-friendly controls on mobile

---

## Backend API Requirements

### Endpoints

#### List Vendors (with Filters & Pagination)
```
GET /api/procurement/vendors/
Query Parameters:
  - search (string, optional): Multi-field search
  - status (string, optional): Filter by status
  - category (string, optional): Filter by category
  - is_preferred (boolean, optional): Filter preferred vendors
  - page (integer): Page number (1-indexed)
  - page_size (integer): Records per page (10, 25, 50, 100)
  - ordering (string): Sort field and direction (e.g., "name", "-name")

Response:
{
  "count": 150,
  "next": "https://api.example.com/api/procurement/vendors/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "company_name": "Supplier Inc",
      "contact_person": "John Doe",
      "email": "john@supplier.com",
      "phone": "+1-555-0100",
      "total_purchases": 50000,
      "status": "verified",
      "is_preferred": true
    }
  ]
}
```

#### Get Vendor Details
```
GET /api/procurement/vendors/{id}/
Response: Full vendor object with all details
```

#### Delete Vendor
```
DELETE /api/procurement/vendors/{id}/
Response: 204 No Content
```

#### Update Vendor (Bulk Status)
```
PATCH /api/procurement/vendors/{id}/
Request Body: { "status": "active" }
Response: Updated vendor object
```

#### Bulk Delete Vendors
```
POST /api/procurement/vendors/bulk-delete/
Request Body: { "ids": ["id1", "id2", "id3"] }
Response: { "deleted": 3 }
```

#### Bulk Export Vendors
```
POST /api/procurement/vendors/bulk-export/
Request Body: { "format": "csv", "ids": ["id1", "id2"] }
Response: File download (CSV/Excel/PDF)
```

#### Get Vendor Categories
```
GET /api/procurement/vendor-categories/
Response: [
  { "id": "uuid", "category_name": "Raw Materials" },
  { "id": "uuid", "category_name": "Services" }
]
```

---

## Database Requirements

### Vendor Model
```
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- company_name (String, max 200)
- contact_person (String, max 100)
- email (String, unique within tenant)
- phone (String)
- address_street (String, max 255)
- address_city (String, max 100)
- address_postal_code (String)
- tax_id (String, nullable)
- bank_account_details (JSON encrypted, nullable)
- payment_terms (String)
- verification_status (Enum: pending/verified/rejected)
- notes (Text, nullable, max 1000)
- status (Enum: active/verified/pending/inactive)
- is_preferred (Boolean, default False)
- total_purchases (Decimal, denormalized, default 0)
- created_at (DateTime)
- updated_at (DateTime)
- deleted_at (DateTime, nullable - soft delete)
```

### VendorCategory Model
```
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- category_name (String, max 100)
- created_at (DateTime)
- updated_at (DateTime)
```

### VendorCategoryMapping Model
```
- vendor_id (UUID, foreign key)
- category_id (UUID, foreign key)
- primary_key: (vendor_id, category_id)
```

### Database Indexes
```
- (tenant_id, status)
- (tenant_id, is_preferred)
- (tenant_id, created_at)
- (email)
- (phone)
- (company_name)
- (tenant_id, deleted_at)
```

---

## Deployment Strategy

### Pre-deployment
- Ensure all API endpoints are implemented and tested
- Database migration tested in staging
- Vendor model properly indexed
- Caching strategy finalized

### Deployment Steps
1. Deploy API changes to production
2. Run database migrations
3. Enable feature flag for vendors management
4. Monitor API latency and errors
5. Verify data integrity post-migration

### Rollback Plan
- Maintain previous vendor list implementation
- Feature flag to quickly disable if needed
- Database rollback script prepared
- Data backup before migration

### Testing Requirements
- Load test with 5000+ vendors
- Concurrent user testing (100+ users)
- Search performance validation
- Bulk operation performance validation
- Pagination efficiency verification

### Staff Training
- Demonstrate search capabilities
- Show filter combinations
- Explain bulk operations
- Export feature walkthrough
- Best practices for vendor management

---

## Performance Targets

### API Performance
- Vendor list API: <500ms (for page_size=25)
- Search query: <200ms (debounced after 300ms user stop typing)
- Bulk operations: <2s (per 100 records)
- Category retrieval: <100ms
- Response time (P95): <1s

### Frontend Performance
- Table render: <300ms (with 25 rows)
- Search input response: <100ms
- Filter application: <200ms
- Pagination navigation: <300ms
- Export generation: <5s (for 5000 records)

### Resource Usage
- API response size: <1MB per request
- Client-side memory: <50MB for full vendor list
- Cache hit rate: >80% for category list

---

## Monitoring & Alerting

### Metrics to Track
- Vendor list API response time (P50, P95, P99)
- Search query execution time
- Bulk operation duration
- Filter application performance
- Export generation time
- API error rate
- 404 rate (deleted vendors)

### Alerts
- API response time exceeds 1s
- Error rate exceeds 1%
- Search query slow (>500ms)
- Bulk operation timeout (>5s)
- Export generation timeout (>10s)

### Dashboards
- Vendor list page performance
- Search performance breakdown
- Bulk operation success rate
- Export usage statistics
- User activity heatmap

---

## Documentation Requirements

### User Documentation
- Vendor list navigation guide
- Search tips and tricks
  - Multi-field search best practices
  - Wildcard usage (if supported)
- Filter guide
  - Status filter explanation
  - Category selection
  - Combined filters
- Bulk operations guide
  - Bulk delete process
  - Bulk export process
  - Bulk status updates
- Export guide
  - Export formats (CSV, Excel, PDF)
  - File naming conventions
  - Data included in export
- Preferred vendor explanation
- Troubleshooting common issues

### Admin Documentation
- Caching strategy
- Performance optimization
- Feature flags
- Monitoring setup
- Maintenance procedures

---

## Future Enhancements

### Performance & Analytics
- Vendor performance scoring (on-time delivery, quality)
- Vendor segmentation (by spend, category, geography)
- Spend analysis by vendor
- Trend reports

### User Experience
- Saved filters (user-defined presets)
- Custom column selection
- Advanced search syntax
- Vendor comparison view
- Dashboard widgets

### Data Management
- Automated vendor evaluation
- Vendor import from external sources
- Duplicate detection and alerts
- Vendor merge functionality
- Historical data analytics

### Integrations
- Integration with external supplier databases
- Real-time vendor status updates
- Automated vendor verification
- Third-party data enrichment

