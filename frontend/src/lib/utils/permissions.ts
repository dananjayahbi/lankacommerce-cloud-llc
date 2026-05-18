import type { UserPayload } from "@/stores/authStore";
import type { PermissionValue } from "@/constants/permissions";

/**
 * Returns true if the user has the specified permission.
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
