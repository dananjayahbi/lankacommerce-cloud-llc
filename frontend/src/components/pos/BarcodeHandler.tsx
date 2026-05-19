"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useAuthStore } from "@/stores/authStore";

interface ScanNotification {
  type: "success" | "warning" | "error";
  message: string;
}

interface BarcodeHandlerProps {
  /** Disable scanning when any modal capturing keyboard input is open. */
  enabled?: boolean;
}

/**
 * BarcodeHandler — mounts the useBarcodeScanner hook at the POS page level and
 * renders a brief, auto-dismissing flash strip at the top of the viewport to
 * confirm successful scans.
 *
 * Errors and out-of-stock warnings are shown via toast (handled inside the hook).
 * This component only renders the success flash.
 */
export function BarcodeHandler({ enabled = true }: BarcodeHandlerProps) {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenant_id ?? "";

  const [notification, setNotification] = useState<ScanNotification | null>(null);
  const [mounted, setMounted] = useState(false);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track client-side mount for portal
  useEffect(() => {
    setMounted(true);
    return () => {
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  }, []);

  const showNotification = useCallback((n: ScanNotification) => {
    setNotification(n);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => setNotification(null), 2500);
  }, []);

  useBarcodeScanner({
    tenantId,
    enabled,
    onAdd: (_, productName, variantDescription) => {
      showNotification({
        type: "success",
        message: `Added: ${productName}${variantDescription ? ` — ${variantDescription}` : ""}`,
      });
    },
  });

  if (!mounted || !notification) return null;

  const bgColor =
    notification.type === "success"
      ? "#22C55E"
      : notification.type === "warning"
        ? "#F59E0B"
        : "#EF4444";

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{ background: bgColor }}
      className="fixed left-0 right-0 top-0 z-[9999] flex h-8 items-center justify-center transition-all duration-150"
    >
      <span className="font-inter text-[13px] font-medium text-white">
        {notification.message}
      </span>
    </div>,
    document.body,
  );
}
