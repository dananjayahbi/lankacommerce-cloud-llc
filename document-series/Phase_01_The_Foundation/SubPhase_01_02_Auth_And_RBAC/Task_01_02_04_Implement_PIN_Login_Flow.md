# Task 01.02.04 — Implement PIN Login Flow

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.04 |
| Title | Implement PIN Login Flow |
| Depends On | Task 01.02.02 — Django auth configured · Task 01.02.03 — Login page and auth store built |
| Working Directory | `backend/` (Steps 1–4) · `frontend/` (Steps 5–8) |
| Stack | Django REST Framework · Python bcrypt · Next.js · React |
| Estimated Effort | 60 minutes |

---

## Objective

Implement a fast PIN-based authentication flow for staff who need to quickly switch between or re-authenticate to the LankaCommerce POS terminal. The flow consists of:

1. A Django `PINLoginView` at `POST /api/auth/pin/` that validates email + 4-digit PIN and returns a JWT
2. A Next.js PIN entry page at `/pin-login` and a reusable `PinEntryModal` component
3. The numpad renders with navy background keys and orange active-state dots
4. DRF throttling is applied to the PIN endpoint (configured fully in Task 01.02.11; the throttle class is referenced here)

PIN login is intended for quick re-authentication, not as a replacement for initial password login. Users must first log in with email + password to activate their session; PIN login re-issues a JWT for an already-known user.

---

## Instructions

### Step 1 — Add PIN Hash Support to CustomUser (if not yet done)

Verify that `backend/apps/accounts/models.py` includes the `pin_hash` field on `CustomUser`. This field was defined in Task 01.02.01. If it is present, skip to Step 2.

If it is missing, add it to the model:

```python
pin_hash = models.CharField(
    max_length=128,
    blank=True,
    default="",
    help_text="Hashed PIN for quick login. Empty means PIN is not set.",
)
```

Run a migration to add the field:

```bash
cd backend
poetry run python manage.py makemigrations accounts --name add_pin_hash_to_customuser
poetry run python manage.py migrate
```

---

### Step 2 — Add PIN Serializers

Open `backend/apps/accounts/serializers.py`. Add the following serializers for PIN management and PIN login:

```python
from django.contrib.auth.hashers import check_password, make_password


class PINLoginSerializer(serializers.Serializer):
    """Accepts email + pin for PIN-based authentication."""

    email = serializers.EmailField(
        help_text="The user's email address."
    )
    pin = serializers.CharField(
        min_length=4,
        max_length=8,
        help_text="The user's numeric PIN (4–8 digits).",
    )

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value


class SetPINSerializer(serializers.Serializer):
    """Accepts a new PIN to set for the authenticated user."""

    pin = serializers.CharField(
        min_length=4,
        max_length=8,
        help_text="New PIN (4–8 digits).",
    )
    confirm_pin = serializers.CharField(
        min_length=4,
        max_length=8,
        help_text="Confirm the new PIN.",
    )

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["pin"] != attrs["confirm_pin"]:
            raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
        return attrs
```

---

### Step 3 — Create the PIN Login View

Open `backend/apps/accounts/views.py`. Import the new serializer and add the `PINLoginView` and `SetPINView`:

Add these imports at the top of `views.py`:

```python
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import PINLoginSerializer, SetPINSerializer
```

Add the views after `CurrentUserView`:

```python
class PINLoginView(APIView):
    """
    POST /api/auth/pin/

    Accepts { email, pin } and returns a JWT if the PIN is valid.

    The PIN is stored as a hashed value using Django's make_password().
    An empty pin_hash field means PIN login is not set up for this user.

    Throttling is applied via PINRateThrottle (configured in Task 01.02.11).
    Audit logging is wired in Task 01.02.10.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PINLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower()
        pin = serializer.validated_data["pin"]

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
        except CustomUser.DoesNotExist:
            # Use a constant-time response to prevent user enumeration
            return Response(
                {"detail": "Invalid email or PIN."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if PIN is set
        if not user.pin_hash:
            return Response(
                {"detail": "PIN login is not configured for this account."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verify PIN using Django's password hasher (constant-time comparison)
        if not check_password(pin, user.pin_hash):
            # Audit logging for failed PIN is added in Task 01.02.10
            return Response(
                {"detail": "Invalid email or PIN."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Generate JWT tokens using the custom serializer's get_token logic
        refresh = RefreshToken.for_user(user)
        # Embed custom claims (mirrors CustomTokenObtainPairSerializer.get_token)
        refresh["email"] = user.email
        refresh["role"] = user.role
        refresh["permissions"] = user.permissions_list
        refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        refresh["session_version"] = user.session_version

        # Update last login timestamp
        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at"])

        # Audit logging for successful PIN login is added in Task 01.02.10
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                },
            },
            status=status.HTTP_200_OK,
        )


class SetPINView(APIView):
    """
    POST /api/auth/pin/set/

    Allows an authenticated user to set or update their PIN.
    Requires a valid JWT (IsAuthenticated).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = SetPINSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.pin_hash = make_password(serializer.validated_data["pin"])
        user.save(update_fields=["pin_hash"])

        return Response(
            {"detail": "PIN updated successfully."},
            status=status.HTTP_200_OK,
        )
```

---

### Step 4 — Add PIN URL Patterns

Open `backend/apps/accounts/urls.py` and add the PIN routes:

```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    CurrentUserView,
    LoginView,
    LogoutView,
    PINLoginView,
    SetPINView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("pin/", PINLoginView.as_view(), name="pin_login"),      # <-- Add
    path("pin/set/", SetPINView.as_view(), name="pin_set"),      # <-- Add
]
```

---

### Step 5 — Create the PIN API Utility on Frontend

Open `frontend/src/lib/api/auth.ts` and add the PIN-specific function after the existing exports:

```typescript
/**
 * Authenticates a user using their email and PIN.
 * Calls POST /api/auth/pin/ on the Django backend.
 */
export async function loginWithPin(
  email: string,
  pin: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/pin/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
    credentials: "include",
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "PIN login failed.",
    }));
    // Map 429 separately for the UI to show a distinct rate-limit message
    if (response.status === 429) {
      throw new Error("Too many attempts. Please wait before trying again.");
    }
    throw new Error(error.detail ?? "Invalid email or PIN.");
  }

  return response.json();
}

/**
 * Sets the user's PIN. Requires an authenticated access token.
 */
export async function setUserPin(
  pin: string,
  confirmPin: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/pin/set/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pin, confirm_pin: confirmPin }),
    credentials: "include",
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "Failed to update PIN.",
    }));
    throw new Error(error.detail ?? "Failed to update PIN.");
  }
}
```

---

### Step 6 — Create the PinEntryModal Component

Create `frontend/src/components/auth/PinEntryModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { jwtDecode } from "jwt-decode";

import { loginWithPin, UserPayload } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/authStore";

interface PinEntryModalProps {
  /** Email of the user attempting PIN login */
  email: string;
  /** Called when PIN login succeeds — receives the decoded payload */
  onSuccess: (user: UserPayload) => void;
  /** Called when the user dismisses the modal */
  onClose: () => void;
}

const PIN_LENGTH = 4;

// 3×4 numpad layout (10 digits + backspace + submit)
const NUMPAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["←", "0", "✓"],
];

export function PinEntryModal({ email, onSuccess, onClose }: PinEntryModalProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyPress = (key: string) => {
    setError(null);

    if (key === "←") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "✓") {
      handleSubmit();
      return;
    }

    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + key);
    }
  };

  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH) {
      setError(`PIN must be ${PIN_LENGTH} digits.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginWithPin(email, pin);

      // Set httpOnly cookies
      await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access: response.access,
          refresh: response.refresh,
        }),
      });

      // Decode and store user payload
      const payload = jwtDecode<UserPayload>(response.access);
      setUser({
        user_id: payload.user_id,
        email: payload.email,
        role: payload.role as UserPayload["role"],
        permissions: payload.permissions ?? [],
        tenant_id: payload.tenant_id,
        session_version: payload.session_version,
      });

      onSuccess(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid PIN. Please try again."
      );
      setPin(""); // Clear PIN on failure
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(27, 43, 58, 0.85)" }} // navy 85% opacity
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
        style={{ borderColor: "#E2E8F0", borderWidth: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
            >
              Enter PIN
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
              {email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-medium hover:underline"
            style={{ color: "#64748B" }}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

        {/* PIN dot indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-colors"
              style={{
                backgroundColor: i < pin.length ? "#F97316" : "transparent",
                borderColor: i < pin.length ? "#F97316" : "#E2E8F0",
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p
            className="text-center text-sm mb-4"
            style={{ color: "#EF4444" }}
          >
            {error}
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {NUMPAD_KEYS.flat().map((key) => {
            const isAction = key === "←" || key === "✓";
            const isConfirm = key === "✓";

            return (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={isLoading}
                className="h-14 rounded-xl text-xl font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: isConfirm ? "#F97316" : "#1B2B3A",
                  color: "#FFFFFF",
                  fontFamily: isAction ? "sans-serif" : "JetBrains Mono, monospace",
                }}
              >
                {isLoading && isConfirm ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </span>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 7 — Create the PIN Login Page

Create `frontend/src/app/(auth)/pin-login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PinEntryModal } from "@/components/auth/PinEntryModal";
import type { UserPayload } from "@/lib/api/auth";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
});

type EmailForm = z.infer<typeof emailSchema>;

function getRedirectPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "CASHIER":
      return "/store/pos";
    case "STOCK_CLERK":
      return "/store/stock";
    default:
      return "/store/dashboard";
  }
}

export default function PinLoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const onEmailSubmit = (data: EmailForm) => {
    setSubmittedEmail(data.email);
    setShowModal(true);
  };

  const onPinSuccess = (user: UserPayload) => {
    router.push(getRedirectPath(user.role));
  };

  return (
    <>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "#F97316" }}
            >
              <span className="text-white font-bold text-xl font-mono">LC</span>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
            >
              LankaCommerce
            </h1>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>
              Quick PIN access
            </p>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit(onEmailSubmit)}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Your email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: errors.email ? "#EF4444" : "#E2E8F0", color: "#0F172A" }}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: "#F97316" }}
            >
              Continue with PIN
            </button>
          </form>

          <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
            <a
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "#F97316" }}
            >
              Back to password login
            </a>
          </p>
        </div>
      </div>

      {/* PIN entry modal */}
      {showModal && (
        <PinEntryModal
          email={submittedEmail}
          onSuccess={onPinSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

---

### Step 8 — Test the PIN Login Flow

With both servers running, open `http://localhost:3000/pin-login`.

First, set a PIN for a test user via the Django shell:

```bash
cd backend
poetry run python manage.py shell -c "
from apps.accounts.models import CustomUser
from django.contrib.auth.hashers import make_password
user = CustomUser.objects.get(email='admin@test.com')
user.pin_hash = make_password('1234')
user.save()
print('PIN set for', user.email)
"
```

Then test the following cases:

| Test Case | Input | Expected Result |
|---|---|---|
| No email, click Continue | — | Email validation error |
| Valid email, click Continue | `admin@test.com` | PIN modal opens |
| Wrong PIN | `9999` | Error banner, PIN cleared |
| Correct PIN | `1234` | Modal closes, redirect to role path |
| Cancel modal | Click Cancel | Returns to email form |
| Rate limiting (Task 01.02.11) | 10+ wrong PINs in 15 min | HTTP 429 error message |

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      serializers.py      ← PINLoginSerializer, SetPINSerializer added
      views.py            ← PINLoginView, SetPINView added
      urls.py             ← /pin/ and /pin/set/ paths added

frontend/
  src/
    app/
      (auth)/
        pin-login/
          page.tsx        ← Email entry form + PIN modal trigger
    components/
      auth/
        PinEntryModal.tsx ← 3×4 numpad, dot indicators, navy/orange theme
    lib/
      api/
        auth.ts           ← loginWithPin, setUserPin added
```

---

## Validation

- [ ] `CustomUser` model has `pin_hash` field in the database
- [ ] `PINLoginSerializer` validates numeric-only PIN of 4–8 digits
- [ ] `SetPINSerializer` validates PIN + confirm_pin match
- [ ] `PINLoginView` at `POST /api/auth/pin/` returns 401 for wrong PIN with same error message as missing user (prevents enumeration)
- [ ] `PINLoginView` returns 401 with "PIN login is not configured" if `pin_hash` is empty
- [ ] Successful PIN login returns JWT with all custom claims (role, permissions, tenant_id, session_version)
- [ ] `SetPINView` requires authentication (`IsAuthenticated`)
- [ ] `SetPINView` stores PIN as a hash (not plain text) using `make_password()`
- [ ] `/api/auth/pin/` and `/api/auth/pin/set/` are registered in URL patterns
- [ ] `loginWithPin()` in `frontend/src/lib/api/auth.ts` calls `POST /api/auth/pin/`
- [ ] `PinEntryModal` renders a 3×4 numpad grid
- [ ] Numpad keys have navy (`#1B2B3A`) background and white text
- [ ] Submit (✓) key has orange (`#F97316`) background
- [ ] PIN dot indicators fill with orange when a digit is entered
- [ ] Backspace (←) key removes the last entered digit
- [ ] PIN is cleared on failed attempt
- [ ] Successful PIN login sets tokens in httpOnly cookies and stores user in `authStore`
- [ ] PIN login page at `/pin-login` shows email input then opens `PinEntryModal` on submit
- [ ] "Back to password login" link navigates to `/login`

---

## Notes

- The PIN is validated via Django's `check_password()` which uses a constant-time comparison internally, preventing timing attacks.
- PIN length of 4–8 digits provides a balance between convenience and security. The `PIN_LENGTH = 4` constant in the frontend component controls how many dots are rendered; update it if the backend PIN_LENGTH changes.
- Do not implement PIN reset from the PIN login page — staff who forget their PIN must use the standard password login and reset their PIN from their profile settings.
- DRF throttling for the PIN endpoint is wired in Task 01.02.11. Until that task is done, the PIN endpoint is unthrottled in development.
- The `PinEntryModal` component can also be reused as the screen-unlock mechanism in Task 01.02.08.
