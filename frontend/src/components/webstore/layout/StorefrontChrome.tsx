/**
 * StorefrontChrome — Server Component
 *
 * Wraps non-ThemeRenderer pages (cart, search, collections listing, static
 * pages, account pages) with the storefront header and footer.
 *
 * ThemeRenderer-based pages (home, product, collection detail) already render
 * header/footer internally from the theme config, so those pages do NOT use
 * this component.
 *
 * This server component fetches the active theme config (de-duplicated via
 * Next.js fetch cache — same URL as layout.tsx and page.tsx) and delegates
 * rendering to the client-side StorefrontChromeClient which invokes the
 * registered header and footer block components.
 */

import React from "react";
import type { ThemeConfig } from "@/lib/webstore/types";
import { StorefrontChromeClient } from "./StorefrontChromeClient";

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

interface PublicConfig {
  is_enabled: boolean;
  tenant_name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  currency_symbol: string;
  theme_config: ThemeConfig;
}

async function fetchConfig(slug: string): Promise<PublicConfig | null> {
  try {
    const res = await fetch(`${INTERNAL_API}/api/webstore/public/${slug}/config/`, {
      next: { tags: [`webstore-config-${slug}`, `webstore-${slug}`] },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicConfig>;
  } catch {
    return null;
  }
}

interface StorefrontChromeProps {
  tenantSlug: string;
  children: React.ReactNode;
}

export async function StorefrontChrome({ tenantSlug, children }: StorefrontChromeProps) {
  const config = await fetchConfig(tenantSlug);

  if (!config || !config.is_enabled) {
    // Graceful fallback: render children without chrome
    return <>{children}</>;
  }

  return (
    <StorefrontChromeClient
      themeConfig={config.theme_config}
      tenantData={{
        tenant: {
          name: config.tenant_name,
          slug: config.slug,
          logo_url: config.logo_url,
          currency: config.currency,
          currency_symbol: config.currency_symbol,
        },
        collections: {},
        products: {},
        menus: {},
      }}
    >
      {children}
    </StorefrontChromeClient>
  );
}
