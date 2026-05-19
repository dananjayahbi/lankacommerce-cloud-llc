"use client";

import { AlertCircleIcon, BanknoteIcon, CreditCardIcon, GiftIcon, ArrowLeftRightIcon } from "lucide-react";
import type { ReturnRefundMethod } from "@/types/pos";

interface Props {
  value: ReturnRefundMethod;
  onChange: (method: ReturnRefundMethod) => void;
  cardReversalReference: string;
  onCardReferenceChange: (ref: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  totalRefund: string;
}

const METHODS: Array<{
  id: ReturnRefundMethod;
  label: string;
  description: string;
  Icon: React.ElementType;
}> = [
  {
    id: "CASH",
    label: "Cash Refund",
    description: "Return cash to the customer from the till.",
    Icon: BanknoteIcon,
  },
  {
    id: "CARD_REVERSAL",
    label: "Card Reversal",
    description: "Reverse the charge on the customer's card.",
    Icon: CreditCardIcon,
  },
  {
    id: "STORE_CREDIT",
    label: "Store Credit",
    description: "Issue store credit for future purchases.",
    Icon: GiftIcon,
  },
  {
    id: "EXCHANGE",
    label: "Exchange Items",
    description: "Swap for new items — refund applied to new sale.",
    Icon: ArrowLeftRightIcon,
  },
];

export function ReturnRefundOptionsStep({
  value,
  onChange,
  cardReversalReference,
  onCardReferenceChange,
  reason,
  onReasonChange,
  totalRefund,
}: Props) {
  const MAX_REASON = 200;

  return (
    <div className="flex flex-col gap-4">
      {/* Refund total header (hidden for exchange) */}
      {value !== "EXCHANGE" && (
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-right">
          <span className="font-inter text-[12px] text-[#64748B]">Refund amount: </span>
          <span className="font-mono text-[16px] font-bold text-[#1B2B3A]">
            Rs.&nbsp;{parseFloat(totalRefund).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Method selection */}
      <div className="grid grid-cols-2 gap-2">
        {METHODS.map(({ id, label, description, Icon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition-colors ${
                selected
                  ? "border-[#F97316] bg-[#FFF7ED]"
                  : "border-[#E2E8F0] bg-white hover:border-[#F97316]/40 hover:bg-[#FFF7ED]/30"
              }`}
            >
              <Icon
                size={18}
                className={selected ? "text-[#F97316]" : "text-[#64748B]"}
              />
              <span className={`font-inter text-[13px] font-semibold ${selected ? "text-[#1B2B3A]" : "text-[#1B2B3A]"}`}>
                {label}
              </span>
              <span className="font-inter text-[11px] text-[#64748B]">{description}</span>
            </button>
          );
        })}
      </div>

      {/* Card reversal reference input */}
      {value === "CARD_REVERSAL" && (
        <div className="flex flex-col gap-1">
          <label className="font-inter text-[12px] font-medium text-[#1B2B3A]">
            Card Reversal Reference <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            maxLength={50}
            value={cardReversalReference}
            onChange={(e) => onCardReferenceChange(e.target.value)}
            placeholder="Terminal approval code"
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
          />
        </div>
      )}

      {/* Exchange banner */}
      {value === "EXCHANGE" && (
        <div className="flex items-start gap-2 rounded-lg border border-[#F97316]/30 bg-[#FFF7ED] p-3">
          <ArrowLeftRightIcon size={15} className="mt-0.5 shrink-0 text-[#F97316]" />
          <p className="font-inter text-[12px] text-[#92400E]">
            After completing this return, the refund amount will be applied as exchange credit on
            the next sale in the POS terminal.
          </p>
        </div>
      )}

      {/* Store credit info */}
      {value === "STORE_CREDIT" && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <AlertCircleIcon size={15} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="font-inter text-[12px] text-blue-700">
            Store credit will be issued and can be redeemed in a future transaction. CRM integration
            for customer linking is planned for Phase 04.
          </p>
        </div>
      )}

      {/* Reason textarea */}
      <div className="flex flex-col gap-1">
        <label className="font-inter text-[12px] font-medium text-[#1B2B3A]">
          Reason for return
        </label>
        <textarea
          maxLength={MAX_REASON}
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Optional note about why this return was initiated..."
          className="resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 font-inter text-[13px] text-[#1B2B3A] focus:border-[#F97316] focus:outline-none"
        />
        <span className="self-end font-inter text-[11px] text-[#64748B]">
          {reason.length}/{MAX_REASON}
        </span>
      </div>
    </div>
  );
}
