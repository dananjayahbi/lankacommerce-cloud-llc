"use client";

import { useState, useRef, useEffect } from "react";
import Decimal from "decimal.js";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { CartManagerPINModal } from "./CartManagerPINModal";
import { formatCurrency } from "@/lib/formatCurrency";
import { LINE_DISCOUNT_CASHIER_THRESHOLD } from "@/config/pos.config";
import type { CartItem } from "@/types/pos";

interface Props {
  item: CartItem;
  onClose: () => void;
}

export function LineItemDiscountControl({ item, onClose }: Props) {
  const updateLineDiscount = useCartStore((s) => s.updateLineDiscount);
  const setAuthorizingManager = useCartStore((s) => s.setAuthorizingManager);
  const role = useAuthStore((s) => s.user?.role ?? null);

  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [inputValue, setInputValue] = useState("");
  const [showPINModal, setShowPINModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isManagerOrAbove =
    role === "SUPER_ADMIN" || role === "OWNER" || role === "MANAGER";

  // Focus input when panel opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const lineGross = new Decimal(item.unitPrice).mul(item.quantity);

  const computedDiscountAmount = (): Decimal => {
    if (!inputValue || isNaN(Number(inputValue))) return new Decimal(0);
    const val = new Decimal(inputValue);
    if (mode === "percent") {
      return lineGross.mul(val).div(100).toDecimalPlaces(2);
    }
    return val.toDecimalPlaces(2);
  };

  const computedNewTotal = (): Decimal => lineGross.sub(computedDiscountAmount());

  const discountAmount = computedDiscountAmount();
  const newTotal = computedNewTotal();
  const exceedsLineTotal = newTotal.lt(0);

  const toPercent = (): string => {
    if (!inputValue || isNaN(Number(inputValue))) return "0";
    const val = new Decimal(inputValue);
    if (mode === "percent") return val.toFixed(2);
    if (lineGross.gt(0)) return val.div(lineGross).mul(100).toDecimalPlaces(2).toFixed(2);
    return "0";
  };

  const enteredPercent = Number(toPercent());
  const needsOverride =
    !isManagerOrAbove && enteredPercent > LINE_DISCOUNT_CASHIER_THRESHOLD;

  const contextMsg = `Authorise ${enteredPercent.toFixed(2)}% discount on ${item.productName} / ${item.variantDescription}`;

  const applyDiscount = () => {
    const pct = toPercent();
    updateLineDiscount(item.variantId, pct);
    onClose();
  };

  const handleOverrideSuccess = (managerId: string) => {
    setAuthorizingManager(managerId);
    const pct = toPercent();
    updateLineDiscount(item.variantId, pct);
    onClose();
  };

  const handleModeChange = (newMode: "percent" | "fixed") => {
    setMode(newMode);
    setInputValue("");
  };

  return (
    <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0]">
          {(["percent", "fixed"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              className={`px-3 py-1.5 font-inter text-[12px] transition-colors ${
                mode === m
                  ? "border-[#E2E8F0] bg-white font-medium text-[#1B2B3A]"
                  : "bg-transparent text-[#64748B]"
              }`}
            >
              {m === "percent" ? "%" : "Rs."}
            </button>
          ))}
        </div>

        {/* Number input */}
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={mode === "percent" ? "0.00" : "0.00"}
          className={`w-24 rounded-lg border px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] outline-none transition-colors focus:ring-1 ${
            needsOverride
              ? "border-[#F59E0B] focus:ring-[#F59E0B]"
              : "border-[#E2E8F0] focus:ring-[#1B2B3A]"
          }`}
          style={{ appearance: "textfield" }}
        />

        {/* Apply / Override button */}
        {needsOverride ? (
          <button
            type="button"
            onClick={() => setShowPINModal(true)}
            className="rounded-lg bg-[#F59E0B] px-3 py-1.5 font-inter text-[12px] font-medium text-white hover:bg-[#D97706]"
          >
            Manager Override
          </button>
        ) : (
          <button
            type="button"
            disabled={exceedsLineTotal || !inputValue}
            onClick={applyDiscount}
            className="rounded-lg bg-[#1B2B3A] px-3 py-1.5 font-inter text-[12px] font-medium text-white hover:bg-[#2C3E50] disabled:opacity-40"
          >
            Apply
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="ml-auto font-inter text-[12px] text-[#64748B] hover:text-[#1B2B3A]"
        >
          Cancel
        </button>
      </div>

      {/* Live preview */}
      <div className="mt-2 font-inter text-[12px]">
        {exceedsLineTotal ? (
          <span className="text-[#EF4444]">Discount exceeds the line total</span>
        ) : inputValue ? (
          <span className="text-[#64748B]">
            New line total:{" "}
            <span className="font-mono font-medium text-[#1B2B3A]">
              {formatCurrency(newTotal)}
            </span>
            {discountAmount.gt(0) && (
              <span className="ml-2 text-[#22C55E]">
                (−{formatCurrency(discountAmount)})
              </span>
            )}
          </span>
        ) : null}
      </div>

      <CartManagerPINModal
        open={showPINModal}
        onOpenChange={setShowPINModal}
        contextMessage={contextMsg}
        onAuthorized={handleOverrideSuccess}
      />
    </div>
  );
}
