/**
 * Theme Renderer
 *
 * The core resolution engine for the webstore storefront. Accepts a
 * `ThemeConfig` object, a template name, and live tenant data, then resolves
 * the JSON config into a rendered React tree.
 *
 * Rendering pipeline for a given template:
 *   1. Read `themeConfig.templates[template]` → get `{sections, order}`
 *   2. Iterate through `order` (section IDs in top-to-bottom display order)
 *   3. Skip sections where `disabled === true`
 *   4. Look up `BLOCK_REGISTRY[section.type]` — if missing, log + skip (no throw)
 *   5. Call `mergeConfigWithSchema` to backfill schema defaults
 *   6. Render the component with `settings`, `blocks`, `blockOrder`,
 *      `isPreview`, and `tenantData`
 *
 * The layout's header and footer (from `themeConfig.layout`) are rendered
 * outside the template sections, wrapping them.
 *
 * Usage (Server Component / page):
 *   <ThemeRenderer
 *     themeConfig={config}
 *     template="index"
 *     tenantData={tenantData}
 *     tenantSlug="my-store"
 *   />
 *
 * Usage (iFrame preview — Client Component):
 *   <ThemeRenderer ... isPreview />
 */

"use client";

import React from "react";
import type { ThemeConfig, BlocksMap, SettingsMap, PageTemplate } from "./types";
import { BLOCK_REGISTRY } from "./blockRegistry";
import { mergeConfigWithSchema } from "./configMerger";
import type { MergedSettings } from "./configMerger";

// ---------------------------------------------------------------------------
// Tenant data shapes
// ---------------------------------------------------------------------------

export interface ProductSummary {
  id: string;
  handle: string;
  title: string;
  featured_image_url: string | null;
  price_range: { min: string; max: string };
  compare_at_price_range: { min: string; max: string } | null;
  variant_count: number;
  available: boolean;
  category: { name: string; handle: string } | null;
  tags: string[];
  // Only present on full detail responses (product page)
  description?: string;
  images?: Array<{ url: string; alt: string }>;
  variants?: ProductVariant[];
  options?: Array<{ name: string; values: string[] }>;
  seo_title?: string;
  seo_description?: string;
  related_products?: ProductSummary[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  price: string; // Decimal string from backend e.g. "19.99"
  compare_at_price: string | null;
  stock_quantity: number;
  is_available: boolean;
  attributes: Record<string, string>; // e.g. {colour: "Red", size: "L"}
}

export interface CollectionData {
  /** Only on collection-detail endpoint (not collection listing) */
  collection?: {
    id: string;
    handle: string;
    title: string;
    description: string;
    image_url: string | null;
    seo_title: string;
    seo_description: string;
  };
  /** Convenience alias — matches the old shape for backward compat */
  handle?: string;
  title?: string;
  description?: string;
  image_url?: string | null;
  products: ProductSummary[];
  meta?: { total: number; page: number; page_size: number; total_pages: number; has_next: boolean; has_prev: boolean };
}

export interface TenantInfo {
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  currency_symbol: string;
}

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  target: "_self" | "_blank";
  children: MenuItem[];
}

export interface MenuData {
  handle: string;
  title: string;
  items: MenuItem[];
}

export interface TenantData {
  tenant: TenantInfo;
  collections: Record<string, CollectionData>;
  products: Record<string, ProductSummary>;
  menus: Record<string, MenuData>;
}

// ---------------------------------------------------------------------------
// Block component props contract
// ---------------------------------------------------------------------------

/**
 * Every block component registered in `BLOCK_REGISTRY` must accept this prop
 * shape. Components may extend it with additional narrowed types internally.
 */
export interface BlockComponentProps {
  /** Merged settings: saved values + schema defaults backfilled. */
  settings: MergedSettings;
  /** Nested block map from the section config. */
  blocks: BlocksMap;
  /** Ordered array of block IDs (the block_order from config). */
  blockOrder: readonly string[];
  /** True when rendered inside the customizer iFrame preview. */
  isPreview: boolean;
  /** Pre-fetched live tenant catalog data. */
  tenantData: TenantData;
  /** The section type string — useful for PlaceholderBlock. */
  blockType?: string;
}

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

/**
 * Builds a CSS custom-properties string from the theme's global color and
 * typography settings. Injected on the webstore layout's `<body>` element so
 * every block can reference `var(--ws-color-primary)` etc. without prop drilling.
 */
export function buildThemeCssVars(themeConfig: ThemeConfig): React.CSSProperties {
  const { colors } = themeConfig.global_settings;
  const { heading_font, body_font } = themeConfig.global_settings.typography;

  return {
    "--ws-color-primary": colors.primary,
    "--ws-color-secondary": colors.secondary,
    "--ws-color-background": colors.background,
    "--ws-color-text": colors.text,
    "--ws-color-accent": colors.accent,
    "--ws-font-heading": `'${heading_font}', sans-serif`,
    "--ws-font-body": `'${body_font}', sans-serif`,
  } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Per-section renderer (extracted for clarity)
// ---------------------------------------------------------------------------

interface SectionRendererProps {
  sectionId: string;
  sectionType: string;
  settings: SettingsMap;
  blocks: BlocksMap;
  blockOrder: readonly string[];
  isPreview: boolean;
  tenantData: TenantData;
}

function SectionRenderer({
  sectionId,
  sectionType,
  settings,
  blocks,
  blockOrder,
  isPreview,
  tenantData,
}: SectionRendererProps) {
  const BlockComponent = BLOCK_REGISTRY[sectionType];

  if (!BlockComponent) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ThemeRenderer] No component registered for block type "${sectionType}" (section ${sectionId}). Skipping.`,
      );
    }
    return null;
  }

  const mergedSettings = mergeConfigWithSchema(settings, sectionType);

  return (
    <BlockComponent
      settings={mergedSettings}
      blocks={blocks}
      blockOrder={blockOrder}
      isPreview={isPreview}
      tenantData={tenantData}
      blockType={sectionType}
    />
  );
}

// ---------------------------------------------------------------------------
// ThemeRenderer
// ---------------------------------------------------------------------------

interface ThemeRendererProps {
  themeConfig: ThemeConfig;
  /** Which page template to render. Defaults to "index". */
  template?: PageTemplate;
  tenantData: TenantData;
  /** The tenant's URL slug — used for cart store scoping. */
  tenantSlug: string;
  /** True when rendered inside the customizer iFrame preview. */
  isPreview?: boolean;
}

export function ThemeRenderer({
  themeConfig,
  template = "index",
  tenantData,
  isPreview = false,
}: ThemeRendererProps) {
  // ── Header ─────────────────────────────────────────────────────────────────
  const { header, footer } = themeConfig.layout;

  // ── Template sections ──────────────────────────────────────────────────────
  const templateConfig = themeConfig.templates[template];

  // ── CSS custom properties ──────────────────────────────────────────────────
  const cssVars = buildThemeCssVars(themeConfig);

  return (
    <div className="ws-storefront" style={cssVars}>
      {/* Global layout header */}
      {!header.disabled && (
        <SectionRenderer
          key="__layout_header__"
          sectionId="__layout_header__"
          sectionType={header.type}
          settings={header.settings}
          blocks={header.blocks}
          blockOrder={header.block_order}
          isPreview={isPreview}
          tenantData={tenantData}
        />
      )}

      {/* Page template sections */}
      <main>
        {templateConfig ? (
          templateConfig.order.map((sectionId) => {
            const section = templateConfig.sections[sectionId];
            if (!section) return null;
            if (section.disabled) return null;

            return (
              <SectionRenderer
                key={sectionId}
                sectionId={sectionId}
                sectionType={section.type}
                settings={section.settings}
                blocks={section.blocks}
                blockOrder={section.block_order}
                isPreview={isPreview}
                tenantData={tenantData}
              />
            );
          })
        ) : (
          <div className="flex min-h-[200px] items-center justify-center text-gray-400">
            No template configured for &quot;{template}&quot;
          </div>
        )}
      </main>

      {/* Global layout footer */}
      {!footer.disabled && (
        <SectionRenderer
          key="__layout_footer__"
          sectionId="__layout_footer__"
          sectionType={footer.type}
          settings={footer.settings}
          blocks={footer.blocks}
          blockOrder={footer.block_order}
          isPreview={isPreview}
          tenantData={tenantData}
        />
      )}
    </div>
  );
}
