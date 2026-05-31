# Product Category Edit Page - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned  
**Priority:** Critical (Phase 1 Enhancement)  
**Scope:** Comprehensive category editing interface with hierarchy management, change tracking, and conflict resolution

---

## 1. Executive Summary

The Product Category Edit Page allows users to modify existing product categories, including name, hierarchy, media, SEO fields, and metadata. The current implementation provides basic inline editing of category names, but lacks comprehensive edit features, change history tracking, move/reorganization capabilities, and conflict resolution.

This document details comprehensive requirements for an enterprise-grade category editing interface with full form support, change tracking, impact analysis, hierarchy management, and audit trails.

---

## 2. Current State Analysis

### 2.1 What Exists
- Inline category name editing (in tree view)
- Basic save and cancel functionality
- Error handling for duplicate names
- Permission checking (CATEGORIES_EDIT)
- Real-time name updates in tree

### 2.2 Critical Gaps & Issues

#### Missing Form Features
- No full-page edit form (only inline tree edit)
- No access to all category fields (image, description, SEO, etc.)
- No edit to description field
- No image upload/change capability
- No SEO field editing
- No status change interface
- No parent category move interface
- No order/sequence editing

#### Missing Change Management
- No change history tracking
- No view previous versions
- No rollback to previous state
- No change diff visualization
- No who/when tracking for changes
- No edit reason/comment field
- No change audit trail

#### Missing Impact Analysis
- No product count display (affected products)
- No warning if moving category with many products
- No warning if changing name (products still reference old name)
- No impact assessment before changes
- No confirmation for risky changes

#### Missing Hierarchy Management
- No easy category move interface
- No reparenting (change parent) capability
- No preview new hierarchy before save
- No max depth enforcement messaging
- No circular hierarchy prevention
- No orphan handling
- No category merge capability

#### Missing Validation & Feedback
- No real-time validation for name changes
- No duplicate detection after name change
- No circular hierarchy detection on parent change
- No field change indicators (which fields modified)
- No unsaved changes warning
- No before/after comparison

#### Missing Workflow Features
- No draft/publish workflow
- No change approval workflow
- No scheduled publish (edit now, publish later)
- No mass edit capability (edit multiple categories)
- No bulk attribute assignment

#### Missing User Experience
- No empty field indicators
- No field-level help text
- No tooltips for complex fields
- No undo functionality (recent change)
- No success confirmation per field
- No partial save (save only modified fields)
- No auto-save (periodic save of changes)

#### Missing Data Management
- No deletion capability (should be on list page)
- No product reassignment interface
- No related data editing (attributes, pricing)
- No migration tools (merge, consolidate)

---

## 3. Detailed Requirements

### 3.1 Frontend - Category Edit Form

#### 3.1.1 Page Layout & Structure

**Page Header**
- Title: "Edit Product Category" or "Edit: [Category Name]"
- Breadcrumb: Home > Categories > [Category Name]
- Category name display (current value)
- Back button (to category list)
- Help icon (documentation link)
- Last modified info: "Last edited 2 hours ago by John Doe"

**Form Tabs** (Optional, for organization)
- General (basic info, name, parent)
- Media (image, icon)
- SEO (meta fields, slug)
- Advanced (order, visibility, attributes)
- History (change tracking)

**Two-Column Layout** (Optional, desktop only)
- Left: Form fields
- Right: Quick info panel (product count, dates, related info)

#### 3.1.2 General Information Section

**Category Name Field**
- Label: "Category Name" (required indicator *)
- Input: Text input, max 100 characters
- Current value: Pre-populated
- Character counter: "45/100"
- Validation (same as create):
  - Required
  - 2-100 characters
  - No duplicates at same parent level
- Real-time validation: Debounced 500ms
- Modified indicator: Show if field changed from original
- Validation feedback: Green checkmark if valid, red X if invalid
- Error message: Specific error

**Parent Category Field**
- Label: "Parent Category" (optional indicator)
- Input: Dropdown or searchable autocomplete
- Current value: Pre-populated with current parent
- Placeholder: "Select a different parent to reorganize"
- Show hierarchy: "Electronics > Computers" format
- Show product count: "Electronics (45 products)"
- Depth preview: "This will be at level 2"
- Move warning: "You are changing the parent category. Products will remain accessible."
- Circular hierarchy check: Cannot select self or children
- Validation feedback: Green checkmark if valid, red X if invalid
- Modified indicator: Show if parent changed
- Error message: Specific error if invalid parent

**Status Selector**
- Label: "Status"
- Type: Radio buttons
- Options:
  - Active: "Active - Visible in POS and menus"
  - Inactive: "Inactive - Hidden from POS and menus"
  - Draft: "Draft - Not yet published" (optional)
- Current status highlighted
- Description per option
- Warning if changing to Inactive: "Hidden categories and their products won't appear in POS"
- Modified indicator: Show if status changed
- Validation: Required, valid enum

#### 3.1.3 Description & Details Section

**Description Field**
- Label: "Category Description" (optional indicator)
- Type: Rich text editor or textarea
- Current value: Pre-populated
- Max 500 characters
- Character counter: "142/500"
- Modified indicator: Show if changed
- Features: Bold, italic, links (if rich text)
- Validation: Max 500 characters
- Error message: Length exceeded

**Internal Notes Field** (Admin only)
- Label: "Internal Notes" (optional)
- Type: Textarea
- Current value: Pre-populated
- Max 1000 characters
- Character counter: "234/1000"
- Modified indicator: Show if changed
- Validation: Max 1000 characters

**Category Type Selector**
- Label: "Category Type"
- Type: Dropdown or radio
- Current value: Pre-selected
- Warning if changing: "Changing type may affect product assignments"
- Options: Standard, Virtual, Bundle (if applicable)

#### 3.1.4 Media & Branding Section

**Current Image Display**
- Show current image (if exists): Thumbnail 200x200px
- Image info: Filename, size, upload date
- Replace button: "Change Image"
- Remove button: "Remove Image" with confirmation
- Image optimization status: "Optimized for web"

**Image Upload Zone**
- Drag-drop area with upload icon
- Text: "Drag & drop new image here or click to browse"
- Browse button: "Choose File"
- Max file size: 5MB
- Supported formats: JPG, PNG, WebP
- Suggested dimensions: 500x500px

**Image Preview**
- After upload: Show new preview
- Cancel upload: "Cancel" button
- Confirm upload: "Update image" button
- Comparison: Show old vs new (optional, side-by-side)

**Icon Selector** (if applicable)
- Label: "Category Icon" (optional)
- Type: Icon picker or dropdown
- Current icon: Pre-selected
- Preview: Show selected icon large
- Search: Filter icons by name

#### 3.1.5 SEO & Metadata Section

**Slug Field**
- Label: "Category Slug" (optional, technical)
- Type: Text input
- Current value: Pre-populated
- Read-only by default: Toggle "Edit slug" checkbox to enable
- Warning if editing: "Slug is used in URLs. Changing it may break existing links."
- Auto-generate option: Checkbox "Auto-generate from name"
- Validation:
  - Unique at same parent level
  - URL-safe characters only
- Error message: Specific error
- Helper text: "This is used in URLs"

**SEO Title Field**
- Label: "SEO Title" (optional, max 60 chars)
- Type: Text input
- Current value: Pre-populated
- Character counter: "42/60"
- Helper text: "Appears in search results"
- Validation: Max 60 characters
- Modified indicator: Show if changed

**SEO Description Field**
- Label: "SEO Meta Description" (optional, max 160 chars)
- Type: Textarea
- Current value: Pre-populated
- Character counter: "125/160"
- Helper text: "Appears in search results below title"
- Validation: Max 160 characters
- Modified indicator: Show if changed

**SEO Preview Panel**
- Live preview of search result appearance
- Update as fields change
- Shows: Title, URL slug, Meta description
- Visual feedback: Good/warning/needs work indicators

#### 3.1.6 Advanced Settings Section (Collapsible)

**Display Order Field**
- Label: "Display Order" (optional)
- Type: Number input
- Current value: Pre-populated
- Helper text: "Lower numbers appear first"
- Validation: Integer >= 0
- Modified indicator: Show if changed

**Commission Rate Field** (if applicable)
- Label: "Commission Rate (%)" (optional)
- Type: Number input with % symbol
- Current value: Pre-populated
- Range: 0-100, decimal places 2
- Helper text: "Commission percentage for sales"
- Modified indicator: Show if changed

**Tax Category Selector**
- Label: "Tax Category" (optional)
- Type: Dropdown
- Current value: Pre-selected
- Options: Tax categories from system
- Helper text: "Tax applied to products in this category"
- Modified indicator: Show if changed

**Visibility Settings**
- Label: "Visibility" (optional)
- Checkboxes with current state:
  - [ ] Visible in POS (current state)
  - [ ] Visible in Web Store (disabled/grayed out - excluded)
  - [ ] Visible in Customer App (current state if applicable)
  - [ ] Show in navigation menus (current state)
- Modified indicator: Show if any changed
- Warning on disabling: "This category will be hidden from [location]"

**Custom Attributes**
- Label: "Additional Attributes" (optional)
- Type: Dynamic key-value pairs
- Current values: Pre-populated
- Add button: "Add attribute"
- Delete button: Remove attribute row
- Modified indicator: Show if changed

#### 3.1.7 Product Information (Right Panel/Tab)

**Products in Category**
- Count: "25 products"
- List: "Products in this category" (expandable)
- Show first 5 products with link to view all
- Show product count by status (Active: 20, Inactive: 5)

**Hierarchy Impact**
- Subcategories count: "3 subcategories"
- Total products recursive: "45 products (including subcategories)"
- Show warning if many products affected by change

**Dates & Attribution**
- Created: "Created on May 30, 2026 by Admin User"
- Last modified: "Last modified on May 31, 2026 by John Doe"
- Created by: Link to user profile (if available)

#### 3.1.8 Change Summary Section

**Modified Fields Indicator**
- Show if any fields modified: "2 fields changed"
- List of changed fields: "Name, Status"
- Original vs new values (collapsible):
  - "Name: Electronics → Consumer Electronics"
  - "Status: Active → Inactive"

**Change Preview**
- Before/After table (optional)
- Clearly show what will change
- Impact warning if risky change

#### 3.1.9 Form Actions

**Button Bar** (sticky at bottom, mobile)
- Horizontal layout (desktop), vertical (mobile)
- Right-aligned (desktop), full-width (mobile)

**Primary Action: Save Changes**
- Button text: "Save Changes" or "Update Category"
- Type: Primary button
- Enabled only if form modified
- Loading state: Spinner + "Saving..."
- Disabled during submission
- On click: Validate, show before/after if significant change, submit
- After success: Show confirmation, disable save button

**Secondary Action: Cancel/Reset**
- Button text: "Cancel" or "Discard Changes"
- Type: Ghost button
- Behavior: Revert form to original values
- Confirmation if changes: "Discard your changes?"
- Always enabled

**Tertiary Action: Delete Category** (optional, if allowed)
- Button text: "Delete Category"
- Type: Danger button
- On click: Navigate to delete confirmation (or modal)
- Show warning: "This cannot be undone"

**Advanced Actions Dropdown**
- More options button: "..."
- Options:
  - View product history (if tracking)
  - Duplicate this category
  - View change history
  - Revert to previous version (if history available)
  - Export category data

#### 3.1.10 Form States

**Empty/Unchanged State**
- Form displays current category values
- Save button disabled (no changes)
- Form ready for editing
- No modification indicators

**Modified State**
- Fields with changes highlighted or marked with dot
- Save button enabled
- Cancel button enabled
- Show "Unsaved changes" indicator (optional: * in title)
- Show before/after in change preview section

**Loading State**
- During form submission
- Save button disabled and showing spinner
- Form fields disabled
- Cancel button disabled

**Success State**
- Show success message: "Category updated successfully"
- Toast notification or inline message
- Show updated timestamp
- Disable save button (no unsaved changes)
- Option to edit again or navigate back

**Error State**
- Show error message (red)
- Highlight fields with validation errors
- Buttons remain enabled (allow correcting and resubmitting)
- Show retry button (if API error)
- Preserve entered values

**Conflict State** (if concurrent edit by another user)
- Show warning: "Another user edited this category"
- Show conflicting changes
- Options: Reload with new values, override, merge
- Prevent overwriting without user awareness

#### 3.1.11 Change History Tab

**Change Log Display**
- Timeline of all changes to this category
- Latest changes first
- Per change:
  - Date and time
  - User who made change
  - What changed (field names)
  - Before value → After value
  - Edit reason (if provided)

**Change Details**
- Click change to expand and see full details
- Show all fields that changed in that edit
- View button: "View at this time" (show how category looked then)

**Rollback Capability** (if allowed)
- Per change: "Revert to this version" button
- Confirmation before rollback
- Creates new change entry (not destructive)

#### 3.1.12 Responsive Design

**Desktop (>1024px)**
- Two-column layout (form + info panel)
- All fields visible
- Tab navigation (optional)
- Sticky button bar at bottom

**Tablet (768px - 1023px)**
- Single column, collapsible sections
- Info panel becomes top section
- Vertical button stacking
- Simplified layout

**Mobile (<768px)**
- Full width, single column
- All sections collapsed by default
- Vertical button layout
- Larger touch targets (44px min)
- Sticky button bar at bottom

#### 3.1.13 Accessibility Features

**Form Structure**
- Semantic labels for all fields
- ARIA-required for required fields
- ARIA-invalid for fields with errors
- ARIA-describedby for helper text and errors

**Change Indicators**
- Not color-only (also text labels)
- High contrast for modified indicators
- Accessible color scheme

**Keyboard Navigation**
- Tab through all form fields
- Tab order: Name → Parent → Status → Description → Image → SEO → Advanced → Buttons
- Focus visible on all elements
- Enter submits form (if on submit button)
- Escape to cancel/close modal (if modal)
- Alt+S keyboard shortcut for save (optional)

**Screen Reader Support**
- Form landmarks (main, form)
- Section headings (h3)
- Live region for submission status
- Announce changes and errors
- Describe impact of changes (if risky)

---

## 4. Backend - Category Edit Endpoints

### 4.1 Get Category Detail Endpoint

**Endpoint**: `GET /api/catalog/categories/{id}/`

**Query Parameters**
- `include_products`: "true" | "false" (default false)
- `include_history`: "true" | "false" (default false)
- `history_limit`: integer (max 50, default 10)

**Response Structure**
```
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "parent_id": "uuid or null",
    "parent_name": "string or null",
    "status": "active | inactive",
    "description": "string or null",
    "image_url": "string or null",
    "icon": "string or null",
    "slug": "string",
    "meta_title": "string or null",
    "meta_description": "string or null",
    "order": "integer",
    "type": "string",
    "visible_in_pos": "boolean",
    "visible_in_webstore": "boolean",
    "commission_rate": "decimal or null",
    "tax_category": { "id": "uuid", "name": "string" } or null,
    "custom_attributes": { "key": "value" },
    "depth_level": "integer",
    "product_count": "integer",
    "product_count_recursive": "integer",
    "created_at": "ISO datetime",
    "created_by": { "id": "uuid", "name": "string" },
    "updated_at": "ISO datetime",
    "updated_by": { "id": "uuid", "name": "string" },
    "products": [ ... ] (if include_products=true),
    "change_history": [ ... ] (if include_history=true)
  }
}
```

### 4.2 Update Category Endpoint

**Endpoint**: `PATCH /api/catalog/categories/{id}/`

**Content-Type**
- `multipart/form-data` (if image update)
- `application/json` (if no image)

**Request Body** (all fields optional)
```
{
  "name": "string (optional, 2-100 chars)",
  "parent_id": "uuid or null (optional)",
  "status": "active | inactive | draft (optional)",
  "description": "string or null (optional, max 500)",
  "internal_notes": "string or null (optional, max 1000)",
  "image": "file (optional, multipart)",
  "icon": "string or null (optional)",
  "slug": "string or null (optional)",
  "meta_title": "string or null (optional, max 60)",
  "meta_description": "string or null (optional, max 160)",
  "order": "integer (optional)",
  "type": "string (optional)",
  "visible_in_pos": "boolean (optional)",
  "visible_in_webstore": "boolean (optional)",
  "commission_rate": "decimal 0-100 (optional)",
  "tax_category": "uuid or null (optional)",
  "custom_attributes": { "key": "value" } (optional),
  "change_reason": "string or null (optional, for audit trail)"
}
```

**Response Structure**
```
{
  "success": true,
  "data": {
    ... (updated category object, same as GET response)
  },
  "changed_fields": ["name", "status"],
  "changes": {
    "name": { "from": "old value", "to": "new value" },
    "status": { "from": "active", "to": "inactive" }
  }
}
```

**Response Status**
- 200 OK (on success)
- 400 Bad Request (validation error)
- 409 Conflict (duplicate, circular hierarchy, version conflict)
- 404 Not Found (category doesn't exist)

### 4.3 Update Category (with Image) Endpoint

**Endpoint**: `PATCH /api/catalog/categories/{id}/`

**Multipart Form Data**
- Field name for image: "image"
- Max file size: 5MB
- Allowed MIME types: image/jpeg, image/png, image/webp

**Image Update Features**
- Can upload new image (replaces old)
- Can remove image (include `image=` with empty value, or `remove_image=true`)
- Image optimization applied automatically
- Thumbnail generated

### 4.4 Change History Endpoint

**Endpoint**: `GET /api/catalog/categories/{id}/history/`

**Query Parameters**
- `limit`: integer (default 10, max 50)
- `offset`: integer (default 0)

**Response Structure**
```
{
  "success": true,
  "data": {
    "changes": [
      {
        "id": "uuid",
        "changed_at": "ISO datetime",
        "changed_by": { "id": "uuid", "name": "string" },
        "fields": ["name", "status"],
        "changes": {
          "name": { "from": "old", "to": "new" },
          "status": { "from": "active", "to": "inactive" }
        },
        "reason": "string or null"
      }
    ],
    "total": "integer",
    "limit": "integer",
    "offset": "integer"
  }
}
```

### 4.5 Revert to Previous Version Endpoint

**Endpoint**: `POST /api/catalog/categories/{id}/revert/`

**Request Body**
```
{
  "history_id": "uuid",
  "reason": "string (optional, explain reason for revert)"
}
```

**Response**
- Status: 200 OK
- Returns: Updated category object with restored values
- Creates new history entry (not destructive)

### 4.6 Remove Image Endpoint

**Endpoint**: `DELETE /api/catalog/categories/{id}/image/`

**Response**
- Status: 204 No Content
- Category updated with image_url = null

### 4.7 Validation Rules

**Name Validation**
- Optional on update (can skip if not changing)
- If provided: 2-100 chars, no duplicates at same parent level (case-insensitive)
- Trimmed: Remove leading/trailing whitespace

**Parent Validation**
- Optional on update
- If provided: Must exist, belong to same tenant, be active
- Circular: Cannot be self or own descendant
- Max depth: Cannot exceed limit (e.g., 10 levels)

**Slug Validation**
- Optional on update
- If provided: Unique at same parent level, URL-safe characters
- Warning if slug changes: May break external links
- Auto-generate option: From new name if applicable

**Image Validation**
- Optional on update
- File size: Max 5MB
- Format: JPEG, PNG, WebP
- MIME type validation

**Status Validation**
- Optional on update
- Must be valid enum: active, inactive, draft
- Warning on status change: "Products may become hidden"

---

## 5. Data Model & Change Tracking

### 5.1 Category Change History Model

**Fields**
- id: UUID, primary key
- category_id: UUID, foreign key
- changed_at: DateTime
- changed_by_id: UUID, foreign key to User
- fields_changed: JSON array (list of field names that changed)
- changes: JSON object (before/after values)
- change_reason: Text, nullable (user-provided reason)
- created_at: DateTime

**Indexes**
- (category_id, changed_at desc) - for history queries
- (changed_by_id) - for user activity tracking

### 5.2 Audit Logging

**Log on**
- Every PATCH request (if any field changes)
- Every successful update
- Store: User, timestamp, changed fields, before/after values, reason

**Don't log**
- Failed requests (already handled as errors)
- GET requests
- No-op updates (same values)

### 5.3 Conflict Resolution

**Optimistic Locking** (Optional)
- Add `version` field to Category model
- Include version in request
- On update: Check if version matches, if not return 409 Conflict
- Client must reload and re-apply changes

**Timestamp-Based**
- Check if category was modified since load
- If yes: Show conflict resolution dialog
- Options: Reload, Override, Merge

---

## 6. Validation & Edge Cases

### 6.1 Edge Cases
- No fields changed: Don't submit, disable save button
- Moving category with many products: Show warning but allow
- Changing status to inactive: Warn about hidden products
- Long edit history (>1000 changes): Paginate history view
- Concurrent edits by multiple users: Handle with conflict resolution
- Name changed: Slug auto-updates if auto-generate enabled
- Very large description: Handle gracefully (truncate in display)
- Image too large: Show file size error
- Circular hierarchy attempt: Prevent with validation

### 6.2 Validation Rules
- Name: 2-100 chars, no duplicates at level, trimmed
- Parent: Must exist, not circular, valid tenant
- Slug: Auto-generated or manual, URL-safe, unique at level
- Status: Required, valid enum
- Image: Optional, file type/size validation
- SEO: Optional, length limits enforced
- Custom attributes: Optional, key-value pairs

### 6.3 Security Considerations
- User can only edit in their tenant
- Require CATEGORIES_EDIT permission
- Audit log all changes (user, timestamp, what changed)
- Prevent unauthorized field updates (e.g., created_by)
- Validate all inputs (no XSS, SQL injection)
- File upload: Sanitize filename, validate MIME type
- Circular hierarchy: Check before saving

---

## 7. Testing Requirements

### 7.1 Unit Tests
- Name validation (required, length, duplicates)
- Parent validation (exists, circular, depth)
- Slug generation and uniqueness
- Status validation
- Image processing
- History generation
- Conflict detection

### 7.2 Integration Tests
- Update category with all fields
- Update with parent change (move)
- Update with image upload
- Duplicate name detection
- Circular hierarchy prevention
- Permission check
- History tracking
- Concurrent edit scenarios
- Revert to previous version

### 7.3 Acceptance Criteria
- [ ] Form displays current category values
- [ ] Can edit all fields
- [ ] Real-time validation works
- [ ] Duplicate name detected
- [ ] Image upload and update works
- [ ] Parent change (move) works
- [ ] Save creates change history entry
- [ ] Circular hierarchy prevented
- [ ] Permission enforced
- [ ] Success message shows
- [ ] Unsaved changes warning works
- [ ] Form responsive on mobile
- [ ] Keyboard navigation works
- [ ] Change history displays correctly
- [ ] Can revert to previous version

---

## 8. Frontend Implementation Checklist

- [ ] Create CategoryEditForm component
- [ ] Create form field components
- [ ] Create image upload/update component
- [ ] Create SEO preview component
- [ ] Create change summary component
- [ ] Create change history viewer component
- [ ] Implement form population from API
- [ ] Implement change detection (modified indicator)
- [ ] Implement real-time validation
- [ ] Implement duplicate name detection
- [ ] Implement form submission with loading
- [ ] Implement success/error messaging
- [ ] Implement unsaved changes warning
- [ ] Implement image upload and preview
- [ ] Implement revert to previous version
- [ ] Implement responsive design
- [ ] Add accessibility features
- [ ] Add unit tests
- [ ] Add integration tests

---

## 9. Backend Implementation Checklist

- [ ] Implement GET category detail endpoint
- [ ] Implement PATCH update endpoint
- [ ] Implement change history tracking
- [ ] Implement revert functionality
- [ ] Implement conflict detection (optional)
- [ ] Implement circular hierarchy check
- [ ] Implement duplicate name check (at parent level)
- [ ] Implement image upload/update/delete
- [ ] Implement permission checks
- [ ] Create ChangeHistory model and migration
- [ ] Implement audit logging
- [ ] Implement error handling and validation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Document API endpoint (OpenAPI)

---

## 10. Deployment & Rollout

### 10.1 Pre-Deployment
- Database migration testing
- Concurrent edit testing
- Performance testing
- Conflict resolution testing

### 10.2 Deployment Steps
1. Deploy database migration (ChangeHistory table)
2. Deploy backend API
3. Deploy frontend form
4. Verify API response format
5. Test end-to-end edit flow

### 10.3 Rollback Plan
- Database rollback migration
- Frontend cache invalidation
- Keep old API version temporarily

---

## 11. Performance & Scalability

### 11.1 Performance Targets
- Form load (with history): < 500ms
- Submit/update: < 1 second
- History load: < 200ms (10 items)
- Revert operation: < 1 second

### 11.2 Scalability Considerations
- Cache category data (Redis)
- Paginate change history (max 50 per page)
- Index on (category_id, changed_at) for fast history queries
- Archive old history (>2 years) to separate table

---

## 12. Monitoring & Alerting

### 12.1 Metrics
- Form submission success rate
- Average form load time
- Edit frequency per category
- Most edited categories
- Average history length

### 12.2 Alerts
- Alert if form submission fails > 5% of time
- Alert if form load > 2 seconds
- Alert if slow query on history lookup

---

## 13. Documentation Requirements

### 13.1 For Developers
- API endpoint documentation (OpenAPI)
- Change history schema
- Conflict resolution strategy
- Circular hierarchy detection
- Database schema

### 13.2 For Users
- How to edit category
- How to change hierarchy (move)
- How to upload category image
- Change history and rollback guide
- Best practices for category edits

---

## 14. Future Enhancements

- Scheduled changes (edit now, publish at specific time)
- Change approval workflow (review before publish)
- Bulk edit multiple categories at once
- Merge categories (consolidate products)
- Category templates (restore from template)
- Change notifications (notify when category changes)
- Category deprecation timeline (phase out category)
- A/B testing categories (show different versions to users)
- AI suggestions (optimize based on usage patterns)
