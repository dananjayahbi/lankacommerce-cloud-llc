"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HistoryIcon, PowerIcon } from "lucide-react";
import type { Shift } from "@/types/pos";
import { ShiftCloseModal } from "./ShiftCloseModal";

interface ShiftTopBarProps {
  shift: Shift;
}

function formatElapsed(openedAt: string): string {
  const diffMs = Date.now() - new Date(openedAt).getTime();
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ShiftTopBar({ shift }: ShiftTopBarProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => formatElapsed(shift.opened_at));
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(formatElapsed(shift.opened_at));
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shift.opened_at]);

  const cashierName =
    (shift.cashier as { first_name?: string; email?: string }).first_name ??
    shift.cashier.email ??
    "Cashier";

  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between bg-[#1B2B3A] px-4">
        {/* Left — store wordmark */}
        <span className="font-inter text-sm font-semibold tracking-wide text-[#E2E8F0]">
          LankaCommerce
        </span>

        {/* Centre — shift status */}
        <span className="font-inter text-[13px] text-[#64748B]">
          {cashierName} — Shift open {elapsed}
        </span>

        {/* Right — action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Sale History"
            onClick={() => router.push("/pos/history")}
            className="rounded p-1.5 text-[#64748B] transition-colors hover:text-white"
          >
            <HistoryIcon size={18} />
          </button>
          <button
            type="button"
            title="Close Shift"
            onClick={() => setCloseModalOpen(true)}
            className="rounded p-1.5 text-[#64748B] transition-colors hover:text-white"
          >
            <PowerIcon size={18} />
          </button>
        </div>
      </div>

      <ShiftCloseModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        shift={shift}
      />
    </>
  );
}
