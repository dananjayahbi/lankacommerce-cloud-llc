"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, PrinterIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import type { ReturnRefundMethod } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function fmtCurrency(value: string) {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function MethodBadge({ method }: { method: ReturnRefundMethod }) {
  const cfg: Record<ReturnRefundMethod, { label: string; cls: string }> = {
    CASH: { label: "Cash", cls: "bg-[#22C55E] text-white" },
    CARD_REVERSAL: { label: "Card Reversal", cls: "bg-[#3B82F6] text-white" },
    STORE_CREDIT: { label: "Store Credit", cls: "bg-[#64748B] text-white" },
    EXCHANGE: { label: "Exchange", cls: "bg-[#F97316] text-white" },
  };
  const { label, cls } = cfg[method];
  return (
    <span className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

interface Props {
  returnId: string;
  refundMethod: ReturnRefundMethod;
  refundAmount: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function ReturnReceiptDialog({
  returnId,
  refundMethod,
  refundAmount,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"sent" | "error" | null>(null);

  async function handleSendWhatsApp() {
    const fullPhone = `+94${phone.replace(/^0/, "").replace(/\D/g, "")}`;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/pos/returns/${returnId}/send-receipt/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ phone: fullPhone, type: "return", return_id: returnId }),
      });
      setSendResult(res.ok ? "sent" : "error");
    } catch {
      setSendResult("error");
    } finally {
      setSending(false);
    }
  }

  function handlePrint() {
    window.open(`${API_BASE}/api/pos/returns/${returnId}/receipt/`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-inter text-[16px] font-semibold text-[#1B2B3A]">
            Return Processed
          </DialogTitle>
        </DialogHeader>

        {/* Success icon + summary */}
        <div className="mt-2 flex flex-col items-center gap-3 rounded-xl bg-[#F0FDF4] py-6">
          <CheckCircle2Icon size={40} className="text-[#22C55E]" />
          <p className="font-mono text-[24px] font-bold text-[#1B2B3A]">
            {fmtCurrency(refundAmount)}
          </p>
          <MethodBadge method={refundMethod} />
          <p className="font-mono text-[11px] text-[#64748B]">Ref #{shortId(returnId)}</p>
        </div>

        {/* WhatsApp section */}
        <div className="mt-4 rounded-lg border border-[#E2E8F0] p-3">
          <p className="mb-2 font-inter text-[12px] font-semibold text-[#1B2B3A]">
            Send Receipt via WhatsApp
          </p>
          <div className="flex gap-2">
            <div className="flex items-center rounded-l border border-r-0 border-[#E2E8F0] bg-[#F1F5F9] px-2">
              <span className="font-inter text-[12px] text-[#64748B]">+94</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSendResult(null);
              }}
              placeholder="711234567"
              className="flex-1 rounded-r border border-[#E2E8F0] px-2 py-1.5 font-inter text-[12px] text-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            />
          </div>
          {sendResult === "sent" && (
            <p className="mt-1.5 font-inter text-[11px] text-[#22C55E]">Sent ✓</p>
          )}
          {sendResult === "error" && (
            <p className="mt-1.5 font-inter text-[11px] text-[#EF4444]">
              Failed to send. Please try again.
            </p>
          )}
          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            disabled={!phone.trim() || sending}
            className="mt-2 w-full bg-[#F97316] font-inter text-[13px] text-white hover:bg-[#EA6C0B]"
          >
            {sending ? "Sending…" : "Send via WhatsApp"}
          </Button>
        </div>

        {/* Print */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="mt-3 w-full gap-2 font-inter text-[13px]"
        >
          <PrinterIcon size={13} />
          Print Return Receipt
        </Button>

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="sm"
            onClick={onDone}
            className="w-full bg-[#1B2B3A] font-inter text-[13px] text-white hover:bg-[#243547]"
          >
            Done — Return to Terminal
          </Button>
          <button
            type="button"
            onClick={onDone}
            className="font-inter text-[12px] text-[#64748B] hover:underline"
          >
            Skip Receipt
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
