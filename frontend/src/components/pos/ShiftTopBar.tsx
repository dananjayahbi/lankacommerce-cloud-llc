"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HistoryIcon, LogOut } from "lucide-react";
import type { Shift } from "@/types/pos";
import { useAuthStore } from "@/stores/authStore";
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

function formatClock(): string {
  return new Date().toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function ShiftTopBar({ shift }: ShiftTopBarProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => formatElapsed(shift.opened_at));
  const [clock, setClock] = useState(() => formatClock());
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const shiftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUser = useAuthStore((s) => s.user);
  const cashierEmail = currentUser?.email ?? "cashier";
  const cashierDisplay = cashierEmail.includes("@")
    ? cashierEmail.split("@")[0]!
    : cashierEmail;
  const avatarLetter = cashierDisplay.charAt(0).toUpperCase();

  useEffect(() => {
    shiftTimerRef.current = setInterval(() => {
      setElapsed(formatElapsed(shift.opened_at));
    }, 60_000);
    clockTimerRef.current = setInterval(() => {
      setClock(formatClock());
    }, 1_000);
    return () => {
      if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, [shift.opened_at]);

  function handleExitPOS() {
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    } else {
      router.push("/store/dashboard");
    }
  }

  return (
    <>
      <div className="flex h-13 shrink-0 items-center justify-between border-b border-[#1E293B] bg-[#0F172A] px-4 py-2">
        {/* Left — exit + brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitPOS}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-inter text-[12px] font-medium text-[#64748B] transition-colors hover:bg-[#1E293B] hover:text-[#E2E8F0]"
          >
            <LogOut size={13} />
            Exit POS
          </button>
          <div className="h-4 w-px bg-[#1E293B]" />
          <span className="font-inter text-[14px] font-semibold tracking-wide text-white">
            LankaCommerce POS
          </span>
        </div>

        {/* Centre — cashier info */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316] font-inter text-[12px] font-bold text-white">
            {avatarLetter}
          </div>
          <span className="font-inter text-[13px] font-medium text-[#E2E8F0]">
            {cashierDisplay}
          </span>
          <span className="rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-2.5 py-0.5 font-inter text-[11px] font-medium text-[#FB923C]">
            Shift · {elapsed}
          </span>
        </div>

        {/* Right — clock + actions */}
        <div className="flex items-center gap-1.5">
          <span className="min-w-[76px] text-right font-mono text-[14px] font-semibold tabular-nums text-[#E2E8F0]">
            {clock}
          </span>
          <div className="h-4 w-px bg-[#1E293B]" />
          <button
            type="button"
            title="Sale History"
            onClick={() => router.push("/store/pos/history")}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-inter text-[12px] text-[#64748B] transition-colors hover:bg-[#1E293B] hover:text-white"
          >
            <HistoryIcon size={13} />
            History
          </button>
          <button
            type="button"
            onClick={() => setCloseModalOpen(true)}
            className="ml-1 flex items-center gap-1.5 rounded-md bg-[#EF4444] px-3 py-1.5 font-inter text-[12px] font-semibold text-white transition-colors hover:bg-[#DC2626]"
          >
            END SHIFT
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
