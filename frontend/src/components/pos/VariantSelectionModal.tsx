"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { MinusIcon, PlusIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types/catalog";

interface VariantSelectionModalProps {
  productId: string;
  products: Product[];
  onClose: () => void;
}

function buildVariantDescription(variant: ProductVariant): string {
  const parts: string[] = [];
  if (variant.size) parts.push(variant.size);
  if (variant.colour) parts.push(variant.colour);
  return parts.join(" / ") || variant.sku;
}

function formatPrice(price: string): string {
  return `Rs. ${parseFloat(price).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Derive axis values
interface VariantAxes {
  mode: "matrix" | "chips";
  rowAxis: string; // "size" | "colour"
  colAxis: string; // "size" | "colour"
  rowValues: string[];
  colValues: string[];
}

function deriveAxes(variants: ProductVariant[]): VariantAxes {
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  const colours = [...new Set(variants.map((v) => v.colour).filter(Boolean))] as string[];

  const hasSizes = sizes.length > 0;
  const hasColours = colours.length > 0;

  if (!hasSizes || !hasColours) {
    // Single-axis — chip mode
    return {
      mode: "chips",
      rowAxis: hasSizes ? "size" : "colour",
      colAxis: "",
      rowValues: hasSizes ? sizes : colours,
      colValues: [],
    };
  }

  // Two-axis matrix: put fewer distinct values as columns
  if (colours.length <= sizes.length) {
    return {
      mode: "matrix",
      rowAxis: "size",
      colAxis: "colour",
      rowValues: sizes,
      colValues: colours,
    };
  } else {
    return {
      mode: "matrix",
      rowAxis: "colour",
      colAxis: "size",
      rowValues: colours,
      colValues: sizes,
    };
  }
}

function findVariant(
  variants: ProductVariant[],
  axes: VariantAxes,
  rowValue: string,
  colValue: string,
): ProductVariant | undefined {
  return variants.find((v) => {
    const rowMatch = axes.rowAxis === "size" ? v.size === rowValue : v.colour === rowValue;
    const colMatch = axes.colAxis === "size" ? v.size === colValue : v.colour === colValue;
    return rowMatch && colMatch;
  });
}

function StockDot({ stock }: { stock: number }) {
  if (stock === 0) return null;
  if (stock <= 10) {
    return (
      <span className="absolute right-1 top-1 flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        <span className="font-inter text-[10px] text-[#F59E0B]">{stock}</span>
      </span>
    );
  }
  return null;
}

export function VariantSelectionModal({
  productId,
  products,
  onClose,
}: VariantSelectionModalProps) {
  const addItem = useCartStore((s) => s.addItem);

  const product = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((v) => !v.deleted_at),
    [product],
  );

  const axes = useMemo(() => deriveAxes(activeVariants), [activeVariants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const previewVariantId = hoveredVariantId ?? selectedVariantId;
  const previewVariant = activeVariants.find((v) => v.id === previewVariantId) ?? null;

  const selectedVariant =
    activeVariants.find((v) => v.id === selectedVariantId) ?? null;

  const isOpen = !!product;

  const handleAdd = () => {
    setInlineError(null);
    if (!selectedVariant) {
      setInlineError("Please select a variant before adding to cart.");
      return;
    }
    if (selectedVariant.stock_quantity === 0) {
      setInlineError("No stock available for this variant — it cannot be added to the cart.");
      return;
    }
    addItem({
      variantId: selectedVariant.id,
      productName: product!.name,
      variantDescription: buildVariantDescription(selectedVariant),
      sku: selectedVariant.sku,
      unitPrice: selectedVariant.retail_price,
      quantity,
    });
    toast.success(
      `Added ${quantity}× ${product!.name} ${buildVariantDescription(selectedVariant)}`,
      { duration: 2500 },
    );
    onClose();
  };

  const imageUrl = product?.variants?.[0]?.image_urls?.[0] ?? null;

  if (!product) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open, eventDetails) => {
        // Prevent accidental close from Escape or outside click
        const reason = (eventDetails as { reason?: string }).reason;
        if (!open && (reason === "escapeKey" || reason === "outsidePress")) return;
        if (!open) onClose();
      }}
      disablePointerDismissal={true}
    >
      <DialogContent
        className="max-w-[448px] gap-0 p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            {imageUrl && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0]">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-inter text-[18px] font-bold text-[#1B2B3A]">
                {product.name}
              </DialogTitle>
              {/* Price preview */}
              <p className="mt-1 font-mono text-[20px] font-semibold text-[#F97316]">
                {previewVariant
                  ? formatPrice(previewVariant.retail_price)
                  : formatPrice(activeVariants[0]?.retail_price ?? "0")}
              </p>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1B2B3A]"
            >
              <XIcon size={16} />
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Quantity stepper — top right */}
          <div className="mb-4 flex items-center justify-end gap-3">
            <span className="font-inter text-[13px] text-[#64748B]">Qty</span>
            <div className="flex items-center rounded-lg border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-l-lg text-[#1B2B3A] hover:bg-[#F1F5F9] disabled:opacity-40"
              >
                <MinusIcon size={14} />
              </button>
              <span className="w-8 text-center font-inter text-[14px] font-semibold text-[#1B2B3A]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99}
                className="flex h-8 w-8 items-center justify-center rounded-r-lg text-[#1B2B3A] hover:bg-[#F1F5F9] disabled:opacity-40"
              >
                <PlusIcon size={14} />
              </button>
            </div>
          </div>

          {/* Variant matrix or chips */}
          {axes.mode === "matrix" ? (
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div
                className="grid gap-1 pl-14"
                style={{
                  gridTemplateColumns: `repeat(${axes.colValues.length}, minmax(72px, 72px))`,
                }}
              >
                {axes.colValues.map((col) => (
                  <div
                    key={col}
                    className="text-center font-inter text-[11px] text-[#64748B]"
                  >
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {axes.rowValues.map((row) => (
                <div key={row} className="mt-1 flex items-center gap-1">
                  {/* Row label */}
                  <div className="w-12 shrink-0 font-inter text-[11px] text-[#64748B]">
                    {row}
                  </div>
                  {/* Cells */}
                  {axes.colValues.map((col) => {
                    const variant = findVariant(activeVariants, axes, row, col);
                    if (!variant) {
                      return (
                        <div
                          key={col}
                          className="h-14 w-[72px] rounded-lg border border-dashed border-[#E2E8F0] bg-[#F1F5F9] opacity-40"
                        />
                      );
                    }
                    const outOfStock = variant.stock_quantity === 0;
                    const isSelected = selectedVariantId === variant.id;

                    return (
                      <button
                        key={col}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setInlineError(null);
                        }}
                        onMouseEnter={() => setHoveredVariantId(variant.id)}
                        onMouseLeave={() => setHoveredVariantId(null)}
                        className={cn(
                          "relative h-14 w-[72px] rounded-lg border text-center transition-colors",
                          outOfStock
                            ? "cursor-not-allowed bg-[#F1F5F9] opacity-40"
                            : isSelected
                              ? "border-2 border-[#F97316] bg-[#1B2B3A] text-white"
                              : "border-[#E2E8F0] bg-white hover:border-[#1B2B3A] hover:bg-[#F1F5F9]",
                        )}
                      >
                        {outOfStock && (
                          <svg
                            className="pointer-events-none absolute inset-0 h-full w-full"
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="0"
                              y1="100%"
                              x2="100%"
                              y2="0"
                              stroke="#94A3B8"
                              strokeWidth="1"
                            />
                          </svg>
                        )}
                        {!outOfStock && <StockDot stock={variant.stock_quantity} />}
                        <span className="font-inter text-[12px]">
                          {axes.rowAxis === "size" ? variant.size : variant.colour}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            // Chip mode — single axis
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((variant) => {
                const label =
                  axes.rowAxis === "size"
                    ? variant.size ?? variant.sku
                    : variant.colour ?? variant.sku;
                const outOfStock = variant.stock_quantity === 0;
                const isSelected = selectedVariantId === variant.id;
                const lowStock =
                  variant.stock_quantity > 0 && variant.stock_quantity <= 10;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setInlineError(null);
                    }}
                    onMouseEnter={() => setHoveredVariantId(variant.id)}
                    onMouseLeave={() => setHoveredVariantId(null)}
                    className={cn(
                      "relative flex min-w-[56px] items-center gap-1 rounded-full border px-3 py-1.5 font-inter text-[13px] transition-colors",
                      outOfStock
                        ? "cursor-not-allowed border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8] opacity-50"
                        : isSelected
                          ? "border-2 border-[#F97316] bg-[#1B2B3A] text-white"
                          : "border-[#E2E8F0] bg-white text-[#1B2B3A] hover:border-[#1B2B3A] hover:bg-[#F1F5F9]",
                    )}
                  >
                    {label}
                    {lowStock && !outOfStock && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* SKU + stock info row */}
          <div className="mt-4 flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#64748B]">
              {previewVariant ? previewVariant.sku : "Select a variant"}
            </span>
            {previewVariant && (
              <span
                className={cn("font-inter text-[12px]", {
                  "text-[#64748B]": previewVariant.stock_quantity > 10,
                  "text-[#F59E0B]":
                    previewVariant.stock_quantity > 0 &&
                    previewVariant.stock_quantity <= 10,
                  "text-[#EF4444]": previewVariant.stock_quantity === 0,
                })}
              >
                {previewVariant.stock_quantity === 0
                  ? "Out of stock"
                  : previewVariant.stock_quantity <= 10
                    ? `${previewVariant.stock_quantity} left`
                    : `${previewVariant.stock_quantity} in stock`}
              </span>
            )}
          </div>

          {/* Inline error */}
          {inlineError && (
            <p className="mt-2 font-inter text-[12px] text-[#EF4444]">
              {inlineError}
            </p>
          )}
        </div>

        {/* Footer — Add to Cart */}
        <div className="border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedVariant || selectedVariant.stock_quantity === 0}
            className="w-full rounded-lg bg-[#1B2B3A] py-3 font-inter text-[15px] font-semibold text-white disabled:opacity-50"
          >
            Add {quantity} to Cart
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
