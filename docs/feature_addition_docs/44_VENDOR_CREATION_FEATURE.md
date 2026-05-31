# Vendor Creation Feature Specification

## Executive Summary

The Vendor Creation Feature enables procurement staff to register new suppliers into the LankaCommerce system with comprehensive contact information, banking details, and payment terms management. This interface provides a user-friendly form with robust validation and security measures for handling sensitive vendor data including encrypted bank account information.

---

## Current State

### Existing Implementation
- Basic vendor creation form partially implemented
- Company name and contact fields working
- Email and phone fields implemented
- Address fields working
- Bank account details incomplete
- Payment terms selector partially working
- Status selector implemented
- Vendor categories missing
- Form validation partially implemented
- Email/phone uniqueness check incomplete

### Known Limitations
- Missing vendor categories support
- Incomplete form validation
- Bank account encryption not implemented
- Email/phone uniqueness validation incomplete
- Lacking proper error messaging
- No duplicate detection
- Missing form state management

---

## Detailed Requirements

### Frontend Features

#### Form Header
- Page title: "Create New Vendor"
- Breadcrumb navigation
- Help icon with tooltip

#### Basic Information Section
- **Company Name Field**
  - Required indicator
  - Text input
  - Maximum 200 characters
  - Real-time character counter
  - Validation: Non-empty, alphanumeric with special chars allowed
- **Contact Person Name Field**
  - Required indicator
  - Text input
  - Maximum 100 characters
  - Validation: Non-empty, supports international names
- **Email Field**
  - Required indicator
  - Email input type
  - Real-time format validation
  - Uniqueness check (API call with debounce)
  - Error message if duplicate
- **Phone Field**
  - Required indicator
  - Phone input with format assistance
  - Country code selector
  - Format validation
  - Uniqueness check (optional, API call)

#### Address Section
- **Street Address Field**
  - Required indicator
  - Text input
  - Maximum 255 characters
  - Placeholder: "Street address"
- **City Field**
  - Required indicator
  - Dropdown with autocomplete
  - Searchable city list
  - Option to add new city (admin only)
- **Postal Code Field**
  - Required for certain regions
  - Text input
  - Format validation based on country
  - Placeholder: Postal code
- **Country Selector**
  - Required if multi-country support
  - Dropdown with search
  - Default to tenant country

#### Financial Information Section
- **Tax ID/VAT Number Field**
  - Optional indicator
  - Text input
  - Format validation by country
  - Tooltip: "Tax ID format examples"
  - Length validation
- **Bank Account Details Section** (Optional, with encryption note)
  - Prominent security notice: "Encrypted and secure"
  - **Bank Name Field**: Text input, max 100 chars
  - **Account Number Field**: 
    - Masked input (shows last 4 digits)
    - Input verification on save
    - Clear instructions
  - **Account Holder Name Field**: Text input, max 100 chars
  - **Account Type Selector**: Dropdown (Savings, Checking, Business)
- **Payment Terms Selector**
  - Required indicator
  - Dropdown with predefined terms
  - Option to add custom terms (admin)
- **Preferred Payment Method Selector**
  - Optional indicator
  - Dropdown: Bank Transfer, Check, Wire, Other
  - Corresponds with account type

#### Additional Information Section
- **Collapsible Design**: Expandable/collapsible
- **Vendor Notes Field**
  - Optional indicator
  - Text area
  - Maximum 1000 characters
  - Character counter
  - Placeholder: "Additional notes about vendor"
- **Vendor Categories Selector**
  - Optional indicator
  - Multi-select dropdown
  - Category list from API
  - Search within categories

#### Vendor Type & Classification
- **Vendor Type Selector**
  - Optional indicator
  - Dropdown: Supplier, Service Provider, Distributor, Other
- **Vendor Subcategory Selector**
  - Optional indicator
  - Dependent on vendor type
  - Dynamically populated

#### Status & Preferences
- **Status Selector**
  - Required indicator
  - Dropdown: Active, Pending, Inactive
  - Default: "Pending"
- **Preferred Vendor Checkbox**
  - Optional indicator
  - Checkbox toggle
  - Default: Unchecked
- **Verification Status Display**
  - Read-only field
  - Shows: "Not Started", "Pending", "Verified", "Rejected"
  - Default: "Not Started"
- **Verification Status Explanation**
  - Informational text explaining verification process

#### Form Validation & Feedback
- **Required Field Indicators**: Red asterisk (*)
- **Real-time Validation**: 
  - Email format validation
  - Phone format validation
  - Postal code validation
  - Tax ID format validation
- **Error Summary**: Display at top of form if validation fails
- **Field-level Error Messages**: Below each field
- **Success Indicators**: Green checkmark for valid fields

#### Action Buttons
- **Save Button**
  - Primary CTA (blue/highlighted)
  - Disabled until form is valid
  - Loading spinner during submission
- **Save & Continue Button**
  - Secondary action
  - Saves and stays on form (or shows success message)
  - Allows user to add another vendor
- **Cancel Button**
  - Secondary action
  - Link-style appearance
  - Shows unsaved changes warning if form has data

#### User Feedback
- **Loading State**: During form submission
  - Button shows spinner
  - Form inputs disabled
  - Loading message: "Creating vendor..."
- **Success Message**: After vendor created
  - Toast notification: "Vendor created successfully"
  - Automatic redirect to vendor list or edit page (configurable)
  - Duration: 3-5 seconds
- **Error Messages**: If creation fails
  - Display specific error below relevant field
  - API errors shown in error summary
  - Retry option available

---

## Validation & Edge Cases

### Email Validation
- RFC 5322 compliant format
- Uniqueness within tenant
- Whitespace trimming
- Case-insensitive comparison
- Debounced uniqueness check (300ms delay)

### Phone Validation
- Country-specific format validation
- Numeric validation with allowed formatting characters
- Uniqueness check (if enforced)
- International format support
- Placeholder format guidance

### Tax ID Validation
- Format validation by selected country
- Length validation
- Alphanumeric validation
- Placeholder examples by country

### Bank Account Validation
- Account number format validation
- Account holder name non-empty
- Bank name non-empty
- Account type selected
- Encryption before storage

### Address Validation
- Postal code format by country
- City existence validation
- Street address non-empty
- Optional geocoding (future enhancement)

### Name Validation
- International character support (Unicode)
- Special characters allowed (hyphens, apostrophes)
- No leading/trailing whitespace
- Minimum 2 characters

### Concurrent Creation Prevention
- Prevent double submission (button disabled after click)
- Prevent duplicate email/phone (server-side validation)
- Idempotent API design

### Timezone Handling
- Capture user timezone
- Store created_at in UTC
- Display in user's local timezone

---

## Testing Checklist

### Form Display
- [ ] Form displays all required and optional fields
- [ ] Required field indicators visible (asterisk)
- [ ] Form title displays correctly
- [ ] Breadcrumb navigation present
- [ ] All section headers display correctly

### Company Information
- [ ] Company name field accepts valid input
- [ ] Company name field rejects empty/whitespace only
- [ ] Company name field rejects >200 characters
- [ ] Contact person name accepts valid input
- [ ] Contact person name rejects empty
- [ ] Contact person supports international characters

### Email Field
- [ ] Email field validates RFC 5322 format
- [ ] Email field rejects invalid format
- [ ] Email field triggers uniqueness check after 300ms
- [ ] Duplicate email shows error message
- [ ] Email field case-insensitive validation

### Phone Field
- [ ] Phone field validates format for selected country
- [ ] Phone field rejects invalid format
- [ ] Phone field format assistance displays
- [ ] Country code selector works
- [ ] Phone field accepts international format

### Address Fields
- [ ] Street address accepts valid input
- [ ] City dropdown shows available cities
- [ ] City dropdown has search functionality
- [ ] Postal code format validated by country
- [ ] Country selector works

### Financial Information
- [ ] Tax ID field validates format by country
- [ ] Tax ID field accepts optional input
- [ ] Bank name field accepts input
- [ ] Account number field masked correctly
- [ ] Account holder name field accepts input
- [ ] Account type selector shows all options
- [ ] Payment terms selector shows all options
- [ ] Payment terms selection updates

### Additional Information
- [ ] Vendor notes text area accepts multi-line input
- [ ] Vendor notes field respects 1000 char limit
- [ ] Character counter displays correctly
- [ ] Additional section collapsible

### Vendor Classification
- [ ] Vendor type selector works
- [ ] Vendor subcategory selector populates based on type
- [ ] Vendor categories multi-select works
- [ ] Multiple categories can be selected

### Status & Preferences
- [ ] Status selector shows all options
- [ ] Default status is "Pending"
- [ ] Preferred vendor checkbox toggles
- [ ] Verification status shows "Not Started"

### Form Validation
- [ ] Form prevents submission if required fields empty
- [ ] Form prevents submission if email invalid
- [ ] Form prevents submission if phone invalid
- [ ] Save button disabled until form valid
- [ ] Save button enabled after form filled correctly
- [ ] Error summary displays at form top if validation fails
- [ ] Field-level error messages appear below fields

### Form Submission
- [ ] Save button shows loading state during submission
- [ ] Form inputs disabled during submission
- [ ] Save & continue saves without navigation
- [ ] Cancel button shows unsaved changes warning

### User Feedback
- [ ] Success message displays after creation
- [ ] Error message displays if creation fails
- [ ] Retry functionality works after error
- [ ] Loading states show during API calls
- [ ] Timeout handling works correctly

### Responsive Design
- [ ] Form renders correctly on mobile
- [ ] Form renders correctly on tablet
- [ ] Form renders correctly on desktop
- [ ] Form inputs touch-friendly on mobile

---

## Implementation Checklist

### Components
- [ ] Vendor creation form container component
- [ ] Form section components (basic info, address, financial)
- [ ] Text input field component with validation
- [ ] Email input field with uniqueness check
- [ ] Phone input field with format assistance
- [ ] Dropdown selector component
- [ ] Multi-select component for categories
- [ ] Checkbox component for preferences
- [ ] Form buttons component

### Form Handling
- [ ] Form state management (React Hook Form or similar)
- [ ] Field value binding
- [ ] Form reset functionality
- [ ] Unsaved changes detection
- [ ] Form dirty state tracking

### Validation
- [ ] Email format validator
- [ ] Phone format validator (country-aware)
- [ ] Tax ID format validator (country-aware)
- [ ] Postal code validator (country-aware)
- [ ] Name validator (Unicode support)
- [ ] Required field validation

### API Integration
- [ ] Email uniqueness validation endpoint call (debounced)
- [ ] Phone uniqueness validation endpoint call (debounced)
- [ ] Vendor creation endpoint call
- [ ] Error handling and display
- [ ] Timeout handling
- [ ] Retry logic

### Data Processing
- [ ] Email/phone whitespace trimming
- [ ] Bank account encryption before submission
- [ ] Country-specific field validation
- [ ] Timezone capture and storage

### UX Features
- [ ] Loading states with spinner
- [ ] Success notification (toast)
- [ ] Error notifications
- [ ] Field-level error messages
- [ ] Character counters
- [ ] Help tooltips
- [ ] Clear form state management
- [ ] Form reset after success

### Security
- [ ] Bank account data encryption
- [ ] No sensitive data logging
- [ ] XSS prevention in form inputs
- [ ] CSRF token handling
- [ ] SQL injection prevention (server-side)

### Accessibility
- [ ] ARIA labels on form fields
- [ ] Required field indicators
- [ ] Error message associations
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Screen reader compatibility

### Responsive Design
- [ ] Mobile layout optimization
- [ ] Tablet layout optimization
- [ ] Desktop layout optimization
- [ ] Touch-friendly form controls
- [ ] Appropriately sized buttons

---

## Backend API Requirements

### Endpoints

#### Create Vendor
```
POST /api/procurement/vendors/
Request Body:
{
  "company_name": "string (required, max 200)",
  "contact_person": "string (required, max 100)",
  "email": "string (required, email format)",
  "phone": "string (required, phone format)",
  "address_street": "string (required, max 255)",
  "address_city": "string (required, max 100)",
  "address_postal_code": "string (required)",
  "tax_id": "string (optional)",
  "bank_account_details": {
    "bank_name": "string",
    "account_number": "string (encrypted)",
    "account_holder": "string",
    "account_type": "string (savings|checking|business)"
  },
  "payment_terms": "string (required)",
  "preferred_payment_method": "string (optional)",
  "notes": "string (optional, max 1000)",
  "status": "string (required: active|pending|inactive)",
  "is_preferred": "boolean (optional)",
  "vendor_type": "string (optional)",
  "categories": ["uuid"] (optional)
}

Response: 201 Created
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
  "status": "pending",
  "is_preferred": false,
  "verification_status": "not_started",
  "created_at": "2026-05-31T10:30:00Z",
  "updated_at": "2026-05-31T10:30:00Z"
}
```

#### Validate Email
```
POST /api/procurement/vendors/validate-email/
Request Body: { "email": "john@supplier.com" }
Response: { "valid": true, "duplicate": false }
```

#### Validate Phone
```
POST /api/procurement/vendors/validate-phone/
Request Body: { "phone": "+1-555-0100" }
Response: { "valid": true, "duplicate": false }
```

#### Get Cities
```
GET /api/procurement/cities/
Query Parameters:
  - country_code (optional)
  - search (optional)

Response: [
  { "id": "uuid", "name": "New York", "country": "US" }
]
```

#### Get Payment Terms
```
GET /api/procurement/payment-terms/
Response: [
  { "id": "uuid", "term": "Net 30" },
  { "id": "uuid", "term": "Net 60" }
]
```

#### Get Vendor Categories
```
GET /api/procurement/vendor-categories/
Response: [
  { "id": "uuid", "category_name": "Raw Materials" }
]
```

---

## Database Requirements

### Vendor Model
```
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- company_name (String, max 200, indexed)
- contact_person (String, max 100)
- email (String, indexed, unique constraint with tenant_id)
- phone (String, indexed)
- address_street (String, max 255)
- address_city (String, max 100)
- address_postal_code (String)
- tax_id (String, nullable)
- bank_account_details (JSON, encrypted at rest, nullable)
- payment_terms (String, foreign key to PaymentTerms)
- preferred_payment_method (String, nullable)
- notes (Text, max 1000, nullable)
- status (Enum: active|pending|inactive)
- is_preferred (Boolean, default False)
- vendor_type (String, nullable)
- verification_status (Enum: not_started|pending|verified|rejected)
- created_by (UUID, foreign key to User)
- created_at (DateTime, indexed)
- updated_at (DateTime)
- deleted_at (DateTime, nullable - soft delete)
```

### Database Constraints
- Unique constraint: (tenant_id, email)
- Unique constraint: (tenant_id, phone) - if enforced
- Foreign key: tenant_id → Tenant.id
- Foreign key: payment_terms → PaymentTerms.id
- Check constraint: company_name length > 0

### Encryption
- Bank account details encrypted with AES-256
- Encryption key stored in secure vault
- IV (initialization vector) stored with encrypted data
- No bank account data in logs

### Indexes
```
- (tenant_id, email)
- (tenant_id, status)
- (email)
- (created_at)
```

---

## Deployment Strategy

### Pre-deployment
- All API endpoints implemented and tested
- Database schema ready
- Encryption keys generated and stored
- API documentation updated
- Test data prepared

### Deployment Steps
1. Deploy backend API changes
2. Run database migrations
3. Verify encryption setup
4. Deploy frontend changes
5. Enable vendor creation feature flag
6. Monitor error rates

### Rollback Plan
- Maintain previous vendor creation if needed
- Database rollback script prepared
- Feature flag to disable quickly
- Data backup before deployment

### Testing Requirements
- Unit tests for validation
- Integration tests for API endpoints
- E2E tests for form submission
- Load testing (100 concurrent creations)
- Security testing for bank account encryption
- Email/phone validation testing

### Staff Training
- Form field explanation
- Required vs optional fields
- Payment terms guidelines
- Bank account security
- Tax ID format examples by country
- Data entry best practices

---

## Performance Targets

### Form Performance
- Form rendering: <300ms
- Form initial load: <500ms (with dropdown data)
- City list search: <200ms

### API Performance
- Email validation: <200ms (with debounce 300ms)
- Phone validation: <200ms (with debounce 300ms)
- Vendor creation: <1s
- Payment terms retrieval: <100ms
- Vendor categories retrieval: <100ms

### User Experience
- Form input response: <100ms
- Save button feedback: Immediate
- Success notification: Displays within 500ms

---

## Monitoring & Alerting

### Metrics to Track
- Vendor creation success rate
- Form validation error frequency by field
- Email/phone duplication attempt rate
- Average form completion time
- Form abandonment rate
- API creation latency (P50, P95, P99)
- Error rate by error type

### Alerts
- Creation success rate drops below 95%
- API latency exceeds 2s
- Email validation latency exceeds 500ms
- High form abandonment rate (>30%)
- Database constraint violations

### Dashboards
- Daily vendor creation count
- Form completion funnel
- Validation error breakdown
- API performance metrics
- User behavior analytics

---

## Documentation Requirements

### User Documentation
- Vendor creation form walkthrough
- Required vs optional fields explanation
- Email format requirements
- Phone format requirements (by country)
- Payment terms definitions
- Bank account security and privacy
- Tax ID format examples by country
- Tips for entering international vendor names
- Preferred vendor criteria
- Status explanation

### Admin Documentation
- API endpoint documentation
- Database schema documentation
- Encryption setup and key management
- Form validation rules
- Security considerations
- Monitoring setup
- Backup procedures
- Data recovery procedures

### Developer Documentation
- Component architecture
- Form state management approach
- Validation rule implementation
- API integration examples
- Testing guidelines
- Encryption implementation details

---

## Future Enhancements

### Feature Improvements
- Vendor import from file (bulk creation)
- Vendor template presets (quick create)
- Address validation and geocoding
- Tax ID lookup API integration
- Duplicate detection on creation
- Vendor onboarding wizard
- Integration with external supplier databases

### UX Enhancements
- Multi-step form wizard (if form grows)
- Autosave form progress
- Form templates by vendor type
- Mobile app support
- Voice input for phone numbers

### Data Enhancements
- Company registration number lookup
- Business profile data pre-fill
- Automated vendor verification workflow
- Credit check integration
- Social proof indicators

### Integrations
- Third-party vendor database integration
- ERP system sync
- Email verification workflow
- Document upload (certificates, licenses)
- Bank account verification (micro-deposits)

