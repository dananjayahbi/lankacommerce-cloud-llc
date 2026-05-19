"use client";

/**
 * PaymentMethodSheet
 *
 * Bottom-sheet style overlay to choose between Cash, Card, and Split.
 * Shown when the cashier taps "Charge / Pay" in the CartPanel.
 */

import { Banknote, CreditCard, SplitSquareVertical, X } from "lucide-react";
import type { PaymentMethod } from "@/types/pos";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/formatCurrency";

interface PaymentMethodSheetProps {
  total: Decimal;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}

const METHODS: Array<{
  method: PaymentMethod;
  label: string;
  description: string;
  Icon: React.ElementType;
}> = [
  {
    method: "CASH",
    label: "Cash",
    description: "Accept cash and compute change",
    Icon: Banknote,
  },
  {
    method: "CARD",
    label: "Card",
    description: "Charge full amount to card terminal",
    Icon: CreditCard,
  },
  {
    method: "SPLIT",
    label: "Split (Card + Cash)",
    description: "Part card, part cash",
    Icon: SplitSquareVertical,
  },
];

export function PaymentMethodSheet({
  total,
  onSelect,
  onClose,
}: PaymentMethodSheetProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white pb-safe sm:rounded-2xl sm:shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <p className="font-inter text-[12px] text-[#64748B]">Total to collect</p>
            <p className="font-mono text-[22px] font-bold text-[#1B2B3A]">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Method options */}
        <div className="space-y-2 p-4">
          {METHODS.map(({ method, label, description, Icon }) => (
            <button
              key={method}
              type="button"
              onClick={() => onSelect(method)}
              className="flex w-full items-center gap-4 rounded-xl border border-[#E2E8F0] px-4 py-4 text-left transition-colors hover:border-[#1B2B3A] hover:bg-[#F1F5F9]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#1B2B3A]">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-inter text-[15px] font-semibold text-[#1B2B3A]">
                  {label}
                </p>
                <p className="font-inter text-[12px] text-[#64748B]">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
