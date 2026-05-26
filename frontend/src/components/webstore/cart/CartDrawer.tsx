/**
 * CartDrawer
 *
 * A slide-in panel from the right edge of the viewport. Controlled entirely
 * by `cartStore.isOpen`. Renders the current cart contents with quantity
 * controls, a subtotal, and a checkout CTA.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/webstore/cartStore";

// ---------------------------------------------------------------------------
// Price formatter
// ---------------------------------------------------------------------------

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// CartItem row
// ---------------------------------------------------------------------------

interface CartItemRowProps {
  variantId: string;
  title: string;
  variantTitle: string;
  price: number;
  quantity: number;
  imageUrl: string;
  currency: string;
}

function CartItemRow({
  variantId,
  title,
  variantTitle,
  price,
  quantity,
  imageUrl,
  currency,
}: CartItemRowProps) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <li className="flex gap-3 py-4">
      {/* Image */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-gray-300" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info + controls */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-snug" style={{ color: "var(--ws-color-text)" }}>
              {title}
            </p>
            {variantTitle && variantTitle !== "Default Title" && (
              <p className="text-xs" style={{ color: "var(--ws-color-text)", opacity: 0.6 }}>
                {variantTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(variantId)}
            className="flex-shrink-0 rounded p-1 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`Remove ${title} from cart`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity controls */}
          <div className="flex items-center rounded-md border" style={{ borderColor: "var(--ws-color-secondary)", opacity: 0.8 }}>
            <button
              type="button"
              onClick={() => updateQuantity(variantId, quantity - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-l-md transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ws-color-primary)]"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" aria-hidden="true" />
            </button>
            <span
              className="flex min-w-[2rem] items-center justify-center text-sm tabular-nums"
              aria-live="polite"
              aria-label={`Quantity: ${quantity}`}
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(variantId, quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-r-md transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ws-color-primary)]"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          {/* Line total */}
          <span className="text-sm font-semibold" style={{ color: "var(--ws-color-text)" }}>
            {fmt(price * quantity, currency)}
          </span>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// CartDrawer
// ---------------------------------------------------------------------------

interface CartDrawerProps {
  currency?: string;
}

export function CartDrawer({ currency = "USD" }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, closeCart]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus first focusable element when opened
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusable = drawerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }, [isOpen]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleBackdropClick = useCallback(() => closeCart(), [closeCart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[var(--ws-color-background)] shadow-2xl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-4"
          style={{ borderColor: "var(--ws-color-secondary)", opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" style={{ color: "var(--ws-color-text)" }} aria-hidden="true" />
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--ws-color-text)", fontFamily: "var(--ws-font-heading)" }}
            >
              Your Cart
            </h2>
            {itemCount > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: "var(--ws-color-primary)" }}
                aria-hidden="true"
              >
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="rounded p-1.5 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Item list / Empty state */}
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <ShoppingCart
                className="h-12 w-12 opacity-20"
                style={{ color: "var(--ws-color-text)" }}
                aria-hidden="true"
              />
              <p className="text-sm font-medium" style={{ color: "var(--ws-color-text)", opacity: 0.6 }}>
                Your cart is empty.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
                style={{ backgroundColor: "var(--ws-color-primary)" }}
              >
                Start Shopping
              </button>
            </div>
          ) : (
              <ul className="divide-y" role="list" aria-label="Cart items">
              {items.map((item) => (
                <CartItemRow
                  key={item.variantId}
                  {...item}
                  currency={currency}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="border-t px-4 pb-6 pt-4"
            style={{ borderColor: "var(--ws-color-secondary)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--ws-color-text)", opacity: 0.7 }}>
                Subtotal
              </span>
              <span className="text-base font-bold" style={{ color: "var(--ws-color-text)" }}>
                {fmt(subtotal, currency)}
              </span>
            </div>
            <p className="mb-4 text-center text-xs" style={{ color: "var(--ws-color-text)", opacity: 0.5 }}>
              Shipping and taxes calculated at checkout.
            </p>
            <Link
              href="/checkout"
              className="block w-full rounded-md py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{ backgroundColor: "var(--ws-color-primary)" }}
              onClick={closeCart}
            >
              Checkout
            </Link>
            <button
              type="button"
              onClick={closeCart}
              className="mt-3 w-full text-center text-sm transition-opacity hover:opacity-100 focus:outline-none focus-visible:underline"
              style={{ color: "var(--ws-color-text)", opacity: 0.6 }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
