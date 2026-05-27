"use client";

import Link from "next/link";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useCartStore } from "@/lib/webstore/cartStore";
import type { CartLineItem } from "@/lib/webstore/cartStore";

function fmt(cents: number, currency = "LKR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

function CartLineItemRow({
  item,
  currency,
}: {
  item: CartLineItem;
  currency: string;
}) {
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  return (
    <li className="flex gap-4 py-5 border-b border-gray-100 last:border-b-0">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
              {item.title}
            </p>
            {item.variantTitle && item.variantTitle !== "Default Title" && (
              <p className="text-xs opacity-60" style={{ color: "var(--ws-color-text)" }}>
                {item.variantTitle}
              </p>
            )}
          </div>
          <p className="text-sm font-semibold shrink-0" style={{ color: "var(--ws-color-text)" }}>
            {fmt(item.price * item.quantity, currency)}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-3">
          <div className="flex items-center rounded border border-gray-200">
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-40"
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-8 text-center text-xs font-medium" style={{ color: "var(--ws-color-text)" }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-800"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => removeItem(item.variantId)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            aria-label={`Remove ${item.title} from cart`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-28 text-center">
      <ShoppingCart className="h-16 w-16 text-gray-200" aria-hidden="true" />
      <div>
        <p className="text-xl font-semibold" style={{ color: "var(--ws-color-text)" }}>
          Your cart is empty
        </p>
        <p className="mt-1 text-sm text-gray-400">Add some products to get started.</p>
      </div>
      <Link
        href="/collections"
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--ws-color-primary)" }}
      >
        Continue Shopping
      </Link>
    </div>
  );
}

export function CartPageClient() {
  const items = useCartStore((s) => s.items);
  const currency = "LKR";
  const subtotalCents = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold" style={{ color: "var(--ws-color-text)", fontFamily: "var(--ws-font-heading)" }}>
          Your Cart
        </h1>
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold" style={{ color: "var(--ws-color-text)", fontFamily: "var(--ws-font-heading)" }}>
        Your Cart
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <CartLineItemRow key={item.variantId} item={item} currency={currency} />
            ))}
          </ul>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--ws-color-text)" }}>
              Order Summary
            </h2>

            <div className="flex justify-between text-sm mb-2" style={{ color: "var(--ws-color-text)" }}>
              <span className="opacity-70">Subtotal</span>
              <span className="font-medium">{fmt(subtotalCents, currency)}</span>
            </div>

            <p className="text-xs text-gray-400 mb-6">Shipping calculated at checkout</p>

            <Link
              href="/checkout"
              className="block w-full rounded-md px-4 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--ws-color-primary)" }}
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/collections"
              className="mt-3 block w-full text-center text-sm opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--ws-color-text)" }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
