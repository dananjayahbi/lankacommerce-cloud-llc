# Email Verification Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned (CRITICAL - Currently Missing)  
**Priority:** Critical (Phase 1)  
**Scope:** Email ownership verification and account activation

---

## 1. Executive Summary

The Email Verification feature is **currently not implemented** in LankaCommerce and is critical for:
1. Preventing account takeover via typos/email guessing
2. Ensuring users receive important system notifications
3. Complying with GDPR (user consent requirements)
4. Building user trust (legitimate email ownership)
5. Reducing support burden from account access issues

This document details comprehensive requirements for implementing a production-grade email verification system with resend capabilities, expiry management, alternative verification methods, and compliance features.

---

## 2. Current State Analysis

### 2.1 What Exists
- EmailService class for sending emails (via Resend API)
- Basic email templating
- No email verification model
- No email verification status tracking
- No verification token system
- Users can login without email verification (SECURITY ISSUE)

### 2.2 Critical Gaps & Issues

#### Security Issues (CRITICAL)
- Users can create accounts without verifying email
- User can register with someone else's email and access account
- No email ownership verification
- No account lockout if email is invalid
- No notification sent to email when account created
- Attackers can register accounts with stolen emails
- No rate limiting on verification attempts
- No CAPTCHA on verification (bot protection)
- No suspicious email verification detection

#### Business Logic Issues
- No email verification on registration
- No re-verification if email is changed
- No email verification in login flow (optional feature)
- No unverified email notification
- No email verification status in user model
- No time tracking for verification
- No backup email system
- Missing verification reminder emails

#### User Experience Issues
- New users don't know email is unverified
- No verification status indicator
- No resend verification email option
- No alternative verification methods
- No email change option
- No verification deadline shown to users
- No support for email address corrections
- Missing clear instructions on verification

#### Data & Compliance Issues
- No GDPR compliance (no consent recording)
- No audit trail of email verification
- No privacy policy acceptance with email
- No data deletion of unverified accounts
- No email verification retention policy
- No notification preferences

#### Account Management Issues
- No cleanup of unverified accounts (they accumulate)
- No policy for old unverified accounts
- Users locked out if email bounces
- No re-verification workflow
- No email address change workflow

---

## 3. Detailed Requirements

### 3.1 Frontend - Email Verification Page Component

#### 3.1.1 Page States

**State 1: Verification In Progress**
- Message: "Verifying your email address..."
- Subtitle: "We're checking your verification link"
- Loading spinner
- On page load: Extract token from URL parameter, call backend to validate

**State 2: Successful Verification**
- Icon: Checkmark (green)
- Message: "Email verified successfully!"
- Subtitle: "Your account is now fully activated"
- Button: "Go to Dashboard" (redirects to /dashboard)
- Alternative: "Back to Login" if not logged in
- Time delay: Auto-redirect after 3 seconds
- Celebration: Optional confetti/animation

**State 3: Invalid Token**
- Icon: Error icon (red)
- Message: "This verification link is invalid"
- Subtitle: "The link may be expired or incorrect"
- Button: "Request New Verification Link"
- Link: Back to "Resend Email" page
- Support: Show help contact information

**State 4: Expired Token**
- Icon: Clock icon (orange)
- Message: "This verification link has expired"
- Subtitle: "Verification links are valid for 24 hours"
- Button: "Resend Verification Email"
- Link: Back to login
- Support: Show help information

**State 5: Already Verified**
- Icon: Checkmark (blue)
- Message: "Your email has already been verified"
- Subtitle: "You can proceed to your account"
- Button: "Go to Dashboard"
- Alternative: "Back to Login"

**State 6: Error - Account Not Found**
- Icon: Error icon (red)
- Message: "Account not found"
- Subtitle: "The account associated with this link no longer exists"
- Button: "Create New Account"
- Link: "/register"
- Support: Show help information

#### 3.1.2 Resend Verification Email Page

**Form Fields**
- Email input field
  - Pre-populated if available from session/previous attempt
  - Readonly if known email
  - Searchable if multiple accounts

**User Interface**
- Form title: "Resend Verification Email"
- Subtitle: "We'll send you a new verification link"
- Instructions: "Enter the email address associated with your account"
- Submit button: "Resend Verification Link"
- Help text: "The new link will expire in 24 hours"
- Back to login link

**Success State**
- Message: "Verification email sent"
- Subtitle: "Check your email for the verification link"
- Resend button: "Didn't receive email?" (disabled with countdown, appears after 30 seconds)
- Max resends: 5 per 24 hours
- Show countdown: "You can resend in [30] seconds"

**Error Handling**
- Account not found: Show generic "If email exists, verification link sent"
- Too many resends: "Too many resend requests. Please wait [X hours] before trying again"
- Network error: "Unable to send email. Please try again."
- Server error: "An error occurred. Please contact support."

#### 3.1.3 Unverified Email Banner

**Location**: Dashboard, account pages (if email not verified)

**Display**:
- Icon: Warning icon (orange)
- Message: "Your email is not verified"
- Subtitle: "Please verify your email to unlock all features"
- Button: "Resend Verification Email" (opens modal or redirects)
- Dismiss: Allow dismiss for 24 hours
- Link: "Why verify email?"

**Behavior**:
- Show until email verified
- Not dismissible permanently
- Show on every page visit
- Highlight in red if overdue (> 7 days)

#### 3.1.4 Account Security Checks

- On login: Check email_verified status
  - If not verified, show banner with resend option
  - Don't block login (allow access, but notify)
- On sensitive operations: Require email verification
  - Password change: Require verification
  - Email change: Require verification
  - Payment info: Require verification

### 3.2 Backend - Email Verification Logic

#### 3.2.1 Verification Flow Endpoints

**Endpoint 1: Verify Email**
- **Path**: `POST /api/auth/verify-email/`
- **Method**: POST
- **Authentication**: None (public, token-based)
- **Rate Limiting**: 10 attempts per IP per hour

**Request Payload**:
```
{
  "token": "verification_token",
  "email": "user@example.com" (optional, for double-checking)
}
```

**Response Success (200 OK)**:
```
{
  "detail": "Email verified successfully.",
  "user": {...},
  "redirect_url": "/dashboard"
}
```

**Response Errors**:
- 400: Invalid token, missing fields
- 404: Account/token not found
- 410: Token already used
- 422: Token expired

**Endpoint 2: Resend Verification Email**
- **Path**: `POST /api/auth/resend-verification/`
- **Method**: POST
- **Authentication**: None (public)
- **Rate Limiting**: 5 resends per email per 24 hours

**Request Payload**:
```
{
  "email": "user@example.com"
}
```

**Response**:
```
{
  "detail": "If an account exists, we've sent a verification email."
}
```

**Endpoint 3: Verify Email Token Validation** (optional, for frontend)
- **Path**: `GET /api/auth/verify-email/validate/`
- **Query**: `?token=...`
- **Response**:
```
{
  "valid": true,
  "email": "user@example.com" (masked),
  "expires_in_minutes": 1440
}
```

#### 3.2.2 Registration Flow Integration

**During Registration (POST /api/tenants/register/)**

**Step 1**: After user creation (see Registration feature doc)
- Create EmailVerificationToken

**Step 2**: Send verification email
- Render email template
- Include token in link
- Send via EmailService

**Step 3**: Response
- Return success message: "Check your email to verify your account"
- Next step: "verify_email"
- Frontend redirects to email verification page

**Step 4**: Mark user as unverified
- Set user.is_active = False (or is_email_verified = False)
- Set user.email_verified = False
- Set tenant.is_active = False until user verifies

#### 3.2.3 Email Verification Endpoint Logic

**Process on /api/auth/verify-email/**

**Step 1: Input Validation**
- Validate token: Non-empty, reasonable length
- Validate email format (if provided)
- Return 400 if invalid

**Step 2: Token Lookup**
- Query EmailVerificationToken by token
- If not found, return 404 "Verification token not found"
- If found, proceed

**Step 3: Token Status Check**
- Check token.used == False
  - If True, return 410 "Token already used"
- Check token.expires_at > current time
  - If expired, return 422 "Token expired"

**Step 4: User Validation**
- Get user from token.user_id
- If not found, return 404 "User not found"
- If email provided in request, verify email matches
  - If mismatch, return 400 "Email mismatch"
- Check user is not deleted (deleted_at is None)
  - If deleted, return 404 "User account deleted"

**Step 5: Account Activation**
- Set user.email_verified = True
- Set user.is_active = True
- Set tenant.is_active = True (if applicable)
- Set verification_timestamp = current
- Save user and tenant

**Step 6: Token Consumption**
- Mark token.used = True
- Save token to database
- Delete from Redis cache (if cached)

**Step 7: Password Requirement Check** (optional)
- If user.password is empty (invited users), require password change
- Return redirect: "/set-password"

**Step 8: Generate Login Tokens** (optional)
- Generate JWT access and refresh tokens
- Return tokens in response (allows auto-login)
- Alternative: Require user to login manually (more secure)

**Step 9: Email Notification**
- Send confirmation email: "Your email has been verified"
- Include:
  - Confirmation timestamp
  - Account activation message
  - Link to dashboard
  - Support contact

**Step 10: Audit Logging**
- Create AuditLog:
  - action: "email_verified"
  - user: user
  - ip_address: from request
  - user_agent: from headers
  - tenant: user.tenant
  - status: "verified"
  - custom_data: {verified_at}

**Step 11: Response**
- Return 200 with success message
- Return user info (masked)
- Return redirect URL ("/dashboard")
- Optionally return login tokens

#### 3.2.4 Resend Verification Endpoint Logic

**Process on /api/auth/resend-verification/**

**Step 1: Input Validation**
- Validate email format
- Trim whitespace
- Return generic response (don't reveal if account exists)

**Step 2: User Lookup**
- Query CustomUser by email
- If not found, return 200 (generic response for security)
- If found, continue

**Step 3: Email Verification Check**
- If email_verified == True, return 200 (already verified)
- If email_verified == False, continue

**Step 4: Rate Limiting**
- Check Redis for resend attempts for this email
- Limit: 5 resends per 24 hours per email
- If exceeded, return 200 (don't reveal limit to attacker)
- Increment counter, TTL: 24 hours

**Step 5: Token Cleanup**
- Query all EmailVerificationToken records for this user
- Mark all as used (or delete)
- Prevents token confusion

**Step 6: New Token Generation**
- Generate new random 64-character hex token
- Create EmailVerificationToken:
  - user, token, created_at, expires_at (24 hours), used (False)
- Cache in Redis for quick validation

**Step 7: Email Preparation & Sending**
- Render email template
- Include new token in link
- Send via EmailService
- Log send attempt
- Queue retry if failed

**Step 8: Audit Logging**
- Create AuditLog:
  - action: "verification_resent"
  - user: user
  - ip_address: from request
  - custom_data: {attempt_count}

**Step 9: Response**
- Return 200 with generic message
- Frontend shows "Check your email"

#### 3.2.5 Database Models & Changes

**New Model: EmailVerificationToken**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- token (CharField, unique, db_index, 64 chars)
- created_at (DateTimeField, auto_now_add=True)
- expires_at (DateTimeField, default=now+24h)
- used (BooleanField, default=False)
- ip_address (CharField, nullable, for logging)
- user_agent (CharField, nullable, for logging)

**CustomUser Model Changes**
- Add `email_verified` (BooleanField, default=False, db_index=True)
- Add `email_verified_at` (DateTimeField, nullable)
- Modify `is_active` logic:
  - is_active should default to False until email verified
  - OR create separate `email_verified` field

**Tenant Model Changes**
- Add `is_active` (BooleanField, default=False)
- Activate only when owner's email verified

#### 3.2.6 Serializers
- VerifyEmailSerializer: Validate token, email
- ResendVerificationSerializer: Validate email
- VerifyEmailResponseSerializer: Return user, tokens, redirect

### 3.3 Email Verification Requirements

#### 3.3.1 Verification Email Template

**Subject**: "Verify your LankaCommerce email address"

**Header**: Tenant logo (if applicable)

**Body Content**:
- Greeting: "Hi [User Name],"
- Introduction: "Thank you for creating your LankaCommerce account!"
- Call to action: "Please verify your email address by clicking the link below:"
- Button: "Verify Email Address" (or direct link)
- Fallback link: Plain text link for email clients without button support
- Expiry notice: "This link will expire in 24 hours"
- Security notice: "If you didn't create this account, please ignore this email"
- Support: "Need help? Contact support at..."
- Footer: Company branding, address, links to terms/privacy

**Plain Text Version**: Same content without formatting

**Variables**:
- [User Name]: User's first name
- [Verify Link]: https://lankacommerce.lk/verify-email?token=...
- [Support Email]: support@lankacommerce.lk

#### 3.3.2 Verification Confirmation Email

**Subject**: "Your email has been verified"

**Body Content**:
- Greeting with name
- Confirmation: "Your email has been successfully verified"
- Timestamp: When it was verified
- Next steps: "You can now use all features of your account"
- Button: "Go to your dashboard"
- Support: Contact information

#### 3.3.3 Unverified Account Reminders

**Reminder 1**: After 24 hours (if not verified)
- Subject: "Complete your LankaCommerce setup"
- Message: "Verify your email to activate your account"
- Button: "Verify Now"
- Resend link

**Reminder 2**: After 7 days (if not verified)
- Subject: "Your account is pending activation"
- Message: "Please verify your email to avoid account deactivation"
- Warning: "Unverified accounts may be deleted after 30 days"
- Button: "Verify Now"

**Reminder 3**: After 30 days (if not verified)
- Subject: "Your account will be deleted"
- Message: "Account will be deleted in 24 hours if not verified"
- Final call to action
- Note: After 31 days, account is deleted

### 3.4 Account Lifecycle with Email Verification

**Registration** (user created)
1. User submits registration form
2. User created with is_active=False, email_verified=False
3. Tenant created with is_active=False
4. Verification email sent
5. User cannot login (is_active=False)
6. User shown "Check your email" message

**Email Verification** (user clicks link)
1. User clicks verification link
2. Token validated
3. User.is_active=True, email_verified=True
4. Tenant.is_active=True
5. Confirmation email sent
6. User redirected to dashboard (or login page)
7. User can now login

**Unverified Account Cleanup** (background job, daily)
1. Query users with email_verified=False, created_at > 31 days
2. Soft delete these users (set deleted_at, retain data)
3. Mark their tenants as inactive
4. Log deletion
5. Optional: Send final email before deletion

**Email Change** (future feature)
1. User changes email in account settings
2. New email requires verification
3. Verification email sent to new email
4. User must verify new email or revert to old
5. Old email still works until new email verified
6. After verification, old email removed

### 3.5 Security Considerations

**Token Security**
- Generate using secrets.token_hex(32) (cryptographic)
- Store as hash in database (like passwords)
- Single-use tokens (marked as used after verification)
- Short expiry (24 hours)
- Cannot be guessed (64-character random)

**Rate Limiting**
- 10 verification attempts per IP per hour
- 5 resends per email per 24 hours
- 3 token validations per token per hour
- Exponential backoff on repeated failures

**Brute Force Prevention**
- Cannot guess token (64-char random)
- Rate limiting on verification attempts
- CAPTCHA on resend if abuse detected

**Information Disclosure Prevention**
- Resend endpoint returns generic response
- Verify endpoint returns generic error on not found
- Don't reveal if account exists or email verified
- Don't reveal token validity in resend response

**Email Spoofing Prevention**
- Email from verified, trusted domain
- DKIM/SPF/DMARC configured
- Reply-to address monitored
- Only legitimate email addresses used

### 3.6 Compliance & Data Management

**GDPR Compliance**
- Email verification token deleted after use (or 24 hours)
- Verification timestamp recorded for audit
- User can request verification data deletion
- Clear data retention policy
- Optional consent for email usage

**Data Retention**
- Keep verification tokens for 24 hours minimum
- Delete after expiry (background job)
- Keep EmailVerificationToken records for 90 days (for audit)
- Archive old tokens if needed

**Audit Trail**
- Log all verification attempts (successful and failed)
- Record IP address, user agent, timestamp
- Track resend attempts
- Monitor suspicious patterns

**Notifications**
- User consent for marketing emails (separate from verification)
- Preference center for email notifications
- Unsubscribe link in all emails
- GDPR-compliant unsubscribe

### 3.7 Alternative Verification Methods (Future)

- SMS verification (for phone-based accounts)
- TOTP/authenticator app
- Security questions
- Recovery codes
- Social login verification

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- User verifies email after requesting password reset
- User attempts to verify after account deletion
- User verifies from multiple devices simultaneously
- Token expires during verification process
- User changes email before verifying first email
- Email bounce on verification email send
- User deletes account before email verification
- Resend email while verification in progress
- Concurrent verification attempts
- User verifies with old token after requesting new token

### 4.2 Validation Rules
- Email: Case-insensitive, trimmed, must match registration
- Token: 64-char hex, cryptographically random, single-use
- Expiry: Non-negotiable 24 hours
- Rate limit: Strictly enforced, no exceptions
- Account status: Must be unverified to verify

### 4.3 Security Considerations
- Token: Cryptographically secure, non-predictable
- Single-use: Cannot be reused after verification
- Expiry: Hard deadline, no extension
- Rate limiting: Strict, no bypass
- Information disclosure: Minimal error messages
- Account takeover: Prevent by requiring email verification

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Token generation (randomness, format)
- Token expiry logic
- Email format validation
- Rate limiting logic
- Token consumption
- User activation logic

### 5.2 Integration Tests
- Complete verification flow (happy path)
- Resend verification email flow
- Token validation endpoint
- Multiple resend attempts
- Expired token rejection
- Already used token rejection
- Rate limiting enforcement
- Email sending
- Concurrent verification attempts
- User activation after verification

### 5.3 Security Tests
- Token cannot be guessed
- Token not logged
- Rate limiting cannot be bypassed
- SQL injection prevention
- XSS injection prevention
- CSRF token validation
- Token randomness/entropy
- Email validation

### 5.4 Load Tests
- 1000 concurrent verifications
- Email delivery under load
- Token lookup performance
- Rate limiting cache performance

### 5.5 Acceptance Criteria
- [ ] User receives verification email on registration
- [ ] Verification link valid for exactly 24 hours
- [ ] Invalid token rejected
- [ ] Expired token rejected
- [ ] Already used token rejected
- [ ] User account activated after verification
- [ ] Confirmation email sent after verification
- [ ] Resend email works (max 5 per 24 hours)
- [ ] Rate limiting prevents abuse
- [ ] Unverified accounts deleted after 31 days
- [ ] Audit log created for all events
- [ ] User cannot login before email verified

---

## 6. Frontend Implementation Checklist

- [ ] Create verify email page
- [ ] Extract token from URL
- [ ] Implement token validation on load
- [ ] Create success state (checkmark, redirect)
- [ ] Create error state (invalid token)
- [ ] Create expired state (resend option)
- [ ] Create resend verification page
- [ ] Implement email input field
- [ ] Implement form validation
- [ ] Implement API call to resend endpoint
- [ ] Implement loading states
- [ ] Implement error handling
- [ ] Create unverified email banner (for dashboard)
- [ ] Add accessibility features (ARIA)
- [ ] Implement responsive design
- [ ] Test on mobile, tablet, desktop
- [ ] Test token validation
- [ ] Test error messages
- [ ] Test email sending

---

## 7. Backend Implementation Checklist

- [ ] Create EmailVerificationToken model
- [ ] Create VerifyEmailSerializer
- [ ] Create ResendVerificationSerializer
- [ ] Create verify email API endpoint
- [ ] Create resend verification API endpoint
- [ ] Implement token generation (cryptographic)
- [ ] Implement token validation
- [ ] Implement token consumption
- [ ] Implement user activation
- [ ] Implement email sending
- [ ] Implement rate limiting (Redis)
- [ ] Create email templates
- [ ] Create database migrations
- [ ] Implement audit logging
- [ ] Implement account cleanup (background job)
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
- Data migration for existing users

### 8.2 Data Migration (for existing users)
- Set email_verified=True for all existing users (they exist, assume verified)
- Tenant.is_active=True for all existing tenants
- Create records in audit log for migration
- Alternative: Send verification emails to all users (gradual rollout)

### 8.2 Deployment Steps
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Test complete flows
5. Monitor error rates
6. Alert on anomalies
7. Schedule account cleanup job

### 8.3 Rollback Plan
- Revert code
- Set email_verified=True for all users (re-activate)
- Restore database if needed

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Verify email: < 200ms
- Resend email: < 200ms
- Email sending: Async (no blocking)
- Token generation: < 10ms
- Token validation: < 50ms

### 9.2 Scalability Considerations
- Redis for rate limiting cache
- Email queue for delivery
- Database write optimization
- Connection pooling
- Background cleanup job (daily)

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Email verification rate
- Resend email rate
- Email delivery success rate
- Token validation rate
- Unverified account count
- Account deletion count (cleanup)
- Rate limit trigger count
- Error rate by type

### 10.2 Alerts
- Alert if verification error rate > 5%
- Alert if email delivery failure > 2%
- Alert if suspicious verification patterns
- Alert if cleanup job fails
- Alert if unverified account count too high

---

## 11. Documentation Requirements

### 11.1 For Developers
- API endpoint documentation
- Token generation algorithm
- Database schema documentation
- Rate limiting configuration
- Email template specifications
- Account lifecycle documentation
- Error codes reference
- Data migration guide

### 11.2 For Users
- Email verification troubleshooting guide
- What to do if email not received
- How to resend verification
- Account activation explanation
- Email security information
- Support contact information

---

## 12. Future Enhancements

- SMS verification as alternative
- TOTP/authenticator app support
- Security questions for recovery
- Email change workflow
- Backup emails for account recovery
- Passwordless login via email magic link
- Email-based 2FA
- Risk-based email verification (ML-based)
