"use client";

/**
 * usePersistCartEffect
 *
 * Saves the current cart state to IndexedDB on every change and
 * restores it on mount. Each tenant gets its own storage key so
 * that multi-tenant installs don't share cart data.
 *
 * Errors are logged as warnings — never thrown — so a broken IDB
 * implementation never crashes the POS terminal.
 */

import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import {
  clearCartSnapshot,
  loadCartSnapshot,
  saveCartSnapshot,
} from "@/lib/idb-store";

const PERSIST_KEY_PREFIX = "lankacommerce_cart_";

export function usePersistCartEffect(tenantSlug: string | undefined) {
  const items = useCartStore((s) => s.items);
  const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
  const cartDiscountPercent = useCartStore((s) => s.cartDiscountPercent);
  const authorizingManagerId = useCartStore((s) => s.authorizingManagerId);
  const replaceCart = useCartStore((s) => s.replaceCart);

  const storeKey = tenantSlug
    ? `${PERSIST_KEY_PREFIX}${tenantSlug}`
    : null;

  // ── On mount: restore cart from IDB ──────────────────────────────
  useEffect(() => {
    if (!storeKey) return;
    loadCartSnapshot(storeKey)
      .then((snapshot) => {
        if (snapshot && snapshot.items.length > 0) {
          replaceCart(
            snapshot.items,
            snapshot.cartDiscountAmount,
            snapshot.cartDiscountPercent,
            snapshot.authorizingManagerId,
          );
        }
      })
      .catch((err: unknown) =>
        console.warn("[usePersistCartEffect] restore error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  // ── On change: save cart (or clear when empty) ───────────────────
  useEffect(() => {
    if (!storeKey) return;
    if (items.length === 0) {
      clearCartSnapshot(storeKey).catch((err: unknown) =>
        console.warn("[usePersistCartEffect] clear error:", err),
      );
    } else {
      saveCartSnapshot(
        storeKey,
        items,
        cartDiscountAmount,
        cartDiscountPercent,
        authorizingManagerId,
      ).catch((err: unknown) =>
        console.warn("[usePersistCartEffect] save error:", err),
      );
    }
  }, [
    storeKey,
    items,
    cartDiscountAmount,
    cartDiscountPercent,
    authorizingManagerId,
  ]);
}
