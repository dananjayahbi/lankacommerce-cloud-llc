# Password Reset Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned  
**Priority:** Critical (Phase 1)  
**Scope:** Secure password reset with email verification and audit trails

---

## 1. Executive Summary

The Password Reset feature allows users to securely reset their forgotten passwords through a two-step process: requesting a reset link via email and setting a new password. The current implementation has basic token management but lacks production-grade security measures, comprehensive error handling, user experience enhancements, and compliance features.

This document details comprehensive requirements for a production-grade password reset system including secure token generation, email delivery, rate limiting, security notifications, and audit trails.

---

## 2. Current State Analysis

### 2.1 What Exists
- PasswordResetToken model (UUID primary key, token, expiry)
- Basic reset token generation (64-char hex, 1-hour validity)
- Single-use token enforcement (used flag)
- Email sending via Resend service
- Reset password view accepting token and new password
- Audit logging of password reset (partial)
- Session invalidation on password reset (session_version increment)

### 2.2 Critical Gaps & Issues

#### Security Issues
- No rate limiting on reset requests (password reset request attack)
- No notification sent to user that password reset was attempted
- No backup codes for account recovery
- No security questions as alternative recovery method
- No IP-based suspicious activity detection
- No two-factor requirement for sensitive account changes
- Password reset token not invalidated on password change
- No historical password tracking (prevent immediate re-reuse)
- Missing validation that new password is different from old
- No re-authentication required for password change
- Token security: Using simple hex instead of secure random

#### User Experience Issues
- No forgot password page (Forgot Password endpoint exists but page might be missing)
- No status page during email sending
- No resend email option with rate limiting
- No password strength requirements visible on reset form
- No session timeout notification before reset
- No confirmation email after successful reset
- Missing password reset instructions email
- No way to cancel/revoke reset token
- No support contact info on error page
- No alternative recovery methods shown

#### Data & Audit Issues
- No comprehensive audit of password reset attempts
- No tracking of why password was reset
- No notification to tenant admin about user password resets
- No password reset events in activity log
- Missing correlation IDs for troubleshooting
- No cleanup of expired tokens (potential database bloat)

#### Compliance Issues
- No GDPR data deletion for password reset history
- No audit trail retention policies
- No consent for password reset notifications
- No data processing audit logs

---

## 3. Detailed Requirements

### 3.1 Frontend - Forgot Password Page Component

#### 3.1.1 Form Fields & Validation

- **Email Field**
  - Input type: email
  - Required: Yes
  - Validation: Valid email format (RFC 5322)
  - Error states: Required, Invalid format
  - Placeholder: "Enter your email address"
  - Autocomplete: "email"
  - Help text: "Enter the email address associated with your account"
  - Auto-populated if coming from login page with failed email

#### 3.1.2 User Interface Elements

- **Form Container**
  - Responsive design (mobile: full width, tablet/desktop: 500px max)
  - Professional styling, white background
  - Form title: "Forgot Your Password?"
  - Subtitle: "Enter your email and we'll send you a link to reset it"
  - Branding: Display tenant logo if on subdomain

- **Submit Button**
  - Text: "Send Reset Link"
  - State: Disabled when form invalid or loading
  - Loading state: Show spinner, change text to "Sending..."
  - Accessibility: Type="submit"

- **Back to Login Link**
  - Text: "Back to Login"
  - Link: "/login"
  - Position: Below form

- **Help Text**
  - Message: "Don't see an email in your inbox? Check your spam folder or wait a few minutes."
  - Position: Below submit button
  - Color: Gray/muted

#### 3.1.3 Client-Side Error Handling

- Email required: "Email is required"
- Invalid email format: "Please enter a valid email address"
- Account not found: "If an account exists with this email, we've sent instructions to reset your password" (generic, security practice)
- Network error: "Unable to connect. Please check your internet connection."
- Too many attempts: "Too many reset requests. Please wait [X minutes] before trying again."
- Server error: "An error occurred. Please try again later or contact support."

#### 3.1.4 Success State

After successful submission, show confirmation message:
- Message: "Check your email for reset instructions"
- Subtitle: "We've sent a password reset link to [email]"
- Instructions: "Click the link in the email to create a new password. The link will expire in 1 hour."
- Resend button: "Didn't receive email? Resend" (appears after 30 seconds, max 3 resends)
- Back to login: "Back to Login"
- Timer: Show "Link expires in 1 hour" countdown

### 3.2 Frontend - Reset Password Page Component

#### 3.2.1 Form Fields & Validation

- **New Password Field**
  - Input type: password with show/hide toggle
  - Required: Yes
  - Minimum length: 8 characters
  - Validation rules:
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    - No more than 2 consecutive identical characters
    - Not current/recent password (if known to frontend)
  - Real-time strength indicator: Weak/Fair/Good/Strong/Very Strong
  - Error states: Required, Too short, Weak, Requirements not met
  - Placeholder: "Create a new password"
  - Help text: "Must be different from your current password"

- **Confirm Password Field**
  - Input type: password with show/hide toggle
  - Required: Yes
  - Validation: Must match new password field
  - Error states: Required, Passwords do not match
  - Placeholder: "Confirm new password"

#### 3.2.2 User Interface Elements

- **Form Container**
  - Responsive design
  - Form title: "Create New Password"
  - Subtitle: "Choose a strong password for your account"
  - Security indicator: "Your password will be encrypted" (reassurance)
  - Display: Show email address (read-only) for confirmation
  - Token validation message: "This reset link is valid for 1 hour"

- **Submit Button**
  - Text: "Reset Password"
  - State: Disabled when form invalid or loading
  - Loading state: Show spinner
  - Accessibility: Type="submit"

- **Back to Login Link**
  - Text: "Remember your password? Sign in"
  - Link: "/login"

#### 3.2.3 Token Validation & Display

- URL parameter: `/reset-password?token=...`
- On page load:
  - Validate token format (non-empty, reasonable length)
  - Show loading state: "Validating reset link..."
  - Call backend to validate token (without consuming it)
  - If invalid: Show error message "This reset link is invalid or expired"
  - If valid: Show form
  - If token expired: Show error "This reset link has expired. Request a new one."
  - Show countdown timer: "Link expires in [X minutes]"

#### 3.2.4 Client-Side Error Handling

- Token invalid: "This reset link is invalid or has already been used. Request a new one."
- Token expired: "This reset link has expired. Request a new one."
- Password mismatch: "Passwords do not match"
- Weak password: Display specific requirements not met
- Password same as current: "New password must be different from your current password"
- Network error: "Unable to reset password. Please try again."
- Server error: "Password reset failed. Please try again."
- Rate limited: "Too many reset attempts. Please wait [X minutes]."
- Session expired: "Your session has expired. Please request a new reset link."

#### 3.2.5 Success State

After successful password reset:
- Show success message: "Your password has been reset successfully"
- Message: "You can now log in with your new password"
- Show countdown: "Redirecting to login in [5] seconds"
- Button: "Go to Login" (immediate redirect)
- Send confirmation email in background
- Invalidate all existing sessions (optional, more secure)

### 3.3 Backend - Forgot Password Endpoint & Logic

#### 3.3.1 API Endpoint Specification

- **Endpoint**: `POST /api/auth/forgot-password/`
- **Content-Type**: application/json
- **Authentication**: None (public endpoint)
- **Rate Limiting**: 3 reset requests per email per hour

#### 3.3.2 Request Payload

```
{
  "email": "user@example.com"
}
```

#### 3.3.3 Response Payload

**Success Response (200 OK)**
```
{
  "detail": "If an account exists with this email, we've sent instructions to reset your password.",
  "email": "user@example.com" (masked for security)
}
```

**Note**: Always return success (200) regardless of whether email exists (security best practice)

#### 3.3.4 Business Logic - Forgot Password Process

**Step 1: Input Validation**
- Validate email format
- Trim whitespace
- Return 200 (generic response, don't reveal if account exists)

**Step 2: User Lookup**
- Query CustomUser by email (case-insensitive)
- If not found, log and return generic 200 (security practice)
- If found, continue

**Step 3: Rate Limiting**
- Check Redis cache for reset requests from this email
- Limit: 3 requests per 1 hour per email
- If exceeded, log attempt and return 200 (don't reveal rate limit to attacker)
- Increment counter with TTL of 1 hour

**Step 4: Account Status Checks**
- Check user.is_active == True
  - If False, return 200 but don't send email (account is inactive)
- Check user.email_verified == True
  - If False, return 200 but offer alternative: "Please verify your email first" (optional enhancement)

**Step 5: Token Cleanup**
- Query all PasswordResetToken records for this user
- Delete all existing tokens (single-use per user at a time)
- This prevents token accumulation and confusion

**Step 6: Token Generation**
- Generate random 64-character hex string (32 bytes)
- Use secrets.token_hex(32) for cryptographic security
- Create PasswordResetToken record:
  - user, token, created_at (current), expires_at (current + 1 hour), used (False)
- Store in database

**Step 7: Token Caching**
- Store token hash in Redis (for quick validation)
- Key: f"reset_token:{user_id}" = {token_hash, expires_at}
- TTL: 1 hour

**Step 8: Email Preparation**
- Render email template with:
  - User's name
  - Reset link: https://lankacommerce.lk/reset-password?token=...
  - Token expiry: "This link will expire in 1 hour"
  - Warning: "If you didn't request this, ignore this email"
  - Support contact info
  - Security notice: "Never share this link with anyone"

**Step 9: Email Sending**
- Send via EmailService
- Log email send attempt (for tracking)
- If email send fails:
  - Log error with correlation ID
  - Queue for retry (background task)
  - Don't notify user of failure (prevent information disclosure)

**Step 10: Audit Logging**
- Create AuditLog:
  - action: "password_reset_requested"
  - user: user
  - ip_address: from request
  - user_agent: from headers
  - tenant: user.tenant
  - status: "email_sent" or "email_pending"
  - custom_data: {email}

**Step 11: Response**
- Return 200 with generic message (don't reveal if account exists)

### 3.4 Backend - Reset Password Endpoint & Logic

#### 3.4.1 API Endpoint Specification

- **Endpoint**: `POST /api/auth/reset-password/`
- **Content-Type**: application/json
- **Authentication**: None (public endpoint, token-based)
- **Rate Limiting**: 5 attempts per IP per hour

#### 3.4.2 Request Payload

```
{
  "token": "reset_token",
  "new_password": "NewPassword123!",
  "confirm_password": "NewPassword123!"
}
```

#### 3.4.3 Response Payload

**Success Response (200 OK)**
```
{
  "detail": "Password has been reset successfully.",
  "user": {...},
  "tokens": {...},
  "message": "You can now log in with your new password.",
  "redirect_url": "/dashboard" (if immediate login allowed)
}
```

**Error Responses**
- 400: Invalid payload, validation errors
- 401: Invalid token, expired token, token already used
- 429: Rate limit exceeded

#### 3.4.4 Business Logic - Reset Password Process

**Step 1: Input Validation**
- Validate token non-empty
- Validate new_password non-empty and length >= 8
- Validate confirm_password matches new_password
- Validate password complexity (8+ chars, mixed case, number, special char)
- Return 400 if validation fails

**Step 2: Rate Limiting**
- Get client IP from request
- Check Redis cache for reset attempts from this IP
- Limit: 5 attempts per IP per 1 hour
- If exceeded, return 429 with retry-after header
- Increment counter with TTL 1 hour

**Step 3: Token Lookup**
- Query PasswordResetToken by token value
- Query with: token=value, used=False
- If not found, return 401 "Invalid or expired reset link"

**Step 4: Token Validation**
- Check token.expires_at > current time
  - If expired, mark token.used = True and return 401 "Reset link expired"
- Check token.used == False
  - If already used, return 401 "Reset link already used"

**Step 5: User Retrieval**
- Get user from token.user_id
- If user not found, return 401 "User account not found"
- Check user.is_active == True
  - If False, return 403 "Account is inactive"

**Step 6: Password Validation**
- Check new password != old password (check_password against current hash)
  - If same, return 400 "New password must be different from current password"
- Check new password against password history (last 5 passwords)
  - If found in history, return 400 "Cannot reuse recent passwords"

**Step 7: Password Update**
- Hash new password using Django's make_password()
- Set user.password = hashed_password
- Increment user.session_version (invalidates all existing sessions)
- Set user.failed_login_count = 0 (reset failed attempts)
- Save user

**Step 8: Token Consumption**
- Mark token.used = True
- Save token
- Delete from Redis cache

**Step 9: Password History Recording**
- Create PasswordHistory record (new model):
  - user, password_hash (old hash), changed_at, reason: "password_reset"

**Step 10: Session Invalidation** (optional, more secure)
- Invalidate all existing sessions by incrementing session_version
- This logs user out of all devices
- Consider: Allow immediate login with new password OR require re-login

**Step 11: Email Notification**
- Send email: "Your password has been changed"
- Include:
  - Timestamp of change
  - IP address and location (if available)
  - Link to change password if user didn't initiate reset
  - Support contact if suspicious activity
- Email immediately (not queued)

**Step 12: Audit Logging**
- Create AuditLog:
  - action: "password_reset_success"
  - user: user
  - ip_address: from request
  - user_agent: from headers
  - tenant: user.tenant
  - status: "password_changed"
  - custom_data: {timestamp}

**Step 13: Response**
- Return 200 with success message
- Option 1: Return JWT tokens for immediate login (less secure)
- Option 2: Require re-login with new password (more secure, recommended)

### 3.5 Backend - Token Validation Endpoint (NEW)

**Purpose**: Validate token without consuming it (for page load, frontend logic)

**Endpoint**: `GET /api/auth/reset-password/validate/`

**Query Parameter**: `token=...`

**Response**:
```
{
  "valid": true,
  "expires_in_minutes": 45,
  "email": "user@example.com" (masked for security)
}
```

**Logic**:
- Query token without consuming
- If valid: return 200 with expires_in
- If invalid/expired: return 400 with error
- Don't log failed validations (frontend spam prevention)

#### 3.5.1 Database Models & Changes Required

**New Model: PasswordResetToken** (already exists, verify all fields)
- id (UUID)
- user (ForeignKey to CustomUser, CASCADE)
- token (CharField, unique, 64 chars)
- created_at (DateTimeField)
- expires_at (DateTimeField)
- used (BooleanField, default=False)

**New Model: PasswordHistory**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- password_hash (CharField, old hash)
- changed_at (DateTimeField, auto_now_add=True)
- reason (CharField: "password_reset", "user_change", "admin_reset")
- ip_address (CharField, optional)

**CustomUser Model Changes**
- No new fields needed, but ensure password update timestamp tracking

#### 3.5.2 Serializers
- ForgotPasswordSerializer: Validate email
- ResetPasswordSerializer: Validate token, password, confirmation
- ValidateTokenSerializer: Token validation response

### 3.6 Related Security Features

#### 3.6.1 Account Recovery Options (Future)
- Security questions as backup recovery method
- Backup codes generated on account setup
- Recovery email (separate from login email)
- Recovery phone number for SMS recovery

#### 3.6.2 Security Notifications
- Email on password reset request
- Email on password reset success (with timestamp, IP, device)
- Email on suspicious password reset attempts
- In-app notification of password change

#### 3.6.3 Suspicious Activity Detection
- Monitor for multiple reset requests in short time
- Detect reset from unusual IP/location
- Alert tenant admin on suspicious patterns
- Block reset if too many attempts

### 3.7 Email Templates

#### 3.7.1 Reset Link Email
- Subject: "Reset Your LankaCommerce Password"
- Header: Tenant logo (if multi-tenant)
- Body: Friendly greeting, reset link, expiry time, warning about sharing
- Footer: Support contact, security notice
- Plain text fallback

#### 3.7.2 Password Changed Confirmation Email
- Subject: "Your password has been changed"
- Body: Confirmation, timestamp, IP address (if available)
- Section: "Didn't do this? Click here to secure your account"
- Footer: Support contact

#### 3.7.3 Suspicious Activity Email
- Subject: "Unusual activity on your account"
- Body: Alert about multiple reset attempts
- Action: Button to reset password securely
- Footer: Support contact

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- User requests reset multiple times (should invalidate previous tokens)
- User clicks reset link after requesting another reset
- Token expires during form entry
- Password reset during token generation
- User deleted during reset process
- Tenant deactivated during reset process
- IP-based rate limiting with dynamic IPs
- Token used, then attempt to use again
- Concurrent password reset attempts
- Password reset on account with pending email verification

### 4.2 Validation Rules
- Email: Case-insensitive, trimmed, unique
- Token: 64-character hex, cryptographically secure
- Password: Min 8 chars, uppercase, lowercase, number, special
- Token expiry: Non-negotiable 1 hour
- Rate limits: Enforced strictly
- Rate limit bypass: Not allowed for any reason

### 4.3 Security Considerations
- Timing attack prevention: Don't reveal which part is wrong
- Token security: Use cryptographic random, sufficient entropy
- Information disclosure: Never reveal if email exists
- Password confirmation: Require match before submission
- Session invalidation: Increment session_version to log out all sessions
- Email delivery: Queue non-blocking, retry on failure
- Brute force: Rate limit strictly
- Credential stuffing: Monitor patterns

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Password strength validation
- Token generation uniqueness
- Token expiry logic
- Email format validation
- Rate limiting logic
- Password history check
- Token consumption logic

### 5.2 Integration Tests
- Complete forgot password flow (happy path)
- Complete reset password flow (happy path)
- Token validation endpoint
- Multiple reset requests (token invalidation)
- Expired token rejection
- Already used token rejection
- Rate limiting enforcement
- Email sending
- Password history enforcement
- Session invalidation on reset

### 5.3 Security Tests
- Password not logged
- Token not logged
- Rate limiting cannot be bypassed
- SQL injection prevention
- XSS injection prevention
- CSRF token validation
- Email doesn't reveal account existence
- Token security (random, non-predictable)

### 5.4 Load Tests
- 1000 concurrent reset requests
- Email delivery under load
- Token lookup performance
- Rate limiting cache performance

### 5.5 Acceptance Criteria
- [ ] User can request password reset with email
- [ ] Reset link sent via email successfully
- [ ] Reset link valid for exactly 1 hour
- [ ] Invalid token rejected
- [ ] Expired token rejected
- [ ] Already used token rejected
- [ ] New password must be different from old
- [ ] Password complexity enforced
- [ ] All sessions invalidated on reset
- [ ] Confirmation email sent
- [ ] Password history enforced
- [ ] Rate limiting prevents abuse
- [ ] Audit log created for all events

---

## 6. Frontend Implementation Checklist

- [ ] Create forgot password page
- [ ] Implement email input field
- [ ] Implement form validation
- [ ] Implement API call to forgot password endpoint
- [ ] Handle success response (show confirmation)
- [ ] Handle error responses
- [ ] Implement resend email button
- [ ] Create reset password page
- [ ] Extract token from URL
- [ ] Implement token validation on page load
- [ ] Create password input fields
- [ ] Add password strength indicator
- [ ] Implement show/hide password toggles
- [ ] Implement form validation
- [ ] Implement API call to reset password endpoint
- [ ] Handle success response (redirect to login)
- [ ] Handle error responses
- [ ] Implement token validation display
- [ ] Add loading states
- [ ] Add accessibility features (ARIA)
- [ ] Implement responsive design
- [ ] Test on mobile, tablet, desktop
- [ ] Test password strength validation
- [ ] Test error messages

---

## 7. Backend Implementation Checklist

- [ ] Create ForgotPasswordSerializer
- [ ] Create ResetPasswordSerializer
- [ ] Create ValidateTokenSerializer
- [ ] Create forgot password API endpoint
- [ ] Create reset password API endpoint
- [ ] Create token validation API endpoint
- [ ] Implement rate limiting (Redis)
- [ ] Implement token generation (cryptographic)
- [ ] Implement token validation
- [ ] Implement token consumption
- [ ] Implement password validation
- [ ] Implement password hashing
- [ ] Implement session invalidation
- [ ] Implement email sending
- [ ] Create PasswordHistory model
- [ ] Create database migrations
- [ ] Implement audit logging
- [ ] Implement error handling
- [ ] Add security headers
- [ ] Test with Postman/curl

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment
- Code review for security
- Load testing on staging
- Email delivery testing
- Token generation testing
- Database migration testing
- Rate limiting testing
- Rollback plan documentation

### 8.2 Deployment Steps
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Test complete flows
5. Monitor error rates
6. Alert on anomalies

### 8.3 Rollback Plan
- Revert code
- Restore database backup if needed

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Forgot password request: < 200ms
- Email sending: Async (no blocking)
- Token validation: < 50ms
- Reset password processing: < 500ms

### 9.2 Scalability Considerations
- Redis for rate limiting cache
- Email queue for delivery
- Database write optimization
- Connection pooling
- Read replicas for user lookup

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Reset request rate
- Email delivery success rate
- Token validation rate
- Password reset success rate
- Rate limit trigger count
- Invalid token attempts
- Token expiry rate

### 10.2 Alerts
- Alert if reset error rate > 5%
- Alert if email delivery failure > 2%
- Alert if suspicious reset patterns
- Alert if token validation spam
- Alert if rate limit abuse

---

## 11. Documentation Requirements

### 11.1 For Developers
- API endpoint documentation
- Token generation algorithm
- Database schema documentation
- Rate limiting configuration
- Email template specifications
- Error codes reference

### 11.2 For Users
- Password reset troubleshooting guide
- What to do if reset email not received
- How to recognize legitimate reset emails
- Account security best practices
- Support contact information

---

## 12. Future Enhancements

- Passwordless login (magic links)
- Multi-factor authentication required for reset
- Biometric verification for sensitive accounts
- Step-up authentication (re-auth) for reset
- Recovery codes as backup
- Security questions for verification
- Phone SMS verification for reset
