from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import AuditLog, CustomUser, PasswordResetToken


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
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "expires_at", "used")
    list_filter = ("used",)
    readonly_fields = ("id", "user", "token", "created_at", "expires_at", "used")
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False  # Tokens are only created via the ForgotPasswordView
