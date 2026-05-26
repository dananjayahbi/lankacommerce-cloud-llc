/**
 * CartStoreProvider
 *
 * Thin client-component wrapper that initialises the per-tenant cart store
 * before any child component tries to read from it. Must be rendered at the
 * webstore layout level so the store is available on every page.
 */

"use client";

import { useEffect } from "react";
import { initCart } from "@/lib/webstore/cartStore";

interface CartStoreProviderProps {
  tenantSlug: string;
  children: React.ReactNode;
}

export function CartStoreProvider({ tenantSlug, children }: CartStoreProviderProps) {
  useEffect(() => {
    initCart(tenantSlug);
  }, [tenantSlug]);

  return <>{children}</>;
}
