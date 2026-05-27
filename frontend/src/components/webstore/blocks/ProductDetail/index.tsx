/**
 * ProductDetailBlock
 *
 * Full product detail section rendered inside ThemeRenderer when the
 * `product_detail` block type appears in the "product" template.
 *
 * Displays:
 *   - ProductGallery (images)
 *   - Product title, category, price / compare_at_price
 *   - Product description
 *   - VariantPicker (attribute selectors)
 *   - QuantitySelector
 *   - "Add to Cart" button
 *
 * This component is "use client" because it needs:
 *   - Zustand cartStore (useCartStore)
 *   - useState for selected variant + quantity
 *   - useRouter + useSearchParams for URL-synced variant selection
 */

"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, Plus, Minus, Package } from "lucide-react";
import type { BlockComponentProps, ProductSummary, ProductVariant } from "@/lib/webstore/themeRenderer";
import { ProductGallery } from "@/components/webstore/product/ProductGallery";
import { VariantPicker } from "@/components/webstore/product/VariantPicker";
import { useCartStore } from "@/lib/webstore/cartStore";

// ---------------------------------------------------------------------------
// Price helpers
// ---------------------------------------------------------------------------

/**
 * Parses a Decimal price string (e.g. "19.99") into an integer cents value
 * for the cart store (which stores prices as smallest currency unit).
 */
function parsePriceToCents(price: string | number): number {
  const num = typeof price === "number" ? price : parseFloat(price);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function fmtPrice(price: string | number, currency: string): string {
  const num = typeof price === "number" ? price : parseFloat(price);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

// ---------------------------------------------------------------------------
// QuantitySelector
// ---------------------------------------------------------------------------

function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-300 w-fit">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-9 w-9 items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-40"
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className="w-10 text-center text-sm font-medium"
        style={{ color: "var(--ws-color-text)" }}
        aria-label={`Quantity: ${value}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-9 w-9 items-center justify-center text-gray-600 hover:text-gray-900"
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductDetailBlock
// ---------------------------------------------------------------------------

export function ProductDetailBlock({ tenantData }: BlockComponentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const currency = tenantData.tenant.currency;

  // Resolve the product from tenantData — the product page puts exactly one
  // product in tenantData.products keyed by its handle.
  const product = Object.values(tenantData.products)[0] as ProductSummary | undefined;

  // Resolve initial selected variant from URL ?variant= param
  const variantParam = searchParams.get("variant");
  const variants = product?.variants ?? [];

  const initialVariant: ProductVariant | null =
    (variantParam ? variants.find((v) => v.id === variantParam) : undefined) ??
    variants.find((v) => v.is_available) ??
    variants[0] ??
    null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(initialVariant);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleVariantChange = useCallback(
    (variantId: string) => {
      const v = variants.find((v) => v.id === variantId) ?? null;
      setSelectedVariant(v);
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", variantId);
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [variants, router, searchParams],
  );

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant || !product) return;

    addItem(product.id, selectedVariant.id, quantity, {
      title: product.title,
      variantTitle: selectedVariant.title,
      sku: selectedVariant.sku,
      price: parsePriceToCents(selectedVariant.price),
      imageUrl: (product.images?.[0]?.url) ?? product.featured_image_url ?? "",
    });

    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  }, [selectedVariant, quantity, product, addItem, openCart]);

  // ---------- Render guard ----------
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Package className="h-12 w-12 text-gray-300" aria-hidden="true" />
        <p className="text-gray-400">Product not found.</p>
      </div>
    );
  }

  const images = product.images ?? (product.featured_image_url ? [{ url: product.featured_image_url, alt: product.title }] : []);
  const options = product.options ?? [];
  const isAvailable = selectedVariant?.is_available ?? false;

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      aria-label={product.title}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* ── Left: Gallery ──────────────────────────────────────────── */}
        <div>
          <ProductGallery images={images} productTitle={product.title} />
        </div>

        {/* ── Right: Product info + add to cart ──────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Category breadcrumb */}
          {product.category && (
            <p className="text-sm text-gray-400 uppercase tracking-wide">
              {product.category.name}
            </p>
          )}

          {/* Title */}
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ color: "var(--ws-color-text)" }}
          >
            {product.title}
          </h1>

          {/* Price */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3">
              <span
                className={`text-2xl font-bold ${
                  selectedVariant.compare_at_price &&
                  parseFloat(selectedVariant.compare_at_price) > parseFloat(selectedVariant.price)
                    ? "text-red-600"
                    : ""
                }`}
                style={
                  selectedVariant.compare_at_price &&
                  parseFloat(selectedVariant.compare_at_price) > parseFloat(selectedVariant.price)
                    ? undefined
                    : { color: "var(--ws-color-text)" }
                }
              >
                {fmtPrice(selectedVariant.price, currency)}
              </span>
              {selectedVariant.compare_at_price &&
                parseFloat(selectedVariant.compare_at_price) > parseFloat(selectedVariant.price) && (
                  <span
                    className="text-base line-through"
                    style={{ color: "var(--ws-color-text)", opacity: 0.5 }}
                  >
                    {fmtPrice(selectedVariant.compare_at_price, currency)}
                  </span>
                )}
              {selectedVariant.compare_at_price &&
                parseFloat(selectedVariant.compare_at_price) > parseFloat(selectedVariant.price) && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    SALE
                  </span>
                )}
            </div>
          )}

          {/* Availability */}
          <p className={`text-sm font-medium ${isAvailable ? "text-green-600" : "text-red-500"}`}>
            {isAvailable ? "In stock" : "Out of stock"}
          </p>

          {/* Variant picker */}
          {options.length > 0 && variants.length > 0 && (
            <VariantPicker
              options={options}
              variants={variants}
              selectedVariantId={selectedVariant?.id ?? null}
              onVariantChange={handleVariantChange}
            />
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <QuantitySelector value={quantity} onChange={setQuantity} />
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className="flex flex-1 min-w-[160px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "var(--ws-color-primary)" }}
                aria-label={added ? "Added to cart" : "Add to cart"}
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                {added ? "Added!" : isAvailable ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div
              className="prose prose-sm max-w-none border-t border-gray-100 pt-6"
              style={{ color: "var(--ws-color-text)" }}
            >
              <h2 className="text-base font-semibold mb-2">Description</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed opacity-80">
                {product.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 px-3 py-0.5 text-xs text-gray-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {product.related_products && product.related_products.length > 0 && (
        <div className="mt-16 border-t border-gray-100 pt-10">
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: "var(--ws-color-text)" }}
          >
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {product.related_products.map((rel) => (
              <a
                key={rel.id}
                href={`/products/${rel.handle}`}
                className="group flex flex-col gap-2"
              >
                {rel.featured_image_url ? (
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rel.featured_image_url}
                      alt={rel.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <p
                  className="text-sm font-medium line-clamp-2 group-hover:underline"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {rel.title}
                </p>
                {rel.price_range && (
                  <p className="text-sm" style={{ color: "var(--ws-color-primary)" }}>
                    {fmtPrice(rel.price_range.min, currency)}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
