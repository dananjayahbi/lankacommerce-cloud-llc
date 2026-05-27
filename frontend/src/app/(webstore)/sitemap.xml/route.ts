/**
 * Dynamic Sitemap — Route Handler
 *
 * Route: GET /sitemap.xml  (on any webstore subdomain or custom domain)
 *
 * Generates a valid XML sitemap for the tenant's storefront, including:
 *  - Home page               (priority 1.0, weekly)
 *  - Product pages           (priority 0.8, daily)
 *  - Collection pages        (priority 0.7, weekly)
 *  - Static pages            (priority 0.5, monthly)
 *  - Blog posts              (priority 0.6, daily)
 *
 * The response is cached for 1 hour (ISR-style via Cache-Control).
 * Tagged with `webstore-<slug>` so on-demand revalidation flushes it.
 *
 * Returns a minimal empty sitemap if the store is not enabled or not found.
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrl(
  baseUrl: string,
  path: string,
  options: {
    lastmod?: string;
    changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: string;
  } = {},
): string {
  const loc = xmlEscape(`${baseUrl}${path}`);
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    options.lastmod ? `    <lastmod>${options.lastmod}</lastmod>` : "",
    options.changefreq ? `    <changefreq>${options.changefreq}</changefreq>` : "",
    options.priority ? `    <priority>${options.priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSitemap(urls: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Data fetchers (fire in parallel)
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  handle?: string;
  updated_at?: string;
}

interface Collection {
  id: string;
  handle: string;
  updated_at?: string;
}

interface Page {
  id: string;
  handle: string;
  updated_at?: string;
}

interface BlogPost {
  id: string;
  handle: string;
  published_at?: string;
}

async function fetchProducts(slug: string): Promise<Product[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/products/?page_size=200`,
      { next: { tags: [`webstore-products-${slug}`], revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { products: Product[] };
    return data.products ?? [];
  } catch {
    return [];
  }
}

async function fetchCollections(slug: string): Promise<Collection[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/collections/`,
      { next: { tags: [`webstore-collections-${slug}`], revalidate: 3600 } },
    );
    if (!res.ok) return [];
    return ((await res.json()) as Collection[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchBlogPosts(slug: string): Promise<BlogPost[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/blog/?page_size=200`,
      { next: { tags: [`webstore-blog-${slug}`], revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { posts: BlogPost[] };
    return data.posts ?? [];
  } catch {
    return [];
  }
}

async function fetchPages(slug: string): Promise<Page[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/pages/`,
      { next: { tags: [`webstore-${slug}`], revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Page[] | { pages: Page[] };
    return Array.isArray(data) ? data : (data.pages ?? []);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) {
    return new NextResponse(buildSitemap([]), {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Determine the canonical base URL for this store
  const host = headerStore.get("host") ?? `${slug}.lankacommerce.com`;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;
  const today = new Date().toISOString().split("T")[0]!;

  // Fire all fetches in parallel
  const [products, collections, blogPosts, staticPages] = await Promise.all([
    fetchProducts(slug),
    fetchCollections(slug),
    fetchBlogPosts(slug),
    fetchPages(slug),
  ]);

  const urls: string[] = [];

  // Home page
  urls.push(buildUrl(baseUrl, "/", { lastmod: today, changefreq: "weekly", priority: "1.0" }));

  // Product pages
  for (const product of products) {
    if (product.id) {
      const handle = product.handle ?? product.id;
      const lastmod = product.updated_at
        ? product.updated_at.split("T")[0]
        : today;
      urls.push(
        buildUrl(baseUrl, `/products/${handle}`, {
          lastmod,
          changefreq: "daily",
          priority: "0.8",
        }),
      );
    }
  }

  // Collection pages
  for (const collection of collections) {
    urls.push(
      buildUrl(baseUrl, `/collections/${collection.handle}`, {
        lastmod: collection.updated_at ? collection.updated_at.split("T")[0] : today,
        changefreq: "weekly",
        priority: "0.7",
      }),
    );
  }

  // Blog posts
  for (const post of blogPosts) {
    urls.push(
      buildUrl(baseUrl, `/blog/${post.handle}`, {
        lastmod: post.published_at ? post.published_at.split("T")[0] : today,
        changefreq: "daily",
        priority: "0.6",
      }),
    );
  }

  // Static pages
  for (const page of staticPages) {
    urls.push(
      buildUrl(baseUrl, `/pages/${page.handle}`, {
        lastmod: page.updated_at ? page.updated_at.split("T")[0] : today,
        changefreq: "monthly",
        priority: "0.5",
      }),
    );
  }

  const xml = buildSitemap(urls);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
