# Document 112: DOCUMENT TEMPLATE MANAGEMENT FEATURE

## Executive Summary

Document Template Management provides business administrators with comprehensive document template creation, customization, and storage capabilities enabling customized invoice, purchase order, quote, and delivery note templates matching business branding and requirements.

## Current State Analysis

### EXISTING:
- Invoice PDF rendering service
- PO/Quote models and data structures
- Email delivery service (backend/apps/billing/services/email_service.py)
- PDF export infrastructure for reports
- React PDF renderer library (@react-pdf/renderer)
- Purchase order service and utilities
- Serializers for all document types
- Basic document data models

### MISSING (Partially implemented or incomplete):
- Document Template model (to store template definitions)
- Template management API endpoints (CRUD)
- Template customization UI (frontend)
- Logo upload and storage for templates
- Font selection and management
- Color scheme configuration
- Field visibility configuration
- Conditional logic for fields
- Template versioning system
- Template storage mechanism
- Multi-language template support
- Template preview functionality
- Template import/export (JSON/XML)
- Default template per document type
- Department/location-specific templates
- Template validation system
- Template backup/restore

## Frontend Features

### Document Template Management Page:

#### Template types list (radio buttons or tabs):
- Invoices
- Purchase Orders
- Quotes
- Delivery Notes
- Credit Notes
- Other document types
- Selected template type display

#### Template List View (for selected type):
- Templates table with columns: Name, Created Date, Last Modified, Version, Status (active/inactive), Actions
- Search by template name
- Filter by status
- Sort by date, name
- Create new template button
- Actions per row: Edit, Preview, Duplicate, Set as Default, Delete
- Default template indicator (star/badge)
- Template version display

### Template Creation/Edit Page:

#### Template information section:
- Template name field (required, text input)
- Template description field (optional, text area)
- Document type selector (read-only if editing existing)
- Template language selector (if multi-language supported)
- Effective date (for versioning)

#### Logo & Branding section:
- Current logo display (if exists)
- Logo upload (drag & drop or click)
- Logo placement selector (left, center, right, top, bottom):
  - Placement preview
- Logo size/scale input
- Remove logo button
- Logo size recommendations

#### Company Details section:
- Business name field (pre-populated from settings, editable)
- Business registration number field
- Tax ID/VAT number field
- Business address fields (street, city, postal code, country):
  - Single address or multiple addresses selector
- Phone field
- Email field
- Website field (optional)
- Display toggle for each field (show/hide)
- Order customization (drag & drop)

#### Color Scheme section:
- Header background color selector (color picker)
- Header text color selector
- Accent color selector (for highlights, totals)
- Footer background color selector
- Footer text color selector
- Preview of colors applied to sample
- Preset color schemes dropdown (Professional, Vibrant, Minimalist, etc.)

#### Font Configuration section:
- Header font selector (dropdown of supported fonts)
- Body font selector
- Accent font selector (for important fields)
- Font size adjustment (small, normal, large)
- Line height adjustment
- Preview of fonts applied

#### Field Visibility & Customization section:

##### Expandable sections by document area:

**Header section:**
- Logo visibility toggle
- Company details visibility toggle
- Document title visibility toggle
- Date/time visibility toggle

**Details section:**
- Document number visibility toggle
- Order reference visibility toggle
- Customer/Vendor name toggle
- Addresses toggle (billing, shipping)
- Payment terms visibility toggle

**Line items section:**
- Product name/description toggle
- SKU visibility toggle
- Unit price visibility toggle
- Quantity visibility toggle
- Discount visibility toggle
- Tax visibility toggle
- Line total visibility toggle

**Summary section:**
- Subtotal toggle
- Tax breakdown toggle (itemized or total)
- Discount display toggle
- Grand total toggle
- Payment method display toggle

**Footer section:**
- Notes/memo toggle
- Terms & conditions toggle
- Bank details toggle
- QR code toggle
- Signature lines toggle
- Page number toggle

Each toggle:
- Checkbox (enabled/disabled)
- Label and description
- Field order customization (drag & drop)
- Live preview updates

#### Terms & Conditions section:
- Terms & conditions text area:
  - Pre-filled defaults (if exists)
  - Character count / limit
  - Rich text editor (optional)
  - Template variables reference
- Payment instructions text area
- Delivery/Return policy text area
- Custom message text area
- Footer message text area

#### Conditional Fields section (advanced):
- Add conditional rule button
- Conditional rules list:
  - If [field] equals [value], then [action]
  - Examples: If payment_method = "COD", show "Cash on Delivery" instructions
  - If document_type = "Invoice", show payment terms
- Remove rule button
- Test conditions button

#### Template Preview section:
- Live preview pane (right side or collapsible):
  - Shows how document will look with current settings
  - Updates in real-time as user changes settings
  - Sample data populated (dummy invoice/PO data)
  - Print preview button (opens browser print dialog)
  - Download preview PDF button

#### Template Management section:
- Save Template button (primary)
- Save as New Version button (for existing templates)
- Cancel button
- Delete Template button (with confirmation)
- Preview before saving toggle

#### Advanced Settings section (collapsible):
- Page orientation selector (portrait, landscape)
- Paper size selector (A4, Letter, Legal)
- Margin customization (top, bottom, left, right)
- Header/Footer height customization
- Custom CSS field (for advanced users)

### Template Preview Modal:
- Full document preview
- Sample data (from existing records)
- Print preview option
- Download PDF option
- Email test button (sends preview to email)
- SMS test button (if applicable)
- Close button

### Duplicate Template Modal:
- Template name for copy (pre-filled with "Copy of [Original Name]")
- Version number (reset to 1)
- Create button
- Cancel button

### Set as Default Modal:
- Confirmation: "Set [Template Name] as the default template for [Document Type]?"
- Confirm button
- Cancel button

## Backend API Requirements

- **GET /api/documents/templates/** - Get all templates
  - Query params: document_type, status, limit, offset
  - Response: [{ id, name, document_type, created_at, updated_at, is_default, version }]

- **POST /api/documents/templates/** - Create template
  - Request body: { name, document_type, configuration (JSON) }
  - Response: { template_id, name, version }

- **GET /api/documents/templates/{id}/** - Get template details
  - Response: complete template configuration

- **PATCH /api/documents/templates/{id}/** - Update template
  - Request body: { name, configuration (JSON) }
  - Response: updated template

- **DELETE /api/documents/templates/{id}/** - Delete template
  - Response: { success }

- **POST /api/documents/templates/{id}/duplicate/** - Duplicate template
  - Request body: { new_name }
  - Response: { new_template_id }

- **POST /api/documents/templates/{id}/set-default/** - Set as default
  - Response: { success }

- **POST /api/documents/templates/logo/upload/** - Upload template logo
  - Request: multipart form data (image file)
  - Response: { logo_url }

- **POST /api/documents/templates/{id}/preview/** - Generate preview
  - Request body: { sample_data (optional) }
  - Response: { html_preview or pdf_url }

## Database Requirements

- **DocumentTemplate model**: tenant_id, name, document_type, configuration (JSON), logo_path, is_default, version, created_at, updated_at, created_by
- **TemplateVersion model**: template_id, version_number, configuration (JSON), created_at, created_by
- **Indexes**: (tenant_id, document_type, is_default), (tenant_id, created_at DESC)

## Current Implementation Status

- Invoice PDF generation EXISTS (basic, not template-based)
- PO model EXISTS
- Template model NOT implemented
- Template storage NOT implemented
- Template UI NOT implemented
- Logo upload NOT implemented for templates
- Font/color configuration NOT implemented
- Field visibility toggles NOT implemented
- Conditional fields NOT implemented
- Template versioning NOT implemented

## Validation & Edge Cases

- Template name required and unique per tenant
- Document type required
- Logo file must be image (PNG, JPG)
- Logo size limits (max 5MB)
- Font must be from supported list
- Color must be valid hex code
- Configuration must be valid JSON
- At least one template per document type required
- Template cannot be deleted if it's the default
- Conditional fields must have valid syntax
- Template changes should not affect existing documents

## Testing Checklist

- [ ] Template list displays correctly
- [ ] New template can be created
- [ ] Template can be edited
- [ ] Logo uploads and displays
- [ ] Color scheme updates preview
- [ ] Font changes update preview
- [ ] Field visibility toggles work
- [ ] Field reordering works
- [ ] Conditional rules work
- [ ] Template can be duplicated
- [ ] Template can be set as default
- [ ] Template can be deleted
- [ ] Preview generates correctly
- [ ] Template persists after save
- [ ] Responsive design works

## Implementation Checklist

- [ ] Document Template model
- [ ] Template Version model
- [ ] Template management page component
- [ ] Template list component
- [ ] Template creation/edit component
- [ ] Logo upload component
- [ ] Color picker component
- [ ] Font selector component
- [ ] Field visibility component
- [ ] Conditional rules component
- [ ] Template preview component
- [ ] API client methods
- [ ] State management
- [ ] Form validation
- [ ] Error handling
- [ ] Backend API endpoints
- [ ] Template storage service
- [ ] Logo storage/retrieval
- [ ] Template versioning service

## Deployment Strategy

- Deploy document template API endpoints
- Deploy file storage for logos
- Deploy frontend template management pages
- Testing: Create/edit templates, verify output
- Staff training: Template management guide
- Rollback: Maintain template data

## Performance Targets

- Template load: <300ms
- Template save: <500ms
- Preview generation: <1s
- Logo upload: <2s

## Monitoring & Alerting

- Track template creation/modification
- Monitor template usage
- Alert on failed preview generation
- Monitor template storage usage

## Documentation Requirements

- Template management guide
- Template variable reference
- Template customization guide
- Best practices guide
- Troubleshooting guide

## Future Enhancements

- Template marketplace
- Community templates
- Template AI suggestions (based on industry)
- Template version comparison
- Template usage analytics
- Template A/B testing
- Scheduled template updates
- Template translations
