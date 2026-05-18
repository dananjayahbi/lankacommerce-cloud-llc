# Task 01.02.08 — Implement Auto Logout Screen Lock

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.08 |
| Title | Implement Auto Logout Screen Lock |
| Depends On | Task 01.02.03 — authStore (Zustand) · Task 01.02.04 — PinEntryModal |
| Working Directory | `frontend/` |
| Stack | Next.js · React · Zustand · TypeScript |
| Estimated Effort | 60 minutes |

---

## Objective

Implement an inactivity-based screen lock for the LankaCommerce store application. After a configurable period of inactivity (default: 10 minutes), the screen locks automatically, displaying a full-screen overlay that requires PIN re-entry before resuming. This protects unattended POS terminals from unauthorized access.

This task is entirely frontend work. There are no Django changes required.

**Key differences from the original VelvetPOS document:**
- User info is read from the Zustand `authStore` (not `useSession` from NextAuth)
- Logout calls `logoutUser()` from `frontend/src/lib/api/auth.ts` (not `signOut` from next-auth)
- Screen lock overlay uses LankaCommerce navy/orange tokens
- "Screen Locked" heading uses Inter font (not Playfair Display)
- Lock overlay background is navy (`#1B2B3A`) at 90% opacity
- PIN dots are orange when filled

---

## Instructions

### Step 1 — Create the UI Store

Create `frontend/src/stores/uiStore.ts` to manage UI-level state including screen lock:

```typescript
import { create } from "zustand";

interface UIState {
  /** True when the screen is locked due to inactivity */
  isScreenLocked: boolean;
  /** Triggers the screen lock overlay */
  lockScreen: () => void;
  /** Releases the screen lock (called after successful PIN entry) */
  unlockScreen: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isScreenLocked: false,
  lockScreen: () => set({ isScreenLocked: true }),
  unlockScreen: () => set({ isScreenLocked: false }),
}));
```

---

### Step 2 — Create the Inactivity Timer Hook

Create `frontend/src/hooks/useInactivityTimer.ts`:

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * Default inactivity timeout: 10 minutes
 */
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Events that reset the inactivity timer.
 * Chosen to cover all meaningful user interactions in a POS environment.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

interface UseInactivityTimerOptions {
  /** Timeout in milliseconds before the screen locks. Default: 10 minutes. */
  timeoutMs?: number;
  /** Whether the timer should be active. Set to false to disable. */
  enabled?: boolean;
}

/**
 * useInactivityTimer — Tracks user inactivity and locks the screen after timeout.
 *
 * Attach this hook to a layout-level component that persists across navigation
 * within the store section (e.g., StoreLayoutClient).
 *
 * Usage:
 *   useInactivityTimer({ timeoutMs: 10 * 60 * 1000, enabled: isAuthenticated });
 */
export function useInactivityTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  enabled = true,
}: UseInactivityTimerOptions = {}) {
  const lockScreen = useUIStore((state) => state.lockScreen);
  const isScreenLocked = useUIStore((state) => state.isScreenLocked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      lockScreen();
    }, timeoutMs);
  }, [lockScreen, timeoutMs]);

  useEffect(() => {
    // Don't start the timer if disabled or already locked
    if (!enabled || isScreenLocked) return;

    // Start the timer initially
    resetTimer();

    // Attach activity listeners
    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [enabled, isScreenLocked, resetTimer]);
}
```

---

### Step 3 — Create the Screen Lock Overlay Component

Create `frontend/src/components/auth/ScreenLockOverlay.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PinEntryModal } from "@/components/auth/PinEntryModal";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { logoutUser } from "@/lib/api/auth";
import type { UserPayload } from "@/lib/api/auth";

export function ScreenLockOverlay() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const unlockScreen = useUIStore((state) => state.unlockScreen);
  const isScreenLocked = useUIStore((state) => state.isScreenLocked);

  const [showPinModal, setShowPinModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isScreenLocked) return null;

  const handlePinSuccess = (_payload: UserPayload) => {
    unlockScreen();
    setShowPinModal(false);
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      // Retrieve tokens from cookies is not directly possible client-side (httpOnly)
      // Call the Next.js API route to clear cookies and call Django logout
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      clearUser();
      unlockScreen();
      router.push("/login");
    }
  };

  return (
    <>
      {/* Full-screen lock overlay */}
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center"
        style={{ backgroundColor: "rgba(27, 43, 58, 0.92)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Screen locked"
      >
        {/* Lock icon */}
        <div className="mb-6">
          <svg
            className="w-16 h-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#F97316"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}
        >
          Screen Locked
        </h1>

        {/* User info */}
        {user && (
          <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
            {user.email}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setShowPinModal(true)}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#F97316" }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = "#EA6C05")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = "#F97316")
            }
          >
            Unlock with PIN
          </button>

          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="text-sm hover:underline disabled:opacity-50"
            style={{ color: "#94A3B8" }}
          >
            {isSigningOut ? "Signing out…" : "Sign out instead"}
          </button>
        </div>

        {/* LankaCommerce branding */}
        <div className="absolute bottom-8 flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white text-xs font-bold">LC</span>
          </div>
          <span className="text-xs" style={{ color: "#475569" }}>
            LankaCommerce
          </span>
        </div>
      </div>

      {/* PIN Entry Modal (rendered above the overlay) */}
      {showPinModal && user && (
        <PinEntryModal
          email={user.email}
          onSuccess={handlePinSuccess}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </>
  );
}
```

---

### Step 4 — Create the Sign-Out API Route

Create `frontend/src/app/api/auth/sign-out/route.ts`:

```typescript
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * POST /api/auth/sign-out
 *
 * Reads the refresh token cookie, calls Django logout to blacklist it,
 * then clears both auth cookies.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const accessToken = cookieStore.get("access_token")?.value;

  // Attempt to blacklist the refresh token on Django
  if (refreshToken && accessToken) {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {
      // Proceed with client-side logout even if the Django call fails
    }
  }

  // Clear auth cookies
  const response = NextResponse.json({ success: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");

  return response;
}
```

---

### Step 5 — Create the Store Layout Client Component

The inactivity timer and screen lock overlay must be integrated into the store section layout. Create `frontend/src/app/(store)/StoreLayoutClient.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

import { ScreenLockOverlay } from "@/components/auth/ScreenLockOverlay";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useAuthStore } from "@/stores/authStore";
import type { UserPayload } from "@/lib/api/auth";

interface StoreLayoutClientProps {
  children: React.ReactNode;
  /** Access token passed from the Server Component layout (read from cookie via headers) */
  accessToken?: string;
}

export function StoreLayoutClient({
  children,
  accessToken,
}: StoreLayoutClientProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Hydrate the auth store on initial mount if the user is not yet set
  // (e.g., after a page refresh where Zustand in-memory state is cleared)
  useEffect(() => {
    if (!user && accessToken) {
      try {
        const payload = jwtDecode<UserPayload>(accessToken);
        setUser({
          user_id: payload.user_id,
          email: payload.email,
          role: payload.role as UserPayload["role"],
          permissions: payload.permissions ?? [],
          tenant_id: payload.tenant_id,
          session_version: payload.session_version,
        });
      } catch {
        // Token could not be decoded — middleware will handle redirection
      }
    }
  }, [user, accessToken, setUser]);

  // Enable inactivity timer when a user is authenticated
  useInactivityTimer({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    enabled: !!user,
  });

  return (
    <>
      {children}
      <ScreenLockOverlay />
    </>
  );
}
```

---

### Step 6 — Create the Store Layout Server Component

Create `frontend/src/app/(store)/layout.tsx`:

```tsx
import { cookies } from "next/headers";
import { StoreLayoutClient } from "./StoreLayoutClient";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the access token server-side to pass to StoreLayoutClient for store hydration
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return (
    <StoreLayoutClient accessToken={accessToken}>
      {children}
    </StoreLayoutClient>
  );
}
```

---

### Step 7 — Test the Screen Lock Behaviour

Start the frontend dev server and test the following scenarios:

| Test Case | Steps | Expected Behaviour |
|---|---|---|
| Inactivity lock | Log in, wait 10 minutes without interaction | Screen lock overlay appears with navy background |
| Quick lock test | Temporarily set `timeoutMs: 5000` (5 seconds) in `StoreLayoutClient` | Lock appears after 5 seconds of inactivity |
| Unlock with PIN | See overlay, click "Unlock with PIN", enter correct PIN | Overlay dismisses, app resumes |
| Wrong PIN on lock | Enter incorrect PIN | Error message, PIN cleared, overlay remains |
| Sign out from lock | Click "Sign out instead" | Tokens cleared, redirect to `/login` |
| Activity resets timer | Move mouse or press a key during the timeout period | Timer resets, lock is delayed |
| Lock screen branding | View the lock overlay | "Screen Locked" heading in Inter font, navy overlay, orange lock icon and button |
| Lock persists navigation | Navigate between pages | `isScreenLocked` state persists (Zustand) |

---

## Expected Output

After completing this task:

```
frontend/
  src/
    stores/
      uiStore.ts                          ← isScreenLocked, lockScreen, unlockScreen
    hooks/
      useInactivityTimer.ts               ← Activity event listeners + timeout
    components/
      auth/
        ScreenLockOverlay.tsx             ← Full-screen lock overlay with PIN modal
    app/
      (store)/
        layout.tsx                        ← Server Component reads access_token cookie
        StoreLayoutClient.tsx             ← Client Component: timer + overlay integration
      api/
        auth/
          sign-out/
            route.ts                      ← Calls Django logout + clears cookies
```

---

## Validation

- [ ] `uiStore.ts` exports `useUIStore` with `isScreenLocked`, `lockScreen`, `unlockScreen`
- [ ] `useInactivityTimer` accepts `timeoutMs` and `enabled` options
- [ ] `useInactivityTimer` attaches listeners for `mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`, `click`
- [ ] `useInactivityTimer` calls `lockScreen()` after the specified timeout of inactivity
- [ ] `useInactivityTimer` resets the timer on every activity event
- [ ] `useInactivityTimer` does not start the timer when `enabled = false`
- [ ] `useInactivityTimer` does not reset the timer when `isScreenLocked = true`
- [ ] `ScreenLockOverlay` renders only when `isScreenLocked = true`
- [ ] Overlay background is navy (`rgba(27, 43, 58, 0.92)`)
- [ ] "Screen Locked" heading uses white text and Inter font
- [ ] Lock icon is orange (`#F97316`)
- [ ] "Unlock with PIN" button is orange (`#F97316`) with `#EA6C05` hover
- [ ] Overlay shows the logged-in user's email
- [ ] "Unlock with PIN" opens the `PinEntryModal`
- [ ] Successful PIN entry calls `unlockScreen()` and closes the modal
- [ ] "Sign out instead" calls `POST /api/auth/sign-out` then redirects to `/login`
- [ ] `/api/auth/sign-out` route calls Django logout endpoint with the access token
- [ ] `/api/auth/sign-out` route deletes both `access_token` and `refresh_token` cookies
- [ ] `StoreLayoutClient` hydrates `authStore` from the access token on initial render
- [ ] `StoreLayoutClient` renders `<ScreenLockOverlay />` as a sibling to `children`
- [ ] `(store)/layout.tsx` passes the `access_token` cookie value to `StoreLayoutClient`

---

## Notes

- The inactivity timer uses `window` event listeners directly rather than a library. This is intentional to keep the dependency footprint minimal.
- Zustand state is in-memory and lost on page refresh. The `StoreLayoutClient` re-hydrates the auth store from the access token cookie on every fresh page load.
- The `PinEntryModal` component built in Task 01.02.04 is reused here for the screen unlock. This is the intended reuse pattern.
- The lock screen persists across client-side navigation because `StoreLayoutClient` stays mounted. It does not persist across hard reloads (the timer starts fresh from the new page load).
- The 10-minute inactivity timeout is configurable. Consider making it a per-tenant setting in a later SubPhase (e.g., store owners might want a shorter timeout on shared POS terminals).
