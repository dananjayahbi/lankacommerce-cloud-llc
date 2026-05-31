# Tenant Configuration Settings Feature Specification

**Document ID:** 106  
**Feature Name:** Tenant Configuration Settings  
**Date:** May 31, 2026  
**Status:** Specification Document  
**Priority:** High

---

## Executive Summary

The Tenant Configuration Settings feature provides self-service tenant account management including tenant branding, domain configuration, localization settings, and theme customization. This enables business owners to customize their system instance with business identity and preferences without requiring SaaS administrator intervention.

---

## Current State Analysis

### EXISTING IMPLEMENTATION

- **Tenant Model:** Exists with basic fields (tenant_id, tenant_name, slug/domain)
- **Tenant Management Pages:** List and detail pages exist for super-admin view
- **Tenant Provisioning Wizard:** Complete workflow for creating new tenants
- **Multi-tenant Data Isolation:** Fully implemented with tenant_id fields throughout
- **Settings Infrastructure:** Tenant-level settings support exists
- **Subscription/Plan System:** Complete billing and plan system in place
- **Tenant Service Layer:** Service classes for tenant operations available

### MISSING / PARTIALLY IMPLEMENTED

- **Tenant Settings Tab UI:** Self-service UI component not implemented
- **Tenant Name Editing:** No self-service interface to edit tenant name
- **Tenant Domain Display:** Custom domain input and management not in UI
- **Logo Upload & Management:** Self-service logo upload not available
- **Theme Color Selector:** No color customization interface
- **Timezone Selector:** Regional settings not exposed in self-service
- **Currency Selector:** Currency preference not in self-service UI
- **Language Preference Selector:** Language selection not implemented
- **Tenant Settings API Endpoints:** Self-service PATCH/PUT endpoints missing
- **Persistent Branding Configuration:** Database schema incomplete for all branding fields
- **Domain Verification System:** Custom domain validation not implemented
- **SSL Certificate Configuration:** Not applicable yet (custom domains not supported)
- **Branding Preview Functionality:** Real-time preview not available
- **Logo Storage and Delivery:** File storage integration incomplete
- **Settings Form Validation:** Frontend validation not implemented
- **Settings Change Notifications:** Email/notification system for changes not in place

---

## Frontend Features

### Page Header

- **Title:** "Tenant Settings" displayed prominently
- **Breadcrumb Navigation:** Shows current location (Tenant Settings > Settings)
- **Save Changes Button:** Primary action button (enabled only on form changes)
- **Cancel Button:** Secondary action to discard changes

### Settings Navigation Tabs

Three main tabs in the tenant self-service settings area:
- **Tenant Settings** (active tab for this feature)
- **Subscription & Billing** (separate feature document)
- **Features & Modules** (separate feature document)

### Tenant Settings Tab Content

#### **Tenant Information Section**

- **Tenant Name Field**
  - Editable text input field
  - Required validation (cannot be empty)
  - Help text: "The name of your business as displayed in the system"
  - Character limit: 255 characters
  - Real-time validation feedback

- **Tenant Domain Display**
  - Read-only field showing domain (e.g., "mybusiness.lankacommerce.cloud")
  - Copy-to-clipboard button
  - Context: Shows the default domain assigned to tenant

- **Custom Domain Input (Optional)**
  - Domain name text input field
  - DNS verification instructions (collapsible/modal)
  - Verification status indicator:
    - "Not configured" - gray
    - "Verification pending" - yellow
    - "Verified" - green
    - "Failed" - red
  - Edit/remove buttons for existing custom domain
  - "Add custom domain" button
  - Help text with DNS setup instructions

#### **Branding Section**

- **Logo Upload**
  - Drag-and-drop zone or click to upload
  - Currently uploaded logo display (if exists)
  - Logo preview on file selection
  - "Remove logo" button (if logo exists)
  - Recommended size: 250x100 pixels
  - Supported formats: JPG, PNG, SVG
  - Max file size: 5MB
  - Preview update in real-time

- **Theme Color Selector**
  - Color picker input (with color picker UI)
  - Preset color palette: 8-10 predefined colors
  - Hex code display and manual input option
  - Live preview of theme with selected color
  - Default color indication

- **Business Tagline Field (Optional)**
  - Text area input
  - Short description of business (optional)
  - Character count display (current / max 255)
  - Help text: "A brief description visible on your public pages"

#### **Regional & Localization Section**

- **Timezone Selector**
  - Dropdown with searchable list
  - Grouped by region (Asia/Colombo, Europe/London, etc.)
  - Search/filter by timezone name
  - Current timezone display
  - "Auto-detect from browser" option
  - Default: System/tenant-configured timezone

- **Currency Selector**
  - Dropdown with currency options
  - Currency code display (LKR, USD, EUR, etc.)
  - Currency symbol display (Rs., $, €)
  - Default: LKR (Sri Lankan Rupee)
  - Help text: "Currency used for pricing and transactions"

- **Language Preference Selector**
  - Dropdown with available languages
  - Options: English (default), Sinhala, Tamil, others as configured
  - Flag icons for each language
  - Help text: "Default language for the system interface"

- **Date Format Selector**
  - Dropdown with format options:
    - DD/MM/YYYY
    - MM/DD/YYYY
    - YYYY-MM-DD
  - Preview of selected format (e.g., "31/05/2026")
  - Default: DD/MM/YYYY

- **Time Format Selector**
  - Radio buttons or toggle:
    - 12-hour format (with AM/PM)
    - 24-hour format
  - Example display for selected format
  - Default: 12-hour

### Save Section

- **Save Changes Button**
  - Primary button style
  - Disabled when no changes made
  - Loading spinner while saving
  - Disabled state during submission

- **Cancel Button**
  - Secondary button style
  - Discards unsaved changes
  - Confirmation dialog if changes exist

- **Unsaved Changes Warning**
  - Visual indicator (asterisk in title, warning icon)
  - Browser warning on page navigation if unsaved changes

- **Success Message**
  - Toast notification: "Tenant settings updated successfully"
  - Auto-dismiss after 5 seconds

- **Error Message**
  - Toast notification with error details
  - Retry button if applicable
  - Error details expandable

### Alternative Layout: Settings Sidebar/Card

- **Current Tenant Info Card**
  - Display tenant name
  - Display tenant domain
  - Display current logo
  - Edit button for each section

- **Current Settings Card**
  - Timezone display
  - Currency display
  - Language display
  - Quick edit buttons

---

## Backend API Requirements

### GET /api/tenants/self/

**Purpose:** Retrieve current tenant details  
**Authentication:** Required (tenant user)  
**Response (200):**
```
{
  "tenant_id": "uuid",
  "name": "My Business",
  "slug": "my-business",
  "custom_domain": "mybusiness.com",
  "logo_url": "https://cdn.lankacommerce.cloud/tenants/uuid/logo.png",
  "theme_color": "#3498db",
  "timezone": "Asia/Colombo",
  "currency": "LKR",
  "language": "en",
  "date_format": "DD/MM/YYYY",
  "time_format": "12h",
  "tagline": "Leading business solutions in Sri Lanka"
}
```

### PATCH /api/tenants/self/

**Purpose:** Update tenant settings  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "name": "Updated Business Name",
  "timezone": "Asia/Colombo",
  "currency": "LKR",
  "language": "en",
  "date_format": "DD/MM/YYYY",
  "time_format": "12h",
  "theme_color": "#3498db",
  "tagline": "Updated tagline"
}
```
**Response (200):** Updated tenant settings (same format as GET)  
**Validation Errors (400):**
- Name required and non-empty
- Valid timezone IANA code
- Valid ISO 4217 currency code
- Valid supported language
- Valid hex color code

### POST /api/tenants/self/logo/

**Purpose:** Upload tenant logo  
**Authentication:** Required (tenant admin)  
**Request:** Multipart form data
- Field: `logo` (file, max 5MB)
- Supported formats: JPG, PNG, SVG
**Response (201):**
```
{
  "logo_url": "https://cdn.lankacommerce.cloud/tenants/uuid/logo.png",
  "size": "102.5 KB",
  "dimensions": "250x100"
}
```
**Error (413):** File too large

### DELETE /api/tenants/self/logo/

**Purpose:** Remove tenant logo  
**Authentication:** Required (tenant admin)  
**Response (200):**
```
{
  "success": true,
  "message": "Logo removed successfully"
}
```

### POST /api/tenants/self/custom-domain/

**Purpose:** Add custom domain  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "domain": "mybusiness.com"
}
```
**Response (201):**
```
{
  "domain": "mybusiness.com",
  "verification_token": "abc123def456",
  "dns_records": [
    {
      "type": "CNAME",
      "name": "@",
      "value": "lankacommerce.cloud",
      "ttl": 3600
    }
  ],
  "verification_status": "pending"
}
```
**Error (400):** Invalid domain format or domain already in use

### POST /api/tenants/self/custom-domain/{domain}/verify/

**Purpose:** Verify custom domain ownership  
**Authentication:** Required (tenant admin)  
**Request Body:**
```
{
  "verification_code": "abc123def456"
}
```
**Response (200):**
```
{
  "verified": true,
  "domain": "mybusiness.com",
  "active_date": "2026-05-31T10:00:00Z"
}
```
**Error (400):** Invalid or expired verification code

### DELETE /api/tenants/self/custom-domain/

**Purpose:** Remove custom domain  
**Authentication:** Required (tenant admin)  
**Response (200):**
```
{
  "success": true,
  "message": "Custom domain removed",
  "domain_reverted": "my-business.lankacommerce.cloud"
}
```

---

## Database Requirements

### Tenant Model Extensions

Add the following fields to the Tenant model:

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| theme_color | CharField (7) | Yes | "#3498db" | Hex color code for theme |
| logo | ImageField/FileField | Yes | NULL | Path to logo image |
| timezone | CharField (50) | No | "Asia/Colombo" | IANA timezone |
| currency | CharField (3) | No | "LKR" | ISO 4217 code |
| language | CharField (5) | No | "en" | Language code (en, si, ta) |
| date_format | CharField (10) | No | "DD/MM/YYYY" | Date format preference |
| time_format | CharField (3) | No | "12h" | 12h or 24h |
| tagline | TextField | Yes | NULL | Business tagline (max 255) |
| custom_domain | CharField (255) | Yes | NULL | Custom domain name |
| domain_verified | BooleanField | No | False | Custom domain verification status |
| domain_verification_token | CharField (100) | Yes | NULL | Verification token |
| domain_verified_date | DateTimeField | Yes | NULL | When domain was verified |

### Indexes

```
CREATE INDEX idx_tenant_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenant_domain_verified ON tenants(domain_verified);
CREATE INDEX idx_tenant_slug ON tenants(slug);
```

### Migration Steps

1. Add new columns (nullable)
2. Set default values for existing tenants
3. Add NOT NULL constraint after backfill
4. Create indexes

---

## Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Tenant model | ✓ Exists | Needs extensions for new fields |
| Tenant detail page | ✓ Exists | Display-only, needs edit functionality |
| Logo upload | ✗ Not implemented | Needs file storage, API endpoint |
| Theme color | ✗ Not implemented | Needs color picker, preview |
| Timezone selector | ✗ Not implemented | Needs UI component, validation |
| Currency selector | ✗ Not implemented | Needs UI component, validation |
| Language preference | ✗ Not implemented | Needs UI component, i18n integration |
| Date/time format | ✗ Not implemented | Needs UI components, format handling |
| Custom domain | ✗ Not implemented | Needs DNS verification, validation |
| Domain verification | ✗ Not implemented | Needs token generation, verification logic |
| Settings API endpoints | ✗ Not implemented | PATCH endpoint needed |
| File storage | ✗ Not configured | Needs S3 or local storage setup |
| Logo CDN delivery | ✗ Not configured | Needs CDN integration |
| Settings validation | ✗ Not implemented | Frontend and backend validation |
| Change notifications | ✗ Not implemented | Email/notification system |

---

## Validation & Edge Cases

### Tenant Name Validation

- Required field (cannot be empty or whitespace-only)
- Max 255 characters
- No special characters except hyphens and underscores
- Changes logged to audit trail

### Logo Validation

- File size: max 5MB
- Formats: JPG, PNG, SVG only
- Dimensions: recommend 250x100 pixels, auto-resize if needed
- Anti-malware scan before storage
- Old logo replaced, not versioned

### Theme Color Validation

- Must be valid hex color code (#RRGGBB)
- Converted to lowercase for consistency
- Used for primary branding throughout system

### Timezone Validation

- Must be valid IANA timezone identifier
- Auto-detect from browser timezone (optional)
- Affects all date/time displays for tenant
- Affects scheduled job execution times

### Domain Validation

- Custom domain must be valid domain format
- No reserved domains (lankacommerce.cloud, etc.)
- No conflicts with existing tenant domains
- Must not be subdomain of lankacommerce.cloud
- DNS propagation can take 24-48 hours
- Verification token expires after 7 days
- Only one custom domain per tenant

### Settings Change Constraints

- Settings changes do not affect existing data
- Logo changes take effect immediately
- Timezone changes apply to future events only
- Language changes apply to logged-in session only
- Currency changes apply to new transactions only
- No concurrent changes allowed (last write wins)

### Error Scenarios

- Network timeout during logo upload → retry available
- Domain verification fails → show DNS instructions
- Invalid timezone → fallback to default
- Corrupted logo file → reject with error message
- Concurrent settings update → last update wins

---

## Testing Checklist

### Tenant Settings Display

- [ ] Tenant settings page loads without errors
- [ ] Current tenant name displays in form
- [ ] Tenant domain displays as read-only
- [ ] Current logo displays if exists
- [ ] Current theme color displays
- [ ] Current timezone, currency, language display
- [ ] Current date/time format displays

### Tenant Name Editing

- [ ] Tenant name field is editable
- [ ] Entering invalid name shows validation error
- [ ] Valid name can be entered and submitted
- [ ] Changes persist after page reload
- [ ] Audit log created for name change

### Domain Configuration

- [ ] Current domain displays (read-only)
- [ ] Copy-to-clipboard button works
- [ ] Add custom domain button visible
- [ ] Custom domain input accepts valid domain
- [ ] Invalid domain shows error message
- [ ] Verification status updates on submission
- [ ] Verification instructions display correctly

### Logo Upload

- [ ] Logo upload area visible
- [ ] Drag-and-drop accepts image files
- [ ] Click to upload opens file selector
- [ ] Preview displays before upload
- [ ] File size validation works (reject >5MB)
- [ ] File type validation works (only images)
- [ ] Upload completes without errors
- [ ] New logo displays after upload
- [ ] Remove logo button works
- [ ] Old logo replaced correctly

### Theme Color Selection

- [ ] Color picker component displays
- [ ] Preset colors selectable
- [ ] Hex color input accepts manual entry
- [ ] Color preview updates on selection
- [ ] Valid hex code required
- [ ] Selected color persists after save

### Timezone Selector

- [ ] Timezone dropdown displays all timezones
- [ ] Search/filter works
- [ ] Current timezone pre-selected
- [ ] Auto-detect option works
- [ ] Selected timezone persists

### Currency Selector

- [ ] Currency dropdown displays options
- [ ] Current currency pre-selected
- [ ] Currency code and symbol display correctly
- [ ] Selected currency persists

### Language Selector

- [ ] Language dropdown displays available languages
- [ ] Current language pre-selected
- [ ] Language preference persists
- [ ] System UI updates to selected language (next session)

### Date/Time Format

- [ ] Date format selector shows all options
- [ ] Preview shows example of selected format
- [ ] Time format toggle works (12h/24h)
- [ ] Time format preview updates
- [ ] Selections persist

### Save Functionality

- [ ] Save button disabled when no changes
- [ ] Save button enabled after changes
- [ ] Cancel button discards changes
- [ ] Success message displays on save
- [ ] Changes visible after page reload
- [ ] Error message displays if save fails
- [ ] Validation errors prevent save

### Responsive Design

- [ ] Mobile layout displays correctly
- [ ] Tablet layout displays correctly
- [ ] Desktop layout displays correctly
- [ ] Form is usable on all screen sizes
- [ ] File upload works on mobile browsers

---

## Implementation Checklist

### Frontend Components

- [ ] Tenant settings page component
- [ ] Tenant information section component
- [ ] Branding section component
- [ ] Localization section component
- [ ] Logo upload component (with drag-drop)
- [ ] Color picker component (or use library)
- [ ] Timezone selector component
- [ ] Currency selector component
- [ ] Language selector component
- [ ] Custom domain component
- [ ] Domain verification component
- [ ] Form submission handler

### Frontend Logic

- [ ] API client methods for all endpoints
- [ ] State management (Redux/Context for settings)
- [ ] Form validation (frontend)
- [ ] File upload handling
- [ ] Error handling and retry logic
- [ ] Success notification display
- [ ] Loading states during API calls
- [ ] Unsaved changes detection
- [ ] Navigation warnings
- [ ] Real-time preview updates

### Backend API

- [ ] GET /api/tenants/self/ endpoint
- [ ] PATCH /api/tenants/self/ endpoint
- [ ] POST /api/tenants/self/logo/ endpoint
- [ ] DELETE /api/tenants/self/logo/ endpoint
- [ ] POST /api/tenants/self/custom-domain/ endpoint
- [ ] POST /api/tenants/self/custom-domain/{domain}/verify/ endpoint
- [ ] DELETE /api/tenants/self/custom-domain/ endpoint
- [ ] Serializers for all endpoints

### Backend Services

- [ ] Tenant settings service
- [ ] Logo storage and retrieval service
- [ ] Custom domain service
- [ ] Domain verification service
- [ ] File validation service
- [ ] Timezone/currency validation service

### Database

- [ ] Tenant model migrations
- [ ] New field indexes
- [ ] Data backfill for existing tenants
- [ ] Migration rollback procedures

### Security

- [ ] File upload validation (MIME type, size)
- [ ] Logo scan for malware/unsafe content
- [ ] CSRF protection on form submission
- [ ] Authorization check (tenant admin only)
- [ ] SQL injection prevention
- [ ] XSS protection on displayed data

### File Storage

- [ ] File storage backend configured (S3 or local)
- [ ] File deletion on logo removal
- [ ] File size limits enforced
- [ ] Directory structure organized
- [ ] Cleanup job for orphaned files

### Logging & Audit

- [ ] Settings change logged to audit trail
- [ ] Failed API calls logged
- [ ] File upload attempts logged
- [ ] Domain verification attempts logged
- [ ] User ID captured in logs

### Testing

- [ ] Unit tests for backend services
- [ ] Integration tests for API endpoints
- [ ] Component tests for frontend
- [ ] End-to-end tests for user flow
- [ ] Performance tests
- [ ] Security tests

### Documentation

- [ ] API endpoint documentation
- [ ] Frontend component documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] User guide for tenant administrators

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review:** Full review of all changes
2. **Testing:** Run full test suite
3. **Performance Testing:** Verify load times
4. **Security Audit:** Check for vulnerabilities
5. **Documentation:** Ensure all docs current
6. **Backup:** Create database backup

### Deployment Steps

1. **Database Migration**
   - Deploy migration script
   - Verify schema changes
   - Backfill default values for existing tenants

2. **File Storage Setup**
   - Configure S3 or local file storage
   - Create necessary directories/buckets
   - Set appropriate permissions

3. **Backend Deployment**
   - Deploy API endpoints
   - Deploy services and serializers
   - Verify endpoints working

4. **Frontend Deployment**
   - Deploy tenant settings components
   - Deploy updated navigation
   - Verify pages load correctly

5. **Testing Phase**
   - Update tenant settings manually
   - Verify changes persist
   - Test logo upload
   - Test custom domain flow
   - Test on staging environment

### Post-Deployment

1. **Monitoring**
   - Monitor API error rates
   - Monitor file upload errors
   - Monitor performance metrics

2. **Staff Training**
   - Train support team on feature
   - Prepare FAQ and troubleshooting guide
   - Demo feature in team meeting

3. **User Communication**
   - Announce feature to tenants
   - Provide user guide
   - Offer support during rollout

### Rollback Plan

- **If Critical Issue:** Rollback database migration
- **Maintain Data:** All tenant data remains intact
- **Previous UI:** Revert frontend to previous version
- **Verification:** Test rollback on staging first

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Settings page load | <300ms | Initial page render |
| Settings save | <500ms | API response time |
| Logo upload | <2s | For typical 100-500KB file |
| Logo display | Optimized | Use image optimization/CDN |
| Custom domain verify | <1s | Quick DNS check |
| Form validation | <100ms | Real-time validation |

### Performance Optimization

- **Lazy load:** Logo only on tab focus
- **Image optimization:** Resize/compress logos on upload
- **Caching:** Cache tenant settings in Redis
- **CDN:** Serve logos from CDN
- **Database:** Index on tenant_id for quick lookups
- **Compression:** Gzip API responses

---

## Monitoring & Alerting

### Metrics to Track

- Settings update frequency (daily/weekly)
- Logo upload success/failure rate
- Custom domain setup attempts
- Domain verification success rate
- API response times
- File storage usage
- Error rates by endpoint

### Alerts

- **Alert on:** Failed settings save (>5% failure rate)
- **Alert on:** Failed logo upload (>10% failure rate)
- **Alert on:** Failed domain verification (>20% failure rate)
- **Alert on:** High storage usage (>80% of quota)
- **Alert on:** Slow API response times (>2s)

### Dashboard

- Daily active tenants updating settings
- Most commonly changed settings
- Logo upload volume
- Custom domain adoption rate
- Error trends by endpoint

---

## Documentation Requirements

### For Users

1. **Tenant Settings Guide**
   - How to access settings
   - Step-by-step for each field
   - Examples of values
   - Troubleshooting

2. **Logo Upload Guide**
   - Recommended logo size/format
   - How to upload
   - How to remove
   - Troubleshooting upload issues

3. **Custom Domain Setup Guide**
   - How to add custom domain
   - DNS verification steps
   - How long it takes
   - How to remove domain

4. **Timezone/Currency/Language Guide**
   - How to select timezone
   - How to change currency
   - How to change language
   - Effect on displays

5. **Troubleshooting Guide**
   - Settings not saving
   - Logo upload failing
   - Domain verification stuck
   - Timezone not applying

### For Administrators

1. **API Documentation**
   - Endpoint specs
   - Request/response examples
   - Error codes
   - Authentication details

2. **Deployment Guide**
   - Installation steps
   - Configuration options
   - Database migration
   - Monitoring setup

3. **File Storage Guide**
   - S3 configuration
   - Local storage setup
   - Backup procedures
   - Cleanup tasks

---

## Future Enhancements

### Short Term

- **Settings Versioning:** Track changes over time, rollback capability
- **Settings Templates:** Pre-configured settings for common scenarios
- **Bulk Tenant Updates:** Admin tool to update multiple tenants
- **Settings Export/Import:** Backup and restore settings

### Medium Term

- **White-label Customization:** Advanced branding options
- **Custom CSS:** Allow CSS customization for advanced users
- **Custom Fonts:** Upload and use custom fonts
- **Email Template Branding:** Customize email templates with logo

### Long Term

- **Theme Marketplace:** Pre-built themes available
- **Advanced Theming:** CSS variables, component customization
- **Multi-store Branding:** Different branding per store/location
- **Settings Synchronization:** Sync settings across multiple instances
- **Settings Validation:** Advanced validation rules
- **Conditional Settings:** Show/hide fields based on plan or other settings

---

**End of Document 106**
