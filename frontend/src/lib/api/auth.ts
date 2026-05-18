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
 */
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
