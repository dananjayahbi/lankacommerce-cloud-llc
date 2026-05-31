# Settings Page - General & Financial Settings Feature Specification

## Executive Summary

Settings Page providing comprehensive system configuration covering general business settings, financial parameters, and module management enabling administrators to configure tax, accounting methods, currencies, timezones, and feature enablement.

## Current State Analysis

### EXISTING:
- Django settings configuration (base.py, development.py, production.py)
- Tenant model with settings support (_default_tenant_settings)
- HardwareSettingsView backend endpoint (partial)
- Settings page scaffold (frontend/src/app/(store)/store/settings/page.tsx)
- HardwareSettingsForm component (partial)
- Some multi-tenant configuration capability

### MISSING (Partially implemented or incomplete):
- General Settings Tab UI (business details section)
- Business name field
- Business address fields (street, city, postal code, country)
- Business phone field
- Business email field
- Business registration number field
- Tax ID/VAT number field
- Business logo upload and management
- Currency selector
- Timezone selector
- Date format selector
- Time format selector
- Fiscal year start date selector
- Persistent storage for general settings
- Financial Settings Tab UI
- Tax configuration (VAT/SVAT rate)
- Tax compliance settings
- Accounting method selector (cash/accrual)
- Financial period configuration
- Default tax category selector
- Rounding rules configuration
- Currency configuration for financials
- Module Settings Tab UI
- Module enable/disable toggles (products, inventory, sales, POS, HR, accounting, etc.)
- Module-specific configurations
- Feature toggles
- Real-time validation
- Error handling and recovery

## Frontend Features

### General Settings Tab

#### Page Structure
- Page header:
  - "Settings" title
  - Breadcrumb navigation
  - Save button
- Settings navigation (left sidebar or tabs):
  - General Settings (active)
  - Financial Settings
  - Module Settings (if admin)
  - Notification Settings (separate doc)
  - Integration Settings (separate doc)

#### General Settings Section
**Business Details section:**
- Business Name field (required, text input)
- Business Registration Number field (text input)
- Business Type selector (enterprise/SME/other)

**Address section:**
- Street Address field (text input)
- City field (text input)
- Postal Code field (text input)
- Country selector (dropdown)
- Region/Province field (text input)

**Contact section:**
- Primary Phone field (text input, phone format validation)
- Business Email field (email input, validation)
- Alternate Phone field (optional)
- Alternate Email field (optional)

**Branding section:**
- Logo upload (image file, preview)
- Logo remove button
- Business tagline field (optional, text area)

**Regional & Locale section:**
- Timezone selector (dropdown, auto-detect option)
- Currency selector (dropdown, default LKR)
- Language selector (dropdown, currently English)
- Date Format selector (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
- Time Format selector (12-hour, 24-hour)
- First Day of Week selector (Sunday/Monday)

**Fiscal Configuration section:**
- Fiscal Year Start Date picker
- Fiscal Period Configuration (monthly/quarterly/annual)
- Financial Year Display (read-only)

### Financial Settings Tab

#### Financial Settings Section
**Tax Configuration section:**
- Default VAT Rate field (number input, percentage)
- VAT Registration Number field (conditional visibility)
- Tax Compliance Standard selector (Sri Lanka VAT format)
- Tax Rounding Method selector (round up, round down, nearest, truncate)

**Accounting Configuration section:**
- Accounting Method selector (Cash/Accrual, radio buttons)
- Default Account for Cash Receivables selector
- Default Account for Cash Payables selector
- Default Account for Customer Deposits selector
- Default Account for Vendor Prepayments selector

**Financial Period Configuration section:**
- Financial Period Definition (display, read-only)
- Lock Periods toggle (protect closed periods from editing)
- Period Lock Date picker

**Currency Configuration section:**
- Primary Currency selector (default LKR)
- Secondary Currencies (multi-select, optional)
- Exchange Rate Update Frequency (auto, daily, weekly, manual)
- Exchange Rate Source selector (if applicable)

**Rounding & Display section:**
- Amount Rounding Precision (number of decimal places)
- Tax Amount Rounding Method selector
- Currency Symbol Display selector (prefix/suffix)
- Thousand Separator selector (comma/period/space)

### Module Settings Tab (Admin Only)

#### Modules List Section
- Module list (cards or table format):
  - Product Management (enabled/disabled toggle)
  - Inventory Management (enabled/disabled toggle)
  - Sales & Orders (enabled/disabled toggle)
  - POS Terminal (enabled/disabled toggle)
  - Customer Management (enabled/disabled toggle)
  - Vendor Management (enabled/disabled toggle)
  - HR & Payroll (enabled/disabled toggle)
  - Accounting & Finance (enabled/disabled toggle)
  - Reports & Analytics (enabled/disabled toggle)
  - Notifications (enabled/disabled toggle)

- Each module displays:
  - Module name
  - Status indicator (enabled/disabled)
  - Toggle switch
  - "Configure" button (if applicable)
  - Description of what module does

#### Module-Specific Configuration
- Collapsible sections for each enabled module:
  - POS: Register count, offline mode, receipt template selection
  - HR: Leave types, pay periods, tax configuration
  - Reports: Default date ranges, refresh intervals
  - Accounting: Close accounting periods, archive rules
  - Inventory: Default warehouse, reorder thresholds
  - Sales: Default tax rate, discount limit, approval workflow

## Backend API Requirements

### General Settings Endpoints
- **GET /api/settings/general/** - Get general settings
  - Response: { business_name, registration_number, business_type, address, contact, timezone, currency, language, date_format, time_format, fiscal_year_start, logo_url }
  
- **PATCH /api/settings/general/** - Update general settings
  - Request body: { business_name, registration_number, business_type, address, contact, timezone, currency, language, date_format, time_format, fiscal_year_start }
  - Response: updated settings
  
- **POST /api/settings/general/logo/** - Upload logo
  - Request: multipart form data (image file)
  - Response: { logo_url }
  
- **DELETE /api/settings/general/logo/** - Remove logo
  - Response: { success: true }

### Financial Settings Endpoints
- **GET /api/settings/financial/** - Get financial settings
  - Response: { vat_rate, vat_registration_number, accounting_method, default_accounts, financial_period, currency_config, rounding_config }
  
- **PATCH /api/settings/financial/** - Update financial settings
  - Request body: { vat_rate, vat_registration_number, accounting_method, default_accounts, financial_period, currency_config, rounding_config }
  - Response: updated settings

### Module Settings Endpoints
- **GET /api/settings/modules/** - Get module configuration
  - Response: { modules: [{ name, enabled, configuration }] }
  
- **PATCH /api/settings/modules/{module_id}/** - Update module configuration
  - Request body: { enabled, configuration: {...} }
  - Response: updated module configuration

## Database Requirements

### Schema Extensions
- Extend Tenant model to store:
  - General settings (business name, address, contact, timezone, currency, language, locale, branding)
  - Financial settings (VAT rate, accounting method, rounding rules, default accounts)
  - Module configuration (enabled modules, module-specific settings)
- Settings stored as JSON in tenants table (flexible schema)
- Indexes: (tenant_id, setting_key) for fast lookups

### Data Integrity
- Maintain audit trail for all settings changes
- Support settings versioning/rollback capability
- Encrypt sensitive configuration data

## Current Implementation Status

- HardwareSettingsView EXISTS (partial, for hardware-specific settings only)
- General Settings UI NOT fully implemented
- Financial Settings UI NOT implemented
- Module Settings UI NOT implemented
- Logo upload NOT fully implemented
- Currency/timezone/date format NOT fully configurable
- Accounting method configuration NOT implemented
- Module enable/disable feature NOT implemented
- Real-time validation NOT implemented

## Validation & Edge Cases

### Business Information Validation
- Business name required, non-empty
- Email validation required
- Phone format validation
- Timezone must be valid IANA timezone
- Currency must be valid ISO 4217 code

### Financial Configuration Validation
- VAT rate must be 0-100%
- Fiscal year must be valid date
- Accounting method change may have implications for existing records

### Media Validation
- Logo file must be image (JPG, PNG, SVG)
- Logo size limits (max 5MB)

### Module Management Considerations
- Module disable may cascade (e.g., disabling Sales disables POS)
- Locale changes should not impact existing data

## Testing Checklist

- [ ] General settings load correctly
- [ ] Business name saves and persists
- [ ] Address fields save correctly
- [ ] Phone/email validation works
- [ ] Logo uploads and displays
- [ ] Logo removal works
- [ ] Timezone selector works
- [ ] Currency selector works
- [ ] Date format selector works
- [ ] Time format selector works
- [ ] Fiscal year date saves
- [ ] Financial settings load correctly
- [ ] VAT rate saves and is used in calculations
- [ ] Accounting method selector works
- [ ] Default accounts can be selected
- [ ] Currency configuration saves
- [ ] Rounding method saves
- [ ] Module list displays all modules
- [ ] Module toggles enable/disable
- [ ] Module configuration sections appear
- [ ] Module-specific settings save
- [ ] Changes persist after page reload
- [ ] Validation errors display
- [ ] Error recovery works
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components
- [ ] General settings page component
- [ ] Financial settings page component
- [ ] Module settings page component
- [ ] Settings navigation component
- [ ] Logo upload component
- [ ] Form components (text, select, date picker, etc.)
- [ ] API client methods (all endpoints)
- [ ] State management (Redux/Context)
- [ ] Validation service
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states
- [ ] Empty state (if applicable)

### Backend Implementation
- [ ] Backend API endpoints
- [ ] Settings repository/service
- [ ] Tenant settings model extensions
- [ ] Migration for settings schema
- [ ] Audit logging for changes
- [ ] Permission checks (admin only)

## Deployment Strategy

1. Deploy settings API endpoints
2. Deploy settings schema migrations
3. Deploy frontend settings components
4. Testing: Validate settings changes
5. Staff training: How to configure settings
6. Rollback: Maintain settings backup

## Performance Targets

- Settings load: <300ms
- Settings save: <500ms
- Logo upload: <2s
- Validation: <100ms

## Monitoring & Alerting

- Track settings change frequency
- Alert on failed settings save
- Monitor logo upload errors
- Log all settings changes (audit trail)

## Documentation Requirements

- Settings configuration guide
- Tax configuration guide
- Accounting method guide
- Module configuration guide
- Troubleshooting guide

## Future Enhancements

- Settings versioning/rollback
- Settings templates
- Bulk settings import/export
- Settings validation rules
- Custom field support
- Multi-store settings (if multi-store feature added)
- Settings profiles/presets
