# Phase 6: Core Block Library

**Phase:** 6 of 10  
**Depends on:** Phase 1 (block type definitions), Phase 5 (types.ts from the customizer; the iFrame preview relies on these components)  
**Unlocks:** Phase 7 (the consumer storefront pages use the ThemeRenderer + these block components)  
**Estimated Scope:** Frontend only (heavily visual, component-focused)

---

## 1. Overview

This phase builds the visual building blocks of the storefront — the React components that render when a consumer visits the store. Each block is a self-contained React component that accepts standardized props (settings and nested blocks from the theme config) and renders a piece of the page.

This phase also establishes the core rendering engine: the block registry (maps type strings to React components), the theme renderer (resolves a page's config JSON into a rendered React tree), and the config merger (safely fills in schema defaults for missing settings).

At the end of this phase, the following storefront sections must render correctly with sample data:

1. `StorefrontHeader` — navigation bar with logo, menu links, cart icon
2. `StorefrontFooter` — footer with columns, social icons
3. `HeroBanner` — full-width hero with background image, heading, CTA buttons
4. `FeaturedCollection` — grid of product cards from a chosen collection
5. `ImageWithText` — side-by-side image and text block
6. `RichText` — centered rich text content block
7. `ProductGrid` — configurable product grid (any source)
8. `Testimonials` — customer testimonials with carousel/grid layout
9. `AnnouncementBar` — thin promotional banner at the very top
10. `NewsletterSignup` — email capture section

---

## 2. Existing Context

### 2.1 Styling Foundation

The storefront uses **Tailwind CSS** (same as the admin UI). The storefront components should use Tailwind utility classes for all styling. Do NOT use CSS Modules or styled-components.

However, there is an important distinction: the storefront's global color palette comes from the theme's `global_settings.colors` (primary, secondary, background, text, accent) — these are merchant-configurable HEX values. These cannot be hardcoded Tailwind classes — they must be applied as **CSS custom properties** (CSS variables).

At the layout level, inject the merchant's colors as CSS custom properties on the `<html>` or `<body>` element:
- `--ws-color-primary: #F97316`
- `--ws-color-secondary: #1B2B3A`
- `--ws-color-background: #FFFFFF`
- `--ws-color-text: #0F172A`
- `--ws-color-accent: #10B981`

Block components then use `bg-[var(--ws-color-primary)]` or `style={{ color: "var(--ws-color-text)" }}` to respect these dynamic values. This is the canonical approach for dynamic theming with Tailwind.

### 2.2 Preview Mode Awareness

Every block component receives an optional `isPreview` boolean prop. When `isPreview = true`, certain interactive behaviors must be disabled or modified:
- "Add to Cart" buttons show a disabled state with a tooltip: "Not available in preview"
- Form submissions (newsletter signup) show a "Preview mode" message instead of submitting
- Navigation links that would leave the page (checkout, etc.) are disabled

### 2.3 `tenantData` Prop

The `ThemeRenderer` injects live catalog data into each block via a `tenantData` prop. This object contains:
- `collections` — map of collection handle → collection object (with products)
- `products` — recently fetched product objects for any product pickers
- `tenant` — basic tenant info (name, logo, currency)

This allows `FeaturedCollection` to receive the actual products for its chosen collection without each block making its own API call.

### 2.4 Fonts

Available storefront fonts are a predefined list (not the full Google Fonts catalog). For Phase 6, support these fonts: `Inter`, `Poppins`, `Lato`, `Merriweather`, `Playfair Display`, `Roboto`. These are loaded as Next.js font imports (`next/font/google`).

The theme layout applies the heading font to headings and the body font to the body element via CSS variables: `--ws-font-heading` and `--ws-font-body`.

---

## 3. Architecture: The Three Core Engine Files

### 3.1 `frontend/src/lib/webstore/blockRegistry.ts`

**Purpose:** A JavaScript object that maps block type strings (matching `BlockType` enum values from Phase 1) to React component references. This is the glue between the backend's `type` string and the frontend component.

**Structure:** An exported constant called `BLOCK_REGISTRY` — an object where each key is a block type string and each value is a React component.

**All registered types:**

| Type String | Component |
|---|---|
| `header` | `StorefrontHeader` |
| `footer` | `StorefrontFooter` |
| `announcement_bar` | `AnnouncementBar` |
| `hero_banner` | `HeroBanner` |
| `featured_collection` | `FeaturedCollection` |
| `image_with_text` | `ImageWithText` |
| `rich_text` | `RichText` |
| `product_grid` | `ProductGrid` |
| `testimonials` | `Testimonials` |
| `newsletter_signup` | `NewsletterSignup` |
| `collection_list` | `CollectionList` |
| `slideshow` | `Slideshow` |
| `countdown_timer` | `CountdownTimer` |
| `product_detail` | `ProductDetail` |
| `product_recommendations` | `ProductRecommendations` |
| `collection_header` | `CollectionHeader` |
| `collection_filters` | `CollectionFilters` |
| `cart_items` | `CartItems` |
| `cart_summary` | `CartSummary` |

Blocks not yet fully implemented in Phase 6 (`Slideshow`, `CountdownTimer`, `ProductRecommendations`, etc.) should have a placeholder component that renders a minimal grey box with the block name — enough to not crash the renderer.

### 3.2 `frontend/src/lib/webstore/themeRenderer.tsx`

**Purpose:** The core rendering engine. Accepts a `TenantThemeConfig` object, a template name, and live tenant data. Resolves the JSON config into a rendered React tree by mapping each section's type to its registered block component.

**How it works:**
1. Read `themeConfig.config.templates[template]` — this gives us the `{sections, order}` for the current page
2. Iterate through `order` (the array of section IDs in display order)
3. For each section ID, get the section config from `sections[sectionId]`
4. If `section.disabled === true`, skip it (don't render)
5. Look up `BLOCK_REGISTRY[section.type]` to get the React component
6. If no component is found for the type, log a warning and render nothing (never throw an error)
7. Call `mergeConfigWithSchema(section.settings, section.type)` to fill in any missing settings with schema defaults
8. Render the component with: `settings`, `blocks` (nested blocks dict), `blockOrder`, `isPreview`, `tenantData`

The `ThemeRenderer` is a React Server Component when used in the consumer storefront pages (Phase 7) and a regular client component when used in the iFrame preview (Phase 5).

### 3.3 `frontend/src/lib/webstore/configMerger.ts`

**Purpose:** Schema-safe settings resolution. When a block's schema gets a new setting added (after the merchant has already saved their config), the merchant's saved config won't have that setting. The `configMerger` fills in the schema's default value for any missing setting.

**How it works:**
1. Accept `savedSettings` (the merchant's stored values) and `blockType` (to look up the schema)
2. Fetch the schema for this block type (from a locally bundled schema map — schemas are bundled with the frontend in Phase 6 since they are static)
3. For each setting in the schema: use the saved value if it exists; otherwise use the schema's `default` value
4. Return the merged object

**Why not just use the saved settings directly?** If the platform adds a new setting to a block schema (e.g., adds an `enable_lazy_loading` option to `HeroBanner`), merchants who saved their config before this setting existed would not have it. The merger ensures the new setting renders with its default value instead of `undefined`, preventing layout breakage.

---

## 4. Block Components (Detailed Specifications)

All block components live in `frontend/src/components/webstore/blocks/`. Each block has its own directory containing `index.tsx`.

### 4.1 `StorefrontHeader`

**Purpose:** The global navigation bar displayed at the top of every storefront page.

**Settings from config:**
- `logo_width` — number (px): controls the width of the logo image
- `menu_handle` — string: which menu to display (fetched from `tenantData`)
- `show_search_icon` — boolean
- `show_cart_icon` — boolean
- `show_account_icon` — boolean
- `sticky` — boolean: whether the header sticks to the top when scrolling

**Nested blocks:**
- `announcement` type: up to 3 announcement items, each with `text` (string) and `link` (URL)

**Structure:**
- Top: Announcement bar (if announcement blocks exist and are enabled)
- Middle: Logo (left), navigation menu (center or right), icons bar (right)
- Mobile: Hamburger menu icon + slide-out drawer

**Mobile behavior:** Below 768px, hide the navigation links. Show a hamburger icon. Clicking it opens a full-width drawer from the left with all menu items. The drawer must be accessible (focus trap, escape key closes, ARIA labels).

**Logo:** Displayed as an `<img>` with the `tenant.logo_url` value. If no logo URL, show the tenant's `name` as text.

### 4.2 `StorefrontFooter`

**Purpose:** The global footer rendered at the bottom of every storefront page.

**Settings:**
- `show_payment_icons` — boolean: show accepted payment method icons
- `show_social_icons` — boolean: show social media links
- `copyright_text` — string: e.g., "© 2025 Lanka Bites. All rights reserved."
- Columns layout: 1–4 columns (driven by nested blocks)

**Nested blocks:**
- `menu_list` — a footer menu column: `{title, menu_handle}`
- `newsletter` — email signup form (simple, just the input)
- `social_icons` — renders links to social platforms from `global_settings.social`
- `text_block` — arbitrary text/HTML content for a column

**Structure:** Responsive CSS grid: 4 columns on desktop, 2 on tablet, 1 on mobile.

### 4.3 `HeroBanner`

**Purpose:** Full-width, visually dominant section at the top of the homepage. Sets the tone of the store's brand.

**Settings:**
- `background_image` — image: the full-bleed background image URL
- `background_color` — color: fallback if no image
- `overlay_opacity` — range (0–90, step 10): darkens the background image
- `overlay_color` — color: color of the overlay (default black)
- `height` — select: small (400px), medium (560px), large (720px), full (100vh)
- `content_alignment` — select: left, center, right
- `text_color` — color: for all text within the banner

**Nested blocks (each an optional sub-element):**
- `heading` — `{text, font_size}`
- `subheading` — `{text}`
- `button` — `{label, link, style: primary|secondary|outline}`
- Second button (same as above, renders side by side with the first)

**Rendering rules:**
- Background image is applied as CSS `background-image` with `object-fit: cover`
- Overlay is a semi-transparent div absolutely positioned over the image
- Content is centered vertically and horizontally within the block
- On mobile: reduce text size, stack buttons vertically

### 4.4 `FeaturedCollection`

**Purpose:** A grid of product cards sourced from a specific collection. Typically placed on the homepage to showcase a highlighted collection.

**Settings:**
- `collection_handle` — collection picker: which collection to display
- `heading` — text: section title, e.g., "New Arrivals"
- `subheading` — text: optional subtitle
- `products_to_show` — range (4–16, step 4)
- `columns_desktop` — select: 2, 3, 4, 5
- `columns_mobile` — select: 1, 2
- `show_view_all` — boolean: shows a "View All" link below the grid
- `card_style` — select: standard, compact, horizontal

**Product Card design (standard style):**
- Product image (lazy loaded, aspect ratio 1:1 or 3:4)
- Vendor name (if `show_vendor` global setting is enabled)
- Product title (truncated to 2 lines)
- Price range (or single price)
- Sale badge if `compare_at_price > price`
- "Add to Cart" quick action on hover (adds default variant to cart)

**Data flow:** The `collection_handle` setting is passed to `tenantData`. The parent (`ThemeRenderer` / page) pre-fetches the collection's products and injects them via `tenantData.collections[handle]`. The `FeaturedCollection` component reads from `tenantData.collections[settings.collection_handle]` — it does NOT make its own API call.

### 4.5 `ImageWithText`

**Purpose:** A two-column section combining an image and descriptive text. Commonly used for brand storytelling.

**Settings:**
- `image` — image: the image to display
- `image_position` — select: left, right
- `heading` — text
- `body` — richtext: paragraphs, bold, italic, lists
- `cta_label` — text: button label
- `cta_link` — url: button destination
- `background_color` — color
- `desktop_image_width` — select: small (33%), medium (50%), large (60%)

**Rendering:** CSS grid, two columns. On mobile, stack to single column with image on top. The image column and text column swap order based on `image_position`.

### 4.6 `RichText`

**Purpose:** A centered column of formatted text. Used for brand statements, mission descriptions, or policy text.

**Settings:**
- `content` — richtext: the formatted text content
- `text_alignment` — select: left, center, right
- `narrow_content` — boolean: restrict max-width to ~640px for better readability
- `background_color` — color
- `padding_top`, `padding_bottom` — range (0–100, step 4)

### 4.7 `ProductGrid`

**Purpose:** A grid of products from a collection or all products. Similar to `FeaturedCollection` but more generic — used on collection pages and as a general product showcase.

**Settings:**
- `collection_handle` — collection picker: source collection (blank = all products)
- `products_to_show` — range
- `columns_desktop`, `columns_mobile` — select
- `show_price` — boolean
- `show_vendor` — boolean
- `show_sale_badge` — boolean
- `enable_quick_add` — boolean: show "Quick Add" button on hover

**Difference from FeaturedCollection:** No section heading, more display options, designed for use on collection template pages.

### 4.8 `Testimonials`

**Purpose:** Social proof section displaying customer reviews or quotes.

**Settings:**
- `heading` — text: e.g., "What Our Customers Say"
- `layout` — select: grid, carousel
- `rating_style` — select: stars, none
- `background_color` — color

**Nested blocks — each testimonial item:**
- `quote` — textarea: the review text
- `author` — text: reviewer name
- `author_title` — text: optional role or descriptor
- `rating` — select: 1–5 stars
- `avatar_image` — image: optional reviewer photo

**Carousel behavior (when `layout = carousel`):** Use CSS `scroll-snap` (no JavaScript carousel library needed for basic cases). Dots pagination at the bottom. Auto-play optional (disabled by default — respects `prefers-reduced-motion`).

### 4.9 `AnnouncementBar`

**Purpose:** A thin strip above the header for site-wide promotional messages (shipping deals, sale announcements).

**Settings:**
- `text` — richtext: the announcement text
- `link` — url: clicking the bar navigates here
- `background_color` — color
- `text_color` — color
- `enable_auto_rotate` — boolean: rotate through multiple announcements
- `rotation_interval` — range: seconds between rotations (5–30)
- `show_close_button` — boolean: lets users dismiss the bar (dismissed state in localStorage)

**Multiple announcements:** Via nested `announcement` blocks — each with `text` and `link`. If multiple exist and `enable_auto_rotate = true`, cycle through them with a CSS transition.

### 4.10 `NewsletterSignup`

**Purpose:** Email capture section for building a mailing list.

**Settings:**
- `heading` — text
- `subheading` — text
- `button_label` — text: default "Subscribe"
- `placeholder` — text: input placeholder, default "Your email address"
- `success_message` — text: shown after successful submission
- `background_color`, `text_color`, `button_color` — color

**Behavior:**
- Renders a text input + submit button
- On submit: `POST /api/webstore/public/<slug>/newsletter/subscribe/` with `{email}` (add this endpoint stub in Phase 2's URL file)
- In preview mode: show "Preview mode" instead of submitting
- On success: replace the form with the `success_message`
- On error: show inline error message

### 4.11 Layout Components (Header, Footer — from Section 4.1, 4.2)

See Section 4.1 and 4.2 above.

---

## 5. Shared Product Components

These smaller components are used within blocks and are also reused in Phase 7's storefront pages.

### `ProductCard.tsx`

Located in `frontend/src/components/webstore/product/ProductCard.tsx`.

**Props:** `product` (product summary object from the API), `cardStyle` ("standard" | "compact" | "horizontal"), `showQuickAdd` (boolean), `isPreview` (boolean)

**Elements:**
- Product image with lazy loading and aspect ratio maintained
- Sale badge overlay (if `compare_at_price > price`)
- Product title (2-line truncation with CSS)
- Price display (shows `compare_at_price` struck through if on sale)
- Vendor name (conditionally shown)
- Quick Add button (hover reveal, adds default variant to cart)

**Accessibility:** Must have proper alt text on the image, meaningful link text.

### `ProductGallery.tsx`

Located in `frontend/src/components/webstore/product/ProductGallery.tsx`.

Used on the product detail page (Phase 7). Displays the product's images with:
- Main large image (changes on thumbnail click)
- Thumbnail strip below (scroll if more than 6)
- Pinch-to-zoom on mobile (CSS `touch-action: pinch-zoom` is sufficient for Phase 6)
- Swipe between images on mobile using CSS `scroll-snap`

### `VariantPicker.tsx`

Used on the product detail page. Displays each variant attribute (Color, Size, etc.) as a set of selectable options. Types:
- Color attributes: render as color swatches (small circles with the color)
- Other attributes: render as button pills

When a combination is selected, the selected variant is identified. If the combination is unavailable (out of stock), show the option as disabled/greyed.

---

## 6. Cart Integration Foundation

### `cartStore.ts` (Zustand)

Located in `frontend/src/lib/webstore/cartStore.ts`.

This Zustand store manages the consumer's cart state. Persisted to `localStorage` using Zustand's `persist` middleware.

**State:**
- `items` — array of cart line items
- `isOpen` — boolean: is the cart drawer currently visible

**Actions:**
- `addItem(productId, variantId, quantity, productInfo)` — adds or increments an item
- `removeItem(variantId)` — removes an item
- `updateQuantity(variantId, quantity)` — changes quantity (0 = remove)
- `clearCart()` — empties the cart
- `toggleCart()` / `openCart()` / `closeCart()` — drawer visibility

**Cart item object:**
- `variantId`, `productId`, `title`, `variantTitle`, `sku`, `quantity`, `price`, `imageUrl`

**Persistence key:** `webstore-cart-<tenant-slug>` — includes the tenant slug so that carts from different stores in the same browser don't mix.

### `CartDrawer.tsx`

Located in `frontend/src/components/webstore/cart/CartDrawer.tsx`.

A slide-in drawer from the right side, rendered in the webstore layout (Phase 7). Controlled by `cartStore.isOpen`.

**Contents:**
- Header: "Your Cart" + item count badge + close button
- Item list: each item shows image, name, variant, price, quantity selector (+/- buttons)
- Footer: subtotal + "Checkout" button (links to `/checkout`) + "Continue Shopping" link
- Empty state: an illustration + "Your cart is empty" message + "Start Shopping" link

---

## 7. Accessibility Standards

All block components in Phase 6 must meet WCAG 2.1 AA compliance:

- All images have `alt` attributes (empty alt for decorative images)
- Interactive elements are keyboard-focusable and visible focus rings are applied
- Color contrast ratio: text on background ≥ 4.5:1
- The `AnnouncementBar` close button has `aria-label="Close announcement"`
- The `StorefrontHeader` mobile drawer has `role="dialog"`, `aria-modal="true"`, focus trap
- The `Testimonials` carousel (if present) has `aria-live="polite"` for auto-rotating content
- All links have meaningful text (not just "click here")

---

## 8. Verification Checklist

- [ ] `BLOCK_REGISTRY` has entries for all 19 block types (no type throws an error; missing ones render placeholders)
- [ ] `ThemeRenderer` renders the "index" template's sections in the correct order
- [ ] `configMerger` fills in default values for settings not present in saved config
- [ ] `StorefrontHeader` renders the logo, navigation links from the "main-menu", and cart icon
- [ ] `StorefrontHeader` collapses to hamburger menu on mobile (< 768px)
- [ ] `HeroBanner` renders with a background image and overlay, and CTA buttons are clickable links
- [ ] `FeaturedCollection` renders a grid of product cards from the specified collection
- [ ] `FeaturedCollection` correctly handles 2/3/4/5 column layouts
- [ ] `ProductCard` shows sale badge when `compare_at_price > price`
- [ ] `AnnouncementBar` can be dismissed and the state is persisted in localStorage
- [ ] `NewsletterSignup` shows "Preview mode" toast when `isPreview = true`
- [ ] `cartStore` persists to localStorage — adding an item, refreshing the browser, and the item is still there
- [ ] `CartDrawer` opens on cart icon click and closes on overlay click or X button
- [ ] All block components pass basic keyboard navigation checks (tab through interactive elements)
