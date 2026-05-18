import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * GET /api/auth/refresh-session
 *
 * Attempts to refresh the access token using the refresh_token cookie.
 * On success: sets new access_token cookie and redirects to callbackUrl.
 * On failure: clears cookies and redirects to /login?sessionExpired=true.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/";

  if (!refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const data = (await response.json()) as {
      access: string;
      refresh?: string;
    };
    const isProduction = process.env.NODE_ENV === "production";

    const redirectResponse = NextResponse.redirect(
      new URL(callbackUrl, request.url)
    );

    redirectResponse.cookies.set("access_token", data.access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 15 * 60,
      path: "/",
    });

    if (data.refresh) {
      redirectResponse.cookies.set("refresh_token", data.refresh, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return redirectResponse;
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    const failResponse = NextResponse.redirect(loginUrl);
    failResponse.cookies.delete("access_token");
    failResponse.cookies.delete("refresh_token");
    return failResponse;
  }
}
