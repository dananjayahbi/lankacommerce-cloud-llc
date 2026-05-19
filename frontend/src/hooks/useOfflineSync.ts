"use client";

/**
 * useOfflineSync
 *
 * Tracks online/offline status and replays queued offline sales
 * when the network connection is restored.
 *
 * Behaviour:
 *  - Listens to window "online" / "offline" events.
 *  - On reconnect, attempts to POST the oldest queued sale.
 *  - HTTP 410 (stale/expired) → discard + report error.
 *  - retryCount > 3 → discard + report error.
 *  - Success → dequeue + dispatch CustomEvent("lankacommerce:offlineSaleSynced").
 *  - Errors are surfaced via the returned `syncError` string.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dequeueOfflineSale,
  getQueuedSale,
  incrementRetryCount,
} from "@/lib/idb-store";
import type { CreateSalePayload, Sale } from "@/types/pos";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MAX_RETRY_COUNT = 3;

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingSale: boolean;
  syncError: string | null;
}

export function useOfflineSync(
  accessToken: string | null,
): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingSale, setHasPendingSale] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Keep a stable ref to access token to avoid hook dependency churn
  const tokenRef = useRef(accessToken);
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const checkQueue = useCallback(async () => {
    const queued = await getQueuedSale();
    setHasPendingSale(queued !== null);
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing) return;
    const token = tokenRef.current;
    if (!token) return;

    const queued = await getQueuedSale();
    if (!queued) {
      setHasPendingSale(false);
      return;
    }

    if (queued.retryCount > MAX_RETRY_COUNT) {
      // Too many retries — discard
      await dequeueOfflineSale(queued.id!);
      setSyncError(
        `Offline sale (queued ${queued.queuedAt}) discarded after ${MAX_RETRY_COUNT} failed retries.`,
      );
      setHasPendingSale(false);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const payload: CreateSalePayload = {
        ...queued.payload,
        queued_at: queued.queuedAt,
      };

      const res = await fetch(`${API_BASE}/api/pos/sales/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 410) {
        // Sale too old — discard
        await dequeueOfflineSale(queued.id!);
        setSyncError(
          `Offline sale from ${queued.queuedAt} was rejected (stale). Discarded.`,
        );
        setHasPendingSale(false);
        return;
      }

      if (!res.ok) {
        await incrementRetryCount(queued.id!);
        setSyncError(`Offline sync failed (HTTP ${res.status}). Will retry.`);
        return;
      }

      const json = (await res.json()) as { data?: Sale };
      await dequeueOfflineSale(queued.id!);
      setHasPendingSale(false);
      setSyncError(null);

      // Notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lankacommerce:offlineSaleSynced", {
            detail: { sale: json.data },
          }),
        );
      }
    } catch {
      await incrementRetryCount(queued.id!);
      setSyncError("Offline sync failed (network error). Will retry on reconnect.");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // ── Online / Offline event listeners ─────────────────────────────
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setSyncError(null);
      void syncQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check queue on mount
    void checkQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue, checkQueue]);

  return { isOnline, isSyncing, hasPendingSale, syncError };
}
