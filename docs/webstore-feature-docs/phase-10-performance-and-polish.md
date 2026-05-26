# Phase 10: Advanced Features, Performance & Polish

**Phase:** 10 of 10  
**Depends on:** All previous phases (this is the finalization phase)  
**Unlocks:** Production readiness  
**Estimated Scope:** Full-stack — caching, custom domains, blog, reviews, SEO, accessibility, analytics

---

## 1. Overview

Phase 10 takes the webstore from functional to production-ready. It does not add entirely new capabilities but extends, optimizes, and polishes what was built in Phases 1–9.

Key deliverables:
1. **ISR + On-Demand Revalidation** — proper cache invalidation so store updates appear within seconds
2. **Custom Domain Support** — merchants can point their own domain to their LankaCommerce store
3. **Blog** — a simple content blog for merchants to publish articles
4. **Product Reviews** — consumer-submitted reviews with admin moderation
5. **SEO Completeness** — sitemap.xml, robots.txt, structured data
6. **Analytics Stub** — page view tracking and a basic analytics dashboard
7. **Accessibility Audit** — WCAG 2.1 AA compliance sweep
8. **Performance Audit** — Lighthouse 90+ targets on all storefront pages
9. **Password-Protected Stores** — middleware enforcement for pre-launch stores
10. **Mobile Polish** — final responsive design sweep

---

## 2. ISR and On-Demand Revalidation

### 2.1 Current State

In Phases 7 and previous, the storefront pages have `export const revalidate = 60` which means Next.js regenerates them at most once per minute. This is acceptable for development but suboptimal for production — when a merchant publishes a theme change, the update should appear within seconds, not after 60 seconds.

### 2.2 On-Demand Revalidation Architecture

**How it works:**
1. Merchant publishes a theme config change (Phase 3's publish endpoint)
2. After a successful publish, the Django backend makes a server-to-server `POST` request to a Next.js revalidation API route
3. The Next.js revalidation route clears the cache for the affected tenant's storefront pages
4. The next consumer request to any storefront page triggers a fresh render

**Key components:**

**A. Next.js Revalidation Route**

File: `frontend/src/app/api/revalidate/route.ts`

This is a Next.js API route (not a page). It accepts a `POST` request with a JSON body:
```
{
  "secret": "<REVALIDATION_SECRET>",
  "tag": "webstore-test-business"
}
```

The route must:
1. Verify `secret` matches the `REVALIDATION_SECRET` environment variable — reject with 401 if it doesn't
2. Call Next.js's `revalidateTag(tag)` to invalidate all cached fetches tagged with that value
3. Return `200 OK`

This route must NOT be publicly accessible without the secret — it could be abused to force-rebuild the cache on demand. Use a long random string for `REVALIDATION_SECRET` (generate with `openssl rand -hex 32`).

**B. Cache Tags on Storefront Fetches**

In all storefront pages and the layout, add cache tags to `fetch()` calls:

- Layout config fetch: `{ next: { tags: ["webstore-<slug>", "webstore-config-<slug>"] } }`
- Product list fetches: `{ next: { tags: ["webstore-<slug>", "webstore-products-<slug>"] } }`
- Collection fetches: `{ next: { tags: ["webstore-<slug>", "webstore-collections-<slug>"] } }`
- Page content fetches: `{ next: { tags: ["webstore-<slug>", "webstore-pages-<slug>"] } }`

Use the broadest tag (`webstore-<slug>`) for a full-site revalidation (on theme publish) and specific tags (`webstore-products-<slug>`) for partial revalidation (on product update).

**C. Backend: Calling the Revalidation Route**

Add a utility function `trigger_revalidation(tenant_slug, tag)` in `backend/apps/webstore/services/revalidation_service.py`.

This function:
1. Constructs the URL: `NEXT_REVALIDATION_URL` env variable + `/api/revalidate`
2. Makes a `POST` request with `{"secret": REVALIDATION_SECRET, "tag": "webstore-<slug>"}`
3. Uses a timeout of 5 seconds (don't block the API response on this)
4. If the request fails (network error, timeout), log a warning — but do NOT raise an exception that rolls back the database transaction. Revalidation failure should be non-fatal.

Call `trigger_revalidation` at these points:
- After `TenantThemeConfig` is published (`PATCH /api/webstore/tenants/themes/publish/`)
- After `WebstorePage` is saved or deleted
- After `WebstoreMenu` is saved or deleted
- After `WebstoreCollection` is saved or deleted
- After a product is published/unpublished (this is in the `catalog` app — add a signal or call the service from the catalog views)

### 2.3 ISR Revalidation Time Reduction

With on-demand revalidation in place, reduce the `revalidate` time from 60 to `revalidate = 3600` (1 hour). The on-demand mechanism handles freshness; the time-based revalidation is just a safety net for cases where the webhook fails.

---

## 3. Custom Domain Support

### 3.1 Architecture

Merchants on paid plans can point their own domain (`www.mystore.lk`) to their LankaCommerce store.

**How the routing works:**

When a request arrives at the Next.js server with an unknown hostname (not `*.lankacommerce.com` or `localhost`):
1. The middleware calls a domain resolution API: `GET /api/webstore/resolve-domain/?domain=<hostname>`
2. The API returns `{ "tenant_slug": "test-business" }` or 404
3. The middleware sets `x-tenant-slug: test-business` and continues
4. All subsequent webstore logic works the same as subdomain routing

**Cache the resolution:** Cache the domain → slug mapping in the middleware for 5 minutes (use a small in-memory `Map` or `unstable_cache` from Next.js). This prevents a database lookup on every request for custom domain stores.

### 3.2 Backend: Domain Resolution

**`GET /api/webstore/resolve-domain/?domain=<hostname>`**

Looks up `TenantWebstore` where `storefront_domain = domain`. Returns:
- 200 + `{ "tenant_slug": "...", "tenant_id": "..." }` if found
- 404 if no tenant has that domain

This endpoint is public (no auth). Treat the response as safe since it only returns a slug — not sensitive data.

### 3.3 Custom Domain Configuration

**Backend:** `TenantWebstore.storefront_domain` (already in Phase 1 model) stores the custom domain. A tenant admin can set this via `PATCH /api/webstore/tenants/config/` (Phase 3).

**Validation:** When a custom domain is set, validate:
- It looks like a valid domain (regex check)
- It is not already claimed by another tenant
- It is not a reserved domain (no `lankacommerce.com` subdomains)

**DNS instructions for the merchant:** The Phase 4 settings page (`/store/webstore/settings/`) should display instructions: "Point your domain's CNAME record to `storefront.lankacommerce.com`". Add a "Verify DNS" button that calls a verification check.

**SSL:** Custom domains require SSL certificates. In production, use Let's Encrypt with Caddy or Nginx automatic certificate provisioning. This is infrastructure-level — document it in the README rather than implementing it in the codebase.

### 3.4 Password-Protected Store Enforcement

When `TenantWebstore.is_password_protected = True`:

The middleware must:
1. Check for a `store-password-<slug>` cookie (set when the visitor enters the correct password)
2. If the cookie is missing: redirect to `/store-password` page
3. If the cookie is present: allow access

**`/store-password` page:** A simple centered page with the store's name/logo, a password input, and a "Enter" button. On submit: `POST /api/webstore/public/<slug>/verify-password/` with `{password}`. On success: set the cookie (expires in 24 hours) and redirect to the intended page. On failure: show "Incorrect password."

**Password verification endpoint:** Compare the submitted password against `TenantWebstore.password_hash` (compare via Django's `check_password()`). Never store or return the plain text password.

---

## 4. Blog

### 4.1 Backend: New `WebstoreBlogPost` Model

Add to `backend/apps/webstore/models.py`:

| Field | Type | Notes |
|---|---|---|
| `id` | UUIDField | Primary key |
| `tenant` | ForeignKey(Tenant) | Multi-tenant FK |
| `title` | CharField(255) | Article title |
| `handle` | SlugField | URL slug, unique per tenant |
| `author_name` | CharField(100) | Display name (not a FK to CustomUser — keeps it simple) |
| `body_html` | TextField | Sanitized HTML content |
| `excerpt` | TextField(500) | Short summary (auto-truncated from body if empty) |
| `featured_image_url` | URLField | Cover image |
| `is_published` | BooleanField | Default False |
| `published_at` | DateTimeField | Null until published |
| `tags` | JSONField | List of tag strings, default empty list |
| `seo_title` | CharField(60) | Optional SEO title |
| `seo_description` | CharField(160) | Optional SEO description |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

Migration: Create and apply after adding the model.

### 4.2 Blog API Endpoints

**Public endpoints:**
- `GET /api/webstore/public/<slug>/blog/` — list published blog posts (paginated, sorted by `published_at` DESC)
- `GET /api/webstore/public/<slug>/blog/<handle>/` — single post detail

**Tenant admin endpoints:**
- `GET/POST /api/webstore/tenants/blog/` — list/create posts
- `GET/PUT/PATCH/DELETE /api/webstore/tenants/blog/<id>/`
- `PATCH /api/webstore/tenants/blog/<id>/publish/`

### 4.3 Blog Storefront Pages

**New routes in `(webstore)`:**
- `blog/page.tsx` — blog listing page
- `blog/[handle]/page.tsx` — single article page

Blog listing: grid of article cards (cover image, title, excerpt, date, author). ISR `revalidate = 3600`.

Article detail: full article layout with cover image, title, author, date, body content (prose-styled). `generateMetadata()` for SEO.

### 4.4 Blog Admin UI

New pages in `(store)` at `/store/webstore/blog/`:
- Blog posts list (table with title, status, date, actions)
- New post form: title, handle (auto-generated), rich text editor (Tiptap — same as the static pages editor from Phase 4), excerpt, featured image URL, tags, SEO fields
- Publish/Unpublish toggle

---

## 5. Product Reviews

### 5.1 Backend: New `WebstoreProductReview` Model

| Field | Type | Notes |
|---|---|---|
| `id` | UUIDField | Primary key |
| `tenant` | ForeignKey(Tenant) | Multi-tenant FK |
| `product` | ForeignKey(Product) | The reviewed product |
| `customer` | ForeignKey(WebstoreCustomer, null=True) | Reviewer (null if submitted as guest) |
| `reviewer_name` | CharField(100) | Display name |
| `reviewer_email` | EmailField | For follow-up (not displayed publicly) |
| `rating` | PositiveSmallIntegerField | 1–5 |
| `title` | CharField(255) | Review title |
| `body` | TextField | Review text |
| `is_approved` | BooleanField | Default False — requires admin approval before display |
| `is_verified_purchase` | BooleanField | True if `customer` has a confirmed order for this product |
| `created_at` | DateTimeField | Auto |

### 5.2 Review Endpoints

**Public:**
- `GET /api/webstore/public/<slug>/products/<handle>/reviews/` — list approved reviews for a product
- `POST /api/webstore/public/<slug>/products/<handle>/reviews/` — submit a review (requires consumer JWT OR allow guest with email)

**Tenant admin:**
- `GET /api/webstore/tenants/reviews/` — list all pending reviews for moderation
- `PATCH /api/webstore/tenants/reviews/<id>/approve/`
- `PATCH /api/webstore/tenants/reviews/<id>/reject/`
- `DELETE /api/webstore/tenants/reviews/<id>/`

**Verified purchase check:** When a consumer submits a review and is logged in, check if `WebstoreOrder` exists with `customer = consumer` and contains the product. If yes, set `is_verified_purchase = True`.

**Spam prevention:** Rate limit review submissions per IP (max 3 per hour). Do NOT use CAPTCHAs in Phase 10 (deferred).

### 5.3 Product Page Integration

On the product detail page (`products/[handle]/page.tsx`), add a "Customer Reviews" section below the product info:
- Rating summary: star distribution bar chart, average rating
- List of approved reviews (paginated, 10 per page)
- "Write a Review" form (shown to logged-in consumers; guests see a "Sign in to leave a review" link)

### 5.4 Review Admin UI

New page at `/store/webstore/reviews/` in the store admin:
- Table: product name, reviewer name, rating (stars), review excerpt, date, status (Pending/Approved/Rejected), actions
- "Approve" and "Reject" buttons per row
- Filter by status (Pending first)

---

## 6. SEO Completeness

### 6.1 Sitemap

File: `frontend/src/app/(webstore)/sitemap.xml/route.ts`

A Next.js Route Handler that generates a dynamic XML sitemap for the tenant's storefront.

**Included URLs:**
- Home page `/` — priority 1.0, weekly changefreq
- All product pages `/products/<handle>` — priority 0.8, daily changefreq
- All collection pages `/collections/<handle>` — priority 0.7, weekly changefreq
- All static pages `/pages/<handle>` — priority 0.5, monthly changefreq
- All blog posts `/blog/<handle>` — priority 0.6, daily changefreq

**Data source:** Fetch from the public API endpoints for each content type.

**Format:** Standard XML Sitemap format with `<urlset>`, `<url>`, `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>` elements.

### 6.2 robots.txt

File: `frontend/src/app/(webstore)/robots.txt/route.ts`

Dynamic robots.txt generation. Returns:
- If `TenantWebstore.is_enabled = false`: `Disallow: /` (prevent indexing of offline stores)
- If `TenantWebstore.is_password_protected = true`: `Disallow: /` (prevent indexing of password-protected stores)
- Otherwise: standard open crawl rules with `Sitemap: https://<slug>.lankacommerce.com/sitemap.xml`

### 6.3 Structured Data (JSON-LD)

On product pages, inject `<script type="application/ld+json">` with `Product` schema markup:
- `@type: "Product"`
- `name`, `description`, `image`
- `offers`: price, currency, availability (`InStock` or `OutOfStock`)
- `aggregateRating` (when reviews exist): `ratingValue`, `reviewCount`

On the home page, inject `Organization` schema with the store name and URL.

On blog article pages, inject `Article` schema.

**Implementation:** Render the JSON-LD as a `<script>` tag inside the page's JSX (not via `generateMetadata()` — metadata API doesn't support JSON-LD directly). Use a shared `JsonLd` React component that renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`.

---

## 7. Analytics Stub

### 7.1 Page View Tracking

**Backend endpoint:** `POST /api/webstore/public/<slug>/analytics/pageview/`

Accepts:
- `page_type` — string: "home", "product", "collection", "search", "page", "blog"
- `page_handle` — string: the handle or path of the page viewed
- `referrer` — string: the `document.referrer` value (optional)
- `session_id` — string: a client-generated anonymous UUID for session grouping

**Backend handling:** Store in a lightweight `WebstoreAnalyticsEvent` model (or write directly to a PostgreSQL table for analytics queries). For Phase 10, a simple `WebstoreAnalyticsEvent` model is sufficient:

| Field | Type |
|---|---|
| `id` | BigAutoField |
| `tenant` | ForeignKey(Tenant) |
| `event_type` | CharField(20) — "pageview" |
| `page_type` | CharField(50) |
| `page_handle` | CharField(200) |
| `session_id` | UUIDField (nullable) |
| `created_at` | DateTimeField (auto) |

**Important:** Do NOT store the visitor's IP address in this model (GDPR/privacy concern). Session ID is anonymous and client-generated. If GDPR compliance is required, add a cookie consent banner before firing analytics (deferred to a future phase).

### 7.2 Frontend: Analytics Hook

Create `frontend/src/hooks/useAnalytics.ts` — a hook that calls the analytics endpoint.

Use it in the webstore layout: on route change (use `usePathname()` + `useEffect`), extract the `page_type` and `page_handle` from the path and send a pageview event.

The hook must fire only in production (`process.env.NODE_ENV === "production"`) or when `NEXT_PUBLIC_ANALYTICS_ENABLED = "true"`. This prevents polluting analytics with development traffic.

### 7.3 Analytics Admin Dashboard

New page at `/store/webstore/analytics/` in the store admin:

**Metrics shown:**
- Last 30 days page views (line chart — use the existing chart library already in the project, e.g., Recharts or Chart.js)
- Top 10 most viewed products (table)
- Top 5 traffic sources (from `referrer` field)
- Views by page type (pie chart: home, product, collection, etc.)

The dashboard fetches from a new tenant admin endpoint: `GET /api/webstore/tenants/analytics/summary/?days=30`

The backend aggregates the `WebstoreAnalyticsEvent` table with `GROUP BY` queries. For Phase 10, simple ORM queries are sufficient — no need for a separate analytics database.

---

## 8. Accessibility Audit

### 8.1 Required WCAG 2.1 AA Checks

Go through all Phase 6 block components and Phase 7 storefront pages and verify:

**Color Contrast:**
- Body text on background: minimum 4.5:1 ratio
- Large text (18px+ or 14px+ bold) on background: minimum 3:1 ratio
- Interactive elements (buttons, links): minimum 3:1 ratio against adjacent colors
- Use a contrast checker tool (browser extension or the `axe` DevTools extension) to verify

**Keyboard Navigation:**
- Tab key must navigate to all interactive elements in a logical order
- Focus ring must be visible on all focused elements (do NOT remove outline without replacement)
- Modal dialogs (cart drawer, preview modal, etc.) must trap focus within the modal while open
- Pressing Escape must close modals/drawers

**Screen Reader Support:**
- All images have `alt` attributes
- Decorative images use `alt=""` 
- Buttons with icons only (cart icon, close icon) must have `aria-label`
- Navigation landmark: header uses `<header>`, footer uses `<footer>`, main content uses `<main>`
- The `StorefrontHeader` mobile menu button has `aria-expanded` that updates when the drawer opens/closes

**Forms:**
- All inputs have associated `<label>` elements (or `aria-label`)
- Error messages are associated with inputs via `aria-describedby`
- Required fields have `required` attribute

**Motion:**
- The `AnnouncementBar` auto-rotation and the `Testimonials` carousel auto-play must respect `prefers-reduced-motion` CSS media query — pause all auto-advancing animations when the user has requested reduced motion

### 8.2 Automated Accessibility Testing

In Phase 10, add `@axe-core/react` as a dev dependency. In development mode, mount `axe` in the webstore layout's `useEffect` — it will log accessibility violations to the browser console.

This does not replace manual testing but catches the most common issues automatically during development.

---

## 9. Performance Audit

### 9.1 Lighthouse Targets

All public-facing storefront pages (home, product, collection, search) must score 90+ in the following Lighthouse categories:
- Performance
- Accessibility
- Best Practices
- SEO

These scores should be measured on the production build (not development) with production-level Next.js optimization.

### 9.2 Image Optimization

All storefront images must use Next.js's `<Image>` component (`next/image`) instead of raw `<img>` tags (except where explicitly noted for legacy compatibility). This provides:
- Automatic format conversion (WebP/AVIF)
- Responsive srcset generation
- Lazy loading by default
- Prevents Cumulative Layout Shift (CLS) via required `width`/`height` props

For user-uploaded product images stored in Django media, the image URL is fully external (Django static URL). Use `<Image unoptimized>` for external URLs not in the `next.config.ts` `images.domains` list OR add the Django media URL to `next.config.ts`'s `images.remotePatterns`.

**The `hero_banner` background image:** This is a CSS background-image, not a Next.js Image component. For the LCP (Largest Contentful Paint) hero image, add `fetchpriority="high"` as an inline style or use the `priority` prop on the `<Image>` component. For the hero section's background, consider using an `<Image>` component positioned absolutely with `object-fit: cover` instead of CSS `background-image` — this allows Next.js optimization.

### 9.3 JavaScript Bundle Analysis

Run `next build --analyze` (requires `@next/bundle-analyzer`) to identify large chunks. Common issues to check:
- Icon libraries imported wholesale (should use individual icon imports)
- Large block components imported into the server bundle unnecessarily
- The `CartDrawer` and interactive client components should be in the client bundle only

### 9.4 Core Web Vitals

**LCP (Largest Contentful Paint):** Target < 2.5 seconds. The hero image is typically the LCP element. Ensure it loads quickly by: using the `priority` prop, serving a correctly-sized image, and using Next.js image optimization.

**CLS (Cumulative Layout Shift):** Target < 0.1. Prevent layout shift by: always setting `width` and `height` on images, using CSS skeleton loaders while data loads, avoiding dynamically-inserted content above the fold.

**INP (Interaction to Next Paint):** Target < 200ms. The most common issue is heavy `onClick` handlers or state updates that block the main thread. Verify the "Add to Cart" button, variant picker, and cart drawer open/close all respond within this budget.

---

## 10. Mobile Polish

### 10.1 Responsive Design Sweep

Go through each storefront page on a 375px wide viewport (iPhone SE) and verify:
- No horizontal scrolling on any page
- Text is readable (minimum 16px font size for body text)
- Touch targets are at least 44×44px (buttons, links, swatches)
- The navigation menu collapses properly and the hamburger menu opens correctly
- Product cards in a 2-column grid are not too cramped
- The checkout multi-step form is usable on mobile

### 10.2 Touch Gesture Support

**Product Gallery (Phase 6 `ProductGallery.tsx`):** Enable touch swipe between images. Use CSS `scroll-snap` on the images container — this is a CSS-only solution with no JavaScript needed. Ensure smooth scrolling.

**AnnouncementBar with multiple announcements:** Touch-swipe to advance announcements manually.

### 10.3 Mobile Performance

On mobile, some desktop-only features should be disabled or deferred:
- Heavy hover effects (replace with active/tap states using `:active` pseudo-class)
- Auto-playing carousels (disabled by default, especially with `prefers-reduced-motion`)
- Large desktop-only images (ensure responsive images with `srcset` are serving appropriate sizes)

---

## 11. New Environment Variables

Document these new required variables in `backend/.env.example` and `frontend/.env.example`:

**Backend:**
- `NEXT_REVALIDATION_URL` — the Next.js server URL for revalidation calls (e.g., `http://localhost:3000` in dev)
- `REVALIDATION_SECRET` — shared secret between Next.js and Django for the revalidation route
- `PAYHERE_ENVIRONMENT` — `sandbox` or `production`

**Frontend:**
- `REVALIDATION_SECRET` — same as backend (verified by the Next.js revalidation route)
- `NEXT_PUBLIC_ANALYTICS_ENABLED` — `true` or `false`
- `NEXT_INTERNAL_API_URL` — internal URL for server-to-server API calls (e.g., `http://django:8000` in Docker, `http://localhost:8000` in local dev)

---

## 12. Final Verification Checklist

### Revalidation
- [ ] Publishing a theme config change causes the storefront home page to update within 5 seconds (not 60 seconds)
- [ ] `POST /api/revalidate` with wrong secret returns 401
- [ ] `POST /api/revalidate` with correct secret + valid tag returns 200 and the page cache is cleared

### Custom Domains
- [ ] Setting `storefront_domain = "www.custom.lk"` on a tenant's webstore works
- [ ] Requests to `www.custom.lk` resolve the correct tenant (with DNS pointing to the server)
- [ ] Domain resolution result is cached (second request doesn't hit the DB)

### Blog
- [ ] Creating and publishing a blog post in the admin shows it at `/blog/<handle>`
- [ ] Blog listing page shows all published posts
- [ ] Blog post detail page shows the full content

### Product Reviews
- [ ] A logged-in consumer can submit a review
- [ ] The review is NOT shown publicly until a store admin approves it
- [ ] Approving the review in the admin shows it on the product page
- [ ] Verified purchase badge appears for consumers who bought the product

### SEO
- [ ] `/sitemap.xml` returns valid XML with all published products, collections, and pages
- [ ] `/robots.txt` returns correct directives for a live enabled store
- [ ] Product page `<head>` contains `application/ld+json` structured data
- [ ] All pages have `<title>` and `<meta name="description">` tags

### Analytics
- [ ] Visiting the storefront home page in production mode sends a pageview event
- [ ] The analytics dashboard at `/store/webstore/analytics/` shows page view counts
- [ ] No analytics events are fired in development mode (unless `NEXT_PUBLIC_ANALYTICS_ENABLED = true`)

### Accessibility
- [ ] Tab navigation reaches all interactive elements on the home page
- [ ] The cart drawer can be opened and closed with keyboard only
- [ ] All product images have alt text
- [ ] No WCAG errors reported by `axe-core` in the browser console

### Performance
- [ ] Lighthouse Performance score ≥ 90 on the home page (production build)
- [ ] Lighthouse SEO score ≥ 90 on the product detail page
- [ ] No horizontal scrolling on 375px mobile viewport
- [ ] LCP < 2.5 seconds on the home page with the hero banner image

### Password Protection
- [ ] Enabling password protection on a store redirects visitors to the password page
- [ ] Entering the correct password sets the cookie and allows access
- [ ] Entering the wrong password shows an error
- [ ] Staff accessing `/store/*` are NOT affected by the password protection
