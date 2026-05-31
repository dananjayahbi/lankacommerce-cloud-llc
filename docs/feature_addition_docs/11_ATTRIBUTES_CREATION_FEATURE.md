# Attributes Creation Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned (New Feature)  
**Priority:** High (Phase 2)  
**Scope:** Enterprise-grade product attribute creation interface with real-time validation, intelligent form handling, and production-ready error management

---

## 1. Executive Summary

The Attributes Creation Page provides the interface for administrators to define new product attributes that drive product variant management and customer-facing filtering. Attributes are fundamental to the product catalog, enabling businesses to define product variations (size, color, material, etc.) and provide customers with powerful filtering capabilities during product discovery.

This document details comprehensive requirements for a production-grade attribute creation form with real-time validation, duplicate detection, intelligent field management based on attribute type, multi-step optional workflows, comprehensive error handling, and accessibility features.

---

## 2. Current State Analysis

### 2.1 What Exists
- Basic attribute creation model (POST /api/catalog/attributes/)
- Attribute type system (Text, Number, Select, Multi-Select, Boolean)
- Attribute group assignment capability
- Attribute option management (for select types)
- Basic form structure

### 2.2 Critical Gaps & Issues

#### Missing Form Design & UX
- No progressive disclosure for attribute type-specific fields
- No inline validation feedback
- No attribute name duplicate detection
- No real-time validation of attribute values
- No form submission feedback (loading states, success confirmation)
- No "Create & Continue" option for bulk attribute creation
- No form auto-save or draft saving
- No unsaved changes warning on navigation

#### Missing Field Validation
- No unique name validation across tenant
- No name format validation (alphanumeric, special characters)
- No description length validation
- No attribute group required field validation
- No option value uniqueness validation
- No option order/sequence validation
- No conditional validation based on attribute type

#### Missing Option Management (for Select/Multi-Select)
- No dynamic option addition/removal UI
- No option value and label fields
- No option ordering/drag-and-drop
- No option color/icon assignment (for visual attributes)
- No bulk option import
- No option validation (empty values, duplicates)
- No option preview

#### Missing Type-Specific Features
- No TEXT type specific properties (min/max length, pattern)
- No NUMBER type specific properties (min/max value, decimal places, unit)
- No SELECT/MULTI-SELECT options management interface
- No BOOLEAN type default value selector
- No attribute-specific validation rules

#### Missing Attribute Group Handling
- No group creation from creation form
- No group hierarchy display
- No group selection optimization
- No recommended group suggestions

#### Missing User Experience
- No loading states during form submission
- No success confirmation with next actions
- No error messaging with remediation suggestions
- No field-level error display
- No toast/snackbar notifications
- No form reset option
- No keyboard navigation optimization
- No auto-focus management

#### Missing Accessibility
- No semantic form labels
- No ARIA error announcements
- No keyboard-only operation support
- No focus management
- No color-blind safe indicators

#### Data Consistency Issues
- No tenant isolation validation
- No concurrent creation conflict handling
- No rollback on partial failures
- No audit trail for attribute creation

---

## 3. Detailed Requirements

### 3.1 Frontend - Attribute Creation Form Design

#### 3.1.1 Page Layout & Structure

**Page Header**
- Page title: "Create New Attribute"
- Breadcrumb navigation (Attributes > Create)
- Back button to attributes list
- Help icon with tooltip/documentation link

**Form Container**
- Centered, card-based layout
- Progress indicator (optional, if multi-step: Step 1 of 2)
- Form width constraints (max 800px desktop)
- Left-side navigation for multi-step (if implemented)

#### 3.1.2 Basic Information Section

**Attribute Name Field**
- Required field (marked with asterisk)
- Input type: Text
- Placeholder: "Enter attribute name (e.g., Color, Size, Material)"
- Max length: 255 characters
- Character counter (show current/max: "5/255")
- Real-time validation on blur
  - Check for duplicate names (suggest alternatives if duplicate found)
  - Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  - Trim whitespace automatically
- Error messaging below field with icon
- Helper text: "Unique identifier for this attribute, visible in filters"

**Duplicate Name Detection**
- Debounced API call as user types (after 500ms idle)
- Loading indicator while checking
- Warning message if duplicate found: "This name already exists. Try: Color Type, Color Profile"
- Suggestion links to similar attributes
- Option to continue anyway (might be different variant)

**Description Field**
- Optional field
- Input type: Textarea
- Placeholder: "Provide a detailed description of this attribute for reference"
- Max length: 1000 characters
- Character counter: "0/1000"
- Allow rich text formatting (optional: bold, italic, links)
- Helper text: "Not visible to customers, used internally for reference"

#### 3.1.3 Attribute Type Section

**Attribute Type Selector**
- Required field
- Visual card/button selector (not dropdown for better UX)
- Card options: TEXT, NUMBER, SELECT, MULTI-SELECT, BOOLEAN
- Each card displays:
  - Type name
  - Icon representation
  - Description of type
  - Example (e.g., "E.g., 'Red', 'Blue'" for TEXT)
- Selected card highlighted with border/background
- Default selection: None (user must choose)
- Change type warning: "Changing attribute type after creation may affect existing products"

**Type Descriptions**
- TEXT: "Free-form text values (e.g., Color, Material, Brand)"
- NUMBER: "Numeric values with optional unit (e.g., Weight: 500g, Size: 40cm)"
- SELECT: "Single selection from predefined options (e.g., Size: S, M, L, XL)"
- MULTI_SELECT: "Multiple selections from options (e.g., Features: Waterproof, Lightweight, Durable)"
- BOOLEAN: "Yes/No or On/Off values (e.g., Organic: Yes/No)"

**Type-Specific Fields Show/Hide Logic**
- Show/hide fields based on selected type
- TEXT type: Show min/max length fields
- NUMBER type: Show number properties section
- SELECT/MULTI_SELECT: Show options section
- BOOLEAN type: Show default value selector

#### 3.1.4 Attribute Group Section

**Attribute Group Selector**
- Optional field (but recommended)
- Dropdown with hierarchical display
- Show all available groups with group icons
- Hierarchical nesting display (e.g., "Appearance > Color")
- Search/filter groups by typing
- Option to create new group from this form
  - Inline group creation button: "+ Create New Group"
  - Modal popup for quick group creation
  - Group name field, optional description
  - Success confirmation, adds group to list
- Default value: None (show placeholder "Select a group or create new")
- Helper text: "Groups help organize related attributes"

#### 3.1.5 Searchable & Filterable Flags Section

**Toggle Controls**
- Two toggle switches side-by-side:
  1. "Make Searchable": Enables search by this attribute on customer-facing store
  2. "Make Filterable": Enables filtering by this attribute in product filters

- Default state: Both enabled (checked)
- Each toggle includes:
  - Toggle switch (visual indicator ON/OFF)
  - Label describing the flag
  - Help icon with tooltip

**Tooltip/Help Text**
- Searchable: "Customers can search products by this attribute value"
- Filterable: "Customers can filter product results by this attribute"

#### 3.1.6 TEXT Type Specific Fields

**Minimum Length Field**
- Input type: Number
- Min value: 0
- Default: 0
- Label: "Minimum Length (characters)"
- Helper text: "Minimum character length required for values"

**Maximum Length Field**
- Input type: Number
- Min value: 1
- Max value: 10000
- Default: 255
- Label: "Maximum Length (characters)"
- Helper text: "Maximum character length allowed for values"
- Validation: max must be >= min

**Pattern Field (Optional)**
- Input type: Text
- Label: "Validation Pattern (Regex, optional)"
- Placeholder: "^[A-Z]+$" (example for uppercase only)
- Helper text: "Regular expression for value validation"
- Pattern test button: "Test Pattern" to validate against sample input

#### 3.1.7 NUMBER Type Specific Fields

**Minimum Value Field**
- Input type: Number
- Allow decimal input
- Label: "Minimum Value"
- Helper text: "Minimum numeric value allowed"

**Maximum Value Field**
- Input type: Number
- Allow decimal input
- Label: "Maximum Value"
- Helper text: "Maximum numeric value allowed"

**Decimal Places Field**
- Input type: Number
- Min: 0, Max: 10
- Default: 0
- Label: "Decimal Places"
- Helper text: "Number of decimal places for precision"

**Unit Field**
- Input type: Text
- Label: "Unit (optional)"
- Placeholder: "e.g., kg, cm, ml, °C"
- Helper text: "Unit of measurement displayed with value"
- Optional: Predefined units dropdown (kg, g, ml, L, cm, m, etc.)

#### 3.1.8 SELECT & MULTI-SELECT Type Options Section

**Options Management Interface**
- Section title: "Attribute Options"
- Subtitle: "Define the available values for this attribute"
- Required: "At least 2 options required for SELECT/MULTI-SELECT types"

**Options Table/List**
- Column headers: Order (drag handle), Name, Value, Color (optional), Delete
- Add Option button: "+ Add Option" at bottom of list
- Reorder capability: Drag-and-drop by order handle or up/down arrows
- Each option row includes:
  - Drag handle (6-dot icon on left)
  - Name input field (required, label for customer display)
  - Value input field (required, internal identifier)
  - Color picker (optional, for visual attributes like colors)
  - Delete button (trash icon, with confirmation)

**Option Name Field**
- Input type: Text
- Placeholder: "Customer-facing name (e.g., 'Small', 'Red', 'Cotton')"
- Max length: 100 characters
- Character counter
- Real-time validation (required, no empty values)
- Error: "Option name required"

**Option Value Field**
- Input type: Text
- Placeholder: "Internal value (e.g., 'S', 'RED', 'COTTON')"
- Max length: 50 characters
- Auto-capitalize suggestions (convert input to UPPERCASE)
- Real-time validation (required, unique within options, alphanumeric + underscore)
- Error messages:
  - "Option value required"
  - "Option value already exists"
  - "Use only alphanumeric characters and underscores"

**Color Picker (for SELECT/MULTI-SELECT)**
- Optional: Show color picker only if attribute is COLOR-related or Appearance group
- Color picker UI: Click to open color modal
- Color input: Hex value input field
- Preset colors: Swatches for common colors
- Display selected color as small square in option row

**Add Option Button**
- Text: "+ Add Option"
- Located below options table
- Adds new empty row
- Focus moves to new option name field
- Button disabled if last option has validation errors

**Option Validation**
- Real-time validation as user types
- Minimum 2 options required for SELECT/MULTI-SELECT
- All option names must be unique
- All option values must be unique
- No empty option names or values
- Display validation summary above form section

**Bulk Option Import (Optional)**
- Button: "Import Options"
- Opens modal to paste/upload options
- Comma-separated or one per line format
- Option mapping: Map imported data to Name/Value fields
- Preview before import

**Option Preview**
- Show small preview of how options will appear
- Display as chips or pills
- Show color preview if color assigned

#### 3.1.9 BOOLEAN Type Specific Fields

**Default Value Selector**
- Radio buttons or toggle: True / False
- Labels: "Yes/On" or "No/Off" (customizable)
- Label for true value: Input field with default "Yes"
- Label for false value: Input field with default "No"
- Default selection: None (user must choose)

#### 3.1.10 Form Actions Section

**Bottom Action Bar (Fixed or Sticky)**
- Located at bottom of form
- Background color: Subtle gray
- Padding around buttons

**Buttons**
1. Cancel button (secondary)
   - Text: "Cancel"
   - Action: Navigate back to attributes list
   - Confirmation if form has unsaved changes: "Discard unsaved changes?"

2. Create button (primary)
   - Text: "Create Attribute"
   - Loading state: Show spinner, disable button, text: "Creating..."
   - Action: Submit form to backend

3. Create & Continue button (tertiary, optional)
   - Text: "Create & New"
   - Action: Submit form and show new empty form for rapid creation
   - Useful for bulk attribute creation

#### 3.1.11 Form States & Feedback

**Initial State**
- Empty form with placeholder values
- All required fields unmarked visually
- Create button enabled

**Validation State (On Blur)**
- Field-level validation feedback
- Red border for invalid fields
- Error message below field with icon
- Submit button disabled if critical errors exist

**Duplicate Name Warning State**
- Yellow/warning border on name field
- Warning message: "This name already exists"
- Allow form submission anyway (user's choice)
- Suggest alternatives

**Submit Loading State**
- Submit button disabled
- Show spinner in button
- Disable all form fields
- Show loading message: "Creating attribute..."

**Success State**
- Success toast/snackbar: "Attribute created successfully"
- Auto-dismiss after 3 seconds
- Options: "View Details", "Create Another", "Go to List"
- Redirect to attributes list after 2 seconds if no action

**Error State**
- Error toast with retry button
- Show error details in modal
- Log error for support
- Preserve form data for resubmission

**Unsaved Changes Warning**
- On page/tab close: "You have unsaved changes"
- On navigation away: "Discard unsaved changes?"
- Auto-save draft (optional): Save to localStorage every 10 seconds

#### 3.1.12 Mobile View Optimizations

**Mobile Layout**
- Full-width form
- Single column layout
- Larger input fields and buttons
- Fixed bottom action bar
- Scrollable form content

**Touch Interactions**
- Larger tap targets (min 44x44px)
- Swipe to reorder options
- Long-press for context menu on options
- Tap to expand detailed information

#### 3.1.13 Keyboard Navigation & Accessibility

**Keyboard Support**
- Tab key: Navigate through form fields
- Shift+Tab: Navigate backwards
- Enter: Submit form (when focus on submit button)
- Escape: Close modal/popups
- Arrow keys: Navigate option list, toggle between type cards
- Space/Enter: Activate toggle switches

**Accessibility Features**
- ARIA labels on all form fields
- Semantic HTML form structure
- Error announcements for screen readers
- Required field indicators (asterisk with aria-label)
- Focus visible on all interactive elements
- Form labels associated with inputs (for attribute)
- Error messages linked to fields (aria-describedby)
- Form validation summary announced

#### 3.1.14 Multi-Step Form (Optional Alternative)

**Step 1: Basic Information**
- Attribute Name, Description, Type, Group

**Step 2: Configuration**
- Type-specific fields (options, properties)
- Searchable, Filterable flags

**Step Progress Indicator**
- Visual progress bar
- Step labels
- Next/Previous buttons instead of single submit
- Or: Save as draft option

### 3.2 Backend - Attribute Creation Endpoints

#### 3.2.1 Create Attribute Endpoint

**Endpoint**: POST /api/catalog/attributes/

**Request Body**
- name: String (required, unique within tenant, 1-255 characters)
- description: String (optional, max 1000 characters)
- attribute_type: Enum (required: TEXT, NUMBER, SELECT, MULTI_SELECT, BOOLEAN)
- attribute_group_id: UUID (optional)
- searchable: Boolean (default: true)
- filterable: Boolean (default: true)
- properties: Object (type-specific, see below)
  - For TEXT: min_length (int, default 0), max_length (int, default 255), pattern (string, optional)
  - For NUMBER: min_value (decimal), max_value (decimal), decimal_places (int, default 0), unit (string, optional)
  - For SELECT/MULTI_SELECT: options (array of option objects)
    - Each option: name (string, required), value (string, required), order (int), color (string hex, optional)
  - For BOOLEAN: default_value (boolean), true_label (string, default "Yes"), false_label (string, default "No")

**Response**
- Success response with created attribute details
- Include: ID, name, type, group_id, properties, created_at, searchable, filterable
- For SELECT/MULTI_SELECT: Include options array

**Status Codes**
- 201 Created: Successful creation
- 400 Bad Request: Validation error (duplicate name, invalid type, etc.)
- 401 Unauthorized: User not authenticated
- 403 Forbidden: User lacks permission
- 409 Conflict: Duplicate attribute name

#### 3.2.2 Duplicate Name Check Endpoint (Optional)

**Endpoint**: GET /api/catalog/attributes/check-name/

**Query Parameters**
- name: String (required, attribute name to check)
- exclude_id: UUID (optional, exclude this attribute ID from check, for edit)

**Response**
- is_duplicate: Boolean
- suggestions: Array of similar attribute names if duplicate
- message: String with friendly message

#### 3.2.3 Attribute Group List Endpoint

**Endpoint**: GET /api/catalog/attribute-groups/

**Query Parameters**
- limit: Integer (default 100)
- page: Integer (default 1)
- search: String (optional, filter by group name)

**Response**
- Array of attribute groups
- Include: ID, name, description, parent_group_id (if hierarchical), product_count (optional)

#### 3.2.4 Create Attribute Group Endpoint (Optional)

**Endpoint**: POST /api/catalog/attribute-groups/

**Request Body**
- name: String (required, unique within tenant)
- description: String (optional)
- parent_group_id: UUID (optional, for hierarchy)

**Response**
- Created group details

### 3.3 Validation Rules

#### 3.3.1 Attribute Name Validation
- Required, non-empty
- Unique within tenant
- Length: 1-255 characters
- Allowed characters: Letters, numbers, spaces, hyphens, underscores
- Trim whitespace
- Case-insensitive uniqueness check

#### 3.3.2 Description Validation
- Optional field
- Max length: 1000 characters
- No HTML/script injection (sanitize input)

#### 3.3.3 Attribute Type Validation
- Required
- Valid enum: TEXT, NUMBER, SELECT, MULTI_SELECT, BOOLEAN
- Cannot change type after creation (or requires special permission)

#### 3.3.4 TEXT Type Properties
- min_length: 0 or positive integer
- max_length: positive integer > min_length
- pattern: Valid regex (if provided)
- min_length must be <= max_length

#### 3.3.5 NUMBER Type Properties
- min_value and max_value: Valid decimal numbers
- min_value must be <= max_value (if both provided)
- decimal_places: 0-10
- unit: Alphanumeric and common symbols only

#### 3.3.6 SELECT/MULTI_SELECT Options
- Minimum 2 options required
- Each option: name (1-100 chars), value (1-50 chars, alphanumeric + underscore)
- Option names must be unique within attribute
- Option values must be unique within attribute
- Option order must be sequential integers starting from 0
- Color (if provided): Valid hex code

#### 3.3.7 BOOLEAN Type
- default_value: true or false
- true_label, false_label: 1-50 characters each

#### 3.3.8 Group Validation
- attribute_group_id: Valid UUID if provided, must exist
- Group must belong to same tenant

### 3.4 Security Considerations

#### 3.4.1 Authorization
- User must have CREATE_ATTRIBUTE permission
- User must belong to tenant making the request
- Validate tenant_id from user context

#### 3.4.2 Input Sanitization
- Sanitize name, description, option names (remove XSS vectors)
- Validate regex patterns (no ReDOS vulnerabilities)
- Prevent CSV injection in any string fields
- SQL injection prevention (use parameterized queries)

#### 3.4.3 Rate Limiting
- Rate limit attribute creation: 10 per minute per user
- Rate limit duplicate name checks: 20 per minute per user
- Prevent brute-force enumeration of existing attributes

#### 3.4.4 Audit Logging
- Log all attribute creation attempts (success and failure)
- Include user ID, timestamp, request data, response status
- Log duplicate name check queries

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- Concurrent creation of same attribute name (race condition)
- Very long option lists (1000+ options)
- Special characters in option names (emoji, unicode)
- Whitespace-only input values
- Zero or negative numbers for numeric attributes
- Empty description vs non-existent description
- Attribute group deleted while creating attribute
- Network timeout during form submission
- Duplicate form submission (user clicks submit twice)
- Browser back button after successful creation
- Tab closure after form submission but before redirect

### 4.2 Validation Conflicts
- Name exists + user confirms: Allow (user's explicit choice)
- Type SELECT but < 2 options: Reject
- Number type with invalid decimal places: Reject
- Text type with min > max: Reject
- No group selected: Allow (optional field)

### 4.3 Error Recovery
- Display form with entered data on validation error
- Preserve option list on error
- Allow retry without reentering data
- Provide clear error messages with actionable suggestions

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Name validation (unique, format, length)
- Type-specific property validation
- Option validation (unique, count, format)
- Regex pattern validation (safe patterns)
- Sanitization of inputs (XSS prevention)
- Permission checks

### 5.2 Integration Tests
- Complete attribute creation flow (all types)
- Duplicate name detection
- Attribute group assignment
- Option creation and ordering
- Form submission with all field combinations
- Concurrent creation attempts
- Error scenarios (network timeout, partial failure)

### 5.3 UI Tests
- Form rendering with all field types
- Validation error display
- Dynamic field show/hide based on type
- Option add/remove/reorder functionality
- Loading states and transitions
- Keyboard navigation
- Mobile responsiveness

### 5.4 Performance Tests
- Form load time: < 500ms
- Duplicate name check response: < 300ms
- Form submission time: < 1 second
- Auto-complete suggestions response: < 200ms

### 5.5 Acceptance Criteria
- [ ] Form renders correctly for all attribute types
- [ ] Name validation works (duplicate detection)
- [ ] Type-specific fields show/hide correctly
- [ ] Options can be added, edited, deleted, reordered
- [ ] Form validates before submission
- [ ] Success message displays on creation
- [ ] Error messages are clear and actionable
- [ ] Mobile view is usable
- [ ] Keyboard navigation works
- [ ] Accessibility features functional
- [ ] Form state preserved on validation error
- [ ] Unsaved changes warning works
- [ ] Rate limiting prevents abuse

---

## 6. Frontend Implementation Checklist

- [ ] Create form page layout and structure
- [ ] Create attribute name input with duplicate detection
- [ ] Create description textarea
- [ ] Create attribute type selector (cards or buttons)
- [ ] Create attribute group selector dropdown
- [ ] Create searchable and filterable toggle controls
- [ ] Create type-specific field sections (TEXT, NUMBER, SELECT, BOOLEAN)
- [ ] Create options management interface
- [ ] Implement dynamic field show/hide based on type
- [ ] Implement option add/remove/reorder functionality
- [ ] Create form validation logic (client-side)
- [ ] Create error message display
- [ ] Create loading states (duplicate check, form submission)
- [ ] Create success confirmation
- [ ] Implement unsaved changes warning
- [ ] Create form reset functionality
- [ ] Add keyboard navigation and shortcuts
- [ ] Add accessibility features (ARIA labels, semantic HTML)
- [ ] Implement mobile responsive design
- [ ] Add auto-save (draft) functionality (optional)
- [ ] Create multi-step form alternative (optional)

---

## 7. Backend Implementation Checklist

- [ ] Create POST endpoint for attribute creation
- [ ] Implement name uniqueness validation
- [ ] Implement duplicate name check endpoint
- [ ] Implement type-specific validation
- [ ] Create attribute group endpoints
- [ ] Implement option validation and ordering
- [ ] Add authorization and permission checks
- [ ] Add input sanitization (XSS, SQL injection prevention)
- [ ] Add rate limiting
- [ ] Add comprehensive error handling
- [ ] Add audit logging
- [ ] Handle concurrent creation conflicts
- [ ] Implement transaction handling
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization

---

## 8. API Documentation

### 8.1 Request Documentation
- Document all required and optional fields
- Provide examples for each attribute type
- Document validation rules for each field
- Document error responses

### 8.2 Response Documentation
- Document successful creation response format
- Document error response formats
- Include HTTP status codes and meanings

### 8.3 Validation Documentation
- Document name uniqueness scope (per tenant)
- Document allowed characters
- Document type-specific requirements

---

## 9. Deployment & Rollout

### 9.1 Pre-Deployment
- Test with various input patterns
- Load test duplicate name check
- Security audit on input sanitization
- Verify rate limiting configuration

### 9.2 Deployment Steps
1. Deploy backend endpoints
2. Deploy frontend form with feature flag
3. Test end-to-end flow
4. Monitor error rates
5. Gradually enable for users

### 9.3 Rollback Plan
- Disable creation via feature flag if critical issues
- Keep old attribute management available
- Reverse database changes if data integrity issues

---

## 10. Performance & Scalability

### 10.1 Performance Targets
- Form load time: < 500ms
- Duplicate name check: < 300ms
- Form submission: < 1 second
- Option reorder response: < 200ms

### 10.2 Scalability Considerations
- Database indexes for name uniqueness checks
- Caching for frequently accessed attribute groups
- Connection pooling for database
- Rate limiting to prevent abuse

---

## 11. Monitoring & Alerting

### 11.1 Metrics to Track
- Form submission success rate
- Attribute creation duration
- Duplicate name check frequency
- Error rate by field
- Form abandonment rate
- Validation error rate

### 11.2 Alerts
- Alert if submission success rate < 90%
- Alert if duplicate name check slow (> 500ms)
- Alert if error rate > 5%
- Alert if validation failures from specific input patterns

---

## 12. Future Enhancements

- Multi-language attribute support (name translations)
- Bulk attribute import from CSV/Excel
- Attribute templates for common types
- Attribute inheritance/duplication from existing attributes
- Conditional attribute display based on other attributes
- Attribute validation rules engine
- Attribute dependency mapping
- AI-powered attribute suggestions based on product category
- Attribute versioning and history
- A/B testing for attribute naming/organization
- Attribute usage analytics during creation
- Batch attribute creation from product structure analysis
- Attribute translation management integration
