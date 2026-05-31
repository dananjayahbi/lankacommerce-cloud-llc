# Product Edit Page Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned (Enhancement - Existing Endpoint)  
**Priority:** High (Phase 2 Enhancement)  
**Scope:** Product editing with variant management, version history, pricing audit trail, and change tracking

---

## 1. Executive Summary

The Product Edit Page enables modification of existing products, including basic information, variants, pricing, media, and metadata. The current implementation supports basic editing but lacks version history, pricing audit trails, bulk variant updates, change tracking, change notifications, and advanced conflict resolution for concurrent edits.

This document details comprehensive requirements for an enterprise-grade product editing experience with full version history, audit trails, role-based permissions, change notifications, and sophisticated conflict handling.

---

## 2. Current State Analysis

### 2.1 What Exists
- Product detail view with tabs (Basic, Variants, Images, etc.)
- PATCH /api/catalog/products/{product_id}/ endpoint
- Edit individual variant (PATCH variant endpoint)
- Edit product basic info (name, description, category, brand, gender, tags, tax_rule)
- Edit variant pricing and stock
- Inline variant editing (some fields)
- Product deletion capability

### 2.2 Critical Gaps & Issues

#### Missing Edit Workflow Features
- No change summary before save (what changed?)
- No change notifications to other users
- No draft/preview of changes before publishing
- No schedule publish option (publish at specific time)
- No change revert option (undo recent change)
- No version history view
- No revision comparison (see before/after)

#### Missing Audit & History
- No change tracking (who, what, when)
- No pricing history view and audit trail
- No stock level history
- No variant addition/deletion audit
- No user attribution for changes
- No change descriptions/comments by editor

#### Missing Concurrent Edit Handling
- No conflict detection if multiple users edit same product
- No optimistic/pessimistic locking strategy
- No change merge strategy
- No last-writer-wins warning
- No edit session locking (prevent simultaneous edits)

#### Missing Variant Management During Edit
- No variant reordering (change display order)
- No bulk variant operations (price, stock, status)
- No variant archiving (instead of delete)
- No variant history per variant
- No variant attribute changes (size → size2)
- No variant merge (combine two variants)

#### Missing Change & Status Features
- No save as draft (modify but don't publish)
- No scheduling publish to future date
- No change scheduling (schedule price change for date)
- No conditional changes (e.g., price change based on quantity)
- No bulk field updates across variants
- No find and replace (in descriptions, tags)

#### Missing Validation & Conflict Handling
- No warning for unusual changes (price doubled)
- No warning for orphaned variants
- No duplicate detection during edit
- No impact analysis (which sales/orders affected by price change)
- No rollback on validation failure
- No transactional consistency across variants

#### Missing Permissions & Controls
- No field-level permission checks (who can edit cost price?)
- No role-based edit restrictions
- No read-only fields based on permissions
- No approval workflow for certain changes
- No change notification based on significance
- No cost price visibility controls

#### Missing User Experience
- No unsaved changes indicator
- No auto-save drafts
- No change preview (what will customer see?)
- No comparison with previous version
- No related changes suggestions (if price changes, warn about margin)
- No impact summary (this change affects X orders)
- No keyboard shortcuts for save/cancel
- No mobile-optimized edit view

#### Performance & Data Issues
- No caching strategy for product detail
- No pagination for variant list (if 1000+ variants)
- No optimistic updates (show change immediately)
- No incremental saves (save individual sections)

---

## 3. Detailed Requirements

### 3.1 Frontend - Product Edit Layout

#### 3.1.1 Page Header & Controls

**Page Header**
- Page title: "Edit Product" or "[Product Name]"
- Product status badge (Draft, Active, Archived)
- Last edited indicator (e.g., "Last edited by John Doe, 2 hours ago")
- Product creation date (small, secondary info)
- Unsaved changes indicator (yellow dot + "Unsaved changes" text)

**Action Buttons**
- Save Changes button (primary, disabled if no changes)
- Cancel button (with unsaved changes warning)
- More Actions dropdown:
  - View Product (link to product detail/preview)
  - Duplicate Product (copy to new product)
  - Move to Draft
  - Schedule Publish (date/time picker)
  - View History (opens version history modal)
  - Restore Previous Version
  - Export Product (JSON, CSV)
  - Delete Product (dangerous action, requires confirmation)

**Change Summary Panel** (Right sidebar, sticky)
- "X unsaved changes" badge with count
- List of changed fields (expandable)
  - Field name, old value, new value
  - Visual diff highlighting (red for removed, green for added)
  - Restore individual field button
- Save/Cancel buttons

#### 3.1.2 Tabbed Interface

**Tabs**
1. Basic Information
2. Variants & Pricing
3. Media & Relationships
4. Metadata & SEO
5. History & Audit

**Tab Features**
- Unsaved changes indicator on tab (orange dot if tab has changes)
- Tab count of unsaved changes (e.g., "Variants (2 changes)")
- Scroll to first changed field in tab on click

#### 3.1.3 Tab 1: Basic Information (Enhanced from Creation)

**All fields from creation wizard, plus:**

**Change History for This Field** (Collapsible)
- Show last 5 changes to this field
- Format: "Changed from 'X' to 'Y' by user on date"
- Restore button for each previous value

**Product Status Section**
- Current status badge (Draft, Active, Archived)
- Status change dropdown:
  - Draft (editing, not visible in POS)
  - Active (available for sale in POS)
  - Archived (hidden from POS, not deletable)
- Schedule status change (e.g., activate on date)

**Publishing Section** (If status = Draft)
- "Ready to Publish" checklist:
  - [ ] Product has name
  - [ ] Product has category
  - [ ] Product has at least one variant
  - [ ] Variant has pricing
  - [ ] Variant has stock
  - [ ] Product has primary image (recommended)
- Publish button (if all checks pass)
- Schedule publish button (publish on specific date/time)

**Change Notifications Section** (If changes made)
- Toggle: "Notify store managers of this change"
- Toggle: "Mark as urgent" (for price changes, etc.)
- Notification message preview

#### 3.1.4 Tab 2: Variants & Pricing (Enhanced)

**Variant List Header**
- Variant count (e.g., "8 variants")
- Changed variants count badge (e.g., "2 modified")
- Add Variant button
- Import Variants button
- Bulk Actions dropdown:
  - Update Price (on selected variants)
  - Update Stock (on selected variants)
  - Archive Selected
  - Unarchive Selected
  - Change Tax Rule
  - Change Category

**Variant List Table** (Enhanced)
- Checkbox for multi-select
- SKU
- Barcode
- Attributes (Size, Color, etc.)
- Cost Price (with change indicator if modified)
- Retail Price (with change indicator)
- Wholesale Price
- Stock (with change indicator)
- Status (badge: Active, Archived)
- Last Modified (relative time)
- Change Summary (tooltip showing what changed)
- Actions:
  - Edit (opens variant detail form)
  - History (shows version history for this variant)
  - Restore (restore to previous state)
  - Archive
  - Delete (if no sales)

**Change Indicators**
- Color background if field changed (light orange)
- Small icon (pencil or clock) on changed fields
- Hover tooltip showing old value
- Undo button per changed field

**Variant Detail Editor** (Modal or Drawer)
- All variant fields from creation
- Additional fields:
  - "Change reason" text field (why are you making this change?)
  - "Notify customers of price change" toggle (if retail_price changed)
  - "Effective date" for scheduled changes
- Comparison with previous values:
  - Side-by-side old/new values
  - Highlight differences in red/green
- Warnings:
  - "Retail price decreased by 20%" (cost implications)
  - "Stock increased by 500%" (audit check)
  - "This variant has 50 sales in the last month" (impact info)

**Bulk Variant Operations** (Modal triggered from dropdown)
- Select fields to update (checkboxes):
  - [ ] Retail Price
  - [ ] Cost Price
  - [ ] Wholesale Price
  - [ ] Stock Quantity
  - [ ] Low Stock Threshold
  - [ ] Tax Rule
  - [ ] Status
- Operation type selector (for price):
  - Set fixed price
  - Increase by amount
  - Increase by percentage
  - Decrease by amount
  - Decrease by percentage
- Preview: "This will affect 8 variants"
- Change reason field
- Apply button

**Pricing Analysis Section** (Collapsible)
- Price histogram (shows distribution of prices across variants)
- Average price, median price, min, max
- Warning if variation is unusual (e.g., one variant much cheaper)
- Margin analysis
  - Average margin per variant
  - Low margin variants (warning if < 20%)
  - Margin comparison with previous period

#### 3.1.5 Tab 3: Media & Relationships (Enhanced)

**Product Images**
- Current images gallery
- Each image with:
  - Thumbnail
  - Alt text edit
  - Set as primary button
  - Delete button
  - Upload date
- Add images button (to existing)
- Reorder images (drag & drop)
- Replace image button (swap image, keep URL if external)
- Image optimization status (compressed, size reduction)

**Product Video**
- Current video URL (if any)
- Edit/remove button
- Add video button
- Video preview with thumbnail
- Video duration display

**Related Products** (Enhanced)
- Related products table:
  - Product name/ID
  - Relationship type (Upsell, Cross-sell, Replacement)
  - Last modified date
  - Remove button
- Add related product button
- Suggested related products (based on category, sales patterns)

**Product Bundles** (If applicable)
- Bundle components table
- Edit component quantities
- Add/remove components
- Auto-recalculate bundle price
- Bundle pricing rules

#### 3.1.6 Tab 4: Metadata & SEO (Enhanced)

**All SEO fields from creation, plus:**

**Change History**
- Show last 5 changes to metadata
- Restore previous metadata button

**SEO Preview**
- Search result preview (how it appears in Google)
- Mobile preview
- Live update as you type

**Advanced SEO** (Collapsible)
- Canonical URL field
- Robots meta tag selector (index, follow, etc.)
- Open Graph tags (social media sharing preview)
- Schema markup (auto-generated, can customize)

**Attributes** (Enhanced)
- All custom attributes
- Change history per attribute
- Restore attribute button

#### 3.1.7 Tab 5: History & Audit (New)

**Change History Timeline**
- Timeline view of all changes to this product
- Each change entry shows:
  - Date/time (relative and absolute)
  - User who made change
  - What changed (field name)
  - Old value → New value (with visual diff)
  - Change reason/comment (if provided)
  - Revert button (restore to state before this change)
- Filter by:
  - User
  - Field type (pricing, stock, metadata)
  - Date range
- Sort by newest/oldest first

**Version Snapshots** (Optional)
- List of saved versions (auto-saved, manual saves, published versions)
- Each version with:
  - Version number
  - Timestamp
  - User name
  - Change summary
  - "Restore to this version" button
  - "Compare with current" button
  - "Compare with previous" button

**Version Comparison** (Modal)
- Side-by-side comparison of two versions
- Fields that changed highlighted
- All variants compared
- Summary of changes
- Restore to selected version button

**Audit Log**
- Machine-readable log of all changes (for compliance)
- Export audit log (CSV, JSON)
- Fields: Timestamp, User, Change Type, Old Value, New Value, Change Reason

#### 3.1.8 Mobile Edit View

**Mobile Layout**
- Collapsible sections instead of tabs
- Stacked form fields
- Large touch targets
- Floating save button at bottom
- Simplified change summary (collapsed by default)
- Swipe to navigate between sections

#### 3.1.9 Unsaved Changes & Auto-Save

**Unsaved Changes Handling**
- Visual indicator (yellow dot, "Unsaved changes" text)
- Browser warning on unload (confirm dialog)
- Disable page navigation until saved/discarded
- Preview dialog: show what will be saved before save

**Auto-Save** (Optional)
- Auto-save to draft every 30 seconds (background)
- Show save indicator ("Saving...", then checkmark)
- Save to browser localStorage as fallback
- Restore from localStorage if page crashes

**Change Summary Before Save**
- Modal showing:
  - List of changed fields with old/new values
  - Visual diff for complex fields
  - "Change reason" field (optional)
  - Confirm/Cancel buttons

### 3.2 Backend - Product Edit Endpoints

#### 3.2.1 Enhanced Update Product Endpoint

**Endpoint**: `PATCH /api/catalog/products/{product_id}/`

**Request Body** (all fields optional, only include what's changing)
```
{
  "name": "New Name",
  "description": "New description",
  "category_id": "UUID",
  "brand_id": "UUID",
  "gender": "WOMEN",
  "tags": ["new", "tags"],
  "tax_rule": "REDUCED_VAT",
  "unit_of_measure": "piece",
  "product_code": "CODE123",
  "gtin": "1234567890",
  "country_of_origin": "US",
  "warranty_months": 24,
  "status": "draft|active|archived",
  "change_reason": "Q2 price adjustment",
  "schedule_publish": "2026-06-30T10:00:00Z",
  "variants": [
    {
      "id": "variant_UUID",
      "sku": "NEW-SKU",
      "retail_price": 175.00,
      "stock_quantity": 75,
      "change_reason": "Inventory count"
    }
  ],
  "notify_changes": true,
  "mark_urgent": true
}
```

**Response**
- Returns updated product with all fields
- Includes change summary (what changed)
- Includes previous version info (for conflict detection)
- HTTP 200 OK or 409 Conflict

**Validation** (Enhanced)
- Same as creation, plus:
- Detect concurrent edits (if product modified since user loaded it)
- Warn if price change is unusual (> 50% increase/decrease)
- Warn if stock changed significantly
- Validate category/brand still exist
- Check SKU uniqueness still holds

#### 3.2.2 Conflict Detection Endpoint

**Endpoint**: `GET /api/catalog/products/{product_id}/edit-conflict/?last_modified={timestamp}`

**Returns**
- 200 OK if no conflict
- 409 Conflict if product modified since timestamp, with:
  - Current modified timestamp
  - Who modified it
  - What changed since your last load
  - Merge strategy options

**Merge Strategies**
- Force save (overwrite other user's changes)
- Reload current version (discard your changes)
- Manual merge (user selects which changes to keep)
- Notify other user (ask to coordinate)

#### 3.2.3 Version History Endpoint

**Endpoint**: `GET /api/catalog/products/{product_id}/versions/`

**Query Parameters**
- `limit`: Max versions to return (default 20)
- `offset`: For pagination

**Response**
- Array of versions:
```
[
  {
    "version_number": 5,
    "timestamp": "2026-05-25T14:30:00Z",
    "user_id": "UUID",
    "user_name": "John Doe",
    "change_summary": "Updated price and stock",
    "changes": {
      "retail_price": { "old": 150.00, "new": 175.00 },
      "stock_quantity": { "old": 50, "new": 75 }
    }
  }
]
```

#### 3.2.4 Restore Previous Version Endpoint

**Endpoint**: `POST /api/catalog/products/{product_id}/restore-version/`

**Request Body**
```
{
  "version_number": 3,
  "change_reason": "Reverting price change"
}
```

**Response**
- Returns product with restored data
- Creates new version entry (restore is tracked as a change)

#### 3.2.5 Compare Versions Endpoint

**Endpoint**: `GET /api/catalog/products/{product_id}/compare-versions/?v1=3&v2=5`

**Response**
- Fields that changed between versions
- Before/after values
- Visual diff data (if applicable)

#### 3.2.6 Schedule Change Endpoint

**Endpoint**: `POST /api/catalog/products/{product_id}/schedule-change/`

**Request Body**
```
{
  "effective_date": "2026-06-15T10:00:00Z",
  "changes": {
    "retail_price": 200.00,
    "status": "active"
  },
  "notify_customers": true
}
```

**Response**
- Returns scheduled change entry
- Show countdown to effective date

**Background Job**
- Cron job to apply scheduled changes at effective date
- Send notifications when change applies

#### 3.2.7 Change Notifications Endpoint

**Endpoint**: `POST /api/catalog/products/{product_id}/notify-change/`

**Request Body**
```
{
  "change_type": "price|stock|availability",
  "recipients": ["role:manager", "role:admin", "user:uuid"],
  "message": "Custom notification message"
}
```

**Response**
- Notification sent
- Delivery status per recipient

### 3.3 Version Control & Audit Trail

#### 3.3.1 Automatic Version Creation
- Create version snapshot on each PATCH request
- Store complete product state (all fields, all variants)
- Include user, timestamp, change reason
- Keep last 50 versions (configurable)

#### 3.3.2 Change Tracking
- Track every field change
- Store old value, new value, timestamp
- Track by field (not just by product version)
- Allow querying changes to specific field over time

#### 3.3.3 Audit Log Retention
- Keep audit log indefinitely (for compliance)
- Immutable audit log (can't delete or modify)
- Include:
  - User ID, IP address
  - Change type, field, old value, new value
  - Timestamp, change reason
  - Affected sales/orders (if applicable)

### 3.4 Permission Model for Edit

#### 3.4.1 Basic Permissions
- products.edit: Can edit product basic info
- products.edit_pricing: Can edit variant pricing
- products.edit_stock: Can edit stock quantity
- products.edit_cost_price: Can edit cost price (admin only)
- products.delete: Can delete products
- products.publish: Can publish draft products
- products.approve: Can approve changes (if approval workflow enabled)

#### 3.4.2 Field-Level Permissions
- Cost price: Only visible/editable to users with products.edit_cost_price
- Status/Publish: Only users with products.publish can change
- Delete: Only users with products.delete can delete

#### 3.4.3 Role-Based Restrictions
- Cashier: No edit access
- Store Manager: Can edit basic info and stock
- Product Manager: Can edit pricing, variants, relationships
- Admin: Can edit everything, including cost price
- Superadmin: Full access including approval workflows

### 3.5 Conflict Resolution Strategy

#### 3.5.1 Optimistic Locking
- Include last_modified_at in request
- Server checks if product unchanged since request sent
- If changed (409 Conflict), return latest version and ask user to resolve

#### 3.5.2 Merge Strategies (on conflict)
- Force save (overwrite, risk losing other user's changes)
- Reload (discard your changes, load other user's version)
- Merge (keep both changes if they affect different fields)
- Field-level merge (user selects which changes to keep)
- Notify other user (ask to coordinate before saving)

#### 3.5.3 Locks (Optional)
- Pessimistic locking: Lock product while user editing (prevent others from editing)
- Lock timeout: Auto-release lock after 5 minutes
- Lock release on save or cancel
- Warn other users that product is locked by X user

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- Editing product with 1000+ variants (pagination/performance)
- Concurrent edits to same product (conflict resolution)
- Edit product after it's deleted (return 404 or handle gracefully)
- Changing product type (simple → variable, add variants)
- Merging/unmerging variants (change attributes)
- Variant with sales history (warn before deleting)
- Product with many related products (pagination)
- Restoring very old version with deleted variants
- Scheduled changes that conflict (e.g., two scheduled price changes)
- Cost price change impact on margin reporting

### 4.2 Validation Rules
- Can't change product type after creation (only for new products)
- Can't delete variant with existing sales (must archive instead)
- Can't delete product with variants (must delete variants first)
- SKU must remain unique (can't change to existing SKU)
- Barcode must remain unique (can't change to existing barcode)
- Retail price >= cost price (warn if violated)
- Stock must be non-negative
- Category must exist
- Brand must exist (can be nulled)

### 4.3 Security Considerations
- User can only edit products in their tenant
- Cost price only editable by admin
- Audit log immutable (can't delete changes)
- Track IP address of editor (security audit)
- Prevent CSV injection in exports
- Rate limit edits (100 per minute per user)
- Require additional confirmation for destructive changes (delete)
- Notify on significant changes (price > 50%, delete variant with sales)

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Field validation (same as creation)
- Conflict detection (concurrent edits)
- Version comparison logic
- Change summary generation
- Merge strategy logic
- Permission checks

### 5.2 Integration Tests
- Edit product basic info
- Edit single variant pricing
- Bulk edit variants
- Conflict detection and resolution
- Version restore
- Version comparison
- Scheduled changes
- Change notifications
- Concurrent edits (two users simultaneously)
- Permission enforcement (role-based)

### 5.3 Performance Tests
- Edit product with 50+ variants: < 2 seconds
- Load version history for 50 versions: < 1 second
- Compare two versions: < 500ms
- Conflict resolution: < 1 second

### 5.4 Acceptance Criteria
- [ ] All fields editable (with permission checks)
- [ ] Changes tracked and displayed in summary
- [ ] Unsaved changes warning shows
- [ ] Save creates version entry
- [ ] Conflicts detected on concurrent edits
- [ ] Merge strategies work
- [ ] Version history displays correctly
- [ ] Restore to previous version works
- [ ] Compare versions shows differences
- [ ] Scheduled changes apply on time
- [ ] Change notifications sent to users
- [ ] Audit log complete and immutable
- [ ] Mobile edit view is usable
- [ ] Permission checks enforced
- [ ] Cost price visibility correct
- [ ] Variant changes affect related data correctly

---

## 6. Frontend Implementation Checklist

- [ ] Create product edit page layout
- [ ] Create change summary sidebar
- [ ] Create tabbed interface
- [ ] Implement tab 1: Basic information
- [ ] Implement tab 2: Variants (with bulk ops)
- [ ] Implement tab 3: Media and relationships
- [ ] Implement tab 4: Metadata and SEO
- [ ] Implement tab 5: History and audit
- [ ] Create variant detail editor
- [ ] Create bulk variant operations modal
- [ ] Implement change tracking UI
- [ ] Implement unsaved changes warning
- [ ] Implement conflict resolution UI
- [ ] Create version history view
- [ ] Create version comparison modal
- [ ] Implement auto-save (optional)
- [ ] Create schedule publish dialog
- [ ] Create change notification UI
- [ ] Implement mobile responsive layout
- [ ] Add keyboard shortcuts (Ctrl+S, ESC)
- [ ] Add accessibility features

---

## 7. Backend Implementation Checklist

- [ ] Enhance product update endpoint
- [ ] Implement version history creation
- [ ] Implement version restore endpoint
- [ ] Implement version comparison endpoint
- [ ] Implement conflict detection
- [ ] Implement change notification system
- [ ] Implement scheduled changes processor
- [ ] Add field-level permission checks
- [ ] Add role-based access control
- [ ] Implement audit logging
- [ ] Add change tracking to variants
- [ ] Implement bulk variant update
- [ ] Add caching for product detail
- [ ] Implement optimistic locking
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance test with large variant sets

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment
- Database migration for version history and audit log tables
- Create indexes on audit log tables
- Test conflict detection with concurrent requests
- Test version restore with historical data
- Test permission checks

### 8.2 Deployment Steps
1. Deploy database migrations
2. Deploy backend endpoints
3. Deploy frontend edit pages
4. Verify existing edit functionality works
5. Monitor version history creation
6. Gather user feedback on new features

### 8.3 Rollback Plan
- Revert frontend if UI issues
- Keep version history intact (won't break by reverting endpoints)
- Disable scheduled changes if issues

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Edit page load: < 1 second
- Save product: < 2 seconds
- Load version history: < 1 second
- Compare versions: < 500ms
- Conflict detection: < 500ms

### 9.2 Scalability Considerations
- Pagination for version history
- Archive old versions (keep 50, move older to archive storage)
- Compress change snapshots (only store diffs, not full product)
- Async notifications (background job)
- Cache product data (TTL: 30 seconds)
- Database indexes on frequently queried fields

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Edit save time (p50, p95, p99)
- Conflict detection rate (% of edits that conflict)
- Version history size (avg number of versions per product)
- Audit log size growth
- Permission check latency
- Scheduled change execution latency

### 10.2 Alerts
- Alert if edit save > 3 seconds
- Alert if audit log insert fails
- Alert if scheduled change fails to apply
- Alert if version history > 1000 entries (archive old)

---

## 11. Future Enhancements

- Product edit approval workflow (changes must be approved)
- Change scheduling for all fields (not just status)
- Collaborative editing (real-time sync between users)
- Comment thread on products (discuss changes)
- Change rollback (one-click revert to previous state)
- Intelligent merge (AI suggests best merge strategy)
- Change notifications to customers (price drop alerts)
- A/B testing products (test pricing variants)
- Automatic SKU generation on edit
- Product health score (tracks edit completeness)
- AI-powered suggestions (suggest price based on market, recommend related products)
- Bulk edit across multiple products
- Template-based updates (apply template to product)
