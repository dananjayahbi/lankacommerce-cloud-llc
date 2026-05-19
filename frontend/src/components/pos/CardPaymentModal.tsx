"use client";

/**
 * CardPaymentModal
 *
 * Full-screen overlay modal to process a card payment.
 * Shows the exact charge amount and an optional field for the card
 * terminal approval / reference number.
 *
 * Layout reference (spec Task 03.02.04):
 *  - Overlay: fixed inset-0 bg-black/60
 *  - Card: w-full max-w-md rounded-2xl bg-white
 *  - Charge amount prominently displayed (read-only — user cannot change it)
 *  - Optional reference number text field (max 20 chars)
 *  - Confirm button is always active unless loading
 */

import { useEffect, useRef, useState } from "react";
import { CreditCard, X } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/formatCurrency";

interface CardPaymentModalProps {
  /** The exact amount to charge to the card. */
  total: Decimal;
  /** Called when the cashier confirms the card payment. */
  onConfirm: (cardReferenceNumber: string | null) => void;
  /** Called when the modal is closed/cancelled. */
  onClose: () => void;
  /** Whether the confirm action is loading (POST in progress). */
  isLoading?: boolean;
}

export function CardPaymentModal({
  total,
  onConfirm,
  onClose,
  isLoading = false,
}: CardPaymentModalProps) {
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the reference field on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !isLoading) {
        // Only trigger if not inside the input field
        if (document.activeElement !== inputRef.current) {
          onConfirm(referenceNumber.trim() || null);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading, onConfirm, onClose, referenceNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#1B2B3A]" />
            <h2 className="font-inter text-[18px] font-bold text-[#1B2B3A]">
              Card Payment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1B2B3A] disabled:pointer-events-none"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* ── Charge amount ────────────────────────────────────── */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#1B2B3A] px-6 py-8 text-center">
            <p className="font-inter text-[13px] font-medium text-white/60">
              Charge to card
            </p>
            <p className="font-mono text-[36px] font-bold text-white mt-1">
              {formatCurrency(total)}
            </p>
          </div>

          {/* ── Reference number ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="card-ref"
              className="block font-inter text-[13px] font-medium text-[#1B2B3A]"
            >
              Terminal Approval Code{" "}
              <span className="font-normal text-[#64748B]">(optional)</span>
            </label>
            <input
              id="card-ref"
              ref={inputRef}
              type="text"
              inputMode="text"
              maxLength={20}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 012345"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 font-mono text-[15px] text-[#1B2B3A] placeholder:text-[#CBD5E1] focus:border-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#1B2B3A]"
            />
          </div>

          {/* ── Instruction note ─────────────────────────────────── */}
          <p className="rounded-xl bg-[#F1F5F9] px-4 py-3 font-inter text-[13px] text-[#64748B]">
            Process the card on your terminal, then confirm here to complete
            the sale.
          </p>
        </div>

        {/* ── Confirm button ────────────────────────────────────── */}
        <div className="border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirm(referenceNumber.trim() || null)}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#1B2B3A] font-inter text-[16px] font-bold text-white transition-colors hover:bg-[#2C3E50] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Processing…" : "Confirm Card Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
