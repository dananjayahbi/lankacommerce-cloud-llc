/**
 * ProductGrid Block
 *
 * Generic product grid — more configurable than FeaturedCollection.
 * Used on collection pages and as a general product showcase.
 * No section heading (use `CollectionHeader` for that).
 */

import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";
import { ProductCard } from "@/components/webstore/product/ProductCard";

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

export function ProductGrid({ settings, isPreview, tenantData }: BlockComponentProps) {
  const {
    collection_handle,
    products_to_show,
    columns_desktop,
    columns_mobile,
    show_price,
    show_vendor,
    show_sale_badge,
    enable_quick_add,
  } = settings;

  const handle = (collection_handle as string) ?? "";
  const collectionData = handle ? tenantData.collections[handle] : null;

  // When no handle is provided, fall back to the flat product map.
  const rawProducts = collectionData
    ? collectionData.products
    : Object.values(tenantData.products);

  const products = rawProducts.slice(0, (products_to_show as number) ?? 12);

  const desktopCols = DESKTOP_COL_MAP[(columns_desktop as string) ?? "4"] ?? "sm:grid-cols-4";
  const mobileCols = MOBILE_COL_MAP[(columns_mobile as string) ?? "2"] ?? "grid-cols-2";

  if (products.length === 0) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed"
        style={{ borderColor: "var(--ws-color-secondary)", opacity: 0.4 }}
      >
        <p className="text-sm" style={{ color: "var(--ws-color-text)" }}>
          No products available.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full py-8" style={{ backgroundColor: "var(--ws-color-background)" }}>
      <div className="mx-auto max-w-[var(--ws-max-width,1280px)] px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-4 ${mobileCols} ${desktopCols}`}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cardStyle="standard"
              showQuickAdd={(enable_quick_add as boolean) ?? true}
              showVendor={(show_vendor as boolean) ?? false}
              showSaleBadge={(show_sale_badge as boolean) ?? true}
              isPreview={isPreview}
              currency={tenantData.tenant.currency}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
