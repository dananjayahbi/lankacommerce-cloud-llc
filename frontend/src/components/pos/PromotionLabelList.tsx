"use client";

import Decimal from "decimal.js";
import type { AppliedDiscount } from "@/types/promotions";

interface Props {
  appliedDiscounts: AppliedDiscount[];
  isEvaluating: boolean;
}

export function PromotionLabelList({ appliedDiscounts, isEvaluating }: Props) {
  if (isEvaluating) {
    return (
      <div className="mt-1 animate-pulse rounded px-2 py-1" style={{ backgroundColor: "#E2E8F0", height: 24 }} />
    );
  }

  if (appliedDiscounts.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {appliedDiscounts.map((d) => (
        <div
          key={d.promotion_id}
          className="flex items-center justify-between rounded-r px-2 py-0.5 text-xs"
          style={{
            backgroundColor: "#F1F5F9",
            borderLeft: "4px solid #E2E8F0",
          }}
        >
          <span className="font-inter" style={{ color: "#64748B" }}>
            {d.label}
          </span>
          <span className="font-mono font-medium" style={{ color: "#1B2B3A" }}>
            −Rs. {new Decimal(d.discount_amount).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
