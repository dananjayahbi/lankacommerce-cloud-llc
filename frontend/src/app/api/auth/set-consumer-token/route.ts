import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/set-consumer-token
 *
 * Receives { access, refresh } consumer JWT tokens from the client-side
 * login/register handler and stores them as httpOnly cookies.
 *
 * Security:
 *   - Cookie is httpOnly → inaccessible to JavaScript (XSS protection)
 *   - Cookie name "consumer_access_token" is distinct from the staff
 *     "access_token" — they are completely independent auth realms
 *   - sameSite: "lax" allows the cookie to be sent on top-level navigations
 *     (e.g. PayHere redirect back to the success page)
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.access || !body?.refresh) {
    return NextResponse.json(
      { error: "access and refresh tokens are required." },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  // Consumer access token — 30 minutes (matches consumer_auth_service.py)
  cookieStore.set("consumer_access_token", body.access, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 60,
    path: "/",
  });

  // Consumer refresh token — 30 days
  cookieStore.set("consumer_refresh_token", body.refresh, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/auth/set-consumer-token
 *
 * Clears consumer auth cookies (used on consumer sign-out).
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("consumer_access_token");
  cookieStore.delete("consumer_refresh_token");
  return NextResponse.json({ success: true });
}
