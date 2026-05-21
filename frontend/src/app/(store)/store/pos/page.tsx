"use client";

import { WifiOff } from "lucide-react";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ShiftTopBar } from "@/components/pos/ShiftTopBar";
import { CartPanel } from "@/components/pos/CartPanel";
import { BarcodeHandler } from "@/components/pos/BarcodeHandler";
import { useShiftContext } from "@/contexts/ShiftContext";
import { useAuthStore } from "@/stores/authStore";
import { usePersistCartEffect } from "@/hooks/usePersistCartEffect";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function PosPage() {
  const { shift } = useShiftContext();
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenantSlug = useAuthStore((s) => s.user?.tenant_id) ?? undefined;

  // Persist cart to IndexedDB and restore on mount
  usePersistCartEffect(tenantSlug);

  // Track online status and sync queued offline sales
  const { isOnline, isSyncing, hasPendingSale, syncError } =
    useOfflineSync(accessToken);

  return (
    <>
      <BarcodeHandler enabled />
      <ShiftTopBar shift={shift} />

      {/* ── Offline status bar ───────────────────────────────────── */}
      {(!isOnline || hasPendingSale) && (
        <div
          className={`flex items-center gap-2 px-4 py-1.5 font-inter text-[12px] font-medium text-white ${
            isOnline ? "bg-amber-500" : "bg-rose-600"
          }`}
        >
          <WifiOff size={13} />
          {!isOnline && "Offline mode — sales will be queued and synced on reconnect"}
          {isOnline && hasPendingSale && (isSyncing ? "Syncing offline sale…" : "Pending offline sale — will sync shortly")}
          {syncError && (
            <span className="ml-2 text-white/80">{syncError}</span>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-row">
        {/* Left panel — product browsing (63%) */}
        <div className="flex min-h-0 flex-col overflow-hidden" style={{ flex: "0 0 63%" }}>
          <ErrorBoundary context="Product Grid">
            <ProductGrid />
          </ErrorBoundary>
        </div>

        {/* Right panel — cart (37%) */}
        <div
          className="flex min-h-0 flex-col overflow-hidden border-l border-[#2C3E50]"
          style={{ flex: "0 0 37%" }}
        >
          <ErrorBoundary context="Cart">
            <CartPanel />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
