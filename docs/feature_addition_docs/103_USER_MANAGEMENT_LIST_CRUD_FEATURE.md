# User Management List/CRUD Feature

## Executive Summary

User Management providing comprehensive system user account administration including user list, creation, editing, deletion, role assignment, and status management enabling tenant administrators to control system access and user permissions.

## Current State Analysis

### EXISTING

- CustomUser model (backend/apps/accounts/models.py) with user creation capability
- Permission system with roles (SUPER_ADMIN, OWNER, MANAGER, STAFF, CASHIER, etc.)
- User authentication system
- Multi-tenant user isolation (tenant_id field)
- Audit logging infrastructure
- Staff management (different from User Management)
- Permission checking utilities
- User serializers and views (partial)

### MISSING (Partially implemented or incomplete)

- User Management admin page (distinct from Staff Management)
- User List Page UI
- User search functionality
- User filtering (by role, status, department)
- User sorting
- User creation form (admin workflow)
- User editing form (admin workflow)
- User deletion with confirmation
- User status toggle (active/inactive)
- Bulk user invite functionality
- User profile/detail page
- Role assignment UI
- Department assignment UI
- User status display
- Create date tracking
- Last login display
- Password reset functionality (admin can reset)
- User account deactivation
- User verification badge
- User edit API endpoint

## Frontend Features

### Page Header
- "User Management" title
- Breadcrumb navigation
- Create New User button
- Bulk Invite Users button

### User List Section

**Users Data Table with columns:**
- Checkbox (for bulk selection)
- Name (clickable to view details)
- Email
- Role (badge/indicator)
- Status (Active/Inactive indicator)
- Department (if applicable)
- Last Login (date/time or "Never")
- Actions (Edit, Deactivate/Activate, Reset Password, Delete)

**Search Box:**
- Search by name, email, employee ID
- Real-time search as you type

**Filter Options (collapsible):**
- Filter by role (checkbox list: Super Admin, Tenant Admin, Manager, Staff)
- Filter by status (Active, Inactive)
- Filter by department (if applicable)
- Filter by date range (created date, last login date)
- Clear filters button

**Sort Options:**
- Sort by name (A-Z, Z-A)
- Sort by creation date
- Sort by last login
- Sort by role

**Pagination:**
- Rows per page selector (10, 25, 50, 100)
- Page number display and navigation
- Jump to page input

**Bulk Actions (when rows selected):**
- Bulk deactivate button
- Bulk activate button
- Bulk delete button (with confirmation)
- Bulk email button (send message to selected users)

**Empty State (if no users):**
- Message: "No users found"
- Create User button

### User Creation Modal/Form

**Form Fields:**
- Name field (required, text input)
- Email field (required, email validation)
- Role selector (required, dropdown):
  - Super Admin (only admin can select)
  - Tenant Admin
  - Manager
  - Staff
  - Cashier
  - Stock Clerk
  - Other roles
- Department selector (optional, dropdown, if module enabled)
- Status selector (Active/Inactive, default Active)
- Send Invitation Email toggle (default checked)
- Notes field (optional, text area)

**Buttons:**
- Create User button
- Cancel button

**Validation:**
- Email must be unique
- Email must be valid format
- Name must not be empty
- Role must be selected

**Success Message:**
- "User created successfully"
- Option to create another user

### User Detail View/Card

**User Information Display:**
- Name
- Email
- Role badge
- Status indicator
- Department (if applicable)
- Created date
- Last login date/time

**Edit Button**

**Actions Dropdown:**
- Edit User
- Reset Password
- Deactivate/Activate
- Delete User
- Send Invitation Email (if not yet activated)

**User History Section (optional):**
- Last login time
- Failed login attempts
- Password change history (count)

## Backend API Requirements

### GET /api/accounts/users/
- Query params: search, role, status, department, date_from, date_to, limit, offset, sort_by
- Response: `{ count, results: [{ id, name, email, role, status, department, created_at, last_login }] }`

### POST /api/accounts/users/
- Request body: `{ name, email, role, department, status, send_invitation }`
- Response: `{ id, name, email, role, status, created_at }`

### GET /api/accounts/users/{id}/
- Response: `{ id, name, email, role, status, department, created_at, last_login, is_active }`

### PATCH /api/accounts/users/{id}/
- Request body: `{ name, email, role, department, status }`
- Response: updated user object

### DELETE /api/accounts/users/{id}/
- Response: `{ success: true }`

### POST /api/accounts/users/bulk-invite/
- Request body: `{ emails: [...], role, send_email }`
- Response: `{ invited_count, failed_count, results }`

### POST /api/accounts/users/{id}/deactivate/
- Response: `{ success: true }`

### POST /api/accounts/users/{id}/activate/
- Response: `{ success: true }`

### POST /api/accounts/users/{id}/reset-password/
- Request body: `{ send_email }`
- Response: `{ success: true, temporary_password (if send_email=false) }`

### POST /api/accounts/users/bulk-delete/
- Request body: `{ user_ids }`
- Response: `{ deleted_count }`

## Database Requirements

### CustomUser Model Extensions (if needed)

- last_login timestamp (may already exist)
- failed_login_attempts counter
- last_password_change timestamp
- status field (active/inactive)
- created_at timestamp
- created_by user reference
- updated_at timestamp
- updated_by user reference

### Additional Models/Tables

- AuditLog entries for all user management actions
- Indexes: (tenant_id, email), (tenant_id, created_at DESC), (last_login DESC)

## Current Implementation Status

- CustomUser model EXISTS
- Permission system EXISTS (SUPER_ADMIN, OWNER, MANAGER, STAFF roles)
- User creation capability EXISTS (backend)
- User search/filter NOT implemented in admin UI
- User list page NOT implemented
- User creation page (admin workflow) NOT implemented
- User editing NOT implemented in admin UI
- User deactivation/activation NOT exposed in UI
- Bulk operations NOT implemented
- Password reset (admin) NOT implemented
- Login history NOT exposed
- Role assignment UI NOT implemented

## Validation & Edge Cases

- Email uniqueness check required
- Email format validation
- Cannot delete own user account
- Cannot change own role (except super admin)
- Super admin must have at least one active user
- User deactivation should prevent login
- Bulk operations may timeout with large datasets
- Multi-tenant isolation must be enforced
- Permission checks: only admins can manage users
- Audit all user management actions

## Testing Checklist

- [ ] User list loads with data
- [ ] Search works (by name, email)
- [ ] Role filter works
- [ ] Status filter works
- [ ] Department filter works (if applicable)
- [ ] Date range filter works
- [ ] Sorting works on all sortable columns
- [ ] Pagination works
- [ ] Create user form validates email uniqueness
- [ ] Create user form validates email format
- [ ] Create user form requires name and role
- [ ] User created successfully
- [ ] Invitation email sent (if toggled)
- [ ] Edit user form loads current data
- [ ] User update saves correctly
- [ ] User can be deactivated
- [ ] Deactivated user cannot login
- [ ] User can be activated
- [ ] Password reset (admin) works
- [ ] Reset email sent to user
- [ ] User deletion works with confirmation
- [ ] Bulk delete works
- [ ] Bulk activate works
- [ ] Bulk deactivate works
- [ ] Bulk invite works
- [ ] Last login displays correctly
- [ ] Responsive design works
- [ ] Error handling displays messages

## Implementation Checklist

- [ ] User management page component
- [ ] User list table component
- [ ] User search component
- [ ] User filter component
- [ ] Create user form/modal component
- [ ] Edit user form/modal component
- [ ] User detail component
- [ ] Bulk actions component
- [ ] Status toggle component
- [ ] Role selector component
- [ ] Department selector component
- [ ] API client methods (all endpoints)
- [ ] State management (Redux/Context)
- [ ] Validation service
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states
- [ ] Confirmation dialogs
- [ ] Backend API endpoints (all)
- [ ] User service (create, update, delete)
- [ ] Password reset service
- [ ] Email invitation service
- [ ] Audit logging
- [ ] Permission checks
- [ ] Multi-tenant isolation
- [ ] Responsive layout
- [ ] Accessibility support

## Deployment Strategy

- Deploy user management API endpoints
- Deploy email invitation service
- Deploy frontend user management pages
- Testing: Create test users, verify audit logs
- Staff training: User management workflow
- Rollback: Maintain user data and audit trail

## Performance Targets

- User list load: <500ms
- Search: <300ms
- User creation: <1s
- Bulk operations: <5s (100 users)

## Monitoring & Alerting

- Track user creation frequency
- Alert on bulk deletions
- Monitor failed login attempts
- Log all user management changes

## Documentation Requirements

- User management guide
- User role guide
- Password reset procedure
- Bulk user invite guide
- Troubleshooting guide

## Future Enhancements

- SAML/SSO integration
- OAuth integration
- User approval workflow
- User templates
- User import from CSV
- User sync with external systems
