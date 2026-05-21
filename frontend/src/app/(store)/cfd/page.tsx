"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  line_total: number;
}

interface CartState {
  status: "IDLE" | "ACTIVE" | "COMPLETE";
  store_name?: string;
  items?: CartItem[];
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total?: number;
  change_due?: number;
  customer_name?: string;
  promotions?: Array<{ name: string }>;
}

function formatLKR(amount: number): string {
  return `LKR ${amount.toFixed(2)}`;
}

// ── Clock Component ───────────────────────────────────────────────────────────

function LiveClock() {
  const [timeString, setTimeString] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  const [dateString, setDateString] = useState(
    new Date().toLocaleDateString("en-LK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setDateString(
        now.toLocaleDateString("en-LK", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <div
        style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "60px" }}
        className="font-bold text-navy"
      >
        {timeString}
      </div>
      <div className="mt-2 text-base text-text-muted">{dateString}</div>
    </div>
  );
}

// ── Idle State ────────────────────────────────────────────────────────────────

function IdleScreen({ storeName }: { storeName?: string }) {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-10 overflow-hidden bg-background pb-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-navy">
          {storeName ?? "LankaCommerce"}
        </h1>
        <p className="mt-3 text-xl text-orange">Welcome</p>
      </div>

      <LiveClock />

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "6px", backgroundColor: "#1B2B3A" }}
      />
    </div>
  );
}

// ── Active State ──────────────────────────────────────────────────────────────

function ActiveScreen({ cart }: { cart: CartState }) {
  const items = cart.items ?? [];
  const promotions = cart.promotions ?? [];

  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-background">
      {/* Items Panel */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <p
          className="mb-4 text-sm font-medium uppercase tracking-wide"
          style={{ color: "#64748B" }}
        >
          Items
        </p>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between border-b py-3"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div>
              <p className="text-lg font-medium text-navy">{item.product_name}</p>
              {item.variant_name && item.variant_name !== item.product_name && (
                <p className="text-sm text-text-muted">{item.variant_name}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-6 text-right">
              <span
                className="text-lg font-medium text-navy"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                ×{item.quantity}
              </span>
              <span
                className="text-lg font-medium text-navy"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                {formatLKR(item.line_total)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals Panel */}
      <div
        className="flex w-[35%] flex-col justify-center p-8"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-base text-text-muted">Subtotal</span>
            <span
              className="text-xl text-navy"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {formatLKR(cart.subtotal ?? 0)}
            </span>
          </div>

          {(cart.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-base text-text-muted">Discount</span>
              <span
                className="text-xl text-orange"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                -{formatLKR(cart.discount_amount ?? 0)}
              </span>
            </div>
          )}

          {promotions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {promotions.map((p, i) => (
                <span
                  key={i}
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}

          <div
            className="mt-4 border-t pt-4"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="flex justify-between">
              <span className="text-lg font-bold text-navy">Total</span>
              <span
                className="text-4xl font-bold text-navy"
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                {formatLKR(cart.total ?? 0)}
              </span>
            </div>
          </div>

          {cart.customer_name && (
            <p className="mt-2 text-sm text-text-muted">
              Customer: {cart.customer_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Complete State ────────────────────────────────────────────────────────────

function CompleteScreen({ cart }: { cart: CartState }) {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background">
      <CheckCircle2 style={{ width: 80, height: 80, color: "#F97316" }} />
      <h1 className="text-5xl font-bold text-navy">Thank You!</h1>
      <p
        className="text-4xl font-bold text-navy"
        style={{ fontFamily: "var(--font-mono, monospace)" }}
      >
        {formatLKR(cart.total ?? 0)}
      </p>
      {(cart.change_due ?? 0) > 0 && (
        <p className="text-xl text-text-muted">
          Change due: {formatLKR(cart.change_due ?? 0)}
        </p>
      )}
      <p className="text-lg text-orange">Have a wonderful day!</p>
    </div>
  );
}

// ── Main CFD Page ─────────────────────────────────────────────────────────────

export default function CFDPage() {
  const [cartState, setCartState] = useState<CartState | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  const prevCartStateRef = useRef<CartState | null>(null);

  // Read tenant_id from auth store (CFD is displayed on same-network device)
  const tenantId = useAuthStore((s) => s.tenant_id);

  // SSE subscription
  useEffect(() => {
    const streamUrl = `${API_BASE}/api/hardware/cfd/stream/?tenant_id=${tenantId ?? "default"}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as CartState;
        setCartState(data);
      } catch (e) {
        console.error("[CFD] Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      console.warn("[CFD] SSE connection error — will auto-reconnect");
    };

    return () => {
      eventSource.close();
    };
  }, [tenantId]);

  // Fade transition on state change
  useEffect(() => {
    if (prevCartStateRef.current !== cartState) {
      setContentVisible(false);
      const timer = setTimeout(() => setContentVisible(true), 50);
      prevCartStateRef.current = cartState;
      return () => clearTimeout(timer);
    }
  }, [cartState]);

  // Auto-reset from complete
  const isComplete = cartState?.status === "COMPLETE";
  useEffect(() => {
    if (isComplete) {
      const timeout = setTimeout(() => {
        setCartState(null);
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isComplete]);

  // Derive display state
  const isIdle =
    cartState === null ||
    cartState.status === "IDLE" ||
    ((cartState.items?.length ?? 0) === 0 && cartState.status !== "COMPLETE");
  const isActive =
    cartState !== null &&
    cartState.status !== "COMPLETE" &&
    (cartState.items?.length ?? 0) > 0;

  return (
    <div
      style={{
        transition: "opacity 200ms ease-in-out",
        opacity: contentVisible ? 1 : 0,
      }}
    >
      {isComplete && cartState ? (
        <CompleteScreen cart={cartState} />
      ) : isActive && cartState ? (
        <ActiveScreen cart={cartState} />
      ) : (
        <IdleScreen storeName={cartState?.store_name} />
      )}
    </div>
  );
}
