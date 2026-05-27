/**
 * Checkout Page — Multi-step stepper (Client Component)
 *
 * Route: /checkout (tenant subdomain, webstore group)
 *
 * Steps:
 *   1. Contact & Shipping Address
 *   2. Shipping Method
 *   3. Review & Pay (PayHere redirect)
 *
 * Flow:
 *   - Step 3: POST /api/webstore/public/<slug>/orders/  → get order + payhere data
 *   - Build a hidden <form> with PayHere fields, auto-submit via useEffect
 *   - Show "Redirecting to PayHere..." overlay while form submits
 *   - PayHere redirects back to /checkout/success?order_id=<order_number>
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/webstore/cartStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: string;
  estimated_days?: number;
}

interface StoreConfig {
  slug: string;
  shipping_methods?: ShippingMethod[];
  currency?: string;
}

interface Address {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
}

interface StripeCheckoutData {
  order_number: string;
  stripe_checkout_url: string;
}

const SL_PROVINCES = [
  "Western", "Central", "Southern", "Northern", "Eastern",
  "North Western", "North Central", "Uva", "Sabaragamuwa",
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = ["Contact & Address", "Shipping", "Review & Pay"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
                style={active ? { backgroundColor: "var(--ws-color-primary)" } : undefined}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${active ? "font-semibold" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mb-5 ${done ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main checkout component
// ---------------------------------------------------------------------------

interface CheckoutPageClientProps {
  tenantSlug: string;
  storeConfig: StoreConfig;
  consumerEmail?: string;
  consumerId?: string;
}

function CheckoutPageClient({
  tenantSlug,
  storeConfig,
  consumerEmail,
  consumerId,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<Address>({
    first_name: "",
    last_name: "",
    address1: "",
    address2: "",
    city: "",
    province: "Western",
    postal_code: "",
    country: "LK",
    phone: "",
  });
  const [email, setEmail] = useState(consumerEmail ?? "");
  const [shippingMethodId, setShippingMethodId] = useState<string>("");
  const [discountCode, setDiscountCode] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-select first shipping method
  const shippingMethods: ShippingMethod[] = storeConfig.shipping_methods ?? [];
  useEffect(() => {
    if (shippingMethods.length > 0 && !shippingMethodId) {
      setShippingMethodId(shippingMethods[0]?.id ?? "");
    }
  }, [shippingMethods]);



  const currency = storeConfig.currency ?? "LKR";

  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethodId);

  // Build order line items from cart
  const lineItems = cartItems.map((item) => ({
    variant_id: item.variantId,
    quantity: item.quantity,
  }));

  const handleAddressChange = (field: keyof Address) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setAddress((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Step 0 → 1: Validate contact & address ────────────────────────────────
  const handleStep0Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !address.address1.trim() || !address.city.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setStep(1);
  };

  // ── Step 1 → 2: Pick shipping ─────────────────────────────────────────────
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep(2);
  };

  // ── Step 2: Place order + redirect to Stripe Checkout ───────────────────
  const handlePlaceOrder = useCallback(async () => {
    if (lineItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const body = {
        customer_email: email,
        customer_id: consumerId ?? null,
        line_items: lineItems,
        shipping_address: address,
        same_as_shipping: true,
        discount_code: discountCode.trim(),
        notes: notes.trim(),
        shipping_method_id: shippingMethodId,
      };

      const res = await fetch(
        `${API_BASE}/api/webstore/public/${tenantSlug}/stripe/checkout-session/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Checkout failed." }));
        const detail =
          (err as { detail?: string; out_of_stock?: unknown[] }).detail ??
          "Checkout failed. Please try again.";
        setError(detail);
        return;
      }

      const data = await res.json() as StripeCheckoutData;

      if (!data.stripe_checkout_url) {
        setError("Payment gateway not configured for this store.");
        return;
      }

      // Clear cart once order is placed
      clearCart();

      // Redirect to Stripe Checkout
      window.location.href = data.stripe_checkout_url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [email, consumerId, lineItems, address, discountCode, notes, shippingMethodId, tenantSlug, clearCart]);

  // If no cart items, redirect home
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <a
          href="/"
          className="inline-block px-6 py-2 rounded-md text-white text-sm font-semibold"
          style={{ backgroundColor: "var(--ws-color-primary)" }}
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  // ── Redirecting overlay (shown while window.location.href is being set) ──
  if (submitting) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        <p className="text-lg font-medium text-gray-700">Redirecting to Stripe…</p>
        <p className="text-sm text-gray-400">Please do not close this tab.</p>
      </div>
    );
  }

  // ── Shared field style ────────────────────────────────────────────────────
  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0";

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: "var(--ws-font-heading)" }}>
        Checkout
      </h1>

      <StepIndicator current={step} />

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 0: Contact & Address ── */}
      {step === 0 && (
        <form onSubmit={handleStep0Submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["first_name", "last_name"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1">
                  {field === "first_name" ? "First Name" : "Last Name"}
                </label>
                <input
                  type="text"
                  value={address[field]}
                  onChange={handleAddressChange(field)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address *</label>
            <input
              type="text"
              required
              placeholder="Street address, P.O. Box"
              value={address.address1}
              onChange={handleAddressChange("address1")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Apartment, suite, etc.</label>
            <input
              type="text"
              placeholder="Optional"
              value={address.address2}
              onChange={handleAddressChange("address2")}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                required
                value={address.city}
                onChange={handleAddressChange("city")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Province</label>
              <select
                value={address.province}
                onChange={handleAddressChange("province")}
                className={inputClass}
              >
                {SL_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <input
                type="text"
                value={address.postal_code}
                onChange={handleAddressChange("postal_code")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={address.phone}
                onChange={handleAddressChange("phone")}
                className={inputClass}
                autoComplete="tel"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-md py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--ws-color-primary)" }}
          >
            Continue to Shipping →
          </button>
        </form>
      )}

      {/* ── Step 1: Shipping ── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
          {shippingMethods.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No shipping options available. Please contact the store.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {shippingMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    shippingMethodId === method.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping_method"
                    value={method.id}
                    checked={shippingMethodId === method.id}
                    onChange={() => setShippingMethodId(method.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{method.name}</span>
                      <span className="text-sm font-semibold">
                        {method.price === "0" || method.price === "0.00"
                          ? "Free"
                          : `${currency} ${method.price}`}
                      </span>
                    </div>
                    {method.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                    )}
                    {method.estimated_days && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Estimated {method.estimated_days} business days
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 rounded-md py-2.5 text-sm font-medium border border-gray-300 hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--ws-color-primary)" }}
            >
              Review Order →
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Review & Pay ── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          {/* Order summary */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
              Order Summary
            </div>
            <div className="divide-y divide-gray-100">
              {cartItems.map((item) => (
                <div key={item.variantId} className="flex items-center gap-3 px-4 py-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.variantTitle && (
                      <p className="text-xs text-gray-400">{item.variantTitle}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {currency} {((item.price / 100) * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">× {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount code */}
          <div>
            <label className="block text-sm font-medium mb-1">Discount Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Order Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Any special instructions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
            />
          </div>

          {/* Shipping summary */}
          {selectedShipping && (
            <div className="flex items-center justify-between text-sm text-gray-600 border-t pt-3">
              <span>Shipping: {selectedShipping.name}</span>
              <span className="font-medium">
                {selectedShipping.price === "0" || selectedShipping.price === "0.00"
                  ? "Free"
                  : `${currency} ${selectedShipping.price}`}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-md py-2.5 text-sm font-medium border border-gray-300 hover:bg-gray-50"
              disabled={submitting}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting || lineItems.length === 0}
              className="flex-1 rounded-md py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--ws-color-primary)" }}
            >
              {submitting ? "Processing…" : "Pay with PayHere"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Secure payment powered by PayHere. You will be redirected to complete payment.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server Component wrapper (page.tsx entry point)
// ---------------------------------------------------------------------------
// We export the client component default directly here since this file
// is imported as page.tsx.  The parent Server Component (layout.tsx) provides
// the tenantSlug header.

export default CheckoutPageClient;
