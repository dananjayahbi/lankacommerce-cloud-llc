/**
 * Dynamic robots.txt — Route Handler
 *
 * Route: GET /robots.txt  (on any webstore subdomain or custom domain)
 *
 * Generates tenant-aware robots.txt:
 *  - Disabled store (is_enabled=false) → Disallow: /
 *  - Password-protected store          → Disallow: /
 *  - Live store                        → Standard open crawl + Sitemap URL
 *
 * Cache-Control: 1 hour with stale-while-revalidate fallback.
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

interface PublicWebstoreConfig {
  is_enabled: boolean;
  is_password_protected: boolean;
  slug: string;
}

async function fetchConfig(slug: string): Promise<PublicWebstoreConfig | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/config/`,
      { next: { tags: [`webstore-config-${slug}`], revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<PublicWebstoreConfig>;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  const host = headerStore.get("host") ?? "";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  if (!slug) {
    const body = "User-agent: *\nDisallow: /\n";
    return new NextResponse(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const config = await fetchConfig(slug);

  // Disallow crawling of stores that are disabled or password-protected
  if (!config || !config.is_enabled || config.is_password_protected) {
    const body = "User-agent: *\nDisallow: /\n";
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  // Live, open store — allow crawling
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Disallow internal / non-canonical paths",
    "Disallow: /api/",
    "Disallow: /account/",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /store/",
    "Disallow: /webstore-preview/",
    "",
  ];

  if (baseUrl) {
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  }

  const body = lines.join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
