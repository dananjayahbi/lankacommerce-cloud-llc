import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * POST /api/auth/sign-out
 *
 * Reads the refresh token cookie, calls Django logout to blacklist it,
 * then clears both auth cookies.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const accessToken = cookieStore.get("access_token")?.value;

  // Attempt to blacklist the refresh token on Django
  if (refreshToken && accessToken) {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch {
      // Proceed with client-side logout even if the Django call fails
    }
  }

  // Clear auth cookies
  const response = NextResponse.json({ success: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");

  return response;
}
