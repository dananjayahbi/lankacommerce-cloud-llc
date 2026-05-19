"use client";

import { useState, useCallback } from "react";
import { Delete, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MAX_FAILURES = 3;
const PIN_LENGTH = 4;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable description of what is being authorised */
  contextMessage: string;
  onAuthorized: (managerId: string) => void;
}

export function CartManagerPINModal({
  open,
  onOpenChange,
  contextMessage,
  onAuthorized,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [digits, setDigits] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDigits([]);
    setIsSubmitting(false);
    setValidationMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    setFailCount(0);
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setDigits([]);
    }, 350);
  }, []);

  const submitPin = useCallback(
    async (pin: string) => {
      if (pin.length < PIN_LENGTH) {
        setValidationMsg("Enter all 4 digits");
        return;
      }
      setValidationMsg(null);
      setIsSubmitting(true);

      try {
        const res = await fetch(`${API_BASE}/api/auth/pin/verify/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ pin }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            success: boolean;
            data?: { user_id: string; role: string };
          };
          const data = json.data;
          if (data && (data.role === "MANAGER" || data.role === "OWNER")) {
            reset();
            setFailCount(0);
            onOpenChange(false);
            onAuthorized(data.user_id);
            return;
          }
          // Treated same as invalid PIN (CASHIER PIN entered)
        }

        // Failure path
        const newFail = failCount + 1;
        setFailCount(newFail);
        triggerShake();

        if (newFail >= MAX_FAILURES) {
          handleClose();
          toast.error("Manager authorisation failed — please try again.", {
            style: { background: "#EF4444", color: "#fff" },
          });
        }
      } catch {
        triggerShake();
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, failCount, handleClose, onAuthorized, onOpenChange, reset, triggerShake],
  );

  const pressDigit = useCallback(
    (d: string) => {
      if (isSubmitting) return;
      setDigits((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = [...prev, d];
        if (next.length === PIN_LENGTH) {
          // Auto-submit on 4th digit
          setTimeout(() => submitPin(next.join("")), 0);
        }
        return next;
      });
    },
    [isSubmitting, submitPin],
  );

  const pressBackspace = useCallback(() => {
    if (isSubmitting) return;
    setDigits((prev) => prev.slice(0, -1));
  }, [isSubmitting]);

  const pressSubmit = useCallback(() => {
    if (isSubmitting) return;
    void submitPin(digits.join(""));
  }, [digits, isSubmitting, submitPin]);

  const KEYPAD: Array<string | "back" | "submit"> = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "submit", "0", "back",
  ];

  return (
    <>
      {/* Shake keyframe injected scoped to this component */}
      <style>{`
        @keyframes pin-shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }
        .pin-shake { animation: pin-shake 300ms ease-in-out; }
      `}</style>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm gap-0 p-0" showCloseButton={false}>
          <DialogHeader className="border-b border-[#E2E8F0] px-6 py-4">
            <DialogTitle className="font-inter text-[17px] font-semibold text-[#1B2B3A]">
              Manager Authorisation Required
            </DialogTitle>
            <DialogDescription className="font-inter text-[13px] text-[#64748B]">
              {contextMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5">
            {/* PIN dot indicators */}
            <div
              className={`mb-6 flex items-center justify-center gap-4 ${shake ? "pin-shake" : ""}`}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 transition-colors duration-150 ${
                    i < digits.length
                      ? "border-[#1B2B3A] bg-[#1B2B3A]"
                      : "border-[#CBD5E1] bg-transparent"
                  }`}
                />
              ))}
            </div>

            {validationMsg && (
              <p className="mb-3 text-center font-inter text-[12px] text-[#64748B]">
                {validationMsg}
              </p>
            )}

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2">
              {KEYPAD.map((key, idx) => {
                if (key === "back") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={pressBackspace}
                      disabled={isSubmitting}
                      className="flex h-16 w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] text-[#1B2B3A] transition-colors hover:bg-[#E2E8F0] disabled:opacity-40"
                      aria-label="Backspace"
                    >
                      <Delete size={20} />
                    </button>
                  );
                }
                if (key === "submit") {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={pressSubmit}
                      disabled={isSubmitting || digits.length < PIN_LENGTH}
                      className="flex h-16 w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] text-[#1B2B3A] transition-colors hover:bg-[#E2E8F0] disabled:opacity-40"
                      aria-label="Submit PIN"
                    >
                      {isSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1B2B3A] border-t-transparent" />
                      ) : (
                        <Check size={20} />
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => pressDigit(key)}
                    disabled={isSubmitting}
                    className="flex h-16 w-full items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] font-inter text-[22px] font-medium text-[#1B2B3A] transition-colors hover:bg-[#E2E8F0] disabled:opacity-40"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cancel */}
          <div className="border-t border-[#E2E8F0] px-6 py-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg py-2 font-inter text-[14px] text-[#64748B] hover:text-[#1B2B3A]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
