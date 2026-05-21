"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type MovementType = "PETTY_CASH_OUT" | "MANUAL_IN";

interface Props {
  shiftId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export default function RecordCashMovementForm({
  shiftId,
  onSuccess,
  onError,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [type, setType] = useState<MovementType>("PETTY_CASH_OUT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled =
    isSubmitting || amount === "" || reason.trim() === "";
  const reasonOverLimit = reason.length > 190;

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/pos/shifts/${shiftId}/cash-movements/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken ?? ""}`,
          },
          body: JSON.stringify({ type, amount, reason }),
        },
      );
      const body = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (body.success) {
        setAmount("");
        setReason("");
        setType("PETTY_CASH_OUT");
        onSuccess();
      } else {
        onError(body.error?.message ?? "Failed to record cash movement.");
      }
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Type selector tiles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setType("PETTY_CASH_OUT")}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
            type === "PETTY_CASH_OUT"
              ? "border-red-500 bg-red-50"
              : "border-border bg-background"
          }`}
        >
          <ArrowUpCircle
            className={`w-7 h-7 ${type === "PETTY_CASH_OUT" ? "text-red-500" : "text-text-muted"}`}
          />
          <span className="text-sm font-medium text-navy">Petty Cash Out</span>
        </button>

        <button
          type="button"
          onClick={() => setType("MANUAL_IN")}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
            type === "MANUAL_IN"
              ? "border-green-500 bg-green-50"
              : "border-border bg-background"
          }`}
        >
          <ArrowDownCircle
            className={`w-7 h-7 ${type === "MANUAL_IN" ? "text-green-500" : "text-text-muted"}`}
          />
          <span className="text-sm font-medium text-navy">Cash In</span>
        </button>
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="cm-amount" className="text-sm font-medium text-navy mb-1 block">
          Amount (Rs.)
        </Label>
        <Input
          id="cm-amount"
          type="number"
          min={0}
          step={0.01}
          max={10000}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ fontFamily: "JetBrains Mono, monospace" }}
          className="text-sm"
        />
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="cm-reason" className="text-sm font-medium text-navy mb-1 block">
          Reason
        </Label>
        <Textarea
          id="cm-reason"
          maxLength={200}
          placeholder="e.g., Bought paper cups and straws"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="resize-none"
          rows={3}
        />
        <div className={`text-xs font-mono text-right mt-1 ${reasonOverLimit ? "text-red-500" : "text-text-muted"}`}>
          {reason.length}/200
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full"
        style={
          isDisabled
            ? { backgroundColor: "#E2E8F0", color: "#94A3B8", cursor: "not-allowed" }
            : type === "PETTY_CASH_OUT"
              ? { backgroundColor: "#EF4444", color: "#fff" }
              : { backgroundColor: "#22C55E", color: "#fff" }
        }
        onClick={() => void handleSubmit()}
        disabled={isDisabled}
      >
        {isSubmitting
          ? "Recording..."
          : `Record ${type === "PETTY_CASH_OUT" ? "Petty Cash" : "Cash In"}`}
      </Button>
    </div>
  );
}
