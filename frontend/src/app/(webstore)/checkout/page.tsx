/**
 * Checkout page — Server Component wrapper
 *
 * Resolves tenant context from the middleware-injected x-tenant-slug header,
 * fetches the webstore configuration (shipping methods, currency), then
 * renders the client-side checkout stepper.
 */

import { headers } from "next/headers";
import { StorefrontChrome } from "@/components/webstore/layout/StorefrontChrome";
import CheckoutPageClient from "./CheckoutPageClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchStoreConfig(slug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/webstore/public/${slug}/config/`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<{
      slug: string;
      shipping_methods?: Array<{
        id: string;
        name: string;
        description?: string;
        price: string;
        estimated_days?: number;
      }>;
      currency?: string;
    }>;
  } catch {
    return null;
  }
}

export default async function CheckoutPage() {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const consumerEmail = headerStore.get("x-consumer-email") ?? undefined;
  const consumerId = headerStore.get("x-consumer-id") ?? undefined;

  const storeConfig = await fetchStoreConfig(tenantSlug);

  return (
    <StorefrontChrome tenantSlug={tenantSlug}>
      <CheckoutPageClient
        tenantSlug={tenantSlug}
        storeConfig={storeConfig ?? { slug: tenantSlug }}
        {...(consumerEmail ? { consumerEmail } : {})}
        {...(consumerId ? { consumerId } : {})}
      />
    </StorefrontChrome>
  );
}
