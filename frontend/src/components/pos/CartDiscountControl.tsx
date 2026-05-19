"use client";

import { useState } from "react";
import Decimal from "decimal.js";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { CartManagerPINModal } from "./CartManagerPINModal";
import { formatCurrency } from "@/lib/formatCurrency";
import { CART_DISCOUNT_CASHIER_THRESHOLD } from "@/config/pos.config";

export function CartDiscountControl() {
  const items = useCartStore((s) => s.items);
  const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = useCartStore((s) => s.cartDiscountPercent);
  const setCartDiscount = useCartStore((s) => s.setCartDiscount);
  const setAuthorizingManager = useCartStore((s) => s.setAuthorizingManager);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const role = useAuthStore((s) => s.user?.role ?? null);

  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [inputValue, setInputValue] = useState(
    () => {
      // Restore from store on mount
      const pct = new Decimal(cartDiscountPercent);
      const amt = new Decimal(cartDiscountAmount);
      if (pct.gt(0)) return pct.toFixed(2);
      if (amt.gt(0)) return amt.toFixed(2);
      return "";
    },
  );
  const [showPINModal, setShowPINModal] = useState(false);

  if (items.length === 0) return null;

  const isManagerOrAbove =
    role === "SUPER_ADMIN" || role === "OWNER" || role === "MANAGER";

  const subtotal = getSubtotal();

  const toPercent = (): number => {
    if (!inputValue || isNaN(Number(inputValue))) return 0;
    const val = new Decimal(inputValue);
    if (mode === "percent") return val.toNumber();
    if (subtotal.gt(0)) return val.div(subtotal).mul(100).toDecimalPlaces(2).toNumber();
    return 0;
  };

  const computedDiscountAmount = (): Decimal => {
    if (!inputValue || isNaN(Number(inputValue))) return new Decimal(0);
    const val = new Decimal(inputValue);
    if (mode === "percent") return subtotal.mul(val).div(100).toDecimalPlaces(2);
    return val.toDecimalPlaces(2);
  };

  const enteredPercent = toPercent();
  const discountAmount = computedDiscountAmount();
  const newTotal = subtotal.sub(discountAmount);
  const exceedsSubtotal = newTotal.lt(0);

  const needsOverride =
    !isManagerOrAbove && enteredPercent > CART_DISCOUNT_CASHIER_THRESHOLD;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const contextMsg =
    mode === "percent"
      ? `Authorise ${enteredPercent.toFixed(2)}% cart discount`
      : `Authorise ${formatCurrency(discountAmount)} cart discount on ${itemCount}-item cart`;

  const applyDiscount = () => {
    setCartDiscount(mode, inputValue || "0");
  };

  const handleOverrideSuccess = (managerId: string) => {
    setAuthorizingManager(managerId);
    setCartDiscount(mode, inputValue || "0");
  };

  const handleModeChange = (newMode: "percent" | "fixed") => {
    setMode(newMode);
    setInputValue("");
    setCartDiscount(newMode, "0");
  };

  const handleClear = () => {
    setInputValue("");
    setCartDiscount("fixed", "0");
    setAuthorizingManager(null);
  };

  return (
    <div className="border-t border-[#E2E8F0] px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-inter text-[13px] text-[#64748B]">Cart Discount</span>
        {(new Decimal(cartDiscountAmount).gt(0) || new Decimal(cartDiscountPercent).gt(0)) && (
          <button
            type="button"
            onClick={handleClear}
            className="font-inter text-[11px] text-[#64748B] hover:text-[#EF4444]"
          >
            Clear
          </button>
        )}
      </div>

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
                  ? "bg-white font-medium text-[#1B2B3A]"
                  : "bg-transparent text-[#64748B]"
              }`}
            >
              {m === "percent" ? "%" : "Rs."}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="0"
          step="0.01"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="0.00"
          className={`w-24 rounded-lg border px-3 py-1.5 font-inter text-[13px] text-[#1B2B3A] outline-none focus:ring-1 ${
            needsOverride
              ? "border-[#F59E0B] focus:ring-[#F59E0B]"
              : "border-[#E2E8F0] focus:ring-[#1B2B3A]"
          }`}
          style={{ appearance: "textfield" }}
        />

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
            disabled={exceedsSubtotal || !inputValue}
            onClick={applyDiscount}
            className="rounded-lg bg-[#1B2B3A] px-3 py-1.5 font-inter text-[12px] font-medium text-white hover:bg-[#2C3E50] disabled:opacity-40"
          >
            Apply
          </button>
        )}
      </div>

      {/* Live preview */}
      {inputValue && (
        <div className="mt-2 font-inter text-[12px]">
          {exceedsSubtotal ? (
            <span className="text-[#EF4444]">Discount exceeds subtotal</span>
          ) : (
            <span className="text-[#64748B]">
              New total:{" "}
              <span className="font-mono font-medium text-[#1B2B3A]">
                {formatCurrency(newTotal)}
              </span>
            </span>
          )}
        </div>
      )}

      <CartManagerPINModal
        open={showPINModal}
        onOpenChange={setShowPINModal}
        contextMessage={contextMsg}
        onAuthorized={handleOverrideSuccess}
      />
    </div>
  );
}
