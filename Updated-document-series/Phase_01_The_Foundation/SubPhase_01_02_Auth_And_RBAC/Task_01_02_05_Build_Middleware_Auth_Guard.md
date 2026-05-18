# Task 01.02.05 — Build Middleware Auth Guard

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.05 |
| Title | Build Middleware Auth Guard |
| Depends On | Task 01.02.03 — Login page + httpOnly cookie setup · Task 01.02.02 — Django JWT configured |
| Working Directory | `frontend/` |
| Stack | Next.js 15 Middleware · `jose` (edge-compatible JWT library) |
| Estimated Effort | 45 minutes |

---

## Objective

Implement a Next.js middleware layer that protects every route in the application by validating the Django-issued JWT stored in the `access_token` httpOnly cookie. The middleware must:

- Run on the Next.js Edge Runtime (no Node.js APIs available)
- Read the `access_token` cookie using `request.cookies.get()`
- Verify the JWT signature using the `jose` library and the `DJANGO_JWT_SECRET` environment variable
- Extract `role`, `session_version`, and `exp` from the decoded payload
- Redirect unauthenticated requests to `/login`
- Redirect unauthorised requests (wrong role for a route) to a 403 page or back to the root of their permitted area
- Pass role information to page components via request headers (`x-user-role`, `x-user-id`, `x-tenant-id`)
- Skip middleware for public routes (`/login`, `/pin-login`, `/forgot-password`, `/reset-password`) and internal Next.js paths

Session version is embedded in the JWT. The primary mechanism for forced logout is token blacklisting (Task 01.02.09) combined with the short 15-minute access token lifetime. The middleware does not make a backend API call on every request.

---

## Instructions

### Step 1 — Install the Edge-Compatible JWT Library

Navigate to the `frontend/` directory and install `jose`:

```bash
cd frontend
pnpm add jose
```

`jose` is a standards-compliant JavaScript JWT library that runs in both Node.js and the Edge Runtime (required for Next.js middleware). It is the recommended alternative to `jsonwebtoken` for edge environments.

---

### Step 2 — Configure the JWT Secret in Frontend Environment

Open `frontend/.env.local` (created in Task 01.02.02) and verify the `DJANGO_JWT_SECRET` variable is set:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
DJANGO_JWT_SECRET=your-django-secret-key-here
```

Replace `your-django-secret-key-here` with the exact value of `DJANGO_SECRET_KEY` from `backend/.env`. Both values **must** match, otherwise JWT verification will fail.

> In production, use a dedicated signing key (`SIMPLE_JWT_SIGNING_KEY`) rather than the Django `SECRET_KEY`. Update both the Django settings and `DJANGO_JWT_SECRET` to use that key.

Also create `frontend/.env.example` if it does not exist:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
DJANGO_JWT_SECRET=your-django-jwt-signing-key
```

---

### Step 3 — Create the Middleware File

Create `frontend/src/middleware.ts`:

```typescript
import { jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const JWT_SECRET = new TextEncoder().encode(
  process.env.DJANGO_JWT_SECRET ?? ""
);

/** Routes that do not require authentication. */
const PUBLIC_ROUTES = [
  "/login",
  "/pin-login",
  "/forgot-password",
  "/reset-password",
];

/** Routes that require SUPER_ADMIN role. */
const SUPERADMIN_ROUTES = ["/superadmin"];

/** Roles allowed in the main store application. */
const STORE_ROLES = ["OWNER", "MANAGER", "CASHIER", "STOCK_CLERK"];

/** Routes within the store that only management roles can access. */
const MANAGEMENT_ONLY_ROUTES = [
  "/store/settings",
  "/store/reports",
  "/store/staff",
];

/** Routes within the store restricted from CASHIER role. */
const NON_CASHIER_ROUTES = ["/store/stock"];

/** Routes within the store restricted from STOCK_CLERK role. */
const NON_STOCKCLERK_ROUTES = ["/store/pos"];

// ---------------------------------------------------------------------------
// JWT payload type (mirrors Django CustomTokenObtainPairSerializer claims)
// ---------------------------------------------------------------------------

interface LankaCommerceJWTPayload extends JWTPayload {
  user_id: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "MANAGER" | "CASHIER" | "STOCK_CLERK";
  permissions: string[];
  tenant_id: string | null;
  session_version: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isSuperAdminRoute(pathname: string): boolean {
  return SUPERADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

function isManagementOnlyRoute(pathname: string): boolean {
  return MANAGEMENT_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

function isNonCashierRoute(pathname: string): boolean {
  return NON_CASHIER_ROUTES.some((route) => pathname.startsWith(route));
}

function isNonStockClerkRoute(pathname: string): boolean {
  return NON_STOCKCLERK_ROUTES.some((route) => pathname.startsWith(route));
}

// ---------------------------------------------------------------------------
// Main middleware function
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Read access token from httpOnly cookie
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    // No token — redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify JWT signature and extract payload
  let payload: LankaCommerceJWTPayload;

  try {
    const { payload: verified } = await jwtVerify(accessToken, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    payload = verified as LankaCommerceJWTPayload;
  } catch (error) {
    // Token is invalid or expired
    // Attempt to redirect to a refresh flow if a refresh token exists
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (refreshToken) {
      // Redirect to a refresh page that will attempt to get a new access token
      const refreshUrl = new URL("/api/auth/refresh-session", request.url);
      refreshUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(refreshUrl);
    }

    // No refresh token either — redirect to login with sessionExpired flag
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  const { role } = payload;

  // 4. Enforce role-based route access

  // Super admin section — only SUPER_ADMIN
  if (isSuperAdminRoute(pathname) && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/store/dashboard", request.url));
  }

  // Store section — not for SUPER_ADMIN (they go to /superadmin)
  if (pathname.startsWith("/store") && role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
  }

  // Management-only routes (OWNER and MANAGER only)
  if (isManagementOnlyRoute(pathname)) {
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/store/dashboard", request.url));
    }
  }

  // Stock routes — not for CASHIER
  if (isNonCashierRoute(pathname) && role === "CASHIER") {
    return NextResponse.redirect(new URL("/store/pos", request.url));
  }

  // POS routes — not for STOCK_CLERK
  if (isNonStockClerkRoute(pathname) && role === "STOCK_CLERK") {
    return NextResponse.redirect(new URL("/store/stock", request.url));
  }

  // 5. Pass verified user info to page components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.user_id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set(
    "x-tenant-id",
    payload.tenant_id ?? ""
  );
  requestHeaders.set(
    "x-session-version",
    String(payload.session_version)
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ---------------------------------------------------------------------------
// Matcher — determines which routes middleware runs on
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public files (images, fonts, etc.)
     * - /api/         (Next.js API routes — handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
```

---

### Step 4 — Create the Session Refresh API Route

Create `frontend/src/app/api/auth/refresh-session/route.ts`:

```typescript
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * GET /api/auth/refresh-session
 *
 * Attempts to refresh the access token using the refresh_token cookie.
 * On success: sets new access_token cookie and redirects to callbackUrl.
 * On failure: clears cookies and redirects to /login?sessionExpired=true.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/";

  if (!refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const { access, refresh: newRefresh } = await response.json();
    const isProduction = process.env.NODE_ENV === "production";

    // Set new tokens as httpOnly cookies
    const redirectResponse = NextResponse.redirect(
      new URL(callbackUrl, request.url)
    );

    redirectResponse.cookies.set("access_token", access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    if (newRefresh) {
      redirectResponse.cookies.set("refresh_token", newRefresh, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return redirectResponse;
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    const failResponse = NextResponse.redirect(loginUrl);
    failResponse.cookies.delete("access_token");
    failResponse.cookies.delete("refresh_token");
    return failResponse;
  }
}
```

---

### Step 5 — Read User Info from Headers in Server Components

The middleware injects user information into request headers. Server Components can read these headers to get the current user without making an additional API call:

Create `frontend/src/lib/server/auth.ts`:

```typescript
import { headers } from "next/headers";

export interface ServerUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  sessionVersion: number;
}

/**
 * Reads the authenticated user's info from the request headers injected
 * by the Next.js middleware. Only available in Server Components.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  const headerStore = await headers();

  const id = headerStore.get("x-user-id");
  const email = headerStore.get("x-user-email");
  const role = headerStore.get("x-user-role");

  if (!id || !email || !role) return null;

  return {
    id,
    email,
    role,
    tenantId: headerStore.get("x-tenant-id") || null,
    sessionVersion: parseInt(headerStore.get("x-session-version") ?? "1", 10),
  };
}
```

---

### Step 6 — Test Middleware Behaviour

With both servers running, test the following scenarios manually in the browser:

| Test Case | Action | Expected Behaviour |
|---|---|---|
| Unauthenticated access | Navigate to `/store/dashboard` without any cookies | Redirect to `/login` |
| Expired token | Manually set an expired `access_token` cookie | Redirect to `/api/auth/refresh-session` or `/login?sessionExpired=true` |
| Valid SUPER_ADMIN token | Navigate to `/superadmin/dashboard` | Allowed through |
| CASHIER tries `/store/settings` | Log in as CASHIER, navigate to `/store/settings` | Redirect to `/store/dashboard` |
| CASHIER tries `/store/stock` | Log in as CASHIER, navigate to `/store/stock` | Redirect to `/store/pos` |
| STOCK_CLERK tries `/store/pos` | Log in as STOCK_CLERK, navigate to `/store/pos` | Redirect to `/store/stock` |
| SUPER_ADMIN tries `/store/dashboard` | Log in as SUPER_ADMIN, navigate to `/store/dashboard` | Redirect to `/superadmin/dashboard` |
| Public routes | Navigate to `/login`, `/forgot-password` | Always allowed, no token required |

---

### Step 7 — Test Token Refresh Flow

To test the refresh flow:

1. Log in successfully to get both cookies set
2. Open browser DevTools → Application → Cookies
3. Note that `access_token` and `refresh_token` are present but `httpOnly` (not editable via JS)
4. Using the Django shell, verify a test user's access token expires in 15 minutes (you cannot easily test this in development without waiting; instead, temporarily set `ACCESS_TOKEN_LIFETIME = timedelta(seconds=30)` in Django settings for a quick test)
5. After expiry, navigate to a protected page — the middleware should redirect to the refresh endpoint, which calls Django, sets a new `access_token` cookie, and redirects back to the original page

---

## Expected Output

After completing this task:

```
frontend/
  src/
    middleware.ts                           ← Route protection + JWT validation
    app/
      api/
        auth/
          refresh-session/
            route.ts                        ← Token refresh handler
    lib/
      server/
        auth.ts                             ← getServerUser() for Server Components
  .env.local                               ← DJANGO_JWT_SECRET set
  .env.example                             ← DJANGO_JWT_SECRET documented
```

---

## Validation

- [ ] `pnpm add jose` completed without errors
- [ ] `DJANGO_JWT_SECRET` is set in `frontend/.env.local` and matches `DJANGO_SECRET_KEY` in `backend/.env`
- [ ] `frontend/src/middleware.ts` exports a `middleware` function and `config` with a `matcher` array
- [ ] Middleware reads `access_token` from `request.cookies.get()`
- [ ] JWT is verified using `jwtVerify` from `jose` with `HS256` algorithm
- [ ] Invalid/expired token with a valid refresh token redirects to `/api/auth/refresh-session?callbackUrl=<path>`
- [ ] Invalid/expired token with no refresh token redirects to `/login?sessionExpired=true` and clears both cookies
- [ ] `/login`, `/pin-login`, `/forgot-password`, `/reset-password` are accessible without a token
- [ ] `_next/static`, `_next/image`, `favicon.ico`, and static asset paths are excluded from the matcher
- [ ] `/superadmin/**` routes redirect non-SUPER_ADMIN users to `/store/dashboard`
- [ ] SUPER_ADMIN users navigating to `/store/**` are redirected to `/superadmin/dashboard`
- [ ] `/store/settings`, `/store/reports`, `/store/staff` redirect CASHIER and STOCK_CLERK
- [ ] CASHIER navigating to `/store/stock` is redirected to `/store/pos`
- [ ] STOCK_CLERK navigating to `/store/pos` is redirected to `/store/stock`
- [ ] Verified user info (`x-user-id`, `x-user-role`, `x-user-email`, `x-tenant-id`) is set in response headers
- [ ] `getServerUser()` in `frontend/src/lib/server/auth.ts` reads headers and returns a `ServerUser` object
- [ ] `/api/auth/refresh-session` calls `POST /api/auth/token/refresh/` and sets new cookies on success
- [ ] `/api/auth/refresh-session` clears cookies and redirects to `/login?sessionExpired=true` on failure

---

## Notes

- Next.js middleware runs on the **Edge Runtime**. This means you cannot use Node.js-specific modules (`fs`, `path`, `crypto`, etc.). The `jose` library is used specifically because it is edge-compatible.
- The middleware does **not** make a direct call to the Django backend on every request. JWT verification is local (cryptographic check with the shared secret). This keeps latency minimal.
- The `DJANGO_JWT_SECRET` must not be prefixed with `NEXT_PUBLIC_` — it must remain server-side only and never exposed to the browser.
- The `x-user-id` header injected by middleware can be read in any Server Component using `headers()` from `next/headers`. This avoids redundant API calls just to get the current user's role.
- When `ROTATE_REFRESH_TOKENS = True` in Django (set in Task 01.02.02), the `/api/auth/token/refresh/` endpoint returns a new refresh token as well. The refresh session route handles this by updating both cookies.
