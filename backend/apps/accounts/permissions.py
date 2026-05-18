"""
LankaCommerce DRF Permission Classes

These classes enforce RBAC at the API layer. They are used as
`permission_classes` on DRF views and viewsets.

Usage:
    from apps.accounts.permissions import HasPermission, IsOwnerOrAbove

    class ProductCreateView(APIView):
        permission_classes = [IsAuthenticated, HasPermission("products.create")]
"""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from .constants.permissions import PERMISSIONS  # noqa: F401


class HasPermission(BasePermission):
    """
    Checks that the authenticated user's JWT contains the required permission string.

    SUPER_ADMIN is implicitly granted all permissions.
    """

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, "role", None) == "SUPER_ADMIN":
            return True

        auth_token = getattr(request.auth, "payload", {})
        permissions_in_token = auth_token.get("permissions", [])

        if not permissions_in_token:
            permissions_in_token = getattr(request.user, "permissions_list", [])

        return self.required_permission in permissions_in_token


class IsRole(BasePermission):
    """
    Checks that the authenticated user has one of the specified roles.
    """

    def __init__(self, *required_roles: str):
        self.required_roles = required_roles

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) in self.required_roles


class IsSuperAdmin(BasePermission):
    """Allows access only to SUPER_ADMIN users."""

    message = "Only Super Admins can perform this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) == "SUPER_ADMIN"
        )


class IsOwnerOrAbove(BasePermission):
    """Allows access to OWNER and SUPER_ADMIN only."""

    message = "Only store owners or platform admins can perform this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None) in ("SUPER_ADMIN", "OWNER")
        )


class IsManagerOrAbove(BasePermission):
    """Allows access to MANAGER, OWNER, and SUPER_ADMIN."""

    message = "Only managers or above can perform this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return (
            bool(request.user and request.user.is_authenticated)
            and getattr(request.user, "role", None)
            in ("SUPER_ADMIN", "OWNER", "MANAGER")
        )


class SameTenantOrSuperAdmin(BasePermission):
    """
    Ensures the user is accessing resources within their own tenant,
    unless they are a SUPER_ADMIN.
    """

    message = "You do not have access to this tenant's resources."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "SUPER_ADMIN":
            return True
        return True  # Tenant filtering is done at the queryset level

    def has_object_permission(self, request: Request, view: APIView, obj) -> bool:
        if request.user.role == "SUPER_ADMIN":
            return True
        obj_tenant_id = getattr(obj, "tenant_id", None)
        user_tenant_id = getattr(request.user, "tenant_id", None)
        return obj_tenant_id is not None and obj_tenant_id == user_tenant_id
