"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useShiftContext } from "@/contexts/ShiftContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function HoldSaleButton() {
  const { shift } = useShiftContext();
  const accessToken = useAuthStore((s) => s.accessToken);
  const items = useCartStore((s) => s.items);
  const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = useCartStore((s) => s.cartDiscountPercent);
  const authorizingManagerId = useCartStore((s) => s.authorizingManagerId);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isEmpty = items.length === 0;

  // Compute effective cart discount amount to send
  const getEffectiveDiscountAmount = (): string => {
    const pct = new Decimal(cartDiscountPercent);
    if (pct.gt(0)) {
      return getSubtotal().mul(pct).div(100).toDecimalPlaces(2).toFixed(2);
    }
    return new Decimal(cartDiscountAmount).toFixed(2);
  };

  const holdSale = async () => {
    if (isEmpty || isLoading) return;

    setIsLoading(true);

    const payload = {
      shift_id: shift.id,
      lines: items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        discount_percent: item.discountPercent,
      })),
      cart_discount_amount: getEffectiveDiscountAmount(),
      authorizing_manager_id: authorizingManagerId ?? null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/pos/sales/hold/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        toast.error(json.error?.message ?? "Failed to hold sale. Please try again.");
        return;
      }

      const json = (await res.json()) as { success: boolean; data?: { id?: string } };
      const saleId = json.data?.id ?? "";
      const shortId = saleId.slice(0, 6).toUpperCase();

      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["held-sales", shift.id] });

      toast.success(`Sale held — Reference ${shortId}. Tap Retrieve to continue it.`, {
        duration: 8000,
      });
    } catch {
      toast.error("Failed to hold sale. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={holdSale}
      disabled={isEmpty || isLoading}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-transparent font-inter text-[14px] text-[#1B2B3A] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : null}
      Hold Sale
    </button>
  );
}
