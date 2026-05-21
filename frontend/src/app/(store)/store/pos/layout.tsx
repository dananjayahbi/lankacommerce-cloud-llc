"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { PERMISSIONS } from "@/constants/permissions";
import { ShiftContext } from "@/contexts/ShiftContext";
import { ShiftOpenModal } from "@/components/pos/ShiftOpenModal";
import type { Shift } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchCurrentShift(token: string | null): Promise<Shift | null> {
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/pos/shifts/current/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = (await res.json()) as { success: boolean; data: Shift | null };
  return json.data ?? null;
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  // History/Returns/ShiftClose sub-routes use the standard store layout — bypass shift gate
  const isHistoryRoute =
    pathname.includes("/pos/history") ||
    pathname.includes("/pos/returns") ||
    pathname.includes("/pos/shift-close");

  // Redirect if user lacks POS access permission
  useEffect(() => {
    // Wait for user to hydrate before checking
    if (user !== null && !can(PERMISSIONS.SALES_CREATE)) {
      router.replace("/store/dashboard");
    }
  }, [user, can, router]);

  const {
    data: shift,
    isLoading,
  } = useQuery<Shift | null>({
    queryKey: ["pos-shift-current"],
    queryFn: () => fetchCurrentShift(accessToken),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    // For the history sub-route, show a simple spinner rather than the dark POS loader
    if (isHistoryRoute) {
      return (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#F97316] border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="flex h-dvh items-center justify-center bg-[#1B2B3A]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F97316] border-t-transparent" />
      </div>
    );
  }

  // History sub-route: render without shift gate or POS chrome
  if (isHistoryRoute) {
    return <>{children}</>;
  }

  // No open shift — gate the terminal
  if (!shift) {
    return (
      <div className="h-dvh overflow-hidden bg-[#1B2B3A]">
        <ShiftOpenModal />
      </div>
    );
  }

  return (
    <ShiftContext.Provider value={{ shift }}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#1B2B3A]">
        {children}
      </div>
    </ShiftContext.Provider>
  );
}
