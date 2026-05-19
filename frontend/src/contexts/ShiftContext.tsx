"use client";

import { createContext, useContext } from "react";
import type { Shift } from "@/types/pos";

interface ShiftContextValue {
  shift: Shift;
}

export const ShiftContext = createContext<ShiftContextValue | null>(null);

export function useShiftContext(): ShiftContextValue {
  const ctx = useContext(ShiftContext);
  if (!ctx) {
    throw new Error("useShiftContext must be used within ShiftContext.Provider");
  }
  return ctx;
}
