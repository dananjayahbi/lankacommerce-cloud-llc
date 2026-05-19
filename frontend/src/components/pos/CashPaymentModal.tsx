"use client";

/**
 * CashPaymentModal
 *
 * Full-screen overlay modal to collect a cash payment.
 * Displays the order total, an oversized numeric keypad, change due
 * calculation, and a "Confirm Payment" button.
 *
 * Layout reference (spec Task 03.02.03):
 *  - Overlay: fixed inset-0 bg-black/60
 *  - Card: w-full max-w-md rounded-2xl bg-white
 *  - Shows order total and entered cash amount in JetBrains Mono
 *  - 3×4 numeric keypad grid
 *  - Change due shown in green when amount ≥ total
 *  - Confirm button active only when amount ≥ total
 */

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/formatCurrency";

interface CashPaymentModalProps {
  /** The exact total amount the customer owes (Decimal instance). */
  total: Decimal;
  /** Called when the cashier confirms the payment with the cash amount received. */
  onConfirm: (cashReceived: Decimal) => void;
  /** Called when the modal is closed/cancelled. */
  onClose: () => void;
  /** Whether the confirm action is loading (POST in progress). */
  isLoading?: boolean;
}

const QUICK_CASH_OPTIONS: number[] = [500, 1000, 2000, 5000];

export function CashPaymentModal({
  total,
  onConfirm,
  onClose,
  isLoading = false,
}: CashPaymentModalProps) {
  const [input, setInput] = useState<string>("");

  // Parse numeric string to Decimal safely
  const cashReceived = input.length > 0 ? new Decimal(input) : new Decimal(0);
  const isSufficient = cashReceived.gte(total);
  const changeDue = isSufficient ? cashReceived.sub(total) : new Decimal(0);

  // Quick-fill buttons — round up to nearest preset
  const presets = QUICK_CASH_OPTIONS.filter((p) => new Decimal(p).gte(total));
  if (presets.length === 0) presets.push(total.ceil().toNumber());

  const handleDigit = useCallback((digit: string) => {
    setInput((prev) => {
      if (digit === "." && prev.includes(".")) return prev;
      if (digit === "00" && prev === "") return prev;
      const next = prev + digit;
      // Clamp decimal places to 2
      const parts = next.split(".");
      if (parts[1] !== undefined && parts[1].length > 2) return prev;
      return next;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && isSufficient && !isLoading) {
        onConfirm(cashReceived);
      }
      // Numeric keys
      if (/^\d$/.test(e.key)) handleDigit(e.key);
      if (e.key === "." || e.key === ",") handleDigit(".");
      if (e.key === "Backspace") handleBackspace();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSufficient, isLoading, onConfirm, onClose, cashReceived, handleDigit, handleBackspace]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="font-inter text-[18px] font-bold text-[#1B2B3A]">
            Cash Payment
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

        <div className="px-6 py-4 space-y-4">
          {/* ── Order total row ──────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl bg-[#F1F5F9] px-4 py-3">
            <span className="font-inter text-[14px] text-[#64748B]">
              Order Total
            </span>
            <span className="font-mono text-[20px] font-bold text-[#1B2B3A]">
              {formatCurrency(total)}
            </span>
          </div>

          {/* ── Cash received display ────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl border-2 border-[#1B2B3A] bg-white px-4 py-3">
            <span className="font-inter text-[14px] text-[#64748B]">
              Cash Received
            </span>
            <span className="font-mono text-[24px] font-bold text-[#1B2B3A]">
              {input ? formatCurrency(cashReceived) : <span className="text-[#CBD5E1]">Rs. 0.00</span>}
            </span>
          </div>

          {/* ── Change due ───────────────────────────────────────── */}
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
              isSufficient && cashReceived.gt(0)
                ? "bg-emerald-50 ring-1 ring-emerald-200"
                : "bg-[#F1F5F9]"
            }`}
          >
            <span className="font-inter text-[14px] text-[#64748B]">
              Change Due
            </span>
            <span
              className={`font-mono text-[20px] font-bold ${
                isSufficient && cashReceived.gt(0)
                  ? "text-emerald-600"
                  : "text-[#CBD5E1]"
              }`}
            >
              {isSufficient && cashReceived.gt(0)
                ? formatCurrency(changeDue)
                : "—"}
            </span>
          </div>

          {/* ── Quick cash presets ───────────────────────────────── */}
          <div className="flex gap-2">
            {presets.slice(0, 4).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInput(String(preset))}
                className="flex-1 rounded-lg border border-[#E2E8F0] bg-white py-1.5 font-inter text-[12px] font-medium text-[#1B2B3A] hover:bg-[#F1F5F9]"
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>

          {/* ── Numeric keypad ───────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "00"].map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDigit(key)}
                  className="h-12 rounded-xl border border-[#E2E8F0] bg-white font-inter text-[18px] font-medium text-[#1B2B3A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]"
                >
                  {key}
                </button>
              ),
            )}
          </div>

          {/* ── Backspace / Clear row ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded-xl border border-[#E2E8F0] bg-white font-inter text-[14px] text-[#64748B] hover:bg-[#F1F5F9]"
            >
              ⌫ Backspace
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="h-10 rounded-xl border border-[#E2E8F0] bg-white font-inter text-[14px] text-[#64748B] hover:bg-[#F1F5F9]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Confirm button ────────────────────────────────────── */}
        <div className="border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            disabled={!isSufficient || isLoading}
            onClick={() => onConfirm(cashReceived)}
            className="flex h-13 w-full items-center justify-center rounded-xl bg-[#1B2B3A] font-inter text-[16px] font-bold text-white transition-colors hover:bg-[#2C3E50] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Processing…" : `Confirm Payment — ${formatCurrency(cashReceived)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
