# User Profile & Administration Feature

## Executive Summary

User Profile and Administration providing user account management, profile information editing, department assignment, and permission configuration enabling comprehensive user lifecycle management and access control.

## Current State Analysis

### EXISTING

- CustomUser model with profile data
- Staff profile management (different context)
- Permission system with role-based access
- User serializers
- Audit logging

### MISSING (Partially implemented or incomplete)

- User profile editing page (admin and self-service)
- User profile view (personal profile)
- Department assignment in user management
- Permission configuration per user (if applicable)
- User notes/comments section
- User status indicators
- User contact information display
- Profile picture upload
- User role editing
- User department change
- Manager assignment (if applicable)
- User employment info display (if applicable)
- User designation display (if applicable)
- User contact history
- User activity summary
- Deactivation reason tracking
- User termination workflow

## Frontend Features

### Page 1: User Profile (Self-Service)

**Profile Header:**
- Profile picture (large, with upload/change button)
- User name
- Email
- Role badge
- Status indicator
- Edit Profile button (if self, or admin permission)

**Profile Information Section:**

*Personal Information:*
- Full Name (read-only or editable)
- Email (read-only or editable with verification)
- Phone number (display, edit capability)
- Department (display if assigned)
- Designation/Title (display if applicable)
- Manager (display if assigned)

*Contact Information:*
- Primary email
- Secondary email (optional)
- Primary phone
- Secondary phone (optional)
- Address (street, city, postal code)

*Employment Information (if HR module):*
- Employee ID
- Date of hire
- Employment type
- Department
- Reporting to (manager name)

**Tabs or Sections:**
- Profile Tab: Basic info
- Security Tab: Password, 2FA, login history (see Document 104)
- Activity Tab: User's recent activity, created records, etc.
- Preferences Tab: Notifications, locale, display settings
- Documents Tab: Uploaded documents, certificates (if applicable)

### Page 2: User Profile Edit (Personal Info)

**Edit Form:**
- Full Name field (editable)
- Email field (editable, requires verification if changed)
- Phone field (editable)
- Address fields (editable)
- Department selector (read-only for staff, editable for admin)
- Profile Picture upload (drag & drop or click to upload)
- Bio/Notes field (optional, text area)
- Preferred Locale selector (language, date format)
- Theme preference selector (light/dark mode, if applicable)
- Save Changes button
- Cancel button
- Success message on save

**Validation:**
- Email format validation
- Email uniqueness check
- Phone format validation
- Name required
- File size limits on profile picture

### Page 3: Admin User Profile Management

Similar to personal profile, but with admin-only sections:

**User Status Section (Admin):**
- Status indicator (Active/Inactive)
- Status toggle (with confirmation)
- Deactivation reason (if inactive)
- Reactivation date (if scheduled)

**User Role & Permissions Section (Admin):**
- Current role selector (dropdown)
- Role change confirmation
- Permission list display (informational)
- Notes on role change

**User Assignment Section (Admin):**
- Department selector
- Manager selector (employee dropdown)
- Designation selector (if HR module)

**User Notes Section (Admin only):**
- Internal notes text area
- Add Note button
- Notes history (with timestamps and author)

**Audit Information Section:**
- Created by (user name)
- Created date/time
- Last modified by (user name)
- Last modified date/time
- View audit log link

## Backend API Requirements

### GET /api/accounts/profile/
- Get current user's profile
- Response: `{ id, name, email, phone, profile_picture_url, role, status, department, preferences }`

### PATCH /api/accounts/profile/
- Update current user's profile
- Request body: `{ name, email, phone, address, preferences }`
- Response: updated profile

### POST /api/accounts/profile/upload-picture/
- Upload profile picture
- Request: multipart form data (image file)
- Response: `{ profile_picture_url }`

### DELETE /api/accounts/profile/picture/
- Delete profile picture
- Response: `{ success: true }`

### GET /api/accounts/users/{id}/profile/
- Get user profile (admin)
- Response: `{ id, name, email, phone, profile_picture_url, role, status, department, notes, audit_info }`

### PATCH /api/accounts/users/{id}/profile/
- Update user profile (admin)
- Request body: `{ name, email, phone, role, department, status, notes }`
- Response: updated profile

### GET /api/accounts/users/{id}/audit-log/
- Get user audit trail
- Query params: action_type, date_range, limit, offset
- Response: `[{ timestamp, action, actor, changes, details }]`

### POST /api/accounts/users/{id}/notes/
- Add admin note to user
- Request body: `{ note }`
- Response: `{ id, note, created_at, created_by }`

### GET /api/accounts/users/{id}/activity/
- Get user activity summary
- Response: `{ recent_activities: [...], login_count (this month), actions_count (this month) }`

## Database Requirements

### Model Extensions

**Extend CustomUser model (if needed):**
- profile_picture (image field)
- phone_number
- address fields
- preferences (JSON)
- notes (text, admin only)

**New Models:**
- UserNote model: user_id, note_text, created_by, created_at
- UserActivity model: user_id, action, timestamp, details (if not using audit log)

**Indexes:**
- (user_id, created_at DESC)

## Current Implementation Status

- User profile model EXISTS (partial)
- Profile picture upload NOT implemented
- Profile editing UI NOT implemented
- Admin profile management UI NOT implemented
- User notes NOT implemented
- Activity tracking NOT exposed
- Audit information NOT exposed in UI

## Validation & Edge Cases

- Email verification required if email changed
- Phone format validation
- Profile picture size limits
- Profile picture format validation (JPG, PNG)
- Name required and non-empty
- Admin can edit any user profile
- Users can only edit own profile (unless admin)
- Department assignment cascades to related records
- Role changes require audit logging
- Deactivation requires reason tracking

## Testing Checklist

- [ ] Personal profile loads correctly
- [ ] Profile picture uploads
- [ ] Profile picture displays
- [ ] Profile picture can be removed
- [ ] Name can be edited
- [ ] Phone can be edited
- [ ] Address can be edited
- [ ] Email can be edited (with verification)
- [ ] Preferences save correctly
- [ ] Locale change works
- [ ] Theme preference saves (if applicable)
- [ ] Admin can edit user profile
- [ ] Admin can change user role
- [ ] Admin can assign department
- [ ] Admin can add notes
- [ ] Notes display in history
- [ ] Status can be toggled
- [ ] Status change appears in audit log
- [ ] Audit information displays
- [ ] Activity summary displays
- [ ] Responsive design works
- [ ] Error handling works

## Implementation Checklist

- [ ] User profile page component
- [ ] Personal profile view component
- [ ] Profile edit form component
- [ ] Admin profile edit component
- [ ] Profile picture upload component
- [ ] User notes component
- [ ] Audit information component
- [ ] Activity summary component
- [ ] API client methods (all endpoints)
- [ ] State management
- [ ] Form validation
- [ ] Error handling
- [ ] Success notification
- [ ] Loading states
- [ ] Image upload service
- [ ] Profile picture storage
- [ ] Email verification service
- [ ] Audit logging
- [ ] Activity tracking service
- [ ] Permission checks
- [ ] Multi-tenant isolation

## Deployment Strategy

- Deploy user profile API endpoints
- Deploy file storage for profile pictures
- Deploy frontend profile pages
- Testing: Edit profiles, verify changes
- Staff training: Profile management
- Rollback: Maintain user data

## Performance Targets

- Profile load: <300ms
- Profile picture upload: <2s
- Profile update: <500ms

## Monitoring & Alerting

- Track profile update frequency
- Monitor file storage usage
- Alert on role changes
- Log all profile changes

## Documentation Requirements

- Profile editing guide
- Profile picture requirements
- Role change process guide
- Troubleshooting guide

## Future Enhancements

- Profile completeness indicator
- User skills/certifications display
- Performance reviews (if HR module)
- User training records
- User feedback/testimonials
- Social media integration
- Professional certifications tracking
