/**
 * Cart Store — Zustand (persisted)
 *
 * Manages consumer cart state for the webstore storefront.
 * Persisted to localStorage via Zustand's `persist` middleware, scoped per
 * tenant slug so carts from different stores in the same browser never mix.
 *
 * Persistence key: `webstore-cart-<tenantSlug>`
 *
 * The store is initialised without a slug; call `initCart(slug)` once (in
 * the webstore layout) before any cart operations are performed.
 *
 * Security: cart data never contains tokens, passwords, or sensitive PII —
 * only product/variant identifiers, prices, titles, and quantities.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartLineItem {
  /** Variant-scoped unique identifier within the cart. */
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  /** Price in the smallest currency unit (e.g. cents). */
  price: number;
  imageUrl: string;
}

export interface AddItemPayload {
  title: string;
  variantTitle: string;
  sku: string;
  price: number;
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Store state + actions
// ---------------------------------------------------------------------------

export interface CartState {
  items: CartLineItem[];
  isOpen: boolean;

  // Actions
  addItem: (
    productId: string,
    variantId: string,
    quantity: number,
    payload: AddItemPayload,
  ) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

// ---------------------------------------------------------------------------
// Store factory — one instance per tenant slug
// ---------------------------------------------------------------------------

const storeInstances = new Map<string, ReturnType<typeof createCartStore>>();

function createCartStore(tenantSlug: string) {
  return create<CartState>()(
    persist(
      (set, get) => ({
        items: [],
        isOpen: false,

        addItem(productId, variantId, quantity, payload) {
          set((state) => {
            const existing = state.items.find((i) => i.variantId === variantId);
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: i.quantity + quantity }
                    : i,
                ),
              };
            }
            const newItem: CartLineItem = {
              variantId,
              productId,
              quantity,
              ...payload,
            };
            return { items: [...state.items, newItem] };
          });
        },

        removeItem(variantId) {
          set((state) => ({
            items: state.items.filter((i) => i.variantId !== variantId),
          }));
        },

        updateQuantity(variantId, quantity) {
          if (quantity <= 0) {
            get().removeItem(variantId);
            return;
          }
          set((state) => ({
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity } : i,
            ),
          }));
        },

        clearCart() {
          set({ items: [] });
        },

        toggleCart() {
          set((state) => ({ isOpen: !state.isOpen }));
        },

        openCart() {
          set({ isOpen: true });
        },

        closeCart() {
          set({ isOpen: false });
        },
      }),
      {
        name: `webstore-cart-${tenantSlug}`,
        storage: createJSONStorage(() => {
          // Guard against SSR where localStorage is unavailable.
          if (typeof window === "undefined") {
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          }
          return localStorage;
        }),
        // Only persist the item list — drawer open state is ephemeral.
        partialize: (state) => ({ items: state.items }),
      },
    ),
  );
}

// ---------------------------------------------------------------------------
// Public hook — `useCartStore`
// ---------------------------------------------------------------------------

/**
 * Returns the cart store for the given tenant slug.
 * Falls back to an anonymous in-memory store if called before `initCart`.
 *
 * Usage in components:
 *   const items = useCartStore((s) => s.items);
 *   const addItem = useCartStore((s) => s.addItem);
 */

let _currentSlug = "__default__";

/**
 * Must be called once in the webstore layout with the tenant's slug BEFORE
 * any component calls `useCartStore`. Safe to call multiple times with the
 * same slug.
 */
export function initCart(tenantSlug: string): void {
  _currentSlug = tenantSlug;
  if (!storeInstances.has(tenantSlug)) {
    storeInstances.set(tenantSlug, createCartStore(tenantSlug));
  }
}

/**
 * React hook. Subscribes to the current tenant's cart store.
 * Selector pattern keeps re-renders minimal.
 */
export function useCartStore<T>(selector: (state: CartState) => T): T {
  const store = storeInstances.get(_currentSlug);
  if (!store) {
    // Lazily initialise a default store to prevent crash during SSR or if
    // initCart wasn't called yet.
    initCart(_currentSlug);
    return storeInstances.get(_currentSlug)!<T>(selector);
  }
  return store<T>(selector);
}

/**
 * Direct (non-hook) access for use outside React components.
 * Returns the raw store instance for the current tenant.
 */
export function getCartStore() {
  const store = storeInstances.get(_currentSlug);
  if (!store) {
    initCart(_currentSlug);
    return storeInstances.get(_currentSlug)!;
  }
  return store;
}
