# Registration Page Feature - Comprehensive Implementation Plan

**Document Version:** 1.0  
**Status:** Planned  
**Priority:** Critical (Phase 1)  
**Scope:** Self-registering SaaS tenant creation with email verification

---

## 1. Executive Summary

The Registration Page enables new business owners to create LankaCommerce accounts and establish their own SaaS tenants. The current implementation is basic and lacks enterprise-grade validation, tenant provisioning, billing integration, and compliance features required for a production-grade multi-tenant platform.

This document details comprehensive requirements for a production-grade self-registration system including business validation, email verification, tenant creation, subscription initialization, GDPR compliance, and anti-abuse measures.

---

## 2. Current State Analysis

### 2.1 What Exists
- Basic registration form with store name, email, password
- Client-side validation (Zod schema)
- Password confirmation
- Timezone and currency selectors
- Slug generation preview
- API endpoint for business registration
- Tenant creation on registration
- Basic error handling

### 2.2 Critical Gaps & Issues

#### Security Issues
- No email verification before account activation
- No verification of email ownership
- No rate limiting on registration attempts
- No CAPTCHA/bot protection
- No validation of business registration details
- No duplicate business name detection across tenants
- No password strength requirements during registration
- No phone number validation
- No IP-based spam detection

#### Business Logic Issues
- Missing email verification flow
- No trial period initialization
- No default subscription plan assignment
- No tenant provisioning validation
- No business type-specific onboarding
- No initial data seeding for tenant
- No default configuration setup
- No business domain validation

#### Compliance Issues
- No GDPR compliance features
- No data retention policies
- No user consent management
- No terms acceptance tracking
- No privacy policy acceptance tracking
- No data processing agreement acceptance
- No audit trail for registration
- No anti-spam measures

#### User Experience Issues
- No company/business information collection
- No industry/business type selection
- No phone number field
- No address validation
- No duplicate account prevention
- No email already exists check
- No account activation notification
- No setup wizard/onboarding

#### Data Issues
- No proper tenant initialization
- No default warehouse creation
- No default user role/permissions
- No initial chart of accounts setup
- No default tax configuration
- No currency and timezone not applied to tenant

---

## 3. Detailed Requirements

### 3.1 Frontend - Registration Page Component

#### 3.1.1 Form Fields & Validation

**Step 1: Business Information**

- **Business Name Field**
  - Input type: text
  - Required: Yes
  - Max length: 255 characters
  - Validation: Non-empty, no special characters except spaces/hyphens, min 2 chars
  - Error states: Required, "Too long", "Invalid characters"
  - Placeholder: "e.g., John's Electronics Store"
  - Character counter: Show remaining characters (255 total)
  - Autocomplete: "organization"
  - Auto-generate slug preview below field

- **Business Type Selector** (NEW)
  - Type: Dropdown/Select
  - Required: Yes
  - Options: Retail Store, Restaurant/Cafe, Supermarket, E-commerce, Service Business, Manufacturing, Wholesale, Other
  - Error states: Required
  - Additional field: If "Other" selected, show text input for custom type
  - Help text: "Helps us tailor your experience"

- **Owner Email Field**
  - Input type: email
  - Required: Yes
  - Validation: Valid email format, max 255 chars, unique check via API
  - Error states: Required, Invalid format, "Email already registered"
  - Placeholder: "your@business.email"
  - Autocomplete: "email"
  - Real-time duplicate check (debounced, 500ms)
  - Show "Email available" or "Email in use" indicator

- **Phone Number Field** (NEW)
  - Input type: tel
  - Required: Yes
  - Format: Support international format or country-specific
  - Validation: Valid phone format, min 8 digits, max 15 digits
  - Error states: Required, Invalid format
  - Placeholder: "+94 (optional country code) ..."
  - Phone library integration for format validation
  - Country selector for consistent formatting

- **Business Address Fields** (NEW)
  - Street Address: text, required, max 200 chars
  - City: text, required, max 100 chars
  - Postal Code: text, required, max 20 chars
  - Country: dropdown, required, pre-selected Sri Lanka
  - State/Province: text, optional, max 100 chars
  - Validation: All required, non-empty

- **Owner Name Field** (NEW) - Split into:
  - First Name: text, required, max 150 chars
  - Last Name: text, required, max 150 chars

**Step 2: Credentials & Settings**

- **Password Field**
  - Input type: password with show/hide toggle
  - Required: Yes
  - Minimum length: 8 characters
  - Validation rules:
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 number (0-9)
    - At least 1 special character (!@#$%^&*)
    - No more than 2 consecutive identical characters
    - Not a common password
  - Real-time strength indicator: Weak/Fair/Good/Strong/Very Strong
  - Error states: Too short, missing uppercase, missing number, missing special char
  - Placeholder: "Create a strong password"
  - Help text: "Minimum 8 characters, including uppercase, number, and symbol"

- **Confirm Password Field**
  - Input type: password with show/hide toggle
  - Required: Yes
  - Validation: Must match password field
  - Error states: Passwords do not match
  - Placeholder: "Confirm password"

- **Timezone Selector**
  - Type: Dropdown/Select
  - Required: Yes
  - Default: "Asia/Colombo" (Sri Lanka)
  - Options: All timezones from IANA database
  - Searchable: Yes
  - Help text: "Used for timestamps and reports"

- **Currency Selector**
  - Type: Dropdown/Select
  - Required: Yes
  - Default: "LKR" (Sri Lankan Rupee)
  - Options: All major currencies with symbols
  - Searchable: Yes
  - Help text: "Primary currency for transactions"

#### 3.1.2 Terms & Compliance

- **Terms of Service Checkbox** (NEW)
  - Required: Yes
  - Text: "I agree to the Terms of Service"
  - Link: "/terms" (opens in new tab)
  - Error states: Must be checked
  - Styling: Required indicator (asterisk)

- **Privacy Policy Checkbox** (NEW)
  - Required: Yes
  - Text: "I agree to the Privacy Policy"
  - Link: "/privacy" (opens in new tab)
  - Error states: Must be checked

- **Data Processing Agreement Checkbox** (NEW) - for business
  - Required: Yes (with expansion)
  - Text: "I have read and agree to the Data Processing Agreement"
  - Link: "/dpa" (opens in new tab)
  - Expandable: Show summary first, expand for full text
  - GDPR requirement

- **Marketing Consent Checkbox** (NEW)
  - Required: No (optional)
  - Text: "I would like to receive marketing emails and updates"
  - Default: Unchecked
  - Compliance: GDPR opt-in (not opt-out)
  - Record consent timestamp

#### 3.1.3 User Interface Elements

- **Multi-step Form**
  - Step 1: Business Information (name, type, email, phone, address)
  - Step 2: Owner Information (first name, last name)
  - Step 3: Credentials & Settings (password, confirm, timezone, currency)
  - Step 4: Compliance (terms, privacy, DPA, marketing consent)
  - Progress bar: Show steps 1-4, current step highlighted
  - Navigation: Previous/Next buttons (Previous disabled on step 1)
  - Keyboard: Allow Tab to move between steps

- **Form Container**
  - Responsive design (mobile: full width, tablet/desktop: 600px max)
  - White background, professional styling
  - Form title: "Create Your LankaCommerce Account"
  - Subtitle: "Join thousands of businesses managing sales, inventory & operations"

- **Submit Button**
  - Text: "Create Account" (on final step)
  - State: Disabled if form invalid or loading
  - Loading state: Show spinner, disable interaction
  - CAPTCHA requirement: May appear before submission

- **Already Have Account Link**
  - Text: "Already have an account? Sign in"
  - Link: "/login"
  - Position: Bottom of form

#### 3.1.4 Client-Side Error Handling

- Email already registered: "This email is already in use. Try logging in or use another email."
- Network error: "Unable to check email availability. Please try again."
- Weak password: Display specific requirement that's missing
- Form submission failure: "Unable to create account. Please try again."
- CAPTCHA failed: "CAPTCHA verification failed. Please try again."
- Server error: "An error occurred. Please contact support."
- Rate limited: "Too many registration attempts. Please wait before trying again."

#### 3.1.5 Email Verification Flow

- After form submission, show success page:
  - Message: "Check your email to verify your account"
  - Information: "We've sent a verification link to [email]"
  - Instructions: "Click the link in the email to activate your account"
  - Resend link button: "Didn't receive email? Resend"
  - Resend throttle: Allow after 30 seconds, show countdown
  - Max resend attempts: 5 in 24 hours
  - Link to login: "Back to Login" (disabled until verified)
  - Countdown timer: "Verification link expires in 24 hours"

#### 3.1.6 Security Features - Frontend

- CSRF protection: Include CSRF token
- XSS prevention: Sanitize all inputs
- Password field: Never logged or stored
- Form submission: Prevent double submission
- Keyboard navigation: Full support
- No console logging of sensitive data
- CAPTCHA integration: reCAPTCHA v3 on form submission

### 3.2 Backend - Registration Endpoint & Logic

#### 3.2.1 API Endpoint Specification

- **Endpoint**: `POST /api/tenants/register/`
- **Content-Type**: application/json
- **Authentication**: None (public endpoint)
- **Rate Limiting**: 1 registration per email per 24 hours, max 10 per IP per hour
- **CAPTCHA Required**: Required for submission

#### 3.2.2 Request Payload

```
{
  "owner_email": "user@example.com",
  "owner_first_name": "John",
  "owner_last_name": "Doe",
  "owner_password": "SecurePassword123!",
  "confirm_password": "SecurePassword123!",
  "store_name": "John's Electronics",
  "business_type": "Retail Store",
  "phone_number": "+94701234567",
  "address_street": "123 Main Street",
  "address_city": "Colombo",
  "address_postal_code": "10101",
  "address_country": "LK",
  "address_state": "Western",
  "timezone": "Asia/Colombo",
  "currency": "LKR",
  "terms_accepted": true,
  "privacy_accepted": true,
  "dpa_accepted": true,
  "marketing_consent": false,
  "captcha_token": "token"
}
```

#### 3.2.3 Response Payloads

**Success Response (201 Created)**
```
{
  "tenant": {
    "id": "uuid",
    "slug": "johns-electronics",
    "name": "John's Electronics",
    "domain": "https://johns-electronics.lankacommerce.lk"
  },
  "message": "Account created successfully. Please verify your email.",
  "next_step": "verify_email"
}
```

**Error Responses**
- 400: Invalid payload, missing fields, validation errors
- 409: Email already registered, business name taken
- 429: Rate limit exceeded
- 422: CAPTCHA verification failed

#### 3.2.4 Business Logic - Registration Process

**Step 1: Input Validation**
- Validate all required fields present
- Validate email format (RFC 5322)
- Validate password strength requirements (8+ chars, mixed case, number, special char)
- Validate password confirmation matches
- Validate phone number format
- Validate address fields
- Validate timezone from IANA list
- Validate currency from ISO 4217 list
- Return 400 if validation fails

**Step 2: CAPTCHA Verification**
- Verify CAPTCHA token with Google reCAPTCHA API
- Check score (if v3): score >= 0.5 required
- Return 422 if verification fails
- Log verification result for monitoring

**Step 3: Rate Limiting**
- Check registration attempts by IP address (last 24 hours)
- Allow max 10 registrations per IP per hour
- Check registration attempts by email (last 24 hours)
- Allow max 1 registration per email per 24 hours
- Return 429 if limit exceeded with retry-after header
- Log attempt for fraud detection

**Step 4: Duplicate Email Check**
- Query CustomUser by email (case-insensitive)
- If found, return 409 "Email already registered"
- Check email domains: block disposable email domains
- Whitelist major corporate domains

**Step 5: Duplicate Business Name Check**
- Query Tenant by name (case-insensitive)
- If found, return 409 "Business name already taken"
- Suggest alternative names (name + random number)

**Step 6: Slug Generation & Validation**
- Generate slug from business name
- Normalize to lowercase, alphanumeric, hyphens only
- Check slug uniqueness across all tenants
- If taken, append random suffix
- Reserved slugs: admin, api, app, www, mail, ftp, payments, etc.
- Return 409 if slug cannot be generated

**Step 7: User Creation**
- Hash password using Django's make_password()
- Create CustomUser with:
  - email (normalized to lowercase)
  - first_name, last_name
  - role: TENANT_ADMIN (highest privilege for tenant)
  - permissions_list: All permissions for admin
  - is_active: False (until email verified)
  - tenant: will be set after tenant creation
  - failed_login_count: 0
  - session_version: 1
- Return error if user creation fails

**Step 8: Tenant Creation**
- Create Tenant with:
  - name: business name
  - slug: generated slug
  - owner: user created above
  - timezone: from request
  - currency: from request
  - is_active: False (until email verified)
  - billing_status: "trial"
  - trial_start_at: current timestamp
  - trial_end_at: current + 14 days
  - subscription_plan: "starter" (default free/trial plan)
  - subscription_start_at: current timestamp
- Link user to tenant: set user.tenant = tenant

**Step 9: Default Tenant Provisioning**
- Create default Warehouse for tenant (name: "Main Warehouse", is_default: True)
- Create default ProductCategory (name: "Uncategorized")
- Create default TaxConfiguration:
  - VAT rate: 15% (Sri Lanka standard)
  - Apply to: all products
- Create default ChartOfAccounts (standard chart for retail)
- Create default BusinessSettings (company info, branding, etc.)

**Step 10: Compliance Data Recording**
- Create TermsAcceptance record:
  - user, tenant, version, accepted_at (current timestamp), ip_address, user_agent
- Create PrivacyAcceptance record (same fields)
- Create DPAAcceptance record (same fields)
- Create ConsentRecord for marketing (if opted in):
  - user, type: "marketing_email", value: true, timestamp, ip_address

**Step 11: Email Verification Token Generation**
- Generate EmailVerificationToken with:
  - user, token (64 hex chars), created_at, expires_at (24 hours), used: false
- Store token in database
- Also create short-lived cache entry for quick verification

**Step 12: Verification Email**
- Render email template with:
  - Business name
  - Verification link: https://lankacommerce.lk/verify-email?token=...
  - Expiration time: "Link expires in 24 hours"
  - Support contact info
  - Footer with terms, privacy, DPA links
- Send via EmailService
- Log email send for tracking
- If email send fails, store retry for background task

**Step 13: Audit Logging**
- Create AuditLog:
  - action: "registration_attempted"
  - user: created user
  - tenant: created tenant
  - ip_address: from request
  - user_agent: from headers
  - status: "pending_verification"
  - custom_data: {business_type, phone_number, address}

**Step 14: Onboarding Queue**
- Add entry to OnboardingTask queue:
  - tenant_id, task_type: "send_welcome_email", status: "pending"
  - scheduled_for: current + 1 hour
- Add entry for "setup_default_products" (background task)

**Step 15: Response**
- Return 201 with tenant info and message
- Frontend redirects to email verification page

#### 3.2.5 Email Verification Endpoint

**Endpoint**: `POST /api/auth/verify-email/`

**Request**:
```
{
  "token": "email_verification_token",
  "email": "user@example.com" (optional, for verification)
}
```

**Process**:
1. Validate token format
2. Query EmailVerificationToken by token
3. If not found or used, return 400 "Invalid token"
4. If expired, return 400 "Token expired"
5. Check token.user.email matches request email
6. Mark token.used = True
7. Set user.is_active = True
8. Set user.email_verified = True
9. Set tenant.is_active = True
10. Generate JWT tokens for immediate login
11. Create LoginAttempt audit log (verified)
12. Send welcome email
13. Return 200 with tokens and redirect path

**Response**:
```
{
  "user": {...},
  "tokens": {...},
  "message": "Email verified successfully. You are now logged in.",
  "redirect_url": "/dashboard"
}
```

#### 3.2.6 Email Verification Resend Endpoint

**Endpoint**: `POST /api/auth/resend-verification/`

**Request**:
```
{
  "email": "user@example.com"
}
```

**Process**:
1. Validate email format
2. Query CustomUser by email
3. If not found, return 404 "User not found"
4. If already verified, return 400 "Email already verified"
5. Check resend count in last 24 hours (max 5)
6. Generate new token (invalidate old ones)
7. Send verification email
8. Return 200 success message

#### 3.2.7 Database Models & Changes Required

**New Model: EmailVerificationToken**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- token (CharField, unique, db_index, 64 chars)
- created_at (DateTimeField, auto_now_add=True)
- expires_at (DateTimeField)
- used (BooleanField, default=False)

**New Model: TermsAcceptance**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- tenant (ForeignKey to Tenant, CASCADE)
- version (CharField, e.g., "1.0")
- accepted_at (DateTimeField, auto_now_add=True)
- ip_address (CharField)
- user_agent (CharField)

**New Model: PrivacyAcceptance** (same structure as TermsAcceptance)

**New Model: DPAAcceptance** (same structure as TermsAcceptance)

**New Model: ConsentRecord**
- id (UUID, primary key)
- user (ForeignKey to CustomUser, CASCADE)
- type (CharField: "marketing_email", "sms", "push")
- value (BooleanField)
- timestamp (DateTimeField, auto_now_add=True)
- ip_address (CharField)
- source (CharField: "registration", "settings_update")

**Tenant Model Changes**
- Add `business_type` (CharField)
- Add `phone_number` (CharField)
- Add `address_street` (CharField)
- Add `address_city` (CharField)
- Add `address_postal_code` (CharField)
- Add `address_country` (CharField)
- Add `address_state` (CharField, nullable)
- Add `owner` (ForeignKey to CustomUser, nullable, SET_NULL)
- Add `is_active` (BooleanField, default=False)
- Add `trial_start_at` (DateTimeField)
- Add `trial_end_at` (DateTimeField)
- Add `subscription_plan` (CharField, default="starter")
- Add `subscription_start_at` (DateTimeField)
- Add `billing_status` (CharField, default="trial")

**CustomUser Model Changes**
- Add `email_verified` (BooleanField, default=False)
- Add `failed_login_count` (IntegerField, default=0)

#### 3.2.8 Serializers
- RegistrationSerializer: Validate all fields
- TenantCreationSerializer: Validate tenant data
- VerifyEmailSerializer: Validate token
- ResendVerificationSerializer: Validate email

### 3.3 Business Rules & Constraints

**Email Rules**
- Must be unique across platform
- Case-insensitive matching
- Cannot be a disposable email domain
- Must be verified before first login
- Can be changed by user later (requires verification)

**Password Rules**
- Minimum 8 characters
- Must contain uppercase, lowercase, number, special char
- Cannot be a common password (check against database)
- Cannot reuse last 5 passwords
- Password reset changes history

**Business Name Rules**
- Unique per tenant (case-insensitive)
- 2-255 characters
- Can contain spaces, hyphens, numbers, letters
- No leading/trailing spaces
- No special characters except space and hyphen

**Phone Number Rules**
- Format: +[country code] [number]
- Minimum 8 digits, maximum 15 digits
- Country-specific validation if possible
- Must be valid for specified country

**Slug Rules**
- Generated from business name
- Lowercase, alphanumeric, hyphens only
- 3-50 characters
- Unique across all tenants
- No reserved words

**Trial Period**
- Default: 14 days from registration
- Access to all features during trial
- No payment required
- Email reminder before expiry (3 days, 1 day)
- Auto-suspend after trial ends (can be extended with payment)

### 3.4 Anti-Abuse Measures

**Rate Limiting**
- Max 10 registrations per IP per hour
- Max 1 registration per email per 24 hours
- Max 5 verification email resends per 24 hours
- Progressive delays on repeated attempts

**CAPTCHA**
- Required for all submissions
- Google reCAPTCHA v3
- Score >= 0.5 required
- Fallback to v2 if v3 fails

**Disposable Email Blocking**
- Check against disposable email domains list
- Prevent sign-ups with throwaway emails
- Update list periodically

**Spam Detection**
- Monitor for pattern of registrations with same credit card
- Block registrations from known VPN/Proxy IPs
- Alert on unusual registration patterns

### 3.5 Onboarding Experience

**Welcome Email** (sent after verification)
- Greeting with tenant name
- Quick start guide
- Link to onboarding wizard
- Support contact info
- Tips for first steps

**Onboarding Wizard** (optional guided setup)
- Step 1: Basic product setup
- Step 2: Warehouse configuration
- Step 3: User team setup
- Step 4: Payment integration
- Step 5: Settings review

---

## 4. Validation & Edge Cases

### 4.1 Edge Cases
- User registers multiple times with same email before verifying first account
- User registers with email, then changes to same email from another account
- Verification link clicked after 24 hours
- Verification link clicked multiple times
- Registration during tenant deletion process
- Registration with subdomain that matches reserved keyword
- Timezone name changes (DST transitions)
- Currency changes after registration
- User deletes account before email verification
- Concurrent registration attempts from same IP

### 4.2 Validation Rules
- Email: Lowercase, trimmed, unique, valid format
- Password: Complex, not common, not matching email
- Business name: Trimmed, no leading/trailing spaces, unique
- Phone: Valid format for country, 8-15 digits
- Address: All fields non-empty, max lengths enforced
- Timezone: Must be from IANA database
- Currency: Must be from ISO 4217 list
- Slug: Generated deterministically, unique

### 4.3 Security Considerations
- Password never logged or sent in plain text
- Email verification prevents account takeover
- Rate limiting prevents registration abuse
- CAPTCHA prevents bot attacks
- Consent records for GDPR/compliance
- IP address logging for fraud detection
- Token expiry enforces single-use verification

---

## 5. Testing Requirements

### 5.1 Unit Tests
- Password strength validation
- Slug generation uniqueness
- Email format validation
- Phone number format validation
- CAPTCHA verification logic
- Token generation and expiry
- Consent recording

### 5.2 Integration Tests
- Complete registration flow (happy path)
- Email verification flow
- Duplicate email rejection
- Duplicate business name rejection
- Tenant provisioning (warehouse, categories, etc.)
- Token generation and expiry
- Resend verification email
- Default settings application

### 5.3 Security Tests
- Password not logged in logs
- CAPTCHA bypass prevention
- Rate limiting enforcement
- SQL injection prevention
- XSS injection prevention
- CSRF token validation
- Email confirmation enforcement

### 5.4 Load Tests
- 1000 concurrent registrations
- Email delivery under load
- Token generation performance
- Database query optimization

### 5.5 Acceptance Criteria
- [ ] User can register with all required fields
- [ ] Email verification required before login
- [ ] Business name must be unique
- [ ] Email must be unique
- [ ] Password must meet complexity requirements
- [ ] Tenant created automatically on registration
- [ ] Default warehouse and settings created
- [ ] Compliance records created
- [ ] Trial period initialized to 14 days
- [ ] Rate limiting prevents abuse
- [ ] CAPTCHA verification works
- [ ] Email sent successfully

---

## 6. Frontend Implementation Checklist

- [ ] Create multi-step registration form
- [ ] Implement step navigation (Previous/Next)
- [ ] Implement progress bar
- [ ] Add business information fields
- [ ] Add owner information fields
- [ ] Add password strength indicator
- [ ] Add timezone and currency selectors
- [ ] Add terms/privacy/DPA checkboxes
- [ ] Implement real-time email duplicate check
- [ ] Implement slug generation preview
- [ ] Implement CAPTCHA component
- [ ] Implement form validation (client-side)
- [ ] Handle success response (email verification page)
- [ ] Handle error responses (display messages)
- [ ] Implement email verification page
- [ ] Implement resend verification email
- [ ] Add accessibility features (ARIA)
- [ ] Implement responsive design
- [ ] Test on mobile, tablet, desktop
- [ ] Add keyboard navigation
- [ ] Add loading states

---

## 7. Backend Implementation Checklist

- [ ] Create RegistrationSerializer
- [ ] Create registration API endpoint
- [ ] Create email verification endpoint
- [ ] Create resend verification endpoint
- [ ] Implement CAPTCHA verification
- [ ] Implement rate limiting
- [ ] Implement duplicate email check
- [ ] Implement duplicate business name check
- [ ] Implement slug generation
- [ ] Implement user creation
- [ ] Implement tenant creation
- [ ] Implement default provisioning (warehouse, categories, etc.)
- [ ] Implement email verification token
- [ ] Implement compliance record creation
- [ ] Implement email sending
- [ ] Implement audit logging
- [ ] Add error handling
- [ ] Add input validation
- [ ] Create database migrations
- [ ] Create models (EmailVerificationToken, Acceptances, etc.)
- [ ] Add security headers
- [ ] Test with Postman/curl

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment
- Code review for security
- Load testing on staging
- Email delivery testing
- Database migration testing
- CAPTCHA integration testing
- Rollback plan documentation

### 8.2 Deployment Steps
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Test registration flow end-to-end
5. Monitor registration metrics
6. Alert on high error rates

### 8.3 Rollback Plan
- Revert code changes
- Keep old registrations intact (no data loss)

---

## 9. Performance & Scalability

### 9.1 Performance Targets
- Registration submission: < 2 seconds
- Email verification: < 500ms
- Default provisioning: < 1 second
- Duplicate check: < 100ms

### 9.2 Scalability Considerations
- Cache duplicate checks (Redis)
- Queue email sending (background tasks)
- Database write optimization for compliance records
- Connection pooling
- Read replicas for duplicate checks

---

## 10. Monitoring & Alerting

### 10.1 Metrics to Track
- Registration success rate
- Email verification rate
- Bounce rate (incomplete form)
- CAPTCHA success rate
- Email delivery success rate
- Trial initiation count

### 10.2 Alerts
- Alert if registration error rate > 5%
- Alert if email delivery failure rate > 2%
- Alert if CAPTCHA success rate < 80%
- Alert if unusual registration spike
- Alert if trial not initialized

---

## 11. Documentation Requirements

### 11.1 For Developers
- API endpoint documentation (OpenAPI)
- Database schema documentation
- Default provisioning process
- Email template specifications
- CAPTCHA integration guide
- Rate limiting configuration

### 11.2 For Users
- Registration step-by-step guide
- Business type selection guide
- Password requirements
- What happens after registration
- Email verification troubleshooting
- Trial period explanation

---

## 12. Future Enhancements

- Company logo upload during registration
- Industry-specific onboarding templates
- Advanced business information collection
- Payment method setup during registration
- Early access beta features
- Referral program integration
- Partner/reseller registration flow
