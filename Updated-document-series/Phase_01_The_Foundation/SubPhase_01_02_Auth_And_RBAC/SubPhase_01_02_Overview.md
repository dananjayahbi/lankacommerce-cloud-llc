# SubPhase 01.02 — Authentication, RBAC & Session Management

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| SubPhase | 01.02 |
| Title | Authentication, RBAC & Session Management |
| Depends On | SubPhase 01.01 — Project Setup (Django + Next.js monorepo fully operational) |
| Estimated Tasks | 12 |
| Stack | Django REST Framework + SimpleJWT (backend) · Next.js 15 App Router (frontend) |
| Auth Strategy | JWT-based authentication via Django SimpleJWT |
| Status | Not Started |

---

## Objective

Implement a complete, production-grade authentication and access-control layer for LankaCommerce. This SubPhase covers every aspect of identity management in the Django + Next.js monorepo: data models, JWT issuance, login flows, middleware guards, role-based permissions, password recovery, session invalidation, audit logging, and rate limiting.

By the end of SubPhase 01.02, the system will support:
- Email/password login and PIN login, both returning signed JWT tokens from the Django backend
- Short-lived access tokens (15 min) and long-lived refresh tokens (7 days) managed entirely by SimpleJWT
- Role-based access control enforced at both the Django API layer (DRF permission classes) and the Next.js middleware layer (edge JWT validation)
- Forced logout and session invalidation via token blacklisting + `session_version` increment
- Password reset with expiring tokens stored in PostgreSQL
- Comprehensive audit logging for all auth events
- DRF throttling protecting login, PIN, and password-reset endpoints
- A seeded Super Admin account for bootstrapping the system

---

## Architecture Overview

### Authentication Flow

```
User                  Next.js Frontend              Django Backend
 |                         |                              |
 |-- POST credentials ----->|                              |
 |                         |-- POST /api/auth/login/ ---->|
 |                         |                              |-- Validate credentials
 |                         |                              |-- Generate JWT (access + refresh)
 |                         |                              |-- Embed role, permissions,
 |                         |                              |   tenant_id, session_version
 |                         |<--- {access, refresh} -------|
 |                         |-- Set httpOnly cookies ------>| (or Next.js API route sets cookie)
 |<-- Redirect to app ------|                              |
 |                         |                              |
 |-- Navigate to page ----->|                              |
 |                         |-- Middleware reads cookie --> |
 |                         |-- Decode JWT with jose -----> |
 |                         |-- Check role/expiry --------> |
 |                         |-- Allow or redirect --------> |
```

### JWT Token Payload

Every JWT access token issued by Django contains the following custom claims in addition to the SimpleJWT standard fields (`token_type`, `exp`, `iat`, `jti`):

| Claim | Type | Description |
|---|---|---|
| `user_id` | UUID string | Primary key of the authenticated user |
| `email` | string | User's email address |
| `role` | string | One of: SUPER_ADMIN, OWNER, MANAGER, CASHIER, STOCK_CLERK |
| `permissions` | string[] | Explicit list of permission strings granted to this user |
| `tenant_id` | UUID string | The tenant this user belongs to (null for SUPER_ADMIN) |
| `session_version` | integer | Monotonically-incremented counter for forced logout |

### Django Backend Responsibilities

| Responsibility | Location |
|---|---|
| User and AuditLog models | `backend/apps/accounts/models.py` |
| JWT issuance + custom claims | `backend/apps/accounts/serializers.py` |
| Login, PIN, password reset views | `backend/apps/accounts/views.py` |
| DRF permission classes | `backend/apps/accounts/permissions.py` |
| DRF throttle classes | `backend/apps/accounts/throttling.py` |
| Audit logging service | `backend/apps/accounts/services/audit_service.py` |
| URL routing | `backend/apps/accounts/urls.py` |
| Management commands | `backend/apps/accounts/management/commands/` |

### Next.js Frontend Responsibilities

| Responsibility | Location |
|---|---|
| Auth API utility (calls Django) | `frontend/src/lib/api/auth.ts` |
| Zustand auth store | `frontend/src/stores/authStore.ts` |
| Login page | `frontend/src/app/(auth)/login/page.tsx` |
| PIN entry modal | `frontend/src/components/auth/PinEntryModal.tsx` |
| Next.js middleware guard | `frontend/src/middleware.ts` |
| Permission hook | `frontend/src/hooks/usePermissions.ts` |
| Permission constants | `frontend/src/constants/permissions.ts` |
| Inactivity / screen lock | `frontend/src/hooks/useInactivityTimer.ts` |
| Screen lock overlay | `frontend/src/components/auth/ScreenLockOverlay.tsx` |

---

## Role Hierarchy

LankaCommerce uses five roles. Every role has a fixed, non-overlapping scope:

| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | LankaCommerce platform administrator. Full access to all tenants, billing, and system configuration. Not bound to any tenant. |
| `OWNER` | Tenant-wide | Business owner. Full control over their own store, staff, products, and reports. Cannot access other tenants or platform settings. |
| `MANAGER` | Tenant-wide (restricted) | Store manager. Can manage products, view reports, manage staff below Manager level. Cannot modify billing or delete tenants. |
| `CASHIER` | POS-only | Operates the POS terminal. Can process sales, apply discounts (within limit), and issue receipts. Cannot access admin pages. |
| `STOCK_CLERK` | Inventory-only | Manages stock levels, receives deliveries, runs stock adjustments. Cannot access sales or financial reports. |

### Route Protection Matrix

| Path Prefix | Allowed Roles | Notes |
|---|---|---|
| `/superadmin/**` | SUPER_ADMIN | Platform management section |
| `/store/**` | OWNER, MANAGER, CASHIER, STOCK_CLERK | Main store app |
| `/store/settings/**` | OWNER, MANAGER | Cannot be accessed by CASHIER or STOCK_CLERK |
| `/store/pos/**` | OWNER, MANAGER, CASHIER | Stock clerk excluded |
| `/store/stock/**` | OWNER, MANAGER, STOCK_CLERK | Cashier excluded |
| `/login` | Public | Unauthenticated only |
| `/pin-login` | Public | Unauthenticated only |
| `/forgot-password` | Public | Unauthenticated only |
| `/reset-password` | Public | Unauthenticated only |

---

## Technical Context

### Django Authentication Stack

LankaCommerce uses **Django REST Framework** with **SimpleJWT** for all authentication. There is no NextAuth.js, Prisma adapter, or session-based cookie from Django.

**Key packages in `backend/`:**
- `djangorestframework` — REST API framework
- `djangorestframework-simplejwt` — JWT authentication (access + refresh tokens)
- `django-cors-headers` — Allow Next.js frontend at `localhost:3000` to call the API
- `Pillow` (optional) — Only if avatar uploads are needed

**SimpleJWT configuration (summary):**
- Access token lifetime: **15 minutes**
- Refresh token lifetime: **7 days**
- Rotate refresh tokens on use: **enabled**
- Blacklist after rotation: **enabled** (requires `rest_framework_simplejwt.token_blacklist` in INSTALLED_APPS)
- Algorithm: HS256 (can be upgraded to RS256 in production)
- Custom token serializer: embeds role, permissions, tenant_id, session_version into every issued token

### Password Security

- Django's built-in password hasher (PBKDF2 with SHA256 by default; can be configured to use Argon2 or bcrypt via `PASSWORD_HASHERS` in settings)
- PIN is stored as a separate hashed field using Django's `make_password()` / `check_password()` API — not plain text
- Password reset tokens are generated with `secrets.token_hex(32)` and stored with an expiry time in a `PasswordResetToken` model

### Token Storage on Frontend

| Token | Storage | Reason |
|---|---|---|
| JWT Access Token | `httpOnly` cookie named `access_token` | Inaccessible to JavaScript; protected from XSS |
| JWT Refresh Token | `httpOnly` cookie named `refresh_token` | Same security model |
| User Info (role, email, etc.) | Zustand in-memory store | Decoded from JWT at login; re-hydrated on page load from cookie |

The cookies are set either by:
1. The Django backend directly (using `Set-Cookie` header on the login response, with `SameSite=Strict` and `Secure` in production), or
2. A Next.js API route (`/api/auth/set-token`) that receives the token from the Django response and sets the `httpOnly` cookie server-side — this is the recommended approach since it keeps token handling inside the Next.js server context.

### Session Version & Forced Logout

When an administrator triggers a forced logout for a user:
1. Django increments `session_version` on the user record
2. Django blacklists all outstanding refresh tokens for that user via SimpleJWT's token blacklist
3. The user's current access token expires naturally within 15 minutes (next API call or page navigation will force re-auth)
4. On the next refresh attempt, the blacklisted refresh token returns HTTP 401
5. The Next.js middleware detects the 401, clears cookies, and redirects to `/login?sessionExpired=true`

---

## Task List

| Task | File | Description |
|---|---|---|
| 01.02.01 | `Task_01_02_01_Create_User_And_AuditLog_Models.md` | Define CustomUser and AuditLog Django ORM models |
| 01.02.02 | `Task_01_02_02_Configure_Django_Authentication.md` | Install SimpleJWT, configure DRF, create custom token serializer |
| 01.02.03 | `Task_01_02_03_Build_Login_Page.md` | Build Next.js login page calling Django auth API |
| 01.02.04 | `Task_01_02_04_Implement_PIN_Login_Flow.md` | PIN login — Django view + Next.js PIN entry modal |
| 01.02.05 | `Task_01_02_05_Build_Middleware_Auth_Guard.md` | Next.js middleware using `jose` to validate Django JWT |
| 01.02.06 | `Task_01_02_06_Build_RBAC_Permission_System.md` | DRF permission classes + frontend permission constants and hook |
| 01.02.07 | `Task_01_02_07_Build_Forgot_Password_Flow.md` | Forgot/reset password — Django backend + Next.js pages |
| 01.02.08 | `Task_01_02_08_Implement_Auto_Logout_Screen_Lock.md` | Inactivity timer, screen lock overlay — frontend only |
| 01.02.09 | `Task_01_02_09_Setup_Session_Version_Management.md` | Force logout — Django view + token blacklisting |
| 01.02.10 | `Task_01_02_10_Build_Login_Audit_Trail.md` | Audit service — write AuditLog on auth events |
| 01.02.11 | `Task_01_02_11_Implement_Auth_Rate_Limiting.md` | DRF throttle classes for login, PIN, forgot-password |
| 01.02.12 | `Task_01_02_12_Seed_Super_Admin_Account.md` | Django management command to seed Super Admin |

---

## API Endpoints Introduced in This SubPhase

| Method | Path | Handler | Auth Required |
|---|---|---|---|
| POST | `/api/auth/login/` | `LoginView` | No |
| POST | `/api/auth/pin/` | `PINLoginView` | No |
| POST | `/api/auth/token/refresh/` | `TokenRefreshView` (SimpleJWT) | No |
| POST | `/api/auth/logout/` | `LogoutView` | Yes (refresh token in body) |
| POST | `/api/auth/forgot-password/` | `ForgotPasswordView` | No |
| POST | `/api/auth/reset-password/` | `ResetPasswordView` | No |
| POST | `/api/admin/users/{userId}/force-logout/` | `ForceLogoutView` | Yes (OWNER or SUPER_ADMIN) |
| GET | `/api/auth/me/` | `CurrentUserView` | Yes |

---

## Design Theme Reference

All UI components in this SubPhase use the LankaCommerce design token set:

| Token | Value | Used In |
|---|---|---|
| `navy` | `#1B2B3A` | Sidebar, numpad keys, dark surfaces |
| `orange` | `#F97316` | Primary buttons, submit actions, active PIN dots |
| `orange-dark` | `#EA6C05` | Button hover/active states |
| `surface` | `#FFFFFF` | Card backgrounds, modal backgrounds |
| `background` | `#F1F5F9` | App page background |
| `border` | `#E2E8F0` | Input borders, dividers |
| `danger` | `#EF4444` | Inline form errors, failed auth states |
| `success` | `#22C55E` | Password reset confirmation |
| `info` | `#3B82F6` | Session expired banner |
| `text-primary` | `#0F172A` | Headings, body text |
| `text-muted` | `#64748B` | Subtitles, helper text |

Typography: **Inter** for all UI text. **JetBrains Mono** for code, tokens, or technical identifiers.

---

## Validation Criteria

At the end of SubPhase 01.02, all of the following must be true:

- [ ] Django server starts without errors on `localhost:8000`
- [ ] Next.js dev server starts without errors on `localhost:3000`
- [ ] `POST /api/auth/login/` returns a JWT with role, permissions, tenant_id, session_version claims
- [ ] `POST /api/auth/pin/` returns a JWT when a valid PIN is provided
- [ ] JWT access tokens expire after 15 minutes
- [ ] Token refresh endpoint returns a new access token using a valid refresh token
- [ ] Force logout endpoint increments session_version and blacklists the refresh token
- [ ] Navigating to `/store/**` without a valid JWT cookie redirects to `/login`
- [ ] A CASHIER navigating to `/store/settings` is redirected with a 403 or to an appropriate error page
- [ ] The login page renders with LankaCommerce navy/orange branding
- [ ] PIN entry modal displays a 3×4 numpad with orange active dots
- [ ] Inactivity for 10 minutes locks the screen with the ScreenLockOverlay
- [ ] `POST /api/auth/login/` returns HTTP 429 after 10 failed attempts in 15 minutes
- [ ] Forgot-password flow sends a reset email; reset link is only valid for 1 hour
- [ ] All auth events are recorded in the AuditLog table
- [ ] The seed command creates a Super Admin user at `superadmin@lankacommerce.dev`
- [ ] Django admin interface shows CustomUser and AuditLog in the accounts section

---

## Notes

- The Next.js frontend communicates **directly** with the Django REST API. There are no Next.js API route proxies for data fetching (only for cookie-setting).
- All Django commands must be run from inside the `backend/` directory using `poetry run`.
- All frontend commands must be run from inside the `frontend/` directory using `pnpm`.
- If SubPhase 01.01 used a different app registration approach, confirm that `apps.accounts` is properly registered in `INSTALLED_APPS` before running migrations.
- SimpleJWT token blacklisting requires a migration for the `token_blacklist` app — run `poetry run python manage.py migrate` after adding it to INSTALLED_APPS.
