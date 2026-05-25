/**
 * LankaCommerce Auth API Utility
 *
 * Wraps all authentication-related API calls to the Django backend.
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
 * Pass `tenantSlug` when logging in from a tenant subdomain to scope the
 * authentication to that tenant only.
 */
export async function loginUser(
  email: string,
  password: string,
  tenantSlug?: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
    }),
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

/**
 * Refreshes the access token using the provided refresh token.
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
}

/**
 * Fetches the current user's profile from Django.
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

/**
 * Authenticates a user using their email and PIN.
 */
export async function loginWithPin(
  email: string,
  pin: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/api/auth/pin/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
    credentials: "include",
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "PIN login failed.",
    }));
    if (response.status === 429) {
      throw new Error("Too many attempts. Please wait before trying again.");
    }
    throw new Error(error.detail ?? "Invalid email or PIN.");
  }

  return response.json();
}

/**
 * Sets the user's PIN. Requires an authenticated access token.
 */
export async function setUserPin(
  pin: string,
  confirmPin: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/pin/set/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pin, confirm_pin: confirmPin }),
    credentials: "include",
  });

  if (!response.ok) {
    const error: AuthError = await response.json().catch(() => ({
      detail: "Failed to update PIN.",
    }));
    throw new Error(error.detail ?? "Failed to update PIN.");
  }
}

// ---------------------------------------------------------------------------
// SaaS self-registration
// ---------------------------------------------------------------------------

export interface RegisterBusinessPayload {
  store_name: string;
  slug?: string;
  owner_email: string;
  owner_password: string;
  timezone?: string;
  currency?: string;
}

export interface RegisterBusinessResponse {
  tenant: { id: string; name: string; slug: string };
  tokens: { access: string; refresh: string } | null;
  store_url: string;
  dev_hint: string | null;
}

/**
 * Self-register a new business on the platform.
 * Returns tenant info, JWT tokens for immediate login, and the subdomain URL.
 */
export async function registerBusiness(
  payload: RegisterBusinessPayload
): Promise<RegisterBusinessResponse> {
  const response = await fetch(`${API_BASE}/api/tenants/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new Error("Too many registration attempts. Please wait before trying again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: "Registration failed. Please try again.",
    }));
    const firstError =
      error.detail ??
      Object.values(error as Record<string, string[]>)
        .flat()
        .join(" ");
    throw new Error(firstError ?? "Registration failed.");
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Tenant public info (for branded login pages on subdomains)
// ---------------------------------------------------------------------------

export interface TenantPublicInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
}

/**
 * Fetches non-sensitive tenant metadata by slug.
 * Used to render the branded login page on a tenant subdomain.
 */
export async function getTenantPublicInfo(slug: string): Promise<TenantPublicInfo | null> {
  try {
    const response = await fetch(`${API_BASE}/api/tenants/${slug}/public/`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Checks if a slug is available for registration.
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean; slug: string }> {
  const response = await fetch(
    `${API_BASE}/api/tenants/check-slug/?slug=${encodeURIComponent(slug)}`
  );
  if (!response.ok) return { available: false, slug };
  return response.json();
}

