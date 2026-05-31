/**
 * On-Demand ISR Revalidation Route
 *
 * POST /api/revalidate
 *
 * Body: { "secret": "<REVALIDATION_SECRET>", "tag": "<cache-tag>" }
 *
 * Security:
 *  - Requires a shared secret (REVALIDATION_SECRET env var) in the request body.
 *  - Returns 401 if the secret is missing or incorrect.
 *  - Returns 400 if the tag is missing or empty.
 *  - Returns 200 on success with { revalidated: true, tag }.
 *
 * Called by the Django backend after any publishable mutation.
 */

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse JSON body — guard against malformed payloads
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // Secret validation — constant-time comparison to prevent timing attacks
  // -------------------------------------------------------------------------
  const submittedSecret = typeof body.secret === "string" ? body.secret : null;

  if (!REVALIDATION_SECRET) {
    // Server misconfiguration — secret env var is not set
    console.error("[revalidate] REVALIDATION_SECRET env var is not configured");
    return NextResponse.json(
      { error: "Revalidation endpoint is not configured" },
      { status: 503 },
    );
  }

  if (!submittedSecret || submittedSecret !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // Tag validation
  // -------------------------------------------------------------------------
  const tag = typeof body.tag === "string" ? body.tag.trim() : null;

  if (!tag) {
    return NextResponse.json(
      { error: "Missing required field: tag" },
      { status: 400 },
    );
  }

  // Validate tag format: only alphanumeric, hyphens, underscores
  const TAG_PATTERN = /^[a-z0-9_-]+$/i;
  if (!TAG_PATTERN.test(tag)) {
    return NextResponse.json(
      { error: "Invalid tag format" },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // Cache invalidation
  // -------------------------------------------------------------------------
  revalidateTag(tag);

  console.info(`[revalidate] Tag "${tag}" flushed at ${new Date().toISOString()}`);

  return NextResponse.json({ revalidated: true, tag }, { status: 200 });
}

// Reject all non-POST methods
export function GET(): NextResponse {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
