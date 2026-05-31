# Vendor Edit Feature Specification

## Executive Summary

The Vendor Edit Feature enables management staff to update and maintain vendor information throughout its lifecycle. This comprehensive interface manages contact persons, delivery addresses, payment details, and tracks vendor performance metrics. The feature includes audit trails for compliance and provides tools for managing relationships with existing suppliers.

---

## Current State

### Existing Implementation
- Basic edit form partially implemented
- Name, email, phone edit working
- Address management partially implemented
- Multiple addresses not fully working
- Contact person management missing
- Bank account details missing
- Payment terms management incomplete
- Performance metrics display incomplete
- Audit trail display missing
- Change logging not implemented

### Known Limitations
- No multiple addresses support
- Missing contact person management
- Incomplete bank account handling
- No audit trail/change history
- Limited performance tracking
- Soft delete handling incomplete
- No concurrent edit conflict detection

---

## Detailed Requirements

### Frontend Features

#### Form Header
- Page title: "Edit Vendor" with vendor name
- Breadcrumb navigation
- Vendor ID reference
- View vendor profile button

#### Basic Information Section (Editable)
- **Company Name Field**: Same validation as creation
- **Contact Person Name Field**: Same validation as creation
- **Email Field**: Same validation as creation
  - Email uniqueness check (allow current vendor)
  - Real-time format validation
- **Phone Field**: Same validation as creation
  - Phone uniqueness check (allow current vendor)
  - Format validation by country

#### Address Section (Editable)
- **Primary Address Display**
  - Read-only display of current address
  - Edit button to modify
  - Shows address type designation
- **Multiple Delivery Addresses Management**
  - **Address List**: 
    - Table showing all addresses
    - Columns: Type (Billing/Shipping/Delivery/Other), Street, City, Postal Code, Actions
    - Sortable by type/city
  - **Add Address Button**: Opens address form modal
  - **Edit Address Button**: Opens edit form for existing address
  - **Delete Address Button**: With confirmation dialog
  - **Mark as Primary Button**: Toggle primary address status
  - **Validation**: Ensure at least one primary address

#### Financial Information Section (Editable)
- **Tax ID/VAT Number Field**: Edit capability with format validation
- **Bank Account Details**
  - Read-only display of current account (masked)
  - Security notice: "Bank details encrypted"
  - **Edit Bank Details Button**: Opens secure edit modal
  - Modal contains:
    - Bank name field
    - Account number (masked, shows last 4 digits)
    - Account holder name field
    - Account type selector
    - Save button (with encryption confirmation)
- **Payment Terms Selector**: Editable dropdown
- **Preferred Payment Method Selector**: Editable dropdown

#### Contact Persons Management Section
- **For Corporate Vendors**: Manage multiple contacts
- **Contact Persons List**:
  - Table with columns: Name, Phone, Email, Title, Primary (indicator)
  - Sortable by name/title
  - Show/hide email addresses (privacy toggle)
- **Add Contact Person Button**: Opens modal form
- **Edit Contact Person Button**: Pre-fills modal with current data
- **Delete Contact Person Button**: With confirmation
  - Prevent deletion of primary contact
  - Show error if trying to delete last contact
- **Mark as Primary Button**: Set contact as primary for communications
- **Contact Person Form Modal**:
  - Name field (required)
  - Phone field (required)
  - Email field (required, format validation)
  - Title/Position field (optional)
  - Primary contact checkbox
  - Save button

#### Vendor Categorization Section
- **Vendor Type Selector**: Editable dropdown
- **Vendor Categories Multi-select**: Editable, shows current selections
- **Vendor Subcategories**: Dependent on vendor type, editable

#### Additional Information Section
- **Collapsible Design**: Expandable/collapsible
- **Vendor Notes Field**: Editable text area, max 1000 chars
- **Created By Display**: Read-only, shows user who created vendor
- **Created Date Display**: Read-only timestamp
- **Last Edited By Display**: Read-only, shows user who last edited
- **Last Edited Timestamp**: Read-only, updates on save

#### Vendor Status & Preferences
- **Current Status Display**: Shows current status badge
- **Change Status Button**: 
  - Opens modal with status options
  - Shows previous status
  - Allows adding reason/notes for change
- **Preferred Vendor Checkbox**: Editable toggle
- **Verification Status Display**: Read-only badge
  - Shows: Not Started, Pending, Verified, Rejected
- **Verification Status Explanation**: Informational text

#### Vendor Performance Section (Read-only)
- **Key Metrics Display**:
  - Total purchases amount (formatted currency)
  - Order count
  - Average order value
  - On-time delivery rate (if tracked, percentage)
  - Quality score (if tracked, 0-100)
  - Last order date (formatted)
  - Vendor tenure (time as vendor)
  - Payment reliability score
- **Performance Trend Chart** (if tracked)
- **Last Updated**: Shows when metrics last refreshed
- **Refresh Button**: Manual metric refresh

#### Payment & Billing History Section
- **Link to Payment History**: Button/link to view payments
- **Link to Bill History**: Button/link to view bills
- **Quick Summary**:
  - Total amount payable (if any)
  - Outstanding payments display (if any)
  - Last payment date
  - Next payment due (if scheduled)
- **Payment Status Badge**: Current/Overdue/Pending

#### Vendor Communication Section (Optional)
- **Primary Contact Person Assignment**: Dropdown selector
- **Account Manager Assignment**: Dropdown (if applicable)
- **Last Communication Date**: Display of last contact
- **Communication Preferences Link**: Navigate to preferences

#### Audit Trail Section
- **Collapsible Design**: Expandable/collapsible
- **Read-only**: All fields display-only
- **View Full Change History Button**: Navigate to detailed history
- **Recent Changes Preview**: 
  - Shows last 5 changes
  - Columns: Timestamp, Who Changed, What Changed, Old Value, New Value
  - Click row to see full details
- **Pagination**: If many changes
- **Filter**: By change type or user

#### Form Actions
- **Save Button**: Primary CTA, enabled only if changes made
- **Save & Continue Button**: Save without navigation
- **Cancel Button**: With unsaved changes warning
- **Delete Vendor Button**: 
  - Separate section with warning color
  - Opens confirmation dialog
  - Requires reason/notes
  - Prevents delete if active purchase orders exist
- **View Vendor Profile Button**: Link to vendor details page

#### User Feedback
- **Unsaved Changes Indicator**: Visual indicator (dot, asterisk) on fields
- **Loading States**: During save operation
- **Success Message**: Toast notification after save
- **Error Messages**: Display relevant errors
- **Conflict Detection**: Alert if another user edited during session

---

## Validation & Edge Cases

### Email/Phone Validation
- Email/phone uniqueness check (allow current vendor)
- Format validation
- Whitespace trimming
- Case-insensitive comparison
- Real-time validation with debounce

### Address Management
- Ensure at least one primary address
- Type validation
- Delete prevention if only address
- Postal code format by country

### Bank Account Validation
- Account number encryption
- Prevent empty account holder name
- Account type selection required
- Validate on save only (not real-time for security)

### Contact Person Management
- Prevent deletion of primary contact
- Prevent deletion if no other contacts
- Email format validation
- Phone format validation
- At least one contact person required

### Concurrent Edits
- Detect if vendor edited by another user
- Last-write-wins strategy with warning
- Refresh to get latest data
- Show who made conflicting changes

### Delete Prevention
- Prevent deletion if active purchase orders exist
- Show error message with count of active POs
- Link to view active POs
- Suggest deactivating instead of deleting

### Status Change Validation
- Verify permission for status change
- Allow only valid state transitions
- Require reason for certain changes
- Update related records

### Audit Trail
- Truncate to last 100 changes (performance)
- Group related changes
- Show field labels (not database names)
- Format old/new values appropriately

---

## Testing Checklist

### Form Loading & Display
- [ ] Form loads with current vendor data
- [ ] All editable fields pre-populated correctly
- [ ] Read-only fields display without edit controls
- [ ] Form title shows vendor name
- [ ] Breadcrumb navigation present
- [ ] Loading skeleton shown while loading

### Basic Information
- [ ] Email field validates format
- [ ] Email field checks uniqueness (allow current)
- [ ] Phone field validates format
- [ ] Phone field checks uniqueness (allow current)
- [ ] Name fields accept international characters
- [ ] Form detects changes made by user

### Address Management
- [ ] Address list displays all addresses
- [ ] Add address button opens form modal
- [ ] Edit address button pre-fills data correctly
- [ ] Delete address button shows confirmation
- [ ] Delete prevention works if only address
- [ ] Primary address can be changed
- [ ] New primary address marked correctly
- [ ] Address type display shows correctly

### Financial Information
- [ ] Tax ID field displays current value
- [ ] Bank account fields show masked data
- [ ] Edit bank details button opens modal
- [ ] Payment terms dropdown shows all options
- [ ] Preferred payment method updates
- [ ] Changes tracked in audit trail

### Contact Person Management
- [ ] Contact person list displays all contacts
- [ ] Add contact person button works
- [ ] Edit contact person pre-fills form
- [ ] Delete contact person shows confirmation
- [ ] Primary contact cannot be deleted
- [ ] At least one contact required
- [ ] Email format validation works
- [ ] Phone format validation works

### Vendor Categorization
- [ ] Vendor type selector shows all options
- [ ] Vendor categories multi-select works
- [ ] Subcategories update based on type
- [ ] Current selections show checked

### Status & Performance
- [ ] Current status displays with badge
- [ ] Change status button opens modal
- [ ] Performance metrics display
- [ ] Refresh button updates metrics
- [ ] Preferred vendor toggle works
- [ ] Verification status shows correctly

### History & Audit
- [ ] Audit trail section shows recent changes
- [ ] Change history shows: who, what, when
- [ ] Old value displays correctly
- [ ] New value displays correctly
- [ ] View full history button works
- [ ] Change history pagination works

### Form Actions
- [ ] Save button updates vendor data
- [ ] Success message displays after save
- [ ] Error message displays if save fails
- [ ] Unsaved changes warning shows on cancel
- [ ] Save & continue saves without navigation
- [ ] Delete button shows confirmation
- [ ] Delete prevention works for active POs

### User Feedback
- [ ] Unsaved changes indicator appears
- [ ] Loading state shows during save
- [ ] Conflict detection alerts work
- [ ] Error messages are specific
- [ ] Success messages display

### Responsive Design
- [ ] Form displays correctly on mobile
- [ ] Form displays correctly on tablet
- [ ] Form displays correctly on desktop
- [ ] Buttons touch-friendly on mobile

### Permission Checks
- [ ] Only authorized users can edit
- [ ] Delete only available to admins
- [ ] Status change respects permissions
- [ ] Read-only fields truly read-only

---

## Implementation Checklist

### Components
- [ ] Vendor edit form container component
- [ ] Basic information section component
- [ ] Address management component
  - [ ] Address list display
  - [ ] Address form modal
- [ ] Contact person management component
  - [ ] Contact list display
  - [ ] Contact form modal
- [ ] Financial information component
- [ ] Bank account edit modal
- [ ] Performance metrics component
- [ ] Audit trail component
- [ ] Status change modal
- [ ] Delete confirmation modal

### Data Management
- [ ] Load vendor data on component mount
- [ ] Handle loading and error states
- [ ] Track form changes
- [ ] Detect unsaved changes
- [ ] Prevent double submission

### Validation
- [ ] Email uniqueness check (allow current)
- [ ] Phone uniqueness check (allow current)
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Address validation
- [ ] Contact person validation
- [ ] Bank account validation

### API Integration
- [ ] GET /api/procurement/vendors/{id}/
- [ ] PATCH /api/procurement/vendors/{id}/
- [ ] Addresses endpoints (list, create, update, delete)
- [ ] Contact persons endpoints
- [ ] Audit trail endpoint
- [ ] Payment history endpoint
- [ ] Performance metrics endpoint
- [ ] Error handling and retry

### Audit & Logging
- [ ] Change logging in audit trail
- [ ] Who made the change captured
- [ ] Timestamp recorded
- [ ] Old and new values stored
- [ ] Field name stored (not just value)

### Security
- [ ] Bank account encryption
- [ ] Sensitive data masked in display
- [ ] Permission verification before edits
- [ ] CSRF token handling
- [ ] XSS prevention

### UX
- [ ] Loading states with spinners
- [ ] Success notifications
- [ ] Error notifications
- [ ] Field-level error messages
- [ ] Unsaved changes indicator
- [ ] Conflict detection
- [ ] Empty states for lists
- [ ] No data states for metrics

### Accessibility
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Error message associations
- [ ] Screen reader compatible

### Responsive Design
- [ ] Mobile layout
- [ ] Tablet layout
- [ ] Desktop layout
- [ ] Touch-friendly controls

---

## Backend API Requirements

### Endpoints

#### Get Vendor Details
```
GET /api/procurement/vendors/{id}/
Response: 200 OK
{
  "id": "uuid",
  "company_name": "Supplier Inc",
  "contact_person": "John Doe",
  "email": "john@supplier.com",
  "phone": "+1-555-0100",
  "address_street": "123 Supply St",
  "address_city": "New York",
  "address_postal_code": "10001",
  "tax_id": "12-3456789",
  "payment_terms": "Net 30",
  "preferred_payment_method": "bank_transfer",
  "notes": "Reliable supplier",
  "status": "active",
  "is_preferred": true,
  "verification_status": "verified",
  "created_by": "user-id",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_by": "user-id",
  "updated_at": "2026-05-31T10:30:00Z"
}
```

#### Update Vendor
```
PATCH /api/procurement/vendors/{id}/
Request Body: { fields to update }
Response: 200 OK (updated vendor object)
```

#### Full Vendor Update
```
PUT /api/procurement/vendors/{id}/
Request Body: { complete vendor object }
Response: 200 OK (updated vendor object)
```

#### Delete Vendor
```
DELETE /api/procurement/vendors/{id}/
Response: 204 No Content
```

#### Get Vendor Addresses
```
GET /api/procurement/vendors/{id}/addresses/
Response: 200 OK
[
  {
    "id": "uuid",
    "address_type": "billing",
    "street": "123 Supply St",
    "city": "New York",
    "postal_code": "10001",
    "is_primary": true,
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

#### Add Vendor Address
```
POST /api/procurement/vendors/{id}/addresses/
Request Body:
{
  "address_type": "shipping",
  "street": "456 Delivery Ave",
  "city": "Boston",
  "postal_code": "02101"
}
Response: 201 Created (address object)
```

#### Update Vendor Address
```
PATCH /api/procurement/vendors/{id}/addresses/{address_id}/
Request Body: { fields to update }
Response: 200 OK
```

#### Delete Vendor Address
```
DELETE /api/procurement/vendors/{id}/addresses/{address_id}/
Response: 204 No Content
```

#### Get Contact Persons
```
GET /api/procurement/vendors/{id}/contact-persons/
Response: 200 OK
[
  {
    "id": "uuid",
    "name": "John Smith",
    "phone": "+1-555-0101",
    "email": "john@supplier.com",
    "title": "Sales Manager",
    "is_primary": true
  }
]
```

#### Add Contact Person
```
POST /api/procurement/vendors/{id}/contact-persons/
Request Body:
{
  "name": "Jane Doe",
  "phone": "+1-555-0102",
  "email": "jane@supplier.com",
  "title": "Operations Manager"
}
Response: 201 Created
```

#### Update Contact Person
```
PATCH /api/procurement/vendors/{id}/contact-persons/{person_id}/
Request Body: { fields to update }
Response: 200 OK
```

#### Delete Contact Person
```
DELETE /api/procurement/vendors/{id}/contact-persons/{person_id}/
Response: 204 No Content
```

#### Get Audit Trail
```
GET /api/procurement/vendors/{id}/audit-trail/
Query Parameters: page, page_size
Response: 200 OK
{
  "count": 15,
  "results": [
    {
      "id": "uuid",
      "field_name": "status",
      "old_value": "pending",
      "new_value": "active",
      "changed_by": "user-id",
      "changed_at": "2026-05-31T10:30:00Z"
    }
  ]
}
```

#### Get Payment History
```
GET /api/procurement/vendors/{id}/payment-history/
Response: [payment records]
```

#### Get Vendor Performance
```
GET /api/procurement/vendors/{id}/performance/
Response: 200 OK
{
  "total_purchases": 50000,
  "order_count": 25,
  "avg_order_value": 2000,
  "on_time_delivery_rate": 95.5,
  "quality_score": 4.5,
  "last_order_date": "2026-05-20T14:00:00Z",
  "vendor_tenure_days": 500
}
```

---

## Database Requirements

### Vendor Model (Extensions)
```
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- [existing fields...]
- updated_by (UUID, foreign key to User, for audit)
- [soft delete: deleted_at]
```

### VendorAddress Model
```
- id (UUID, primary key)
- vendor_id (UUID, foreign key)
- address_type (Enum: billing|shipping|delivery|other)
- street (String, max 255)
- city (String, max 100)
- postal_code (String)
- country (String, optional)
- is_primary (Boolean, default False)
- created_at (DateTime)
- updated_at (DateTime)

Constraint: At least one is_primary per vendor
Indexes: (vendor_id, address_type), (vendor_id, is_primary)
```

### VendorContactPerson Model
```
- id (UUID, primary key)
- vendor_id (UUID, foreign key)
- name (String, max 100)
- phone (String)
- email (String)
- title (String, max 100, nullable)
- is_primary (Boolean, default False)
- created_at (DateTime)
- updated_at (DateTime)

Constraint: At least one contact per vendor
Constraint: At least one is_primary per vendor
Indexes: (vendor_id, is_primary)
```

### VendorBankAccount Model
```
- id (UUID, primary key)
- vendor_id (UUID, foreign key)
- bank_name (String, max 100)
- account_number (String, encrypted)
- account_holder (String, max 100)
- account_type (Enum: savings|checking|business)
- created_at (DateTime)
- updated_at (DateTime)

Encryption: AES-256 for account_number
Indexes: (vendor_id)
```

### VendorPerformance Model
```
- id (UUID, primary key)
- vendor_id (UUID, foreign key)
- order_count (Integer, default 0)
- total_purchases (Decimal, default 0)
- avg_order_value (Decimal, default 0)
- on_time_delivery_rate (Decimal, default 0)
- quality_score (Decimal, default 0)
- last_order_date (DateTime, nullable)
- vendor_tenure_days (Integer, default 0)
- last_updated (DateTime)

Indexes: (vendor_id)
```

### VendorAuditTrail Model
```
- id (UUID, primary key)
- vendor_id (UUID, foreign key)
- field_name (String)
- old_value (String, nullable)
- new_value (String, nullable)
- changed_by (UUID, foreign key to User)
- changed_at (DateTime)

Retention: Keep last 100 changes per vendor
Indexes: (vendor_id, changed_at), (changed_by)
```

---

## Deployment Strategy

### Pre-deployment
- All API endpoints implemented and tested
- Database migrations prepared
- Audit logging configured
- Address and contact models ready
- Bank account encryption setup

### Deployment Steps
1. Deploy backend API changes
2. Run database migrations (address, contact, audit models)
3. Migrate existing data (if needed)
4. Deploy frontend changes
5. Enable vendor edit feature flag
6. Monitor error rates

### Rollback Plan
- Maintain previous vendor edit if needed
- Database rollback script prepared
- Feature flag to disable quickly
- Data backup before migration

### Testing Requirements
- Unit tests for validation and business logic
- Integration tests for all API endpoints
- E2E tests for edit workflows
- Load testing with 100+ concurrent edits
- Security testing for bank account data
- Concurrent edit conflict testing
- Audit trail verification

### Staff Training
- Edit workflow walkthrough
- Multiple address management
- Contact person management
- Status change process
- Audit trail interpretation
- Permission requirements
- Best practices for bulk edits

---

## Performance Targets

### API Performance
- Load vendor data: <500ms
- Update vendor: <1s
- Address operations: <1s each
- Contact person operations: <500ms each
- Audit trail query: <500ms
- Performance metrics query: <300ms

### Frontend Performance
- Form render: <300ms
- Address list render: <200ms
- Contact list render: <200ms
- Audit trail render: <300ms
- Page load (full): <2s

### Resource Usage
- Memory usage: <50MB for edit form
- API response size: <2MB

---

## Monitoring & Alerting

### Metrics to Track
- Vendor edit success rate
- Form validation error frequency
- Average edit completion time
- Concurrent edit conflicts rate
- Audit trail query performance
- Address/contact operation latency
- Delete attempt rate
- Permission denial rate

### Alerts
- Edit success rate drops below 95%
- API latency exceeds 2s
- Concurrent edit conflicts detected
- Delete attempts for vendors with active POs
- Audit trail query slow (>1s)
- High form abandonment rate

### Dashboards
- Daily vendor edits count
- Edit type breakdown (field changed)
- User activity on vendors
- Edit latency trends
- Conflict detection metrics
- Delete request analytics

---

## Documentation Requirements

### User Documentation
- Vendor edit form guide
- Managing multiple addresses
- Adding/editing contact persons
- Changing payment terms
- Status change process
- Understanding performance metrics
- Viewing edit history (audit trail)
- Permission requirements
- Bulk edit limitations and workarounds

### Admin Documentation
- API endpoint documentation
- Database schema documentation
- Audit trail implementation
- Encryption setup
- Monitoring and alerting setup
- Performance tuning
- Data recovery procedures
- Backup strategies

### Developer Documentation
- Component architecture
- State management approach
- API integration patterns
- Validation implementation
- Audit logging implementation
- Testing guidelines
- Security best practices

---

## Future Enhancements

### Feature Improvements
- Bulk edit multiple vendors simultaneously
- Address validation and geocoding
- Bank account verification (micro-deposits)
- Identity verification workflow
- Vendor merge (consolidate duplicates)
- Communication history export
- Vendor segmentation tags
- Custom field support per tenant

### UX Enhancements
- Change history timeline visualization
- Side-by-side diff view for changes
- Revision/rollback capability
- Form autosave
- Quick edit modal (inline editing)
- Advanced search across all vendor data

### Integration Enhancements
- Integration with external vendor databases
- Real-time vendor status updates
- Automated vendor re-verification
- Third-party data enrichment
- API webhooks for vendor changes
- Data sync with ERP systems

### Analytics & Reporting
- Vendor relationship analytics
- Edit frequency by user
- Vendor data quality metrics
- Performance trend analysis
- Compliance reporting
- Data migration audit reports

