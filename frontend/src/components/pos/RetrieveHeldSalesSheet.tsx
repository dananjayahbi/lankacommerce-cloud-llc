"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import Decimal from "decimal.js";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useShiftContext } from "@/contexts/ShiftContext";
import { formatCurrency } from "@/lib/formatCurrency";
import type { CartItem, Sale } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Returns a human-readable relative time string without date-fns dependency. */
function relativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.round(diffHr / 24);
  return `${diffDays}d ago`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HeldSaleListResponse {
  success: boolean;
  data: { results: Sale[] };
}

async function fetchHeldSales(
  shiftId: string,
  tenantId: string | null,
  token: string | null,
): Promise<Sale[]> {
  if (!token) return [];
  const params = new URLSearchParams({ shift_id: shiftId, status: "OPEN" });
  if (tenantId) params.set("tenant_id", tenantId);
  const res = await fetch(`${API_BASE}/api/pos/sales/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = (await res.json()) as HeldSaleListResponse;
  return json.data?.results ?? [];
}

async function holdCurrentCart(
  payload: object,
  token: string | null,
): Promise<{ id: string } | null> {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/pos/sales/hold/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { success: boolean; data?: { id: string } };
  return json.data ?? null;
}

async function voidSale(saleId: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const res = await fetch(`${API_BASE}/api/pos/sales/${saleId}/void/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

function computeSaleTotal(sale: Sale): Decimal {
  return sale.lines.reduce((acc, l) => acc.add(new Decimal(l.line_total_after_discount)), new Decimal(0));
}

export function RetrieveHeldSalesSheet({ open, onOpenChange }: Props) {
  const { shift } = useShiftContext();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = useCartStore((s) => s.cartDiscountPercent);
  const authorizingManagerId = useCartStore((s) => s.authorizingManagerId);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const clearCart = useCartStore((s) => s.clearCart);

  const queryClient = useQueryClient();
  const [confirmSale, setConfirmSale] = useState<Sale | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);

  const { data: heldSales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["held-sales", shift.id],
    queryFn: () => fetchHeldSales(shift.id, user?.tenant_id ?? null, accessToken),
    enabled: open,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const cartHasItems = items.length > 0;

  const buildCurrentCartPayload = () => {
    const pct = new Decimal(cartDiscountPercent);
    const discAmount = pct.gt(0)
      ? getSubtotal().mul(pct).div(100).toDecimalPlaces(2).toFixed(2)
      : new Decimal(cartDiscountAmount).toFixed(2);

    return {
      shift_id: shift.id,
      lines: items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
        discount_percent: i.discountPercent,
      })),
      cart_discount_amount: discAmount,
      authorizing_manager_id: authorizingManagerId ?? null,
    };
  };

  const restoreSaleToCart = (sale: Sale) => {
    const cartItems: CartItem[] = sale.lines.map((line) => ({
      id: crypto.randomUUID(),
      variantId: line.variant_id,
      productName: line.product_name_snapshot,
      variantDescription: line.variant_description_snapshot,
      sku: line.sku,
      unitPrice: line.unit_price,
      quantity: line.quantity,
      discountPercent: line.discount_percent,
    }));

    replaceCart(
      cartItems,
      sale.discount_amount,
      "0",
      sale.authorizing_manager_id,
    );
  };

  const doRetrieve = async (sale: Sale) => {
    setIsRetrieving(true);
    try {
      if (cartHasItems) {
        const result = await holdCurrentCart(buildCurrentCartPayload(), accessToken);
        if (!result) {
          toast.error("Failed to hold current cart. Retrieval aborted.");
          return;
        }
        clearCart();
        await queryClient.invalidateQueries({ queryKey: ["held-sales", shift.id] });
      }

      restoreSaleToCart(sale);
      const shortId = sale.id.slice(0, 6).toUpperCase();
      onOpenChange(false);
      toast.success(`Sale ${shortId} restored to cart`, {
        style: { background: "#22C55E", color: "#fff" },
      });
    } finally {
      setIsRetrieving(false);
      setConfirmSale(null);
    }
  };

  const handleRetrieveClick = (sale: Sale) => {
    if (cartHasItems) {
      setConfirmSale(sale);
    } else {
      void doRetrieve(sale);
    }
  };

  const handleDiscard = async (sale: Sale) => {
    const ok = await voidSale(sale.id, accessToken);
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: ["held-sales", shift.id] });
      toast.success(`Sale ${sale.id.slice(0, 6).toUpperCase()} discarded`);
    } else {
      toast.error("Failed to discard held sale.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto p-0">
          <SheetHeader className="border-b border-[#E2E8F0] px-5 py-4">
            <SheetTitle className="font-inter text-[16px] font-semibold text-[#1B2B3A]">
              Held Sales
              {!isLoading && heldSales.length > 0 && (
                <span className="ml-2 rounded-full bg-[#F97316] px-2 py-0.5 font-inter text-[11px] font-bold text-white">
                  {heldSales.length}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : heldSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock size={40} className="mb-3 text-[#CBD5E1]" />
                <p className="font-inter text-[14px] text-[#64748B]">
                  No held sales for this shift
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...heldSales]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((sale) => {
                    const shortId = sale.id.slice(0, 6).toUpperCase();
                    const itemCount = sale.lines.reduce((s, l) => s + l.quantity, 0);
                    const total = computeSaleTotal(sale);

                    return (
                      <div
                        key={sale.id}
                        className="rounded-xl border border-[#E2E8F0] p-4 hover:bg-[#F1F5F9]"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <span className="font-mono text-[16px] font-bold text-[#1B2B3A]">
                            {shortId}
                          </span>
                          <span className="font-inter text-[12px] text-[#64748B]">
                            {relativeTime(sale.created_at)}
                          </span>
                        </div>
                        <p className="mb-3 font-inter text-[13px] text-[#64748B]">
                          {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                          <span className="font-mono font-medium text-[#1B2B3A]">
                            {formatCurrency(total)}
                          </span>
                        </p>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isRetrieving}
                            onClick={() => handleRetrieveClick(sale)}
                            className="flex-1 rounded-lg bg-[#1B2B3A] py-2 font-inter text-[13px] font-medium text-white hover:bg-[#2C3E50] disabled:opacity-50"
                          >
                            {isRetrieving ? (
                              <Loader2 size={14} className="mx-auto animate-spin" />
                            ) : (
                              "Retrieve"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscard(sale)}
                            className="rounded-lg border border-[#E2E8F0] px-4 py-2 font-inter text-[13px] text-[#64748B] hover:border-[#EF4444] hover:text-[#EF4444]"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Replace Current Cart? confirmation */}
      <Dialog open={!!confirmSale} onOpenChange={() => setConfirmSale(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace Current Cart?</DialogTitle>
            <DialogDescription>
              You have items in your current cart. Retrieving this sale will replace your
              current cart. Your current items will not be lost — they will be automatically
              held as a new sale.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent">
            <button
              type="button"
              onClick={() => setConfirmSale(null)}
              className="rounded-lg border border-[#E2E8F0] px-4 py-2 font-inter text-[14px] text-[#1B2B3A] hover:bg-[#F1F5F9]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRetrieving}
              onClick={() => confirmSale && void doRetrieve(confirmSale)}
              className="rounded-lg bg-[#1B2B3A] px-4 py-2 font-inter text-[14px] font-medium text-white hover:bg-[#2C3E50] disabled:opacity-50"
            >
              {isRetrieving ? (
                <Loader2 size={14} className="inline animate-spin" />
              ) : (
                "Hold & Retrieve"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
