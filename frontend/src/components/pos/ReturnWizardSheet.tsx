"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { XIcon, ChevronLeftIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CartManagerPINModal } from "@/components/pos/CartManagerPINModal";
import { ReturnItemSelectionStep } from "@/components/pos/ReturnItemSelectionStep";
import type { ReturnLineSelection } from "@/components/pos/ReturnItemSelectionStep";
import { ReturnRefundOptionsStep } from "@/components/pos/ReturnRefundOptionsStep";
import { ReturnReceiptDialog } from "@/components/pos/ReturnReceiptDialog";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import type { SaleDetail, Return, ReturnRefundMethod, InitiateReturnPayload } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const RETURN_WINDOW_DAYS = 30;

interface Props {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildInitialLines(sale: SaleDetail): ReturnLineSelection[] {
  return sale.lines.map((line) => ({
    sale_line_id: line.id,
    quantity: 0,
    already_returned: 0,
    returnable: line.quantity,
    unit_price: line.unit_price,
    line_refund_amount: "0.00",
    product_name_snapshot: line.product_name_snapshot,
    variant_description_snapshot: line.variant_description_snapshot ?? "",
    original_quantity: line.quantity,
  }));
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full font-inter text-[11px] font-semibold ${
              i + 1 === step
                ? "bg-[#F97316] text-white"
                : i + 1 < step
                  ? "bg-[#22C55E] text-white"
                  : "bg-[#E2E8F0] text-[#64748B]"
            }`}
          >
            {i + 1 < step ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-6 ${i + 1 < step ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const STEP_LABELS = ["Select Items", "Refund Options", "Manager Auth"];

export function ReturnWizardSheet({ saleId, open, onOpenChange }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const setExchangeCredit = useCartStore((s) => s.setExchangeCredit);

  const [step, setStep] = useState(1);
  const [lines, setLines] = useState<ReturnLineSelection[]>([]);
  const [restockItems, setRestockItems] = useState(true);
  const [refundMethod, setRefundMethod] = useState<ReturnRefundMethod>("CASH");
  const [cardRef, setCardRef] = useState("");
  const [reason, setReason] = useState("");
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [receiptReturn, setReceiptReturn] = useState<Return | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Fetch sale detail
  const { data: sale, isLoading } = useQuery<SaleDetail>({
    queryKey: ["sale-detail-return", saleId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/pos/sales/${saleId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return json.data as SaleDetail;
    },
    enabled: !!saleId && !!accessToken && open,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sale) {
      setLines(buildInitialLines(sale));
    }
  }, [sale]);

  const totalRefund = lines
    .reduce((sum, l) => sum + parseFloat(l.line_refund_amount || "0"), 0)
    .toFixed(2);

  const hasSelectedItems = lines.some((l) => l.quantity > 0);

  const returnMutation = useMutation<Return, Error, { authorizing_manager_id: string }>({
    mutationFn: async ({ authorizing_manager_id }) => {
      const payload: InitiateReturnPayload = {
        original_sale_id: saleId,
        lines: lines
          .filter((l) => l.quantity > 0)
          .map((l) => ({ sale_line_id: l.sale_line_id, quantity: l.quantity })),
        refund_method: refundMethod,
        restock_items: restockItems,
        reason,
        ...(refundMethod === "CARD_REVERSAL" && cardRef ? { card_reversal_reference: cardRef } : {}),
        authorizing_manager_id,
      };

      const res = await fetch(`${API_BASE}/api/pos/returns/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json.error?.message as string) ?? `Error ${res.status}`);
      }

      const json = await res.json();
      return json.data as Return;
    },

    onSuccess: (returnRecord) => {
      toast.success("Return processed successfully.");
      void queryClient.invalidateQueries({ queryKey: ["pos-sales"] });

      if (refundMethod === "EXCHANGE") {
        setExchangeCredit(returnRecord.id, returnRecord.refund_amount, returnRecord.id);
        toast.info(
          `Exchange credit of Rs. ${parseFloat(returnRecord.refund_amount).toFixed(2)} loaded into cart.`,
        );
        handleClose();
      } else {
        setReceiptReturn(returnRecord);
        setReceiptDialogOpen(true);
      }
    },

    onError: (err) => {
      toast.error(err.message ?? "Failed to process return.");
    },
  });

  function handleClose() {
    if (returnMutation.isPending) return;
    setStep(1);
    setLines([]);
    setRestockItems(true);
    setRefundMethod("CASH");
    setCardRef("");
    setReason("");
    onOpenChange(false);
  }

  function canGoNext(): boolean {
    if (step === 1) return hasSelectedItems;
    if (step === 2) {
      if (refundMethod === "CARD_REVERSAL" && !cardRef.trim()) return false;
      return true;
    }
    return false;
  }

  function handleNext() {
    if (step === 1 && hasSelectedItems) setStep(2);
    else if (step === 2) {
      // Step 3: open PIN modal
      setPinModalOpen(true);
    }
  }

  function handleManagerAuthorized(managerId: string) {
    returnMutation.mutate({ authorizing_manager_id: managerId });
  }

  // Check sale is within return window
  const isWithinWindow =
    sale &&
    (new Date().getTime() - new Date(sale.created_at).getTime()) /
      (1000 * 60 * 60 * 24) <=
      RETURN_WINDOW_DAYS;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <SheetContent
          side="right"
          className="w-full max-w-[600px] overflow-y-auto sm:max-w-[600px]"

        >
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-inter text-[18px] font-semibold text-[#1B2B3A]">
                Return Items
              </SheetTitle>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <StepIndicator step={step} total={3} />
              <span className="font-inter text-[12px] text-[#64748B]">
                {STEP_LABELS[step - 1]}
              </span>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-4 pb-6">
            {isLoading && (
              <div className="flex flex-col gap-3 pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-[#E2E8F0]" />
                ))}
              </div>
            )}

            {!isLoading && sale && !isWithinWindow && (
              <div className="rounded-xl border border-[#EF4444]/30 bg-red-50 p-4 text-center">
                <p className="font-inter text-[14px] text-[#EF4444]">
                  This sale is outside the {RETURN_WINDOW_DAYS}-day return window and cannot be
                  returned.
                </p>
              </div>
            )}

            {!isLoading && sale && isWithinWindow && (
              <>
                {step === 1 && (
                  <ReturnItemSelectionStep
                    sale={sale}
                    value={lines}
                    restockItems={restockItems}
                    onChange={(l, r) => { setLines(l); setRestockItems(r); }}
                  />
                )}

                {step === 2 && (
                  <ReturnRefundOptionsStep
                    value={refundMethod}
                    onChange={setRefundMethod}
                    cardReversalReference={cardRef}
                    onCardReferenceChange={setCardRef}
                    reason={reason}
                    onReasonChange={setReason}
                    totalRefund={totalRefund}
                  />
                )}

                {step === 3 && (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7ED]">
                      <span className="text-[28px]">🔐</span>
                    </div>
                    <p className="font-inter text-[14px] text-[#1B2B3A]">
                      Manager authorisation required. A manager must enter their 4-digit PIN to
                      approve this return.
                    </p>
                    <Button
                      onClick={() => setPinModalOpen(true)}
                      disabled={returnMutation.isPending}
                      className="bg-[#F97316] text-white hover:bg-[#EA6C10]"
                    >
                      {returnMutation.isPending ? "Processing…" : "Enter Manager PIN"}
                    </Button>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
                  <Button
                    variant="outline"
                    onClick={() => (step > 1 ? setStep(step - 1) : handleClose())}
                    className="gap-1"
                    disabled={returnMutation.isPending}
                  >
                    {step > 1 && <ChevronLeftIcon size={14} />}
                    {step === 1 ? "Cancel" : "Back"}
                  </Button>

                  {step < 3 && (
                    <Button
                      onClick={handleNext}
                      disabled={!canGoNext()}
                      className="bg-[#F97316] text-white hover:bg-[#EA6C10] disabled:opacity-40"
                    >
                      {step === 2 ? "Authorize Return →" : "Next →"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CartManagerPINModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        contextMessage={`Approve return of Rs. ${parseFloat(totalRefund).toLocaleString("en-LK", { minimumFractionDigits: 2 })} via ${refundMethod.replace("_", " ")}`}
        onAuthorized={handleManagerAuthorized}
      />

      {receiptReturn && (
        <ReturnReceiptDialog
          returnId={receiptReturn.id}
          refundMethod={receiptReturn.refund_method}
          refundAmount={receiptReturn.refund_amount}
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          onDone={() => {
            setReceiptDialogOpen(false);
            setReceiptReturn(null);
            handleClose();
          }}
        />
      )}
    </>
  );
}
