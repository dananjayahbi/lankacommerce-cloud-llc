/**
 * Product Detail Page — Server Component
 *
 * Route: `/products/[handle]`
 *
 * Data flow:
 *  1. Resolve tenant slug from x-tenant-slug header.
 *  2. Fetch product by handle from the public API.
 *  3. notFound() if product doesn't exist or is unpublished.
 *  4. Extract the selected variant from ?variant= search params.
 *  5. Render ThemeRenderer with template="product" and product data injected
 *     into tenantData.
 *
 * ISR: `revalidate = 60` — individual product pages are regenerated at most
 * once per minute. Tagged per-product for on-demand invalidation.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { ThemeRenderer } from "@/lib/webstore/themeRenderer";
import type { TenantData, ProductSummary, ProductVariant } from "@/lib/webstore/themeRenderer";
import type { ThemeConfig } from "@/lib/webstore/types";
import { AddToCartSection } from "@/components/webstore/product/AddToCartSection";

// ---------------------------------------------------------------------------
// ISR
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface PublicProductDetail extends ProductSummary {
  description: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  options: Array<{ name: string; values: string[] }>;
}

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

async function fetchProduct(
  slug: string,
  handle: string,
): Promise<PublicProductDetail | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/products/${handle}/`,
      {
        next: {
          tags: [
            `webstore-${slug}`,
            `webstore-product-${slug}-${handle}`,
          ],
        },
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<PublicProductDetail>;
  } catch {
    return null;
  }
}

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ variant?: string }>;
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

  const product = await fetchProduct(slug, handle);
  if (!product) return {};

  const title = product.seo_title ?? product.title;
  const description =
    product.seo_description ??
    (product.description ? product.description.slice(0, 160) : undefined);

  const lowestPrice = Math.min(...product.variants.map((v: ProductVariant) => v.price));

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: product.featured_image_url ? [product.featured_image_url] : undefined,
    },
    other: {
      "product:price:amount": String(lowestPrice / 100),
      "product:price:currency": "LKR",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { variant: variantParam } = await searchParams;

  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  // Parallel fetch: config + product
  const [config, product] = await Promise.all([
    fetchConfig(slug),
    fetchProduct(slug, handle),
  ]);

  if (!product || !product.published) notFound();
  if (!config) notFound();

  // Resolve selected variant: URL param → first available → first variant
  const selectedVariant =
    (variantParam
      ? product.variants.find((v: ProductVariant) => v.id === variantParam)
      : undefined) ??
    product.variants.find((v: ProductVariant) => v.available) ??
    product.variants[0] ??
    null;

  const tenantData: TenantData = {
    tenant: {
      name: config.tenant_name,
      slug: config.slug,
      logo_url: config.logo_url,
      currency: config.currency,
      currency_symbol: config.currency_symbol,
    },
    collections: {},
    products: { [product.handle]: product },
    menus: {},
  };

  return (
    <>
      <ThemeRenderer
        themeConfig={config.theme_config}
        template="product"
        tenantData={tenantData}
        tenantSlug={slug}
      />
      {/*
       * AddToCartSection is a Client Component rendered outside ThemeRenderer
       * so it can access the cart store and URL search params. It is positioned
       * as a portal/overlay by the product_detail block; here we render it as
       * a data provider that individual blocks hydrate.
       */}
      <AddToCartSection
        product={product}
        selectedVariantId={selectedVariant?.id ?? null}
        tenantSlug={slug}
        currency={config.currency}
      />
    </>
  );
}
