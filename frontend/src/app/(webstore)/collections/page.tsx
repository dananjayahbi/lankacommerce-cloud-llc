/**
 * All Collections Page — Server Component
 *
 * Route: `/collections`
 *
 * Lists every published collection as a responsive grid of cards.
 * Each card shows the collection image, title, description excerpt, and
 * product count, linking to `/collections/<handle>`.
 *
 * ISR: `revalidate = 60`
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { StorefrontChrome } from "@/components/webstore/layout/StorefrontChrome";

// ---------------------------------------------------------------------------
// ISR
// ---------------------------------------------------------------------------

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionSummary {
  handle: string;
  title: string;
  description: string | null;
  image_url: string | null;
  product_count: number;
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

async function fetchCollections(slug: string): Promise<CollectionSummary[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/collections/`,
      { next: { tags: [`webstore-${slug}`] } },
    );
    if (!res.ok) return [];
    return res.json() as Promise<CollectionSummary[]>;
  } catch {
    return [];
  }
}

async function fetchTenantName(slug: string): Promise<string> {
  try {
    const res = await fetch(`${INTERNAL_API}/api/webstore/public/${slug}/config/`, {
      next: { tags: [`webstore-config-${slug}`] },
    });
    if (!res.ok) return slug;
    const data = (await res.json()) as { tenant_name: string };
    return data.tenant_name;
  } catch {
    return slug;
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  const name = slug ? await fetchTenantName(slug) : "";
  return { title: `Collections${name ? ` — ${name}` : ""}` };
}

// ---------------------------------------------------------------------------
// Collection card
// ---------------------------------------------------------------------------

function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        {collection.image_url ? (
          <Image
            src={collection.image_url}
            alt={collection.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-gray-300">🗂</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2
          className="text-base font-semibold leading-snug group-hover:underline"
          style={{ color: "var(--ws-color-text)" }}
        >
          {collection.title}
        </h2>
        {collection.description && (
          <p
            className="line-clamp-2 text-sm opacity-70"
            style={{ color: "var(--ws-color-text)" }}
          >
            {collection.description}
          </p>
        )}
        <p className="mt-auto pt-2 text-xs opacity-50" style={{ color: "var(--ws-color-text)" }}>
          {collection.product_count}{" "}
          {collection.product_count === 1 ? "product" : "products"}
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AllCollectionsPage() {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  const collections = await fetchCollections(slug);

  return (
    <StorefrontChrome tenantSlug={slug}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1
          className="mb-8 text-3xl font-bold tracking-tight"
          style={{ color: "var(--ws-color-text)", fontFamily: "var(--ws-font-heading)" }}
        >
          Collections
        </h1>

        {collections.length === 0 ? (
          <p className="text-center text-gray-400 py-20">
            No collections available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <CollectionCard key={col.handle} collection={col} />
            ))}
          </div>
        )}
      </main>
    </StorefrontChrome>
  );
}
