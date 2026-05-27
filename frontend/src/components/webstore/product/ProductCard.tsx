/**
 * ProductCard
 *
 * Reusable product card used by FeaturedCollection, ProductGrid, and any
 * other block that displays a grid of products.
 *
 * Variants of `cardStyle`:
 *   - standard   — image (1:1 or 3:4) + info below, "Add to Cart" on hover
 *   - compact    — smaller image, condensed info
 *   - horizontal — image on left, info on right (for list-style layouts)
 */

"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/webstore/cartStore";
import type { ProductSummary } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Price display
// ---------------------------------------------------------------------------

function Price({
  priceRange,
  compareAtPriceRange,
  currency,
}: {
  priceRange: { min: string; max: string };
  compareAtPriceRange: { min: string; max: string } | null;
  currency: string;
}) {
  const fmt = (v: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(parseFloat(v));

  const minPrice = parseFloat(priceRange.min);
  const compareMin = compareAtPriceRange ? parseFloat(compareAtPriceRange.min) : null;
  const onSale = compareMin !== null && compareMin > minPrice;

  return (
    <span className="flex items-baseline gap-1.5 flex-wrap">
      <span
        className={`text-sm font-semibold${onSale ? " text-red-600" : ""}`}
        style={onSale ? undefined : { color: "var(--ws-color-text)" }}
      >
        {fmt(priceRange.min)}
      </span>
      {onSale && compareAtPriceRange && (
        <span
          className="text-xs line-through"
          style={{ color: "var(--ws-color-text)", opacity: 0.5 }}
        >
          {fmt(compareAtPriceRange.min)}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sale badge
// ---------------------------------------------------------------------------

function SaleBadge() {
  return (
    <span
      className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: "var(--ws-color-primary)" }}
      aria-label="On sale"
    >
      Sale
    </span>
  );
}

// ---------------------------------------------------------------------------
// Quick Add button
// ---------------------------------------------------------------------------

interface QuickAddProps {
  product: ProductSummary;
  isPreview: boolean;
}

function QuickAddButton({ product, isPreview }: QuickAddProps) {
  const addItem = useCartStore((s) => s.addItem);
  const defaultVariant = product.variants?.[0];

  if (!defaultVariant) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPreview) return;
    addItem(
      product.id,
      defaultVariant.id,
      1,
      {
        title: product.title,
        variantTitle: defaultVariant.title,
        sku: defaultVariant.sku,
        price: Math.round(parseFloat(defaultVariant.price) * 100),
        imageUrl: product.featured_image_url ?? "",
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isPreview
          ? "Not available in preview"
          : `Add ${product.title} to cart`
      }
      title={isPreview ? "Not available in preview" : undefined}
      disabled={isPreview || !defaultVariant.is_available}
      className="flex w-full items-center justify-center gap-2 rounded-b-md py-2 text-xs font-semibold text-white opacity-0 transition-all duration-200 group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ backgroundColor: "var(--ws-color-primary)" }}
    >
      <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
      {isPreview ? "Preview only" : "Quick Add"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

export interface ProductCardProps {
  product: ProductSummary;
  cardStyle?: "standard" | "compact" | "horizontal";
  showQuickAdd?: boolean;
  showVendor?: boolean;
  showSaleBadge?: boolean;
  isPreview: boolean;
  currency?: string;
}

export function ProductCard({
  product,
  cardStyle = "standard",
  showQuickAdd = true,
  showVendor = false,
  showSaleBadge = true,
  isPreview,
  currency = "USD",
}: ProductCardProps) {
  const onSale =
    product.compare_at_price_range !== null &&
    product.compare_at_price_range !== undefined &&
    parseFloat(product.compare_at_price_range.min) > parseFloat(product.price_range.min);

  if (cardStyle === "horizontal") {
    return (
      <Link
        href={`/products/${product.handle}`}
        className="group flex gap-4 rounded-lg border p-3 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
        style={{ borderColor: "var(--ws-color-secondary)", backgroundColor: "var(--ws-color-background)" }}
      >
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
          {product.featured_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featured_image_url}
              alt={product.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs text-gray-400">No image</span>
            </div>
          )}
          {showSaleBadge && onSale && <SaleBadge />}
        </div>
        <div className="flex flex-col justify-center gap-1">
          {showVendor && (
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ws-color-primary)" }}>
              {product.category?.name}
            </p>
          )}
          <p
            className="line-clamp-2 text-sm font-medium"
            style={{ color: "var(--ws-color-text)" }}
          >
            {product.title}
          </p>
          <Price priceRange={product.price_range} compareAtPriceRange={product.compare_at_price_range ?? null} currency={currency} />
        </div>
      </Link>
    );
  }

  // standard / compact share the same vertical layout; compact has a smaller image.
  const isCompact = cardStyle === "compact";

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-lg"
      style={{
        borderColor: "var(--ws-color-secondary)",
        backgroundColor: "var(--ws-color-background)",
        borderOpacity: 0.2,
      }}
    >
      <Link
        href={`/products/${product.handle}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ws-color-primary)]"
        aria-label={product.title}
        tabIndex={0}
      >
        {/* Image */}
        <div
          className={`relative overflow-hidden bg-gray-100 ${isCompact ? "aspect-square" : "aspect-[3/4]"}`}
        >
          {product.featured_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.featured_image_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-sm text-gray-400">No image</span>
            </div>
          )}
          {showSaleBadge && onSale && <SaleBadge />}
        </div>

        {/* Info */}
        <div className={`flex flex-col gap-1 px-3 ${isCompact ? "py-2" : "py-3"}`}>
          {showVendor && (
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ws-color-primary)" }}
            >
              {product.category?.name}
            </p>
          )}
          <p
            className="line-clamp-2 text-sm font-medium leading-snug"
            style={{ color: "var(--ws-color-text)" }}
          >
            {product.title}
          </p>
          <Price
            priceRange={product.price_range}
            compareAtPriceRange={product.compare_at_price_range ?? null}
            currency={currency}
          />
        </div>
      </Link>

      {/* Quick Add — only for standard / compact */}
      {showQuickAdd && (
        <QuickAddButton product={product} isPreview={isPreview} />
      )}
    </div>
  );
}
