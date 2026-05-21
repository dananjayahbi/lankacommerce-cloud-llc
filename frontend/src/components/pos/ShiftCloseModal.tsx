"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useQuery } from "@tanstack/react-query";
import Decimal from "decimal.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import type { Shift } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  closing_cash_count: z
    .number({ error: "Enter a valid amount" })
    .min(0, "Cannot be negative"),
  notes: z.string().max(500, "Maximum 500 characters").optional(),
});

type FormValues = z.infer<typeof schema>;

interface ShiftCloseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift;
}

interface HeldSalesData {
  count: number;
}

async function fetchHeldSalesCount(
  shiftId: string,
  token: string | null,
): Promise<HeldSalesData> {
  if (!token) return { count: 0 };
  const res = await fetch(
    `${API_BASE}/api/pos/sales/?shift_id=${shiftId}&status=OPEN`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { count: 0 };
  const json = await res.json();
  const data = json.data ?? json;
  if (Array.isArray(data)) return { count: data.length };
  if (typeof data?.count === "number") return { count: data.count };
  if (Array.isArray(data?.results)) return { count: data.results.length };
  return { count: 0 };
}

export function ShiftCloseModal({
  open,
  onOpenChange,
  shift,
}: ShiftCloseModalProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: heldData, isLoading: heldLoading } = useQuery({
    queryKey: ["held-sales-count", shift.id],
    queryFn: () => fetchHeldSalesCount(shift.id, accessToken),
    enabled: open,
  });

  const heldCount = heldData?.count ?? 0;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as unknown as Resolver<FormValues>,
    defaultValues: { closing_cash_count: 0, notes: "" },
  });

  const cashCount = watch("closing_cash_count");

  const expectedCash = new Decimal(shift.opening_float ?? 0);
  const entered = isNaN(Number(cashCount)) ? new Decimal(0) : new Decimal(cashCount);
  const discrepancy = entered.sub(expectedCash);
  const discrepancyPositive = discrepancy.gte(0);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pos/shifts/${shift.id}/close/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          closing_cash_count: values.closing_cash_count.toFixed(2),
          notes: values.notes ?? "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(
          (body as { detail?: string }).detail ?? `Error ${res.status}`,
        );
        return;
      }

      onOpenChange(false);
      router.push("/store/dashboard");
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter text-[18px] text-[#1B2B3A]">
            Close Shift
          </DialogTitle>
        </DialogHeader>

        {heldLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-4 w-full animate-pulse rounded bg-[#F1F5F9]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#F1F5F9]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Held sales warning */}
            {heldCount > 0 && (
              <div className="mb-4 rounded-lg border border-[#F59E0B] bg-amber-50 p-3">
                <p className="font-inter text-[13px] text-[#92400E]">
                  You have{" "}
                  <strong>{heldCount}</strong> held sale
                  {heldCount !== 1 ? "s" : ""} that will be cancelled when you
                  close this shift. Retrieve and complete or discard them before
                  closing.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="mt-2 font-inter text-[12px] font-semibold text-[#F97316] hover:underline"
                >
                  Return to Terminal
                </button>
              </div>
            )}

            {/* Closing cash count */}
            <div className="mb-4">
              <label
                htmlFor="closing_cash_count"
                className="mb-1.5 block font-inter text-[13px] font-medium text-[#1B2B3A]"
              >
                Count your till and enter total cash
              </label>
              <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0] focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]">
                <span className="flex items-center bg-[#F1F5F9] px-3 font-inter text-sm text-[#64748B]">
                  Rs.
                </span>
                <input
                  id="closing_cash_count"
                  type="number"
                  step="0.01"
                  min="0"
                  className="flex-1 bg-white px-3 py-2.5 font-inter text-sm text-[#1B2B3A] outline-none"
                  disabled={isSubmitting}
                  {...register("closing_cash_count", { valueAsNumber: true })}
                />
              </div>
              {errors.closing_cash_count && (
                <p className="mt-1 font-inter text-[12px] text-[#EF4444]">
                  {errors.closing_cash_count.message}
                </p>
              )}
            </div>

            {/* Discrepancy preview */}
            <div className="mb-4 rounded-lg bg-[#F1F5F9] px-4 py-3">
              <div className="flex justify-between font-inter text-[13px]">
                <span className="text-[#64748B]">Opening float</span>
                <span className="text-[#1B2B3A]">
                  Rs. {expectedCash.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex justify-between font-inter text-[13px]">
                <span className="text-[#64748B]">Cash counted</span>
                <span className="text-[#1B2B3A]">
                  Rs. {entered.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#E2E8F0] pt-2 font-inter text-[13px] font-semibold">
                <span className="text-[#64748B]">Discrepancy</span>
                <span
                  className={
                    discrepancy.isZero()
                      ? "text-[#1B2B3A]"
                      : discrepancyPositive
                        ? "text-green-600"
                        : "text-[#EF4444]"
                  }
                >
                  {discrepancyPositive && !discrepancy.isZero() ? "+" : ""}
                  Rs. {discrepancy.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label
                htmlFor="notes"
                className="mb-1.5 block font-inter text-[13px] font-medium text-[#1B2B3A]"
              >
                Notes{" "}
                <span className="font-normal text-[#64748B]">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-inter text-sm text-[#1B2B3A] outline-none placeholder:text-[#64748B] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                placeholder="End-of-shift observations…"
                disabled={isSubmitting}
                {...register("notes")}
              />
              {errors.notes && (
                <p className="mt-1 font-inter text-[12px] text-[#EF4444]">
                  {errors.notes.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <p className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 font-inter text-[12px] text-[#EF4444]">
                {serverError}
              </p>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 font-inter text-sm text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-[#1B2B3A] px-4 py-2.5 font-inter text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Closing…
                  </>
                ) : (
                  "Close Shift & Reconcile"
                )}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
