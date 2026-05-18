# Task 01.02.01 — Create User and AuditLog Models

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.01 |
| Title | Create User and AuditLog Models |
| Depends On | Task 01.01.06 — Directory Structure, Task 01.01.02 — PostgreSQL configured |
| Working Directory | `backend/` |
| Stack | Python · Django ORM · PostgreSQL |
| Estimated Effort | 45 minutes |

---

## Objective

Create the Django data models that underpin the entire authentication and audit system for LankaCommerce. This task establishes:

1. The `accounts` Django application (`apps/accounts/`)
2. A `CustomUser` model extending Django's `AbstractBaseUser` with UUID primary key, multi-tenancy fields, role, permissions list, PIN hash, and session versioning
3. An `AuditLog` model for immutable recording of all significant system events
4. Correct `AUTH_USER_MODEL` configuration
5. Initial database migrations

All subsequent auth tasks in SubPhase 01.02 depend on these models being in place and migrated.

---

## Instructions

### Step 1 — Create the Accounts App

Open a terminal, navigate to the `backend/` directory, and create the Django accounts application inside the `apps/` subdirectory:

```bash
cd backend
poetry run python manage.py startapp accounts apps/accounts
```

This generates the app skeleton at `backend/apps/accounts/`. The `apps/accounts/` directory will contain the following files after creation:

```
backend/apps/accounts/
  __init__.py
  admin.py
  apps.py
  migrations/
    __init__.py
  models.py
  tests.py
  views.py
```

Open `backend/apps/accounts/apps.py` and update the `name` attribute so Django can resolve it correctly:

```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
```

Open `backend/config/settings/base.py` and add `"apps.accounts"` to the `INSTALLED_APPS` list. Place it after your existing app entries:

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
    # Local apps
    "apps.core",
    "apps.accounts",  # <-- Add this line
]
```

> Do not add `rest_framework_simplejwt.token_blacklist` yet — that is done in Task 01.02.02 when SimpleJWT is fully configured.

---

### Step 2 — Define the UserRole Choices Class

Open `backend/apps/accounts/models.py`. Clear the default content and begin the file with the imports and the `UserRole` choices class:

```python
import uuid
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    OWNER = "OWNER", "Owner"
    MANAGER = "MANAGER", "Manager"
    CASHIER = "CASHIER", "Cashier"
    STOCK_CLERK = "STOCK_CLERK", "Stock Clerk"
```

Using `models.TextChoices` ensures that the role values are stored as human-readable strings in the database column and are validated at the ORM level.

---

### Step 3 — Define the CustomUserManager

Immediately after the `UserRole` class, define the custom manager. The manager is required by `AbstractBaseUser` and provides the `create_user` and `create_superuser` factory methods:

```python
class CustomUserManager(BaseUserManager):
    """
    Custom manager for CustomUser where email is the unique identifier
    for authentication instead of a username.
    """

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set.")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.SUPER_ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
```

---

### Step 4 — Define the CustomUser Model

Add the `CustomUser` model class after the manager:

```python
class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    LankaCommerce custom user model.

    Uses email as the primary identifier. Supports multi-tenancy via
    tenant_id, role-based access control, PIN-based quick login, and
    session versioning for forced logout.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique user identifier (UUID v4).",
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="User's email address. Used as the login identifier.",
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    # Multi-tenancy
    tenant_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="The tenant this user belongs to. Null for SUPER_ADMIN.",
    )

    # Role & Permissions
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CASHIER,
        help_text="Primary role determining access level.",
    )
    permissions_list = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Explicit list of permission strings granted to this user. "
            "Stored as a JSON array, e.g. ['products.view', 'sales.create']."
        ),
    )

    # PIN authentication
    pin_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Hashed PIN for quick login. Empty if PIN is not set.",
    )

    # Session management
    session_version = models.IntegerField(
        default=1,
        help_text=(
            "Monotonically incremented on forced logout. "
            "Embedded in JWT; increment invalidates all outstanding tokens."
        ),
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user account is active.",
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the Django admin site.",
    )

    # Timestamps
    last_login_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent successful login.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Soft delete timestamp. Non-null means the user is deactivated.",
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email + password handled by AbstractBaseUser

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"], name="idx_user_email"),
            models.Index(fields=["tenant_id"], name="idx_user_tenant"),
            models.Index(fields=["role"], name="idx_user_role"),
        ]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email
```

> **PIN Security Note**: The `pin_hash` field stores the output of Django's `make_password()`. Never store plain PINs. Set the PIN using:
> ```python
> from django.contrib.auth.hashers import make_password, check_password
> user.pin_hash = make_password("1234")
> user.save()
> # Verify:
> check_password("1234", user.pin_hash)  # True
> ```

---

### Step 5 — Define the AuditLog Model

Add the `AuditLog` model after `CustomUser`. This model is append-only — records are never updated or deleted, only created:

```python
class AuditLog(models.Model):
    """
    Immutable audit trail for significant system events.

    Records are written by the audit service (apps/accounts/services/audit_service.py).
    Actor references are stored as UUIDs rather than FK to preserve history
    even if the actor user is later deleted or deactivated.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    tenant_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Tenant context in which the action occurred.",
    )

    # Actor — stored as UUID, not FK, to preserve history
    actor_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the user who performed the action.",
    )
    actor_role = models.CharField(
        max_length=20,
        blank=True,
        help_text="Role of the actor at the time of the action.",
    )

    # Target entity
    entity_type = models.CharField(
        max_length=100,
        help_text="Type of entity affected, e.g. 'User', 'Product', 'Sale'.",
    )
    entity_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the specific entity affected.",
    )

    # Action
    action = models.CharField(
        max_length=100,
        help_text="Action performed, e.g. 'LOGIN_SUCCESS', 'LOGOUT', 'PIN_LOGIN_FAILED'.",
    )

    # Change data
    before = models.JSONField(
        null=True,
        blank=True,
        help_text="State of the entity before the action (for update/delete operations).",
    )
    after = models.JSONField(
        null=True,
        blank=True,
        help_text="State of the entity after the action (for create/update operations).",
    )

    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the client that performed the action.",
    )
    user_agent = models.TextField(
        blank=True,
        default="",
        help_text="User-Agent header from the request.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this audit record was created.",
    )

    class Meta:
        db_table = "accounts_auditlog"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor_id"], name="idx_audit_actor"),
            models.Index(fields=["tenant_id"], name="idx_audit_tenant"),
            models.Index(
                fields=["entity_type", "entity_id"],
                name="idx_audit_entity",
            ),
            models.Index(fields=["created_at"], name="idx_audit_created_at"),
            models.Index(fields=["action"], name="idx_audit_action"),
        ]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self) -> str:
        return f"[{self.created_at}] {self.action} by {self.actor_id} on {self.entity_type}"
```

> **Immutability Note**: Django does not enforce immutability at the ORM level. Enforce this in the audit service by never calling `.save()` on an existing `AuditLog` instance — only ever call `AuditLog.objects.create(...)`.

---

### Step 6 — Configure AUTH_USER_MODEL

Open `backend/config/settings/base.py`. Add the `AUTH_USER_MODEL` setting so Django uses your custom user model throughout the project (auth, admin, permissions system):

```python
# Custom user model
AUTH_USER_MODEL = "accounts.CustomUser"
```

Place this setting near the top of the settings file, after `INSTALLED_APPS`. This must be set **before** any migration is run, as changing it after the first migration is destructive.

---

### Step 7 — Register Models in Django Admin

Open `backend/apps/accounts/admin.py` and replace the default content with a full admin registration:

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import AuditLog, CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ("email", "role", "tenant_id", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at", "last_login_at")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (
            _("Personal Info"),
            {"fields": ("first_name", "last_name")},
        ),
        (
            _("Tenant & Role"),
            {"fields": ("tenant_id", "role", "permissions_list")},
        ),
        (
            _("Session"),
            {"fields": ("session_version", "last_login_at")},
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            _("Important dates"),
            {"fields": ("created_at", "updated_at", "deleted_at")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "role", "password1", "password2"),
            },
        ),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "actor_id",
        "actor_role",
        "entity_type",
        "entity_id",
        "ip_address",
    )
    list_filter = ("action", "actor_role", "entity_type")
    search_fields = ("actor_id", "entity_id", "action", "ip_address")
    readonly_fields = (
        "id",
        "tenant_id",
        "actor_id",
        "actor_role",
        "entity_type",
        "entity_id",
        "action",
        "before",
        "after",
        "ip_address",
        "user_agent",
        "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False  # AuditLog records must only be created via the audit service

    def has_change_permission(self, request, obj=None):
        return False  # AuditLog records are immutable

    def has_delete_permission(self, request, obj=None):
        return False  # AuditLog records must never be deleted via admin
```

---

### Step 8 — Create and Run Migrations

With the models defined, generate and apply the migrations:

```bash
# Still inside backend/
poetry run python manage.py makemigrations accounts
```

You should see output similar to:

```
Migrations for 'accounts':
  apps/accounts/migrations/0001_initial.py
    - Create model AuditLog
    - Create model CustomUser
```

Apply the migrations to create the tables in PostgreSQL:

```bash
poetry run python manage.py migrate
```

If you see an error about `AUTH_USER_MODEL` conflicts, ensure no other migration has run before this one without `AUTH_USER_MODEL` set. In a fresh project this should not be an issue.

---

### Step 9 — Verify in Django Shell

Open the Django interactive shell and verify both models are functional:

```bash
poetry run python manage.py shell
```

Run the following verification commands inside the shell:

```python
from apps.accounts.models import CustomUser, AuditLog, UserRole
import uuid

# Verify UserRole choices
print(UserRole.choices)
# [('SUPER_ADMIN', 'Super Admin'), ('OWNER', 'Owner'), ('MANAGER', 'Manager'),
#  ('CASHIER', 'Cashier'), ('STOCK_CLERK', 'Stock Clerk')]

# Create a test user
user = CustomUser.objects.create_user(
    email="test@lankacommerce.dev",
    password="testpass123",
    role=UserRole.CASHIER,
)
print(user.id)           # UUID
print(user.role)         # CASHIER
print(user.session_version)  # 1
print(user.permissions_list) # []

# Verify password hashing
print(user.check_password("testpass123"))  # True
print(user.check_password("wrongpass"))    # False

# Create an audit log entry
log = AuditLog.objects.create(
    actor_id=user.id,
    actor_role=user.role,
    entity_type="User",
    entity_id=user.id,
    action="TEST_ACTION",
    ip_address="127.0.0.1",
)
print(log.id)       # UUID
print(log.action)   # TEST_ACTION

# Clean up test data
user.delete()
log.delete()

print("All model verification checks passed.")
exit()
```

---

## Expected Output

After completing this task, the following should exist:

```
backend/
  apps/
    accounts/
      __init__.py
      admin.py            ← CustomUser and AuditLog registered
      apps.py             ← name = "apps.accounts", label = "accounts"
      migrations/
        __init__.py
        0001_initial.py   ← Generated migration for CustomUser and AuditLog
      models.py           ← UserRole, CustomUserManager, CustomUser, AuditLog
      tests.py
      views.py
  config/
    settings/
      base.py             ← AUTH_USER_MODEL = "accounts.CustomUser"
                          ← "apps.accounts" in INSTALLED_APPS
```

PostgreSQL should have the following tables created:
- `accounts_user` — the CustomUser table
- `accounts_auditlog` — the AuditLog table
- All indexes defined in the model `Meta.indexes` should be present

---

## Validation

- [ ] `poetry run python manage.py startapp accounts apps/accounts` completed without errors
- [ ] `apps/accounts/apps.py` has `name = "apps.accounts"` and `label = "accounts"`
- [ ] `"apps.accounts"` is present in `INSTALLED_APPS` in `config/settings/base.py`
- [ ] `AUTH_USER_MODEL = "accounts.CustomUser"` is set in `config/settings/base.py`
- [ ] `CustomUser` has UUID primary key, email as `USERNAME_FIELD`, `role`, `tenant_id`, `permissions_list`, `pin_hash`, `session_version`, and soft-delete `deleted_at` fields
- [ ] `CustomUserManager` has `create_user` and `create_superuser` methods
- [ ] `AuditLog` has UUID primary key, no FK to CustomUser (actor stored as plain UUID), `before`/`after` JSON fields, and `ip_address`
- [ ] All database indexes on `AuditLog` and `CustomUser` are defined in their `Meta.indexes`
- [ ] `poetry run python manage.py makemigrations accounts` creates `0001_initial.py`
- [ ] `poetry run python manage.py migrate` completes without errors
- [ ] Django shell verification creates a `CustomUser` and `AuditLog` record successfully
- [ ] `CustomUser.objects.create_user()` hashes the password (plain text is not stored)
- [ ] `CustomUserAdmin` and `AuditLogAdmin` are registered in `admin.py`
- [ ] `AuditLogAdmin` has `has_add_permission`, `has_change_permission`, `has_delete_permission` all returning `False`
- [ ] Django admin site at `http://localhost:8000/admin/` shows Accounts section with Users and Audit Logs

---

## Notes

- Django's `AbstractBaseUser` does not include a `username` field — `email` is used exclusively as the login identifier.
- The `PermissionsMixin` adds `is_superuser`, `groups`, and `user_permissions` to the model, which are used by Django admin and the `@permission_required` decorator.
- `permissions_list` (JSONField) stores LankaCommerce-specific permission strings (e.g., `"products.create"`) and is separate from Django's built-in `user_permissions` M2M. The LankaCommerce RBAC system reads from `permissions_list`; Django admin uses the built-in system.
- If you need to reset the database during development, run `poetry run python manage.py flush` and re-run migrations.
- Do not add `PasswordResetToken` to this model file — it is created in Task 01.02.07.
