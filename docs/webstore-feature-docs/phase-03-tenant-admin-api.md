# Phase 3: Tenant Admin Webstore API (Backend)

**Phase:** 3 of 10  
**Depends on:** Phase 1 (models), Phase 2 (public API patterns established)  
**Unlocks:** Phase 4 (Admin UI) and Phase 5 (Visual Customizer)  
**Estimated Scope:** Backend only

---

## 1. Overview

This phase implements all authenticated backend API endpoints that store owners and managers use to configure their webstore. These endpoints are called by the admin UI (Phase 4) and the visual customizer (Phase 5).

Unlike the Phase 2 public endpoints, all endpoints in this phase require a valid staff JWT. They also require that the tenant's subscription plan includes the webstore feature. A custom DRF permission class (`HasWebstoreFeature`) enforces this at the view level.

The four endpoint groups built in this phase are:
1. **Webstore management** — activate/configure the webstore itself
2. **Theme management** — browse available themes, install them, manage installed configs
3. **Customizer API** — live-edit the draft config, publish to live
4. **Content management** — CRUD for menus, collections, pages

At the end of this phase, a logged-in store owner can programmatically call every API needed to:
- Activate their webstore for the first time
- Install and customize a theme
- Create navigation menus
- Create product collections
- Create static pages

---

## 2. Existing Codebase Context

### 2.1 Standard Auth Pattern

Every existing authenticated API view in this codebase uses:
- `permission_classes = [IsAuthenticated]`
- `authentication_classes = [JWTAuthentication]` (from `rest_framework_simplejwt`)
- Tenant scoping: `request.user.tenant` gives the current user's tenant
- Role checking is typically done via DRF permissions or `request.user.role`

The `CustomUser` model is at `apps/accounts/models.py`. It has `role` (string), `tenant` (FK to Tenant, null for SUPER_ADMIN), and `permissions_list` (JSONField, array of permission strings).

### 2.2 Existing DRF Permission Pattern

Look at `backend/apps/catalog/views.py` or `backend/apps/crm/views.py` for examples of how existing views scope queries to the current tenant. The pattern is:
```
queryset.filter(tenant=self.request.user.tenant)
```
This pattern must be followed for all webstore tenant admin views.

### 2.3 Existing Serializer Patterns

Existing serializers in `apps/catalog/serializers.py` use `ModelSerializer` with explicit `fields` declarations. Follow this pattern — do not use `fields = "__all__"`. Always explicitly list fields to prevent accidentally exposing sensitive data.

### 2.4 File Uploads

The existing catalog storage (`apps/catalog/storage.py`) handles file uploads. For theme preview images uploaded via the SuperAdmin API (Phase 9), this same storage class is used. For webstore content managed by tenant admins (collection images, page images), the same upload endpoint from `apps/catalog` can be reused, or a new `POST /api/webstore/uploads/` endpoint can be created that delegates to the same storage class.

### 2.5 Existing Error Response Format

DRF returns errors as `{"detail": "error message"}` for single errors, and `{"field_name": ["error"]}` for field validation errors. Follow this convention throughout. Do not create custom error formats.

---

## 3. File Structure for This Phase

| File | Status | Purpose |
|---|---|---|
| `backend/apps/webstore/permissions.py` | Fill in | `HasWebstoreFeature` permission class |
| `backend/apps/webstore/views/tenant_views.py` | Fill in stubs | Webstore management, theme, content endpoints |
| `backend/apps/webstore/views/customizer_views.py` | Fill in stubs | Customizer-specific endpoints |
| `backend/apps/webstore/serializers/tenant_serializers.py` | Create | Serializers for authenticated tenant admin API |
| `backend/apps/webstore/services/theme_service.py` | Create | Install/publish/discard theme logic |
| `backend/apps/webstore/services/collection_service.py` | Create | Automated collection product resolution |

---

## 4. The `HasWebstoreFeature` Permission Class

Create in `backend/apps/webstore/permissions.py`.

This DRF permission class must be applied to every tenant admin webstore endpoint. It enforces two things:
1. The user is authenticated and has a tenant
2. The tenant's active subscription plan includes `{"id": "webstore", "enabled": true}` in `Plan.features`

**Logic:**
- If `request.user` is `SUPER_ADMIN` → grant access always (superadmins can access everything)
- If `request.user.tenant` is None → deny
- Get the tenant's active subscription via `tenant.subscriptions.filter(status__in=["ACTIVE", "TRIALING"]).select_related("plan").first()`
- If no active subscription → deny with message: "Your plan does not include the Webstore feature."
- Iterate `subscription.plan.features`: if any entry has `id == "webstore"` and `enabled == True` → grant access
- Otherwise → deny

**Custom `message` attribute:** Set `message = "Your plan does not include the Webstore feature. Please upgrade to a plan that includes the Webstore add-on."` — this message surfaces directly in the API response as `{"detail": "..."}` with HTTP 403.

**Important:** This permission class does NOT check whether the individual user has specific webstore permissions (e.g., `webstore.manage`). That is handled by a separate permission check in views that require finer-grained control. `HasWebstoreFeature` only checks the tenant's plan.

---

## 5. Webstore Management Endpoints

### 5.1 `GET /api/webstore/config/`

**Purpose:** Returns the complete webstore configuration for the current tenant. Used by the admin UI home page, settings page, and as the initial state for the customizer.

**Permission classes:** `[IsAuthenticated, HasWebstoreFeature]`

**Response:**
- `webstore` — the `TenantWebstore` record for this tenant (all fields)
- `active_config` — the ACTIVE `TenantThemeConfig` (id, status, theme name, published_at, config preview — just global_settings and template names, not the full config)
- `draft_config` — the DRAFT `TenantThemeConfig` if one exists (same shape as active_config)
- `has_webstore` — boolean: whether `TenantWebstore` exists and `is_enabled = True`

**If no `TenantWebstore` exists yet:** Return 200 with `{"has_webstore": false, "webstore": null}`. The UI uses this to show the first-time setup wizard (Phase 4).

### 5.2 `POST /api/webstore/setup/`

**Purpose:** First-time webstore activation. Creates the `TenantWebstore` record and installs the selected theme (or default theme if none specified).

**Permission classes:** `[IsAuthenticated, HasWebstoreFeature]`

**Request body:**
- `theme_id` — optional UUID; if omitted, the default theme is used
- `seo_title` — string (optional)
- `seo_description` — string (optional)

**Actions performed:**
1. Create `TenantWebstore` with `is_enabled = True`
2. Install the theme: create a `TenantThemeConfig` with `status = ACTIVE`, cloned from `WebstoreTheme.default_config`
3. Create two default menus: "Main Menu" with `handle = "main-menu"` and "Footer" with `handle = "footer"`

**Idempotency:** If `TenantWebstore` already exists, return 400 with `{"detail": "Webstore is already set up. Use PATCH /api/webstore/settings/ to update settings."}`.

### 5.3 `PUT/PATCH /api/webstore/settings/`

**Purpose:** Update webstore settings (SEO, domain, cart settings, customer accounts setting).

**Permission classes:** `[IsAuthenticated, HasWebstoreFeature]`

**Updatable fields:** `seo_title`, `seo_description`, `social_image_url`, `storefront_domain`, `cart_settings`, `customer_accounts`, `is_password_protected`, `store_password` (plain text — hash before saving, never store plain text)

**When `is_password_protected` is set to True and no `store_password` is provided:** Return 400 with `{"store_password": ["A password is required when enabling password protection."]}`.

**When `storefront_domain` is updated:** Validate that the domain is not already claimed by another tenant. Return 400 if it is.

---

## 6. Theme Management Endpoints

### 6.1 `GET /api/webstore/themes/`

**Purpose:** Browse the theme marketplace — lists all published themes available to install.

**Permission classes:** `[IsAuthenticated, HasWebstoreFeature]`

**Response:** Array of theme objects. For each theme:
- `id`, `name`, `slug`, `description`, `category`, `version`
- `preview_image_url`, `preview_images`
- `is_free`, `price_lkr`
- `author`
- `is_installed` — boolean: whether this tenant has already installed this theme (check if any `TenantThemeConfig` with this `theme_id` exists for this tenant)

**Query params:** `category` (filter), `is_free` (boolean filter)

### 6.2 `POST /api/webstore/themes/<theme_id>/install/`

**Purpose:** Install a theme for the tenant. Clones the theme's `default_config` into a new `TenantThemeConfig` with `status = DRAFT`.

**Permission classes:** `[IsAuthenticated, HasWebstoreFeature]`

**Service logic (in `theme_service.py`):**
1. Fetch `WebstoreTheme` by `theme_id` — 404 if not found or not published
2. If the theme is not free, check whether the tenant has paid for it (via `TenantThemeConfig.purchased_blocks` or a separate purchase record). Return 403 if not purchased.
3. Perform a deep copy of `WebstoreTheme.default_config` — do NOT reference the same dict object
4. Create a new `TenantThemeConfig(tenant=tenant, theme=theme, status=DRAFT, config=deep_copied_config)`
5. Do NOT touch any existing ACTIVE config — the merchant must publish the new theme explicitly

**Response:** The newly created `TenantThemeConfig` id and status.

**If already has a DRAFT:** Return 400 with `{"detail": "You already have a draft theme config. Discard it or publish it before installing a new theme."}`.

### 6.3 `GET /api/webstore/my-themes/`

**Purpose:** Lists all `TenantThemeConfig` records for this tenant.

**Response:** Array with id, theme name, status, published_at, updated_at for each config.

---

## 7. Customizer Endpoints

These endpoints are specifically designed for the visual customizer (Phase 5). They operate on the DRAFT config only.

### 7.1 `GET /api/webstore/customizer/active-config/`

**Purpose:** Returns the full ACTIVE `TenantThemeConfig` object. Used to initialize the customizer with the currently live state.

**Response:** Full `config` JSON + meta: `id`, `theme_id`, `theme_name`, `status`, `published_at`

**If no ACTIVE config exists:** Return the default theme config as if it were active — never 404.

### 7.2 `GET /api/webstore/customizer/draft-config/`

**Purpose:** Returns the full DRAFT `TenantThemeConfig`. If no DRAFT exists, creates one by deep-copying the current ACTIVE config.

**This "create draft on demand" behavior is important:** The customizer always works on a DRAFT. If the merchant opens the customizer and there's no draft, one is created automatically from the current live state.

**Response:** Same shape as active-config endpoint.

### 7.3 `PATCH /api/webstore/customizer/draft-config/`

**Purpose:** Partial update of the draft config's `config` JSON. This is called by the customizer's auto-save logic every 3 seconds. It must be fast and low-cost.

**Request body:** A partial JSON patch. Two update modes must be supported:

**Mode 1 — Full config replacement** (used when first loading or resetting): Send `{"config": {...full config object...}}` to replace the entire `config` field.

**Mode 2 — Section-level update** (used for live editing): Send `{"section_id": "...", "template": "index", "settings": {...}}` to update just one section's settings within the config. The service layer merges this into the full config.

**Mode 3 — Global settings update**: Send `{"global_settings": {...}}` to update only the global settings portion of the config.

The endpoint must NOT allow updating the ACTIVE config through this endpoint — only DRAFT.

**Response:** `{"status": "saved", "updated_at": "ISO timestamp"}`

**Atomicity note:** When updating just a section's settings, the service must read the current DRAFT config, apply the patch, and save the full object back. Use `select_for_update()` to prevent race conditions if two browser tabs are editing simultaneously.

### 7.4 `POST /api/webstore/customizer/publish/`

**Purpose:** Promotes the DRAFT config to ACTIVE. This makes the customizer changes live for consumers. This is the most impactful action in the entire customizer.

**Actions performed by the service (`theme_service.publish_draft`):**
1. Fetch the DRAFT config — 404 if no draft exists
2. Set `TenantThemeConfig.status = ACTIVE` on the DRAFT and set `published_at = now()`
3. Find any existing ACTIVE config(s) for this tenant — set their `status` to `"ARCHIVED"` (add a third TextChoices value `ARCHIVED` for this)
4. Trigger cache invalidation — call the Next.js revalidation API (see Phase 10 for the full implementation; in this phase, make the call but handle failure gracefully with a try/except that logs the error without interrupting the publish)
5. Return the now-published config summary

**Response:** `{"status": "published", "config_id": "uuid", "published_at": "ISO"}`

**Concurrency note:** Wrap steps 2-3 in `django.db.transaction.atomic()` to ensure no tenant ends up with two ACTIVE configs.

### 7.5 `POST /api/webstore/customizer/discard-draft/`

**Purpose:** Discards the DRAFT config and resets to the ACTIVE state. Used when a merchant wants to undo all customizer changes.

**Actions:**
1. Delete the DRAFT `TenantThemeConfig` record
2. Return `{"status": "discarded"}`

**If no DRAFT exists:** Return 400 with `{"detail": "No draft to discard."}`.

### 7.6 `GET /api/webstore/blocks/`

**Purpose:** Returns all available block definitions for the tenant. Used by the customizer's "Add Section" panel to show what blocks the merchant can add.

**Response:** Array of block objects with: `type`, `name`, `description`, `schema`, `nested_blocks_schema`, `preview_image_url`, `is_premium`, `sort_order`

For premium blocks: also include `is_unlocked` — whether this tenant has purchased this block (check `TenantThemeConfig.purchased_blocks`).

**Query params:** `type` (filter by specific block type)

---

## 8. Content Management Endpoints (Menus, Collections, Pages)

All content endpoints follow the same pattern: tenant-scoped CRUD, with the tenant resolved from `request.user.tenant`.

### 8.1 Menu Endpoints

**`GET /api/webstore/menus/`** — List all menus for this tenant. Returns: id, title, handle, item_count (len of items array), updated_at.

**`POST /api/webstore/menus/`** — Create a menu. Required fields: `title`, `handle`. Optional: `items` (defaults to empty list). Validate that `handle` is unique within the tenant.

**`GET /api/webstore/menus/<id>/`** — Full menu detail including the complete `items` tree.

**`PUT /api/webstore/menus/<id>/`** — Full update. Replace the entire `items` array on each save (the frontend sends the complete new tree).

**`DELETE /api/webstore/menus/<id>/`** — Delete the menu. Check first if the menu's `handle` is referenced in the active theme config's header or footer settings. If so, return 400 with a warning rather than allowing the delete — the merchant should update their theme config first.

### 8.2 Collection Endpoints

**`GET /api/webstore/collections/`** — List all webstore collections. Returns summary: id, title, handle, collection_type, product_count (computed), is_published, created_at.

**`POST /api/webstore/collections/`** — Create a collection. `handle` must be auto-generated from `title` using `django.utils.text.slugify` if not provided. Validate uniqueness within tenant.

**`GET /api/webstore/collections/<id>/`** — Full collection detail. Include the resolved product list (first page, default sort).

**`PUT /api/webstore/collections/<id>/`** — Full update.

**`DELETE /api/webstore/collections/<id>/`** — Delete. Check if the collection is referenced in any menu item (`items` JSON). Warn the merchant if so.

**`PATCH /api/webstore/collections/<id>/products/`** — Add or remove products from manual collections. Request body: `{"add": ["product_uuid", ...], "remove": ["product_uuid", ...]}`. Only valid for `collection_type = "manual"`. Returns 400 if called on an automated collection.

### 8.3 Page Endpoints

**`GET /api/webstore/pages/`** — List all pages. Returns: id, title, handle, is_published, updated_at.

**`POST /api/webstore/pages/`** — Create a page. Sanitize `body_html` on save using the `bleach` library with a safe allowlist of HTML tags and attributes. Auto-generate `handle` from `title` if not provided.

**`GET /api/webstore/pages/<id>/`** — Full page detail.

**`PUT /api/webstore/pages/<id>/`** — Full update. Re-sanitize `body_html` on every save.

**`DELETE /api/webstore/pages/<id>/`** — Delete.

---

## 9. Tenant Serializer Design

Create `backend/apps/webstore/serializers/tenant_serializers.py`.

All tenant admin serializers must:
- Use explicit field lists (no `__all__`)
- Make `tenant` a read-only field that is automatically set from `request.user.tenant` in the view's `perform_create` — never accept tenant from the request body
- Validate uniqueness constraints (handle uniqueness within tenant, domain uniqueness globally)

Key serializers:

| Serializer | Key Behaviors |
|---|---|
| `TenantWebstoreSerializer` | Validates `storefront_domain` uniqueness; hashes `store_password` if provided; never returns raw `store_password_hash` |
| `TenantThemeConfigListSerializer` | Summary only — id, theme name, status, published_at, updated_at |
| `TenantThemeConfigDetailSerializer` | Full config JSON included |
| `WebstoreMenuSerializer` | Validates `handle` slug format; validates uniqueness within tenant |
| `WebstoreCollectionSerializer` | Auto-slugifies handle; validates filter_rules structure for automated collections |
| `WebstorePageSerializer` | Sanitizes `body_html`; auto-slugifies handle |

---

## 10. Collection Service

Create `backend/apps/webstore/services/collection_service.py`.

### 10.1 `resolve_automated_collection_products(collection)` → Product queryset

Accepts a `WebstoreCollection` instance with `collection_type = "automated"`. Builds and returns a Django queryset applying all filter rules.

Rule application:
- Build a list of Q objects from `filter_rules`
- Combine with `AND` if `filter_conjunction = "AND"`, or with `Q | Q` if `"OR"`
- Always append: `is_active=True`, `is_published=True`, `tenant=collection.tenant`

### 10.2 `get_collection_product_count(collection)` → integer

Used by the list serializer to show product counts. For manual: `len(manual_product_ids)`. For automated: `resolve_automated_collection_products(collection).count()`.

This must be efficient — use `.count()` not `len(queryset)`.

---

## 11. Theme Service

Create `backend/apps/webstore/services/theme_service.py`.

### 11.1 `install_theme(tenant, theme)` → TenantThemeConfig

Creates a DRAFT config from the theme's `default_config`. Ensures only one DRAFT exists at a time (raise `ValidationError` if one already exists).

### 11.2 `publish_draft(tenant)` → TenantThemeConfig

Promotes DRAFT → ACTIVE. Archives old ACTIVE. Runs in a DB transaction. Calls cache invalidation hook.

### 11.3 `discard_draft(tenant)` → None

Deletes the DRAFT config. Validates one exists before attempting delete.

### 11.4 `update_draft_section(tenant, template, section_id, settings)` → TenantThemeConfig

Finds the DRAFT config, updates the specified section's settings within the config JSON, and saves. Must merge settings (not replace) so that settings not included in the partial update are preserved.

### 11.5 `update_draft_global_settings(tenant, global_settings)` → TenantThemeConfig

Merges the provided global_settings dict into `config["global_settings"]`. Deep merge — individual color keys can be updated without wiping other color keys.

---

## 12. Security Considerations

### 12.1 Tenant Isolation
Every view must filter by `request.user.tenant`. The following injection scenario must be impossible: a user from Tenant A sends a request with a collection `id` belonging to Tenant B. Always filter by both `id` AND `tenant`:
`WebstoreCollection.objects.get(id=pk, tenant=request.user.tenant)` — never just `get(id=pk)`.

### 12.2 Password Hashing
The `TenantWebstore.store_password_hash` field must store a proper hash (Django's `make_password()`), not plain text or a simple checksum. The serializer's `validate()` method must detect when a plain password is submitted and call `make_password()` before saving to the `store_password_hash` field. The field name in the serializer should be `store_password` (write-only) — map it to `store_password_hash` in `create()`/`update()`.

### 12.3 HTML Sanitization
The `body_html` field in `WebstorePageSerializer` must sanitize HTML on every write using `bleach`. A suitable allowlist for a rich text editor includes: `p, h1, h2, h3, h4, h5, h6, strong, em, u, a, ul, ol, li, blockquote, br, hr, img`. Allowed attributes: `href` (on a), `src, alt, width, height` (on img), `class` (on all). Strip `onclick`, `onload`, `style` with arbitrary values, and any `<script>` tags entirely.

---

## 13. Verification Checklist

- [ ] A logged-in OWNER user with a webstore-enabled plan can `GET /api/webstore/config/`
- [ ] A logged-in user without the webstore feature in their plan gets HTTP 403 with the feature gating message
- [ ] `POST /api/webstore/setup/` creates `TenantWebstore` + ACTIVE `TenantThemeConfig` + 2 default menus
- [ ] `POST /api/webstore/themes/<id>/install/` creates a DRAFT config from the theme's default_config
- [ ] `PATCH /api/webstore/customizer/draft-config/` updates a specific section's settings in the DRAFT
- [ ] `POST /api/webstore/customizer/publish/` promotes DRAFT to ACTIVE and archives old ACTIVE
- [ ] Menu CRUD works — creating, updating with nested items tree, and deleting works
- [ ] Collection CRUD works — automated collection with a tag rule returns matching products
- [ ] Page CRUD works — HTML is sanitized on save (try injecting `<script>` tags and verify they are stripped)
- [ ] Accessing Tenant B's collection ID while authenticated as Tenant A's user returns 404
