# Phase 7: Consumer Storefront Pages

**Phase:** 7 of 10  
**Depends on:** Phase 2 (public API), Phase 6 (block components and ThemeRenderer), Phase 5 (types)  
**Unlocks:** Phase 8 (Checkout — the cart state and product pages built here feed the checkout)  
**Estimated Scope:** Frontend only (Next.js consumer storefront pages + middleware update)

---

## 1. Overview

This phase builds the consumer-facing storefront that end users actually browse and shop on. It creates a new Next.js route group called `(webstore)` that renders all public storefront pages using the theme renderer built in Phase 6.

These pages are built as **Next.js Server Components** wherever possible, using ISR (Incremental Static Regeneration) for performance. Client components are used only where interactivity is required (cart, variant picker, etc.).

At the end of this phase, a consumer can:
- Visit the storefront home page styled with the merchant's theme
- Browse product collections
- View product detail pages with image gallery and variant selection
- Add products to cart
- Search for products
- View static pages (About Us, FAQ, etc.)
- View all collections

The storefront must handle multiple tenants. When a consumer visits `test-business.localhost:3000/products/blue-shirt`, the system must resolve the tenant from the subdomain, load that tenant's theme, and render the page using that tenant's catalog and customization.

---

## 2. Existing Frontend Context

### 2.1 Current Middleware Behavior

`frontend/src/middleware.ts` currently handles:
- Subdomain extraction from the hostname
- JWT verification for staff routes under `/store/*`
- Role-based access control for admin pages
- Grace period handling for past-due subscriptions

The middleware must be **extended** (not replaced) to handle webstore public routes. The existing staff route logic must remain fully intact.

### 2.2 Current Route Groups

```
(auth)/      — /login, /register — tenant-branded staff auth
(public)/    — / on main domain — marketing page
(store)/     — /store/* — admin dashboard (auth required)
(superadmin)/ — /superadmin/* — platform admin
```

The new `(webstore)` route group must coexist with these groups. The routing disambiguation is:
- If the URL path starts with `/store`, `/login`, `/pin-login`, `/suspended`, `/api` → existing behavior unchanged
- If the URL is on a tenant subdomain AND none of the above → route to the `(webstore)` group

### 2.3 Subdomain in Development

In development, subdomains are accessed via `test-business.localhost:3000`. The middleware extracts `test-business` as the tenant slug from the hostname. This works in modern browsers for `localhost` subdomains. If the developer's browser or OS doesn't support localhost subdomains, use the `x-tenant-slug` header workaround described in the existing middleware code.

### 2.4 Server Component Data Fetching

In Next.js 15 App Router, Server Components can call `fetch()` directly (no `useEffect`). The fetch calls in Server Components go server-to-server (Next.js server → Django API), so they are fast and there are no CORS issues.

Pass the tenant slug as a path parameter. For example, the home page fetches:
- `GET /api/webstore/public/<slug>/config/` — for theme config
- `GET /api/webstore/public/<slug>/collections/` — for available collections (injected into ThemeRenderer tenantData)

The `fetch()` base URL in Server Components uses the `NEXT_INTERNAL_API_URL` environment variable (the internal Docker/local URL for server-to-server calls) rather than the public-facing `NEXT_PUBLIC_API_URL`.

---

## 3. Middleware Updates

### 3.1 New Routing Logic

Extend the existing middleware with this additional routing logic:

For requests to a **tenant subdomain** (`slug != null`):

- If path starts with `/store`, `/login`, `/pin-login`, `/suspended`, `/api` → existing logic (unchanged)
- If path starts with `/webstore-preview` → existing preview logic (added in Phase 5)
- Otherwise → treat as a webstore public route:
  1. No JWT check required for these routes
  2. Pass the request through to the `(webstore)` route group
  3. Set the `x-tenant-slug` request header (already done for all subdomain requests)

### 3.2 The `(webstore)` vs `/store/*` Disambiguation

The key rule: **path prefix determines the route group**.

- On any subdomain:
  - `/store/*` → `(store)` route group → staff admin, requires JWT
  - `/login`, `/pin-login` → `(auth)` route group → staff auth
  - Everything else → `(webstore)` route group → no JWT required (consumer public pages)

The consumer login (`/account/login`) and consumer registration (`/account/register`) are also under `(webstore)` and do not require a staff JWT.

---

## 4. The `(webstore)` Route Group — File Structure

All files are under `frontend/src/app/(webstore)/`:

| File | Route | Purpose |
|---|---|---|
| `layout.tsx` | — | Root webstore layout: applies theme CSS vars, renders header/footer |
| `loading.tsx` | — | Skeleton displayed during page transitions |
| `not-found.tsx` | — | Tenant-branded 404 page |
| `page.tsx` | `/` | Storefront home page |
| `products/[handle]/page.tsx` | `/products/<handle>` | Product detail page |
| `collections/page.tsx` | `/collections` | All collections listing |
| `collections/[handle]/page.tsx` | `/collections/<handle>` | Collection page with product grid |
| `search/page.tsx` | `/search` | Search results page |
| `cart/page.tsx` | `/cart` | Full cart page (client component) |
| `pages/[handle]/page.tsx` | `/pages/<handle>` | Static merchant page |
| `account/login/page.tsx` | `/account/login` | Consumer account login |
| `account/register/page.tsx` | `/account/register` | Consumer account registration |
| `account/page.tsx` | `/account` | Consumer account dashboard |
| `account/orders/page.tsx` | `/account/orders` | Consumer order history |
| `webstore-preview/[...path]/page.tsx` | `/webstore-preview/*` | Customizer iFrame target (see Phase 5) |

---

## 5. The Webstore Layout (`layout.tsx`)

This is the root layout for all consumer-facing pages. It is a **Server Component**.

**Responsibilities:**
1. Extract the tenant slug from the request headers (`x-tenant-slug` set by middleware)
2. Fetch the tenant's active theme config from `GET /api/webstore/public/<slug>/config/`
3. If `is_enabled = false`: render a "Coming Soon" page (see Section 5.1)
4. If `is_password_protected = true`: check for a `store-password` cookie; if missing, render the password entry page
5. Apply CSS custom properties for the theme colors and fonts to a wrapper `<div>` or via inline `<style>` in the `<head>`
6. Render `StorefrontHeader` (from Phase 6) at the top
7. Render the page content via `{children}`
8. Render `StorefrontFooter` at the bottom
9. Render the `CartDrawer` (client component — cart drawer is rendered at layout level so it appears on all pages)

**Menu data:** The layout also fetches the "main-menu" and "footer" menus and passes them as props to `StorefrontHeader` and `StorefrontFooter`.

**Performance:** The layout's `fetch()` call must use Next.js caching:
- Use `fetch(url, { next: { tags: ["webstore-config-<slug>"] } })` — this enables on-demand revalidation
- The cache is invalidated when Phase 3's publish endpoint triggers a revalidation (Phase 10 adds the revalidation endpoint)

### 5.1 "Coming Soon" / Store Offline State

When `config.is_enabled = false`, the layout should NOT render the header/footer — just a centered, minimal page showing:
- The tenant's name (from the config)
- "We're coming soon" or "This store is currently offline" message
- An optional contact email or social media links if the merchant has configured them

### 5.2 CSS Variable Injection

The theme's `global_settings.colors` must be injected as CSS custom properties. Recommended approach:
- In the layout, generate a CSS string from the global settings colors
- Render it via a `<style>` tag inside the HTML head using Next.js's `<head>` metadata mechanism or directly in the layout JSX
- Variable names: `--ws-primary`, `--ws-secondary`, `--ws-background`, `--ws-text`, `--ws-accent`
- Font variables: `--ws-font-heading`, `--ws-font-body`

All block components from Phase 6 use `var(--ws-primary)` etc. to reference these values.

---

## 6. Home Page (`page.tsx`)

**Route:** `/` on any tenant subdomain

This is a **Server Component**.

**Data fetching:**
1. Get tenant slug from `headers().get("x-tenant-slug")`
2. Fetch active theme config: `GET /api/webstore/public/<slug>/config/`
3. Extract the "index" template's section configs
4. Pre-fetch any data needed by sections:
   - For each `featured_collection` or `product_grid` section: fetch the collection's products from `GET /api/webstore/public/<slug>/collections/<handle>/`
   - Combine all fetched data into the `tenantData` object
5. Render `<ThemeRenderer template="index" themeConfig={config} tenantData={tenantData} />`

**ISR:** `export const revalidate = 60` — regenerate the page every 60 seconds. Tagged with `webstore-<slug>` for on-demand invalidation.

**`generateMetadata()`:** Export a `generateMetadata` function that returns:
- `title` — `TenantWebstore.seo_title` or tenant name
- `description` — `TenantWebstore.seo_description`
- `openGraph.images` — `TenantWebstore.social_image_url`

---

## 7. Product Detail Page (`products/[handle]/page.tsx`)

**Route:** `/products/<handle>`

This is a **Server Component** that renders the product template.

**Data fetching:**
1. Fetch product detail: `GET /api/webstore/public/<slug>/products/<handle>/`
2. Return 404 (via Next.js `notFound()`) if the product doesn't exist or is not published
3. Render `<ThemeRenderer template="product" themeConfig={config} tenantData={{product: productData}} />`

**The product template renders the `product_detail` block** which in turn renders:
- `ProductGallery` — image gallery with main image + thumbnails
- `VariantPicker` — color/size attribute selectors
- `QuantitySelector` — +/- spinner
- Title, price, description
- "Add to Cart" button

**The "Add to Cart" button** is a Client Component embedded within the otherwise server-rendered page. When clicked, it calls `cartStore.addItem(...)` (the Zustand store from Phase 6).

**`generateStaticParams()`:** Not feasible for dynamic multi-tenant content — use ISR instead.

**`generateMetadata()`:**
- `title` — `product.seo_title` or `product.title`
- `description` — `product.seo_description` or first 160 chars of `product.description`
- `openGraph.images` — `product.featured_image_url`

**Variant URL state:** When the consumer selects a variant (e.g., "Blue / Large"), update the URL query parameter: `/products/t-shirt?variant=<variantId>`. This allows sharing a specific variant's URL and using the browser back button to return to the previous variant selection.

---

## 8. Collection Page (`collections/[handle]/page.tsx`)

**Route:** `/collections/<handle>`

A Server Component that renders a collection with a product grid.

**Data fetching:**
1. Fetch collection detail + products: `GET /api/webstore/public/<slug>/collections/<handle>/`
2. The collection's `collection_header` section shows the collection image and description
3. The `product_grid` or `collection_filters` sections show and filter the products

**URL-based filtering:** The collection page supports filtering via query parameters:
- `?sort=price_asc` — passed to the API
- `?min_price=1000&max_price=5000` — price range filters
- `?page=2` — pagination

When query params are present, the page is NOT statically cached (no ISR for filtered views). Instead, use server-side fetching without cache (`no-store`).

**Pagination:** Show page navigation controls at the bottom. For ISR to work on the base collection page (no filters, page 1), ensure the unfiltered first page IS cached.

---

## 9. All Collections Page (`collections/page.tsx`)

**Route:** `/collections`

Lists all published collections as a grid of cards (collection image, title, description preview, product count).

Data: `GET /api/webstore/public/<slug>/collections/`

Each card links to `/collections/<handle>`.

ISR: `revalidate = 60`

---

## 10. Search Page (`search/page.tsx`)

**Route:** `/search`

A mostly **Client Component** page since search must be interactive (live filtering as the user types).

**Layout:**
- Search input at the top (large, auto-focused)
- Results grid below (same `ProductCard` components used in collections)
- "N results for 'query'" counter
- Sort dropdown

**Behavior:**
- URL-based search: `?q=blue+shirt` — the search query is always in the URL so results are shareable and bookmarkable
- On mount, read `q` from query params and execute the search
- On input change: debounce 400ms, then update the URL (using `router.push` or `router.replace`)
- API call: `GET /api/webstore/public/<slug>/search/?q=<query>`
- Empty state: "No results for '...'" with suggestions to try different keywords

---

## 11. Static Pages (`pages/[handle]/page.tsx`)

**Route:** `/pages/<handle>`

A simple Server Component that renders the merchant's custom page content.

**Data fetching:** `GET /api/webstore/public/<slug>/pages/<handle>/`

**Rendering:** The `body_html` field is rendered via `dangerouslySetInnerHTML`. This is safe because the HTML was sanitized with `bleach` on the backend before saving (Phase 1 / Phase 3).

**Styling:** The page template includes a `WebstorePage` block that applies basic prose styling (Tailwind's `prose` class from `@tailwindcss/typography`) to make the merchant's HTML look readable.

**`generateMetadata()`:** Uses `page.seo_title` and `page.seo_description`.

ISR: `revalidate = 60`

---

## 12. Cart Page (`cart/page.tsx`)

**Route:** `/cart`

A **Client Component** page (fully client-side, no SSR needed — the cart lives in localStorage).

**Layout:**
- Heading: "Your Cart"
- Line items table: image, title, variant, quantity selector, line total, remove button
- Order summary sidebar (on desktop: right column; on mobile: below the items):
  - Subtotal
  - Shipping note: "Shipping calculated at checkout"
  - Discount code input + Apply button (Phase 8 implements the discount code API)
  - "Proceed to Checkout" button → `/checkout`
- Empty cart state: illustration + "Your cart is empty" + "Continue Shopping" button

**Quantity update behavior:** When the merchant changes the quantity field, call `cartStore.updateQuantity(variantId, newQty)` immediately. The cart page reflects the change instantly (no API call needed — cart is client-side only until checkout).

---

## 13. Consumer Account Pages

### 13.1 Consumer Login (`account/login/page.tsx`)

Completely separate from the staff `/login` page. This is for storefront consumers only.

**Form:** Email + password inputs. "Sign In" button. "Forgot password?" link. "Don't have an account? Register" link.

**On submit:** `POST /api/webstore/public/<slug>/customers/login/` — implemented in Phase 8.

**After login:** Redirect to `/account`.

**Important distinction:** If a staff member accidentally visits `/account/login` (they should use `/login`), show a subtle note: "Looking for the store management login? Visit /login"

### 13.2 Consumer Registration (`account/register/page.tsx`)

**Form:** First name, Last name, Email, Password, Confirm Password. "Create Account" button.

**On submit:** `POST /api/webstore/public/<slug>/customers/register/` — Phase 8.

### 13.3 Account Dashboard (`account/page.tsx`)

Requires consumer JWT in cookies. Shows:
- Welcome message: "Hello, [First Name]"
- Recent orders (last 5)
- Saved addresses
- "Edit Profile" and "Change Password" links

### 13.4 Order History (`account/orders/page.tsx`)

List of the consumer's past orders with: order number, date, items summary, total, status badge. Each order links to its detail view.

---

## 14. Not Found Page (`not-found.tsx`)

When a product, collection, or page is not found (404), render a branded not-found page using the tenant's theme (colors, logo, header, footer). The message: "We can't find the page you're looking for." with a "Back to Home" link.

This is distinct from the global Next.js 404 — it must include the storefront header and footer, making it look like part of the store.

---

## 15. The `tenantData` Aggregation Pattern

The `ThemeRenderer` needs live data (products, collections) to inject into block components. Each Server Component page must aggregate this data before calling `ThemeRenderer`.

**Pattern for the home page:**
1. Parse the "index" template from the active theme config
2. Find all sections of type `featured_collection` or `product_grid`
3. For each such section, extract the `collection_handle` setting
4. Fetch all required collections in parallel using `Promise.all([...])` 
5. Assemble the `tenantData` object: `{ collections: { "handle-a": {...data...}, "handle-b": {...data...} }, tenant: {...} }`
6. Pass to `ThemeRenderer`

This means no section component makes its own API call — all data is pre-fetched at the page level and injected. This enables proper ISR caching at the page level.

---

## 16. Open Graph / Social Preview

All storefront pages must have proper `<meta>` tags for social sharing. Each page's `generateMetadata()` must include:

**Product pages:**
- `og:type = "product"`
- `og:image` = product's featured image
- `og:price:amount` = lowest variant price
- `og:price:currency` = "LKR"

**Collection and static pages:**
- `og:type = "website"`
- `og:image` = collection image or store's social image

**Home page:**
- `og:type = "website"`
- `og:image` = store's social image from `TenantWebstore.social_image_url`

---

## 17. Verification Checklist

- [ ] Visiting `test-business.localhost:3000/` renders the storefront home page (not the staff login)
- [ ] Visiting `test-business.localhost:3000/store/dashboard` still requires staff login (middleware not broken)
- [ ] The home page renders all sections in the active theme config's "index" template
- [ ] Visiting a product page at `/products/<valid-handle>` renders the product detail
- [ ] Visiting `/products/<invalid-handle>` renders the 404 page with the store's theme
- [ ] The variant picker allows selecting different color/size combinations
- [ ] Clicking "Add to Cart" on a product page adds it to the cart store
- [ ] The cart icon in the header shows the item count (updates immediately after adding)
- [ ] The cart drawer opens when the cart icon is clicked
- [ ] Visiting `/cart` shows the cart items correctly
- [ ] Visiting `/collections/<handle>` shows the collection's products
- [ ] Visiting `/search?q=shirt` shows search results
- [ ] Visiting `/pages/about-us` (if the page exists) shows the page content
- [ ] The store's theme colors are reflected in the storefront (e.g., primary color on buttons)
- [ ] The storefront's `<title>` tag matches the store's SEO title
- [ ] Page source includes Open Graph meta tags for product pages
- [ ] Visiting a tenant with `is_enabled = false` shows the "Coming Soon" page
