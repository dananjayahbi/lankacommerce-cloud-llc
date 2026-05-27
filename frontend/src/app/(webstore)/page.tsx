/**
 * Webstore Home Page — Server Component
 *
 * Route: `/` on any tenant subdomain (e.g. test-business.localhost:3000/)
 *
 * Data flow:
 *  1. Resolve tenant slug from the x-tenant-slug header set by middleware.
 *  2. Fetch the active theme config (shared with the layout — de-duplicated
 *     by Next.js's per-request fetch cache since the URL is identical).
 *  3. Parse the "index" template sections and discover which collection
 *     handles are referenced by featured_collection / product_grid blocks.
 *  4. Fetch all required collections in parallel.
 *  5. Assemble the TenantData payload and render <ThemeRenderer>.
 *
 * ISR: `revalidate = 60` — page is regenerated at most once per minute.
 * On-demand invalidation: tagged with `webstore-<slug>` so the Phase 3
 * publish endpoint can trigger an immediate revalidation.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { ThemeRenderer } from "@/lib/webstore/themeRenderer";
import type { TenantData, CollectionData } from "@/lib/webstore/themeRenderer";
import type { ThemeConfig } from "@/lib/webstore/types";
import { JsonLd } from "@/components/webstore/seo/JsonLd";

// ---------------------------------------------------------------------------
// ISR — reduced to 1 hour; on-demand revalidation handles freshness
// ---------------------------------------------------------------------------

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface PublicWebstoreConfig {
  is_enabled: boolean;
  is_password_protected: boolean;
  tenant_name: string;
  slug: string;
  currency: string;
  currency_symbol: string;
  logo_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  social_image_url: string | null;
  theme_config: ThemeConfig;
}

// ---------------------------------------------------------------------------
// Internal API base URL (server-to-server, no CORS)
// ---------------------------------------------------------------------------

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchConfig(slug: string): Promise<PublicWebstoreConfig | null> {
  try {
    const res = await fetch(`${INTERNAL_API}/api/webstore/public/${slug}/config/`, {
      next: { tags: [`webstore-config-${slug}`, `webstore-${slug}`] },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicWebstoreConfig>;
  } catch {
    return null;
  }
}

async function fetchCollection(slug: string, handle: string): Promise<CollectionData | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/collections/${handle}/`,
      {
        next: { tags: [`webstore-${slug}`, `webstore-collection-${slug}-${handle}`] },
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<CollectionData>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Collection handle discovery
// ---------------------------------------------------------------------------

/**
 * Walks the "index" template sections and returns every unique collection
 * handle referenced by featured_collection / product_grid blocks.
 */
function discoverCollectionHandles(config: ThemeConfig): string[] {
  const indexTemplate = config.templates["index"];
  if (!indexTemplate) return [];

  const handles = new Set<string>();

  for (const sectionId of indexTemplate.order) {
    const section = indexTemplate.sections[sectionId];
    if (!section || section.disabled) continue;

    if (
      section.type === "featured_collection" ||
      section.type === "product_grid"
    ) {
      const handle = section.settings["collection_handle"];
      if (typeof handle === "string" && handle) {
        handles.add(handle);
      }
    }
  }

  return Array.from(handles);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(
  _props: object,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) return {};

  const config = await fetchConfig(slug);
  if (!config) return {};

  return {
    title: config.seo_title ?? config.tenant_name,
    description: config.seo_description ?? undefined,
    openGraph: {
      type: "website",
      title: config.seo_title ?? config.tenant_name,
      description: config.seo_description ?? undefined,
      images: config.social_image_url ? [config.social_image_url] : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WebstoreHomePage() {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) {
    notFound();
  }

  const config = await fetchConfig(slug);

  if (!config || !config.is_enabled) {
    // Layout already handles is_enabled = false — this is a safety fallback.
    notFound();
  }

  // ── Parallel collection fetch ─────────────────────────────────────────────
  const collectionHandles = discoverCollectionHandles(config.theme_config);

  const collectionResults = await Promise.all(
    collectionHandles.map((handle) => fetchCollection(slug, handle)),
  );

  const collectionsMap: Record<string, CollectionData> = {};
  collectionHandles.forEach((handle, idx) => {
    const data = collectionResults[idx];
    if (data) collectionsMap[handle] = data;
  });

  // ── Tenant data payload ────────────────────────────────────────────────────
  const tenantData: TenantData = {
    tenant: {
      name: config.tenant_name,
      slug: config.slug,
      logo_url: config.logo_url,
      currency: config.currency,
      currency_symbol: config.currency_symbol,
    },
    collections: collectionsMap,
    products: {},
    menus: {},
  };

  // Organization JSON-LD for the store home page
  const host = `${slug}.lankacommerce.com`;
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.tenant_name,
    url: `https://${host}`,
    logo: config.logo_url ?? undefined,
  };

  return (
    <>
      <JsonLd schema={orgSchema} />
      <ThemeRenderer
        themeConfig={config.theme_config}
        template="index"
        tenantData={tenantData}
        tenantSlug={slug}
      />
    </>
  );
}
