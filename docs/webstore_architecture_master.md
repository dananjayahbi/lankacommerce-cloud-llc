# LankaCommerce Webstore & Theme Engine — Master Architecture Document

**Version:** 1.0  
**Status:** Master Reference for Implementation  
**Target Phases:** 10 (each phase gets its own implementation document derived from this one)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System Context](#2-current-system-context)
3. [Full Architecture Diagram](#3-full-architecture-diagram)
4. [URL & Routing Architecture](#4-url--routing-architecture)
5. [Backend Data Models](#5-backend-data-models)
6. [Backend API Endpoints](#6-backend-api-endpoints)
7. [Frontend App Structure](#7-frontend-app-structure)
8. [Theme Engine Deep Dive](#8-theme-engine-deep-dive)
9. [Visual Theme Customizer](#9-visual-theme-customizer)
10. [Block & Section Library Specification](#10-block--section-library-specification)
11. [Subscription Feature Gating](#11-subscription-feature-gating)
12. [Custom Domain Routing](#12-custom-domain-routing)
13. [Performance & Caching Strategy](#13-performance--caching-strategy)
14. [Phase Breakdown (10 Phases)](#14-phase-breakdown-10-phases)

---

## 1. Executive Summary

LankaCommerce needs a **consumer-facing e-commerce webstore** as the product's flagship differentiating feature. No competing POS/ERP system in Sri Lanka offers a zero-code, theme-based webstore that is natively integrated with inventory, pricing, promotions, and customer data.

The goal is to build a system architecturally equivalent to **Shopify Online Store 2.0**: schema-driven sections, drag-and-drop blocks, a live visual customizer, a theme marketplace, and full subscription gating — all operating natively within the existing multi-tenant Django + Next.js infrastructure.

### Core Design Principles

1. **Tenant-isolated** — every webstore is scoped to a single tenant; no data bleeds across tenants.
2. **Schema-driven** — every visual block declares its own settings schema; the customizer UI is auto-generated from that schema.
3. **SSR-first** — storefront pages are server-rendered for SEO and performance; no client-only rendering for public pages.
4. **Config-over-code** — merchant customizations are stored as JSON config documents, not code; no merchant ever writes code.
5. **Subscription-gated** — the entire webstore feature is invisible to tenants whose plan does not include `"webstore": true`.
6. **Zero disruption** — the webstore runs on the same subdomain as the existing admin dashboard; routing is path-based (`/` → webstore, `/store/*` → admin).

---

## 2. Current System Context

> **CRITICAL FOR IMPLEMENTORS:** This section describes the existing production codebase. All new code must integrate with these systems exactly as described.

### 2.1 Backend Stack

| Item | Value |
|------|-------|
| Framework | Django 6.0 + Django REST Framework |
| Auth | SimpleJWT (access token: 15 min, refresh: 7 days) |
| Database | SQLite (dev) / PostgreSQL (prod-ready) |
| File Storage | `apps/catalog/storage.py` (local dev / S3-compatible) |
| Task Queue | Not yet integrated (Celery planned) |
| Config | `python-decouple` via `.env` |

**Installed Django Apps (existing):**
```
apps.core, apps.accounts, apps.tenants, apps.catalog, apps.notifications,
apps.pos, apps.crm, apps.hr, apps.promotions, apps.audit, apps.hardware,
apps.reports, apps.billing, apps.webhooks, apps.health
```

**New app to create:** `apps.webstore`

### 2.2 Key Existing Models

**`apps.tenants.Tenant`** — the central multi-tenancy model:
```python
id: UUIDField (PK)
name: CharField
slug: SlugField (unique)          # used as subdomain: <slug>.lankacommerce.com
logo_url: URLField
status: CharField                 # ACTIVE | GRACE_PERIOD | SUSPENDED | CANCELLED
subscription_status: CharField    # TRIAL | ACTIVE | PAST_DUE | SUSPENDED | CANCELLED
custom_domain: CharField          # e.g. "lankanbites.com" — custom domain mapping
settings: JSONField               # {currency, timezone, vatRate, ssclRate, receiptFooter}
deleted_at: DateTimeField         # soft-delete
```

**`apps.tenants.Plan`** — subscription tiers:
```python
id: UUIDField
name: CharField
price_monthly: DecimalField
features: JSONField               # [{"id": "webstore", "enabled": true}, ...]
is_active: BooleanField
sort_order: IntegerField
```

**`apps.tenants.Subscription`** — links tenant to plan:
```python
tenant: FK(Tenant)
plan: FK(Plan)
status: CharField
current_period_end: DateTimeField
```

**`apps.accounts.CustomUser`** — platform users:
```python
id: UUIDField
email: EmailField
role: CharField           # SUPER_ADMIN | OWNER | MANAGER | CASHIER | STOCK_CLERK
permissions_list: JSONField
tenant: FK(Tenant)        # null for SUPER_ADMIN
pin_hash: CharField
session_version: IntegerField
```

**`apps.catalog.Product`** and **`apps.catalog.ProductVariant`** — inventory items:
```python
# Product has: tenant FK, name, description, sku, category, brand, images, etc.
# ProductVariant has: product FK, sku, price, stock_quantity, attributes (color/size/etc.)
```

**`apps.catalog.Category`** — product categories (tenant-scoped, tree structure via `parent` FK).

**`apps.promotions`** — discount codes, price rules, automatic promotions.

### 2.3 Frontend Stack

| Item | Value |
|------|-------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (`useAuthStore`) |
| Forms | React Hook Form + Zod v4 |
| Auth | JWT in httpOnly cookies, verified by `jose` in middleware |
| Package Manager | pnpm |

**Current Next.js Route Groups:**
```
src/app/
  (auth)/          # /login, /register, /pin-login, /forgot-password
  (public)/        # marketing landing page
  (store)/         # /store/** — tenant admin dashboard (auth required)
  (superadmin)/    # /superadmin/** — platform admin (SUPER_ADMIN role only)
  api/             # /api/auth/* — Next.js API routes for token management
```

**Current Middleware (`src/middleware.ts`):** 
- Detects subdomain from hostname (e.g., `test-business.localhost` → `test-business`)
- Verifies JWT from `access_token` cookie using `jose`
- Sets request headers: `x-user-id`, `x-user-role`, `x-user-email`, `x-tenant-id`, `x-tenant-slug`
- Enforces role guards for `/store/*` routes
- Handles grace period for past-due subscriptions

### 2.4 Current URL Behavior (Pre-Webstore)

```
Main domain (localhost:3000):
  /                     → Marketing landing page
  /register             → Business self-registration
  /login                → SuperAdmin login
  /superadmin/dashboard → SuperAdmin panel

Tenant subdomain (<slug>.localhost:3000):
  /                     → Redirects to /login (if not auth) or /store/dashboard (if auth)
  /login                → Tenant-branded staff login
  /store/dashboard      → Store admin dashboard
  /store/pos            → Point of Sale terminal
  /store/inventory      → Inventory management
  /store/settings       → Store settings
  ... etc.
```

---

## 3. Full Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                         LANKACOMMERCE WEBSTORE SYSTEM                                ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐    ║
║  │                    SUPER-ADMIN LAYER (platform.lankacommerce.com)           │    ║
║  │                                                                             │    ║
║  │  ┌──────────────────────┐    ┌──────────────────────────────────────────┐   │    ║
║  │  │  Theme Store Manager │    │   Block Library Manager                  │   │    ║
║  │  │  (Next.js Admin UI)  │    │   (Next.js Admin UI)                     │   │    ║
║  │  │                      │    │                                          │   │    ║
║  │  │  • Upload themes     │    │  • Define block schemas (JSON)           │   │    ║
║  │  │  • Set pricing       │    │  • Categorize: Free / Premium            │   │    ║
║  │  │  • Publish/unpublish │    │  • Upload preview images                 │   │    ║
║  │  │  • Version control   │    │  • Tag block types                       │   │    ║
║  │  └──────────┬───────────┘    └──────────────────┬───────────────────────┘   │    ║
║  │             │                                   │                           │    ║
║  │             └──────────────────┬────────────────┘                           │    ║
║  │                                ▼                                            │    ║
║  │              ┌─────────────────────────────────────┐                        │    ║
║  │              │   Django API: /api/webstore/admin/   │                        │    ║
║  │              │   (SUPER_ADMIN auth required)        │                        │    ║
║  │              └─────────────────────────────────────┘                        │    ║
║  └─────────────────────────────────────────────────────────────────────────────┘    ║
║                                        │                                            ║
║                                        │  Writes to DB                              ║
║                                        ▼                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐    ║
║  │                        CORE DATABASE (PostgreSQL)                           │    ║
║  │                                                                             │    ║
║  │  webstore_theme         webstore_block          tenant_webstore             │    ║
║  │  ─────────────          ──────────────          ───────────────             │    ║
║  │  id, name, version      id, type, name          id, tenant_id               │    ║
║  │  preview_image_url      schema (JSON)           is_enabled                  │    ║
║  │  default_config (JSON)  is_premium              custom_domain               │    ║
║  │  category               react_component_key     seo_settings (JSON)         │    ║
║  │  is_free, price         preview_image_url       password_protection         │    ║
║  │  is_published           version                 cart_settings (JSON)        │    ║
║  │                                                                             │    ║
║  │  tenant_theme_config    webstore_menu           webstore_collection         │    ║
║  │  ────────────────────   ─────────────           ───────────────────         │    ║
║  │  id, tenant_id          id, tenant_id           id, tenant_id               │    ║
║  │  theme_id               title, handle           title, handle               │    ║
║  │  status (active/draft)  items (JSON)            product filter rules        │    ║
║  │  global_settings (JSON) location (header/footer) sort_order                 │    ║
║  │  layout (JSON)                                                              │    ║
║  │  templates (JSON)                                                           │    ║
║  │  purchased_blocks (JSON)                                                    │    ║
║  └─────────────────────────────────────────────────────────────────────────────┘    ║
║                   │                          │                                       ║
║        ┌──────────┘                          └──────────────┐                        ║
║        ▼                                                    ▼                        ║
║  ┌──────────────────────────────┐    ┌─────────────────────────────────────────┐    ║
║  │  TENANT ADMIN PANEL          │    │  CONSUMER STOREFRONT (SSR Engine)       │    ║
║  │  <slug>.domain.com/store/    │    │  <slug>.domain.com/  (webstore)         │    ║
║  │                              │    │                                         │    ║
║  │  ┌──────────────────────┐    │    │  Next.js Server Components:             │    ║
║  │  │  Theme Customizer    │    │    │  • StorefrontLayout (layout.tsx)        │    ║
║  │  │  /store/webstore/    │    │    │  • HomePage (page.tsx)                  │    ║
║  │  │  customize           │    │    │  • ProductPage ([handle]/page.tsx)      │    ║
║  │  │                      │    │    │  • CollectionPage                       │    ║
║  │  │  ┌────────┐ ┌──────┐ │    │    │  • CartPage                             │    ║
║  │  │  │Sidebar │ │iFrame│ │    │    │  • SearchPage                           │    ║
║  │  │  │Editor  │ │Prev. │ │    │    │                                         │    ║
║  │  │  └────────┘ └──────┘ │    │    │  ThemeRenderer (resolves JSON→React):   │    ║
║  │  └──────────────────────┘    │    │  1. Read active TenantThemeConfig       │    ║
║  │                              │    │  2. Load template for current page      │    ║
║  │  Webstore Settings:          │    │  3. Resolve section types to components │    ║
║  │  • Domain mapping            │    │  4. Inject merchant settings values     │    ║
║  │  • SEO settings              │    │  5. Merge with block schema defaults    │    ║
║  │  • Navigation menus          │    │  6. Hydrate with live catalog data      │    ║
║  │  • Collections               │    │  7. Stream HTML to browser              │    ║
║  │  • Store password            │    │                                         │    ║
║  │  • Checkout settings         │    │  React Component Registry:              │    ║
║  └──────────────────────────────┘    │  HeroBanner, FeaturedCollection,        │    ║
║                                      │  ProductGrid, Testimonials, etc.        │    ║
║                                      └─────────────────────────────────────────┘    ║
║                                                         │                            ║
║                                                         ▼                            ║
║                                           ┌───────────────────────┐                  ║
║                                           │   END CONSUMER        │                  ║
║                                           │   (Browser / Mobile)  │                  ║
║                                           └───────────────────────┘                  ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

### Theme Customizer Detailed Flow:

```
┌──────────────────────────────────────────────────────────────────────┐
│                  VISUAL THEME CUSTOMIZER (Browser)                   │
│              /store/webstore/customize  (authenticated)              │
│                                                                      │
│  ┌───────────────────────────────┐  ┌──────────────────────────────┐ │
│  │   CUSTOMIZER SIDEBAR (React)  │  │   LIVE PREVIEW (iFrame)      │ │
│  │   (Parent Frame)              │  │   (Child Frame)              │ │
│  │                               │  │                              │ │
│  │  ◉ Pages:                     │  │  ┌────────────────────────┐  │ │
│  │    • Home                     │  │  │ [HEADER]               │  │ │
│  │    • Product                  │  │  │ ┌──────────────────┐   │  │ │
│  │    • Collection               │  │  │ │  HERO BANNER     │   │  │ │
│  │    • Cart                     │  │  │ │  (live preview)  │   │  │ │
│  │                               │  │  │ └──────────────────┘   │  │ │
│  │  ◉ Theme Settings:            │  │  │ ┌──────────────────┐   │  │ │
│  │    • Colors                   │  │  │ │ FEATURED COLLECT │   │  │ │
│  │    • Typography               │  │  │ │  (live preview)  │   │  │ │
│  │    • Layout                   │  │  │ └──────────────────┘   │  │ │
│  │                               │  │  │ [FOOTER]               │  │ │
│  │  ◉ Sections (draggable):      │  │  └────────────────────────┘  │ │
│  │    ▲ [Hero Banner]            │  │                              │ │
│  │    ▼ [Featured Collection]    │  │  URL: /webstore-preview/home │ │
│  │    + Add Section              │  │                              │ │
│  │                               │  └──────────────────────────────┘ │
│  │  ◉ Selected Section Settings: │              ▲                    │
│  │    Background Image [upload]  │              │ postMessage        │
│  │    Overlay Opacity [slider]   │              │ {type, sectionId,  │
│  │    Text Alignment [select]    │──────────────┘  updatedConfig}    │
│  │                               │                                   │
│  │  [Save Draft] [Publish Live]  │                                   │
│  └───────────────────────────────┘                                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. URL & Routing Architecture

### 4.1 Complete URL Map (After Webstore Implementation)

```
MAIN DOMAIN (localhost:3000 / lankacommerce.com):
  /                           → Marketing landing page (unchanged)
  /register                   → Business self-registration (unchanged)
  /login                      → SuperAdmin login (unchanged)
  /superadmin/*               → SuperAdmin dashboard (unchanged)

TENANT SUBDOMAIN (<slug>.localhost:3000 / <slug>.lankacommerce.com):

  PUBLIC WEBSTORE (no auth required, consumer-facing):
  /                           → Webstore home page (ThemeRenderer: "index" template)
  /products/<handle>          → Product detail page (ThemeRenderer: "product" template)
  /collections/<handle>       → Product collection page (ThemeRenderer: "collection" template)
  /collections                → All collections page
  /search                     → Search results page
  /cart                       → Shopping cart (client-side, Zustand-persisted)
  /checkout                   → Checkout flow (multi-step)
  /checkout/success           → Order confirmation page
  /account/login              → Consumer account login (SEPARATE from staff login)
  /account/register           → Consumer account registration
  /account/                   → Consumer account dashboard
  /account/orders             → Order history
  /pages/<handle>             → Custom merchant-created pages (e.g., /pages/about-us)

  TENANT STAFF (auth required):
  /login                      → Staff login (unchanged — only for staff, not consumers)
  /pin-login                  → PIN-based staff login (unchanged)
  /store/dashboard            → Admin dashboard (unchanged)
  /store/pos                  → POS terminal (unchanged)
  /store/inventory            → Inventory management (unchanged)
  /store/webstore             → Webstore management hub (NEW)
  /store/webstore/customize   → Visual theme editor (NEW — full screen)
  /store/webstore/themes      → Theme store browser (NEW)
  /store/webstore/menus       → Navigation menu editor (NEW)
  /store/webstore/pages       → Custom pages management (NEW)
  /store/webstore/collections → Webstore collections (NEW)
  /store/webstore/settings    → SEO, domain, checkout settings (NEW)

  INTERNAL (not user-facing):
  /webstore-preview/*         → iFrame sandbox for theme preview (requires same-origin)
```

### 4.2 Middleware Updates Required

The existing `src/middleware.ts` must be updated to handle the new routing logic:

```typescript
// NEW LOGIC to add to middleware:

// If on a tenant subdomain AND path is a webstore public route:
// → Check if tenant has webstore feature enabled
// → If NOT enabled: serve a "webstore not available" page
// → If enabled: pass through to (webstore) route group

// Webstore public routes (no JWT required):
const WEBSTORE_PUBLIC_ROUTES = [
  "/products",
  "/collections",
  "/search",
  "/cart",
  "/checkout",
  "/account",
  "/pages",
];

// webstore-preview is authenticated via same-session cookie
const WEBSTORE_PREVIEW_PREFIX = "/webstore-preview";

// Detection logic in middleware:
// if (subdomain) {
//   if (!pathname.startsWith("/store") &&
//       !pathname.startsWith("/login") &&
//       !pathname.startsWith("/pin-login") &&
//       pathname !== "/" ||  isWesbstorePublicPath(pathname)) {
//     → Route to webstore
//     → Check feature flag
//   }
// }
```

**Key rule:** On a tenant subdomain, any path that is NOT `/store/*`, `/login`, `/pin-login`, `/suspended`, `/api/*` is treated as a webstore consumer route.

### 4.3 How Webstore Feature is Checked

The middleware reads the feature flag from the JWT for authenticated users. For consumer (unauthenticated) webstore visitors, the check happens in the Next.js page component:

```
Consumer visits <slug>.lankacommerce.com/products/blue-shirt
  ↓
Middleware: no JWT cookie → is webstore public route → pass through
  ↓
Next.js (webstore)/products/[handle]/page.tsx (Server Component)
  ↓
Server Component: fetch GET /api/webstore/tenant-config/?slug=<slug>
  ↓
API checks: tenant exists? webstore enabled? subscription active?
  ↓
If NO: render "coming soon" / "store offline" page
If YES: render themed product page
```

---

## 5. Backend Data Models

### 5.1 New Django App: `apps.webstore`

Create this app at `backend/apps/webstore/`. Add `"apps.webstore"` to `INSTALLED_APPS` in `config/settings/base.py`.

### 5.2 Complete Model Definitions

```python
# apps/webstore/models.py

import uuid
from django.db import models


# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM-LEVEL MODELS (managed by SuperAdmin)
# ─────────────────────────────────────────────────────────────────────────────

class ThemeCategory(models.TextChoices):
    GENERAL    = "GENERAL",    "General"
    FASHION    = "FASHION",    "Fashion & Apparel"
    FOOD       = "FOOD",       "Food & Beverage"
    ELECTRONICS= "ELECTRONICS","Electronics"
    BEAUTY     = "BEAUTY",     "Beauty & Health"
    FURNITURE  = "FURNITURE",  "Furniture & Home"
    JEWELLERY  = "JEWELLERY",  "Jewellery"


class WebstoreTheme(models.Model):
    """
    Platform-level theme definition. Managed by SuperAdmins.
    Merchants purchase/activate these themes for their storefront.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=100)           # "Dawn Lanka"
    slug                = models.SlugField(max_length=100, unique=True)  # "dawn-lanka"
    description         = models.TextField(blank=True)
    category            = models.CharField(max_length=20, choices=ThemeCategory.choices, default=ThemeCategory.GENERAL)
    version             = models.CharField(max_length=20, default="1.0.0")  # semver
    preview_image_url   = models.URLField(blank=True)               # Cover screenshot
    preview_images      = models.JSONField(default=list)            # [{"url": ..., "label": "Home"}]
    author              = models.CharField(max_length=100, default="LankaCommerce")
    is_free             = models.BooleanField(default=True)
    price_lkr           = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # 0 if free
    is_published        = models.BooleanField(default=False)        # visible in theme store
    is_default          = models.BooleanField(default=False)        # auto-applied on registration
    
    # The JSON config skeleton that every new tenant installation starts from.
    # This is the "source of truth" for the theme's default layout.
    # Structure mirrors TenantThemeConfig.config (see below).
    default_config      = models.JSONField(default=dict)

    # All section types this theme supports (array of section type strings)
    # e.g., ["hero_banner", "featured_collection", "rich_text", "image_with_text"]
    supported_sections  = models.JSONField(default=list)

    # Global settings schema: declares color pickers, font selectors, etc.
    # Array of {id, type, label, default, ...} objects
    global_settings_schema = models.JSONField(default=list)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_theme"
        ordering = ["-is_default", "-is_free", "name"]

    def __str__(self):
        return f"{self.name} v{self.version}"


class BlockType(models.TextChoices):
    # Layout
    HEADER             = "header",              "Header"
    FOOTER             = "footer",              "Footer"
    ANNOUNCEMENT_BAR   = "announcement_bar",    "Announcement Bar"
    
    # Homepage sections
    HERO_BANNER        = "hero_banner",         "Hero Banner"
    FEATURED_COLLECTION= "featured_collection", "Featured Collection"
    IMAGE_WITH_TEXT    = "image_with_text",     "Image with Text"
    RICH_TEXT          = "rich_text",           "Rich Text"
    TESTIMONIALS       = "testimonials",        "Testimonials"
    NEWSLETTER_SIGNUP  = "newsletter_signup",   "Newsletter Signup"
    COLLECTION_LIST    = "collection_list",     "Collection List"
    SLIDESHOW          = "slideshow",           "Slideshow"
    VIDEO              = "video",              "Video"
    COUNTDOWN_TIMER    = "countdown_timer",     "Countdown Timer"
    CUSTOM_HTML        = "custom_html",         "Custom HTML"
    
    # Product pages
    PRODUCT_DETAIL     = "product_detail",      "Product Detail (Main)"
    PRODUCT_RECOMMENDATIONS = "product_recommendations", "Product Recommendations"
    PRODUCT_REVIEWS    = "product_reviews",     "Product Reviews"
    
    # Collection pages
    COLLECTION_HEADER  = "collection_header",   "Collection Header"
    PRODUCT_GRID       = "product_grid",        "Product Grid"
    COLLECTION_FILTERS = "collection_filters",  "Collection Filters"
    
    # Cart
    CART_ITEMS         = "cart_items",          "Cart Items"
    CART_SUMMARY       = "cart_summary",        "Cart Summary"


class WebstoreBlock(models.Model):
    """
    Platform-level block definition. Each block is a reusable UI component
    that merchants can add to their storefront pages.
    
    The 'schema' field defines what settings the merchant can configure.
    The 'react_component_key' links to the frontend component registry.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type                = models.CharField(max_length=50, choices=BlockType.choices, unique=True)
    name                = models.CharField(max_length=100)          # "Hero Banner"
    description         = models.TextField(blank=True)
    
    # The JSON schema defining all configurable settings.
    # Array of setting objects: [{id, type, label, default, min, max, options, ...}]
    # Setting types: text | textarea | richtext | image | url | color | select | 
    #                checkbox | range | number | font | collection | product | page
    schema              = models.JSONField(default=list)
    
    # Nested block types this section supports (e.g., hero_banner contains "heading", "button")
    # Array of {type, name, limit, schema} objects
    nested_blocks_schema= models.JSONField(default=list)
    
    # Key matching the frontend component registry (blockRegistry.ts)
    react_component_key = models.CharField(max_length=100)         # "HeroBanner"

    preview_image_url   = models.URLField(blank=True)
    is_premium          = models.BooleanField(default=False)
    is_published        = models.BooleanField(default=True)
    version             = models.CharField(max_length=20, default="1.0.0")
    sort_order          = models.IntegerField(default=0)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_block"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.type})"


# ─────────────────────────────────────────────────────────────────────────────
# TENANT-LEVEL MODELS
# ─────────────────────────────────────────────────────────────────────────────

class TenantWebstore(models.Model):
    """
    Per-tenant webstore configuration and status.
    Created when the tenant first activates the webstore feature.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.OneToOneField(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore"
                          )
    is_enabled          = models.BooleanField(default=False)        # feature gate
    
    # Store password protection (optional)
    is_password_protected = models.BooleanField(default=False)
    store_password_hash = models.CharField(max_length=128, blank=True)
    
    # SEO
    seo_title           = models.CharField(max_length=255, blank=True)
    seo_description     = models.TextField(blank=True)
    social_image_url    = models.URLField(blank=True)
    
    # Custom storefront domain (e.g., "shop.lankanbites.com")
    # Different from Tenant.custom_domain which covers the full platform
    storefront_domain   = models.CharField(max_length=255, blank=True, unique=True, null=True)
    
    # Cart & checkout settings
    cart_settings       = models.JSONField(default=dict)
    # {
    #   "require_login": false,
    #   "enable_notes": true,
    #   "enable_shipping_calculator": true,
    #   "checkout_redirect_url": null  # external payment gateway URL
    # }
    
    # Consumer account settings
    customer_accounts   = models.CharField(
                            max_length=20,
                            choices=[("disabled","Disabled"),("optional","Optional"),("required","Required")],
                            default="optional"
                          )
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_tenant_webstore"

    def __str__(self):
        return f"Webstore: {self.tenant.name}"


class ThemeConfigStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active (Live)"
    DRAFT  = "DRAFT",  "Draft (Being Edited)"


class TenantThemeConfig(models.Model):
    """
    A tenant's customized theme configuration.
    
    Each tenant can have multiple configs (one ACTIVE, one DRAFT for editing).
    The ACTIVE config is what consumers see. The DRAFT is what the merchant 
    is currently editing in the customizer.
    
    The 'config' JSONField is the core data structure. Its schema:
    {
      "global_settings": {
        "colors": {
          "primary": "#F97316",
          "secondary": "#1B2B3A",
          "background": "#FFFFFF",
          "text": "#0F172A",
          "accent": "#10B981"
        },
        "typography": {
          "heading_font": "Inter",
          "body_font": "Inter",
          "heading_size_scale": 1.0
        },
        "layout": {
          "max_content_width": "1280px",
          "enable_sticky_header": true
        },
        "social": {
          "facebook": "",
          "instagram": "",
          "tiktok": "",
          "youtube": ""
        }
      },
      "layout": {
        "header": {
          "type": "header",
          "settings": {
            "show_announcement_bar": true,
            "logo_width": 150,
            "menu_handle": "main-menu"
          },
          "blocks": {
            "announcement-1": {
              "type": "announcement",
              "settings": { "text": "Free delivery over LKR 5000", "link": "" }
            }
          },
          "block_order": ["announcement-1"]
        },
        "footer": {
          "type": "footer",
          "settings": { "show_payment_icons": true, "show_social_icons": true },
          "blocks": {},
          "block_order": []
        }
      },
      "templates": {
        "index": {
          "sections": {
            "hero-uuid-1234": {
              "type": "hero_banner",
              "disabled": false,
              "settings": {
                "background_image": "https://...",
                "overlay_opacity": 40,
                "text_alignment": "center"
              },
              "blocks": {
                "heading-uuid-5678": {
                  "type": "heading",
                  "settings": { "text": "Welcome to Our Store", "color": "#ffffff" }
                },
                "button-uuid-9012": {
                  "type": "button",
                  "settings": { "label": "Shop Now", "link": "/collections/all" }
                }
              },
              "block_order": ["heading-uuid-5678", "button-uuid-9012"]
            },
            "featured-uuid-3456": {
              "type": "featured_collection",
              "disabled": false,
              "settings": {
                "title": "New Arrivals",
                "collection_handle": "new-arrivals",
                "products_to_show": 8,
                "columns_desktop": 4,
                "columns_mobile": 2
              },
              "blocks": {},
              "block_order": []
            }
          },
          "order": ["hero-uuid-1234", "featured-uuid-3456"]
        },
        "product": {
          "sections": {
            "main-product-uuid": {
              "type": "product_detail",
              "disabled": false,
              "settings": {
                "show_vendor": false,
                "show_sku": true,
                "show_share_buttons": true,
                "media_position": "left"
              },
              "blocks": {
                "title-uuid": {"type": "title", "settings": {}},
                "price-uuid": {"type": "price", "settings": {}},
                "variant-picker-uuid": {"type": "variant_picker", "settings": {}},
                "quantity-uuid": {"type": "quantity_selector", "settings": {}},
                "buy-button-uuid": {"type": "buy_buttons", "settings": {}},
                "description-uuid": {"type": "description", "settings": {}}
              },
              "block_order": ["title-uuid","price-uuid","variant-picker-uuid","quantity-uuid","buy-button-uuid","description-uuid"]
            }
          },
          "order": ["main-product-uuid"]
        },
        "collection": { ... },
        "cart": { ... }
      }
    }
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="theme_configs"
                          )
    theme               = models.ForeignKey(
                            WebstoreTheme,
                            on_delete=models.PROTECT,
                            related_name="tenant_configs"
                          )
    status              = models.CharField(
                            max_length=10,
                            choices=ThemeConfigStatus.choices,
                            default=ThemeConfigStatus.DRAFT
                          )
    
    # The full theme configuration (see schema above)
    config              = models.JSONField(default=dict)
    
    # Track which premium blocks this tenant has purchased
    # {block_type: {purchased_at: ISO, invoice_id: ...}}
    purchased_blocks    = models.JSONField(default=dict)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)
    published_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webstore_tenant_theme_config"
        # Only one ACTIVE and one DRAFT per tenant at any time
        # (enforced in application logic, not DB constraint, for flexibility)

    def __str__(self):
        return f"{self.tenant.name} — {self.theme.name} ({self.status})"


class WebstoreMenu(models.Model):
    """
    Navigation menus for the storefront (e.g., main header menu, footer menu).
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore_menus"
                          )
    title               = models.CharField(max_length=100)          # "Main Menu"
    handle              = models.SlugField(max_length=100)          # "main-menu"
    
    # Tree structure of menu items
    # [{
    #   "id": "uuid",
    #   "title": "Collections",
    #   "type": "collection|product|page|url|blog",
    #   "resource_id": "uuid or null",
    #   "url": "/collections/all",
    #   "children": [{...}]
    # }]
    items               = models.JSONField(default=list)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_menu"
        unique_together = [["tenant", "handle"]]

    def __str__(self):
        return f"{self.tenant.name}: {self.title}"


class WebstoreCollection(models.Model):
    """
    A curated grouping of products for display on the storefront.
    Different from catalog.Category — this is storefront-specific.
    Can be manual (specific products) or automated (rule-based).
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore_collections"
                          )
    title               = models.CharField(max_length=255)
    handle              = models.SlugField(max_length=255)          # URL slug
    description         = models.TextField(blank=True)
    image_url           = models.URLField(blank=True)
    
    # "manual" = explicitly assigned products
    # "automated" = rule-based (e.g., "tag = new-arrival")
    collection_type     = models.CharField(
                            max_length=10,
                            choices=[("manual","Manual"),("automated","Automated")],
                            default="manual"
                          )
    
    # For automated collections: filter rules
    # [{
    #   "field": "tag|vendor|product_type|price|category",
    #   "relation": "equals|contains|greater_than|less_than",
    #   "value": "new-arrival"
    # }]
    filter_rules        = models.JSONField(default=list)
    filter_conjunction  = models.CharField(
                            max_length=3,
                            choices=[("AND","All conditions"),("OR","Any condition")],
                            default="AND"
                          )
    
    # For manual collections: explicit product IDs (UUIDs)
    manual_product_ids  = models.JSONField(default=list)
    
    sort_order_type     = models.CharField(
                            max_length=30,
                            choices=[
                                ("manual","Manually"),
                                ("best_selling","Best Selling"),
                                ("alpha_asc","A-Z"),
                                ("alpha_desc","Z-A"),
                                ("price_asc","Price: Low to High"),
                                ("price_desc","Price: High to Low"),
                                ("newest","Newest"),
                            ],
                            default="manual"
                          )
    
    seo_title           = models.CharField(max_length=255, blank=True)
    seo_description     = models.TextField(blank=True)
    
    is_published        = models.BooleanField(default=True)
    published_at        = models.DateTimeField(null=True, blank=True)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_collection"
        unique_together = [["tenant", "handle"]]


class WebstorePage(models.Model):
    """
    Static merchant-created pages (About Us, FAQ, Contact, etc.)
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore_pages"
                          )
    title               = models.CharField(max_length=255)
    handle              = models.SlugField(max_length=255)          # /pages/<handle>
    body_html           = models.TextField(blank=True)             # rich text content
    
    seo_title           = models.CharField(max_length=255, blank=True)
    seo_description     = models.TextField(blank=True)
    
    is_published        = models.BooleanField(default=True)
    published_at        = models.DateTimeField(null=True, blank=True)
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_page"
        unique_together = [["tenant", "handle"]]


class WebstoreCustomer(models.Model):
    """
    Consumer accounts for the storefront.
    SEPARATE from CustomUser (staff accounts).
    Consumers register on the storefront — not the admin system.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore_customers"
                          )
    email               = models.EmailField()
    first_name          = models.CharField(max_length=150, blank=True)
    last_name           = models.CharField(max_length=150, blank=True)
    phone               = models.CharField(max_length=30, blank=True)
    password_hash       = models.CharField(max_length=128)
    
    # Saved delivery addresses
    addresses           = models.JSONField(default=list)
    # [{
    #   "id": "uuid",
    #   "first_name": "...",
    #   "last_name": "...",
    #   "address1": "...",
    #   "address2": "...",
    #   "city": "Colombo",
    #   "province": "Western",
    #   "postal_code": "10100",
    #   "country": "Sri Lanka",
    #   "is_default": true
    # }]
    
    default_address_id  = models.CharField(max_length=36, blank=True)
    accepts_marketing   = models.BooleanField(default=False)
    is_active           = models.BooleanField(default=True)
    
    # Link to CRM contact if exists
    crm_contact         = models.ForeignKey(
                            "crm.Contact",
                            on_delete=models.SET_NULL,
                            null=True, blank=True,
                            related_name="webstore_account"
                          )
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)
    last_login_at       = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webstore_customer"
        unique_together = [["tenant", "email"]]


class WebstoreOrder(models.Model):
    """
    Orders placed through the webstore.
    Links to the POS/ERP sales system for inventory deduction.
    """
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant              = models.ForeignKey(
                            "tenants.Tenant",
                            on_delete=models.CASCADE,
                            related_name="webstore_orders"
                          )
    order_number        = models.CharField(max_length=20)           # e.g., "WS-1001"
    customer            = models.ForeignKey(
                            WebstoreCustomer,
                            on_delete=models.SET_NULL,
                            null=True, blank=True,
                            related_name="orders"
                          )
    customer_email      = models.EmailField()                       # guest checkout support
    
    # Financial
    subtotal            = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total               = models.DecimalField(max_digits=12, decimal_places=2)
    currency            = models.CharField(max_length=3, default="LKR")
    
    # Status
    status              = models.CharField(
                            max_length=20,
                            choices=[
                                ("pending","Pending"),
                                ("confirmed","Confirmed"),
                                ("processing","Processing"),
                                ("shipped","Shipped"),
                                ("delivered","Delivered"),
                                ("cancelled","Cancelled"),
                                ("refunded","Refunded"),
                            ],
                            default="pending"
                          )
    payment_status      = models.CharField(
                            max_length=20,
                            choices=[("unpaid","Unpaid"),("paid","Paid"),("refunded","Refunded")],
                            default="unpaid"
                          )
    fulfillment_status  = models.CharField(
                            max_length=20,
                            choices=[("unfulfilled","Unfulfilled"),("partial","Partial"),("fulfilled","Fulfilled")],
                            default="unfulfilled"
                          )
    
    # Line items snapshot (denormalized for order history integrity)
    line_items          = models.JSONField(default=list)
    # [{
    #   "product_id": "uuid",
    #   "variant_id": "uuid",
    #   "title": "Blue Saree",
    #   "variant_title": "Size M / Blue",
    #   "sku": "SAR-M-BLU",
    #   "quantity": 2,
    #   "unit_price": 2500.00,
    #   "total": 5000.00,
    #   "image_url": "...",
    #   "requires_shipping": true
    # }]
    
    shipping_address    = models.JSONField(default=dict)
    billing_address     = models.JSONField(default=dict)
    
    notes               = models.TextField(blank=True)
    discount_code       = models.CharField(max_length=50, blank=True)
    
    # Link to POS Sale record once inventory is deducted
    pos_sale            = models.ForeignKey(
                            "pos.Sale",
                            on_delete=models.SET_NULL,
                            null=True, blank=True,
                            related_name="webstore_order"
                          )
    
    # Payment gateway reference
    payment_reference   = models.CharField(max_length=255, blank=True)
    payment_gateway     = models.CharField(max_length=50, blank=True)  # "payhere", "stripe", "manual"
    
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_order"
        unique_together = [["tenant", "order_number"]]
```

---

## 6. Backend API Endpoints

### 6.1 Public Storefront APIs (No Auth Required — Consumer Facing)

All under `/api/webstore/public/<slug>/...`

```
GET  /api/webstore/public/<slug>/config/
     → Returns active TenantThemeConfig + TenantWebstore settings
     → Used by storefront server components on every page render
     → Response: {theme_config, store_settings, is_password_protected}

GET  /api/webstore/public/<slug>/products/
     → Paginated product catalog for storefront
     → Query params: collection, sort, search, page, page_size, filters
     → Response: {products: [...], meta: {total, page, ...}}

GET  /api/webstore/public/<slug>/products/<handle>/
     → Single product detail with all variants, images, inventory status

GET  /api/webstore/public/<slug>/collections/
     → All published collections for the storefront

GET  /api/webstore/public/<slug>/collections/<handle>/
     → Collection detail with filtered/sorted products

GET  /api/webstore/public/<slug>/pages/<handle>/
     → Static page content

GET  /api/webstore/public/<slug>/menus/<handle>/
     → Navigation menu items (header/footer)

GET  /api/webstore/public/<slug>/search/?q=<query>
     → Full-text search across products

POST /api/webstore/public/<slug>/customers/register/
     → Consumer account registration (WebstoreCustomer)

POST /api/webstore/public/<slug>/customers/login/
     → Consumer login → returns customer JWT (separate from staff JWT)

POST /api/webstore/public/<slug>/orders/
     → Place a new order (cart checkout)

GET  /api/webstore/public/<slug>/orders/<order_number>/
     → Order status lookup (with customer auth)
```

### 6.2 Tenant Admin APIs (JWT Auth Required — Staff/Owner)

All under `/api/webstore/...`

```
# Webstore management
GET  /api/webstore/config/
     → Get tenant's webstore config + theme config

POST /api/webstore/setup/
     → Initial webstore activation (first-time setup)

PUT  /api/webstore/settings/
     → Update TenantWebstore settings (SEO, domain, cart settings)

# Theme management
GET  /api/webstore/themes/
     → List themes in the theme store (platform themes)

POST /api/webstore/themes/<theme_id>/install/
     → Install a theme (creates TenantThemeConfig DRAFT from theme's default_config)

POST /api/webstore/themes/<theme_id>/purchase/
     → Purchase a paid theme

GET  /api/webstore/my-themes/
     → List tenant's installed theme configs

# Theme customizer
GET  /api/webstore/customizer/active-config/
     → Returns full active TenantThemeConfig (for customizer initialization)

GET  /api/webstore/customizer/draft-config/
     → Returns full draft TenantThemeConfig

PATCH /api/webstore/customizer/draft-config/
     → Partial update of draft config (auto-saves while editing)

POST /api/webstore/customizer/publish/
     → Promotes DRAFT → ACTIVE (makes changes live)

POST /api/webstore/customizer/discard-draft/
     → Resets DRAFT to match current ACTIVE config

# Blocks
GET  /api/webstore/blocks/
     → List all available blocks (with schema, free/premium status)

GET  /api/webstore/blocks/<type>/schema/
     → Get full schema for a specific block type

# Menus
GET  /api/webstore/menus/
POST /api/webstore/menus/
PUT  /api/webstore/menus/<id>/
DELETE /api/webstore/menus/<id>/

# Collections
GET  /api/webstore/collections/
POST /api/webstore/collections/
GET  /api/webstore/collections/<id>/
PUT  /api/webstore/collections/<id>/
DELETE /api/webstore/collections/<id>/
PATCH /api/webstore/collections/<id>/products/  → Add/remove manual products

# Pages
GET  /api/webstore/pages/
POST /api/webstore/pages/
PUT  /api/webstore/pages/<id>/
DELETE /api/webstore/pages/<id>/

# Orders (admin view)
GET  /api/webstore/orders/
GET  /api/webstore/orders/<id>/
PATCH /api/webstore/orders/<id>/status/
POST /api/webstore/orders/<id>/fulfill/

# Customers (admin view)
GET  /api/webstore/customers/
GET  /api/webstore/customers/<id>/
```

### 6.3 SuperAdmin APIs (SUPER_ADMIN role required)

```
GET  /api/webstore/admin/themes/
POST /api/webstore/admin/themes/
PUT  /api/webstore/admin/themes/<id>/
PATCH /api/webstore/admin/themes/<id>/publish/

GET  /api/webstore/admin/blocks/
POST /api/webstore/admin/blocks/
PUT  /api/webstore/admin/blocks/<id>/
PATCH /api/webstore/admin/blocks/<id>/publish/
```

---

## 7. Frontend App Structure

### 7.1 New Route Groups and Files

```
frontend/src/app/
  
  # NEW: Consumer-facing webstore (public, SSR)
  (webstore)/
    layout.tsx                      # Reads active theme config, renders ThemeLayout
    loading.tsx                     # Skeleton loader for SSR transitions
    not-found.tsx                   # 404 page styled with tenant theme
    
    page.tsx                        # Webstore home → renders "index" template
    
    products/
      [handle]/
        page.tsx                    # Product detail → renders "product" template
        
    collections/
      page.tsx                      # All collections page
      [handle]/
        page.tsx                    # Collection page → renders "collection" template
        
    search/
      page.tsx                      # Search results
      
    cart/
      page.tsx                      # Cart page → renders "cart" template (CSR)
      
    checkout/
      page.tsx                      # Checkout (multi-step, CSR)
      success/
        page.tsx                    # Order confirmation
        
    account/
      login/page.tsx                # Consumer login (NOT staff login)
      register/page.tsx             # Consumer registration
      page.tsx                      # Account dashboard
      orders/page.tsx               # Order history
      
    pages/
      [handle]/
        page.tsx                    # Custom merchant pages (/pages/about-us)
        
    webstore-preview/               # iFrame sandbox for customizer
      [...path]/
        page.tsx                    # Renders theme with draft config + preview mode flag

  # UPDATED: Store admin — new webstore management section
  (store)/
    store/
      webstore/
        page.tsx                    # Webstore hub (overview, quick links)
        customize/
          page.tsx                  # Full-screen visual theme editor
          layout.tsx                # Suppresses the store sidebar (full-screen mode)
        themes/
          page.tsx                  # Theme store browser
        menus/
          page.tsx                  # Navigation menu editor
        pages/
          page.tsx                  # Custom pages list
          new/page.tsx
          [id]/page.tsx
        collections/
          page.tsx                  # Webstore collections list
          new/page.tsx
          [id]/page.tsx
        settings/
          page.tsx                  # SEO, domain, checkout, customer accounts
        orders/
          page.tsx                  # Webstore orders management
          [id]/page.tsx
        customers/
          page.tsx                  # Webstore customers list
          [id]/page.tsx
```

### 7.2 Core Webstore Frontend Files

```
frontend/src/

  # Theme rendering engine
  lib/
    webstore/
      themeRenderer.tsx             # Core: resolves JSON config → React tree
      blockRegistry.ts              # Maps block type strings → React components
      configMerger.ts               # Merges saved config with schema defaults
      themeApi.ts                   # API calls for theme config, products, etc.
      cartStore.ts                  # Zustand store for cart state (persisted to localStorage)
      customerStore.ts              # Zustand store for consumer auth state
      types.ts                      # TypeScript types for ThemeConfig, Block, Section, etc.
  
  # Block components (the actual UI building blocks)
  components/
    webstore/
      blocks/
        HeroBanner/
          index.tsx                 # The React component
          schema.ts                 # TypeScript copy of the JSON schema (for type safety)
        FeaturedCollection/
          index.tsx
          schema.ts
        ImageWithText/
          index.tsx
          schema.ts
        RichText/
          index.tsx
          schema.ts
        ProductGrid/
          index.tsx
          schema.ts
        Testimonials/
          index.tsx
          schema.ts
        AnnouncementBar/
          index.tsx
          schema.ts
        CountdownTimer/
          index.tsx
          schema.ts
        NewsletterSignup/
          index.tsx
          schema.ts
        # ... etc
        
      layout/
        StorefrontHeader.tsx        # Global header component (menu, cart, search)
        StorefrontFooter.tsx        # Global footer component
        StorefrontMobileMenu.tsx    # Mobile navigation drawer
        
      product/
        ProductCard.tsx             # Product card used in grids/collections
        ProductGallery.tsx          # Product image gallery (zoom, swipe)
        VariantPicker.tsx           # Color/size/attribute selector
        QuantitySelector.tsx        # +/- quantity input
        AddToCartButton.tsx         # Add to cart CTA
        ProductBreadcrumb.tsx
        
      cart/
        CartDrawer.tsx              # Slide-in cart panel
        CartItem.tsx
        CartSummary.tsx
        
      checkout/
        CheckoutForm.tsx            # Multi-step checkout
        AddressForm.tsx
        PaymentSection.tsx
        
      customizer/
        ThemeCustomizerPanel.tsx    # Left sidebar of the customizer
        SectionList.tsx             # Drag-and-drop section reorder
        BlockList.tsx               # Block management within a section
        SettingsPanel.tsx           # Dynamic settings form generator
        SettingInput.tsx            # Individual setting input (text, color, image, etc.)
        PreviewFrame.tsx            # iFrame wrapper + postMessage handler
        PageSelector.tsx            # Home/Product/Collection/Cart page switcher
```

### 7.3 Block Registry (`blockRegistry.ts`)

```typescript
// frontend/src/lib/webstore/blockRegistry.ts

import { HeroBanner } from "@/components/webstore/blocks/HeroBanner";
import { FeaturedCollection } from "@/components/webstore/blocks/FeaturedCollection";
import { ImageWithText } from "@/components/webstore/blocks/ImageWithText";
import { RichText } from "@/components/webstore/blocks/RichText";
import { ProductGrid } from "@/components/webstore/blocks/ProductGrid";
import { Testimonials } from "@/components/webstore/blocks/Testimonials";
import { AnnouncementBar } from "@/components/webstore/blocks/AnnouncementBar";
import { CountdownTimer } from "@/components/webstore/blocks/CountdownTimer";
import { NewsletterSignup } from "@/components/webstore/blocks/NewsletterSignup";
import { StorefrontHeader } from "@/components/webstore/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/webstore/layout/StorefrontFooter";
import { ProductDetail } from "@/components/webstore/blocks/ProductDetail";
import { CollectionHeader } from "@/components/webstore/blocks/CollectionHeader";
import { CollectionFilters } from "@/components/webstore/blocks/CollectionFilters";

export type BlockComponent = React.ComponentType<{
  settings: Record<string, unknown>;
  blocks?: Record<string, BlockInstance>;
  blockOrder?: string[];
  isPreview?: boolean;
  tenantData?: TenantRuntimeData; // live catalog data injected by renderer
}>;

export const BLOCK_REGISTRY: Record<string, BlockComponent> = {
  // Layout
  "header":               StorefrontHeader,
  "footer":               StorefrontFooter,
  
  // Sections
  "hero_banner":          HeroBanner,
  "featured_collection":  FeaturedCollection,
  "image_with_text":      ImageWithText,
  "rich_text":            RichText,
  "product_grid":         ProductGrid,
  "testimonials":         Testimonials,
  "announcement_bar":     AnnouncementBar,
  "countdown_timer":      CountdownTimer,
  "newsletter_signup":    NewsletterSignup,
  
  // Product page blocks
  "product_detail":       ProductDetail,
  
  // Collection page blocks
  "collection_header":    CollectionHeader,
  "collection_filters":   CollectionFilters,
};
```

### 7.4 Theme Renderer (`themeRenderer.tsx`)

```typescript
// frontend/src/lib/webstore/themeRenderer.tsx

import { BLOCK_REGISTRY } from "./blockRegistry";
import { mergeConfigWithSchema } from "./configMerger";

interface RenderOptions {
  themeConfig: TenantThemeConfig;
  template: "index" | "product" | "collection" | "cart";
  tenantData: TenantRuntimeData;    // live catalog data (products, collections, etc.)
  isPreview?: boolean;              // true when rendering in customizer iframe
}

export function ThemeRenderer({ themeConfig, template, tenantData, isPreview }: RenderOptions) {
  const templateConfig = themeConfig.config.templates[template];
  if (!templateConfig) return null;

  const { sections, order } = templateConfig;

  return (
    <>
      {order.map((sectionId) => {
        const section = sections[sectionId];
        if (!section || section.disabled) return null;

        const Component = BLOCK_REGISTRY[section.type];
        if (!Component) {
          console.warn(`No component registered for block type: ${section.type}`);
          return null;
        }

        // Merge saved settings with schema defaults (handles new settings gracefully)
        const mergedSettings = mergeConfigWithSchema(section.settings, section.type);

        return (
          <Component
            key={sectionId}
            settings={mergedSettings}
            blocks={section.blocks}
            blockOrder={section.block_order}
            isPreview={isPreview}
            tenantData={tenantData}
          />
        );
      })}
    </>
  );
}
```

---

## 8. Theme Engine Deep Dive

### 8.1 Block Schema Specification

Each block registered in `WebstoreBlock.schema` uses this structure:

```json
[
  {
    "id": "background_image",
    "type": "image",
    "label": "Background Image",
    "default": ""
  },
  {
    "id": "overlay_opacity",
    "type": "range",
    "label": "Overlay Opacity (%)",
    "min": 0,
    "max": 90,
    "step": 10,
    "default": 40
  },
  {
    "id": "text_alignment",
    "type": "select",
    "label": "Text Alignment",
    "options": [
      {"value": "left", "label": "Left"},
      {"value": "center", "label": "Center"},
      {"value": "right", "label": "Right"}
    ],
    "default": "center"
  },
  {
    "id": "heading_text",
    "type": "text",
    "label": "Heading",
    "default": "Welcome to Our Store"
  },
  {
    "id": "show_divider",
    "type": "checkbox",
    "label": "Show divider line",
    "default": false
  },
  {
    "id": "collection_handle",
    "type": "collection",
    "label": "Select Collection",
    "default": ""
  },
  {
    "id": "padding_top",
    "type": "range",
    "label": "Top Padding",
    "min": 0,
    "max": 100,
    "step": 4,
    "unit": "px",
    "default": 36
  }
]
```

**Supported Setting Types:**

| Type | UI Control | Description |
|------|-----------|-------------|
| `text` | Text input | Single line text |
| `textarea` | Textarea | Multi-line text |
| `richtext` | Rich text editor | Bold/italic/links |
| `image` | Image uploader | Returns URL after upload |
| `url` | URL input with resource picker | Internal links + external |
| `color` | Color picker | HEX value |
| `select` | Dropdown | Options array |
| `checkbox` | Toggle | Boolean |
| `range` | Slider | Min/max/step |
| `number` | Number input | Integer/decimal |
| `font` | Font selector | From platform fonts list |
| `collection` | Collection picker | Returns collection handle |
| `product` | Product picker | Returns product handle |
| `page` | Page picker | Returns page handle |
| `header` | UI only (label) | Visual section separator |
| `paragraph` | UI only (text) | Help/info text |

### 8.2 Config Merger (Schema-Safe Upgrades)

When the platform updates a block's schema (adds a new setting), existing merchant configs must not break:

```typescript
// frontend/src/lib/webstore/configMerger.ts

export function mergeConfigWithSchema(
  savedSettings: Record<string, unknown>,
  blockType: string,
  blockSchemas: Record<string, BlockSchemaItem[]>
): Record<string, unknown> {
  const schema = blockSchemas[blockType] ?? [];
  const merged: Record<string, unknown> = {};

  for (const settingDef of schema) {
    if (savedSettings[settingDef.id] !== undefined) {
      // Merchant has customized this — keep their value
      merged[settingDef.id] = savedSettings[settingDef.id];
    } else {
      // New setting added to schema — use the defined default
      merged[settingDef.id] = settingDef.default;
    }
  }

  return merged;
}
```

### 8.3 Theme Installation Flow

```
Merchant clicks "Install Theme" on theme store:
1. POST /api/webstore/themes/<theme_id>/install/
2. Backend clones WebstoreTheme.default_config into new TenantThemeConfig (status=DRAFT)
3. If tenant already has an ACTIVE config, the new install becomes DRAFT
4. Merchant is redirected to the customizer to edit the draft
5. When satisfied, clicks "Publish" → DRAFT becomes ACTIVE → previous ACTIVE is archived
```

---

## 9. Visual Theme Customizer

### 9.1 Architecture

The customizer lives at `/store/webstore/customize`. It uses a full-screen layout (suppressing the standard store sidebar).

**Two-Frame Architecture:**

- **Parent Frame** (`ThemeCustomizerPanel.tsx`): The React sidebar that shows tree of sections, settings inputs, drag handles. Manages draft config state in memory and auto-saves to backend every 3 seconds.
- **Child iFrame** (`/webstore-preview/[path]`): Renders the actual storefront with a special `?preview=draft` flag. Listens for `postMessage` updates and hot-patches its component state instantly.

### 9.2 postMessage Protocol

```typescript
// Message types from Sidebar → iFrame:
type CustomizerMessage =
  | {
      type: "LANKA_INIT";
      payload: { config: TenantThemeConfig; page: string };
    }
  | {
      type: "LANKA_UPDATE_SECTION";
      payload: { sectionId: string; settings: Record<string, unknown> };
    }
  | {
      type: "LANKA_UPDATE_BLOCK";
      payload: { sectionId: string; blockId: string; settings: Record<string, unknown> };
    }
  | {
      type: "LANKA_REORDER_SECTIONS";
      payload: { order: string[] };
    }
  | {
      type: "LANKA_ADD_SECTION";
      payload: { sectionId: string; sectionConfig: SectionConfig };
    }
  | {
      type: "LANKA_REMOVE_SECTION";
      payload: { sectionId: string };
    }
  | {
      type: "LANKA_UPDATE_GLOBAL";
      payload: { globalSettings: GlobalSettings };
    }
  | {
      type: "LANKA_NAVIGATE";
      payload: { page: "index" | "product" | "collection" | "cart" };
    };
```

### 9.3 Customizer State Management

```typescript
// The customizer parent maintains a local copy of the draft config.
// All edits update this local state, then:
// 1. postMessage → iFrame for instant visual feedback
// 2. Debounced auto-save (3s) → PATCH /api/webstore/customizer/draft-config/

interface CustomizerState {
  draftConfig: TenantThemeConfig;
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  currentPage: "index" | "product" | "collection" | "cart";
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}
```

### 9.4 Adding a New Section

The customizer shows a block library panel where merchants can pick sections to add:

```
1. Merchant clicks "Add Section"
2. Side panel shows all available block types (from GET /api/webstore/blocks/)
3. Premium blocks show a "Premium" badge — clicking opens an upgrade prompt
4. Merchant selects a block type
5. A new section is created with:
   - sectionId: generateUUID()
   - type: selected block type
   - settings: {} (defaults will be merged from schema)
   - blocks: {}
   - block_order: []
6. Appended to template.order (at the bottom, or inserted position)
7. postMessage → iFrame renders the new section instantly
8. Auto-saved to draft
```

---

## 10. Block & Section Library Specification

### Initial Block Library (Phase 6 Implementation Target)

#### Header Block
- Logo (image upload, width control)
- Sticky header (boolean)
- Navigation menu (menu picker)
- Show search icon (boolean)
- Show cart icon (boolean)
- Announcement bar text (text)
- Mobile menu style (drawer/fullscreen)

#### Hero Banner Block
- Full-width image/video background
- Overlay opacity (range)
- Heading text (text), color, size
- Sub-heading text (textarea)
- CTA buttons (up to 2 nested blocks)
- Content alignment (left/center/right)
- Height options (small/medium/large/full-viewport)

#### Featured Collection Block
- Collection picker (collection type)
- Section heading (text)
- Number of products (range 4–16)
- Columns desktop (2/3/4/5)
- Columns mobile (1/2)
- Show "View All" link (boolean)
- Card style: standard/compact/horizontal

#### Image with Text Block
- Image (image upload)
- Image position (left/right)
- Heading (text)
- Body text (richtext)
- CTA label + URL
- Background color (color)

#### Rich Text Block
- Full richtext editor
- Text alignment
- Background color
- Padding control

#### Testimonials Block
- Layout: grid/carousel
- Number to show (range)
- Nested blocks: each testimonial (quote, author, rating, avatar)

#### Announcement Bar Block
- Text content (text/richtext)
- Background color, text color
- Link URL
- Auto-dismiss (boolean)

#### Newsletter Signup Block
- Heading (text)
- Sub-heading (text)
- Button label (text)
- Background and button colors

#### Product Grid Block
- Collection source (collection picker) or all products
- Number of products (range)
- Columns desktop/mobile
- Show price, show vendor, show sale badge

#### Countdown Timer Block
- Target datetime (datetime input)
- Heading text
- Display style (inline/boxed)
- Show days/hours/minutes/seconds (checkboxes)

#### Product Detail Block (product template only)
- Media position (left/right)
- Media size (small/medium/large)
- Nested blocks: title, price, variant_picker, quantity_selector, buy_buttons, description, tags, share_buttons

#### Footer Block
- Multi-column layout (1–4 columns)
- Nested blocks per column: menu list, social icons, newsletter, text, logo
- Payment icons (boolean)
- Copyright text (text)

---

## 11. Subscription Feature Gating

### 11.1 Plan Feature Flag

The existing `Plan.features` JSONField should include the webstore flag:

```python
# Example plan features structure:
plan.features = [
    {"id": "pos", "enabled": True},
    {"id": "inventory", "enabled": True},
    {"id": "crm", "enabled": True},
    {"id": "reports", "enabled": True},
    {"id": "webstore", "enabled": True},          # The new webstore feature
    {"id": "webstore_custom_domain", "enabled": False},  # Custom domain add-on
    {"id": "webstore_premium_blocks", "enabled": False}, # Premium blocks
]
```

### 11.2 Feature Check Helper (Backend)

```python
# apps/webstore/permissions.py

from rest_framework.permissions import BasePermission

class HasWebstoreFeature(BasePermission):
    """
    Checks that the tenant's active subscription plan includes the webstore feature.
    """
    message = "Your plan does not include the Webstore feature."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "SUPER_ADMIN":
            return True
        
        tenant = request.user.tenant
        if not tenant:
            return False
        
        # Check active subscription plan features
        active_sub = tenant.subscriptions.filter(
            status__in=["ACTIVE", "TRIALING"]
        ).select_related("plan").first()
        
        if not active_sub:
            return False
        
        features = active_sub.plan.features or []
        return any(
            f.get("id") == "webstore" and f.get("enabled", False)
            for f in features
        )
```

### 11.3 Frontend Gating (Store Admin)

In the store sidebar (`StoreSidebar.tsx`), the "Webstore" navigation item is conditionally shown:

```typescript
// Check webstore feature from JWT or tenant config
const hasWebstoreFeature = user?.permissions?.includes("webstore.access") ?? false;
// OR: fetch from tenant config on initial load

// In the nav items:
if (hasWebstoreFeature) {
  // Show Webstore nav item
}
```

Add `"webstore.access"` to the permissions constants and include it in the OWNER/MANAGER `ROLE_PERMISSIONS` when the tenant has the feature.

### 11.4 Consumer-Facing Gating

When a consumer visits a store's webstore URL but the tenant hasn't enabled it:

```
GET <slug>.lankacommerce.com/products/blue-shirt
  → API: /api/webstore/public/<slug>/config/ returns {is_enabled: false}
  → Next.js renders: "Coming Soon" page with store branding
  → OR: 404 if tenant doesn't exist
```

---

## 12. Custom Domain Routing

### 12.1 Architecture

```
Consumer visits: shop.lankanbites.com/products/blue-shirt
         ↓
DNS CNAME: shop.lankanbites.com → storefront.lankacommerce.com
         ↓
Load Balancer / Cloudflare Worker
         ↓
Next.js Middleware:
  1. Check if hostname matches pattern *.<our-domain>.com → extract slug
  2. If NOT our domain → check TenantWebstore.storefront_domain in DB/cache
  3. Identify tenant by custom domain
  4. Set x-tenant-slug header + continue to (webstore) routes
         ↓
(webstore) route group renders with that tenant's theme
```

### 12.2 Middleware Update for Custom Domains

```typescript
// In middleware.ts, add custom domain resolution:

async function resolveCustomDomain(hostname: string): Promise<string | null> {
  // Check if this is a custom tenant domain
  // Call backend: GET /api/webstore/resolve-domain/?domain=<hostname>
  // Returns: { slug: "lankanbites" } or 404
  // Cache result in KV/Edge cache for 5 minutes
}
```

### 12.3 SSL Certificate Provisioning

For custom domains, SSL provisioning is handled via:
- Development: Self-signed cert or skip SSL
- Production: Cloudflare SSL proxy (recommended) or Let's Encrypt via certbot

---

## 13. Performance & Caching Strategy

### 13.1 Server-Side Rendering with ISR

All public storefront pages use Next.js ISR (Incremental Static Regeneration):

```typescript
// In page.tsx for product detail:
export const revalidate = 60; // Re-generate every 60 seconds

// On-demand revalidation when:
// - Merchant publishes new theme config → revalidate all pages
// - Product price/stock changes → revalidate affected product page
// - New product added to collection → revalidate collection page
```

### 13.2 Theme Config Caching

- Active theme config is cached in Next.js fetch cache per tenant
- Cache key: `webstore-config-<tenant-slug>`
- Invalidated on: `POST /api/webstore/customizer/publish/`
- Cache duration: 5 minutes (with background revalidation)

### 13.3 On-Demand Cache Invalidation

Backend sends a revalidation request to Next.js whenever content changes:

```python
# In webstore views, after publishing a new theme:
import requests

def revalidate_tenant_pages(tenant_slug: str):
    """Call Next.js revalidation API to clear cached storefront pages."""
    next_revalidate_url = settings.NEXT_PUBLIC_APP_URL + "/api/revalidate"
    requests.post(next_revalidate_url, json={
        "secret": settings.REVALIDATION_SECRET,
        "tag": f"webstore-{tenant_slug}"
    })
```

---

## 14. Phase Breakdown (10 Phases)

Each phase becomes its own self-contained implementation document. The document will be written to be fully implementable in a fresh chat session without needing any other document open simultaneously.

### Phase 1: Core Database Models & App Scaffold
**Goal:** Create the `apps.webstore` Django app with all models, migrations, admin registrations, and URL skeleton.

**Deliverables:**
- `backend/apps/webstore/__init__.py`
- `backend/apps/webstore/apps.py`
- `backend/apps/webstore/models.py` (all 9 models above, fully defined)
- `backend/apps/webstore/admin.py` (register all models in Django admin)
- `backend/apps/webstore/migrations/0001_initial.py`
- `backend/apps/webstore/urls.py` (all URL patterns, views stubbed with 501 placeholders)
- `backend/config/settings/base.py` → add `"apps.webstore"` to INSTALLED_APPS
- `backend/config/urls.py` → add `path("api/webstore/", include("apps.webstore.urls"))`
- Update `apps.tenants.Plan` fixtures to include webstore feature flag examples
- Update `apps.accounts.constants.permissions.py` → add `WEBSTORE_ACCESS`, `WEBSTORE_MANAGE` permissions
- Update `ROLE_PERMISSIONS["OWNER"]` and `ROLE_PERMISSIONS["MANAGER"]` to include webstore permissions (only active when tenant has feature)

### Phase 2: Public Storefront API (Backend)
**Goal:** Implement all read-only public API endpoints for the consumer-facing storefront.

**Deliverables:**
- `backend/apps/webstore/views/public_views.py` — all public storefront endpoints
- `backend/apps/webstore/serializers/public_serializers.py`
- `backend/apps/webstore/services/storefront_service.py` — business logic for config lookup, product listing, collection resolution
- Tests: `backend/tests/webstore/test_public_api.py`
- Seed data: one default theme with full `default_config` JSON

### Phase 3: Tenant Admin Webstore API (Backend)
**Goal:** Implement all authenticated tenant management endpoints (theme install, customizer CRUD, menus, collections, pages, orders).

**Deliverables:**
- `backend/apps/webstore/views/tenant_views.py`
- `backend/apps/webstore/views/customizer_views.py`
- `backend/apps/webstore/serializers/tenant_serializers.py`
- `backend/apps/webstore/permissions.py` — `HasWebstoreFeature` permission class
- `backend/apps/webstore/services/theme_service.py` — install, publish, discard logic
- `backend/apps/webstore/services/collection_service.py` — automated collection resolver

### Phase 4: Webstore Onboarding & Management UI (Frontend Admin)
**Goal:** Build the webstore management section inside the existing store admin (`/store/webstore/`).

**Deliverables:**
- Store sidebar updated: Webstore nav item (gated by feature flag)
- `/store/webstore/page.tsx` — hub page (enabled/disabled state, quick stats)
- `/store/webstore/settings/page.tsx` — SEO, domain, cart settings form
- `/store/webstore/themes/page.tsx` — theme store browser (grid of available themes)
- First-time setup wizard: multi-step activation flow (Step 1: theme selection, Step 2: basic settings, Step 3: add first collection → then open customizer)
- `/store/webstore/menus/page.tsx` — drag-and-drop menu editor
- `/store/webstore/pages/page.tsx` — static pages CRUD
- `/store/webstore/collections/page.tsx` — collections management
- `/store/webstore/orders/page.tsx` — webstore orders list
- Feature gate: if no webstore subscription, show upgrade prompt page

### Phase 5: Visual Theme Customizer (Frontend Admin)
**Goal:** Build the full-screen visual theme editor with iframe preview and live postMessage updates.

**Deliverables:**
- `/store/webstore/customize/layout.tsx` — full-screen layout (no sidebar)
- `/store/webstore/customize/page.tsx` — two-pane layout orchestrator
- `ThemeCustomizerPanel.tsx` — left sidebar with: page selector, section tree, global settings tabs
- `SectionList.tsx` — drag-and-drop section reorder (`@dnd-kit/core`)
- `BlockList.tsx` — manage nested blocks inside a section
- `SettingsPanel.tsx` — dynamic settings form auto-generated from block schema
- Individual setting inputs: `ColorInput`, `ImageInput`, `TextInput`, `RangeInput`, `SelectInput`, `CollectionPicker`, `RichTextInput`
- `PreviewFrame.tsx` — iFrame wrapper that sends postMessage updates
- `/webstore-preview/[...path]/page.tsx` — the preview target (renders with draft config + accepts postMessage)
- Auto-save (3s debounce) with "saving..." indicator
- Publish/Discard buttons with confirmation dialogs

### Phase 6: Core Block Library (Frontend)
**Goal:** Implement the first 10 consumer-facing blocks as production-quality, fully responsive React components.

**Blocks to implement:** HeroBanner, FeaturedCollection, ImageWithText, RichText, ProductGrid, Testimonials, AnnouncementBar, NewsletterSignup, StorefrontHeader (with mobile menu), StorefrontFooter.

**Deliverables:**
- All block components in `src/components/webstore/blocks/`
- `src/lib/webstore/blockRegistry.ts`
- `src/lib/webstore/themeRenderer.tsx`
- `src/lib/webstore/configMerger.ts`
- `src/lib/webstore/types.ts`
- Storybook stories for each block (if Storybook is configured; otherwise, visual smoke test page)
- Blocks must be: fully responsive (mobile-first), accessible (ARIA), performant (no layout shift)

### Phase 7: Consumer Storefront Pages (Frontend SSR)
**Goal:** Implement all public consumer-facing storefront pages using the ThemeRenderer.

**Deliverables:**
- `(webstore)/layout.tsx` — reads active theme, renders header/footer wrapper
- `(webstore)/page.tsx` — home page
- `(webstore)/products/[handle]/page.tsx` — product detail with gallery, variant picker, add-to-cart
- `(webstore)/collections/[handle]/page.tsx` — collection with filters, pagination
- `(webstore)/search/page.tsx` — search results
- `src/lib/webstore/cartStore.ts` — Zustand cart (persisted to localStorage, syncs to backend on checkout)
- `CartDrawer.tsx` — slide-in cart panel (global, rendered in layout)
- `(webstore)/cart/page.tsx` — full cart page
- Middleware update: route `/` on subdomain to (webstore) when tenant has webstore enabled
- SEO: `generateMetadata()` on all pages using tenant's SEO settings

### Phase 8: Checkout & Order Flow (Frontend + Backend)
**Goal:** Implement the complete checkout flow from cart to order confirmation, including payment gateway integration hooks.

**Deliverables:**
- `(webstore)/checkout/page.tsx` — multi-step: (1) Contact/Address, (2) Shipping method, (3) Payment, (4) Review
- `(webstore)/checkout/success/page.tsx` — order confirmation
- Consumer account system: `(webstore)/account/login`, `/account/register`, `/account/orders`
- `src/lib/webstore/customerStore.ts` — Zustand consumer auth (separate from staff auth)
- Backend: `POST /api/webstore/public/<slug>/orders/` — order placement, inventory deduction (creates POS Sale record), order confirmation email
- Payment gateway integration: PayHere (Sri Lanka) → webhook handler for payment confirmation
- Backend: `POST /api/webstore/webhooks/payhere/` — payment gateway callback
- Order status page for consumers
- Admin: `/store/webstore/orders/` — order management with fulfill/cancel actions

### Phase 9: Theme Store & SuperAdmin Block Management (Frontend + Backend)
**Goal:** Build the SuperAdmin tools for managing the theme store and block library. Enable merchants to browse, install, and (where applicable) purchase themes.

**Deliverables:**
- SuperAdmin routes: `/superadmin/webstore/themes/`, `/superadmin/webstore/blocks/`
- Theme upload form: upload preview images, define default config JSON, set pricing
- Block definition form: schema editor (JSON editor with validation), preview image upload
- Backend: `POST /api/webstore/admin/themes/` with file upload for preview images
- Theme store browser: `/store/webstore/themes/` — cards grid, filters (free/premium/category), preview images, install button
- Theme preview: opens `/webstore-preview/` of the theme with sample data in a modal
- Premium theme purchase flow: integrates with billing system
- Version management: ability to publish new theme versions without breaking existing tenant configs

### Phase 10: Advanced Features, Performance & Polish
**Goal:** Implement ISR caching, on-demand revalidation, custom domain support, blog/content pages, product reviews stub, and full mobile optimization.

**Deliverables:**
- ISR: `export const revalidate = 60` on all storefront pages
- `src/app/api/revalidate/route.ts` — revalidation API endpoint (called by Django on publish)
- Backend: revalidation call in `publish` view
- Custom domain middleware in `middleware.ts`
- Backend: `GET /api/webstore/resolve-domain/?domain=<hostname>` for custom domain lookup
- Blog/content pages: `WebstoreBlogPost` model + simple blog listing and detail pages
- Password-protected store: middleware checks store password cookie
- Product reviews: `WebstoreProductReview` model, review form on product page, admin moderation
- Analytics stub: page view events sent to backend for basic webstore analytics
- Accessibility audit and fixes (WCAG 2.1 AA)
- Lighthouse performance: target 90+ score on all storefront pages
- Full mobile navigation (hamburger menu, touch swipe on galleries)

---

## Appendix A: Complete File Creation List

### Backend (new files to create):
```
backend/apps/webstore/
  __init__.py
  apps.py
  admin.py
  models.py
  urls.py
  permissions.py
  migrations/
    __init__.py
    0001_initial.py
  serializers/
    __init__.py
    public_serializers.py
    tenant_serializers.py
    admin_serializers.py
  views/
    __init__.py
    public_views.py
    tenant_views.py
    customizer_views.py
    admin_views.py
  services/
    __init__.py
    storefront_service.py
    theme_service.py
    collection_service.py
    order_service.py
  management/
    commands/
      seed_default_theme.py
      seed_webstore_blocks.py
```

### Frontend (new files to create):
```
frontend/src/
  app/
    (webstore)/                         # All consumer-facing pages
    (store)/store/webstore/             # All admin webstore management pages
  components/webstore/                  # All block components + layout + product components
  lib/webstore/                         # Core engine (renderer, registry, stores, types)
```

---

## Appendix B: Key Design Decisions & Rationale

| Decision | Choice | Reason |
|----------|--------|--------|
| Config storage | PostgreSQL JSONField | Already using Django + PostgreSQL-ready stack; no need for Firestore |
| Theme config format | Single large JSONField | Atomic updates, simple versioning, matches Shopify's model |
| Rendering approach | Next.js SSR Server Components | Best SEO, fast TTFB, works with existing infrastructure |
| Customizer preview | iFrame + postMessage | Industry standard; isolates preview from parent; no re-fetches |
| Cart persistence | localStorage (Zustand) | Consumer carts persist across refreshes without server load |
| Consumer auth | Separate WebstoreCustomer model | Never mix consumer accounts with staff accounts; different auth flow |
| Block registry | Frontend TypeScript registry | Blocks are UI code, not data; type-safe, tree-shakeable |
| Schema storage | Backend DB (WebstoreBlock.schema) | Single source of truth; admin can update schemas; frontend fetches |
| Payment gateway | PayHere (primary for LK market) | Leading payment gateway in Sri Lanka; webhook-based |
| Custom domains | CNAME + middleware lookup | Standard approach; Cloudflare proxy handles SSL |
| Feature gating | Plan.features JSONField | Existing system; just add "webstore" flag to relevant plans |

---

*End of Master Architecture Document. Derive 10 phase-specific implementation documents from this.*
