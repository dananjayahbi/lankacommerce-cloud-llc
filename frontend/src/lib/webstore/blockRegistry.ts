/**
 * Block Registry
 *
 * Maps every block type string (matching the backend's `BlockType` enum) to
 * its concrete React component. The ThemeRenderer consults this registry to
 * resolve a section's `type` field into a renderable component.
 *
 * Rules:
 *  - Every type that can appear in a live `TenantThemeConfig` MUST have an
 *    entry here. Unknown types fall back to a `PlaceholderBlock` at render
 *    time — they must NEVER throw.
 *  - Phase 6 delivers full implementations for the 10 primary blocks.
 *    All remaining types are wired to `PlaceholderBlock` until their phase.
 *  - Import components with React.lazy if the bundle size warrants it.
 *    For Phase 6, direct imports are acceptable.
 */

import type { ComponentType } from "react";
import type { BlockComponentProps } from "./themeRenderer";

import { StorefrontHeader } from "@/components/webstore/blocks/StorefrontHeader";
import { StorefrontFooter } from "@/components/webstore/blocks/StorefrontFooter";
import { AnnouncementBar } from "@/components/webstore/blocks/AnnouncementBar";
import { HeroBanner } from "@/components/webstore/blocks/HeroBanner";
import { FeaturedCollection } from "@/components/webstore/blocks/FeaturedCollection";
import { ImageWithText } from "@/components/webstore/blocks/ImageWithText";
import { RichText } from "@/components/webstore/blocks/RichText";
import { ProductGrid } from "@/components/webstore/blocks/ProductGrid";
import { Testimonials } from "@/components/webstore/blocks/Testimonials";
import { NewsletterSignup } from "@/components/webstore/blocks/NewsletterSignup";
import { ProductDetailBlock } from "@/components/webstore/blocks/ProductDetail";
import { PlaceholderBlock } from "@/components/webstore/blocks/PlaceholderBlock";

// ---------------------------------------------------------------------------
// Registry type
// ---------------------------------------------------------------------------

export type BlockRegistry = Readonly<Record<string, ComponentType<BlockComponentProps>>>;

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const BLOCK_REGISTRY: BlockRegistry = {
  // ── Fully implemented in Phase 6 ─────────────────────────────────────────
  header: StorefrontHeader as ComponentType<BlockComponentProps>,
  footer: StorefrontFooter as ComponentType<BlockComponentProps>,
  announcement_bar: AnnouncementBar as ComponentType<BlockComponentProps>,
  hero_banner: HeroBanner as ComponentType<BlockComponentProps>,
  featured_collection: FeaturedCollection as ComponentType<BlockComponentProps>,
  image_with_text: ImageWithText as ComponentType<BlockComponentProps>,
  rich_text: RichText as ComponentType<BlockComponentProps>,
  product_grid: ProductGrid as ComponentType<BlockComponentProps>,
  testimonials: Testimonials as ComponentType<BlockComponentProps>,
  newsletter_signup: NewsletterSignup as ComponentType<BlockComponentProps>,

  // ── Placeholder stubs — implemented in later phases ───────────────────────
  collection_list: PlaceholderBlock,
  slideshow: PlaceholderBlock,
  countdown_timer: PlaceholderBlock,
  product_detail: ProductDetailBlock as ComponentType<BlockComponentProps>,
  product_recommendations: PlaceholderBlock,
  collection_header: PlaceholderBlock,
  collection_filters: PlaceholderBlock,
  cart_items: PlaceholderBlock,
  cart_summary: PlaceholderBlock,
} as const;
