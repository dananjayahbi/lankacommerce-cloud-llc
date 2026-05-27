/**
 * Checkout Success Page — Server Component wrapper
 *
 * Route: /checkout/success?order_id=WS-0001
 *
 * Reads order_id from the search params, passes it to the client component
 * which polls the backend until payment_status === "paid" (max 30 s).
 */

import { headers } from "next/headers";
import { StorefrontChrome } from "@/components/webstore/layout/StorefrontChrome";
import { CheckoutSuccessClient } from "./CheckoutSuccessClient";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const params = await searchParams;
  const orderNumber = params.order_id ?? "";

  return (
    <StorefrontChrome tenantSlug={tenantSlug}>
      <CheckoutSuccessClient
        tenantSlug={tenantSlug}
        orderNumber={orderNumber}
      />
    </StorefrontChrome>
  );
}
