/**
 * Static Merchant Page — Server Component
 *
 * Route: `/pages/[handle]`
 *
 * Renders merchant-authored content pages (About Us, FAQ, Terms, etc.).
 * The `body_html` field is rendered via `dangerouslySetInnerHTML` — this is
 * safe because HTML is sanitized with `bleach` on the backend before saving.
 *
 * ISR: `revalidate = 60`
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { StorefrontChrome } from "@/components/webstore/layout/StorefrontChrome";

// ---------------------------------------------------------------------------
// ISR
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaticPage {
  handle: string;
  title: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
}

// ---------------------------------------------------------------------------
// Internal API base
// ---------------------------------------------------------------------------

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchPage(slug: string, handle: string): Promise<StaticPage | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/pages/${handle}/`,
      { next: { tags: [`webstore-${slug}`, `webstore-page-${slug}-${handle}`] } },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<StaticPage>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ handle: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { handle } = await params;
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) return {};

  const page = await fetchPage(slug, handle);
  if (!page) return {};

  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    openGraph: { type: "website", title: page.seo_title ?? page.title },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StaticMerchantPage({ params }: Props) {
  const { handle } = await params;
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  const page = await fetchPage(slug, handle);

  if (!page || !page.published) notFound();

  return (
    <StorefrontChrome tenantSlug={slug}>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1
          className="mb-8 text-3xl font-bold tracking-tight"
          style={{
            color: "var(--ws-color-text)",
            fontFamily: "var(--ws-font-heading)",
          }}
        >
          {page.title}
        </h1>
        <div
          className="prose prose-gray max-w-none"
          style={{ color: "var(--ws-color-text)" }}
          // Body HTML is sanitized server-side with bleach before persistence.
          dangerouslySetInnerHTML={{ __html: page.body_html }}
        />
      </main>
    </StorefrontChrome>
  );
}
