/**
 * FeaturedCollection Block
 *
 * Renders a configurable grid of product cards from a chosen collection.
 * Products are pre-fetched by the ThemeRenderer page and injected via
 * `tenantData.collections[handle]` — this component makes no API calls.
 *
 * Supports 2/3/4/5 desktop columns and 1/2 mobile columns via Tailwind
 * classes combined with CSS custom properties for colours.
 */

import Link from "next/link";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";
import { ProductCard } from "@/components/webstore/product/ProductCard";

// ---------------------------------------------------------------------------
// Column class maps
// ---------------------------------------------------------------------------

const DESKTOP_COL_MAP: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-3",
  "4": "sm:grid-cols-4",
  "5": "sm:grid-cols-5",
};

const MOBILE_COL_MAP: Record<string, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
};

// ---------------------------------------------------------------------------
// FeaturedCollection
// ---------------------------------------------------------------------------

export function FeaturedCollection({
  settings,
  isPreview,
  tenantData,
}: BlockComponentProps) {
  const {
    collection_handle,
    heading,
    subheading,
    products_to_show,
    columns_desktop,
    columns_mobile,
    show_view_all,
    card_style,
  } = settings;

  const handle = (collection_handle as string) ?? "";
  const collectionData = tenantData.collections[handle];
  const products = collectionData?.products?.slice(0, (products_to_show as number) ?? 8) ?? [];

  const desktopCols = DESKTOP_COL_MAP[(columns_desktop as string) ?? "4"] ?? "sm:grid-cols-4";
  const mobileCols = MOBILE_COL_MAP[(columns_mobile as string) ?? "2"] ?? "grid-cols-2";

  return (
    <section className="w-full py-12" style={{ backgroundColor: "var(--ws-color-background)" }}>
      <div className="mx-auto max-w-[var(--ws-max-width,1280px)] px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {(heading || subheading) && (
          <div className="mb-8 text-center">
            {heading && (
              <h2
                className="text-2xl font-bold sm:text-3xl"
                style={{
                  color: "var(--ws-color-text)",
                  fontFamily: "var(--ws-font-heading)",
                }}
              >
                {heading as string}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2 text-sm sm:text-base"
                style={{ color: "var(--ws-color-text)", opacity: 0.7 }}
              >
                {subheading as string}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {products.length === 0 && (
          <div
            className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed"
            style={{ borderColor: "var(--ws-color-secondary)", opacity: 0.4 }}
          >
            <p className="text-sm" style={{ color: "var(--ws-color-text)" }}>
              {handle
                ? `No products found for collection "${handle}".`
                : "No collection selected."}
            </p>
          </div>
        )}

        {/* Product grid */}
        {products.length > 0 && (
          <div className={`grid gap-4 ${mobileCols} ${desktopCols}`}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cardStyle={
                  (card_style as "standard" | "compact" | "horizontal") ?? "standard"
                }
                showQuickAdd={true}
                showVendor={false}
                showSaleBadge={true}
                isPreview={isPreview}
                currency={tenantData.tenant.currency}
              />
            ))}
          </div>
        )}

        {/* View all link */}
        {show_view_all && collectionData && (
          <div className="mt-8 flex justify-center">
            <Link
              href={`/collections/${handle}`}
              className="rounded-md border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--ws-color-primary)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{
                borderColor: "var(--ws-color-primary)",
                color: "var(--ws-color-primary)",
              }}
            >
              View All {collectionData.title}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
