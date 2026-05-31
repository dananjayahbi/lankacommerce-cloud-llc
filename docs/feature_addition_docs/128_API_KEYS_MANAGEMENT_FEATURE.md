# API Keys Management Feature Specification

**Document ID:** 128  
**Feature Name:** API Keys Management  
**Priority:** High  
**Target Release:** Q3 2026  

---

## Executive Summary

The API Keys Management feature provides secure API key generation, management, permissions configuration, and usage tracking for developer access control. This feature enables users to create, manage, and monitor API keys with granular permission scoping, IP whitelisting, and activity tracking to ensure secure programmatic access to the LankaCommerce Cloud API.

---

## Current State Analysis

### EXISTING Infrastructure
- JWT authentication mechanism (token-based)
- User accounts with role-based permissions
- Basic permission system
- User session management
- Activity logging infrastructure

### MISSING (Entirely or Partially)
- API keys model (separate from JWT tokens)
- API keys generation and creation UI
- API keys list and management view
- API keys revocation functionality
- API keys regeneration/rotation UI
- API keys permission configuration
- API keys usage and activity tracking
- API keys last used date tracking
- API keys scope and restriction configuration
- API keys expiration date functionality
- API keys enable/disable functionality
- IP whitelisting for API keys
- Permission scoping for API keys
- API key activity audit trail

---

## Frontend Features

### User Settings - API Keys Management Tab

#### API Keys Overview Section
- Key metrics display:
  - Total API keys count
  - Active keys count
  - Inactive keys count
  - Keys needing rotation (>90 days old)
- Create new API key button (primary action)
- Security tips and best practices section
- API key guidelines

#### Active API Keys List
- Table display with columns:
  - Key name/display name (masked for security, e.g., "sk_live_*****abcd")
  - Type (Read-only, Write-only, Full Access, Custom)
  - Status badge (active, inactive, expired)
  - Created date (formatted date)
  - Last used date (formatted date or "Never used")
  - Expiration date (formatted date or "No expiration")
  - Permissions summary (e.g., "Read-only", "Custom scopes")
  
- Row actions menu:
  - View details button (arrow/expand icon)
  - Edit button (edit name/description)
  - Rotate/regenerate button (generate new key)
  - Revoke button (permanently disable)
  - Copy button (one-time display of key)
  - Download button (export key details)

- Sorting options:
  - By created date (newest/oldest)
  - By last used date
  - By expiration date
  - By status

- Filter options:
  - By status (active, inactive, expired)
  - By type (read-only, write-only, full access, custom)
  - By expiration (never, expiring soon, already expired)

- Search box (search by key name)

#### Create API Key - Multi-Step Process

**Step 1: Basic Information**
- Key name/description field (required, alphanumeric)
- Key purpose field (optional, textarea for notes)
- Key type selector (required):
  - Read-only option (for read-only operations, GET/HEAD)
  - Write-only option (for write operations, POST/PATCH/PUT/DELETE)
  - Full access option (read and write)
  - Custom option (select specific permissions)
- Next button (validation required)

**Step 2: Permissions Configuration (if custom selected)**
- Permissions matrix display:
  - Row headers: Resources (Products, Orders, Customers, Inventory, Accounts, CRM, HR, Reports, Billing, etc.)
  - Column headers: Operations (Create, Read, Update, Delete)
  - Checkboxes for each resource-operation combination
- Select all button (select all permissions)
- Deselect all button (clear all permissions)
- Suggested permission sets/templates:
  - "Shop Manager" (read all, write products/orders)
  - "Report Viewer" (read reports only)
  - "Customer Service" (read all, write customer info)
  - Custom templates based on common roles
- Next button

**Step 3: Restrictions and Constraints**
- IP whitelist section (optional):
  - Textarea or comma-separated input for IP addresses
  - Add IP button
  - Remove IP button
  - List of currently whitelisted IPs with delete buttons
  - CIDR notation support explanation
- Allowed domains field (optional):
  - Textarea or comma-separated input for domains
  - Add domain button
  - Remove domain button
- Expiration date selector (optional):
  - Radio buttons:
    - "Never expire" (selected by default)
    - "Expires in..." dropdown
      - 30 days
      - 60 days
      - 90 days
      - 1 year
    - Custom date picker
- API rate limiting override (if applicable):
  - Higher rate limit option (may require paid plan)
- Next button

**Step 4: Review and Generate**
- Summary display section:
  - Key name
  - Key type
  - Permissions list
  - Restrictions (IP whitelist, domains, expiration)
  - Review button (to edit)
- Generate button (final confirmation)
- Cancel button

**Completion Screen**
- Success message
- API key display (highlighted, one-time display):
  - Full key value in monospace font
  - Visual warning: "Key will not be shown again"
- Copy to clipboard button
- Download key button:
  - Download as .env format (KEY=value)
  - Download as JSON
- Acknowledge checkbox (required):
  - "I have saved my API key in a safe place"
- Done button

#### API Key Detail View

**Header Section:**
- Key name
- Status badge (active/inactive/expired)
- Created date
- Edit button (edit name/description)

**Basic Information Section:**
- Key name/description (with edit option)
- Key ID (not the actual key, safe to display)
- Key type (Read-only, Write-only, Full Access, Custom)
- Status (active/inactive/expired/revoked)

**Permissions Section:**
- Permissions summary (human-readable list)
- Edit permissions button (if custom permissions)
- Permissions matrix display (read-only view)

**Restrictions Section:**
- IP whitelist display (list of whitelisted IPs)
- Allowed domains display (list of allowed domains)
- Expiration date display
- Edit restrictions button

**Activity Section:**
- Last used date (formatted date and time)
- Last IP address used (display with caution for privacy)
- Total API calls made (all time)
- API calls this month
- Activity chart (calls per day over last 30 days)
- Recent API calls table:
  - Endpoint called
  - HTTP method
  - Response status
  - Timestamp
  - IP address
  - User agent (optional)
  - Rows: last 10 calls
  - View more link (paginated history)

**Actions Section:**
- Edit button (edit name and description)
- Rotate/regenerate button
- Revoke button
- Disable button (if currently enabled)
- Enable button (if currently disabled)
- View activity history link

#### Edit API Key Modal

**Editable Fields:**
- Key name field
- Key description field
- Permissions (if custom permissions):
  - Permission matrix (same as creation)
- Restrictions (if editable):
  - IP whitelist
  - Allowed domains
  - Expiration date

**Actions:**
- Save changes button
- Cancel button
- Discard changes option

#### Rotate API Key Confirmation Modal

**Content:**
- Warning message:
  - "Rotating will generate a new key"
  - "Your old key will be revoked immediately"
  - "Update any integrations to use the new key"
- Last used date display (for context)
- Current permissions display

**Actions:**
- Generate new key button (confirmation)
- Cancel button

**Success - New Key Display:**
- Success message
- New key value display (one-time, highlighted)
- Copy to clipboard button
- Download button (.env or JSON format)
- Acknowledge checkbox (required)
- Done button

#### Revoke API Key Confirmation Modal

**Content:**
- Warning message:
  - "This action cannot be undone"
  - "The API key will be permanently revoked"
  - "Any integrations using this key will stop working"
- Last used date display
- Last IP address used
- Total calls made

**Confirmation:**
- Type "revoke" security measure (user must type word to confirm)
- OR checkbox confirmation (if typing not preferred)

**Actions:**
- Revoke button (enabled only after confirmation)
- Cancel button

#### Inactive/Revoked Keys Section
- Display recently revoked/inactive keys (for reference)
- Read-only view of basic info
- Cannot reactivate (design choice for security)
- Delete from history option (only after 90 days)
- Reason for revocation (if available)

#### API Key Activity History View
- Detailed activity log for each key
- Filters:
  - By date range
  - By endpoint
  - By status code
  - By IP address
- Columns:
  - Timestamp
  - Endpoint
  - HTTP method (color-coded)
  - Status code (color-coded)
  - IP address
  - Response time
  - User agent
- Export history button (CSV, JSON)
- Pagination

---

## Backend API Requirements

### API Key Management Endpoints

**GET /api/v1/users/me/api-keys/**
- Purpose: Get all API keys for current user
- Query parameters:
  - limit (pagination)
  - offset (pagination)
  - status (filter: active, inactive, expired)
  - type (filter: read-only, write-only, full, custom)
- Response: Paginated array of API key objects (no key values)
  - id: key ID (UUID)
  - name: key name
  - type: key type
  - status: current status
  - created_at: creation timestamp
  - last_used_at: last usage timestamp
  - expires_at: expiration timestamp
  - permissions: array of permissions

**POST /api/v1/users/me/api-keys/**
- Purpose: Create new API key
- Request body:
  - name: string (required)
  - type: string (read-only, write-only, full, custom)
  - permissions: array (required if type is custom)
  - ip_whitelist: array of IP addresses (optional)
  - allowed_domains: array of domains (optional)
  - expires_at: ISO datetime (optional)
- Response:
  - id: key ID
  - name: key name
  - key_value: full key value (one-time, only in this response)
  - type: key type
  - created_at: creation timestamp
  - permissions: array

**GET /api/v1/users/me/api-keys/{id}/**
- Purpose: Get details for specific API key
- Response: Complete key details
  - id, name, type, status, created_at, last_used_at, expires_at
  - permissions: full permissions array
  - ip_whitelist: array of IPs
  - allowed_domains: array of domains
  - activity_summary: total calls, calls this month
  - recent_activity: array of last 10 calls

**PATCH /api/v1/users/me/api-keys/{id}/**
- Purpose: Update API key settings
- Request body (all optional):
  - name: new name
  - permissions: new permissions (if custom)
  - ip_whitelist: updated IP list
  - allowed_domains: updated domain list
  - expires_at: new expiration date
- Response: Updated key details (no key value)

**POST /api/v1/users/me/api-keys/{id}/rotate/**
- Purpose: Rotate/regenerate API key (old key revoked, new key generated)
- Request body: (empty or confirmation)
- Response:
  - old_key_id: ID of revoked key
  - new_key_id: ID of new key
  - new_key_value: new key value (one-time display)
  - created_at: creation timestamp of new key

**DELETE /api/v1/users/me/api-keys/{id}/**
- Purpose: Revoke API key permanently
- Response:
  - success: boolean
  - revoked_at: timestamp of revocation

**GET /api/v1/users/me/api-keys/{id}/activity/**
- Purpose: Get activity history for API key
- Query parameters:
  - limit (pagination)
  - offset (pagination)
  - date_from: ISO datetime (optional)
  - date_to: ISO datetime (optional)
  - endpoint_filter: string (optional)
  - status_filter: HTTP status code (optional)
- Response: Paginated array of activity records
  - timestamp: when call was made
  - endpoint: API endpoint called
  - http_method: GET, POST, PATCH, etc.
  - status_code: HTTP response code
  - ip_address: source IP
  - user_agent: client user agent
  - response_time_ms: milliseconds

**POST /api/v1/api-keys/validate/** (Internal)
- Purpose: Validate API key on each request
- Request body:
  - api_key: key value
  - endpoint: requested endpoint
  - http_method: requested method
  - ip_address: request source IP
- Response:
  - valid: boolean
  - user_id: if valid
  - permissions: if valid
  - rate_limit: applicable rate limit

**POST /api/admin/api-keys/activity/** (Internal)
- Purpose: Track API key usage (called by middleware)
- Request body:
  - api_key_id: key identifier
  - endpoint: endpoint path
  - http_method: HTTP method
  - status_code: response code
  - ip_address: request source IP
  - user_agent: client user agent
  - response_time_ms: execution time
- Response:
  - success: boolean

---

## Database Requirements

### APIKey Model
- id: UUIDField (primary key)
- user_id: ForeignKey (User)
- key_hash: CharField (hashed key, never plain text)
- key_type: CharField (choices: read_only, write_only, full, custom)
- name: CharField (user-friendly name)
- description: TextField (optional)
- permissions: JSONField (array of permission objects)
- status: CharField (choices: active, inactive, revoked, expired)
- is_enabled: BooleanField (can temporarily disable without revoking)
- ip_whitelist: JSONField (array of IP addresses)
- allowed_domains: JSONField (array of domain names)
- created_at: DateTimeField (auto-created)
- last_used_at: DateTimeField (nullable, updated on use)
- expires_at: DateTimeField (nullable, if never expire then null)
- revoked_at: DateTimeField (nullable, when revoked)
- revoked_by: ForeignKey (User, nullable, who revoked)
- rate_limit_override: IntegerField (nullable, custom rate limit if applicable)
- metadata: JSONField (optional, for future extensibility)

**Indexes:**
- (user_id, status)
- (user_id, created_at DESC)
- (last_used_at DESC)
- (expires_at)
- (key_hash) - UNIQUE

**Constraints:**
- Cannot update revoked key
- Cannot use expired key

### APIKeyActivity Model
- id: UUIDField (primary key)
- api_key_id: ForeignKey (APIKey, on_delete=CASCADE)
- endpoint: CharField (API endpoint path)
- http_method: CharField (GET, POST, PATCH, PUT, DELETE)
- status_code: IntegerField (HTTP response status)
- ip_address: GenericIPAddressField
- user_agent: CharField (optional)
- response_time_ms: IntegerField (milliseconds)
- request_body_size: IntegerField (bytes, optional)
- response_body_size: IntegerField (bytes, optional)
- timestamp: DateTimeField (auto-created)

**Indexes:**
- (api_key_id, timestamp DESC)
- (timestamp DESC) - for cleanup queries
- (ip_address) - for security analysis

**Retention:**
- Keep records for 90 days minimum
- Optional: Archive older records

### APIKeyPermission Model (if using separate permissions)
- id: UUIDField (primary key)
- api_key_id: ForeignKey (APIKey, on_delete=CASCADE)
- resource: CharField (Product, Order, Customer, etc.)
- operation: CharField (create, read, update, delete)
- created_at: DateTimeField

**Alternative:** Use JSONField in APIKey instead of separate model for simpler permissions

---

## Current Implementation Status

### Implemented
- User authentication and authorization system
- Role-based permission system
- User settings pages
- Activity logging infrastructure

### NOT Implemented
- APIKey model
- APIKeyActivity model
- Key generation logic
- Key hashing/encryption service
- Permission validation middleware
- IP whitelist validation middleware
- Expiration check middleware
- Activity tracking middleware
- API key management UI components
- Create/Edit/Rotate modals
- API key activity view
- API key API endpoints
- Database migrations
- Key rotation service

---

## Validation & Edge Cases

### Security Considerations
- API key values must be hashed in database (SHA-256 or bcrypt)
- API key must never be logged in plain text
- API key must never be transmitted in logs or error messages
- API key display must be one-time only (not retrievable after creation)
- Key rotation must invalidate old key immediately
- Revoked keys must be blocked immediately

### Permission Enforcement
- Permissions must be enforced on every API request
- Permission check should happen before business logic
- Denied requests should return 403 Forbidden
- Permission changes should take effect immediately

### Expiration Enforcement
- Expired keys must be rejected (401 Unauthorized)
- Expiration check should be fast (cached if possible)
- Warning should be generated before expiration

### IP Whitelisting
- If IP whitelist configured, requests from other IPs must be rejected
- CIDR notation must be supported
- Localhost (127.0.0.1) should be optional in whitelist

### Rate Limiting
- Rate limits must respect API key scope
- Rate limit headers should be included in response
- Different rates for different key types should be supported

### Audit Trail
- All API key operations must be logged (create, rotate, revoke)
- User who performed action must be recorded
- All API key activity must be tracked
- Activity logs must be immutable (not deletable by users)

### Performance
- Key validation should be fast (<1ms)
- Activity tracking should not slow down API requests (async if needed)
- Key list should load quickly even with many keys
- Activity history should be paginated

---

## Testing Checklist

### Functionality
- [ ] Create API key works correctly
- [ ] API key permissions are enforced on requests
- [ ] IP whitelist is enforced
- [ ] Expiration date is enforced
- [ ] Rotation generates new key and revokes old key
- [ ] Revocation prevents key from being used
- [ ] Edit key settings works
- [ ] Activity tracking records requests
- [ ] Key can be disabled/enabled
- [ ] Multiple keys can be created per user

### Security
- [ ] Keys are hashed in database
- [ ] Keys are not logged in plain text
- [ ] Key display is one-time only
- [ ] Revoked keys cannot be reused
- [ ] Expired keys cannot be used
- [ ] Unauthorized IP addresses are rejected
- [ ] Permission violations return 403 Forbidden
- [ ] Keys cannot be accessed by other users

### User Interface
- [ ] Create flow works end-to-end
- [ ] Key list displays correctly
- [ ] Sorting and filtering work
- [ ] Detail view shows all information
- [ ] Edit modal saves changes
- [ ] Rotate modal works and displays new key
- [ ] Revoke confirmation works
- [ ] Activity history displays correctly
- [ ] Responsive design works on mobile
- [ ] Search functionality works

### Performance
- [ ] Key validation is fast (<1ms)
- [ ] Key list loads quickly
- [ ] Activity tracking does not impact API performance
- [ ] Dashboard metrics load quickly

### Edge Cases
- [ ] Users cannot see other users' keys
- [ ] Admins can manage user keys (if applicable)
- [ ] Expired keys are properly handled
- [ ] Keys with no expiration work correctly
- [ ] Very long IP whitelists work (performance)
- [ ] Concurrent requests with same key work correctly

---

## Implementation Checklist

### Backend Infrastructure
- [ ] APIKey model creation
- [ ] APIKeyActivity model creation
- [ ] Key generation service (cryptographically secure random)
- [ ] Key hashing service (bcrypt or PBKDF2)
- [ ] Database migrations for API key tables
- [ ] Add indexes for performance

### Middleware & Services
- [ ] API key validation middleware
- [ ] Permission check middleware
- [ ] Expiration check middleware
- [ ] IP whitelist check middleware
- [ ] Activity tracking middleware (async)
- [ ] Rate limiting integration with API keys
- [ ] Key rotation service
- [ ] Key revocation service

### API Endpoints
- [ ] GET /api/v1/users/me/api-keys/ (list)
- [ ] POST /api/v1/users/me/api-keys/ (create)
- [ ] GET /api/v1/users/me/api-keys/{id}/ (detail)
- [ ] PATCH /api/v1/users/me/api-keys/{id}/ (update)
- [ ] POST /api/v1/users/me/api-keys/{id}/rotate/ (rotate)
- [ ] DELETE /api/v1/users/me/api-keys/{id}/ (revoke)
- [ ] GET /api/v1/users/me/api-keys/{id}/activity/ (activity)
- [ ] Internal endpoint for key validation

### Frontend Components
- [ ] API Keys tab in user settings
- [ ] API keys list component
- [ ] Create API key multi-step form
- [ ] API key detail view component
- [ ] Edit key modal
- [ ] Rotate key confirmation modal
- [ ] Revoke key confirmation modal
- [ ] Activity history view
- [ ] Dashboard metrics component

### Integration
- [ ] Connect frontend to backend API
- [ ] Implement key validation in all API endpoints
- [ ] Implement activity tracking in middleware
- [ ] Test permission enforcement
- [ ] Test rate limiting with API keys

---

## Deployment Strategy

### Pre-Deployment
- Database backup (critical)
- Staging environment testing:
  - Create keys and test permissions
  - Test expiration enforcement
  - Test IP whitelisting
  - Test rotation and revocation
  - Load testing (activity tracking)
- Security review:
  - Key storage verification
  - Activity logging verification
  - Permission enforcement verification
- Performance baseline

### Deployment Steps
1. Deploy database migrations (add API key tables)
2. Deploy API key models and services
3. Deploy middleware for key validation
4. Deploy API key endpoints
5. Deploy frontend UI components
6. Enable feature flag (if using feature flags)
7. Monitor for issues
8. Gradual rollout (if applicable)

### Post-Deployment
- Testing:
  - Create and test API keys
  - Verify permissions are enforced
  - Verify activity tracking
  - Verify UI functionality
- Staff training: API key management, security practices
- User communication: Announce API key feature
- Security audit: Review key storage and logging
- Monitor metrics: Key creation rate, activity

### Rollback Plan
- Disable feature flag
- Archive API key data
- Keep activity logs for audit
- Clear activity tracking if needed
- Revert migrations if critical issues

---

## Performance Targets

- API key validation: <1ms (with caching)
- Create API key: <200ms
- Get key list: <300ms
- Get key details: <200ms
- Update key: <200ms
- Rotate key: <300ms
- Activity tracking: <5ms (async)
- Activity list load: <500ms
- Dashboard metrics: <300ms

---

## Monitoring & Alerting

### Metrics to Track
- API key creation rate (daily/weekly/monthly)
- Active keys count (trend)
- Key rotation frequency
- Revocation rate
- Permission violations (403 errors)
- Failed key validations
- Activity tracking lag
- API calls per key (distribution)

### Alerts to Configure
- Alert on unusually high permission violations
- Alert on key usage from unauthorized IP
- Alert on keys expiring soon
- Alert on unusual activity patterns (spike)
- Alert on activity tracking failures
- Alert on key validation failures (intermittent)
- Alert on performance degradation

### Dashboard
- API keys overview (active, inactive, expiring)
- Activity summary (calls per day, per endpoint)
- Security dashboard (violations, unauthorized access)
- Top used keys
- Top endpoints accessed
- Permission violation trends

---

## Documentation Requirements

### User Documentation
- API key management guide (how to create, manage, rotate)
- API key security best practices
- Permission scoping guide (understanding permissions)
- IP whitelisting guide
- API key expiration guide
- API key rotation procedures
- Troubleshooting API key issues

### Developer Documentation
- API key API documentation (all endpoints)
- Permission scoping architecture
- Activity tracking design
- Integration guide (using API keys in applications)
- Error codes (permission errors, expiration, etc.)

### Internal Documentation
- API key deployment procedures
- Monitoring and alerting setup
- Backup and recovery procedures
- Security audit procedures

---

## Future Enhancements

### Phase 2
- OAuth 2.0 integration (tokens instead of API keys)
- JWT token generation from API keys
- API key quotas per tier (usage limits)
- Advanced activity analytics
- Machine learning for anomaly detection
- Webhook notifications on API key events

### Phase 3
- Automatic key rotation schedules
- Key sharing with team members
- Delegated key management (admins manage team keys)
- Advanced permission scoping
- API key audit reports
- Compliance features (SOC2, GDPR, etc.)

### Phase 4
- Biometric authentication for key operations
- Hardware security key support
- Key derivation functions for increased security
- Integration with external identity providers
- Advanced threat detection
- Rate limiting by key type

---

**End of Document 128**
