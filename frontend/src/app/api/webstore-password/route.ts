/**
 * POST /api/webstore-password
 *
 * Handles the password-gate form submission.
 *
 * Verifies the submitted password against the backend, then:
 *   - On success: sets a signed httpOnly cookie and redirects to the store home
 *   - On failure: redirects back with an error query param
 *
 * The cookie is named `store-password-<slug>` so multiple stores can each
 * have independent unlock state.
 *
 * The password is NOT stored in the cookie — only a boolean confirmation.
 * The backend verifies the password via check_password() on each submission.
 */

import { type NextRequest, NextResponse } from "next/server";

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// Cookie max-age: 24 hours
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const slug = url.searchParams.get("slug");

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid store slug" }, { status: 400 });
  }

  let password: string;
  try {
    const formData = await request.formData();
    password = formData.get("password")?.toString() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!password) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.delete("slug");
    redirectUrl.searchParams.set("error", "Password is required");
    const res = NextResponse.redirect(redirectUrl);
    return res;
  }

  // Verify against the backend
  try {
    const verifyRes = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/verify-password/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        // Short timeout — if the backend is slow, fail gracefully
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!verifyRes.ok) {
      // Wrong password
      const redirectUrl = new URL(`https://${request.headers.get("host") ?? "localhost"}`);
      redirectUrl.searchParams.set("error", "Incorrect password");
      const res = NextResponse.redirect(redirectUrl.toString());
      return res;
    }
  } catch {
    // Network error — redirect back with generic error
    const host = request.headers.get("host") ?? "localhost";
    const res = NextResponse.redirect(
      `https://${host}/?error=Service+unavailable`,
    );
    return res;
  }

  // Password verified — set httpOnly cookie and redirect to home
  const host = request.headers.get("host") ?? "localhost";
  const isSecure = !host.startsWith("localhost") && !host.startsWith("127.0.0.1");
  const homeUrl = `${isSecure ? "https" : "http"}://${host}/`;

  const response = NextResponse.redirect(homeUrl);
  response.cookies.set({
    name: `store-password-${slug}`,
    value: "1",
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
