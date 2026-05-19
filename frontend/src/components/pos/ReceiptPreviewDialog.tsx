"use client";

/**
 * ReceiptPreviewDialog (Task 03.02.09)
 *
 * Post-sale dialog that appears after a successful sale:
 *  - Shows "Sale Complete!" with green check icon
 *  - Displays Sale Reference, Total, and Change Due (for CASH/SPLIT)
 *  - Optional WhatsApp receipt send (phone number input)
 *  - Thermal print button (opens receipt HTML in new tab)
 *  - "No Receipt — close" text link
 *  - "New Sale" button (primary action)
 */

import { useState, useEffect } from "react";
import { CheckCircle2, MessageCircle, Printer, X } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Sale } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface ReceiptPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onNewSale: () => void;
  completedSale: Sale | null;
  /** Change to be returned to customer (Decimal). Null when not applicable (card only). */
  changeAmount: Decimal | null;
  accessToken: string | null;
}

type WhatsAppState = "idle" | "sending" | "sent" | "error";

export function ReceiptPreviewDialog({
  open,
  onClose,
  onNewSale,
  completedSale,
  changeAmount,
  accessToken,
}: ReceiptPreviewDialogProps) {
  const [phone, setPhone] = useState<string>("");
  const [waState, setWaState] = useState<WhatsAppState>("idle");
  const [waError, setWaError] = useState<string | null>(null);

  // Reset WhatsApp state whenever dialog re-opens with a new sale
  useEffect(() => {
    if (open) {
      setPhone("");
      setWaState("idle");
      setWaError(null);
    }
  }, [open, completedSale?.id]);

  if (!open || !completedSale) return null;

  const showChange =
    changeAmount !== null &&
    changeAmount.gte(0) &&
    (completedSale.payment_method === "CASH" ||
      completedSale.payment_method === "SPLIT");

  async function handleSendWhatsApp() {
    if (!completedSale) return;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return;

    setWaState("sending");
    setWaError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/pos/sales/${completedSale.id}/send-receipt/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ phone_number: trimmedPhone }),
        },
      );
      const json = (await res.json()) as {
        data?: { success?: boolean; error?: string };
      };
      if (json.data?.success) {
        setWaState("sent");
        setTimeout(() => setWaState("idle"), 4000);
      } else {
        setWaState("error");
        setWaError(json.data?.error ?? "Failed to send WhatsApp receipt.");
      }
    } catch {
      setWaState("error");
      setWaError("Network error — please try again.");
    }
  }

  function handlePrint() {
    window.open(
      `${API_BASE}/api/pos/sales/${completedSale!.id}/receipt/`,
      "_blank",
      "noopener,noreferrer,width=400,height=700",
    );
  }

  // Sale reference: first 8 chars of ID (uppercase)
  const saleRef = (completedSale.id.split("-")[0] ?? completedSale.id).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Success header ────────────────────────────────────── */}
        <div className="flex flex-col items-center px-6 pb-4 pt-8">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={36} className="text-emerald-600" />
          </div>
          <h2 className="font-inter text-[22px] font-bold text-[#1B2B3A]">
            Sale Complete!
          </h2>
          <p className="mt-1 font-inter text-[13px] text-[#64748B]">
            Payment received successfully
          </p>
        </div>

        {/* ── Sale details ──────────────────────────────────────── */}
        <div className="mx-6 mb-4 space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-inter text-[13px] text-[#64748B]">
              Sale Ref
            </span>
            <span className="font-mono text-[13px] font-bold text-[#1B2B3A]">
              #{saleRef}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
            <span className="font-inter text-[13px] text-[#64748B]">Total</span>
            <span className="font-mono text-[18px] font-bold text-[#1B2B3A]">
              {formatCurrency(new Decimal(completedSale.total_amount))}
            </span>
          </div>
          {showChange && changeAmount !== null && (
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
              <span className="font-inter text-[13px] text-[#64748B]">
                Change Due
              </span>
              <span className="font-mono text-[18px] font-bold text-emerald-600">
                {formatCurrency(changeAmount)}
              </span>
            </div>
          )}
        </div>

        {/* ── WhatsApp send ─────────────────────────────────────── */}
        <div className="mx-6 mb-4 space-y-2">
          <label className="block font-inter text-[12px] font-medium text-[#64748B]">
            Send receipt via WhatsApp (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 font-inter text-[13px] text-[#1B2B3A] placeholder:text-[#CBD5E1] focus:border-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#1B2B3A]"
            />
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!phone.trim() || waState === "sending" || waState === "sent"}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2.5 font-inter text-[13px] font-semibold text-white hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle size={14} />
              {waState === "sending"
                ? "Sending…"
                : waState === "sent"
                  ? "Sent ✓"
                  : "Send"}
            </button>
          </div>
          {waState === "error" && waError && (
            <p className="font-inter text-[12px] text-rose-600">{waError}</p>
          )}
        </div>

        {/* ── Action buttons ────────────────────────────────────── */}
        <div className="space-y-2 border-t border-[#E2E8F0] px-6 py-4">
          {/* Print thermal receipt */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white font-inter text-[14px] font-medium text-[#1B2B3A] hover:bg-[#F1F5F9]"
          >
            <Printer size={15} />
            Print Receipt
          </button>

          {/* New sale (primary) */}
          <button
            type="button"
            onClick={onNewSale}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#1B2B3A] font-inter text-[15px] font-bold text-white hover:bg-[#2C3E50]"
          >
            New Sale
          </button>

          {/* No-receipt close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-full items-center justify-center font-inter text-[13px] text-[#64748B] hover:text-[#1B2B3A]"
          >
            No Receipt — close
          </button>
        </div>
      </div>
    </div>
  );
}
