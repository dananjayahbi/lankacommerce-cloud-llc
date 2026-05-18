# Task 01.02.02 — Configure Django Authentication

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.02 |
| Title | Configure Django Authentication |
| Depends On | Task 01.02.01 — CustomUser and AuditLog models created and migrated |
| Working Directory | `backend/` (primary) · `frontend/` (Step 8–9) |
| Stack | Python · Django REST Framework · SimpleJWT · Next.js |
| Estimated Effort | 60 minutes |

---

## Objective

Replace the placeholder authentication stack with a fully configured Django REST Framework + SimpleJWT setup. By the end of this task:

- SimpleJWT is installed, configured with 15-minute access tokens and 7-day refresh tokens
- Token blacklisting is enabled (needed for logout and forced logout in later tasks)
- A custom token serializer embeds `role`, `permissions`, `tenant_id`, `session_version`, and `email` into every issued JWT
- A `LoginView` endpoint is live at `POST /api/auth/login/`
- CORS is configured to allow the Next.js frontend at `localhost:3000`
- A frontend auth utility (`frontend/src/lib/api/auth.ts`) wraps all auth API calls
- The smoke test confirms a valid JWT is returned with correct custom claims

---

## Instructions

### Step 1 — Install Authentication Dependencies

Navigate to the `backend/` directory and install SimpleJWT:

```bash
cd backend
poetry add djangorestframework-simplejwt
```

Verify that `djangorestframework` and `django-cors-headers` are already in `pyproject.toml` (they should have been added in SubPhase 01.01). If they are missing, add them now:

```bash
poetry add djangorestframework django-cors-headers
```

Also install `PyJWT` for any utility JWT decoding needs in the backend (SimpleJWT uses it internally):

```bash
poetry add PyJWT
```

After installation, confirm the packages are listed in `poetry.lock` by running:

```bash
poetry show djangorestframework-simplejwt
```

---

### Step 2 — Add Token Blacklist to INSTALLED_APPS

Open `backend/config/settings/base.py`. Add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS`. This enables the token blacklisting table used by logout and forced logout:

```python
INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",  # <-- Add this
    # Local apps
    "apps.core",
    "apps.accounts",
]
```

Run the migration to create the token blacklist tables:

```bash
poetry run python manage.py migrate
```

---

### Step 3 — Configure SimpleJWT Settings

Open `backend/config/settings/base.py` and add the following settings blocks. Place them after `INSTALLED_APPS`:

```python
from datetime import timedelta  # Add this import at the top of settings/base.py

# -------------------------------------------------------------------
# Django REST Framework
# -------------------------------------------------------------------
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
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",  # Optional — create in Task 01.02.06 or skip
}

# -------------------------------------------------------------------
# SimpleJWT Configuration
# -------------------------------------------------------------------
SIMPLE_JWT = {
    # Token lifetimes
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Refresh token rotation
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # Token algorithm
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("DJANGO_SECRET_KEY"),  # Uses the main SECRET_KEY; override with SIMPLE_JWT_SIGNING_KEY in production
    # Token header
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    # Token claim mapping
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    # Token serializer — overridden below in accounts app
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.CustomTokenObtainPairSerializer",
    # Token classes
    "ACCESS_TOKEN_CLASS": "rest_framework_simplejwt.tokens.AccessToken",
    "REFRESH_TOKEN_CLASS": "rest_framework_simplejwt.tokens.RefreshToken",
}
```

> If `env("DJANGO_SECRET_KEY")` does not work in your settings setup (depends on the environment-parsing library used in SubPhase 01.01), replace it with `SECRET_KEY` to reuse the Django secret, or use `os.environ.get("SIMPLE_JWT_SIGNING_KEY", SECRET_KEY)`.

---

### Step 4 — Create the Custom Token Serializer

Create the serializers file at `backend/apps/accounts/serializers.py`:

```python
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers

from .models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default SimpleJWT serializer to embed LankaCommerce-specific
    claims into the access token payload.

    Custom claims added:
        - email
        - role
        - permissions (list of permission strings)
        - tenant_id (UUID string or null)
        - session_version (integer)
    """

    @classmethod
    def get_token(cls, user: CustomUser) -> RefreshToken:
        token = super().get_token(user)

        # Embed custom claims into the token payload
        token["email"] = user.email
        token["role"] = user.role
        token["permissions"] = user.permissions_list  # List[str]
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["session_version"] = user.session_version

        return token

    def validate(self, attrs: dict) -> dict:
        # Call parent validate — performs credential check and sets self.user
        data = super().validate(attrs)

        # Enrich the response body with user info (optional, useful for frontend)
        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "role": self.user.role,
            "tenant_id": str(self.user.tenant_id) if self.user.tenant_id else None,
        }

        return data


class LogoutSerializer(serializers.Serializer):
    """Accepts the refresh token for blacklisting on logout."""
    refresh = serializers.CharField(
        help_text="The refresh token to blacklist. Required for logout."
    )
```

---

### Step 5 — Create the Login and Logout Views

Open `backend/apps/accounts/views.py` and replace the default content with the following:

```python
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser
from .serializers import CustomTokenObtainPairSerializer, LogoutSerializer


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/

    Accepts { email, password } and returns JWT access + refresh tokens
    with LankaCommerce custom claims embedded.

    Throttling is applied in Task 01.02.11.
    Audit logging is wired in Task 01.02.10.
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            # Audit logging for failed login is added in Task 01.02.10
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Update last_login_at on successful authentication
        try:
            user = CustomUser.objects.get(email=request.data.get("email", "").lower())
            user.last_login_at = timezone.now()
            user.save(update_fields=["last_login_at"])
        except CustomUser.DoesNotExist:
            pass

        # Audit logging for successful login is added in Task 01.02.10
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Blacklists the provided refresh token, effectively logging the user out.
    The access token expires naturally (15 minutes).
    """

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

        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/

    Returns the current authenticated user's profile information.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                "permissions": user.permissions_list,
                "session_version": user.session_version,
            }
        )
```

---

### Step 6 — Create Auth URL Patterns

Create `backend/apps/accounts/urls.py`:

```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import CurrentUserView, LoginView, LogoutView

app_name = "accounts"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
]
```

Open `backend/config/urls.py` (or `backend/config/urls/base.py` depending on your SubPhase 01.01 setup) and include the accounts URLs under the `api/auth/` prefix:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls", namespace="accounts")),
    # Additional app URLs will be added in later SubPhases
]
```

---

### Step 7 — Configure CORS

Open `backend/config/settings/base.py` and ensure `corsheaders.middleware.CorsMiddleware` is at the **top** of the MIDDLEWARE list, above `CommonMiddleware`:

```python
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",           # Must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
```

In `backend/config/settings/development.py`, configure the CORS allowed origins for local development:

```python
# CORS — Allow the Next.js dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True  # Required for httpOnly cookie approach

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
```

---

### Step 8 — Create the Frontend Auth Utility

Switch to the `frontend/` directory. Create the directory structure if it does not exist:

```bash
cd ../frontend
mkdir -p src/lib/api
```

Create `frontend/src/lib/api/auth.ts`:

```typescript
/**
 * LankaCommerce Auth API Utility
 *
 * Wraps all authentication-related API calls to the Django backend.
 * The Django base URL is read from NEXT_PUBLIC_API_BASE_URL environment variable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserPayload {
  user_id: string;
  email: string;
  role: string;
  permissions: string[];
  tenant_id: string | null;
  session_version: number;
  exp: number;
  iat: number;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenant_id: string | null;
  };
}

export interface AuthError {
  detail: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------

/**
 * Decodes a JWT payload without verifying the signature.
 * Signature verification is performed server-side in Django and in Next.js middleware.
 */
export function decodeToken(token: string): UserPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;
    const decoded = JSON.parse(
      Buffer.from(base64Payload, "base64url").toString("utf8")
    );
    return decoded as UserPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the decoded JWT payload is expired.
 */
export function isTokenExpired(payload: UserPayload): boolean {
  return Date.now() / 1000 > payload.exp;
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

/**
 * Logs in with email and password.
 * Calls POST /api/auth/login/ on the Django backend.
 * Returns the access token, refresh token, and basic user info.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include", // Include cookies in the request
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "Login failed. Please check your credentials.",
    }));
    throw new Error(error.detail ?? "Login failed.");
  }

  return response.json();
}

/**
 * Refreshes the access token using the refresh token stored in cookies.
 * Calls POST /api/auth/token/refresh/ on the Django backend.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access: string }> {
  const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Token refresh failed. Please log in again.");
  }

  return response.json();
}

/**
 * Logs out the current user by blacklisting the refresh token.
 * Calls POST /api/auth/logout/ on the Django backend.
 */
export async function logoutUser(
  refreshToken: string,
  accessToken: string
): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh: refreshToken }),
    credentials: "include",
  });
  // Do not throw on error — proceed with client-side logout regardless
}

/**
 * Fetches the current user's profile from Django.
 * Requires a valid access token passed as Bearer header.
 */
export async function getCurrentUser(
  accessToken: string
): Promise<LoginResponse["user"]> {
  const response = await fetch(`${API_BASE}/api/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch current user.");
  }

  return response.json();
}
```

---

### Step 9 — Configure Frontend Environment

Open (or create) `frontend/.env.local` and add the Django API base URL:

```dotenv
# Django backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# JWT secret — must match Django's SIMPLE_JWT SIGNING_KEY
# Used by Next.js middleware to verify the JWT signature without a backend call
DJANGO_JWT_SECRET=your-django-secret-key-here
```

> `DJANGO_JWT_SECRET` is used in Task 01.02.05 by the Next.js middleware. Set it to the same value as `DJANGO_SECRET_KEY` in `backend/.env`.

Also ensure `backend/.env.example` documents the relevant variables:

```dotenv
# Django core
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://lankacommerce:password@localhost:5432/lankacommerce_db

# SimpleJWT (optional — defaults to DJANGO_SECRET_KEY if not set)
# SIMPLE_JWT_SIGNING_KEY=your-separate-jwt-signing-key

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

### Step 10 — Smoke Test

Start the Django development server:

```bash
cd backend
poetry run python manage.py runserver
```

In a new terminal, send a test login request using `curl` (replace with actual seeded credentials or create a test user first):

```bash
# First, create a test user via Django shell if one does not exist
cd backend
poetry run python manage.py shell -c "
from apps.accounts.models import CustomUser, UserRole
u = CustomUser.objects.create_user(email='admin@test.com', password='testpass123', role=UserRole.SUPER_ADMIN)
print('Created:', u.email)
"

# Send the login request
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "testpass123"}' \
  | python -m json.tool
```

Expected response:

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "role": "SUPER_ADMIN",
    "tenant_id": null
  }
}
```

Decode the access token to verify custom claims are present:

```bash
# Decode the access token payload (base64 middle part)
echo "PASTE_ACCESS_TOKEN_HERE" | cut -d'.' -f2 | base64 -d 2>/dev/null | python -m json.tool
```

Verify the decoded payload contains:
```json
{
  "token_type": "access",
  "exp": 1234567890,
  "iat": 1234566990,
  "jti": "...",
  "user_id": "...",
  "email": "admin@test.com",
  "role": "SUPER_ADMIN",
  "permissions": [],
  "tenant_id": null,
  "session_version": 1
}
```

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      serializers.py        ← CustomTokenObtainPairSerializer, LogoutSerializer
      views.py              ← LoginView, LogoutView, CurrentUserView
      urls.py               ← /login/, /logout/, /token/refresh/, /token/verify/, /me/
  config/
    settings/
      base.py               ← REST_FRAMEWORK dict, SIMPLE_JWT dict, timedelta import
      development.py        ← CORS_ALLOWED_ORIGINS, CORS_ALLOW_CREDENTIALS
    urls.py                 ← api/auth/ route included

frontend/
  src/
    lib/
      api/
        auth.ts             ← loginUser, logoutUser, refreshAccessToken, getCurrentUser, decodeToken
  .env.local                ← NEXT_PUBLIC_API_BASE_URL, DJANGO_JWT_SECRET
```

---

## Validation

- [ ] `poetry add djangorestframework-simplejwt` completed without errors
- [ ] `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS`
- [ ] `poetry run python manage.py migrate` created the token blacklist tables
- [ ] `REST_FRAMEWORK` settings block is present in `config/settings/base.py`
- [ ] `SIMPLE_JWT` settings block has `ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)` and `REFRESH_TOKEN_LIFETIME = timedelta(days=7)`
- [ ] `SIMPLE_JWT["TOKEN_OBTAIN_SERIALIZER"]` points to `apps.accounts.serializers.CustomTokenObtainPairSerializer`
- [ ] `CustomTokenObtainPairSerializer.get_token()` adds `email`, `role`, `permissions`, `tenant_id`, `session_version` to the token
- [ ] `LoginView` inherits `TokenObtainPairView` and uses `CustomTokenObtainPairSerializer`
- [ ] `LogoutView` blacklists the refresh token and returns 200
- [ ] `apps/accounts/urls.py` defines routes for login, logout, token/refresh, token/verify, me
- [ ] `config/urls.py` includes `apps.accounts.urls` under `api/auth/`
- [ ] `CorsMiddleware` is the first item in `MIDDLEWARE`
- [ ] `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000` in development settings
- [ ] `frontend/src/lib/api/auth.ts` exports `loginUser`, `logoutUser`, `refreshAccessToken`, `getCurrentUser`, `decodeToken`
- [ ] `frontend/.env.local` contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
- [ ] Smoke test: `POST /api/auth/login/` returns access + refresh tokens with custom claims
- [ ] Decoded JWT contains `role`, `permissions`, `tenant_id`, `session_version` fields

---

## Notes

- `ROTATE_REFRESH_TOKENS = True` means every token refresh issues a new refresh token; the old one is immediately blacklisted. This improves security by limiting the window of refresh token reuse.
- Do not set `CORS_ALLOW_ALL_ORIGINS = True` in production. Always use `CORS_ALLOWED_ORIGINS` with an explicit list.
- The `SIMPLE_JWT["SIGNING_KEY"]` should ideally be a separate secret from `DJANGO_SECRET_KEY` in production environments. For development, sharing the Django secret key is acceptable.
- The `frontend/.env.local` file is gitignored by Next.js by default — do not commit it. Document all variables in `frontend/.env.example`.
- `TokenVerifyView` accepts an access token and returns 200 if it is valid, 401 if not. This can be used by the frontend to validate tokens before making protected requests.
