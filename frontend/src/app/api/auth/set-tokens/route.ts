import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/set-tokens
 *
 * Receives { access, refresh } tokens from the client-side login handler
 * and sets them as httpOnly cookies. This prevents JavaScript from accessing
 * the tokens directly (XSS protection).
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

  cookieStore.set("access_token", body.access, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60, // 15 minutes — matches SimpleJWT ACCESS_TOKEN_LIFETIME
    path: "/",
  });

  cookieStore.set("refresh_token", body.refresh, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days — matches SimpleJWT REFRESH_TOKEN_LIFETIME
    path: "/",
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/auth/set-tokens
 *
 * Clears both auth cookies (used on logout).
 */
export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  return NextResponse.json({ success: true });
}
