"use client";

import { useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * Default inactivity timeout: 10 minutes
 */
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Events that reset the inactivity timer.
 * Chosen to cover all meaningful user interactions in a POS environment.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

interface UseInactivityTimerOptions {
  /** Timeout in milliseconds before the screen locks. Default: 10 minutes. */
  timeoutMs?: number;
  /** Whether the timer should be active. Set to false to disable. */
  enabled?: boolean;
}

/**
 * useInactivityTimer — Tracks user inactivity and locks the screen after timeout.
 *
 * Attach this hook to a layout-level component that persists across navigation
 * within the store section (e.g., StoreLayoutClient).
 *
 * Usage:
 *   useInactivityTimer({ timeoutMs: 10 * 60 * 1000, enabled: isAuthenticated });
 */
export function useInactivityTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  enabled = true,
}: UseInactivityTimerOptions = {}) {
  const lockScreen = useUIStore((state) => state.lockScreen);
  const isScreenLocked = useUIStore((state) => state.isScreenLocked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      lockScreen();
    }, timeoutMs);
  }, [lockScreen, timeoutMs]);

  useEffect(() => {
    // Don't start the timer if disabled or already locked
    if (!enabled || isScreenLocked) return;

    // Start the timer initially
    resetTimer();

    // Attach activity listeners
    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [enabled, isScreenLocked, resetTimer]);
}
