# Receipt Configuration & Customization Feature Specification

## Executive Summary

Receipt Configuration & Customization providing business owners with comprehensive receipt template management, format selection, field customization, and branding options enabling personalized receipt generation matching business identity and requirements.

## Current State Analysis

### EXISTING IMPLEMENTATION

- Hardware printer configuration settings (printer type, paper width, cash drawer)
- Receipt rendering service (build_thermal_receipt_html function)
- Receipt data model (sale/transaction data)
- Thermal receipt HTML generation
- Return receipt HTML generation
- Settings infrastructure
- Tenant-level configuration storage
- Receipt preview in POS (WhatsApp dialog)

### MISSING / INCOMPLETE IMPLEMENTATION

- Receipt Configuration page in Settings tab (self-service receipt customization UI)
- Receipt template management UI
- Receipt format selector UI (thermal 80mm/58mm, PDF, email template)
- Receipt template editor interface
- Field visibility toggle UI for individual fields
- Receipt header customization (company name, address, logo upload)
- Receipt footer customization (return policy, custom message)
- Color scheme selector for receipt templates
- Font/typography selector
- Custom receipt branding section
- Receipt template preview real-time UI
- Company details form (separate from general settings)
- Receipt template versioning/history
- Multi-language receipt template support
- Field mapping configuration (for custom order of fields)
- Receipt customization API endpoints
- Receipt template validation
- Receipt format conversion (thermal to PDF, email HTML)
- Test receipt printing button
- Receipt template import/export
- Default template assignment
- Department/location-specific receipt templates
- Receipt customization audit log

## Frontend Features

### Settings Navigation Tabs

- General Settings (existing)
- Financial Settings (existing)
- Module Settings (existing)
- Notification Settings (existing)
- Integration Settings (existing)
- **Receipt Configuration (NEW - this feature)**
- [other existing tabs]

### Receipt Configuration Page Sections

#### 1. Receipt Format & Type Section

- Receipt format selector (radio buttons or buttons):
  - **Thermal Printer (80mm width)**
    - Currently selected indicator
    - Description: "For thermal receipts from POS terminal"
  - **Thermal Printer (58mm width)**
    - Description: "For 58mm thermal printers"
  - **PDF Receipt**
    - Description: "For email or digital delivery"
  - **Email Template**
    - Description: "For email receipt delivery"
  - **SMS Summary**
    - Description: "For SMS receipt summary"
- Selected format display (highlighted/active state)
- Format description text
- Save format button

#### 2. Receipt Header & Branding Section

- **Company/Store Logo upload**
  - Current logo display (if exists)
  - Upload button (drag & drop or click)
  - Logo size recommendations (max width for thermal, optimal resolution)
  - Remove logo button
  - Logo preview (how it will appear on receipt)

- **Store Name field**
  - Current store name display (default from tenant)
  - Editable text input
  - Character limit indicator

- **Store Address section (optional)**
  - Street address field
  - City field
  - Phone field
  - Email field
  - Website field (optional)
  - Display all/Select which to show toggle

- **Receipt header background color (for PDF/email templates)**
  - Color picker
  - Preset colors

#### 3. Field Visibility & Layout Section

- Toggles for each receipt section:
  - Store Information (name, address, phone)
  - Sale/Transaction ID
  - Date & Time
  - Cashier/Employee Name
  - Customer Information (name, email, phone)
  - Item Details (product, quantity, price)
  - Subtotal
  - Tax (amount and rate)
  - Discount (amount and percentage)
  - Grand Total (prominent display)
  - Payment Method (cash, card, credit)
  - Change Amount (for cash)
  - Order Number/Reference
  - Table Number (for restaurant receipts)
  - Barcode/QR Code (of receipt or sale)
  - Thank you message
  - Return policy
  - Signature line (for returns)

- Each toggle includes:
  - Checkbox (enabled/disabled)
  - Label and description
  - Preview of how it appears

- **Field order customization (drag & drop)**
  - Reorder sections
  - Preview updates in real-time

#### 4. Receipt Footer & Messaging Section

- **Return Policy text area**
  - Pre-filled default (if exists)
  - Character count / limit
  - Preview of how it appears

- **Footer Message text area**
  - Custom message for all receipts
  - Examples: "Thank you for your business", "Visit us online at www.mystore.com"
  - Character limit indicator

- **Footer Contact Information**
  - Phone number field
  - Email field
  - Website URL field
  - Social media handles (optional)

- **Footer styling**
  - Font size selector (small, normal, large)
  - Text alignment selector (left, center, right)

#### 5. Template Preview Section

- **Live receipt preview pane**
  - Shows how receipt will look with current settings
  - Updates in real-time as user changes settings
  - Shows different format previews (thermal, PDF, email)
  - Print preview button (opens browser print dialog)
  - Download preview PDF button (if PDF format selected)

#### 6. Company Details Section

- Business Name field
- Registration Number field
- Tax ID/VAT Number field
- Business Address (street, city, postal code, country)
- Business Phone
- Business Email
- Save button for company details

#### 7. Template Management Section

- **Save Current Template button**
  - Saves customization as "Default Receipt Template"

- **Template history dropdown**
  - Shows previously saved templates
  - Select to revert to previous template

- **Reset to Default Template button (with confirmation)**
  - Reverts to system default

- **Export Template button (JSON)**
  - Downloads template configuration

- **Import Template button (JSON)**
  - Allows uploading previously exported template

- **Delete Template button (with confirmation)**

#### 8. Testing Section

- **Send Test Receipt button**
  - Opens dialog to send test receipt
  - Email address field (for PDF/email test)
  - Phone number field (for SMS test)
  - Printer selector (for thermal printer test)
  - Send button
  - Success/error message display

## Backend API Requirements

### Core Configuration Endpoints

- **GET /api/receipts/config/**
  - Get receipt configuration
  - Response: `{ format, header_config, footer_config, field_visibility, company_details }`

- **PATCH /api/receipts/config/**
  - Update receipt configuration
  - Request body: `{ format, header_config, footer_config, field_visibility, company_details }`
  - Response: updated receipt configuration

- **POST /api/receipts/config/preview/**
  - Generate preview
  - Request body: `{ sale_id (optional), format }`
  - Response: `{ preview_html or preview_url }`

### Template Management Endpoints

- **POST /api/receipts/templates/**
  - Save template
  - Request body: `{ name, configuration }`
  - Response: `{ template_id, name, created_at }`

- **GET /api/receipts/templates/**
  - Get saved templates
  - Response: `[{ id, name, created_at, is_default }]`

- **POST /api/receipts/templates/{id}/apply/**
  - Apply template
  - Response: `{ success }`

### Logo & Media Endpoints

- **POST /api/receipts/logo/upload/**
  - Upload receipt logo
  - Request: multipart form data (image file)
  - Response: `{ logo_url }`

- **DELETE /api/receipts/logo/**
  - Remove receipt logo
  - Response: `{ success }`

### Testing Endpoints

- **POST /api/receipts/test/**
  - Send test receipt
  - Request body: `{ format, email_to (optional), phone_to (optional) }`
  - Response: `{ success, message }`

## Database Requirements

### Models

- **ReceiptConfiguration**
  - tenant_id
  - format
  - header_config (JSON)
  - footer_config (JSON)
  - field_visibility (JSON)
  - company_details (JSON)
  - created_at
  - updated_at

- **ReceiptTemplate**
  - tenant_id
  - name
  - configuration (JSON)
  - is_default
  - created_at
  - created_by

- **ReceiptLogo**
  - tenant_id
  - file_path
  - file_size
  - created_at

### Database Indexes

- `(tenant_id, is_default)`
- `(tenant_id, created_at DESC)`

## Current Implementation Status

- Hardware printer config EXISTS
- Receipt rendering service EXISTS (hardcoded)
- Settings page EXISTS (but no receipt configuration tab)
- Receipt template customization NOT implemented
- Receipt format selector NOT implemented
- Field visibility toggles NOT implemented
- Receipt header customization NOT implemented
- Receipt footer customization NOT implemented
- Receipt template management NOT implemented
- Receipt preview real-time UI NOT implemented
- Test receipt NOT implemented
- Company details section in receipt settings NOT implemented

## Validation & Edge Cases

- Receipt format must be valid (thermal 80mm/58mm, PDF, email, SMS)
- Logo file must be image (PNG, JPG, no transparency for thermal)
- Logo size limits (max 5MB, max width for thermal printers)
- Field visibility must have at least item and total visible
- Template name must be unique per tenant
- Receipt width constraints for thermal printers
- Character limits for SMS receipts
- HTML sanitization for email template fields
- Font limitations for thermal printers
- Color limitations for thermal (B&W only)
- Test receipt requires valid email/phone/printer

## Testing Checklist

- [ ] Receipt format selector works
- [ ] Format changes save correctly
- [ ] Logo uploads and displays
- [ ] Logo can be removed
- [ ] Field visibility toggles work
- [ ] Field reordering works
- [ ] Receipt preview updates in real-time
- [ ] Header customization works
- [ ] Footer customization works
- [ ] Company details save correctly
- [ ] Template can be saved
- [ ] Template can be selected/reverted
- [ ] Template can be exported
- [ ] Template can be imported
- [ ] Test receipt sends correctly
- [ ] Receipt renders correctly on thermal printer
- [ ] Receipt renders correctly as PDF
- [ ] Email template renders correctly
- [ ] SMS receipt displays correctly
- [ ] Responsive design works

## Implementation Checklist

### Frontend Components

- [ ] Receipt Configuration page component
- [ ] Format selector component
- [ ] Logo upload component
- [ ] Field visibility component
- [ ] Reorder component (drag & drop)
- [ ] Receipt preview component (real-time)
- [ ] Template management component
- [ ] Company details form component
- [ ] Test receipt dialog component
- [ ] API client methods (all endpoints)
- [ ] State management (Redux/Context)
- [ ] Form validation
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states

### Backend Implementation

- [ ] Backend API endpoints
- [ ] Receipt template service
- [ ] Receipt configuration storage
- [ ] Receipt preview generation
- [ ] Logo storage/retrieval
- [ ] Template versioning
- [ ] Audit logging

## Deployment Strategy

- Deploy receipt configuration API endpoints
- Deploy file storage for logos and receipts
- Deploy frontend receipt configuration pages
- Testing: Customize receipt, verify printing
- Staff training: Receipt customization guide
- Rollback: Maintain receipt configuration data

## Performance Targets

- Configuration load: <300ms
- Configuration save: <500ms
- Receipt preview generation: <1s
- Logo upload: <2s

## Monitoring & Alerting

- Track receipt customization changes
- Monitor receipt printing errors
- Alert on failed test receipts
- Monitor receipt template usage

## Documentation Requirements

- Receipt configuration guide
- Receipt template guide
- Logo requirements and best practices
- Receipt format guide
- Test receipt guide
- Troubleshooting guide

## Future Enhancements

- Receipt template marketplace
- Advanced styling (CSS customization)
- Conditional receipt fields (based on payment method)
- Dynamic QR codes (linking to order)
- Receipt translations/multi-language
- Receipt analytics (which sections printed/sent most)
- Receipt signing capability
- Receipt template A/B testing
- Receipt brand guidelines enforcement
- Receipt environmental settings (eco mode)
