/**
 * CheckoutSuccessClient
 *
 * Rendered after PayHere redirects back to /checkout/success?order_id=WS-0001.
 *
 * Behaviour:
 *   1. On mount: clear cart (if not already cleared in checkout page).
 *   2. Poll GET /api/webstore/public/<slug>/orders/<order_number>/ every
 *      3 seconds until payment_status === "paid" OR 30 seconds elapsed.
 *   3. Show spinner while waiting, green success once paid, fallback message
 *      if the polling window expires without confirmation.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/webstore/cartStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 10; // 30 seconds total

interface OrderDetail {
  order_number: string;
  customer_email: string;
  total: string;
  currency: string;
  status: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  line_items: Array<{
    title: string;
    quantity: number;
    unit_price: string;
    total: string;
  }>;
  shipping_address?: Record<string, string>;
  created_at: string;
}

type PollState = "polling" | "paid" | "timeout";

interface CheckoutSuccessClientProps {
  tenantSlug: string;
  orderNumber: string;
}

// A simple animated checkmark
function CheckmarkAnimation() {
  return (
    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto mb-6">
      <svg
        viewBox="0 0 52 52"
        className="w-10 h-10 text-green-500"
        fill="none"
        strokeWidth={3}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 27l9 9 16-16" />
      </svg>
    </div>
  );
}

function Spinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function CheckoutSuccessClient({
  tenantSlug,
  orderNumber,
}: CheckoutSuccessClientProps) {
  const clearCart = useCartStore((s) => s.clearCart);
  const [pollState, setPollState] = useState<PollState>("polling");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear cart on mount regardless of polling outcome
  useEffect(() => {
    clearCart();
  }, []);

  // Poll for payment confirmation
  useEffect(() => {
    if (!orderNumber) {
      setPollState("timeout");
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/webstore/public/${tenantSlug}/orders/${orderNumber}/`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = (await res.json()) as OrderDetail;
          setOrder(data);

          if (data.payment_status === "paid") {
            setPollState("paid");
            return; // stop polling
          }
        }
      } catch {
        // network error — keep trying
      }

      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setPollState("timeout");
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tenantSlug, orderNumber]);

  // ── Polling in progress ────────────────────────────────────────────────────
  if (pollState === "polling") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <Spinner message="Confirming your payment with PayHere…" />
        {orderNumber && (
          <p className="text-xs text-gray-400 mt-2">Order: {orderNumber}</p>
        )}
      </div>
    );
  }

  // ── Timeout — payment not confirmed within 30s ─────────────────────────────
  if (pollState === "timeout") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-yellow-500" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Payment Pending</h1>
        <p className="text-gray-600 mb-2">
          We haven&apos;t received payment confirmation yet.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          If you completed payment, don&apos;t worry — your order will be confirmed
          automatically. Check your email for confirmation.
        </p>
        {orderNumber && (
          <p className="text-sm font-mono bg-gray-100 rounded px-3 py-1.5 inline-block mb-6">
            Order: {orderNumber}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            href="/account/orders"
            className="px-5 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            View Orders
          </Link>
          <Link
            href="/"
            className="px-5 py-2 rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--ws-color-primary)" }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Payment confirmed ──────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <CheckmarkAnimation />
        <h1 className="text-2xl font-bold mb-2">Thank you for your order!</h1>
        <p className="text-gray-600">
          Your payment was confirmed and your order is being processed.
        </p>
        {order && (
          <p className="text-sm font-mono bg-green-50 text-green-700 rounded px-3 py-1.5 inline-block mt-3">
            Order #{order.order_number}
          </p>
        )}
      </div>

      {/* Order details */}
      {order && (
        <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
            Order Summary
          </div>
          <div className="divide-y divide-gray-100">
            {order.line_items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-gray-400">× {item.quantity}</p>
                </div>
                <p className="text-sm font-medium">
                  {order.currency} {item.total}
                </p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex justify-between items-center border-t-2 border-gray-200">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">
              {order.currency} {order.total}
            </span>
          </div>
        </div>
      )}

      {/* Shipping address */}
      {order?.shipping_address && (
        <div className="rounded-lg border border-gray-200 px-4 py-3 mb-6">
          <p className="text-sm font-semibold text-gray-600 mb-2">Shipping to</p>
          <div className="text-sm text-gray-600 leading-relaxed">
            {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
            {order.shipping_address.address1}
            {order.shipping_address.address2
              ? `, ${order.shipping_address.address2}`
              : ""}
            <br />
            {order.shipping_address.city}
            {order.shipping_address.province
              ? `, ${order.shipping_address.province}`
              : ""}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/account/orders"
          className="flex-1 text-center px-4 py-2.5 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          View My Orders
        </Link>
        <Link
          href="/"
          className="flex-1 text-center px-4 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--ws-color-primary)" }}
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
