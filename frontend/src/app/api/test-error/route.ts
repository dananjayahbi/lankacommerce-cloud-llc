import { NextResponse } from "next/server";

/**
 * Test route for verifying Sentry error capture.
 * Returns HTTP 404 in production — only active in development/preview.
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  throw new Error("Test error — Sentry integration check");
}
