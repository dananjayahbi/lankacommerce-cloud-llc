"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  opening_float: z
    .number({ error: "Enter a valid amount" })
    .min(0, "Float cannot be negative"),
});

type FormValues = z.infer<typeof schema>;

interface ShiftOpenModalProps {}

export function ShiftOpenModal(_props: ShiftOpenModalProps) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as unknown as Resolver<FormValues>,
    defaultValues: { opening_float: 0 },
  });

  const floatValue = watch("opening_float");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pos/shifts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ opening_float: values.opening_float.toFixed(2) }),
      });

      if (res.status === 409) {
        setServerError(
          "A shift is already open on another device. Contact your manager to resolve this.",
        );
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(
          (body as { detail?: string }).detail ?? `Error ${res.status}`,
        );
        return;
      }

      // Invalidate and refetch so the layout renders the terminal
      await queryClient.invalidateQueries({ queryKey: ["pos-shift-current"] });
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1B2B3A]">
      <div className="w-full max-w-[400px] rounded-xl bg-white px-8 py-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-inter text-xl font-bold text-[#1B2B3A]">
            LankaCommerce
          </h1>
          <p className="mt-1 font-inter text-sm text-[#64748B]">Open Your Shift</p>
          <p className="mt-2 font-inter text-[13px] text-[#64748B]">
            Enter the opening cash float — the amount of cash in the till at the
            start of your shift.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Opening float input */}
          <div className="mb-4">
            <label
              htmlFor="opening_float"
              className="mb-1.5 block font-inter text-[13px] font-medium text-[#1B2B3A]"
            >
              Opening Float
            </label>
            <div className="flex overflow-hidden rounded-lg border border-[#E2E8F0] focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-[#F97316]">
              <span className="flex items-center bg-[#F1F5F9] px-3 font-inter text-sm text-[#64748B]">
                Rs.
              </span>
              <input
                id="opening_float"
                type="number"
                step="0.01"
                min="0"
                className="flex-1 bg-white px-3 py-2.5 font-inter text-sm text-[#1B2B3A] outline-none placeholder:text-[#64748B]"
                placeholder="0.00"
                disabled={isSubmitting}
                {...register("opening_float", { valueAsNumber: true })}
              />
            </div>
            {errors.opening_float && (
              <p className="mt-1 font-inter text-[12px] text-[#EF4444]">
                {errors.opening_float.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 font-inter text-[12px] text-[#EF4444]">
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || floatValue === undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B2B3A] px-4 py-3 font-inter text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Opening…
              </>
            ) : (
              "Start Shift"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
