/**
 * (webstore) Root Layout
 *
 * Server Component that wraps every consumer-facing storefront page.
 *
 * Responsibilities:
 *  1. Extracts the tenant slug from the `x-tenant-slug` request header set by
 *     middleware.
 *  2. Fetches the active public theme config for the tenant.
 *  3. If `is_enabled = false`  → renders a minimal "Coming Soon" screen.
 *  4. If `is_password_protected = true` and no `store-password` cookie is
 *     present → renders the password-gate page.
 *  5. Injects theme CSS custom properties into a wrapping <div>.
 *  6. Renders StorefrontHeader, {children}, StorefrontFooter.
 *  7. Renders CartDrawer (client component) at layout level.
 *
 * The preview sub-route (/webstore-preview/*) overrides this layout with its
 * own minimal shell via its own nested layout.tsx — Next.js's layout nesting
 * means this root layout still wraps it, but the preview layout suppresses the
 * header/footer/cart chrome inside.
 */

import { headers, cookies } from "next/headers";
import React from "react";
import type { ThemeConfig } from "@/lib/webstore/types";
import { buildThemeCssVars } from "@/lib/webstore/themeRenderer";
import { CartDrawer } from "@/components/webstore/cart/CartDrawer";
import { CartStoreProvider } from "@/components/webstore/cart/CartStoreProvider";

// ---------------------------------------------------------------------------
// API types for the public config endpoint
// ---------------------------------------------------------------------------

interface PublicWebstoreConfig {
  is_enabled: boolean;
  is_password_protected: boolean;
  tenant_name: string;
  seo_title: string | null;
  seo_description: string | null;
  social_image_url: string | null;
  contact_email: string | null;
  theme_config: ThemeConfig;
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

const INTERNAL_API = process.env.NEXT_INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchPublicConfig(slug: string): Promise<PublicWebstoreConfig | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/config/`,
      {
        next: { tags: [`webstore-config-${slug}`] },
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<PublicWebstoreConfig>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Coming Soon screen
// ---------------------------------------------------------------------------

function ComingSoon({ name, contactEmail }: { name: string; contactEmail: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">{name}</h1>
      <p className="text-lg text-gray-500">We&apos;re coming soon.</p>
      <p className="text-sm text-gray-400">This store is currently offline. Check back later.</p>
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="mt-2 text-sm text-blue-600 underline"
        >
          {contactEmail}
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password gate screen
// ---------------------------------------------------------------------------

function PasswordGate({ tenantSlug }: { tenantSlug: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4">
      <h1 className="text-2xl font-bold text-gray-900">This store is password protected</h1>
      <form action={`/api/webstore-password?slug=${tenantSlug}`} method="POST" className="flex flex-col gap-3 w-full max-w-sm">
        <label htmlFor="store-password" className="text-sm font-medium text-gray-700">
          Enter password
        </label>
        <input
          type="password"
          id="store-password"
          name="password"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Enter Store
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default async function WebstoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const tenantSlug = headerStore.get("x-tenant-slug");

  // No tenant slug means we're on the main domain or the middleware failed to
  // set the header. Render children without webstore chrome.
  if (!tenantSlug) {
    return <>{children}</>;
  }

  const config = await fetchPublicConfig(tenantSlug);

  // Could not resolve the tenant — render a bare not-found-style fallback.
  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Store not found.
      </div>
    );
  }

  // Store offline
  if (!config.is_enabled) {
    return (
      <ComingSoon name={config.tenant_name} contactEmail={config.contact_email} />
    );
  }

  // Password protected — check for the unlock cookie
  if (config.is_password_protected) {
    const unlockCookie = cookieStore.get(`store-password-${tenantSlug}`);
    if (!unlockCookie) {
      return <PasswordGate tenantSlug={tenantSlug} />;
    }
  }

  const cssVars = buildThemeCssVars(config.theme_config);

  return (
    <CartStoreProvider tenantSlug={tenantSlug}>
      <div
        className="ws-storefront min-h-screen flex flex-col"
        style={cssVars as React.CSSProperties}
      >
        {children}
        <CartDrawer />
      </div>
    </CartStoreProvider>
  );
}

