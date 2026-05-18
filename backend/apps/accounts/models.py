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
    # ForeignKey uses lazy string ref "tenants.Tenant" to avoid circular imports.
    # SET_NULL means removing a tenant does not cascade-delete users.
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
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
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"], name="idx_user_email"),
            models.Index(fields=["tenant"], name="idx_user_tenant"),
            models.Index(fields=["role"], name="idx_user_role"),
        ]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email


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
