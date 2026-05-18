# Task 01.02.07 — Build Forgot Password Flow

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.07 |
| Title | Build Forgot Password Flow |
| Depends On | Task 01.02.01 — CustomUser model · Task 01.02.02 — Django auth configured |
| Working Directory | `backend/` (Steps 1–5) · `frontend/` (Steps 6–9) |
| Stack | Django · Python · Next.js · React Hook Form · Zod |
| Estimated Effort | 75 minutes |

---

## Objective

Implement a complete forgot-password and reset-password flow for LankaCommerce:

1. A Django `PasswordResetToken` model stores one-time use tokens with an expiry time
2. `ForgotPasswordView` generates a token and sends a reset email (always returns success regardless of whether the email exists, preventing user enumeration)
3. `ResetPasswordView` validates the token, enforces expiry, hashes the new password, increments `session_version` to invalidate existing sessions, and deletes the used token
4. Two frontend pages: `/forgot-password` and `/reset-password` with LankaCommerce navy/orange styling and clear user feedback at each step

---

## Instructions

### Step 1 — Add the PasswordResetToken Model

Open `backend/apps/accounts/models.py`. Add the `PasswordResetToken` model after the `AuditLog` model:

```python
class PasswordResetToken(models.Model):
    """
    One-time password reset token.

    Generated when a user requests a password reset. Valid for 1 hour.
    Deleted after use (single-use only).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        help_text="The user this reset token belongs to.",
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Cryptographically random token (64 hex characters = 32 bytes of entropy).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="Token is invalid after this timestamp.",
    )
    used = models.BooleanField(
        default=False,
        help_text="True if this token has already been consumed.",
    )

    class Meta:
        db_table = "accounts_passwordresettoken"
        ordering = ["-created_at"]
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"

    def __str__(self) -> str:
        return f"PasswordResetToken for {self.user.email} (expires {self.expires_at})"

    @property
    def is_valid(self) -> bool:
        """Returns True if the token has not been used and has not expired."""
        from django.utils import timezone
        return not self.used and self.expires_at > timezone.now()
```

Run the migration:

```bash
cd backend
poetry run python manage.py makemigrations accounts --name add_password_reset_token
poetry run python manage.py migrate
```

---

### Step 2 — Configure Django Email Backend

Open `backend/config/settings/development.py` and add the console email backend for local development:

```python
# Email — console backend for development (prints emails to terminal)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_FROM = "noreply@lankacommerce.dev"
```

In `backend/config/settings/base.py`, add shared email settings:

```python
# Email (overridden per environment)
EMAIL_FROM = "noreply@lankacommerce.dev"
PASSWORD_RESET_TIMEOUT_HOURS = 1
```

For production (`backend/config/settings/production.py`), configure an SMTP backend:

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_FROM = env("EMAIL_FROM", default="noreply@lankacommerce.dev")
```

Add the production email variables to `backend/.env.example`:

```dotenv
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@lankacommerce.dev
```

---

### Step 3 — Add Password Reset Serializers

Open `backend/apps/accounts/serializers.py` and add the following serializers:

```python
class ForgotPasswordSerializer(serializers.Serializer):
    """Accepts an email address to initiate the password reset flow."""
    email = serializers.EmailField(
        help_text="The email address associated with the account."
    )


class ResetPasswordSerializer(serializers.Serializer):
    """Accepts the reset token + new password to complete the reset."""
    token = serializers.CharField(
        max_length=64,
        help_text="The password reset token from the email link.",
    )
    new_password = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="The new password (minimum 8 characters).",
    )
    confirm_password = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="Must match new_password.",
    )

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs
```

---

### Step 4 — Create the Forgot/Reset Password Views

Open `backend/apps/accounts/views.py`. Add the following imports and views:

```python
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordResetToken
from .serializers import ForgotPasswordSerializer, ResetPasswordSerializer
```

Add the views after `SetPINView`:

```python
class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/

    Accepts { email } and sends a password reset email.
    ALWAYS returns 200 regardless of whether the email exists,
    preventing user enumeration attacks.

    Throttling: ForgotPasswordRateThrottle (configured in Task 01.02.11).
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()

        # Always return success to prevent email enumeration
        success_response = Response(
            {
                "detail": (
                    "If an account with that email exists, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
        except CustomUser.DoesNotExist:
            return success_response

        # Invalidate any existing unused tokens for this user
        PasswordResetToken.objects.filter(user=user, used=False).delete()

        # Generate a new token
        raw_token = secrets.token_hex(32)  # 64 hex chars = 256 bits of entropy
        expires_at = timezone.now() + timedelta(
            hours=getattr(settings, "PASSWORD_RESET_TIMEOUT_HOURS", 1)
        )

        PasswordResetToken.objects.create(
            user=user,
            token=raw_token,
            expires_at=expires_at,
        )

        # Build the reset URL (frontend URL)
        frontend_base_url = getattr(
            settings, "FRONTEND_BASE_URL", "http://localhost:3000"
        )
        reset_url = f"{frontend_base_url}/reset-password?token={raw_token}"

        # Send reset email
        send_mail(
            subject="LankaCommerce — Reset Your Password",
            message=(
                f"Hi,\n\n"
                f"You requested a password reset for your LankaCommerce account.\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                f"This link expires in {getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 1)} hour(s).\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"— LankaCommerce Team"
            ),
            from_email=getattr(settings, "EMAIL_FROM", "noreply@lankacommerce.dev"),
            recipient_list=[user.email],
            fail_silently=True,  # Don't raise errors — user still gets the 200 response
        )

        return success_response


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/

    Accepts { token, new_password, confirm_password } and resets the user's password.
    Increments session_version to invalidate all existing sessions.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        # Find the token
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(
                token=token_value,
                used=False,
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"detail": "This reset link is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check expiry
        if not reset_token.is_valid:
            return Response(
                {"detail": "This reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user

        # Update password and invalidate all sessions
        user.set_password(new_password)
        user.session_version += 1  # Invalidates all outstanding JWT tokens
        user.save(update_fields=["password", "session_version", "updated_at"])

        # Mark token as used (then delete it)
        reset_token.delete()  # Delete rather than mark used — cleaner

        # Audit logging is added in Task 01.02.10

        return Response(
            {"detail": "Your password has been reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )
```

Add the settings variable `FRONTEND_BASE_URL` to `backend/config/settings/development.py`:

```python
FRONTEND_BASE_URL = "http://localhost:3000"
```

---

### Step 5 — Add Password Reset URL Patterns

Open `backend/apps/accounts/urls.py` and add the new routes:

```python
from .views import (
    CurrentUserView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    PINLoginView,
    ResetPasswordView,
    SetPINView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("pin/", PINLoginView.as_view(), name="pin_login"),
    path("pin/set/", SetPINView.as_view(), name="pin_set"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),  # <-- Add
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),     # <-- Add
]
```

---

### Step 6 — Create the Forgot Password Page

Create `frontend/src/app/(auth)/forgot-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok && res.status !== 200) {
        throw new Error("Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
            Reset Password
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "#64748B" }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          /* Success state */
          <div
            className="rounded-lg px-4 py-4 text-sm text-center"
            style={{ backgroundColor: "#F0FDF4", color: "#22C55E" }}
          >
            <p className="font-semibold mb-1">Check your inbox</p>
            <p style={{ color: "#64748B" }}>
              If an account with that email exists, a reset link has been sent.
              The link is valid for 1 hour.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
              >
                {error}
              </div>
            )}

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
                {...register("email")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: errors.email ? "#EF4444" : "#E2E8F0" }}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#F97316" }}
            >
              {isLoading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
          <a href="/login" className="font-medium hover:underline" style={{ color: "#F97316" }}>
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

### Step 7 — Create the Reset Password Page

Create `frontend/src/app/(auth)/reset-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Please confirm your password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0] text-center">
          <p style={{ color: "#EF4444" }}>
            Invalid reset link. Please request a new password reset.
          </p>
          <a
            href="/forgot-password"
            className="mt-4 inline-block font-medium hover:underline"
            style={{ color: "#F97316" }}
          >
            Request new link
          </a>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: data.new_password,
          confirm_password: data.confirm_password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.detail ?? "Password reset failed.");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
            Set New Password
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Choose a strong password for your account.
          </p>
        </div>

        {success ? (
          <div
            className="rounded-lg px-4 py-4 text-sm text-center"
            style={{ backgroundColor: "#F0FDF4", color: "#22C55E" }}
          >
            <p className="font-semibold mb-1">Password updated!</p>
            <p style={{ color: "#64748B" }}>
              Redirecting you to the login page…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            {serverError && (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
              >
                {serverError}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="new_password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                New password
              </label>
              <input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...register("new_password")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: errors.new_password ? "#EF4444" : "#E2E8F0" }}
                disabled={isLoading}
              />
              {errors.new_password && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.new_password.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register("confirm_password")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: errors.confirm_password ? "#EF4444" : "#E2E8F0" }}
                disabled={isLoading}
              />
              {errors.confirm_password && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#F97316" }}
            >
              {isLoading ? "Updating…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

---

### Step 8 — Register PasswordResetToken in Admin

Open `backend/apps/accounts/admin.py` and register the new model:

```python
from .models import AuditLog, CustomUser, PasswordResetToken

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "used")
    list_filter = ("used",)
    readonly_fields = ("id", "user", "token", "created_at", "expires_at", "used")
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False  # Tokens are only created via the ForgotPasswordView
```

---

### Step 9 — End-to-End Test

Test the full flow with both servers running:

1. Navigate to `http://localhost:3000/forgot-password`
2. Enter the email of a seeded user
3. Check the Django terminal (console email backend) for the printed reset link
4. Copy the `token` value from the link
5. Navigate to `http://localhost:3000/reset-password?token=<TOKEN>`
6. Enter a new password (minimum 8 characters)
7. Confirm the success message appears and the redirect to `/login` occurs
8. Log in with the new password — confirm it works
9. Try logging in with the old password — confirm it fails

---

## Expected Output

```
backend/
  apps/
    accounts/
      migrations/
        0003_add_password_reset_token.py
      models.py           ← PasswordResetToken model added
      serializers.py      ← ForgotPasswordSerializer, ResetPasswordSerializer
      views.py            ← ForgotPasswordView, ResetPasswordView
      urls.py             ← /forgot-password/ and /reset-password/ added
      admin.py            ← PasswordResetTokenAdmin registered
  config/
    settings/
      development.py      ← EMAIL_BACKEND, FRONTEND_BASE_URL

frontend/
  src/
    app/
      (auth)/
        forgot-password/
          page.tsx        ← Email input + success confirmation
        reset-password/
          page.tsx        ← New password form with token validation
```

---

## Validation

- [ ] `PasswordResetToken` model has UUID PK, FK to CustomUser, unique `token`, `expires_at`, `used` fields
- [ ] Migration for `PasswordResetToken` was created and applied without errors
- [ ] `ForgotPasswordView` always returns HTTP 200 regardless of email existence
- [ ] `ForgotPasswordView` generates a `secrets.token_hex(32)` token (64 hex characters)
- [ ] `ForgotPasswordView` invalidates existing unused tokens before creating a new one
- [ ] `ForgotPasswordView` sends an email with the reset URL to the user
- [ ] Email uses `EMAIL_BACKEND = console` in development (visible in Django terminal output)
- [ ] `ResetPasswordView` returns 400 for an invalid or already-used token
- [ ] `ResetPasswordView` returns 400 for an expired token
- [ ] `ResetPasswordView` hashes the new password with `user.set_password()`
- [ ] `ResetPasswordView` increments `user.session_version` on success
- [ ] `ResetPasswordView` deletes the token after use
- [ ] `/forgot-password` page shows a success state after submission (same message regardless of email existence)
- [ ] `/reset-password` page shows an error for missing token in query string
- [ ] `/reset-password` page shows validation errors for mismatched passwords
- [ ] `/reset-password` page redirects to `/login` after 3 seconds on success
- [ ] All pages use LankaCommerce orange submit buttons and `#F1F5F9` background
- [ ] `PasswordResetToken` is registered in Django admin with `has_add_permission = False`
- [ ] End-to-end test passes: forgot → email → reset → new login succeeds → old login fails

---

## Notes

- The `fail_silently=True` flag on `send_mail()` prevents email backend errors from exposing information to users. Monitor email delivery failures via server logs in production.
- `PasswordResetToken.is_valid` is a computed property — it is not stored in the database. This is intentional since validity depends on the current time.
- Consider adding a management command to clean up expired, unused `PasswordResetToken` records in production. Run it nightly via a cron job: `poetry run python manage.py cleanup_expired_tokens`.
- The 1-hour token lifetime is configurable via `PASSWORD_RESET_TIMEOUT_HOURS` in settings. For highly sensitive deployments, reduce to 30 minutes.
- Resetting a password increments `session_version`. Once the user's current access token expires (within 15 minutes), they will be unable to refresh — ensuring complete session invalidation after a password reset.
