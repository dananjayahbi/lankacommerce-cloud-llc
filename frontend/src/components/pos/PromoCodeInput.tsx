"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";

export function PromoCodeInput() {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "success" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const applied_promo_code = useCartStore((s) => s.applied_promo_code);
  const is_evaluating = useCartStore((s) => s.is_evaluating_promotions);
  const applied_promotions = useCartStore((s) => s.applied_promotions);
  const skipped_promotions = useCartStore((s) => s.skipped_promotions);
  const setPromoCode = useCartStore((s) => s.setPromoCode);

  const prevEvaluating = useRef(false);

  useEffect(() => {
    if (prevEvaluating.current && !is_evaluating && applied_promo_code) {
      const promoApplied = applied_promotions.some(
        (d) => d.promotion_type === "PROMO_CODE"
      );
      const promoSkipped = skipped_promotions.find(
        (s) => s.promotion_id === "promo_code"
      );

      if (promoApplied) {
        setFeedbackStatus("success");
        setFeedbackMessage(null);
      } else if (promoSkipped) {
        setFeedbackStatus("error");
        setFeedbackMessage(promoSkipped.reason);
      }
    }
    prevEvaluating.current = is_evaluating;
  }, [is_evaluating, applied_promotions, skipped_promotions, applied_promo_code]);

  function handleApply() {
    if (!inputValue.trim()) {
      setLocalError("Please enter a promo code.");
      return;
    }
    setLocalError(null);
    setFeedbackStatus("idle");
    setFeedbackMessage(null);
    setPromoCode(inputValue.trim().toUpperCase());
    setInputValue("");
  }

  function handleClear() {
    setPromoCode(null);
    setFeedbackStatus("idle");
    setFeedbackMessage(null);
    setLocalError(null);
  }

  // Show current active promo code chip
  const promoApplied =
    applied_promo_code &&
    applied_promotions.some((d) => d.promotion_type === "PROMO_CODE");

  if (promoApplied) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono font-medium"
          style={{ backgroundColor: "#E2E8F0", color: "#1B2B3A" }}
        >
          {applied_promo_code}
          <button type="button" onClick={handleClear} className="ml-1 hover:opacity-70">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1.5">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value.toUpperCase());
            setLocalError(null);
          }}
          placeholder="Promo Code"
          className="font-mono text-xs h-8"
          style={{ borderColor: "#E2E8F0" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleApply();
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleApply}
          className="h-8 text-xs shrink-0"
        >
          Apply
        </Button>
      </div>
      {localError && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {localError}
        </p>
      )}
      {feedbackStatus === "error" && feedbackMessage && (
        <p className="text-xs" style={{ color: "#EF4444" }}>
          {feedbackMessage}
        </p>
      )}
    </div>
  );
}
