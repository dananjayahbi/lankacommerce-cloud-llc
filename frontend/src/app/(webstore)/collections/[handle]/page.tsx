/**
 * Collection Detail Page — Server Component
 *
 * Route: `/collections/[handle]`
 *
 * Supports URL-based filtering via search params:
 *   ?sort=price_asc | price_desc | title_asc | newest
 *   ?min_price=<cents>
 *   ?max_price=<cents>
 *   ?page=<n>
 *
 * Caching strategy:
 *   - Base page (no filters, page 1): ISR with `revalidate = 60`
 *   - Filtered / paginated pages: `cache: "no-store"` (always fresh)
 *
 * The collection_filters / product_grid sections in ThemeRenderer receive
 * the pre-fetched products via tenantData.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { ThemeRenderer } from "@/lib/webstore/themeRenderer";
import type { TenantData, CollectionData } from "@/lib/webstore/themeRenderer";
import type { ThemeConfig } from "@/lib/webstore/types";

// ---------------------------------------------------------------------------
// ISR (applies only when no filters are active — see fetchCollection logic)
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicWebstoreConfig {
  is_enabled: boolean;
  tenant_name: string;
  slug: string;
  currency: string;
  currency_symbol: string;
  logo_url: string | null;
  theme_config: ThemeConfig;
}

// ---------------------------------------------------------------------------
// Internal API base
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

interface FetchCollectionOptions {
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  isFiltered: boolean;
}

async function fetchCollection(
  slug: string,
  handle: string,
  opts: FetchCollectionOptions,
): Promise<CollectionData | null> {
  const url = new URL(
    `${INTERNAL_API}/api/webstore/public/${slug}/collections/${handle}/`,
  );
  if (opts.sort) url.searchParams.set("sort", opts.sort);
  if (opts.minPrice) url.searchParams.set("min_price", opts.minPrice);
  if (opts.maxPrice) url.searchParams.set("max_price", opts.maxPrice);
  if (opts.page && opts.page !== "1") url.searchParams.set("page", opts.page);

  try {
    const fetchOptions: RequestInit = opts.isFiltered
      ? { cache: "no-store" }
      : {
          next: {
            tags: [
              `webstore-${slug}`,
              `webstore-collection-${slug}-${handle}`,
            ],
          },
        };

    const res = await fetch(url.toString(), fetchOptions);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<CollectionData>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
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

  const collection = await fetchCollection(slug, handle, { isFiltered: false });
  if (!collection) return {};

  const meta = collection.collection;
  return {
    title: meta?.seo_title ?? meta?.title ?? collection.title,
    description: meta?.seo_description ?? (collection.description?.slice(0, 160)) ?? undefined,
    openGraph: {
      type: "website",
      title: meta?.title ?? collection.title,
      images: (meta?.image_url ?? collection.image_url) ? [meta?.image_url ?? collection.image_url!] : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CollectionDetailPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const { sort, min_price, max_price, page } = await searchParams;

  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  const isFiltered = !!(sort || min_price || max_price || (page && page !== "1"));

  const [config, collection] = await Promise.all([
    fetchConfig(slug),
    fetchCollection(slug, handle, {
      sort,
      minPrice: min_price,
      maxPrice: max_price,
      page,
      isFiltered,
    }),
  ]);

  if (!collection) notFound();
  if (!config) notFound();

  const collectionHandle = collection.collection?.handle ?? handle;

  const tenantData: TenantData = {
    tenant: {
      name: config.tenant_name,
      slug: config.slug,
      logo_url: config.logo_url,
      currency: config.currency,
      currency_symbol: config.currency_symbol,
    },
    collections: { [collectionHandle]: collection },
    products: {},
    menus: {},
  };

  return (
    <ThemeRenderer
      themeConfig={config.theme_config}
      template="collection"
      tenantData={tenantData}
      tenantSlug={slug}
    />
  );
}
