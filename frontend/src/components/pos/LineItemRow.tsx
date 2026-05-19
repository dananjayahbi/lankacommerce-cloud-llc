"use client";

import { ShoppingBag, Minus, Plus, X } from "lucide-react";
import Decimal from "decimal.js";
import { useCartStore } from "@/stores/cartStore";
import { LineItemDiscountControl } from "./LineItemDiscountControl";
import { formatCurrency } from "@/lib/formatCurrency";
import type { CartItem } from "@/types/pos";

interface Props {
  item: CartItem;
}

export function LineItemRow({ item }: Props) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const setActiveLine = useCartStore((s) => s.setActiveLine);
  const activeLineId = useCartStore((s) => s.activeLineId);

  const isActive = activeLineId === item.variantId;

  const unitPrice = new Decimal(item.unitPrice);
  const quantity = new Decimal(item.quantity);
  const discountPercent = new Decimal(item.discountPercent);
  const lineGross = unitPrice.mul(quantity);
  const lineDiscount = lineGross.mul(discountPercent).div(100).toDecimalPlaces(2);
  const lineTotal = lineGross.sub(lineDiscount);

  const hasDiscount = discountPercent.gt(0);

  return (
    <div>
      {/* Main row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC]"
        onClick={(e) => {
          // Ignore clicks on interactive children
          const target = e.target as HTMLElement;
          if (
            target.closest("button") ||
            target.closest("input")
          )
            return;
          setActiveLine(item.variantId);
        }}
      >
        {/* Product icon placeholder */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9]">
          <ShoppingBag size={18} className="text-[#64748B]" />
        </div>

        {/* Text stack */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-inter text-[14px] font-medium text-[#1B2B3A]">
            {item.productName}
          </p>
          <p className="truncate font-inter text-[12px] text-[#64748B]">
            {item.variantDescription}
          </p>
          {hasDiscount && (
            <span className="mt-0.5 inline-block rounded bg-[#DCFCE7] px-1.5 py-0.5 font-inter text-[10px] font-semibold text-[#22C55E]">
              −{discountPercent.toFixed(2)}%
            </span>
          )}
          <p className="font-mono text-[11px] text-[#64748B]">{item.sku}</p>
        </div>

        {/* Quantity stepper */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="flex h-7 w-7 items-center justify-center rounded text-[#F97316] hover:bg-[#FFF7ED] disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus size={13} />
          </button>
          <span className="w-6 text-center font-inter text-[14px] font-semibold text-[#1B2B3A]">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#F97316] hover:bg-[#FFF7ED]"
            aria-label="Increase quantity"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Line total */}
        <div className="w-24 text-right">
          <p className="font-mono text-[14px] font-bold text-[#1B2B3A]">
            {formatCurrency(lineTotal)}
          </p>
          {hasDiscount && (
            <p className="font-mono text-[11px] text-[#64748B] line-through">
              {formatCurrency(lineGross)}
            </p>
          )}
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => removeItem(item.variantId)}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#64748B] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
          aria-label="Remove item"
        >
          <X size={14} />
        </button>
      </div>

      {/* Inline discount control — slides open when this row is active */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {isActive && (
          <LineItemDiscountControl
            item={item}
            onClose={() => setActiveLine(item.variantId)}
          />
        )}
      </div>
    </div>
  );
}
