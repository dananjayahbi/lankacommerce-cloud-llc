# Task 01.02.11 — Implement Auth Rate Limiting

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.11 |
| Title | Implement Auth Rate Limiting |
| Depends On | Task 01.02.02 — DRF configured · Task 01.02.07 — ForgotPasswordView |
| Working Directory | `backend/` (Steps 1–5) · `frontend/` (Step 6) |
| Stack | Django REST Framework · DRF Throttling · Python |
| Estimated Effort | 30 minutes |

---

## Objective

Protect LankaCommerce authentication endpoints from brute-force and denial-of-service attacks using Django REST Framework's built-in throttling system. This task:

1. Defines custom DRF throttle classes for login, PIN login, and forgot-password endpoints
2. Configures the Django cache backend (in-memory for development, Redis for production)
3. Applies the throttle classes to the appropriate views
4. Handles HTTP 429 responses gracefully on the frontend

DRF's throttling system uses the Django cache framework under the hood. When the request count for an IP address exceeds the configured rate, DRF automatically returns HTTP 429 Too Many Requests with a `Retry-After` header.

---

## Instructions

### Step 1 — Create the Throttle Classes

Create `backend/apps/accounts/throttling.py`:

```python
"""
LankaCommerce Auth Rate Limiting

Throttle classes for authentication endpoints.
These classes extend DRF's AnonRateThrottle to limit requests by IP address.

Rate limits:
    - Login:          10 requests per 15 minutes
    - PIN login:      10 requests per 15 minutes
    - Forgot password: 5 requests per hour

DRF throttle scopes must be unique. When multiple throttle classes share a
scope, they share the same cache counter. Each endpoint below uses a
distinct scope name to track independently.

Cache backend:
    - Development: LocMemCache (in-process, reset on server restart)
    - Production:  Redis via django-redis (shared across workers)
"""

from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Rate limit for the email/password login endpoint.

    Allows 10 login attempts per 15-minute window per IP address.
    After the limit is reached, the client receives HTTP 429 and must wait
    until the window resets.
    """

    scope = "login"


class PINRateThrottle(AnonRateThrottle):
    """
    Rate limit for the PIN login endpoint.

    Allows 10 PIN attempts per 15-minute window per IP address.
    Prevents automated PIN guessing attacks on the 4-digit PIN space.
    """

    scope = "pin_login"


class ForgotPasswordRateThrottle(AnonRateThrottle):
    """
    Rate limit for the forgot-password endpoint.

    Allows 5 password reset requests per hour per IP address.
    Prevents automated enumeration via reset email requests.
    """

    scope = "forgot_password"
```

---

### Step 2 — Configure Rate Limit Values in Settings

Open `backend/config/settings/base.py`. Add the throttle rate configuration to the `REST_FRAMEWORK` settings dict:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
    # Throttle rate configuration
    # Format: "<count>/<period>" where period is second, minute, hour, or day
    # Custom period "15min" is not valid — use "900/hour" equivalent logic
    # DRF supports: /second, /minute, /hour, /day
    # To achieve "10 per 15 minutes", set "40/hour" (10 * 4 = 40 per hour)
    # For precise 15-minute windows, override get_rate() in the throttle class (see below)
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/15min",        # Handled by custom rate parser below
        "pin_login": "10/15min",
        "forgot_password": "5/hour",
        "anon": "100/minute",       # Default for anonymous users
        "user": "1000/minute",      # Default for authenticated users
    },
}
```

> DRF's built-in rate parser does not support `15min` natively — it supports `second`, `minute`, `hour`, and `day`. You have two options:
> 1. **Override `parse_rate()`** in the throttle class to handle `15min` (recommended — see Step 3)
> 2. **Use a proxy value** like `40/hour` (10 requests * 4 fifteen-minute windows per hour)

---

### Step 3 — Handle the 15-Minute Window

Update `backend/apps/accounts/throttling.py` to add a custom `parse_rate()` method that handles the `15min` duration:

```python
from rest_framework.throttling import AnonRateThrottle


class LankaCommerceRateThrottle(AnonRateThrottle):
    """
    Base throttle class with support for custom time periods.

    Extends the standard rate parser to support:
        - Standard: second, minute, hour, day
        - Custom: 15min (= 900 seconds)
    """

    CUSTOM_PERIODS = {
        "15min": 15 * 60,   # 900 seconds
        "30min": 30 * 60,   # 1800 seconds
    }

    def parse_rate(self, rate: str | None):
        """
        Override DRF's parse_rate to support custom period strings like '15min'.
        Falls back to the parent implementation for standard periods.
        """
        if rate is None:
            return None, None

        num, period = rate.split("/")
        num_requests = int(num)

        if period in self.CUSTOM_PERIODS:
            duration = self.CUSTOM_PERIODS[period]
            return num_requests, duration

        # Delegate standard periods to the parent parser
        return super().parse_rate(rate)


class LoginRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the email/password login endpoint.
    10 attempts per 15-minute window per IP address.
    """
    scope = "login"


class PINRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the PIN login endpoint.
    10 attempts per 15-minute window per IP address.
    """
    scope = "pin_login"


class ForgotPasswordRateThrottle(LankaCommerceRateThrottle):
    """
    Rate limit for the forgot-password endpoint.
    5 requests per hour per IP address.
    """
    scope = "forgot_password"
```

---

### Step 4 — Configure the Django Cache Backend

Open `backend/config/settings/base.py` and add the cache configuration:

```python
# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
# Development: in-process memory cache (fast, resets on server restart)
# Production: override with Redis cache in production.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "lankacommerce-cache",
    }
}
```

In `backend/config/settings/production.py`, override with Redis for multi-process production use:

```python
# Production cache — requires django-redis package
# Install: poetry add django-redis
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "lankacommerce",
    }
}
```

Add `REDIS_URL` to `backend/.env.example`:

```dotenv
REDIS_URL=redis://localhost:6379/1
```

---

### Step 5 — Apply Throttle Classes to Views

Open `backend/apps/accounts/views.py`. Import the throttle classes at the top:

```python
from .throttling import ForgotPasswordRateThrottle, LoginRateThrottle, PINRateThrottle
```

Add `throttle_classes` to `LoginView`, `PINLoginView`, and `ForgotPasswordView`:

```python
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]    # <-- Add

    def post(self, request, *args, **kwargs):
        # ... existing implementation
```

```python
class PINLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PINRateThrottle]      # <-- Add

    def post(self, request, *args, **kwargs):
        # ... existing implementation
```

```python
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordRateThrottle]  # <-- Add

    def post(self, request, *args, **kwargs):
        # ... existing implementation
```

---

### Step 6 — Handle 429 Responses on Frontend

Open `frontend/src/lib/api/auth.ts`. Update the `loginUser()` and `loginWithPin()` functions to map HTTP 429 to a user-friendly error message:

Update `loginUser()`:

```typescript
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (response.status === 429) {
    throw new Error(
      "Too many login attempts. Please wait 15 minutes before trying again."
    );
  }

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "Login failed. Please check your credentials.",
    }));
    throw new Error(error.detail ?? "Login failed.");
  }

  return response.json();
}
```

The `loginWithPin()` function in Task 01.02.04 already handles 429. Verify it is consistent with this pattern.

Also update the forgot-password API call in the forgot-password page component. Open `frontend/src/app/(auth)/forgot-password/page.tsx` and update the fetch call's error handling:

```typescript
if (res.status === 429) {
  throw new Error(
    "Too many requests. Please wait an hour before requesting another reset link."
  );
}
if (!res.ok && res.status !== 200) {
  throw new Error("Something went wrong. Please try again.");
}
```

---

### Step 7 — Test Rate Limiting

**Test login throttle:**

```bash
# Send 11 login attempts in quick succession
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email": "bad@example.com", "password": "wrongpass"}')
  echo "Attempt $i: HTTP $STATUS"
done
```

Expected output:
```
Attempt 1: HTTP 401
Attempt 2: HTTP 401
...
Attempt 10: HTTP 401
Attempt 11: HTTP 429
```

**Verify the 429 response body:**

```bash
curl -i -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "bad@example.com", "password": "wrongpass"}'
```

After the 11th attempt, you should see:
```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
Content-Type: application/json

{"detail": "Request was throttled. Expected available in <N> seconds."}
```

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      throttling.py           ← LankaCommerceRateThrottle, LoginRateThrottle,
                                PINRateThrottle, ForgotPasswordRateThrottle
      views.py                ← throttle_classes added to Login, PIN, ForgotPassword views
  config/
    settings/
      base.py                 ← CACHES (LocMemCache), DEFAULT_THROTTLE_RATES
      production.py           ← CACHES (Redis)

frontend/
  src/
    lib/
      api/
        auth.ts               ← 429 mapped to user-friendly error in loginUser()
    app/
      (auth)/
        forgot-password/
          page.tsx            ← 429 error message added
```

---

## Validation

- [ ] `backend/apps/accounts/throttling.py` defines `LoginRateThrottle`, `PINRateThrottle`, `ForgotPasswordRateThrottle`
- [ ] All throttle classes inherit from `LankaCommerceRateThrottle` which supports `15min` period
- [ ] `parse_rate("10/15min")` returns `(10, 900)` (10 requests, 900 second window)
- [ ] `LoginRateThrottle.scope = "login"`
- [ ] `PINRateThrottle.scope = "pin_login"`
- [ ] `ForgotPasswordRateThrottle.scope = "forgot_password"`
- [ ] `DEFAULT_THROTTLE_RATES` in `REST_FRAMEWORK` settings has `login`, `pin_login`, and `forgot_password` entries
- [ ] `CACHES` is configured in `config/settings/base.py` with `LocMemCache` for development
- [ ] `CACHES` is overridden in `config/settings/production.py` with Redis
- [ ] `LoginView` has `throttle_classes = [LoginRateThrottle]`
- [ ] `PINLoginView` has `throttle_classes = [PINRateThrottle]`
- [ ] `ForgotPasswordView` has `throttle_classes = [ForgotPasswordRateThrottle]`
- [ ] The 11th login attempt within 15 minutes returns HTTP 429
- [ ] HTTP 429 response includes `Retry-After` header
- [ ] `loginUser()` in `auth.ts` throws a user-friendly message on HTTP 429
- [ ] The login page displays the rate limit message in the server error banner
- [ ] `/forgot-password` page displays the rate limit message on HTTP 429

---

## Notes

- `LocMemCache` is process-local. In a multi-process production setup (e.g., Gunicorn with 4 workers), each worker maintains its own counter, effectively multiplying the rate limit by the number of workers. Use Redis to share a single counter across all workers in production.
- The `Retry-After` header value returned by DRF is the number of seconds until the rate limit window resets. You can surface this in the frontend error message if you parse the response headers: `response.headers.get("Retry-After")`.
- DRF throttle classes use `get_cache_key()` to determine the scope key. By default, `AnonRateThrottle` uses the client's IP address. If your deployment is behind a load balancer or reverse proxy, ensure the `REMOTE_ADDR` is correctly set to the actual client IP (configure `TRUSTED_PROXIES` and use the correct `FORWARDED_FOR` header in `get_cache_key()`).
- The `15min` period is not standard in DRF's rate parser but is achieved by overriding `parse_rate()`. If you encounter issues with this approach, fall back to `"40/hour"` (which achieves approximately the same rate with a slightly different window).
