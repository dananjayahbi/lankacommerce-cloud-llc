# Task 01.02.06 — Build RBAC Permission System

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce — SaaS Tenant ERP |
| Phase | 01 — The Foundation |
| SubPhase | 01.02 — Authentication, RBAC & Session Management |
| Task | 01.02.06 |
| Title | Build RBAC Permission System |
| Depends On | Task 01.02.01 — CustomUser model · Task 01.02.05 — Middleware and authStore |
| Working Directory | `backend/` (Steps 1–3) · `frontend/` (Steps 4–6) |
| Stack | Django REST Framework · Python · TypeScript · Zustand |
| Estimated Effort | 60 minutes |

---

## Objective

Implement a comprehensive, two-tier Role-Based Access Control (RBAC) system for LankaCommerce:

**Backend tier (Django)**: DRF permission classes that read JWT claims to enforce access control on every API endpoint. Permission strings are defined as Python constants mirroring the frontend.

**Frontend tier (Next.js)**: Permission constants, a `hasPermission()` utility, and a `usePermissions()` hook that reads from the Zustand auth store. React components use the hook to conditionally render UI elements based on the current user's permissions.

Both tiers share the same permission string namespace (e.g., `"products.create"`, `"sales.void"`), which makes it straightforward to audit and synchronise access rules.

---

## Instructions

### Step 1 — Create Django Permissions Constants

Create the directory and file:

```bash
mkdir -p backend/apps/accounts/constants
touch backend/apps/accounts/constants/__init__.py
```

Create `backend/apps/accounts/constants/permissions.py`:

```python
"""
LankaCommerce RBAC Permission Constants (Backend)

These permission strings are embedded in the JWT token's `permissions` claim
by the CustomTokenObtainPairSerializer and stored in CustomUser.permissions_list.

Frontend mirrors: frontend/src/constants/permissions.ts
"""


class PERMISSIONS:
    # -----------------------------------------------------------------------
    # Dashboard
    # -----------------------------------------------------------------------
    DASHBOARD_VIEW = "dashboard.view"

    # -----------------------------------------------------------------------
    # Products & Catalog
    # -----------------------------------------------------------------------
    PRODUCTS_VIEW = "products.view"
    PRODUCTS_CREATE = "products.create"
    PRODUCTS_EDIT = "products.edit"
    PRODUCTS_DELETE = "products.delete"
    PRODUCTS_IMPORT = "products.import"
    PRODUCTS_EXPORT = "products.export"

    # -----------------------------------------------------------------------
    # Categories
    # -----------------------------------------------------------------------
    CATEGORIES_VIEW = "categories.view"
    CATEGORIES_CREATE = "categories.create"
    CATEGORIES_EDIT = "categories.edit"
    CATEGORIES_DELETE = "categories.delete"

    # -----------------------------------------------------------------------
    # Stock / Inventory
    # -----------------------------------------------------------------------
    STOCK_VIEW = "stock.view"
    STOCK_ADJUST = "stock.adjust"
    STOCK_RECEIVE = "stock.receive"
    STOCK_TRANSFER = "stock.transfer"
    STOCK_WRITE_OFF = "stock.write_off"

    # -----------------------------------------------------------------------
    # Point of Sale
    # -----------------------------------------------------------------------
    SALES_CREATE = "sales.create"
    SALES_VIEW = "sales.view"
    SALES_VOID = "sales.void"
    SALES_DISCOUNT = "sales.discount"
    SALES_REFUND = "sales.refund"
    SALES_EXPORT = "sales.export"

    # -----------------------------------------------------------------------
    # Payments
    # -----------------------------------------------------------------------
    PAYMENTS_VIEW = "payments.view"
    PAYMENTS_PROCESS = "payments.process"
    PAYMENTS_REFUND = "payments.refund"

    # -----------------------------------------------------------------------
    # Customers / CRM
    # -----------------------------------------------------------------------
    CUSTOMERS_VIEW = "customers.view"
    CUSTOMERS_CREATE = "customers.create"
    CUSTOMERS_EDIT = "customers.edit"
    CUSTOMERS_DELETE = "customers.delete"
    CUSTOMERS_EXPORT = "customers.export"

    # -----------------------------------------------------------------------
    # Suppliers
    # -----------------------------------------------------------------------
    SUPPLIERS_VIEW = "suppliers.view"
    SUPPLIERS_CREATE = "suppliers.create"
    SUPPLIERS_EDIT = "suppliers.edit"
    SUPPLIERS_DELETE = "suppliers.delete"

    # -----------------------------------------------------------------------
    # Staff Management
    # -----------------------------------------------------------------------
    STAFF_VIEW = "staff.view"
    STAFF_CREATE = "staff.create"
    STAFF_EDIT = "staff.edit"
    STAFF_DELETE = "staff.delete"
    STAFF_FORCE_LOGOUT = "staff.force_logout"

    # -----------------------------------------------------------------------
    # Reports & Analytics
    # -----------------------------------------------------------------------
    REPORTS_VIEW = "reports.view"
    REPORTS_EXPORT = "reports.export"
    REPORTS_FINANCIAL = "reports.financial"

    # -----------------------------------------------------------------------
    # Expenses
    # -----------------------------------------------------------------------
    EXPENSES_VIEW = "expenses.view"
    EXPENSES_CREATE = "expenses.create"
    EXPENSES_APPROVE = "expenses.approve"

    # -----------------------------------------------------------------------
    # Promotions
    # -----------------------------------------------------------------------
    PROMOTIONS_VIEW = "promotions.view"
    PROMOTIONS_CREATE = "promotions.create"
    PROMOTIONS_EDIT = "promotions.edit"
    PROMOTIONS_DELETE = "promotions.delete"

    # -----------------------------------------------------------------------
    # Store Settings
    # -----------------------------------------------------------------------
    SETTINGS_VIEW = "settings.view"
    SETTINGS_EDIT = "settings.edit"

    # -----------------------------------------------------------------------
    # Billing (SaaS-level)
    # -----------------------------------------------------------------------
    BILLING_VIEW = "billing.view"
    BILLING_MANAGE = "billing.manage"

    # -----------------------------------------------------------------------
    # Audit Log
    # -----------------------------------------------------------------------
    AUDIT_VIEW = "audit.view"


# All permissions as a flat list (used for validation and seeding)
ALL_PERMISSIONS: list[str] = [
    v for k, v in vars(PERMISSIONS).items()
    if not k.startswith("_") and isinstance(v, str)
]


# -----------------------------------------------------------------------
# Role-to-permissions mapping
# Maps each role to its default set of permission strings.
# SUPER_ADMIN is granted all permissions implicitly (see HasPermission class).
# -----------------------------------------------------------------------

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "SUPER_ADMIN": ALL_PERMISSIONS,

    "OWNER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.PRODUCTS_IMPORT,
        PERMISSIONS.PRODUCTS_EXPORT,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_CREATE,
        PERMISSIONS.CATEGORIES_EDIT,
        PERMISSIONS.CATEGORIES_DELETE,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.STOCK_TRANSFER,
        PERMISSIONS.STOCK_WRITE_OFF,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_VOID,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.SALES_REFUND,
        PERMISSIONS.SALES_EXPORT,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.PAYMENTS_REFUND,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.CUSTOMERS_DELETE,
        PERMISSIONS.CUSTOMERS_EXPORT,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.SUPPLIERS_CREATE,
        PERMISSIONS.SUPPLIERS_EDIT,
        PERMISSIONS.SUPPLIERS_DELETE,
        PERMISSIONS.STAFF_VIEW,
        PERMISSIONS.STAFF_CREATE,
        PERMISSIONS.STAFF_EDIT,
        PERMISSIONS.STAFF_DELETE,
        PERMISSIONS.STAFF_FORCE_LOGOUT,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
        PERMISSIONS.REPORTS_FINANCIAL,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.EXPENSES_CREATE,
        PERMISSIONS.EXPENSES_APPROVE,
        PERMISSIONS.PROMOTIONS_VIEW,
        PERMISSIONS.PROMOTIONS_CREATE,
        PERMISSIONS.PROMOTIONS_EDIT,
        PERMISSIONS.PROMOTIONS_DELETE,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.AUDIT_VIEW,
    ],

    "MANAGER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_CREATE,
        PERMISSIONS.CATEGORIES_EDIT,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.STOCK_TRANSFER,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_VOID,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.SALES_REFUND,
        PERMISSIONS.SALES_EXPORT,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.STAFF_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.EXPENSES_CREATE,
        PERMISSIONS.PROMOTIONS_VIEW,
        PERMISSIONS.PROMOTIONS_CREATE,
        PERMISSIONS.PROMOTIONS_EDIT,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.AUDIT_VIEW,
    ],

    "CASHIER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
    ],

    "STOCK_CLERK": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.SUPPLIERS_VIEW,
    ],
}
```

---

### Step 2 — Create Django DRF Permission Classes

Create `backend/apps/accounts/permissions.py`:

```python
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

from .constants.permissions import PERMISSIONS


class HasPermission(BasePermission):
    """
    Checks that the authenticated user's JWT contains the required permission string.

    Usage:
        permission_classes = [IsAuthenticated, HasPermission("products.create")]

    The required permission is read from the JWT payload's `permissions` list,
    which is embedded by CustomTokenObtainPairSerializer.
    """

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        # SUPER_ADMIN has all permissions implicitly
        if getattr(request.user, "role", None) == "SUPER_ADMIN":
            return True

        # Read permissions from JWT payload (already decoded by JWTAuthentication)
        # The permissions list is stored in the token and accessible via the auth token
        auth_token = getattr(request.auth, "payload", {})
        permissions_in_token = auth_token.get("permissions", [])

        # Fall back to DB if not in token
        if not permissions_in_token:
            permissions_in_token = getattr(request.user, "permissions_list", [])

        return self.required_permission in permissions_in_token


class IsRole(BasePermission):
    """
    Checks that the authenticated user has one of the specified roles.

    Usage:
        permission_classes = [IsAuthenticated, IsRole("OWNER", "MANAGER")]
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
            and getattr(request.user, "role", None) in ("SUPER_ADMIN", "OWNER", "MANAGER")
        )


class SameTenantOrSuperAdmin(BasePermission):
    """
    Ensures the user is accessing resources within their own tenant,
    unless they are a SUPER_ADMIN.
    
    Views using this permission must set `tenant_id` on the view or 
    include it in the URL kwargs.
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
        # obj must have a tenant_id attribute
        obj_tenant_id = getattr(obj, "tenant_id", None)
        user_tenant_id = getattr(request.user, "tenant_id", None)
        return obj_tenant_id is not None and obj_tenant_id == user_tenant_id
```

---

### Step 3 — Apply Permissions to Existing Views

Open `backend/apps/accounts/views.py` and update the `ForceLogoutView` stub (which will be fully implemented in Task 01.02.09) to reference the new permission class. For now, document the pattern:

```python
# At the top of views.py, add this import for future use
from .permissions import IsOwnerOrAbove, HasPermission
```

This confirms the import path is correct. Full usage is demonstrated in Task 01.02.09.

---

### Step 4 — Create Frontend Permissions Constants

Create `frontend/src/constants/permissions.ts`:

```typescript
/**
 * LankaCommerce RBAC Permission Constants (Frontend)
 *
 * Mirrors backend/apps/accounts/constants/permissions.py
 * These strings must stay in sync with the Python constants.
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Products & Catalog
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_IMPORT: "products.import",
  PRODUCTS_EXPORT: "products.export",

  // Categories
  CATEGORIES_VIEW: "categories.view",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_EDIT: "categories.edit",
  CATEGORIES_DELETE: "categories.delete",

  // Stock / Inventory
  STOCK_VIEW: "stock.view",
  STOCK_ADJUST: "stock.adjust",
  STOCK_RECEIVE: "stock.receive",
  STOCK_TRANSFER: "stock.transfer",
  STOCK_WRITE_OFF: "stock.write_off",

  // Point of Sale
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_VOID: "sales.void",
  SALES_DISCOUNT: "sales.discount",
  SALES_REFUND: "sales.refund",
  SALES_EXPORT: "sales.export",

  // Payments
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_PROCESS: "payments.process",
  PAYMENTS_REFUND: "payments.refund",

  // Customers / CRM
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CUSTOMERS_EXPORT: "customers.export",

  // Suppliers
  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_EDIT: "suppliers.edit",
  SUPPLIERS_DELETE: "suppliers.delete",

  // Staff
  STAFF_VIEW: "staff.view",
  STAFF_CREATE: "staff.create",
  STAFF_EDIT: "staff.edit",
  STAFF_DELETE: "staff.delete",
  STAFF_FORCE_LOGOUT: "staff.force_logout",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_FINANCIAL: "reports.financial",

  // Expenses
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_APPROVE: "expenses.approve",

  // Promotions
  PROMOTIONS_VIEW: "promotions.view",
  PROMOTIONS_CREATE: "promotions.create",
  PROMOTIONS_EDIT: "promotions.edit",
  PROMOTIONS_DELETE: "promotions.delete",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  // Billing
  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",

  // Audit
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];
```

---

### Step 5 — Create the Frontend hasPermission Utility

Create `frontend/src/lib/utils/permissions.ts`:

```typescript
import type { UserPayload } from "@/stores/authStore";
import type { PermissionValue } from "@/constants/permissions";

/**
 * Returns true if the user has the specified permission.
 *
 * SUPER_ADMIN is implicitly granted all permissions.
 */
export function hasPermission(
  user: UserPayload | null,
  permission: PermissionValue
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return user.permissions.includes(permission);
}

/**
 * Returns true if the user has ALL of the specified permissions.
 */
export function hasAllPermissions(
  user: UserPayload | null,
  permissions: PermissionValue[]
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return permissions.every((p) => user.permissions.includes(p));
}

/**
 * Returns true if the user has ANY of the specified permissions.
 */
export function hasAnyPermission(
  user: UserPayload | null,
  permissions: PermissionValue[]
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return permissions.some((p) => user.permissions.includes(p));
}
```

---

### Step 6 — Create the Frontend usePermissions Hook

Create `frontend/src/hooks/usePermissions.ts`:

```typescript
"use client";

import { useAuthStore } from "@/stores/authStore";
import type { PermissionValue } from "@/constants/permissions";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from "@/lib/utils/permissions";

/**
 * usePermissions — React hook for RBAC permission checks in Client Components.
 *
 * Reads the current user's permissions and role from the Zustand auth store.
 *
 * Usage:
 *   const { can, canAll, canAny, role, isSuperAdmin } = usePermissions();
 *
 *   if (can("products.create")) { ... }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  return {
    /** Check if the user has a single permission. */
    can: (permission: PermissionValue): boolean =>
      hasPermission(user, permission),

    /** Check if the user has all of the provided permissions. */
    canAll: (permissions: PermissionValue[]): boolean =>
      hasAllPermissions(user, permissions),

    /** Check if the user has any of the provided permissions. */
    canAny: (permissions: PermissionValue[]): boolean =>
      hasAnyPermission(user, permissions),

    /** The user's current role. */
    role: user?.role ?? null,

    /** True if the current user is a SUPER_ADMIN. */
    isSuperAdmin: user?.role === "SUPER_ADMIN",

    /** True if the current user is an OWNER or above. */
    isOwnerOrAbove:
      user?.role === "SUPER_ADMIN" || user?.role === "OWNER",

    /** True if the current user is a MANAGER or above. */
    isManagerOrAbove:
      user?.role === "SUPER_ADMIN" ||
      user?.role === "OWNER" ||
      user?.role === "MANAGER",

    /** The authenticated user payload, or null if not logged in. */
    user,
  };
}
```

---

### Step 7 — Verify Coverage

Open the Django shell and verify the permission constants:

```bash
cd backend
poetry run python manage.py shell -c "
from apps.accounts.constants.permissions import ALL_PERMISSIONS, ROLE_PERMISSIONS
print(f'Total permissions defined: {len(ALL_PERMISSIONS)}')
print(f'CASHIER permissions: {len(ROLE_PERMISSIONS[\"CASHIER\"])}')
print(f'STOCK_CLERK permissions: {len(ROLE_PERMISSIONS[\"STOCK_CLERK\"])}')
print()
# Verify CASHIER cannot void sales
from apps.accounts.constants.permissions import PERMISSIONS
print('CASHIER can void sales:', PERMISSIONS.SALES_VOID in ROLE_PERMISSIONS['CASHIER'])  # False
print('CASHIER can view customers:', PERMISSIONS.CUSTOMERS_VIEW in ROLE_PERMISSIONS['CASHIER'])  # True
print('STOCK_CLERK can create sales:', PERMISSIONS.SALES_CREATE in ROLE_PERMISSIONS['STOCK_CLERK'])  # False
print('STOCK_CLERK can receive stock:', PERMISSIONS.STOCK_RECEIVE in ROLE_PERMISSIONS['STOCK_CLERK'])  # True
"
```

---

## Expected Output

After completing this task:

```
backend/
  apps/
    accounts/
      constants/
        __init__.py
        permissions.py        ← PERMISSIONS class, ALL_PERMISSIONS, ROLE_PERMISSIONS
      permissions.py          ← HasPermission, IsRole, IsSuperAdmin, IsOwnerOrAbove,
                                IsManagerOrAbove, SameTenantOrSuperAdmin

frontend/
  src/
    constants/
      permissions.ts          ← PERMISSIONS object (mirrors Python), PermissionValue type
    lib/
      utils/
        permissions.ts        ← hasPermission, hasAllPermissions, hasAnyPermission
    hooks/
      usePermissions.ts       ← usePermissions() hook with can/canAll/canAny/role
```

---

## Validation

- [ ] `backend/apps/accounts/constants/permissions.py` defines the `PERMISSIONS` class with 50+ permission strings
- [ ] `ALL_PERMISSIONS` is a flat list of all permission string values
- [ ] `ROLE_PERMISSIONS` maps all five roles to their default permission lists
- [ ] `CASHIER` does not have `sales.void`, `sales.refund`, `staff.create`, or `settings.edit`
- [ ] `STOCK_CLERK` does not have `sales.create`, `payments.process`, or `reports.financial`
- [ ] `SUPER_ADMIN` has all permissions in `ROLE_PERMISSIONS["SUPER_ADMIN"]`
- [ ] `HasPermission` DRF class grants access when the JWT `permissions` claim contains the required string
- [ ] `HasPermission` implicitly grants all permissions to `SUPER_ADMIN` role
- [ ] `IsRole`, `IsSuperAdmin`, `IsOwnerOrAbove`, `IsManagerOrAbove` DRF classes check the `role` attribute
- [ ] `SameTenantOrSuperAdmin` allows SUPER_ADMIN through and checks `tenant_id` on object-level for others
- [ ] `frontend/src/constants/permissions.ts` exports the same permission strings as the Python module
- [ ] `PermissionValue` is the union type of all permission string values
- [ ] `hasPermission()` returns `true` for SUPER_ADMIN on any permission
- [ ] `hasPermission()` returns `false` for `null` user
- [ ] `usePermissions()` reads from `useAuthStore` (not from `useSession`)
- [ ] `usePermissions()` exposes `can`, `canAll`, `canAny`, `role`, `isSuperAdmin`, `isOwnerOrAbove`, `isManagerOrAbove`
- [ ] Django shell verification confirms CASHIER cannot void sales and STOCK_CLERK cannot create sales

---

## Notes

- The `HasPermission` class reads permissions from both the JWT token payload (`request.auth.payload`) and the database user object (`request.user.permissions_list`). The JWT payload is the primary source; the DB is the fallback for edge cases where the token serializer did not embed permissions.
- When a user's role changes (e.g., CASHIER promoted to MANAGER), they must log out and log back in to get a new JWT with updated permissions. Short token lifetimes (15 min) naturally limit the window of stale permissions.
- The `ROLE_PERMISSIONS` map defines *default* permissions per role. The `CustomUser.permissions_list` field can override this for individual users (e.g., a CASHIER with an explicit `sales.refund` grant). Future SubPhases will implement a UI for per-user permission overrides.
- Keep the Python and TypeScript permission constant files in sync manually. A future improvement could auto-generate the TypeScript constants from the Python source using a management command.
