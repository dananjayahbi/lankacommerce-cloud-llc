/**
 * Bundled block/section schemas for Phase 6 ConfigMerger.
 *
 * Each entry maps a block type string to its flat array of SettingDefinition
 * objects. This is the static source of truth for default values — the merger
 * reads these to backfill missing keys in a merchant's saved settings.
 *
 * Only `id` and `default` matter at merge-time; other fields (label, info,
 * options) are present for completeness and to share one schema source with
 * the customizer settings form.
 */

import type { SettingDefinition } from "./types";

export const BLOCK_SCHEMAS: Readonly<Record<string, readonly SettingDefinition[]>> = {
  // ── Layout sections ───────────────────────────────────────────────────────
  header: [
    { id: "logo_width", type: "range", min: 40, max: 300, step: 10, default: 120, label: "Logo width (px)" },
    { id: "menu_handle", type: "text", default: "main-menu", label: "Navigation menu" },
    { id: "show_search_icon", type: "checkbox", default: true, label: "Show search icon" },
    { id: "show_cart_icon", type: "checkbox", default: true, label: "Show cart icon" },
    { id: "show_account_icon", type: "checkbox", default: true, label: "Show account icon" },
    { id: "sticky", type: "checkbox", default: true, label: "Sticky header" },
  ],

  footer: [
    { id: "show_payment_icons", type: "checkbox", default: true, label: "Show payment icons" },
    { id: "show_social_icons", type: "checkbox", default: true, label: "Show social icons" },
    { id: "copyright_text", type: "text", default: "© 2025 My Store. All rights reserved.", label: "Copyright text" },
  ],

  // ── Announcement bar ──────────────────────────────────────────────────────
  announcement_bar: [
    { id: "text", type: "richtext", default: "Free shipping on orders over $50", label: "Announcement text" },
    { id: "link", type: "url", default: "", label: "Link URL" },
    { id: "background_color", type: "color", default: "#0F172A", label: "Background color" },
    { id: "text_color", type: "color", default: "#FFFFFF", label: "Text color" },
    { id: "enable_auto_rotate", type: "checkbox", default: false, label: "Auto-rotate announcements" },
    { id: "rotation_interval", type: "range", min: 5, max: 30, step: 5, default: 10, label: "Rotation interval (seconds)" },
    { id: "show_close_button", type: "checkbox", default: true, label: "Show close button" },
  ],

  // ── Hero banner ───────────────────────────────────────────────────────────
  hero_banner: [
    { id: "background_image", type: "image", default: "", label: "Background image" },
    { id: "background_color", type: "color", default: "#1B2B3A", label: "Background color" },
    { id: "overlay_opacity", type: "range", min: 0, max: 90, step: 10, default: 30, label: "Overlay opacity (%)" },
    { id: "overlay_color", type: "color", default: "#000000", label: "Overlay color" },
    {
      id: "height",
      type: "select",
      options: [
        { value: "small", label: "Small (400px)" },
        { value: "medium", label: "Medium (560px)" },
        { value: "large", label: "Large (720px)" },
        { value: "full", label: "Full screen" },
      ],
      default: "medium",
      label: "Banner height",
    },
    {
      id: "content_alignment",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
      default: "center",
      label: "Content alignment",
    },
    { id: "text_color", type: "color", default: "#FFFFFF", label: "Text color" },
    { id: "heading", type: "text", default: "Welcome to our store", label: "Heading" },
    { id: "subheading", type: "text", default: "", label: "Subheading" },
    { id: "button_label", type: "text", default: "Shop Now", label: "Primary button label" },
    { id: "button_link", type: "url", default: "/collections/all", label: "Primary button link" },
    {
      id: "button_style",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
      ],
      default: "primary",
      label: "Primary button style",
    },
    { id: "button2_label", type: "text", default: "", label: "Secondary button label" },
    { id: "button2_link", type: "url", default: "", label: "Secondary button link" },
    {
      id: "button2_style",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
      ],
      default: "outline",
      label: "Secondary button style",
    },
  ],

  // ── Featured collection ───────────────────────────────────────────────────
  featured_collection: [
    { id: "collection_handle", type: "collection", default: "", label: "Collection" },
    { id: "heading", type: "text", default: "Featured Products", label: "Section heading" },
    { id: "subheading", type: "text", default: "", label: "Subheading" },
    { id: "products_to_show", type: "range", min: 4, max: 16, step: 4, default: 8, label: "Products to show" },
    {
      id: "columns_desktop",
      type: "select",
      options: [
        { value: "2", label: "2 columns" },
        { value: "3", label: "3 columns" },
        { value: "4", label: "4 columns" },
        { value: "5", label: "5 columns" },
      ],
      default: "4",
      label: "Columns (desktop)",
    },
    {
      id: "columns_mobile",
      type: "select",
      options: [
        { value: "1", label: "1 column" },
        { value: "2", label: "2 columns" },
      ],
      default: "2",
      label: "Columns (mobile)",
    },
    { id: "show_view_all", type: "checkbox", default: true, label: "Show 'View All' link" },
    {
      id: "card_style",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "compact", label: "Compact" },
        { value: "horizontal", label: "Horizontal" },
      ],
      default: "standard",
      label: "Card style",
    },
  ],

  // ── Image with text ───────────────────────────────────────────────────────
  image_with_text: [
    { id: "image", type: "image", default: "", label: "Image" },
    {
      id: "image_position",
      type: "select",
      options: [
        { value: "left", label: "Image on left" },
        { value: "right", label: "Image on right" },
      ],
      default: "left",
      label: "Image position",
    },
    { id: "heading", type: "text", default: "Our Story", label: "Heading" },
    { id: "body", type: "richtext", default: "", label: "Body text" },
    { id: "cta_label", type: "text", default: "Learn More", label: "Button label" },
    { id: "cta_link", type: "url", default: "", label: "Button link" },
    { id: "background_color", type: "color", default: "#FFFFFF", label: "Background color" },
    {
      id: "desktop_image_width",
      type: "select",
      options: [
        { value: "small", label: "Small (33%)" },
        { value: "medium", label: "Medium (50%)" },
        { value: "large", label: "Large (60%)" },
      ],
      default: "medium",
      label: "Image width (desktop)",
    },
  ],

  // ── Rich text ─────────────────────────────────────────────────────────────
  rich_text: [
    { id: "content", type: "richtext", default: "", label: "Content" },
    {
      id: "text_alignment",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
      default: "center",
      label: "Text alignment",
    },
    { id: "narrow_content", type: "checkbox", default: true, label: "Narrow content width" },
    { id: "background_color", type: "color", default: "#FFFFFF", label: "Background color" },
    { id: "padding_top", type: "range", min: 0, max: 100, step: 4, default: 40, label: "Padding top (px)" },
    { id: "padding_bottom", type: "range", min: 0, max: 100, step: 4, default: 40, label: "Padding bottom (px)" },
  ],

  // ── Product grid ──────────────────────────────────────────────────────────
  product_grid: [
    { id: "collection_handle", type: "collection", default: "", label: "Collection (blank = all)" },
    { id: "products_to_show", type: "range", min: 4, max: 48, step: 4, default: 12, label: "Products to show" },
    {
      id: "columns_desktop",
      type: "select",
      options: [
        { value: "2", label: "2 columns" },
        { value: "3", label: "3 columns" },
        { value: "4", label: "4 columns" },
        { value: "5", label: "5 columns" },
      ],
      default: "4",
      label: "Columns (desktop)",
    },
    {
      id: "columns_mobile",
      type: "select",
      options: [
        { value: "1", label: "1 column" },
        { value: "2", label: "2 columns" },
      ],
      default: "2",
      label: "Columns (mobile)",
    },
    { id: "show_price", type: "checkbox", default: true, label: "Show price" },
    { id: "show_vendor", type: "checkbox", default: false, label: "Show vendor" },
    { id: "show_sale_badge", type: "checkbox", default: true, label: "Show sale badge" },
    { id: "enable_quick_add", type: "checkbox", default: true, label: "Enable quick add" },
  ],

  // ── Testimonials ──────────────────────────────────────────────────────────
  testimonials: [
    { id: "heading", type: "text", default: "What Our Customers Say", label: "Section heading" },
    {
      id: "layout",
      type: "select",
      options: [
        { value: "grid", label: "Grid" },
        { value: "carousel", label: "Carousel" },
      ],
      default: "grid",
      label: "Layout",
    },
    {
      id: "rating_style",
      type: "select",
      options: [
        { value: "stars", label: "Stars" },
        { value: "none", label: "None" },
      ],
      default: "stars",
      label: "Rating style",
    },
    { id: "background_color", type: "color", default: "#F8FAFC", label: "Background color" },
  ],

  // ── Newsletter signup ─────────────────────────────────────────────────────
  newsletter_signup: [
    { id: "heading", type: "text", default: "Stay in the loop", label: "Heading" },
    { id: "subheading", type: "text", default: "Get the latest updates on new products and deals.", label: "Subheading" },
    { id: "button_label", type: "text", default: "Subscribe", label: "Button label" },
    { id: "placeholder", type: "text", default: "Your email address", label: "Input placeholder" },
    { id: "success_message", type: "text", default: "Thanks for subscribing!", label: "Success message" },
    { id: "background_color", type: "color", default: "#F97316", label: "Background color" },
    { id: "text_color", type: "color", default: "#FFFFFF", label: "Text color" },
    { id: "button_color", type: "color", default: "#0F172A", label: "Button color" },
  ],

  // ── Placeholder stubs for blocks not yet fully implemented ────────────────
  collection_list: [],
  slideshow: [],
  countdown_timer: [],
  product_detail: [],
  product_recommendations: [],
  collection_header: [],
  collection_filters: [],
  cart_items: [],
  cart_summary: [],
};
