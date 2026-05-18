# Task 01.02.03 — Build Login Page

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.03 |
| Title | Build Login Page |
| Depends On | Task 01.02.02 — Django auth API live at `POST /api/auth/login/` |
| Working Directory | `frontend/` |
| Stack | Next.js 15 · React Hook Form · Zod · Zustand · Tailwind CSS |
| Estimated Effort | 60 minutes |

---

## Objective

Build the LankaCommerce login page — the primary authentication entry point for all users. The page must:

- Render at `/login` using Next.js App Router conventions (`frontend/src/app/(auth)/login/page.tsx`)
- Use React Hook Form + Zod for client-side validation
- Call the Django `POST /api/auth/login/` endpoint via the `loginUser()` utility from Task 01.02.02
- On success: store user info in the Zustand auth store, set tokens in httpOnly cookies (via a Next.js API route), and redirect based on role
- Display LankaCommerce navy/orange branding (not the previous VelvetPOS theme)
- Show inline validation errors using the `danger` color token (`#EF4444`)
- Show a loading state on the submit button while the request is in-flight
- Display a "session expired" banner when the `?sessionExpired=true` query parameter is present

---

## Instructions

### Step 1 — Install Required Frontend Packages

Navigate to the `frontend/` directory and install the required packages:

```bash
cd frontend
pnpm add react-hook-form zod @hookform/resolvers jwt-decode
```

Verify the installations appear in `frontend/package.json` under `dependencies`.

> `jwt-decode` is used to decode the JWT payload on the client side without verifying the signature. Signature verification happens in the Next.js middleware (Task 01.02.05) using `jose`.

---

### Step 2 — Create the Next.js Cookie-Setting API Route

Before building the login page, create the Next.js API route that receives the JWT from the login page and sets it as an `httpOnly` cookie. This keeps token storage server-side and protects against XSS.

Create `frontend/src/app/api/auth/set-tokens/route.ts`:

```typescript
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/set-tokens
 *
 * Receives { access, refresh } tokens from the client-side login handler
 * and sets them as httpOnly cookies. This prevents JavaScript from accessing
 * the tokens directly (XSS protection).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.access || !body?.refresh) {
    return NextResponse.json(
      { error: "access and refresh tokens are required." },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set("access_token", body.access, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60, // 15 minutes — matches SimpleJWT ACCESS_TOKEN_LIFETIME
    path: "/",
  });

  cookieStore.set("refresh_token", body.refresh, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches SimpleJWT REFRESH_TOKEN_LIFETIME
    path: "/",
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/auth/set-tokens
 *
 * Clears both auth cookies (used on logout).
 */
export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  return NextResponse.json({ success: true });
}
```

---

### Step 3 — Create the Zustand Auth Store

Create `frontend/src/stores/authStore.ts`:

```typescript
import { create } from "zustand";

/**
 * Decoded JWT payload shape — mirrors the Django CustomTokenObtainPairSerializer claims.
 */
export interface UserPayload {
  user_id: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "MANAGER" | "CASHIER" | "STOCK_CLERK";
  permissions: string[];
  tenant_id: string | null;
  session_version: number;
}

interface AuthState {
  user: UserPayload | null;
  setUser: (user: UserPayload) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

---

### Step 4 — Create the Auth Route Group Layout

Create the route group directory and a minimal layout for unauthenticated pages:

```bash
mkdir -p src/app/\(auth\)/login
```

Create `frontend/src/app/(auth)/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LankaCommerce — Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center px-4">
      {children}
    </div>
  );
}
```

---

### Step 5 — Create the Login Page

Create `frontend/src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { jwtDecode } from "jwt-decode";

import { loginUser, UserPayload } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Role-based redirect map
// ---------------------------------------------------------------------------

function getRedirectPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "OWNER":
    case "MANAGER":
      return "/store/dashboard";
    case "CASHIER":
      return "/store/pos";
    case "STOCK_CLERK":
      return "/store/stock";
    default:
      return "/store/dashboard";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("sessionExpired") === "true";

  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsLoading(true);

    try {
      // 1. Call Django login API
      const response = await loginUser(data.email, data.password);

      // 2. Set httpOnly cookies via the Next.js API route
      await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access: response.access,
          refresh: response.refresh,
        }),
      });

      // 3. Decode access token to get user payload
      const payload = jwtDecode<UserPayload>(response.access);

      // 4. Store user info in Zustand
      setUser({
        user_id: payload.user_id,
        email: payload.email,
        role: payload.role as UserPayload["role"],
        permissions: payload.permissions ?? [],
        tenant_id: payload.tenant_id,
        session_version: payload.session_version,
      });

      // 5. Redirect based on role
      router.push(getRedirectPath(payload.role));
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Session expired banner */}
      {sessionExpired && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm text-white"
          style={{ backgroundColor: "#3B82F6" }}
          role="alert"
        >
          Your session has expired. Please sign in again.
        </div>
      )}

      {/* Login card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
          >
            LankaCommerce
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Tenant ERP · Sign in to your account
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
            role="alert"
          >
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0F172A" }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: errors.email ? "#EF4444" : "#E2E8F0",
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = errors.email ? "#EF4444" : "#F97316")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.email ? "#EF4444" : "#E2E8F0")
              }
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "#0F172A" }}
              >
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: "#F97316" }}
              >
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: errors.password ? "#EF4444" : "#E2E8F0",
                color: "#0F172A",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = errors.password ? "#EF4444" : "#F97316")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.password ? "#EF4444" : "#E2E8F0")
              }
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading ? "#EA6C05" : "#F97316",
              fontFamily: "Inter, sans-serif",
            }}
            onMouseEnter={(e) => {
              if (!isLoading)
                (e.target as HTMLButtonElement).style.backgroundColor = "#EA6C05";
            }}
            onMouseLeave={(e) => {
              if (!isLoading)
                (e.target as HTMLButtonElement).style.backgroundColor = "#F97316";
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* PIN login link */}
        <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
          Quick access?{" "}
          <a
            href="/pin-login"
            className="font-medium hover:underline"
            style={{ color: "#F97316" }}
          >
            Use PIN login
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

### Step 6 — Ensure Full Responsiveness

Test the login page at three breakpoints:

| Breakpoint | Expected Behaviour |
|---|---|
| Mobile (< 640px) | Card fills the width with `px-4` padding; all inputs are full-width |
| Tablet (640px–1024px) | Card is centred with `max-w-md` constraint; no overflow |
| Desktop (> 1024px) | Card is centred; background covers full viewport in `#F1F5F9` |

Open the page in the browser and use Chrome DevTools to toggle between device modes. Ensure no horizontal scroll occurs on mobile.

---

### Step 7 — Test the Complete Login Flow

Start both servers:

```bash
# Terminal 1
cd backend && poetry run python manage.py runserver

# Terminal 2
cd frontend && pnpm dev
```

Open `http://localhost:3000/login` and perform the following manual tests:

| Test Case | Input | Expected Result |
|---|---|---|
| Empty form submit | — | Both field errors appear |
| Invalid email format | `notanemail` | Email validation error |
| Wrong credentials | Valid email, wrong password | Server error banner: "Invalid email or password." |
| Correct credentials (SUPER_ADMIN) | Seeded admin email + password | Redirects to `/superadmin/dashboard` |
| Correct credentials (CASHIER) | Cashier email + password | Redirects to `/store/pos` |
| Session expired banner | Navigate to `/login?sessionExpired=true` | Blue info banner appears |

---

## Expected Output

After completing this task:

```
frontend/
  src/
    app/
      (auth)/
        layout.tsx            ← Minimal auth layout (centered card on slate bg)
        login/
          page.tsx            ← Login page with LankaCommerce navy/orange branding
      api/
        auth/
          set-tokens/
            route.ts          ← Next.js API route that sets httpOnly cookies
    stores/
      authStore.ts            ← Zustand store for user payload
    lib/
      api/
        auth.ts               ← loginUser, logoutUser, decodeToken (from Task 01.02.02)
```

---

## Validation

- [ ] `pnpm add react-hook-form zod @hookform/resolvers jwt-decode` completed without errors
- [ ] `frontend/src/app/api/auth/set-tokens/route.ts` sets `access_token` and `refresh_token` as `httpOnly` cookies
- [ ] `DELETE /api/auth/set-tokens` clears both auth cookies
- [ ] `frontend/src/stores/authStore.ts` exports `useAuthStore` with `user`, `setUser`, `clearUser`
- [ ] `UserPayload` type includes `user_id`, `email`, `role`, `permissions`, `tenant_id`, `session_version`
- [ ] `(auth)/layout.tsx` renders a full-screen `#F1F5F9` background with centred content
- [ ] Login page has the "LankaCommerce" heading with `#0F172A` text and `Inter` font
- [ ] Logo mark is an orange (`#F97316`) square with "LC" in white
- [ ] Subtitle reads "Tenant ERP · Sign in to your account" in `#64748B`
- [ ] Email field has orange focus ring (`#F97316`)
- [ ] Password field has "Forgot password?" link in orange
- [ ] Submit button is orange (`#F97316`) with `#EA6C05` hover state
- [ ] Button shows spinner + "Signing in…" while loading
- [ ] Inline validation errors use `#EF4444` (danger) colour
- [ ] Server errors display in a red-tinted banner above the form
- [ ] Session expired banner uses `#3B82F6` (info) background on `?sessionExpired=true`
- [ ] On successful login, tokens are stored in httpOnly cookies
- [ ] On successful login, user payload is set in `useAuthStore`
- [ ] SUPER_ADMIN redirects to `/superadmin/dashboard`
- [ ] CASHIER redirects to `/store/pos`
- [ ] STOCK_CLERK redirects to `/store/stock`
- [ ] Page is responsive at mobile, tablet, and desktop breakpoints

---

## Notes

- The login page is a Client Component (`"use client"`) because it uses React hooks and handles user interaction. The layout is a Server Component.
- The `set-tokens` API route uses Next.js 15 `await cookies()` — ensure you are on Next.js 15+.
- In production, always set `secure: true` on the cookie options. The `isProduction` check in the route handles this automatically.
- The `jwtDecode` function from the `jwt-decode` package does **not** verify the signature. It is used only for reading the payload on the client. The signature is verified in the Next.js middleware (Task 01.02.05) and by Django on every API request.
- PIN login is implemented in Task 01.02.04. The link to `/pin-login` at the bottom of the card will 404 until that task is complete.
