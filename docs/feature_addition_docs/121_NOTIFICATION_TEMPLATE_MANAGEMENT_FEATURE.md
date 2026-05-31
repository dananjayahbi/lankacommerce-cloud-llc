# Notification Template Management Feature Specification
**Document ID:** 121  
**Feature Area:** Notification Management  
**Status:** Specification  
**Last Updated:** May 31, 2026

---

## Executive Summary

Notification Template Management provides email, SMS, and WhatsApp template creation, editing, and testing enabling businesses to customize notifications and messages sent to customers and staff. This feature moves notification content from hardcoded templates to a database-managed system with full lifecycle management, versioning, and preview capabilities.

---

## Current State Analysis

### EXISTING INFRASTRUCTURE

**Email Template System:**
- Email service with hardcoded templates in code (backend/apps/billing/services/email_service.py)
- Pre-configured templates: trial_expiring_soon, payment_overdue, account_suspended
- HTML email composition functions
- Email sending infrastructure (Resend or Django email backend)
- Basic merge field support: {user.first_name}, {tenant.name}, {invoice.invoice_number}

**WhatsApp Service:**
- WhatsApp receipt notification service (backend/apps/pos/services/whatsapp_service.py)
- WhatsApp receipt template (hardcoded, not general notifications)
- WhatsAppReceiptPayload structure
- Sends to customer WhatsApp on receipt completion

**Notification Delivery:**
- Email backend configured (Resend or Django email)
- Basic email sending capability
- HTML template rendering

**System Design Patterns:**
- Merge field support in existing templates
- Entity-related notification tracking (related_entity_type, related_entity_id)
- Tenant-scoped notifications

### MISSING OR INCOMPLETE

**Template Management UI:**
- No template management page/interface (templates hardcoded in code)
- No template creation form
- No template editing interface
- No template deletion mechanism
- No template library/catalog UI

**Database-Driven Templates:**
- No NotificationTemplate model
- No template versioning system
- No template metadata storage
- No template status tracking (draft, active, inactive)
- No template author tracking
- Templates exist only in Python code

**SMS Integration:**
- No SMS service implementation
- No SMS templates
- No SMS template management UI
- No SMS sending infrastructure

**General WhatsApp Templates:**
- No general WhatsApp notification templates (only receipts)
- No WhatsApp template management UI
- No WhatsApp message template system beyond receipts

**Template Content Features:**
- No template preview functionality
- No HTML editor for email templates
- No plain text fallback support
- No template testing/send test email feature
- No template merge fields reference display in UI
- No dynamic content blocks
- No conditional template blocks (if/else based on data)

**Template Lifecycle:**
- No template versioning/history
- No template publish/unpublish mechanism
- No template cloning/duplication
- No template backup/restore
- No template change log

**Advanced Features:**
- No multi-language template support
- No template categorization system
- No template auto-save functionality
- No bulk template import/export
- No template attachment support
- No template performance metrics
- No A/B testing support
- No template conflict detection
- SMS character limit warnings not implemented
- WhatsApp message template approval status not tracked

**Merge Fields:**
- Limited merge fields defined
- No comprehensive merge field documentation
- No merge field extraction service
- No merge field validation at template save time
- No dynamic merge field reference UI

---

## Frontend Features

### Settings - Notification Management Tab

#### Notification Templates Overview

**Templates List (Table View):**
- Columns: Template name, Type (email/SMS/WhatsApp), Status (draft/active/inactive), Last modified, Actions
- Row-level actions:
  - View template details button
  - Edit template button
  - Duplicate template button
  - Delete template button (with confirmation - only for draft templates)
  - Publish/unpublish toggle
  - Download template button
  
**Filtering & Search:**
- Filter by template type: Email, SMS, WhatsApp (checkboxes)
- Filter by status: Draft, Active, Inactive (checkboxes)
- Filter by category: Order, Payment, Shipping, Inventory, HR, System, Customer (dropdown)
- Search by template name (text input with real-time search)
- Pagination: Display 25/50/100 templates per page

**Template Statistics Cards:**
- Total templates count
- Email templates count
- SMS templates count
- WhatsApp templates count
- Draft templates count
- Active templates count
- Last template modified time

**Action Buttons:**
- Create new template button (primary, launches creation wizard)
- Bulk delete button (if multiple selected)
- Bulk publish button (if multiple selected)
- Bulk unpublish button (if multiple selected)
- Export templates button (download selected or all)
- Import templates button (upload JSON/CSV)

---

### Template Creation Wizard

#### Step 1: Basic Information

**Form Fields:**
- Template name (text input, required, unique per tenant)
- Template category (dropdown, required):
  - Order confirmation
  - Payment notification
  - Shipping/delivery
  - Inventory/stock alerts
  - HR/payroll
  - System alerts
  - Customer communication
  - Account/billing
  - Custom category
- Template type (radio buttons or tabs, required):
  - Email
  - SMS
  - WhatsApp
- Description (textarea, optional, 500 char limit)
- Status (radio buttons, required):
  - Draft
  - Active
  - Inactive
- Default language (if multi-language supported)

**Navigation:**
- Next button (validates form before proceeding)
- Cancel button (with confirmation if changes made)
- Save as draft button

---

#### Step 2: Content - Email Template

**Subject Line Section:**
- Subject field (text input, required, max 200 chars)
- Subject character counter
- Preview of subject line

**Email Body Editor:**
- Rich text editor (HTML capable, WYSIWYG)
- Formatting toolbar: Bold, Italic, Underline, Lists, Links, Headings, Colors
- Insert image button
- Merge fields reference panel (read-only, collapsible)
- Insert merge field dropdown (auto-completes fields into content)
- Preview pane (right side, live preview with sample data)

**Plain Text Version:**
- Plain text version field (textarea, optional)
- Auto-generate from HTML toggle
- Manual override option

**Preview Section:**
- Live preview display (shows how email looks)
- Sample merge field values displayed
- Edit sample data button (for testing specific scenarios)
- Mobile preview toggle

**Merge Fields Reference Panel:**
- Accordion sections by entity type:
  - Order: order_id, order_date, total_amount, customer_name, items_summary
  - Customer: customer_name, customer_email, phone, address
  - Invoice: invoice_number, invoice_date, amount, due_date, payment_status
  - Payment: payment_method, amount, transaction_id, timestamp
  - Shipment: shipment_id, tracking_number, carrier, estimated_delivery
  - Product: product_name, sku, quantity, price
  - Employee: employee_name, employee_id, department
  - Payslip: period, gross_salary, net_salary, deductions_summary
  - Tenant: tenant_name, tenant_address, support_email
  - System: current_date, current_time, support_link
- Each field shows: field name, description, example value
- Copy button (copies field to clipboard)
- Insert button (inserts into editor)

**Navigation:**
- Save draft button
- Next button (Step 3: Preview & Testing)
- Back button

---

#### Step 2: Content - SMS Template

**Message Body Editor:**
- Text area (required, SMS character limit 160 per SMS)
- Character counter displaying current usage and SMS count
- Warning if exceeds 160 chars (shows SMS split count)
- Real-time character count update

**Merge Fields Reference Panel:**
- Same as email (Accordion by entity type)
- Insert merge field dropdown
- Copy button per field

**Preview Section:**
- SMS preview display (shows how it looks on phone)
- Character count preview
- SMS split warning if multi-part

**Navigation:**
- Save draft button
- Next button (Step 3: Preview & Testing)
- Back button

---

#### Step 2: Content - WhatsApp Template

**Message Body Editor:**
- Text area
- Character counter
- Merge fields reference panel
- Insert merge field dropdown

**Quick Reply Buttons Section:**
- Add button to create quick reply buttons
- For each button:
  - Button type selector (URL, Call, Quick reply)
  - Button label (text input, max 25 chars)
  - Button action/value field
    - URL field (if URL type)
    - Phone field (if Call type)
    - Text field (if Quick reply type)
  - Delete button
  - Reorder arrows (drag to reorder)
- Maximum buttons: 3 (WhatsApp API limit)
- Maximum characters per button: 25

**Approval Status:**
- WhatsApp template approval status display (read-only):
  - Status: Approved, Pending, Rejected
  - If rejected: Rejection reason displayed
  - Resubmit button (if rejected)
- Note: Templates must be approved by WhatsApp before use

**Preview Section:**
- WhatsApp message preview (shows format and buttons)
- Sample merge field values

**Navigation:**
- Save draft button
- Next button (Step 3: Preview & Testing)
- Back button

---

#### Step 3: Preview & Testing

**Template Preview:**
- Full template display (email/SMS/WhatsApp formatted)
- Merge field values shown with sample data
- HTML rendering for email templates
- Edit template button (back to Step 2)
- Change sample data button (fill in custom data for preview)

**Test Send Section:**
- Test recipient input (email/phone field depending on template type)
- Recipient validation (email format validation, phone format validation)
- Send test button
- Confirmation message after send:
  - "Test message sent successfully to [recipient]"
  - View delivery status button
  - Send to another recipient button
- Error handling (show error message if send fails)

**Template Variables Preview:**
- Display current merge field values being used in preview
- Editable inputs to test with different data
- "Reset to defaults" button

**Navigation:**
- Back button (to Step 2)
- Next button (Step 4: Advanced Settings)
- Save as draft button

---

#### Step 4: Advanced Settings

**Sender Configuration:**
- Sender display name (text input)
- Sender email address (text input, for email templates)
- Email reply-to address (optional)
- SMS sender ID (text input, for SMS templates)
- WhatsApp business account selection (if multiple accounts)

**Template Metadata:**
- Template version (read-only, if editing existing)
- Created date (read-only)
- Created by (read-only)
- Last modified date (read-only)
- Last modified by (read-only)

**Scheduling & Publishing:**
- Expiration date selector (optional, date picker)
- Template expiration info (if set)

**Email-Specific Settings:**
- Attachments upload section (drag & drop or file selector)
  - Display uploaded files
  - Delete button per file
  - File size limits
- Track opens toggle (if email service supports)
- Track clicks toggle (if email service supports)
- Unsubscribe link auto-include toggle

**Template Status:**
- Status selector (Draft, Active, Inactive)
- Save template button (final save)
- Publish template button (if draft, saves and sets to Active)
- Save as draft button (if editing active template)

**Navigation:**
- Back button (to Step 3)
- Save template button (final save)
- Publish template button (saves and activates)
- Cancel button (with confirmation)

---

### Template Editing Page

**Template Header:**
- Template name
- Template type badge (Email/SMS/WhatsApp)
- Status badge (Draft/Active/Inactive)
- Last modified info (by user, at time)

**Editing Tabs:**
- Basic Info tab (edit template name, category, description)
- Content tab (edit email/SMS/WhatsApp content)
- Advanced tab (sender config, attachments, tracking)
- History tab (view version history)

**Metadata Section:**
- Created by: [username]
- Created date: [date]
- Last modified by: [username]
- Last modified date: [date]
- Total sends: [count] (if available)
- Template version: [v1.2] (if versioning enabled)

**Template History Section:**
- Previous versions list (table):
  - Version number, Modified date, Modified by, Summary of changes
  - View version button
  - Revert to version button (with confirmation)
  - Compare with current button

**Actions:**
- Publish template button (if draft)
- Unpublish template button (if active)
- Duplicate template button (creates copy as draft)
- Delete template button (only if draft, with confirmation)
- Export template button (download as JSON)
- View template details button (read-only preview)

---

### Template Merge Fields Reference

**Merge Fields Directory:**
- Accordion layout with expandable sections by entity type
- Each section contains:
  - Entity type name
  - Description of when available
  - Table of fields:
    - Field name (code): {field_name}
    - Description
    - Data type
    - Example value
    - Copy button (copies field reference)

**Entity Types Documented:**
- Order fields
- Customer fields
- Invoice fields
- Payment fields
- Shipment fields
- Product fields
- Employee fields
- Payslip fields
- Tenant fields
- System fields

**Search & Filter:**
- Search by field name (real-time search)
- Search by description
- Filter by entity type
- Filter by data type

**Copy Functionality:**
- Copy field reference button copies {field_name} to clipboard
- Toast notification confirms copy

---

### Template Library/Catalog

**System/Default Templates Section:**
- Read-only templates provided by LankaCommerce
- Table showing:
  - Template name
  - Type (Email/SMS/WhatsApp)
  - Description
  - Category
  - Last updated
  - Actions:
    - View button (read-only)
    - Copy to custom templates button
    - Preview button

**Custom Templates Section:**
- User-created templates (editable)
- Same table format as overview
- Full CRUD operations

**Import from Library:**
- Browse template library button
- Filter templates by category
- Select templates to import
- Import button (copies selected to custom templates)

---

### Template Bulk Operations

**Bulk Selection:**
- Checkbox column in templates list
- Select all checkbox (header)
- Deselect all button

**Bulk Actions Toolbar (appears when items selected):**
- Bulk delete button (with confirmation showing count)
- Bulk publish button
- Bulk unpublish button
- Bulk export button (downloads all selected as JSON)
- Clear selection button

---

### Template Import

**Import Templates UI:**
- Import templates button (on main page)
- File selector (accepts JSON, CSV formats)
- File upload progress indicator
- Preview of templates to be imported:
  - Table showing: Name, Type, Category, Status
  - Conflict detection: Mark if template with same name exists
  - Conflict resolution options:
    - Skip existing
    - Replace existing
    - Rename (with input field)
  - Select conflict resolution per template
- Confirm import button
- Import progress/results display:
  - Imported count
  - Skipped count
  - Errors (if any)
  - Newly imported templates list

---

## Backend API Requirements

### Core Template Operations

**GET /api/notifications/templates/**
- Query parameters:
  - type: email/sms/whatsapp (optional filter)
  - status: draft/active/inactive (optional filter)
  - category: notification category (optional filter)
  - limit: number of results (default 50, max 500)
  - offset: pagination offset (default 0)
  - search: search by name (optional)
  - order_by: created_at/modified_at/name (default: created_at DESC)
- Response:
  ```json
  {
    "count": 150,
    "next": "...",
    "previous": "...",
    "results": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "name": "Order Confirmation",
        "type": "email",
        "category": "order",
        "status": "active",
        "subject": "Your order #{{order.id}} is confirmed",
        "created_at": "2026-05-31T10:00:00Z",
        "modified_at": "2026-05-31T10:00:00Z",
        "created_by": "user_id",
        "modified_by": "user_id",
        "version": 1
      }
    ]
  }
  ```

**POST /api/notifications/templates/**
- Request body:
  ```json
  {
    "name": "Order Confirmation",
    "type": "email",
    "category": "order",
    "subject": "Your order {{order.id}} is confirmed",
    "content": "<html>...</html>",
    "plain_text": "Your order is confirmed",
    "merge_fields": ["order.id", "customer.name"],
    "sender_config": {
      "display_name": "LankaCommerce",
      "email": "noreply@lankacommerce.com",
      "reply_to": "support@lankacommerce.com"
    },
    "status": "draft",
    "description": "Sent when order is confirmed"
  }
  ```
- Response: Created template object (same as GET single template)
- Status code: 201 Created

**GET /api/notifications/templates/{id}/**
- Response: Complete template with all fields, content, merge fields, sender config
- Status code: 200 OK

**PATCH /api/notifications/templates/{id}/**
- Request body: Partial update (any fields)
- Response: Updated template
- Status code: 200 OK

**DELETE /api/notifications/templates/{id}/**
- Only allowed for draft templates
- Response: { "success": true }
- Status code: 204 No Content

---

### Template Testing & Publishing

**POST /api/notifications/templates/{id}/test/**
- Request body:
  ```json
  {
    "recipient_email": "test@example.com",
    "recipient_phone": "+1234567890",
    "sample_data": {
      "order.id": "ORD-123",
      "customer.name": "John Doe"
    }
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "delivery_id": "uuid",
    "status": "sent",
    "message": "Test email sent to test@example.com"
  }
  ```

**POST /api/notifications/templates/{id}/publish/**
- Sets template status to "active"
- Request body: (empty)
- Response: Updated template with status "active"
- Status code: 200 OK

**POST /api/notifications/templates/{id}/unpublish/**
- Sets template status to "inactive"
- Request body: (empty)
- Response: Updated template with status "inactive"
- Status code: 200 OK

---

### Template Versioning

**POST /api/notifications/templates/{id}/duplicate/**
- Request body:
  ```json
  {
    "new_name": "Order Confirmation - Version 2"
  }
  ```
- Response: New template as draft (copy of original)
- Status code: 201 Created

**GET /api/notifications/templates/{id}/versions/**
- Query params: limit, offset
- Response:
  ```json
  {
    "count": 5,
    "results": [
      {
        "version_id": "uuid",
        "version_number": 2,
        "modified_at": "2026-05-31T14:00:00Z",
        "modified_by": "user_id",
        "change_summary": "Updated subject line wording",
        "content_preview": "First 200 chars of content..."
      }
    ]
  }
  ```

**POST /api/notifications/templates/{id}/revert/**
- Request body:
  ```json
  {
    "version_id": "uuid"
  }
  ```
- Response: Template reverted to specified version
- Status code: 200 OK

---

### Merge Fields

**GET /api/notifications/merge-fields/**
- Query params: entity_type (optional)
- Response:
  ```json
  {
    "order": [
      {
        "field_name": "order.id",
        "description": "Unique order identifier",
        "data_type": "string",
        "example_value": "ORD-123456"
      },
      {
        "field_name": "order.date",
        "description": "Order creation date",
        "data_type": "datetime",
        "example_value": "2026-05-31"
      }
    ],
    "customer": [...],
    "invoice": [...]
  }
  ```

---

### Bulk Operations

**GET /api/notifications/templates/bulk-export/**
- Query params: ids (comma-separated UUIDs, or empty for all)
- Response: JSON file download with templates data

**POST /api/notifications/templates/bulk-import/**
- Request: multipart/form-data with file upload
- File format: JSON array of templates
- Response:
  ```json
  {
    "imported_count": 10,
    "skipped_count": 2,
    "errors": [
      {
        "template_name": "...",
        "error": "Duplicate template name"
      }
    ],
    "imported_templates": ["uuid1", "uuid2"]
  }
  ```

**GET /api/notifications/templates/{id}/usage/**
- Response:
  ```json
  {
    "template_id": "uuid",
    "total_sent": 1250,
    "successful": 1200,
    "failed": 50,
    "delivery_rate": 0.96,
    "last_sent_at": "2026-05-31T15:30:00Z"
  }
  ```

---

## Database Requirements

### Core Models

**NotificationTemplate:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key, indexed)
- name: VARCHAR(255) (unique per tenant)
- type: ENUM(email, sms, whatsapp)
- category: VARCHAR(50)
- subject: VARCHAR(500) (for email only)
- content: TEXT or JSON (template content/HTML)
- plain_text: TEXT (for email fallback)
- merge_fields: JSONB array (list of field names used)
- sender_config: JSONB (sender details: display_name, email, reply_to, sms_sender_id, etc.)
- status: ENUM(draft, active, inactive) (indexed)
- description: TEXT
- created_by: UUID (user ID)
- modified_by: UUID (user ID)
- created_at: DATETIME (indexed)
- modified_at: DATETIME
- version: INTEGER
- Indexes:
  - (tenant_id, status, created_at DESC)
  - (tenant_id, type)
  - (tenant_id, category)
  - (tenant_id, name) unique

**NotificationTemplateVersion:**
- id: UUID (primary key)
- template_id: UUID (foreign key, indexed)
- version_number: INTEGER
- content: TEXT (versioned content)
- subject: VARCHAR(500) (for email)
- merge_fields: JSONB array
- modified_by: UUID (user ID)
- modified_at: DATETIME (indexed)
- change_summary: TEXT (description of changes)
- Indexes:
  - (template_id, version_number DESC)
  - (template_id, modified_at DESC)

**MergeField:**
- id: UUID (primary key)
- tenant_id: UUID (foreign key)
- entity_type: VARCHAR(50) (order, customer, invoice, etc.)
- field_name: VARCHAR(255) (e.g., "order.id")
- field_path: VARCHAR(500) (data path in object)
- data_type: VARCHAR(50) (string, integer, datetime, etc.)
- description: TEXT
- example_value: VARCHAR(500)
- is_system: BOOLEAN (true for LankaCommerce-provided, false for custom)
- created_at: DATETIME
- Indexes:
  - (tenant_id, entity_type)
  - (tenant_id, field_name)

**TemplateAttachment:**
- id: UUID (primary key)
- template_id: UUID (foreign key, indexed)
- file_name: VARCHAR(500)
- file_url: VARCHAR(1000) (or storage key)
- file_type: VARCHAR(100) (MIME type)
- file_size: INTEGER (bytes)
- uploaded_at: DATETIME
- Indexes:
  - (template_id)

---

## Current Implementation Status

### NOT IMPLEMENTED
- ✗ NotificationTemplate model (templates only in code)
- ✗ Template management UI/page
- ✗ Template creation wizard
- ✗ Template editing interface
- ✗ Template deletion
- ✗ Template versioning system
- ✗ Template testing functionality
- ✗ SMS templates and SMS integration
- ✗ General WhatsApp templates
- ✗ Template library/catalog UI
- ✗ Merge fields reference UI
- ✗ Template preview component
- ✗ Bulk import/export functionality

### PARTIALLY IMPLEMENTED
- Email templates (exist in code, not in database)
- Email service (works, but uses hardcoded templates)
- Merge fields (basic support, not comprehensive)
- WhatsApp service (receipts only)

### FULLY IMPLEMENTED
- Email sending infrastructure
- Tenant isolation
- Notification entity tracking

---

## Validation & Edge Cases

**Template Uniqueness:**
- Template name must be unique within tenant
- Cannot have duplicate template names
- Duplicate action should create new template with different name

**Content Validation:**
- Template content cannot be empty
- Email subject must not be empty
- SMS templates must fit within character limits (validate character count)
- Email subject must be < 500 characters
- Merge fields used in template must exist in system
- Invalid merge field references should be caught at save time

**Sender Configuration:**
- Email sender must be valid email format
- SMS sender ID must follow provider requirements
- Reply-to email must be valid format (if provided)
- Display name must be < 256 characters

**Status Transitions:**
- Draft → Active allowed
- Active → Inactive allowed
- Inactive → Active allowed
- Active templates cannot be deleted
- Published templates should not be edited (create new version instead)

**Template Versioning:**
- Old versions must remain immutable
- Current version always editable
- Reverting to old version creates new version
- Version history must not be deleted

**Merge Fields:**
- Merge fields in template must be validated
- Must prevent runtime errors from invalid fields
- Field extraction must handle nested objects
- Example values must be realistic

**Testing:**
- Test recipient must be valid (email or phone)
- Test send must not count toward limits
- Test sends must include audit trail
- Test data must not affect production

**SMS Character Limits:**
- Warn when SMS exceeds 160 characters
- Show SMS part count (e.g., "3 SMS parts")
- Account for merge field expansion in character limit calculation

**WhatsApp Approval:**
- Templates must be approved by WhatsApp API before use
- Approval status must be tracked
- Rejected templates must show rejection reason
- Resubmit capability for rejected templates

---

## Testing Checklist

**Template CRUD Operations:**
- [ ] Create email template successfully
- [ ] Create SMS template successfully
- [ ] Create WhatsApp template successfully
- [ ] Edit template content
- [ ] Edit template metadata
- [ ] Delete draft template
- [ ] Cannot delete active template (shows error)
- [ ] Cannot delete inactive template (shows error)

**Template Versioning:**
- [ ] Template version increments on edit
- [ ] View previous versions
- [ ] Revert to previous version works
- [ ] Reverted version shows correct content
- [ ] Version history displays correctly

**Merge Fields:**
- [ ] Merge fields display in reference
- [ ] Insert merge field button works
- [ ] Merge fields validate at save time
- [ ] Invalid merge fields caught
- [ ] Example values show correctly

**Template Preview:**
- [ ] Preview updates as content changes
- [ ] Merge field values show in preview
- [ ] Email HTML renders correctly
- [ ] SMS character count accurate
- [ ] WhatsApp preview shows buttons

**Template Testing:**
- [ ] Test send executes successfully
- [ ] Test email arrives at recipient
- [ ] Test SMS arrives at recipient
- [ ] Test WhatsApp arrives at recipient
- [ ] Test send doesn't affect analytics
- [ ] Failed test sends show error message

**Template Publishing:**
- [ ] Publish draft template to active
- [ ] Unpublish active template to inactive
- [ ] Published templates appear in production
- [ ] Inactive templates not used

**Bulk Operations:**
- [ ] Bulk delete multiple templates
- [ ] Bulk publish multiple templates
- [ ] Bulk unpublish multiple templates
- [ ] Export templates as JSON
- [ ] Import templates from JSON
- [ ] Import handles conflicts
- [ ] Import displays results

**UI/UX:**
- [ ] Creation wizard steps progress correctly
- [ ] All form fields validate
- [ ] Error messages display clearly
- [ ] Success messages display
- [ ] Navigation between steps works
- [ ] Mobile responsive design
- [ ] Responsive in all breakpoints
- [ ] Accessibility compliance

---

## Implementation Checklist

**Backend Models:**
- [ ] Create NotificationTemplate model
- [ ] Create NotificationTemplateVersion model
- [ ] Create MergeField model
- [ ] Create TemplateAttachment model
- [ ] Database migrations
- [ ] Indexes created

**Backend Services:**
- [ ] Template CRUD service
- [ ] Template versioning service
- [ ] Merge field extraction service
- [ ] Template validation service
- [ ] Template preview service (render with sample data)

**Backend API:**
- [ ] GET /api/notifications/templates/
- [ ] POST /api/notifications/templates/
- [ ] GET /api/notifications/templates/{id}/
- [ ] PATCH /api/notifications/templates/{id}/
- [ ] DELETE /api/notifications/templates/{id}/
- [ ] POST /api/notifications/templates/{id}/test/
- [ ] POST /api/notifications/templates/{id}/publish/
- [ ] POST /api/notifications/templates/{id}/unpublish/
- [ ] POST /api/notifications/templates/{id}/duplicate/
- [ ] GET /api/notifications/templates/{id}/versions/
- [ ] POST /api/notifications/templates/{id}/revert/
- [ ] GET /api/notifications/merge-fields/
- [ ] POST /api/notifications/templates/bulk-import/
- [ ] GET /api/notifications/templates/bulk-export/
- [ ] GET /api/notifications/templates/{id}/usage/

**Frontend Components:**
- [ ] Template management page
- [ ] Template list component
- [ ] Template creation wizard
- [ ] Template editing form
- [ ] Template preview component
- [ ] Merge fields reference component
- [ ] Template testing component
- [ ] Bulk operations UI
- [ ] Import/export UI
- [ ] Search and filter component

**Frontend Pages:**
- [ ] Settings - Notification Management tab
- [ ] Template list page
- [ ] Template creation page (multi-step)
- [ ] Template editing page
- [ ] Template detail view page

**Integrations:**
- [ ] Email template migration (move hardcoded to database)
- [ ] WhatsApp receipt template migration
- [ ] SMS integration (if enabling)
- [ ] Test send integration with email service
- [ ] Merge field extraction from data models

**Data Migration:**
- [ ] Migrate existing email templates from code to database
- [ ] Migrate existing WhatsApp templates
- [ ] Seed default template library
- [ ] Handle fallback to code templates during transition

**Documentation:**
- [ ] API documentation
- [ ] Merge fields reference documentation
- [ ] Template creation guide
- [ ] Deployment guide

---

## Deployment Strategy

**Phase 1: Backend Infrastructure**
- Deploy NotificationTemplate model and migrations
- Deploy template API endpoints
- Deploy merge field system
- Deploy template versioning service

**Phase 2: Data Migration**
- Migrate existing email templates from code to database
- Migrate WhatsApp receipt template
- Create fallback mechanism to code templates
- Seed default template library

**Phase 3: Frontend - Template Management**
- Deploy template management page
- Deploy template CRUD UI
- Deploy template search/filter
- Enable template creation and editing

**Phase 4: Rollout & Testing**
- Test template CRUD operations
- Test template testing (send test email/SMS)
- Test merge field functionality
- Test bulk operations
- Verify email deliverability with new templates

**Phase 5: Staff Training & Documentation**
- Create training materials for template management
- Document merge fields
- Document best practices
- Train support staff

**Rollback Plan:**
- Maintain original code-based templates as fallback
- If deployment fails, revert API endpoint to use code templates
- Keep database templates for reference
- Clear template cache and restart services

---

## Performance Targets

- Template list load (50 templates): < 500ms
- Template creation: < 1s
- Template editing: < 1s
- Test send execution: < 3s
- Merge field extraction: < 100ms
- Template preview render: < 200ms
- Bulk import (100 templates): < 5s
- Search templates (1000 templates): < 300ms

---

## Monitoring & Alerting

**Key Metrics:**
- Template creation rate
- Template modification frequency
- Test send success rate
- Template usage (how often used in notifications)
- Failed test sends
- Merge field errors
- Template validation errors

**Alerts:**
- Alert if test send fails (by recipient count)
- Alert if template validation errors spike
- Alert if merge field extraction fails
- Alert if template creation rate spikes

**Dashboards:**
- Template usage dashboard (most used templates)
- Template performance (delivery rates by template)
- Merge field usage (which fields used most)
- Template modification history

---

## Documentation Requirements

**User Documentation:**
- Notification template management user guide
- Step-by-step template creation guide
- Merge fields reference guide and examples
- Template testing guide
- Best practices for notification templates
- SMS character limit guidelines
- WhatsApp template approval process guide
- Template import/export guide

**Technical Documentation:**
- API endpoint documentation
- Database schema documentation
- Merge field extraction logic documentation
- Template versioning system documentation
- Deployment guide
- Troubleshooting guide

---

## Future Enhancements

**Advanced Templating:**
- AI-powered template generation and suggestions
- Conditional template blocks (if/else based on data)
- Template loops (for dynamic content lists)
- Nested merge fields and transforms

**Testing & Analytics:**
- Template A/B testing framework
- Template performance analytics
- Click tracking in email templates
- Open rate tracking
- Engagement metrics per template

**Multi-Channel & Localization:**
- Multi-language template support
- Template translation assistance
- Regional template variants
- Language auto-detection

**Personalization:**
- Template recommendation engine
- Behavioral personalization
- Dynamic content optimization
- Template performance prediction

**Integration:**
- Template marketplace
- Community templates
- Third-party template integrations
- Custom template validation rules

**Enterprise Features:**
- Template approval workflow
- Template compliance checking
- Audit logging for all template changes
- Template encryption for sensitive data
