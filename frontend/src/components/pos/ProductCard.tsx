"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types/catalog";
import type { CartItem } from "@/types/pos";

interface ProductCardProps {
  product: Product;
  onAddDirectly: (item: Omit<CartItem, "id" | "discountPercent">) => void;
  onOpenVariantModal: (productId: string) => void;
}

function getTotalStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + (v.deleted_at ? 0 : v.stock_quantity), 0);
}

function getActiveVariants(variants: ProductVariant[]): ProductVariant[] {
  return variants.filter((v) => !v.deleted_at);
}

function getMinPrice(variants: ProductVariant[]): string {
  const active = getActiveVariants(variants);
  if (!active.length) return "0.00";
  let min = parseFloat(active[0]?.retail_price ?? "0");
  for (const v of active) {
    const p = parseFloat(v.retail_price);
    if (p < min) min = p;
  }
  return min.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildVariantDescription(variant: ProductVariant): string {
  const parts: string[] = [];
  if (variant.size) parts.push(variant.size);
  if (variant.colour) parts.push(variant.colour);
  return parts.join(" / ") || variant.sku;
}

export function ProductCard({
  product,
  onAddDirectly,
  onOpenVariantModal,
}: ProductCardProps) {
  const variants = product.variants ?? [];
  const activeVariants = getActiveVariants(variants);
  const totalStock = getTotalStock(variants);
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;

  const imageUrl =
    activeVariants[0]?.image_urls?.[0] ?? null;

  const handleClick = () => {
    if (isOutOfStock) {
      toast.error(
        "This product is out of stock — please remove it from the display or restock it.",
      );
      return;
    }

    if (activeVariants.length === 1) {
      const v = activeVariants[0];
      if (!v) return;
      onAddDirectly({
        variantId: v.id,
        productName: product.name,
        variantDescription: buildVariantDescription(v),
        sku: v.sku,
        unitPrice: v.retail_price,
        quantity: 1,
      });
      return;
    }

    onOpenVariantModal(product.id);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-left transition-shadow hover:shadow-md active:scale-[0.98]",
        isOutOfStock && "opacity-60",
      )}
      style={{ height: "165px" }}
    >
      {/* Image area — 60% */}
      <div className="relative h-[99px] w-full shrink-0 bg-[#F1F5F9]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="140px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag size={32} className="text-[#F97316]" />
          </div>
        )}

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="font-inter text-[12px] text-[#F97316]">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info area — 40% */}
      <div className="flex flex-1 flex-col justify-between px-2 py-1.5">
        <p
          className="font-inter text-[13px] font-medium leading-tight text-[#1B2B3A]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </p>

        <div className="flex items-end justify-between">
          <span className="font-mono text-[13px] font-semibold text-[#F97316]">
            Rs. {getMinPrice(activeVariants)}
          </span>

          {/* Stock badge */}
          {isLowStock && (
            <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-inter text-[10px] font-semibold text-[#F59E0B]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              Low
            </span>
          )}
          {isOutOfStock && !isLowStock && (
            <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-inter text-[10px] font-semibold text-[#EF4444]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
              OOS
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
