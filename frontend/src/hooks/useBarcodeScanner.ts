"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { BARCODE_INTER_KEYSTROKE_THRESHOLD_MS } from "@/config/pos.config";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Minimum character count for a string to be treated as a valid barcode */
const MIN_BARCODE_LENGTH = 6;

/** After this many ms of silence following the last keystroke, auto-flush the buffer */
const FLUSH_IDLE_MS = 100;

/** Shape returned by GET /api/catalog/variants/barcode/{barcode}/ */
interface VariantBarcodeResult {
  id: string;
  sku: string;
  barcode: string | null;
  product_id: string;
  product_name: string;
  variant_description: string;
  retail_price: string;
  stock_quantity: number;
}

export interface UseBarcodeScanner {
  tenantId: string;
  /** Called after a variant is successfully added to the cart */
  onAdd?: (variantId: string, productName: string, variantDescription: string) => void;
  /** Disable the hook while any modal that captures keyboard input is open */
  enabled?: boolean;
}

/**
 * useBarcodeScanner — captures USB HID barcode scanner input from window keydown events.
 *
 * Hardware barcode scanners emit characters at ≤ 50ms intervals, far faster than
 * human typing. This hook exploits that timing difference to distinguish scanner
 * input from keyboard input without requiring any special driver.
 *
 * All mutable state uses useRef to avoid triggering re-renders on every keystroke.
 */
export function useBarcodeScanner({ tenantId, onAdd, enabled = true }: UseBarcodeScanner) {
  const queryClient = useQueryClient();
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (barcode: string) => {
      const trimmed = barcode.trim();
      if (trimmed.length < MIN_BARCODE_LENGTH) return;

      try {
        const accessToken = useAuthStore.getState().accessToken;
        const data = await queryClient.fetchQuery<VariantBarcodeResult>({
          queryKey: ["variant-by-barcode", trimmed, tenantId],
          queryFn: async () => {
            const res = await fetch(
              `${API_BASE}/api/catalog/variants/barcode/${encodeURIComponent(trimmed)}/?tenant_id=${encodeURIComponent(tenantId)}`,
              {
                headers: accessToken
                  ? { Authorization: `Bearer ${accessToken}` }
                  : {},
              },
            );
            if (res.status === 404) {
              throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
            }
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            return (json.data ?? json) as VariantBarcodeResult;
          },
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
        });

        if (data.stock_quantity <= 0) {
          toast.warning(
            `Out of stock: ${data.product_name}${data.variant_description ? ` — ${data.variant_description}` : ""}`,
          );
          return;
        }

        useCartStore.getState().addItem({
          variantId: data.id,
          productName: data.product_name,
          variantDescription: data.variant_description,
          sku: data.sku,
          unitPrice: data.retail_price,
          quantity: 1,
        });

        onAdd?.(data.id, data.product_name, data.variant_description);
      } catch (err) {
        if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
          toast.error(`Unknown barcode: ${trimmed}`);
        } else {
          toast.error("Could not look up barcode — check connection.");
        }
      }
    },
    [tenantId, onAdd, queryClient],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Early exit: typing into a focused input / textarea / contentEditable
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.contentEditable === "true")
      ) {
        return;
      }

      // Early exit: hook is disabled (e.g. a modal capturing keyboard input is open)
      if (!enabled) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;

      if (event.key === "Enter") {
        // Complete scan — flush if buffer has enough chars
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          const captured = bufferRef.current;
          bufferRef.current = "";
          if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
          flush(captured);
        }
        lastKeyTimeRef.current = 0;
        return;
      }

      // Only process single printable characters
      if (event.key.length !== 1) return;

      if (elapsed <= BARCODE_INTER_KEYSTROKE_THRESHOLD_MS) {
        // Fast keystroke — part of a scan sequence
        bufferRef.current += event.key;
        lastKeyTimeRef.current = now;

        // Cancel previous idle-flush and schedule a new one
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = setTimeout(() => {
          const captured = bufferRef.current;
          bufferRef.current = "";
          lastKeyTimeRef.current = 0;
          flush(captured);
        }, FLUSH_IDLE_MS);
      } else {
        // Slow keystroke (human typing)
        if (bufferRef.current.length > 0) {
          // Interrupted an in-progress scan — discard partial buffer
          bufferRef.current = "";
          if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        }
        // Record timing for next character, but do NOT add to buffer
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, [enabled, flush]);
}
