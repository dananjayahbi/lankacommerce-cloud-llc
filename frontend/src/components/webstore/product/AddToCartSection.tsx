/**
 * AddToCartSection — Client Component
 *
 * Renders the interactive portion of the product detail page:
 *   - VariantPicker (attribute selectors that update the URL ?variant= param)
 *   - QuantitySelector
 *   - "Add to Cart" button
 *
 * Lives outside ThemeRenderer so it can safely use React hooks and the cart
 * store while the rest of the product page remains a Server Component.
 *
 * URL variant sync: selecting a variant calls `router.replace` to update
 * `?variant=<id>` without adding to the history stack, enabling shareable
 * variant URLs and the browser back button returning to the previous variant.
 */

"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/lib/webstore/cartStore";
import type { ProductSummary, ProductVariant } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Price formatter
// ---------------------------------------------------------------------------

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

// ---------------------------------------------------------------------------
// VariantPicker
// ---------------------------------------------------------------------------

interface VariantPickerProps {
  product: ProductSummary & {
    options: Array<{ name: string; values: string[] }>;
  };
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
}

function VariantPicker({
  product,
  selectedVariant,
  onVariantChange,
}: VariantPickerProps) {
  const { options, variants } = product;

  if (!options || options.length === 0) return null;

  // Current attribute selections (option1, option2, option3)
  const currentAttrs = selectedVariant
    ? [
        selectedVariant.option1,
        selectedVariant.option2,
        selectedVariant.option3,
      ]
    : [null, null, null];

  function handleSelect(optionIndex: number, value: string) {
    // Build new attribute array with the changed option
    const newAttrs = [...currentAttrs] as [
      string | null,
      string | null,
      string | null,
    ];
    newAttrs[optionIndex] = value;

    // Find a variant that best matches the new attribute combo
    const match = variants.find((v) => {
      const vAttrs = [v.option1, v.option2, v.option3];
      return newAttrs.every((attr, i) => attr === null || vAttrs[i] === attr);
    });

    if (match) onVariantChange(match);
  }

  return (
    <div className="flex flex-col gap-4">
      {options.map((opt, idx) => (
        <div key={opt.name}>
          <p
            className="mb-2 text-sm font-medium"
            style={{ color: "var(--ws-color-text)" }}
          >
            {opt.name}:{" "}
            <span className="font-normal opacity-70">
              {currentAttrs[idx] ?? ""}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((value) => {
              const isSelected = currentAttrs[idx] === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(idx, value)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-transparent text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: "var(--ws-color-primary)",
                          borderColor: "var(--ws-color-primary)",
                        }
                      : undefined
                  }
                  aria-pressed={isSelected}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuantitySelector
// ---------------------------------------------------------------------------

interface QuantitySelectorProps {
  value: number;
  onChange: (qty: number) => void;
}

function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-300 w-fit">
      <button
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
// AddToCartSection
// ---------------------------------------------------------------------------

interface AddToCartSectionProps {
  product: ProductSummary & {
    description: string;
    options: Array<{ name: string; values: string[] }>;
  };
  selectedVariantId: string | null;
  tenantSlug: string;
  currency: string;
}

export function AddToCartSection({
  product,
  selectedVariantId,
  currency,
}: AddToCartSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  // Resolve selected variant from URL or passed prop
  const resolvedVariant =
    product.variants.find((v: ProductVariant) => v.id === selectedVariantId) ??
    product.variants.find((v: ProductVariant) => v.available) ??
    product.variants[0] ??
    null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    resolvedVariant,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleVariantChange = useCallback(
    (variant: ProductVariant) => {
      setSelectedVariant(variant);
      // Sync to URL without scroll or history entry
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", variant.id);
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) return;

    addItem(product.id, selectedVariant.id, quantity, {
      title: product.title,
      variantTitle: selectedVariant.title,
      sku: selectedVariant.sku,
      price: selectedVariant.price,
      imageUrl: selectedVariant.image_url ?? product.featured_image_url ?? "",
    });

    // Flash the "Added" label briefly then open the cart drawer
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1800);
  }, [selectedVariant, quantity, product, addItem, openCart]);

  const isAvailable = selectedVariant?.available ?? false;

  return (
    <div
      id="add-to-cart-section"
      className="flex flex-col gap-5 py-4 px-4 max-w-lg"
      data-product-id={product.id}
    >
      {/* Price */}
      {selectedVariant && (
        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              selectedVariant.compare_at_price !== null &&
              selectedVariant.compare_at_price > selectedVariant.price
                ? "text-red-600"
                : ""
            }`}
            style={
              selectedVariant.compare_at_price !== null &&
              selectedVariant.compare_at_price > selectedVariant.price
                ? undefined
                : { color: "var(--ws-color-text)" }
            }
          >
            {fmt(selectedVariant.price, currency)}
          </span>
          {selectedVariant.compare_at_price !== null &&
            selectedVariant.compare_at_price > selectedVariant.price && (
              <span
                className="text-base line-through"
                style={{ color: "var(--ws-color-text)", opacity: 0.5 }}
              >
                {fmt(selectedVariant.compare_at_price, currency)}
              </span>
            )}
        </div>
      )}

      {/* Variant picker */}
      <VariantPicker
        product={product as Parameters<typeof VariantPicker>[0]["product"]}
        selectedVariant={selectedVariant}
        onVariantChange={handleVariantChange}
      />

      {/* Quantity + Add to Cart */}
      <div className="flex items-center gap-3 flex-wrap">
        <QuantitySelector value={quantity} onChange={setQuantity} />

        <button
          onClick={handleAddToCart}
          disabled={!isAvailable}
          className="flex flex-1 min-w-[160px] items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "var(--ws-color-primary)" }}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          {!isAvailable
            ? "Out of Stock"
            : added
              ? "Added!"
              : "Add to Cart"}
        </button>
      </div>

      {/* Description */}
      {product.description && (
        <div
          className="prose prose-sm max-w-none mt-2"
          style={{ color: "var(--ws-color-text)" }}
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      )}
    </div>
  );
}
