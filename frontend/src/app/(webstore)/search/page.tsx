/**
 * Search Page — Route Entry (Server Component wrapper)
 *
 * Route: `/search`
 *
 * Resolves tenant slug + currency server-side, then hands off to the
 * interactive client component.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SearchPageClient } from "@/components/webstore/search/SearchPageClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicWebstoreConfig {
  currency: string;
}

// ---------------------------------------------------------------------------
// Internal API base
// ---------------------------------------------------------------------------

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SearchPage({ searchParams }: Props) {
  const { q, sort } = await searchParams;
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  // Fetch currency for price formatting
  let currency = "LKR";
  try {
    const res = await fetch(`${INTERNAL_API}/api/webstore/public/${slug}/config/`, {
      next: { tags: [`webstore-config-${slug}`] },
    });
    if (res.ok) {
      const data = (await res.json()) as PublicWebstoreConfig;
      currency = data.currency ?? "LKR";
    }
  } catch {
    // Use default
  }

  return (
    <Suspense>
      <SearchPageClient
        tenantSlug={slug}
        currency={currency}
        initialQuery={q ?? ""}
        initialSort={sort ?? ""}
      />
    </Suspense>
  );
}
