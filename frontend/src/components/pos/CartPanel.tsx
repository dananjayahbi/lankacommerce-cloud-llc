"use client";

import { useState, useRef } from "react";
import { ArchiveRestore, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { useShiftContext } from "@/contexts/ShiftContext";
import { LineItemRow } from "./LineItemRow";
import { CartDiscountControl } from "./CartDiscountControl";
import { HoldSaleButton } from "./HoldSaleButton";
import { RetrieveHeldSalesSheet } from "./RetrieveHeldSalesSheet";
import { PaymentMethodSheet } from "./PaymentMethodSheet";
import { CashPaymentModal } from "./CashPaymentModal";
import { CardPaymentModal } from "./CardPaymentModal";
import { SplitPaymentModal } from "./SplitPaymentModal";
import { ReceiptPreviewDialog } from "./ReceiptPreviewDialog";
import { formatCurrency } from "@/lib/formatCurrency";
import { DISPLAY_TAX_RATE_PERCENT } from "@/config/pos.config";
import type { PaymentMethod, Sale, CreateSalePayload } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchHeldSalesCount(
  shiftId: string,
  token: string | null,
): Promise<number> {
  if (!token) return 0;
  const res = await fetch(
    `${API_BASE}/api/pos/sales/?shift_id=${shiftId}&status=OPEN&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return 0;
  const json = (await res.json()) as { data?: { total?: number } };
  return json.data?.total ?? 0;
}

async function submitSale(
  payload: CreateSalePayload,
  token: string,
): Promise<Sale> {
  const res = await fetch(`${API_BASE}/api/pos/sales/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { data?: Sale; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Sale submission failed");
  }
  return json.data!;
}

export function CartPanel() {
  const { shift } = useShiftContext();
  const accessToken = useAuthStore((s) => s.accessToken);
  const items = useCartStore((s) => s.items);
  const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = useCartStore((s) => s.cartDiscountPercent);
  const authorizingManagerId = useCartStore((s) => s.authorizingManagerId);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getCartDiscountEffective = useCartStore((s) => s.getCartDiscountEffective);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const queryClient = useQueryClient();
  const [retrieveOpen, setRetrieveOpen] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment flow state
  const [methodSheetOpen, setMethodSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [changeAmount, setChangeAmount] = useState<Decimal | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const { data: heldCount = 0 } = useQuery<number>({
    queryKey: ["held-sales-count", shift.id],
    queryFn: () => fetchHeldSalesCount(shift.id, accessToken),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const isEmpty = items.length === 0;
  const totalLineItems = items.length;

  // Compute totals
  const subtotal = getSubtotal();
  const cartDiscount = getCartDiscountEffective();

  // Line discounts total
  const lineDiscountsTotal = items.reduce((acc, item) => {
    const lineGross = new Decimal(item.unitPrice).mul(item.quantity);
    const lineDisc = lineGross
      .mul(new Decimal(item.discountPercent))
      .div(100)
      .toDecimalPlaces(2);
    return acc.add(lineDisc);
  }, new Decimal(0));

  const totalDiscount = lineDiscountsTotal.add(cartDiscount);

  // Estimated tax on discounted subtotal
  const taxBase = subtotal.sub(cartDiscount);
  const taxAmount = taxBase.mul(DISPLAY_TAX_RATE_PERCENT).div(100).toDecimalPlaces(2);
  const grandTotal = getTotal().add(taxAmount);

  const hasDiscount = totalDiscount.gt(0);
  const hasPctDiscount = new Decimal(cartDiscountPercent).gt(0);
  const hasAmtDiscount = new Decimal(cartDiscountAmount).gt(0);
  const _ = hasPctDiscount || hasAmtDiscount; // silence unused warning

  const handleClearCart = () => {
    // 3-second undo window
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const snapshot = { ...useCartStore.getState() };

    toast("Cart cleared — Undo", {
      duration: 3000,
      action: {
        label: "Undo",
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          // Restore state
          useCartStore.setState({
            items: snapshot.items,
            cartDiscountAmount: snapshot.cartDiscountAmount,
            cartDiscountPercent: snapshot.cartDiscountPercent,
            authorizingManagerId: snapshot.authorizingManagerId,
            activeLineId: null,
            heldSaleId: snapshot.heldSaleId,
          });
        },
      },
    });

    clearCart();
  };

  // Build base sale payload from current cart
  function buildBasePayload(): Omit<CreateSalePayload, "payment_method"> {
    const base: Omit<CreateSalePayload, "payment_method"> = {
      shift_id: shift.id,
      lines: items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        discount_percent: item.discountPercent,
      })),
    };
    if (cartDiscountAmount !== "0") {
      base.cart_discount_amount = cartDiscountAmount;
    }
    if (authorizingManagerId) {
      base.authorizing_manager_id = authorizingManagerId;
    }
    return base;
  }

  async function handleSaleSuccess(sale: Sale, change: Decimal | null) {
    clearCart();
    await queryClient.invalidateQueries({ queryKey: ["held-sales-count", shift.id] });
    setActiveModal(null);
    setMethodSheetOpen(false);
    setCompletedSale(sale);
    setChangeAmount(change);
    setReceiptDialogOpen(true);
  }

  async function handleCashConfirm(cashReceived: Decimal) {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const payload: CreateSalePayload = {
        ...buildBasePayload(),
        payment_method: "CASH",
        cash_received: cashReceived.toNumber(),
      };
      const sale = await submitSale(payload, accessToken);
      const change = cashReceived.sub(new Decimal(sale.total_amount));
      await handleSaleSuccess(sale, change.gte(0) ? change : new Decimal(0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCardConfirm(cardReferenceNumber: string | null) {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const payload: CreateSalePayload = {
        ...buildBasePayload(),
        payment_method: "CARD",
        ...(cardReferenceNumber ? { card_reference_number: cardReferenceNumber } : {}),
      } as CreateSalePayload;
      const sale = await submitSale(payload, accessToken);
      await handleSaleSuccess(sale, null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSplitConfirm({
    cardAmount,
    cashReceived,
    cardReferenceNumber,
  }: {
    cardAmount: Decimal;
    cashReceived: Decimal;
    cardReferenceNumber: string | null;
  }) {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const payload: CreateSalePayload = {
        ...buildBasePayload(),
        payment_method: "SPLIT",
        card_amount: cardAmount.toNumber(),
        cash_received: cashReceived.toNumber(),
        ...(cardReferenceNumber ? { card_reference_number: cardReferenceNumber } : {}),
      } as CreateSalePayload;
      const sale = await submitSale(payload, accessToken);
      const cashPortion = new Decimal(sale.total_amount).sub(cardAmount);
      const change = cashReceived.sub(cashPortion);
      await handleSaleSuccess(sale, change.gte(0) ? change : new Decimal(0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#E2E8F0] px-4">
        <div className="flex items-center gap-2">
          <span className="font-inter text-[16px] font-semibold text-[#1B2B3A]">
            Cart
          </span>
          {totalLineItems > 0 && (
            <span className="rounded-full bg-[#F97316] px-2 py-0.5 font-inter text-[11px] font-bold text-white">
              {totalLineItems}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Retrieve held sales */}
          <button
            type="button"
            onClick={() => setRetrieveOpen(true)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1B2B3A]"
            aria-label="Retrieve held sales"
          >
            <ArchiveRestore size={16} />
            {heldCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F97316] font-inter text-[9px] font-bold text-white">
                {heldCount > 9 ? "9+" : heldCount}
              </span>
            )}
          </button>

          {/* Clear cart */}
          {!isEmpty && (
            <button
              type="button"
              onClick={handleClearCart}
              className="flex h-8 items-center gap-1 rounded-lg px-2 font-inter text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]"
            >
              <Trash2 size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable middle section ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <ShoppingCart size={48} className="mb-3 text-[#CBD5E1]" />
            <p className="font-inter text-[14px] text-[#64748B]">
              Cart is empty — add a product to start
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#F1F5F9]">
              {items.map((item) => (
                <LineItemRow key={item.variantId} item={item} />
              ))}
            </div>
            <CartDiscountControl />
          </>
        )}
      </div>

      {/* ── Totals section ──────────────────────────────────────── */}
      <div
        className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 pb-2 pt-3"
        style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.08)" }}
      >
        {/* Subtotal */}
        <div className="flex items-center justify-between py-1">
          <span className="font-inter text-[14px] text-[#64748B]">Subtotal</span>
          <span className="font-mono text-[14px] text-[#0F172A]">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Discount — only when > 0 */}
        {hasDiscount && (
          <div className="flex items-center justify-between py-1">
            <span className="font-inter text-[14px] text-[#64748B]">Discount</span>
            <span className="font-mono text-[14px] text-[#EF4444]">
              −{formatCurrency(totalDiscount)}
            </span>
          </div>
        )}

        {/* Tax (est.) */}
        <div className="flex items-center justify-between py-1">
          <span className="font-inter text-[14px] text-[#64748B]">
            Tax — Est. {DISPLAY_TAX_RATE_PERCENT}%
          </span>
          <span className="font-mono text-[14px] text-[#0F172A]">
            {formatCurrency(taxAmount)}
          </span>
        </div>

        {/* Grand total */}
        <div className="mt-1 flex items-center justify-between border-t border-[#E2E8F0] pt-2">
          <span className="font-inter text-[22px] font-bold text-[#1B2B3A]">
            Total
          </span>
          <span className="font-mono text-[22px] font-bold text-[#F97316]">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>

      {/* ── Action buttons ──────────────────────────────────────── */}
      <div className="shrink-0 space-y-2 border-t border-[#E2E8F0] px-4 pb-4 pt-3">
        <HoldSaleButton />

        <button
          type="button"
          disabled={isEmpty}
          onClick={() => setMethodSheetOpen(true)}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[#1B2B3A] font-inter text-[16px] font-bold text-white hover:bg-[#2C3E50] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Charge / Pay — {formatCurrency(grandTotal)}
        </button>
      </div>

      <RetrieveHeldSalesSheet open={retrieveOpen} onOpenChange={setRetrieveOpen} />

      {/* ── Payment method selection sheet ──────────────────────── */}
      {methodSheetOpen && (
        <PaymentMethodSheet
          total={grandTotal}
          onSelect={(method) => {
            setMethodSheetOpen(false);
            setActiveModal(method);
          }}
          onClose={() => setMethodSheetOpen(false)}
        />
      )}

      {/* ── Cash payment modal ───────────────────────────────────── */}
      {activeModal === "CASH" && (
        <CashPaymentModal
          total={grandTotal}
          onConfirm={handleCashConfirm}
          onClose={() => setActiveModal(null)}
          isLoading={isSubmitting}
        />
      )}

      {/* ── Card payment modal ───────────────────────────────────── */}
      {activeModal === "CARD" && (
        <CardPaymentModal
          total={grandTotal}
          onConfirm={handleCardConfirm}
          onClose={() => setActiveModal(null)}
          isLoading={isSubmitting}
        />
      )}

      {/* ── Split payment modal ──────────────────────────────────── */}
      {activeModal === "SPLIT" && (
        <SplitPaymentModal
          total={grandTotal}
          onConfirm={handleSplitConfirm}
          onClose={() => setActiveModal(null)}
          isLoading={isSubmitting}
        />
      )}

      {/* ── Receipt preview dialog ───────────────────────────────── */}
      <ReceiptPreviewDialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        onNewSale={() => {
          setReceiptDialogOpen(false);
          setCompletedSale(null);
        }}
        completedSale={completedSale}
        changeAmount={changeAmount}
        accessToken={accessToken}
      />
    </div>
  );
}
