# Login Page Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned  
**Priority:** Critical (Phase 1)  
**Scope:** Production-grade authentication with enterprise security features

---

## 1. Executive Summary

The Login Page is the primary entry point for user authentication in LankaCommerce. The current implementation is basic and lacks production-grade security features, error handling, and user experience enhancements required for a competitive SaaS platform.

This document details comprehensive requirements for enhancing the login system to meet enterprise standards including rate limiting, account lockout, audit logging, CAPTCHA integration, session management, and multi-tenant support.

---

## 2. Current State Analysis

### 2.1 What Exists
- Basic email/password login form
- Form validation (email format, password length)
- Multi-tenant support via subdomain extraction
- Role-based redirect after login
- PIN-based quick login (separate feature)
- JWT token generation and storage
- Basic error messages

### 2.2 Critical Gaps & Issues

#### Security Issues
- No rate limiting on login attempts
- No account lockout mechanism for brute force attacks
- No CAPTCHA or bot protection
- No login attempt tracking
- No IP-based suspicious activity detection
- No session timeout configuration
- Missing security headers in responses
- No JWT token refresh mechanism
- Token expiration not enforced consistently

#### User Experience Issues
- Limited error feedback (doesn't distinguish between invalid email vs invalid password)
- No "Remember Me" functionality
- No login history for user review
- No security alerts on unusual login activity
- No session management UI
- No password strength indicator during login recovery flow
- Missing loading states during authentication

#### Enterprise Features Missing
- No multi-factor authentication (MFA) enforcement
- No device registration/management
- No login activity notifications
- No geographical location tracking
- No device fingerprinting
- No audit trail for login attempts
- No integration with corporate SSO preparation

#### Data & Audit Issues
- Login attempts not logged for compliance
- No audit trail of failed vs successful attempts
- No timezone-aware logging
- Missing correlation IDs for troubleshooting

---

## 3. Detailed Requirements

### 3.1 Frontend - Login Page Component

#### 3.1.1 Form Fields & Validation
- **Email Field**
  - Input type: email
  - Required: Yes
  - Validation: Email format (RFC 5322 compliant via Zod)
  - Error states: "Email is required", "Invalid email format"
  - Auto-fill: Enable autocomplete="email"
  - Placeholder: "Enter your email address"
  - Accessibility: Label with proper aria-label

- **Password Field**
  - Input type: password (with show/hide toggle)
  - Required: Yes
  - Minimum length: 6 characters (server enforces 8+)
  - Validation: Non-empty
  - Error states: "Password is required"
  - Placeholder: "Enter your password"
  - Show/Hide toggle: Icon button to reveal password
  - Accessibility: Label with proper aria-label, aria-hidden on toggle

- **Remember Me Checkbox** (NEW)
  - Checkbox control
  - Label: "Remember me for 30 days"
  - Default: Unchecked
  - Persistence: LocalStorage with encryption
  - Auto-fill enabled: Pre-populate email if checkbox was previously selected
  - Security: Clear on logout/password change

#### 3.1.2 User Interface Elements
- **Form Container**
  - Responsive design (mobile: full width, tablet: 480px, desktop: 500px max-width)
  - White background on light mode, dark mode support
  - Shadow and border styling for professional appearance
  - Form title: "Welcome Back" with tagline
  - Branding: Display tenant logo if on subdomain, show LankaCommerce logo on main domain

- **Submit Button**
  - Text: "Sign In"
  - State: Disabled when form invalid or loading
  - Loading state: Show spinner, disable interaction, change text to "Signing in..."
  - Error state: Show red border on click after failed attempt
  - Accessibility: Type="submit", proper form association

- **Call-to-Action Links**
  - "Forgot Password?" link (redirects to /forgot-password)
  - "Don't have an account? Sign up" link (redirects to /register)
  - Position: Below submit button
  - Styling: Text links with underline on hover

- **Tenant Information** (Multi-tenant specific)
  - Tenant logo display (if available from public info API)
  - Tenant name display
  - Tenant color scheme application (if customized)
  - Position: Header or hero section

#### 3.1.3 Client-Side Error Handling
- Generic error message for failed login: "Invalid email or password" (do NOT reveal which field is wrong)
- Network error message: "Unable to connect. Please check your internet connection."
- Server error handling: "An error occurred. Please try again later."
- CAPTCHA failed message: "CAPTCHA verification failed. Please try again."
- Account locked message: "Your account has been temporarily locked due to too many failed login attempts. Please try again in [X minutes]."
- Email not verified message: "Please verify your email before logging in. Check your inbox for verification link."
- Account suspended message: "Your account has been suspended. Contact support for more information."

#### 3.1.4 Security Features - Frontend
- CSRF protection: Include CSRF token in form submission
- XSS prevention: Sanitize all user inputs via Zod validation
- Password field: Never logged or stored in LocalStorage
- "Remember me" token: Encrypted JWT stored in secure cookie
- Form submission: Prevent double submission (disable button on first click)
- Keyboard navigation: Full support with Tab, Enter to submit
- Password reveal toggle: Accessible via keyboard (Enter/Space)
- No console logging of sensitive data
- Security.txt integration: Redirect to security contact if needed

#### 3.1.5 Loading & State Management
- Show loading spinner during API call
- Disable all form inputs during submission
- Prevent form submission while loading
- Cancel button: Display "Cancel" if loading takes >2 seconds
- Timeout handling: If login takes >30 seconds, show "Request timed out" message
- Retry mechanism: Allow user to retry failed login
- Session persistence: Auto-fetch session on page load (via auth store)

### 3.2 Backend - Login Endpoint & Logic

#### 3.2.1 API Endpoint Specification
- **Endpoint**: `POST /api/auth/login/`
- **Content-Type**: application/json
- **Authentication**: None (public endpoint)
- **Rate Limiting**: 5 failed attempts per IP per 15 minutes (with exponential backoff)
- **Request Validation**: Schema defined in serializers

#### 3.2.2 Request Payload
```
{
  "email": "user@example.com",
  "password": "user_password",
  "remember_me": false,
  "tenant_slug": "optional-slug"  // For multi-tenancy override
}
```

#### 3.2.3 Response Payloads

**Success Response (200 OK)**
```
{
  "user": { ... full user payload ... },
  "tenant": { ... tenant payload ... },
  "tokens": {
    "access": "jwt_token",
    "refresh": "jwt_token"
  },
  "remember_token": "encrypted_jwt_or_null",
  "session_id": "uuid"
}
```

**Error Responses**
- 400 Bad Request: Invalid payload format
- 401 Unauthorized: Invalid credentials
- 429 Too Many Requests: Rate limit exceeded
- 403 Forbidden: Account locked, suspended, email not verified

#### 3.2.4 Business Logic - Login Process

**Step 1: Input Validation**
- Validate email format (must be valid email)
- Validate password non-empty
- Validate tenant_slug if provided
- Return 400 if validation fails

**Step 2: Rate Limiting & Security**
- Get client IP from request headers (X-Forwarded-For, X-Real-IP)
- Check Redis cache for failed login attempts
- Increment counter on each login attempt
- If counter >= 5, return 429 with retry-after header
- Track by IP + email combination
- Exponential backoff: First 5 attempts in 15 min, then 30 min lockout, then 1 hour
- Store attempt timestamp for audit

**Step 3: User Lookup**
- Query CustomUser by email
- If not found, return 401 "Invalid email or password"
- Store lookup attempt for audit (regardless of result)

**Step 4: Account Status Checks**
- Check if user.is_active == True
  - If False and deleted_at is set, return 403 "Account suspended"
  - If False but not deleted, return 403 "Account inactive"
- Check if user.email_verified == True
  - If False, return 403 "Email not verified" with instructions
- Check if user belongs to an active tenant
  - If tenant.is_active == False, return 403 "Tenant inactive"
- Check if tenant subscription is active
  - If billing status is "suspended", return 403 "Account suspended due to billing"

**Step 5: Account Lockout Check**
- Query AccountLockout model for this user
- If record exists and not expired, return 403 with remaining lockout time
- If expired, delete the record
- Update last_login_at timestamp on user

**Step 6: Password Verification**
- Use Django's check_password() to verify password
- If password incorrect:
  - Increment failed_login_count on user
  - Create LoginAttempt audit log (failed)
  - If failed_login_count >= 5, create AccountLockout record (lockout duration = 30 minutes)
  - Return 401 "Invalid email or password"
- If password correct:
  - Reset failed_login_count to 0
  - Continue to token generation

**Step 7: Session Version Check**
- Validate user.session_version matches expected value
- If mismatch, return 401 "Session invalidated, please login again"

**Step 8: JWT Token Generation**
- Generate access token (15 minutes expiry)
- Generate refresh token (7 days expiry)
- Include in token: user.id, user.email, user.role, user.session_version, user.tenant_id, iat, exp
- Include custom claim: "auth_type": "password"

**Step 9: Remember Me Token** (if requested)
- If remember_me == True:
  - Generate secure random token (64 characters)
  - Hash token
  - Store in RememberMeToken model (user_id, hashed_token, ip_address, user_agent, expires_at = 30 days)
  - Return encrypted token to frontend (for placement in secure cookie)
- If remember_me == False:
  - Return null

**Step 10: Audit Logging**
- Create AuditLog entry:
  - Action: "login_success"
  - User: user
  - IP address: extracted from request
  - User agent: from headers
  - Tenant: user.tenant
  - Timestamp: UTC now
  - Custom data: {device_info, location_data_if_available}

**Step 11: Session Creation**
- Generate session_id (UUID)
- Store in cache (Redis) with key: f"session:{session_id}" = {user_id, tenant_id, ip, user_agent, created_at, last_activity_at}
- Set expiry: 24 hours
- Return session_id in response

**Step 12: Response**
- Return 200 OK with user, tenant, tokens, remember_token, session_id

#### 3.2.5 Error Handling & Recovery
- All errors logged with correlation ID
- Distinguish between user not found (401) vs other errors (500)
- Email password reset link on first 401 for convenience
- Alert tenant admin on multiple failed attempts in short time
- Implement circuit breaker for database to prevent cascading failures

#### 3.2.6 Database Models & Changes Required

**New Model: AccountLockout**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- locked_at (DateTimeField, auto_now_add=True)
- locked_until (DateTimeField)
- reason (CharField: 'brute_force', 'admin_lock', 'suspicious')
- attempt_count (IntegerField)
- ip_address (CharField)
- user_agent (CharField)

**New Model: RememberMeToken**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- token_hash (CharField, unique, db_index)
- ip_address (CharField)
- user_agent (CharField)
- device_name (CharField, blank)
- created_at (DateTimeField, auto_now_add=True)
- last_used_at (DateTimeField, nullable)
- expires_at (DateTimeField)

**New Model: LoginAttempt** (for audit)
- id (UUID, primary key)
- email (EmailField, db_index)
- ip_address (CharField, db_index)
- user_agent (CharField)
- success (BooleanField)
- reason_if_failed (CharField, nullable)
- created_at (DateTimeField, auto_now_add=True)
- user (ForeignKey, nullable, CASCADE)

**CustomUser Model Changes**
- Add `email_verified` (BooleanField, default=False)
- Add `failed_login_count` (IntegerField, default=0)
- Add `last_login_at` (already exists, ensure it's updated)

#### 3.2.7 Serializers
- LoginSerializer: Validate email, password, remember_me, tenant_slug
- LoginResponseSerializer: Serialize user, tenant, tokens, session_id

### 3.3 Forgot Password Integration (Related Feature)
- Include "Forgot Password?" link on login page
- Link redirects to /forgot-password endpoint
- Forgot password endpoint sends reset link via email
- Reset link contains token valid for 1 hour
- Implement proper token generation and storage

### 3.4 PIN Login Integration
- Provide separate "PIN Login" button/link
- Option to switch between password and PIN login
- PIN should be 4-6 digits
- PIN stored as hashed value in CustomUser.pin_hash
- PIN login should also respect rate limiting and account lockout

### 3.5 Multi-Tenant Support
- Extract subdomain from hostname
- Support query parameter: `?tenant=slug`
- If user belongs to multiple tenants, prompt for tenant selection (future enhancement)
- Redirect to tenant-specific dashboard after login
- Preserve tenant context in session

### 3.6 Two-Factor Authentication (Preparation)
- Implement redirect flow for MFA after password verification
- If user has MFA enabled, return 401 with MFA_REQUIRED code
- Frontend handles redirect to MFA verification page
- Support TOTP and SMS MFA methods

### 3.7 CAPTCHA Integration
- Implement CAPTCHA check on 3rd failed attempt in 15 minutes
- Integrate with Google reCAPTCHA v3 (passive, score-based)
- Display CAPTCHA challenge in modal/overlay
- CAPTCHA token sent with login request
- Verify token on backend before checking credentials
- Non-interactive approach: If score < 0.5, show challenge

### 3.8 Session Management
- Store session in Redis with TTL of 24 hours
- Implement session validation on every request
- Support multiple concurrent sessions (user can be logged in from multiple devices)
- Provide option to logout from all devices (increment session_version)
- Implement activity tracking (update last_activity_at on each request)

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- User with multiple accounts (same person, different emails)
- User attempting to login during account deletion process
- User attempting to login after being removed from tenant
- User with pending email verification
- User whose password hasn't been set yet (for invited users)
- Timezone issues with token expiry
- Daylight saving time transitions
- Concurrent login attempts from same user
- Login attempt with email alias
- Login attempt with different case email (normalize to lowercase)
- User account locked during login attempt
- Session expired during form submission
- Network interruption during token generation

### 4.2 Validation Rules
- Email: Must be lowercase, trimmed, valid format, max 255 chars
- Password: No validation on login (only format checked on registration), encrypted in transit
- Tenant slug: Must be alphanumeric, lowercase, 3-50 chars
- IP address: Extract correctly from load balancer headers
- User agent: Log accurately for device identification
- Rate limit: Enforce strictly, no bypasses

### 4.3 Security Considerations
- Timing attack prevention: Use constant-time password comparison
- Information disclosure: Never reveal which field is wrong (email exists or not)
- Session fixation: Generate new session on each login
- CSRF: Validate CSRF token on POST
- SQL injection: Use ORM parameterized queries only
- Brute force: Rate limit by IP and email combination
- Credential stuffing: Monitor for unusual patterns
- Phishing: Implement email validation and authentication indicators

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Test password verification (correct, incorrect, empty)
- Test rate limiting logic (increment, reset, expiry)
- Test account lockout (creation, expiry)
- Test remember me token generation
- Test session creation and validation
- Test email normalization
- Test tenant lookup and validation

### 5.2 Integration Tests
- Test complete login flow (happy path)
- Test login with invalid credentials
- Test login with account locked
- Test login with email not verified
- Test login with inactive user
- Test login with inactive tenant
- Test remember me workflow
- Test CAPTCHA integration
- Test rate limiting across multiple IPs
- Test concurrent login attempts

### 5.3 Security Tests
- Test password not logged in any form
- Test tokens generated with correct expiry
- Test XSS injection in email field
- Test SQL injection in email field
- Test brute force attack prevention
- Test session hijacking prevention
- Test CSRF token validation

### 5.4 Load Tests
- Test login endpoint under 1000 RPS
- Test Redis rate limiting under load
- Test JWT token generation performance
- Test database query performance with large user base

### 5.5 Acceptance Criteria
- [ ] User can successfully login with valid credentials
- [ ] User receives meaningful error on invalid credentials
- [ ] User account locks after 5 failed attempts in 15 minutes
- [ ] User can remember device for 30 days
- [ ] User cannot login if email not verified
- [ ] Rate limiting prevents brute force attacks
- [ ] CAPTCHA appears after 3 failed attempts
- [ ] Login is tracked in audit log with timestamp, IP, user agent
- [ ] Session created with correct expiry
- [ ] Multi-tenant support works correctly
- [ ] PIN login works as alternative

---

## 6. Frontend Implementation Checklist

- [ ] Create login page component
- [ ] Implement form with email and password fields
- [ ] Add "Remember Me" checkbox
- [ ] Add "Show/Hide Password" toggle
- [ ] Implement form validation (client-side)
- [ ] Implement API call to login endpoint
- [ ] Handle success response (store tokens, redirect)
- [ ] Handle error responses (display messages)
- [ ] Implement loading states
- [ ] Add CAPTCHA component
- [ ] Integrate with auth store (Zustand)
- [ ] Implement session persistence
- [ ] Add keyboard navigation support
- [ ] Implement responsive design
- [ ] Add accessibility features (ARIA labels, semantic HTML)
- [ ] Implement forgot password link
- [ ] Implement PIN login option
- [ ] Implement "Remember me" persistence
- [ ] Add security headers
- [ ] Test on mobile, tablet, desktop
- [ ] Test with screen readers

---

## 7. Backend Implementation Checklist

- [ ] Create LoginSerializer
- [ ] Create LoginResponseSerializer
- [ ] Create login API view
- [ ] Implement password verification logic
- [ ] Implement rate limiting (Redis)
- [ ] Implement account lockout mechanism
- [ ] Create AccountLockout model and migration
- [ ] Create RememberMeToken model and migration
- [ ] Create LoginAttempt model and migration
- [ ] Implement JWT token generation
- [ ] Implement session creation in Redis
- [ ] Implement audit logging
- [ ] Implement CAPTCHA verification
- [ ] Implement email verification check
- [ ] Implement account status checks
- [ ] Implement multi-tenant support
- [ ] Implement forgot password flow
- [ ] Implement PIN login endpoint
- [ ] Add error handling and logging
- [ ] Add security headers in response
- [ ] Implement CORS for subdomains
- [ ] Test with Postman/curl

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment
- Code review for security
- Load testing on staging
- Security testing (OWASP top 10)
- Database migration testing
- Rollback plan documentation

### 8.2 Deployment Steps
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Clear cache
5. Monitor login error rates
6. Monitor performance metrics
7. Alert on anomalies

### 8.3 Rollback Plan
- Revert to previous version if error rate > 5%
- Keep old login endpoint available for 24 hours
- Monitor for stuck sessions

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Login response time: < 200ms (p95)
- Rate limiting lookup: < 10ms
- Password verification: < 50ms
- Token generation: < 20ms

### 9.2 Scalability Considerations
- Redis cluster for rate limiting cache
- Database read replicas for user lookup
- Connection pooling for database
- JWT tokens stateless (no server-side storage needed)
- Session storage in Redis (distributed)

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Login success rate
- Failed login rate
- Account lockout count
- CAPTCHA success rate
- Average login time
- Rate limit triggered count
- Email verification pending count

### 10.2 Alerts
- Alert if login error rate > 10%
- Alert if CAPTCHA success rate < 50%
- Alert if failed login attempts spike
- Alert if account lockout spike
- Alert if slow login response (> 500ms)

---

## 11. Documentation Requirements

### 11.1 For Developers
- API endpoint documentation (OpenAPI)
- Database schema documentation
- Serializer field documentation
- Error codes reference
- Rate limiting documentation
- CAPTCHA integration guide

### 11.2 For Users
- Login troubleshooting guide
- Forgot password instructions
- Account lockout explanation
- Two-factor setup guide
- Device management guide
- Security best practices

---

## 12. Future Enhancements

- Single Sign-On (SSO) integration
- Social login (Google, Microsoft)
- Passwordless login (email magic link)
- Biometric login support
- Risk-based authentication (ML-based detection)
- Geographic restriction rules
- Login notifications via email/SMS
- Device management dashboard
- Login history dashboard
