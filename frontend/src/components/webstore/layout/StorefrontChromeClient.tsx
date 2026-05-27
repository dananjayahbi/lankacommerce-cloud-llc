/**
 * StorefrontChromeClient — Client Component
 *
 * Renders the storefront header and footer from the theme config, wrapping
 * any page content that is not rendered through ThemeRenderer.
 *
 * Receives serialised themeConfig + tenantData from the parent server component
 * StorefrontChrome.tsx, then invokes the registered header/footer block
 * components via the BLOCK_REGISTRY.
 */

"use client";

import React from "react";
import type { ThemeConfig } from "@/lib/webstore/types";
import type { TenantData } from "@/lib/webstore/themeRenderer";
import { BLOCK_REGISTRY } from "@/lib/webstore/blockRegistry";
import { mergeConfigWithSchema } from "@/lib/webstore/configMerger";

interface StorefrontChromeClientProps {
  themeConfig: ThemeConfig;
  tenantData: TenantData;
  children: React.ReactNode;
}

export function StorefrontChromeClient({
  themeConfig,
  tenantData,
  children,
}: StorefrontChromeClientProps) {
  const { header, footer } = themeConfig.layout;

  function renderSection(
    sectionId: string,
    sectionType: string,
    settings: Record<string, unknown>,
    blocks: Record<string, unknown>,
    blockOrder: string[],
    disabled?: boolean,
  ) {
    if (disabled) return null;
    const BlockComponent = BLOCK_REGISTRY[sectionType];
    if (!BlockComponent) return null;
    const mergedSettings = mergeConfigWithSchema(settings, sectionType);
    return (
      <BlockComponent
        key={sectionId}
        settings={mergedSettings}
        blocks={blocks as Parameters<typeof BlockComponent>[0]["blocks"]}
        blockOrder={blockOrder}
        isPreview={false}
        tenantData={tenantData}
        blockType={sectionType}
      />
    );
  }

  return (
    <>
      {renderSection(
        "__layout_header__",
        header.type,
        header.settings,
        header.blocks,
        header.block_order,
        header.disabled,
      )}
      <main className="flex-1">{children}</main>
      {renderSection(
        "__layout_footer__",
        footer.type,
        footer.settings,
        footer.blocks,
        footer.block_order,
        footer.disabled,
      )}
    </>
  );
}
