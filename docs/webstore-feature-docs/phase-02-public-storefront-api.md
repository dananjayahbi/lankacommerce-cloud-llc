# Phase 2: Public Storefront API (Backend)

**Phase:** 2 of 10  
**Depends on:** Phase 1 (all nine models must exist and be migrated)  
**Unlocks:** Phase 7 (Consumer Storefront Pages uses these endpoints)  
**Estimated Scope:** Backend only

---

## 1. Overview

This phase implements all **read-only, unauthenticated** API endpoints that power the consumer-facing storefront. No staff JWT is required for these endpoints — they are public by design, just like Shopify's Storefront API or any public e-commerce catalog.

The primary consumer of these endpoints will be the Next.js Server Components added in Phase 7. Every time a consumer browser loads a storefront page, the Next.js server calls one or more of these endpoints to fetch the theme configuration, product data, and content. Because these calls happen server-side, there are no CORS issues, but responses must still be fast (under 100ms for cached data) and include appropriate caching headers.

At the end of this phase, a developer must be able to visit `http://localhost:8000/api/webstore/public/test-business/config/` and receive a valid JSON response. All seven endpoint groups must be fully functional. A seed management command must exist that populates one default theme with a complete `default_config` and creates a sample `TenantWebstore` for the test tenant.

---

## 2. Existing Codebase Context

### 2.1 How Existing Public APIs Work

There are no other truly public (unauthenticated) API endpoints in this codebase. All existing DRF views require `IsAuthenticated`. The webstore public endpoints are the first ones without auth, so the pattern needs to be established correctly.

For these endpoints, use `permission_classes = [AllowAny]` from `rest_framework.permissions`. The tenant is not resolved from the JWT — it is resolved from the URL parameter `<slug>`.

### 2.2 Tenant Slug Resolution Pattern

Every public endpoint receives the tenant `slug` as a URL parameter (e.g., `/api/webstore/public/test-business/products/`). The service layer must:
1. Look up the `Tenant` by `slug`
2. Return 404 if the tenant does not exist
3. Check that `TenantWebstore.is_enabled = True` for the tenant
4. Return a specific response (see Section 7.3) if the webstore is not enabled

This lookup happens in every single public endpoint. Extract it into a reusable helper in the service layer (`storefront_service.py`) rather than repeating it in every view.

### 2.3 Existing Product/Catalog Models

Product data served to the storefront comes from the existing `apps.catalog` models:

- **`Product`** (`apps/catalog/models.py`): `tenant`, `name`, `slug` (used as the handle in URLs), `description`, `images` (JSONField), `category` (FK), `brand`, `is_active`, `is_published`
- **`ProductVariant`**: `product` (FK), `sku`, `price`, `compare_at_price`, `stock_quantity`, `attributes` (JSONField for color/size/etc.), `is_active`
- **`Category`**: `tenant`, `name`, `slug`, `parent` (FK, nullable for root categories)

The `slug` field on `Product` is what the storefront URL uses as the `handle` (e.g., `/products/<slug>`). This is consistent with Shopify's pattern.

**Do not create duplicate product data in the webstore app.** Webstore collections reference existing catalog products by their UUID (stored in `WebstoreCollection.manual_product_ids`).

### 2.4 Promotions Integration

The `apps.promotions` app contains discount/pricing logic. For Phase 2, include the `compare_at_price` field from `ProductVariant` in the API response so the storefront can show "Was / Now" pricing. Full promotions integration (discount codes) is a Phase 8 concern.

### 2.5 Existing Storage Pattern

Product images and other media files use the storage class at `apps/catalog/storage.py`. Image URLs are full absolute URLs already stored in database fields — the public API simply returns these URLs as-is.

---

## 3. File Structure for This Phase

Create or complete the following files:

| File | Status | Purpose |
|---|---|---|
| `backend/apps/webstore/views/public_views.py` | Create (replace 501 stubs) | All public endpoint views |
| `backend/apps/webstore/serializers/public_serializers.py` | Create | Serializers for public API responses |
| `backend/apps/webstore/services/storefront_service.py` | Create | Business logic for tenant resolution, product listing, collection resolution |
| `backend/apps/webstore/management/commands/seed_default_theme.py` | Create | Management command that creates the default theme and blocks seed data |
| `backend/tests/webstore/test_public_api.py` | Create | Test cases for all public endpoints |
| `backend/apps/webstore/urls.py` | Update | Replace 501 stubs with real view references for public routes |

---

## 4. Endpoint Specifications

All public endpoints are prefixed with `/api/webstore/public/<slug>/`. The `<slug>` URL parameter identifies the tenant.

### 4.1 `GET /api/webstore/public/<slug>/config/`

**Purpose:** The single most important public endpoint. Called by the Next.js storefront layout on every page render. Returns everything the storefront needs to render the theme: the active theme configuration, global webstore settings, and the store's published state.

**Response shape:**
- `is_enabled` — boolean: whether the webstore is live
- `is_password_protected` — boolean
- `store_settings` — object derived from `TenantWebstore`: SEO title, SEO description, social image, customer_accounts setting, cart_settings
- `theme_config` — the full `TenantThemeConfig.config` JSON for the ACTIVE config
- `theme` — basic theme info: name, slug, version, supported_sections

**When the tenant exists but `is_enabled = False`:** Return a response with `is_enabled: false` and minimal data. The Next.js component uses this to render a "Coming Soon" or "Store Offline" page.

**When the tenant does not exist:** Return 404 with `{"detail": "Store not found"}`.

**Caching behavior:** This endpoint's response should include `Cache-Control: public, max-age=60, stale-while-revalidate=300` headers. The Next.js fetch layer will respect these for ISR revalidation.

**Performance consideration:** This endpoint is called on every storefront page load. It must execute at most 2-3 database queries. Use `select_related("theme")` when fetching `TenantThemeConfig` to avoid N+1 issues.

### 4.2 `GET /api/webstore/public/<slug>/products/`

**Purpose:** Paginated product catalog for the storefront. Used by the search page, collection pages (when falling back from collection service), and direct product listing pages.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `collection` | string | — | Filter by collection handle |
| `sort` | string | "newest" | Sort order: newest, price_asc, price_desc, alpha_asc, alpha_desc, best_selling |
| `search` | string | — | Text search across name, description, SKU |
| `page` | integer | 1 | Pagination page number |
| `page_size` | integer | 24 | Products per page, max 48 |
| `min_price` | decimal | — | Minimum price filter |
| `max_price` | decimal | — | Maximum price filter |
| `category` | string | — | Filter by category slug |

**Filters applied always (regardless of query params):**
- `product.tenant = resolved_tenant`
- `product.is_active = True`
- `product.is_published = True`
- Product must have at least one active variant with `stock_quantity > 0` OR the store is set to show out-of-stock products

**Response shape:**
- `products` — array of product summary objects
- `meta` — pagination metadata: `total`, `page`, `page_size`, `total_pages`, `has_next`, `has_prev`

**Product summary object fields:** `id`, `title`, `handle` (= slug), `featured_image_url`, `price_range` (min/max from variants), `compare_at_price_range` (for sale badges), `variant_count`, `available` (boolean: any in-stock variant exists), `category` (name + slug), `tags` (array of strings)

### 4.3 `GET /api/webstore/public/<slug>/products/<handle>/`

**Purpose:** Full product detail for the product page. Includes all variants, all images, and inventory availability per variant.

**Response fields:** All product summary fields plus:
- `description` — full product description text
- `images` — ordered array of `{url, alt}` objects
- `variants` — full array of variant objects
- `options` — extracted from variants: `[{name: "Color", values: ["Red", "Blue", "Green"]}, {name: "Size", values: ["S", "M", "L"]}]` — used by the variant picker UI
- `related_products` — up to 4 products from the same category (brief summary only)
- `seo_title`, `seo_description` — for Next.js `generateMetadata()`

**Variant object fields:** `id`, `title` (human-readable combination, e.g., "Red / L"), `sku`, `price`, `compare_at_price`, `stock_quantity`, `is_available` (stock_quantity > 0), `attributes` (e.g., `{color: "Red", size: "L"}`)

**404 case:** Return 404 if the product does not exist, does not belong to this tenant, or `is_published = False`.

### 4.4 `GET /api/webstore/public/<slug>/collections/`

**Purpose:** Lists all published collections for the storefront. Used by the "Collections" page and the header navigation.

**Response:** Array of collection summary objects: `id`, `title`, `handle`, `description` (first 150 chars), `image_url`, `product_count` (computed), `is_published`

**Filtering:** Only return collections where `is_published = True` and `tenant = resolved_tenant`.

### 4.5 `GET /api/webstore/public/<slug>/collections/<handle>/`

**Purpose:** Collection detail page. Returns collection metadata AND the resolved product list for that collection.

**Response:**
- `collection` — full collection object: `id`, `title`, `handle`, `description`, `image_url`, `seo_title`, `seo_description`
- `products` — paginated list of products in this collection (same shape as endpoint 4.2, with same sort/page query params)
- `meta` — pagination metadata

**Collection resolution logic (the service layer's core responsibility):**

For **manual** collections: Fetch products whose UUIDs are in `WebstoreCollection.manual_product_ids`. Maintain the order specified in `manual_product_ids` when sort_order_type is "manual".

For **automated** collections: Apply the `filter_rules` to dynamically query products from `apps.catalog.Product`. Each rule translates to a Django ORM filter:

| Rule Field | Rule Relation | Django ORM Equivalent |
|---|---|---|
| `tag` | `contains` | Filter on a tags JSONField or a related tags model |
| `vendor` | `equals` | `product__vendor__iexact=value` |
| `product_type` | `equals` | `product__product_type__iexact=value` |
| `price` | `greater_than` | `variants__price__gt=value` |
| `price` | `less_than` | `variants__price__lt=value` |
| `category` | `equals` | `product__category__slug=value` |

If `filter_conjunction = "AND"`, all rules must apply (chain `.filter()` calls). If `filter_conjunction = "OR"`, use Django `Q` objects with `|` operator.

**Important:** After applying sort and filters, always re-apply the base product filters (`is_active=True`, `is_published=True`, `tenant=tenant`) to prevent deleted or unpublished products from appearing.

### 4.6 `GET /api/webstore/public/<slug>/pages/<handle>/`

**Purpose:** Fetches a single static page by its handle for the `/pages/<handle>` route.

**Response:** `id`, `title`, `handle`, `body_html`, `seo_title`, `seo_description`, `updated_at`

**404 case:** Return 404 if the page does not exist, does not belong to this tenant, or `is_published = False`.

**Security note:** The `body_html` field is returned directly in the response. It was sanitized with `bleach` on write (Phase 1 note). Never re-sanitize on read — doing so risks double-encoding entities.

### 4.7 `GET /api/webstore/public/<slug>/menus/<handle>/`

**Purpose:** Returns a navigation menu by its handle. Called by the `StorefrontHeader` and `StorefrontFooter` components.

**Response:** `id`, `title`, `handle`, `items` (the full tree-structured array)

**The `items` array must be returned as stored** — do not expand resource_ids to full objects at this stage. The frontend resolves the URLs from the stored `url` property in each item.

**Common handles the theme expects:** `"main-menu"` for header, `"footer"` for footer. If no menu exists for the requested handle, return 404 — the frontend shows the storefront without a menu gracefully.

### 4.8 `GET /api/webstore/public/<slug>/search/?q=<query>`

**Purpose:** Full-text product search. Used by the search bar and search results page.

**Query parameters:** `q` (required), `page`, `page_size`, `sort`

**Search behavior:**
- Search across: `Product.name`, `Product.description`, `ProductVariant.sku`
- Use Django's `__icontains` for SQLite (dev). In production PostgreSQL, this can be upgraded to `SearchVector` + `SearchQuery` for ranked results.
- Apply the standard base filters: active, published, correct tenant
- Return same product summary shape as endpoint 4.2

**When `q` is missing or empty:** Return 400 with `{"detail": "Search query is required"}`.

**When no results:** Return `{"products": [], "meta": {...total: 0...}}` — never 404 for empty search results.

---

## 5. Serializer Design

Create `backend/apps/webstore/serializers/public_serializers.py`.

**Serializer naming convention:**

| Serializer | Fields |
|---|---|
| `PublicProductSummarySerializer` | id, title, handle, featured_image_url, price_range, compare_at_price_range, variant_count, available, category, tags |
| `PublicProductDetailSerializer` | All summary fields + description, images, variants, options, seo_title, seo_description |
| `PublicVariantSerializer` | id, title, sku, price, compare_at_price, stock_quantity, is_available, attributes |
| `PublicCollectionSummarySerializer` | id, title, handle, description (truncated), image_url, product_count |
| `PublicCollectionDetailSerializer` | All summary fields + full description, seo_title, seo_description |
| `PublicMenuSerializer` | id, title, handle, items |
| `PublicPageSerializer` | id, title, handle, body_html, seo_title, seo_description, updated_at |
| `PublicStoreConfigSerializer` | is_enabled, is_password_protected, store_settings, theme_config, theme |

**`price_range` field:** This is a computed field (use `SerializerMethodField`). It returns an object with `min` and `max` — the minimum and maximum prices across all active variants of the product.

**`available` field:** Another computed field. Returns `True` if at least one active variant has `stock_quantity > 0`.

**`options` field on ProductDetailSerializer:** Computed from variants. Iterate all variants, extract unique attribute keys and their unique values. Return as `[{name: "Color", values: ["Red", "Blue"]}, ...]`.

---

## 6. Service Layer

Create `backend/apps/webstore/services/storefront_service.py`.

### 6.1 `resolve_tenant(slug)` → Tenant or raise 404

Accepts a slug string. Returns the `Tenant` instance if active, raises `Http404` if not found or if the tenant's `status` is `SUSPENDED` or `CANCELLED`.

### 6.2 `get_active_store_config(tenant)` → dict

Returns a dictionary with:
- The `TenantWebstore` instance for the tenant (creating a disabled one if it doesn't exist yet — this is a safe fallback for tenants who haven't set up their webstore)
- The `TenantThemeConfig` where `status = ACTIVE` and `tenant = tenant`
- Falls back to the default theme's `default_config` if no ACTIVE config exists for this tenant

### 6.3 `get_storefront_products(tenant, **filters)` → queryset

Encapsulates the logic for building a filtered, sorted, paginated product queryset for the storefront. Accepts filter parameters matching the API query params.

### 6.4 `resolve_collection_products(collection, page, page_size, sort)` → paginated products

Handles both manual and automated collection types. For manual: returns products in the specified order. For automated: applies filter rules. Always applies base filters and pagination.

### 6.5 `get_default_theme()` → WebstoreTheme

Returns the `WebstoreTheme` where `is_default = True`. Used as the fallback theme config for tenants who haven't customized their theme yet.

---

## 7. Edge Cases and Error Handling

### 7.1 Tenant Not Found
All public endpoints: return 404 with `{"detail": "Store not found"}` — not `{"detail": "Not found."}` (the default DRF message). Use a custom message to make debugging easier.

### 7.2 Store Disabled but Tenant Exists
When `TenantWebstore.is_enabled = False`, return HTTP 200 with `{"is_enabled": false}` on the `/config/` endpoint. Other endpoints (products, collections, etc.) return 404 in this case — if the store is not enabled, its catalog should not be accessible.

### 7.3 Password-Protected Store
When `is_password_protected = True`, the config endpoint returns the flag. Individual product/collection/page endpoints must also check this flag and return 403 if the request does not include the store password (via a `X-Store-Password` header or a cookie). The password check logic in Phase 10 will be more complete — for now, implement the basic check.

### 7.4 No Active Theme Config
If a tenant has no `ACTIVE` `TenantThemeConfig`, fall back to the platform default theme's `default_config`. Never return a 500 — the storefront must always render something meaningful.

### 7.5 Product Out of Stock
Include out-of-stock products in all listings. The `available` boolean flag indicates stock status. The frontend decides whether to show an "Out of Stock" label or hide the product (configurable via theme settings). The API does not filter these out.

---

## 8. Seed Data Management Command

Create `backend/apps/webstore/management/commands/seed_default_theme.py`.

This command must be idempotent (safe to run multiple times). It should:

1. Create (or update) one `WebstoreTheme` record:
   - `slug = "default"`, `is_default = True`, `is_free = True`, `is_published = True`
   - `name = "Default Theme"`
   - `category = GENERAL`
   - `supported_sections` — array including all block types from the `BlockType` enum
   - `default_config` — a complete, valid JSON matching the `TenantThemeConfig.config` schema described in Section 4.7 of Phase 1. This must include working defaults for the "index" template with at least: a hero_banner section and a featured_collection section.
   - `global_settings_schema` — at minimum: primary color, secondary color, background color, text color, heading font, body font

2. Create one `WebstoreBlock` record for each `BlockType` value — just the header metadata for now (the full schemas are defined in Phase 6). For this phase, each block's `schema` can be an empty array — that's fine.

3. For the test tenant (`slug = "test-business"`): create a `TenantWebstore` record with `is_enabled = True` and a `TenantThemeConfig` with `status = ACTIVE` using the default theme's `default_config`. This lets Phase 7 be developed immediately.

**Usage:**
```
python manage.py seed_default_theme
```

---

## 9. Test Cases

Create `backend/tests/webstore/test_public_api.py`. Write tests for:

### 9.1 Config Endpoint
- Returns 200 with `is_enabled: true` for an active tenant with webstore enabled
- Returns 200 with `is_enabled: false` for a tenant with webstore disabled
- Returns 404 for a nonexistent slug

### 9.2 Products Endpoint
- Returns paginated products for a valid tenant
- Filters correctly by `collection` param
- `search` param returns only matching products
- `sort=price_asc` returns products in ascending price order
- Does NOT return `is_published=False` products
- Returns 404 for a nonexistent tenant slug

### 9.3 Product Detail Endpoint
- Returns full product with variants for a valid handle
- Returns 404 for a nonexistent handle
- Returns 404 for an unpublished product

### 9.4 Collection Endpoint
- Manual collection returns products in specified order
- Automated collection with tag rule returns matching products only
- Returns 404 for nonexistent collection handle

### 9.5 Search Endpoint
- Returns products matching the `q` param
- Returns 400 when `q` is missing
- Returns empty results (not error) when no products match

---

## 10. Performance Requirements

These endpoints are on the hot path for every storefront page load. The following performance constraints must be met:

| Endpoint | Max DB Queries | Target Response Time |
|---|---|---|
| `/config/` | ≤ 3 | < 50ms |
| `/products/` | ≤ 4 | < 100ms |
| `/products/<handle>/` | ≤ 4 | < 80ms |
| `/collections/<handle>/` | ≤ 5 | < 120ms |
| `/search/` | ≤ 3 | < 150ms |

Use Django's `select_related()` and `prefetch_related()` to minimize database round-trips. Use `only()` or `defer()` to avoid fetching large text fields when only summaries are needed.

**Django Debug Toolbar** is installed in development (check `requirements/development.txt`). Use it to verify query counts during development.

---

## 11. Verification Checklist

- [ ] `GET /api/webstore/public/test-business/config/` returns valid JSON with `is_enabled: true`
- [ ] `GET /api/webstore/public/test-business/products/` returns a paginated list of products
- [ ] `GET /api/webstore/public/test-business/products/<valid-handle>/` returns product detail
- [ ] `GET /api/webstore/public/nonexistent-slug/config/` returns 404
- [ ] `GET /api/webstore/public/test-business/search/?q=shirt` returns relevant products
- [ ] `python manage.py seed_default_theme` runs without errors
- [ ] `python manage.py seed_default_theme` is idempotent (safe to run twice)
- [ ] All test cases in `test_public_api.py` pass
- [ ] No `N+1` query issues detected with Django Debug Toolbar
