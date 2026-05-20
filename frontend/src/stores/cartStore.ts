import { create } from "zustand";
import Decimal from "decimal.js";
import type { CartItem } from "@/types/pos";

// Configure Decimal for monetary rounding
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

interface CartState {
  items: CartItem[];
  /** Fixed-amount cart discount (Decimal string). Active when cartDiscountPercent is "0". */
  cartDiscountAmount: string;
  /** Percentage cart discount (0–100, Decimal string). Active when > "0". */
  cartDiscountPercent: string;
  /** user_id of the manager who authorised an above-threshold discount */
  authorizingManagerId: string | null;
  /** variantId of the cart line currently open for inline discount editing */
  activeLineId: string | null;
  heldSaleId: string | null;
  /** Exchange flow: ID of the Return record whose credit is being consumed */
  linkedReturnId: string | null;
  /** Exchange credit amount (decimal string) to apply against this sale */
  exchangeCredit: string | null;
  /** Human-readable reference for the exchange (return short-ID) */
  exchangeReturnRef: string | null;

  // Customer linking (CRM)
  linked_customer_id: string | null;
  linked_customer_name: string | null;
  linked_customer_credit_balance: string | null;
  applied_store_credit: string;

  // Computed derived values
  getSubtotal: () => Decimal;
  getCartDiscountEffective: () => Decimal;
  getDiscountAmount: () => Decimal;
  getTaxAmount: () => Decimal;
  getTotal: () => Decimal;

  // Actions
  addItem: (item: Omit<CartItem, "id" | "discountPercent">) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  updateLineDiscount: (variantId: string, discountPercent: string) => void;
  setCartDiscount: (mode: "percent" | "fixed", value: string) => void;
  setAuthorizingManager: (managerId: string | null) => void;
  setActiveLine: (variantId: string | null) => void;
  clearCart: () => void;
  setHeldSaleId: (id: string | null) => void;
  setExchangeCredit: (returnId: string, credit: string, ref: string) => void;
  clearExchangeCredit: () => void;
  replaceCart: (
    items: CartItem[],
    cartDiscountAmount: string,
    cartDiscountPercent: string,
    authorizingManagerId: string | null,
  ) => void;
  linkCustomer: (id: string, name: string, creditBalance: string) => void;
  unlinkCustomer: () => void;
  setAppliedStoreCredit: (amount: string) => void;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  cartDiscountAmount: "0",
  cartDiscountPercent: "0",
  authorizingManagerId: null,
  activeLineId: null,
  heldSaleId: null,
  linkedReturnId: null,
  exchangeCredit: null,
  exchangeReturnRef: null,
  linked_customer_id: null,
  linked_customer_name: null,
  linked_customer_credit_balance: null,
  applied_store_credit: "0",

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((acc, item) => {
      const unitPrice = new Decimal(item.unitPrice);
      const quantity = new Decimal(item.quantity);
      const discountPercent = new Decimal(item.discountPercent);
      const lineGross = unitPrice.mul(quantity);
      const lineDiscount = lineGross.mul(discountPercent).div(100);
      return acc.add(lineGross.sub(lineDiscount));
    }, new Decimal(0));
  },

  getCartDiscountEffective: () => {
    const { cartDiscountPercent, cartDiscountAmount, getSubtotal } = get();
    const pct = new Decimal(cartDiscountPercent);
    if (pct.gt(0)) {
      return getSubtotal().mul(pct).div(100).toDecimalPlaces(2);
    }
    return new Decimal(cartDiscountAmount);
  },

  getDiscountAmount: () => {
    return get().getCartDiscountEffective();
  },

  getTaxAmount: () => {
    // Tax is computed server-side on sale finalisation
    return new Decimal(0);
  },

  getTotal: () => {
    const { getSubtotal, getCartDiscountEffective } = get();
    return getSubtotal().sub(getCartDiscountEffective()).toDecimalPlaces(2);
  },

  addItem: (itemData) => {
    set((state) => {
      const existing = state.items.find((i) => i.variantId === itemData.variantId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === itemData.variantId
              ? { ...i, quantity: i.quantity + itemData.quantity }
              : i,
          ),
        };
      }
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        discountPercent: "0",
        ...itemData,
      };
      return { items: [...state.items, newItem] };
    });
  },

  removeItem: (variantId) => {
    set((state) => ({
      items: state.items.filter((i) => i.variantId !== variantId),
      activeLineId: state.activeLineId === variantId ? null : state.activeLineId,
    }));
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity < 1) return;
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId ? { ...i, quantity } : i,
      ),
    }));
  },

  updateLineDiscount: (variantId, discountPercent) => {
    const clamped = new Decimal(discountPercent)
      .clampedTo(0, 100)
      .toFixed(2);
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId ? { ...i, discountPercent: clamped } : i,
      ),
    }));
  },

  setCartDiscount: (mode, value) => {
    const safe = new Decimal(value).clampedTo(0, Infinity).toFixed(2);
    if (mode === "percent") {
      const pct = new Decimal(safe).clampedTo(0, 100).toFixed(2);
      set({ cartDiscountPercent: pct, cartDiscountAmount: "0" });
    } else {
      set({ cartDiscountAmount: safe, cartDiscountPercent: "0" });
    }
  },

  setAuthorizingManager: (managerId) => {
    set({ authorizingManagerId: managerId });
  },

  setActiveLine: (variantId) => {
    set((state) => ({
      activeLineId: state.activeLineId === variantId ? null : variantId,
    }));
  },

  clearCart: () => {
    set({
      items: [],
      cartDiscountAmount: "0",
      cartDiscountPercent: "0",
      authorizingManagerId: null,
      activeLineId: null,
      heldSaleId: null,
      linkedReturnId: null,
      exchangeCredit: null,
      exchangeReturnRef: null,
      linked_customer_id: null,
      linked_customer_name: null,
      linked_customer_credit_balance: null,
      applied_store_credit: "0",
    });
  },

  setHeldSaleId: (id) => {
    set({ heldSaleId: id });
  },

  setExchangeCredit: (returnId, credit, ref) => {
    set({ linkedReturnId: returnId, exchangeCredit: credit, exchangeReturnRef: ref });
  },

  clearExchangeCredit: () => {
    set({ linkedReturnId: null, exchangeCredit: null, exchangeReturnRef: null });
  },

  replaceCart: (items, cartDiscountAmount, cartDiscountPercent, authorizingManagerId) => {
    set({
      items,
      cartDiscountAmount,
      cartDiscountPercent,
      authorizingManagerId,
      activeLineId: null,
      heldSaleId: null,
      linkedReturnId: null,
      exchangeCredit: null,
      exchangeReturnRef: null,
      linked_customer_id: null,
      linked_customer_name: null,
      linked_customer_credit_balance: null,
      applied_store_credit: "0",
    });
  },

  linkCustomer: (id, name, creditBalance) => {
    set({
      linked_customer_id: id,
      linked_customer_name: name,
      linked_customer_credit_balance: creditBalance,
      applied_store_credit: "0",
    });
  },

  unlinkCustomer: () => {
    set({
      linked_customer_id: null,
      linked_customer_name: null,
      linked_customer_credit_balance: null,
      applied_store_credit: "0",
    });
  },

  setAppliedStoreCredit: (amount) => {
    set({ applied_store_credit: amount });
  },
}));
