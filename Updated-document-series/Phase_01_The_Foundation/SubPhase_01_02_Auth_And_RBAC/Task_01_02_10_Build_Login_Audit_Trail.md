# Task 01.02.10 — Build Login Audit Trail

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.10 |
| Title | Build Login Audit Trail |
| Depends On | Task 01.02.01 — AuditLog model · Task 01.02.02 — LoginView · Task 01.02.04 — PINLoginView |
| Working Directory | `backend/` |
| Stack | Django · Python |
| Estimated Effort | 30 minutes |

---

## Objective

Create a structured audit logging service that captures all authentication events in the `AuditLog` model. Every login attempt, PIN login, logout, password reset, and forced logout must produce an immutable audit record containing who did what, from where, and when.

This task wires the audit service into all auth views created in previous tasks. There are no frontend changes in this task.

---

## Instructions

### Step 1 — Define Auth Action Constants

Create `backend/apps/accounts/services/__init__.py`:

```bash
mkdir -p backend/apps/accounts/services
touch backend/apps/accounts/services/__init__.py
```

Create `backend/apps/accounts/services/audit_service.py`:

```python
"""
LankaCommerce Audit Logging Service

Provides a structured interface for writing AuditLog records for all
significant auth and system events. All functions are non-blocking:
exceptions are caught and logged to Django's logging framework rather
than propagated to the caller.

Usage:
    from apps.accounts.services.audit_service import audit_service, AUTH_ACTIONS

    audit_service.log(
        action=AUTH_ACTIONS.LOGIN_SUCCESS,
        actor=request.user,
        request=request,
        entity_type="User",
        entity_id=request.user.id,
    )
"""

import logging
from typing import Any
from uuid import UUID

from django.http import HttpRequest

from apps.accounts.models import AuditLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Auth Action Constants
# ---------------------------------------------------------------------------

class AUTH_ACTIONS:
    # Login
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_INACTIVE_ACCOUNT = "LOGIN_INACTIVE_ACCOUNT"

    # PIN
    PIN_LOGIN_SUCCESS = "PIN_LOGIN_SUCCESS"
    PIN_LOGIN_FAILED = "PIN_LOGIN_FAILED"
    PIN_NOT_CONFIGURED = "PIN_NOT_CONFIGURED"
    PIN_SET = "PIN_SET"
    PIN_UPDATED = "PIN_UPDATED"

    # Session
    LOGOUT = "LOGOUT"
    FORCE_LOGOUT = "FORCE_LOGOUT"
    SESSION_EXPIRED = "SESSION_EXPIRED"

    # Password
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS"
    PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Account
    ACCOUNT_CREATED = "ACCOUNT_CREATED"
    ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED"
    ACCOUNT_REACTIVATED = "ACCOUNT_REACTIVATED"
    ROLE_CHANGED = "ROLE_CHANGED"
    PERMISSIONS_UPDATED = "PERMISSIONS_UPDATED"


# ---------------------------------------------------------------------------
# IP / User-Agent Helpers
# ---------------------------------------------------------------------------

def get_client_ip(request: HttpRequest) -> str | None:
    """
    Extracts the client IP address from the request.

    Checks X-Forwarded-For first (for reverse proxy setups),
    then falls back to REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # X-Forwarded-For can contain a chain: "client, proxy1, proxy2"
        # Take only the first (original client) IP
        ip = x_forwarded_for.split(",")[0].strip()
        return ip if ip else None
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request: HttpRequest) -> str:
    """Extracts the User-Agent header from the request."""
    return request.META.get("HTTP_USER_AGENT", "")


# ---------------------------------------------------------------------------
# Audit Service
# ---------------------------------------------------------------------------

class AuditService:
    """
    Non-blocking audit logging service.

    All methods wrap AuditLog.objects.create() in a try-except so that
    audit failures never cause API errors for the end user.
    """

    def log(
        self,
        *,
        action: str,
        actor=None,
        request: HttpRequest | None = None,
        entity_type: str = "User",
        entity_id: UUID | str | None = None,
        tenant_id: UUID | str | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str = "",
    ) -> AuditLog | None:
        """
        Creates an AuditLog record.

        Parameters
        ----------
        action : str
            Action constant from AUTH_ACTIONS or any string label.
        actor : CustomUser | None
            The user performing the action. May be None for unauthenticated events.
        request : HttpRequest | None
            The Django request object (used to extract IP and User-Agent).
        entity_type : str
            Type of entity affected, e.g. "User", "Product".
        entity_id : UUID | str | None
            ID of the specific entity.
        tenant_id : UUID | str | None
            Tenant context. Inferred from actor.tenant_id if not provided.
        before : dict | None
            State before the action (for updates).
        after : dict | None
            State after the action (for creates/updates).
        ip_address : str | None
            Client IP (auto-extracted from request if not provided).
        user_agent : str
            User-Agent string (auto-extracted from request if not provided).
        """
        try:
            # Extract actor info
            actor_id = getattr(actor, "id", None)
            actor_role = getattr(actor, "role", "")

            # Infer tenant_id from actor if not provided
            if tenant_id is None and actor is not None:
                tenant_id = getattr(actor, "tenant_id", None)

            # Extract request metadata if not provided
            if request is not None:
                if ip_address is None:
                    ip_address = get_client_ip(request)
                if not user_agent:
                    user_agent = get_user_agent(request)

            # Convert UUIDs to string form for JSON serialisability
            entity_id_val = str(entity_id) if entity_id else None
            tenant_id_val = str(tenant_id) if tenant_id else None

            log_entry = AuditLog.objects.create(
                actor_id=actor_id,
                actor_role=actor_role,
                tenant_id=tenant_id_val,
                entity_type=entity_type,
                entity_id=entity_id_val,
                action=action,
                before=before,
                after=after,
                ip_address=ip_address,
                user_agent=user_agent or "",
            )
            return log_entry

        except Exception as exc:
            # Never let audit failures surface to the user
            logger.exception(
                "Failed to write AuditLog for action=%s actor=%s: %s",
                action,
                getattr(actor, "email", "anonymous"),
                exc,
            )
            return None

    def log_login_success(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGIN_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
            after={"email": user.email, "role": user.role},
        )

    def log_login_failed(
        self,
        email: str,
        request: HttpRequest,
        reason: str = "Invalid credentials",
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGIN_FAILED,
            actor=None,
            request=request,
            entity_type="User",
            after={"attempted_email": email, "reason": reason},
        )

    def log_pin_login_success(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PIN_LOGIN_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_pin_login_failed(
        self,
        email: str,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PIN_LOGIN_FAILED,
            actor=None,
            request=request,
            entity_type="User",
            after={"attempted_email": email},
        )

    def log_logout(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGOUT,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_force_logout(
        self,
        actor,
        target_user,
        request: HttpRequest,
        reason: str = "",
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.FORCE_LOGOUT,
            actor=actor,
            request=request,
            entity_type="User",
            entity_id=target_user.id,
            tenant_id=getattr(target_user, "tenant_id", None),
            after={
                "target_email": target_user.email,
                "target_role": target_user.role,
                "reason": reason,
            },
        )

    def log_password_reset_requested(
        self,
        user,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_password_reset_success(
        self,
        user,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PASSWORD_RESET_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )


# Module-level singleton instance
audit_service = AuditService()
```

---

### Step 2 — Wire Audit Logging into LoginView

Open `backend/apps/accounts/views.py`. Add the audit service import at the top:

```python
from .services.audit_service import audit_service, AUTH_ACTIONS
```

Update `LoginView.post()` to call the audit service on success and failure:

```python
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        email = request.data.get("email", "").lower().strip()

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            audit_service.log_login_failed(email=email, request=request)
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Update last_login_at
        try:
            user = CustomUser.objects.get(email=email)
            user.last_login_at = timezone.now()
            user.save(update_fields=["last_login_at"])
            audit_service.log_login_success(user=user, request=request)
        except CustomUser.DoesNotExist:
            pass

        return Response(serializer.validated_data, status=status.HTTP_200_OK)
```

---

### Step 3 — Wire Audit Logging into PINLoginView

Update `PINLoginView.post()` in `views.py` to add audit calls at the appropriate points:

In the failure path (wrong PIN), replace the comment placeholder:

```python
# Replace this comment:
# Audit logging for failed PIN login is added in Task 01.02.10
# With:
audit_service.log_pin_login_failed(email=email, request=request)
```

In the success path (after `user.save()`), replace the comment:

```python
# Replace this comment:
# Audit logging for successful PIN login is added in Task 01.02.10
# With:
audit_service.log_pin_login_success(user=user, request=request)
```

---

### Step 4 — Wire Audit Logging into LogoutView

Update `LogoutView.post()` to log the logout event:

```python
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Token is invalid or already blacklisted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Write audit log after successful blacklisting
        audit_service.log_logout(user=request.user, request=request)

        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
```

---

### Step 5 — Wire Audit Logging into ForgotPasswordView and ResetPasswordView

Update `ForgotPasswordView.post()` — after creating the `PasswordResetToken`, add:

```python
# After PasswordResetToken.objects.create(...):
audit_service.log_password_reset_requested(user=user, request=request)
```

Update `ResetPasswordView.post()` — after `reset_token.delete()`, add:

```python
# After reset_token.delete():
audit_service.log_password_reset_success(user=user, request=request)
```

---

### Step 6 — Wire Audit Logging into ForceLogoutView

Update `ForceLogoutView.post()` — replace the comment placeholder with the actual audit call:

```python
# Replace:
# 3. Write audit log (wired fully in Task 01.02.10)
# Placeholder — replaced with full audit service call in Task 01.02.10

# With:
audit_service.log_force_logout(
    actor=request.user,
    target_user=target_user,
    request=request,
    reason=reason,
)
```

---

### Step 7 — Verify Audit Records

Run the Django server and perform a login. Then query the audit log:

```bash
cd backend
poetry run python manage.py shell -c "
from apps.accounts.models import AuditLog
logs = AuditLog.objects.all().order_by('-created_at')[:10]
for log in logs:
    print(f'[{log.created_at}] {log.action} | {log.actor_role} | {log.ip_address} | {log.entity_type}:{log.entity_id}')
"
```

You should see `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, and/or `PIN_LOGIN_SUCCESS` entries depending on what you tested.

Also verify the Django admin audit log view at `http://localhost:8000/admin/accounts/auditlog/` — you should see all audit records with the correct fields populated.

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      services/
        __init__.py
        audit_service.py    ← AUTH_ACTIONS, AuditService class, audit_service singleton
      views.py              ← audit_service.log_*() calls in all auth views
```

---

## Validation

- [ ] `backend/apps/accounts/services/audit_service.py` exists with `AUTH_ACTIONS` constants
- [ ] `AUTH_ACTIONS` includes constants for login, PIN, logout, force logout, password reset
- [ ] `get_client_ip()` reads `HTTP_X_FORWARDED_FOR` first, then falls back to `REMOTE_ADDR`
- [ ] `get_user_agent()` reads `HTTP_USER_AGENT` from request META
- [ ] `AuditService.log()` is wrapped in try-except and never raises exceptions to callers
- [ ] `AuditService.log()` logs failures to Django's logging framework (`logger.exception`)
- [ ] `audit_service` is a module-level singleton
- [ ] `LoginView` calls `audit_service.log_login_success()` on successful authentication
- [ ] `LoginView` calls `audit_service.log_login_failed()` on failed authentication
- [ ] `PINLoginView` calls `audit_service.log_pin_login_success()` on success
- [ ] `PINLoginView` calls `audit_service.log_pin_login_failed()` on failure
- [ ] `LogoutView` calls `audit_service.log_logout()` after successfully blacklisting the token
- [ ] `ForgotPasswordView` calls `audit_service.log_password_reset_requested()` after creating the token
- [ ] `ResetPasswordView` calls `audit_service.log_password_reset_success()` after resetting
- [ ] `ForceLogoutView` calls `audit_service.log_force_logout()` with actor, target, and reason
- [ ] Audit records appear in the Django admin under Accounts → Audit Logs
- [ ] `LOGIN_FAILED` records have `actor_id=None` (the user is not authenticated yet)
- [ ] `LOGIN_SUCCESS` records have the correct `actor_id`, `actor_role`, and `ip_address`
- [ ] `FORCE_LOGOUT` records have the `after` field containing `target_email` and `reason`

---

## Notes

- The `AuditLog.actor_id` is stored as a UUID (not an FK) specifically to preserve records when a user is deleted or deactivated. Do not change this to a FK field.
- Audit writes are intentionally synchronous in this implementation. For high-throughput production systems, consider using Django Signals or Celery tasks to write audit records asynchronously.
- The `fail_silently` pattern in `AuditService.log()` is intentional — a failed audit write must never cause the API request to fail. Monitor the Django logs for `Failed to write AuditLog` messages in production.
- The `before` field in `AuditLog` is primarily useful for update operations (e.g., `ROLE_CHANGED` would capture the old role in `before` and the new role in `after`). For auth events, `after` is typically the more useful field.
