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
    isOwnerOrAbove: user?.role === "SUPER_ADMIN" || user?.role === "OWNER",

    /** True if the current user is a MANAGER or above. */
    isManagerOrAbove:
      user?.role === "SUPER_ADMIN" ||
      user?.role === "OWNER" ||
      user?.role === "MANAGER",

    /** The authenticated user payload, or null if not logged in. */
    user,
  };
}
