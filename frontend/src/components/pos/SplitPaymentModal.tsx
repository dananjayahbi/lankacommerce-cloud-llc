"use client";

/**
 * SplitPaymentModal
 *
 * Full-screen overlay modal for split card + cash payments.
 * The cashier enters a card amount; the remaining cash portion is computed
 * automatically. They then enter cash received to validate change.
 *
 * Layout reference (spec Task 03.02.05):
 *  - Overlay: fixed inset-0 bg-black/60
 *  - Card: w-full max-w-md rounded-2xl bg-white
 *  - Card amount input (editable)
 *  - Cash amount (read-only, computed)
 *  - Allocation summary row
 *  - Optional terminal reference field
 *  - Cash received input (shown when cashPortion > 0)
 *  - Change due display
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/formatCurrency";

interface SplitPaymentConfirmPayload {
  cardAmount: Decimal;
  cashReceived: Decimal;
  cardReferenceNumber: string | null;
}

interface SplitPaymentModalProps {
  /** The exact total amount the customer owes (Decimal instance). */
  total: Decimal;
  /** Called when the cashier confirms the split payment. */
  onConfirm: (payload: SplitPaymentConfirmPayload) => void;
  /** Called when the modal is closed/cancelled. */
  onClose: () => void;
  /** Whether the confirm action is loading (POST in progress). */
  isLoading?: boolean;
}

export function SplitPaymentModal({
  total,
  onConfirm,
  onClose,
  isLoading = false,
}: SplitPaymentModalProps) {
  const [cardInput, setCardInput] = useState<string>("");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cardInputRef.current?.focus();
  }, []);

  const cardAmount = cardInput ? new Decimal(cardInput) : new Decimal(0);
  const cashPortion = total.sub(cardAmount);
  const cashReceived = cashReceivedInput ? new Decimal(cashReceivedInput) : new Decimal(0);

  const cardValid = cardAmount.gt(0) && cardAmount.lt(total);
  const cashPortionPositive = cashPortion.gt(0);
  const cashCovered = cashReceived.gte(cashPortion);
  const changeDue = cashCovered && cashPortionPositive ? cashReceived.sub(cashPortion) : new Decimal(0);

  const canConfirm =
    cardValid &&
    cashPortionPositive &&
    cardAmount.add(cashPortion).eq(total) &&
    cashCovered;

  const formatDecimalInput = useCallback((value: string, setter: (v: string) => void) => {
    // Allow only numeric input with at most 2 decimal places
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts[1] !== undefined && parts[1].length > 2) return;
    // Prevent negative or values exceeding total
    setter(cleaned);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="font-inter text-[18px] font-bold text-[#1B2B3A]">
            Split Payment
          </h2>
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

        <div className="space-y-4 px-6 py-5">
          {/* ── Order total ──────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3">
            <span className="font-inter text-[14px] text-[#64748B]">
              Order Total
            </span>
            <span className="font-mono text-[20px] font-bold text-[#1B2B3A]">
              {formatCurrency(total)}
            </span>
          </div>

          {/* ── Card amount input ────────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="split-card-amount"
              className="block font-inter text-[13px] font-medium text-[#1B2B3A]"
            >
              Card Amount (Rs.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-[#64748B]">
                Rs.
              </span>
              <input
                id="split-card-amount"
                ref={cardInputRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cardInput}
                onChange={(e) =>
                  formatDecimalInput(e.target.value, setCardInput)
                }
                placeholder="0.00"
                className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 font-mono text-[15px] text-[#1B2B3A] placeholder:text-[#CBD5E1] focus:border-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#1B2B3A]"
              />
            </div>
          </div>

          {/* ── Cash portion (read-only, derived) ───────────────── */}
          <div className="space-y-1.5">
            <label className="block font-inter text-[13px] font-medium text-[#64748B]">
              Cash Portion (computed)
            </label>
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                cashPortionPositive ? "bg-[#F1F5F9]" : "bg-rose-50 ring-1 ring-rose-200"
              }`}
            >
              <span className="font-inter text-[14px] text-[#64748B]">
                Rs.
              </span>
              <span
                className={`font-mono text-[18px] font-bold ${
                  cashPortionPositive ? "text-[#1B2B3A]" : "text-rose-500"
                }`}
              >
                {cardValid ? formatCurrency(cashPortion) : "—"}
              </span>
            </div>
          </div>

          {/* ── Allocation summary ───────────────────────────────── */}
          {cardValid && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] ${
                canConfirm || !cashReceivedInput
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {(canConfirm || !cashReceivedInput) && (
                <CheckCircle2 size={14} className="shrink-0" />
              )}
              <span>
                Card: {formatCurrency(cardAmount)} + Cash:{" "}
                {formatCurrency(cashPortion)} ={" "}
                <strong>{formatCurrency(total)}</strong>
              </span>
            </div>
          )}

          {/* ── Terminal reference ───────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="split-card-ref"
              className="block font-inter text-[13px] font-medium text-[#1B2B3A]"
            >
              Terminal Approval Code{" "}
              <span className="font-normal text-[#64748B]">(optional)</span>
            </label>
            <input
              id="split-card-ref"
              type="text"
              maxLength={20}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 012345"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 font-mono text-[15px] text-[#1B2B3A] placeholder:text-[#CBD5E1] focus:border-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#1B2B3A]"
            />
          </div>

          {/* ── Cash received + change due ───────────────────────── */}
          {cashPortionPositive && cardValid && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="split-cash-received"
                  className="block font-inter text-[13px] font-medium text-[#1B2B3A]"
                >
                  Cash Received (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-inter text-[14px] text-[#64748B]">
                    Rs.
                  </span>
                  <input
                    id="split-cash-received"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={cashReceivedInput}
                    onChange={(e) =>
                      formatDecimalInput(e.target.value, setCashReceivedInput)
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 font-mono text-[15px] text-[#1B2B3A] placeholder:text-[#CBD5E1] focus:border-[#1B2B3A] focus:outline-none focus:ring-1 focus:ring-[#1B2B3A]"
                  />
                </div>
              </div>

              {cashReceivedInput && (
                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    cashCovered
                      ? "bg-emerald-50 ring-1 ring-emerald-200"
                      : "bg-rose-50 ring-1 ring-rose-200"
                  }`}
                >
                  <span className="font-inter text-[14px] text-[#64748B]">
                    Change Due
                  </span>
                  <span
                    className={`font-mono text-[18px] font-bold ${
                      cashCovered ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {cashCovered ? formatCurrency(changeDue) : "Insufficient"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Confirm button ────────────────────────────────────── */}
        <div className="border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            disabled={!canConfirm || isLoading}
            onClick={() =>
              onConfirm({
                cardAmount,
                cashReceived,
                cardReferenceNumber: referenceNumber.trim() || null,
              })
            }
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#1B2B3A] font-inter text-[16px] font-bold text-white transition-colors hover:bg-[#2C3E50] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Processing…" : "Confirm Split Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
