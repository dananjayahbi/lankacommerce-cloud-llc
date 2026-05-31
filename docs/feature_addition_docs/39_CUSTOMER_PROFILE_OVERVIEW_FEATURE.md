# Document 39: Customer Profile Overview Feature

## Executive Summary

The Customer Profile Overview page serves as the central hub for viewing and managing core customer information within the LankaCommerce Cloud platform. This feature displays comprehensive customer details including name, status, loyalty metrics, credit utilization, and profile management capabilities, enabling account managers and support staff to maintain optimal customer relationship visibility. The profile overview provides quick access to customer metrics and enables rapid decision-making for sales and customer service interactions.

---

## Current State

**Partially Implemented**

- Basic profile overview display with limited information
- Contact information display operational
- Status badge display functional
- Loyalty section partially implemented (points balance only)
- Credit section incomplete (lacks utilization visualization)
- Purchase metrics missing
- Quick action buttons partially working
- Tab navigation basic/incomplete
- Export profile functionality not yet implemented
- Customer metrics calculations not optimized

---

## Frontend Features

### Header Section (Customer Name Display)
- Large, prominent customer name display showing first and last name
- Status badge with color coding (Active: Green, VIP: Gold, Inactive: Gray)
- Last updated timestamp (e.g., "Updated 2 hours ago")
- Edit profile button (secondary button style, opens edit form)
- Customer ID display (optional, for reference)

### Contact Information Card (Read-Only Display)
- Email address with clickable link (opens email composer if enabled)
- Phone number with clickable link (opens phone dialer if enabled)
- Multiple addresses display with address type labels (Billing, Shipping, Other)
- Primary address indicator (star icon or "Primary" badge)
- "Manage addresses" link (opens address management modal)
- Address-specific action buttons (set as primary, edit, delete)

### Business Information Card (For Corporate Customers)
- Business name display
- Business type display (if applicable: Retailer, Distributor, Wholesaler, etc.)
- Tax ID display (partially masked for security: XXX-XX-1234)
- Registration number (if applicable)
- "Edit business info" link (opens edit form)
- Legal entity name (optional, for compliance)

### Customer Status Section
- Current status display (Active/VIP/Inactive)
- Status change date (e.g., "VIP since January 15, 2026")
- Status history link (displays last 5 status changes in modal)
- Change status button (conditional, if permission granted)
- Status reason/notes (optional, displayed if available)

### Loyalty and Credit Section (Cards/Widgets)
- Loyalty tier badge prominently displayed (Gold, Silver, Bronze, etc. with colors)
- Loyalty points balance (large, readable font size)
- Points earned this year display
- Store credit balance (large, readable font size)
- Credit available vs. credit limit visualization (bar chart or progress bar)
- Remaining credit available amount
- Credit limit amount
- Credit used amount this period
- Last activity date (last earn/redeem)

### Purchase Metrics Section (Cards)
- Total purchase value (lifetime, currency formatted)
- Last purchase date and time
- Average order value (calculated from purchases)
- Purchase count (all-time total)
- Average purchase frequency (e.g., "every 15 days", "4 times per month")
- Purchase growth indicator (trending arrow)

### Quick Action Buttons
- Create order button (initiates new order for customer)
- Create quote button (initiates new quote for customer)
- Send communication button (opens communication modal with email/SMS/WhatsApp options)
- View purchase history button (navigates to purchase history tab)
- Edit customer button (opens edit customer form)
- Assign manager button (conditional, if permission granted - opens staff selector)
- Delete customer button (admin only, with confirmation modal and protection check)

### Tab Navigation
- Purchase History tab (shows order list)
- Loyalty & Credits tab (shows loyalty and store credit details)
- Communication tab (shows email, SMS, and notes history)
- Notes tab (internal staff notes)
- Tab indicators showing count (e.g., "Purchase History (42)")

### Loading and Error States
- Skeleton loaders for each card/section while data loads
- Error message display if profile fails to load (with retry button)
- Refresh button in header (reloads profile data)

### Additional Features
- Responsive design (mobile, tablet, desktop)
- Export profile button (exports customer summary as PDF)
- Print profile button (opens print dialog)
- Customer avatar/initials display (if available)
- Quick search in profile (search addresses, notes, contacts)
- Accessibility features (ARIA labels, keyboard navigation)

---

## Backend API Requirements

### GET /api/crm/customers/{id}/
Retrieve complete customer profile information.

**Response Fields:**
- `id`: Customer ID (UUID)
- `first_name`: Customer first name
- `last_name`: Customer last name
- `email`: Email address
- `phone`: Phone number
- `status`: Customer status (Active, VIP, Inactive)
- `loyalty_tier`: Current loyalty tier (Gold, Silver, Bronze, etc.)
- `loyalty_points`: Current loyalty points balance
- `store_credit`: Store credit balance
- `credit_limit`: Customer credit limit
- `total_purchases`: Denormalized total purchase amount
- `last_purchase_date`: Last purchase date/time
- `addresses`: Array of customer addresses with type labels
- `business_name`: Business name (if corporate customer)
- `business_type`: Business type classification
- `tax_id`: Tax ID (masked display)
- `created_at`: Customer account creation date
- `updated_at`: Last profile update date
- `is_vip`: Boolean VIP status
- `manager_id`: Assigned account manager ID (if any)

### GET /api/crm/customers/{id}/metrics/
Calculate customer metrics for display.

**Response Fields:**
- `total_purchases`: Total purchase value (lifetime)
- `average_order_value`: Calculated from all orders
- `purchase_count`: Total number of orders
- `last_purchase_date`: Most recent purchase date
- `average_purchase_frequency`: Days/weeks between purchases
- `lifetime_value`: Predicted customer lifetime value
- `purchase_growth`: Trend indicator (positive/negative)

### GET /api/crm/customers/{id}/status-history/
Retrieve customer status change history.

**Response Fields:**
- `results`: Array of status change events
  - `id`: Status history entry ID
  - `old_status`: Previous status
  - `new_status`: New status
  - `change_date`: Date of status change
  - `reason`: Reason for status change (optional)
  - `changed_by`: User who made the change

### GET /api/crm/customers/{id}/profile-summary/
Retrieve profile data suitable for export/PDF generation.

**Response Fields:**
- `id`: Customer ID
- `name`: Full customer name
- `email`: Email address
- `phone`: Phone number
- `status`: Current status
- `loyalty_tier`: Loyalty tier
- `loyalty_points`: Points balance
- `store_credit`: Credit balance
- `total_purchases`: Total purchase value
- `profile_data`: Complete profile as JSON object
- `generated_at`: Timestamp when summary was generated

---

## Database Requirements

### Customer Model (Enhanced)
- `id`: UUID primary key
- `first_name`: VARCHAR(100)
- `last_name`: VARCHAR(100)
- `email`: VARCHAR(255), unique
- `phone`: VARCHAR(20)
- `status`: ENUM (Active, VIP, Inactive)
- `loyalty_tier`: VARCHAR(50) - denormalized for performance
- `loyalty_points`: DECIMAL(10,2) - denormalized
- `store_credit`: DECIMAL(10,2) - denormalized
- `credit_limit`: DECIMAL(10,2)
- `total_purchases`: DECIMAL(12,2) - denormalized, updated via event
- `last_purchase_date`: DATETIME - updated via event handler
- `business_name`: VARCHAR(255) - nullable
- `business_type`: VARCHAR(50) - nullable
- `tax_id`: VARCHAR(50) - nullable
- `manager_id`: UUID - foreign key to staff user
- `is_vip`: BOOLEAN - denormalized for query optimization
- `created_at`: DATETIME
- `updated_at`: DATETIME

### CustomerStatusHistory Model
- `id`: UUID primary key
- `customer_id`: UUID - foreign key
- `old_status`: VARCHAR(50)
- `new_status`: VARCHAR(50)
- `change_date`: DATETIME
- `reason`: TEXT - nullable
- `changed_by`: UUID - foreign key to staff user

### Indexes
- `(customer_id)` - primary lookup
- `(customer_id, updated_at)` - for recent updates
- `(status, is_vip)` - for filtering
- `(manager_id)` - for manager assignments
- `(total_purchases)` - for sorting by spending

---

## Current Implementation Status

**Completion: ~45%**

### Implemented
- ✅ Profile header with customer name display
- ✅ Contact information card
- ✅ Status badge (basic styling)
- ✅ Quick access buttons (partial)

### Incomplete/Needs Work
- ❌ Business information card (not displayed)
- ❌ Loyalty section (only points, missing tier info)
- ❌ Credit section (not fully implemented)
- ❌ Purchase metrics calculations
- ❌ Purchase metrics display
- ❌ Tab navigation (incomplete)
- ❌ Export/PDF functionality
- ❌ Status history modal
- ❌ Manager assignment feature
- ❌ Responsive design optimization
- ❌ Permission-based feature hiding
- ❌ Error handling and edge cases
- ❌ Performance optimization (metrics calculations)

---

## Validation & Edge Cases

### Null/Missing Data Handling
- No last purchase date: Display "Never purchased"
- No addresses: Display "No addresses on file" with "Add address" button
- No business name: Hide business info card
- No manager assigned: Show "Unassigned" in manager field

### VIP Status Edge Cases
- Loyalty tier upgrades: Reflect in badge and tier benefits display
- Loyalty tier downgrades: Show warning notification if applicable
- VIP status reversal: Display reason if available

### Credit Limit Edge Cases
- Zero credit limit customers: Display "No credit available"
- Customers at credit limit: Highlight in warning color
- Negative available credit: Prevent new orders, display escalation needed
- Currency formatting for very large amounts (>$999,999)

### Purchase Value Formatting
- Very large totals: Format with commas and appropriate currency symbol
- Currency precision: Display to 2 decimal places
- International currencies: Respect customer's currency setting

### International Phone Number Formatting
- Format per country code if available
- Display in clickable tel: link format
- Validate format for SMS/WhatsApp compatibility

### Address Scenarios
- Single address: Mark as primary automatically
- Multiple addresses: Display with type labels, allow primary designation
- No primary address set: Warn admin to designate one
- Archived addresses: Option to show/hide archived

### New Customer Scenarios
- No purchase history: Display message, show "Create first order" button
- No loyalty tier: Display "None" or "Eligible for entry tier"
- No store credit: Display "No credit available"

### Permission Validation
- Who can view profile: Account managers, customer service, admin (configurable per role)
- Who can edit profile: Only account manager, admin
- Who can delete customer: Admin only
- Who can change status: Manager, admin
- Who can view/edit notes: Account team only

### Customer Deletion Protection
- Cannot delete if active orders exist
- Cannot delete if outstanding payments
- Soft delete with archive for audit trail
- Show blocking reasons to user

---

## Testing Checklist

### Header Section
- [ ] Profile header displays customer name correctly
- [ ] Status badge displays correct status with right color
- [ ] Last updated timestamp displays correctly
- [ ] Edit profile button navigates to edit form
- [ ] Customer ID displays if available

### Contact Information
- [ ] Email address displays and is clickable
- [ ] Phone number displays and is clickable
- [ ] Multiple addresses display with type labels
- [ ] Primary address marked clearly with indicator
- [ ] "Manage addresses" link opens address modal
- [ ] Address action buttons (set primary, edit, delete) work

### Business Information
- [ ] Business info card displays for corporate customers
- [ ] Business name displays correctly
- [ ] Business type displays (if applicable)
- [ ] Tax ID displays partially masked
- [ ] "Edit business info" link works
- [ ] Card hidden for individual customers

### Customer Status
- [ ] Status displays with correct color coding
- [ ] Status change date displays
- [ ] "View status history" shows last 5 changes
- [ ] Change status button visible/hidden based on permission

### Loyalty and Credit Section
- [ ] Loyalty tier badge shows correct tier
- [ ] Loyalty tier badge has correct color for tier
- [ ] Loyalty points balance accurate and prominent
- [ ] Points earned this year calculated correctly
- [ ] Store credit balance accurate
- [ ] Credit available vs. limit calculation correct
- [ ] Credit bar chart/visualization displays correctly
- [ ] Remaining credit amount displays
- [ ] Credit limit amount displays

### Purchase Metrics
- [ ] Total purchase value displays and is currency formatted
- [ ] Last purchase date displays
- [ ] Average order value calculated correctly
- [ ] Purchase count displays
- [ ] Purchase frequency calculated correctly
- [ ] Purchase growth indicator shows trend

### Quick Action Buttons
- [ ] Create order button navigates to order creation
- [ ] Create quote button navigates to quote creation
- [ ] Send communication button opens modal with channel options
- [ ] View purchase history button navigates to purchase tab
- [ ] Edit customer button opens edit form
- [ ] Assign manager button opens staff selector (with permission)
- [ ] Delete customer button shows confirmation with checks (admin only)

### Tab Navigation
- [ ] All tabs display and are clickable
- [ ] Tab switching loads correct content
- [ ] Tab count indicators accurate
- [ ] Active tab highlighted/styled correctly

### Loading and Error States
- [ ] Skeleton loaders display while loading
- [ ] Error message displays on load failure
- [ ] Retry button works after error
- [ ] Refresh button reloads all data

### Additional Features
- [ ] Export profile button generates downloadable PDF
- [ ] Print profile button opens print dialog
- [ ] Customer avatar/initials display
- [ ] Responsive design works on mobile (< 768px)
- [ ] Responsive design works on tablet (768px - 1024px)
- [ ] Responsive design works on desktop (> 1024px)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (ARIA labels)

---

## Implementation Checklist

### Components to Create
- [ ] CustomerProfileOverview (main container component)
- [ ] ProfileHeader (customer name, status, edit button)
- [ ] ContactInformationCard (email, phone, addresses)
- [ ] BusinessInformationCard (conditional display)
- [ ] CustomerStatusSection (status, history link, change button)
- [ ] LoyaltyAndCreditSection (points and store credit display)
- [ ] PurchaseMetricsSection (metrics cards)
- [ ] QuickActionButtons (button group)
- [ ] TabNavigation (tab switcher)
- [ ] ProfileSkeleton (loading state)
- [ ] ProfileErrorState (error handling)
- [ ] ExportProfileButton (PDF export)

### Services to Create
- [ ] CustomerProfileService (API calls)
- [ ] MetricsCalculationService (metrics computation)
- [ ] ProfileExportService (PDF generation)
- [ ] PermissionCheckService (role-based access)

### API Integration
- [ ] GET /api/crm/customers/{id}/ endpoint integration
- [ ] GET /api/crm/customers/{id}/metrics/ integration
- [ ] GET /api/crm/customers/{id}/status-history/ integration
- [ ] GET /api/crm/customers/{id}/profile-summary/ integration

### State Management
- [ ] Customer profile state
- [ ] Loading state
- [ ] Error state
- [ ] Tab state
- [ ] Refresh trigger

### Styling
- [ ] Responsive layout (mobile-first approach)
- [ ] Card/widget styling (Tailwind or CSS)
- [ ] Status badge colors (theme colors)
- [ ] Typography hierarchy
- [ ] Spacing and padding consistency

### Accessibility
- [ ] ARIA labels for icons and buttons
- [ ] Keyboard navigation (tab through controls)
- [ ] Focus states for all interactive elements
- [ ] Alt text for images
- [ ] Color contrast compliance (WCAG AA)

### Testing
- [ ] Unit tests for components
- [ ] Integration tests for API calls
- [ ] Snapshot tests for UI components
- [ ] E2E tests for user flows
- [ ] Responsive design tests

---

## Deployment Strategy

### API Deployment
- GET `/api/crm/customers/{id}/` endpoint must be live and performant
- GET `/api/crm/customers/{id}/metrics/` optimized for <300ms response
- Database must be replicated and backed up

### Database Optimization
- Add indexes on customer_id, status, is_vip for fast lookups
- Denormalize frequently accessed fields (total_purchases, last_purchase_date) for performance
- Create materialized views for metrics calculations if needed

### Denormalization Strategy
- Pre-calculate `total_purchases` on order completion via event handler
- Update `last_purchase_date` on order completion
- Cache loyalty tier calculation with TTL of 1 hour

### Caching Strategy
- Cache customer profile (TTL 5 minutes) using Redis
- Cache metrics calculations (TTL 1 hour)
- Invalidate cache on customer update
- Use cache stampede protection

### Feature Toggle
- Implement feature flag to enable/disable customer profile view per tenant
- Allow gradual rollout to subset of users first

### Testing Before Deployment
- Load test with detailed customer profiles (1000+ fields)
- Performance test metrics calculations with large datasets
- Test with customers having 5000+ orders
- Test profile export with large data volumes

### Staff Training
- Create quick reference guide for profile navigation
- Document profile sections and what they mean
- Train on quick action buttons
- Show status change procedures

### Rollback Plan
- Maintain previous customer view endpoint for fallback
- Database migration rollback tested and ready
- Keep previous version in feature toggle for quick switch

### Monitoring & Alerting Setup
- Monitor profile load latency (P95, P99)
- Alert if P95 latency exceeds 500ms
- Monitor API error rates
- Track cache hit/miss rates

---

## Performance Targets

- **Load customer profile**: <500ms (with cache <100ms)
- **Calculate metrics**: <300ms (cached after first calculation)
- **Render profile page**: <500ms (after API response)
- **PDF export generation**: <3 seconds (async)
- **First meaningful paint**: <2 seconds
- **Fully interactive**: <3 seconds

**Cache Performance:**
- Cache hit ratio target: >80%
- Cache invalidation latency: <100ms
- Memory usage for profile cache: <500MB per 100k customers

---

## Monitoring & Alerting

### Metrics to Track
- Profile page load latency (P50, P95, P99)
- Metrics calculation latency
- API error rates
- Cache hit/miss ratios
- PDF export success rate
- Customer profile page views (usage metrics)

### Alerts to Configure
- Profile load latency P95 > 500ms
- Metrics calculation > 300ms
- API error rate > 1%
- Cache memory usage > 80% of limit
- PDF export failure rate > 5%
- Status update failures
- Deletion attempt on protected customers

### Dashboards
- Profile load performance dashboard
- Error rate and types dashboard
- Cache performance dashboard
- User engagement dashboard (which customers viewed most)

### Logging
- Log profile access for audit trail
- Log any customer data modifications
- Log failed export attempts
- Log permission denials for unauthorized access

---

## Documentation Requirements

### User Documentation
- Customer Profile Navigation Guide (step-by-step)
- Understanding Customer Status (what each status means)
- Understanding Loyalty Tiers (tier benefits and progression)
- Managing Customer Credit (how credit works)
- Profile Management Guide (edit, delete, archive)
- Address Management Guide
- Business Information Guide (for corporate customers)

### Staff Training Materials
- Profile Overview One-Pager
- Quick Reference Card (buttons and features)
- Video Tutorial (5-10 minutes)
- FAQ Guide

### Administrator Documentation
- Customer Profile Configuration
- Permission and Role Settings
- Database Optimization Guide
- API Integration Guide

---

## Future Enhancements

### Planned Features
- **Customer Risk Scoring**: Automated risk assessment (payment risk, churn risk) displayed on profile
- **Predictive Customer Lifetime Value**: ML-based CLV prediction with trend visualization
- **Personalized Recommendations**: Product/offer recommendations based on purchase history
- **Customer Communication Timeline**: Unified timeline of all customer interactions
- **External CRM Integration**: Sync with external CRM platforms (Salesforce, HubSpot)
- **Customer Health Score**: Overall health indicator based on multiple factors
- **Custom Profile Fields**: Per-tenant custom fields for specific business needs
- **Profile Version History**: Complete audit trail of all profile changes
- **Sentiment Analysis**: AI analysis of customer sentiment from communications
- **Customer Segmentation**: Automatic segmentation based on behavior and profile

### Potential Integrations
- Real-time inventory availability for reorder suggestions
- Payment method vault integration
- Shipping address validation
- Tax ID verification
- International business registry lookup
- Social media profile integration
- Partner platform integrations

### UI/UX Enhancements
- Drag-and-drop address management
- Inline editing for simple fields
- Advanced search and filter
- Bulk customer operations
- Customer comparison view
- Profile customization by user role
- Dark mode support

---

## Related Features

- [Document 40: Customer Purchase History Feature](40_CUSTOMER_PURCHASE_HISTORY_FEATURE.md)
- [Document 41: Customer Loyalty & Credits Feature](41_CUSTOMER_LOYALTY_CREDITS_FEATURE.md)
- [Document 42: Customer Communication & Notes Feature](42_CUSTOMER_COMMUNICATION_NOTES_FEATURE.md)

---

**Document Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Ready for Implementation  
**Priority:** High
