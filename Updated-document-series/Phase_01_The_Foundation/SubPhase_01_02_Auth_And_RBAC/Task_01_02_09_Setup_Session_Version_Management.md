# Task 01.02.09 — Setup Session Version Management

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.09 |
| Title | Setup Session Version Management |
| Depends On | Task 01.02.01 — session_version on CustomUser · Task 01.02.02 — SimpleJWT token blacklist configured |
| Working Directory | `backend/` (Steps 1–5) · `frontend/` (Step 6) |
| Stack | Django REST Framework · SimpleJWT · Next.js |
| Estimated Effort | 45 minutes |

---

## Objective

Implement forced logout and session invalidation for LankaCommerce administrators. This allows OWNER or SUPER_ADMIN users to immediately terminate another user's active session — for example, when a staff member is dismissed or their account is compromised.

### How Session Invalidation Works in LankaCommerce

The Django + SimpleJWT approach is:

1. `session_version` is a monotonically incrementing integer stored on `CustomUser`
2. Every JWT access token contains the `session_version` at the time of issuance
3. When an administrator forces logout for a user:
   - Django increments `session_version` in the database
   - Django blacklists **all outstanding refresh tokens** for that user using SimpleJWT's token blacklist
4. The user's current **access token** continues to work until its 15-minute natural expiry (this is acceptable — the window is very small)
5. On the next refresh attempt, the blacklisted refresh token returns HTTP 401
6. The Next.js middleware detects the 401 from the refresh endpoint, clears the auth cookies, and redirects to `/login?sessionExpired=true`

This approach avoids per-request database calls in the middleware (which would add latency to every page navigation) while still providing near-immediate session invalidation.

---

## Instructions

### Step 1 — Add ForceLogout Serializer

Open `backend/apps/accounts/serializers.py` and add the serializer:

```python
class ForceLogoutSerializer(serializers.Serializer):
    """Request body for the force-logout endpoint."""
    reason = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional reason for the forced logout (stored in AuditLog).",
    )
```

---

### Step 2 — Create the ForceLogoutView

Open `backend/apps/accounts/views.py`. Add the required imports:

```python
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
```

Add the `ForceLogoutView` after `ResetPasswordView`:

```python
class ForceLogoutView(APIView):
    """
    POST /api/admin/users/{user_id}/force-logout/

    Forces logout for the specified user by:
    1. Incrementing their session_version (embeds in future JWT tokens)
    2. Blacklisting all outstanding refresh tokens for that user

    Required role: OWNER or SUPER_ADMIN.
    """

    permission_classes = [IsAuthenticated, IsOwnerOrAbove]

    def post(self, request, user_id: str, *args, **kwargs):
        from .permissions import IsOwnerOrAbove
        from .serializers import ForceLogoutSerializer

        serializer = ForceLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")

        # Fetch the target user
        try:
            import uuid as _uuid
            target_user = CustomUser.objects.get(id=_uuid.UUID(user_id))
        except (CustomUser.DoesNotExist, ValueError):
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prevent self-force-logout (a SUPER_ADMIN cannot force-logout themselves
        # via this endpoint — they should use the normal logout instead)
        if target_user.id == request.user.id:
            return Response(
                {"detail": "You cannot force-logout yourself via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent OWNER from forcing out SUPER_ADMIN or another OWNER
        if request.user.role == "OWNER" and target_user.role in ("SUPER_ADMIN", "OWNER"):
            return Response(
                {"detail": "You do not have permission to force-logout this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 1. Increment session_version to invalidate future tokens for this user
        old_version = target_user.session_version
        target_user.session_version += 1
        target_user.save(update_fields=["session_version", "updated_at"])

        # 2. Blacklist all outstanding (non-blacklisted) refresh tokens for this user
        outstanding_tokens = OutstandingToken.objects.filter(user=target_user)
        blacklisted_count = 0

        for outstanding_token in outstanding_tokens:
            if not BlacklistedToken.objects.filter(token=outstanding_token).exists():
                BlacklistedToken.objects.create(token=outstanding_token)
                blacklisted_count += 1

        # 3. Write audit log (wired fully in Task 01.02.10)
        # Placeholder — replaced with full audit service call in Task 01.02.10

        return Response(
            {
                "detail": f"User {target_user.email} has been forcefully logged out.",
                "user_id": str(target_user.id),
                "tokens_blacklisted": blacklisted_count,
                "new_session_version": target_user.session_version,
            },
            status=status.HTTP_200_OK,
        )
```

---

### Step 3 — Add Force Logout URL

The force logout endpoint lives under a separate URL namespace (`/api/admin/`) rather than `/api/auth/`. Create `backend/apps/accounts/admin_urls.py`:

```python
from django.urls import path

from .views import ForceLogoutView

# Admin-level user management endpoints
urlpatterns = [
    path(
        "users/<str:user_id>/force-logout/",
        ForceLogoutView.as_view(),
        name="force_logout",
    ),
]
```

Open `backend/config/urls.py` and include the admin URLs:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls", namespace="accounts")),
    path("api/admin/", include("apps.accounts.admin_urls")),  # <-- Add
]
```

---

### Step 4 — Fix the Import in ForceLogoutView

The `IsOwnerOrAbove` and `ForceLogoutSerializer` imports in `ForceLogoutView` should be at the module level, not inside the method. Update `views.py` to add them at the top of the file alongside the existing imports:

Open `backend/apps/accounts/views.py` and ensure these imports are at the top of the file:

```python
from .permissions import IsOwnerOrAbove  # Add this
from .serializers import (
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ForceLogoutSerializer,   # Add this
    LogoutSerializer,
    PINLoginSerializer,
    ResetPasswordSerializer,
    SetPINSerializer,
)
```

Then remove the inline imports from inside the `ForceLogoutView.post()` method.

---

### Step 5 — Test Force Logout via API

With the Django server running, test the force logout endpoint:

```bash
# 1. Log in as OWNER or SUPER_ADMIN to get an admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@test.com", "password": "testpass123"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['access'])")

# 2. Get the target user's UUID from the Django shell
TARGET_USER_ID=$(cd backend && poetry run python manage.py shell -c \
  "from apps.accounts.models import CustomUser; \
   u = CustomUser.objects.get(email='cashier@test.com'); print(u.id)")

# 3. Call the force-logout endpoint
curl -s -X POST "http://localhost:8000/api/admin/users/${TARGET_USER_ID}/force-logout/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"reason": "Test forced logout"}' \
  | python -m json.tool
```

Expected response:
```json
{
  "detail": "User cashier@test.com has been forcefully logged out.",
  "user_id": "...",
  "tokens_blacklisted": 1,
  "new_session_version": 2
}
```

Verify in the Django shell that session_version was incremented:

```bash
cd backend
poetry run python manage.py shell -c "
from apps.accounts.models import CustomUser
user = CustomUser.objects.get(email='cashier@test.com')
print('session_version:', user.session_version)  # Should be 2
"
```

---

### Step 6 — Handle Session Invalidation on Frontend

The Next.js middleware (Task 01.02.05) already handles the case where the refresh token returns 401 — it redirects to `/login?sessionExpired=true`. Verify this flow works end-to-end:

1. Log in as a cashier in one browser window — note the `access_token` and `refresh_token` cookies are set
2. From another window (logged in as OWNER/SUPER_ADMIN), trigger the force logout API call for the cashier
3. In the cashier's browser window, wait for the access token to expire (15 minutes) or navigate to a protected page after the refresh endpoint is called
4. The cashier's browser should be redirected to `/login?sessionExpired=true`

To test this more quickly during development, temporarily reduce the access token lifetime:

```python
# backend/config/settings/development.py — TEMPORARY, revert after testing
SIMPLE_JWT = {
    **SIMPLE_JWT,
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=30),  # 30 seconds for testing
}
```

With a 30-second token lifetime:
1. Log in as cashier → tokens set
2. Force logout cashier from admin
3. Wait 30 seconds
4. Navigate to a protected page in cashier's browser
5. Middleware attempts token refresh → Django returns 401 (refresh token is blacklisted)
6. Middleware redirects to `/login?sessionExpired=true`

> **Remember to revert** `ACCESS_TOKEN_LIFETIME` to `timedelta(minutes=15)` after testing.

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      admin_urls.py         ← /users/<user_id>/force-logout/ URL pattern
      serializers.py        ← ForceLogoutSerializer added
      views.py              ← ForceLogoutView with session_version increment + token blacklisting
  config/
    urls.py                 ← api/admin/ included
```

---

## Validation

- [ ] `ForceLogoutSerializer` accepts an optional `reason` field
- [ ] `ForceLogoutView` requires `IsAuthenticated` and `IsOwnerOrAbove` permission classes
- [ ] `ForceLogoutView` returns 404 for an invalid or non-existent `user_id`
- [ ] `ForceLogoutView` returns 400 if the actor tries to force-logout themselves
- [ ] `ForceLogoutView` returns 403 if an OWNER tries to force-logout a SUPER_ADMIN or another OWNER
- [ ] Successful force logout increments `session_version` on the target user in the database
- [ ] Successful force logout creates `BlacklistedToken` entries for all outstanding refresh tokens of the target user
- [ ] Response includes `tokens_blacklisted` count and `new_session_version`
- [ ] `POST /api/admin/users/{user_id}/force-logout/` is accessible at the correct URL
- [ ] A CASHIER calling this endpoint receives 403 (no permission)
- [ ] After force logout, the target user's refresh token returns 401 from Django
- [ ] Next.js middleware redirects to `/login?sessionExpired=true` after refresh fails
- [ ] `session_version` in the database is incremented by 1 on every force logout call
- [ ] The `rest_framework_simplejwt.token_blacklist` app is in `INSTALLED_APPS` (confirmed in Task 01.02.02)

---

## Notes

- The `OutstandingToken` model from `rest_framework_simplejwt.token_blacklist` only tracks tokens that have been issued since token blacklisting was enabled. If a user's tokens were issued before blacklisting was turned on, they will not appear in `OutstandingToken` and cannot be blacklisted this way. Ensure `token_blacklist` was in `INSTALLED_APPS` before the first token was ever issued.
- Token blacklisting is supplemented by the short 15-minute access token lifetime. Even if the refresh token blacklisting has a small edge case, the access token will expire naturally within 15 minutes.
- The `session_version` increment also ensures that any new tokens issued from a still-valid (non-blacklisted) refresh token will contain the updated `session_version`. Any system that does per-request version checking can detect the mismatch immediately.
- In a high-security scenario, reduce `ACCESS_TOKEN_LIFETIME` to 5 minutes or less for POS terminals, as these are often shared devices.
