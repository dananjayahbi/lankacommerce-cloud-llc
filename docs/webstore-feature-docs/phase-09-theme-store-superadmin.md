# Phase 9: Theme Store & SuperAdmin Block Management

**Phase:** 9 of 10  
**Depends on:** Phase 1 (WebstoreTheme and WebstoreBlock models), Phase 3 (tenant admin theme installation API), Phase 4 (theme marketplace browser in admin UI)  
**Unlocks:** Phase 10 (custom themes can be version-managed without breaking tenant configs)  
**Estimated Scope:** Backend (SuperAdmin APIs) + Frontend (SuperAdmin UI + enhanced merchant theme browser)

---

## 1. Overview

This phase completes the theme marketplace ecosystem. It gives the platform SuperAdmin the ability to:
- Upload and manage themes in the marketplace catalog
- Create and manage block type definitions
- Publish/unpublish themes and blocks
- Monitor which tenants have installed which themes

It also enhances the merchant's theme store experience (first implemented in Phase 4) with:
- A preview modal that shows the theme rendering with sample data
- Category filters and better browsing
- The full premium theme purchase flow (hooking into the billing system)
- Theme version management (how to update a theme without breaking existing tenant configs)

---

## 2. Existing System Context

### 2.1 SuperAdmin Route Group

The existing `(superadmin)` route group in the frontend provides tools for platform management. Look at `frontend/src/app/(superadmin)/` to understand its layout, sidebar navigation, and authentication pattern. SuperAdmin users have `role = "SUPERADMIN"` in their JWT, which is verified by the middleware. The new theme management pages follow the same layout and auth pattern.

### 2.2 Existing Django Admin vs. Custom UI

Some platform management is done via Django Admin (`/admin/`). For Phase 9, create dedicated API endpoints and custom React UI rather than relying on Django Admin for themes and blocks — because the JSON editors for `default_config` and `schema` need to be rich experiences (not the default Django admin textarea).

However, Django Admin should still have inline list displays for `WebstoreTheme` and `WebstoreBlock` as a fallback (this was set up in Phase 1's admin.py).

### 2.3 SuperAdmin Authentication in Backend

Staff API endpoints are guarded by `IsAuthenticated` + `IsSuperAdmin` (or similar permission class). Look at `backend/apps/accounts/permissions.py` for the existing permission classes. The SuperAdmin theme endpoints must use the same `IsSuperAdmin` permission class already defined there.

---

## 3. Backend: SuperAdmin API Endpoints

All SuperAdmin webstore endpoints are under the `/api/webstore/admin/` prefix. Define them in `backend/apps/webstore/urls.py` with a separate `admin_urlpatterns` list.

### 3.1 Theme Management Endpoints

**`GET /api/webstore/admin/themes/`**

Returns a paginated list of all marketplace themes (published and unpublished). Fields include everything in `WebstoreTheme` plus aggregate stats: `tenant_count` (how many tenants have installed this theme).

**`POST /api/webstore/admin/themes/`**

Creates a new theme. Required fields: `name`, `slug`, `category`, `description`, `is_free`. Optional: `price`, `preview_image_urls` (list of image URLs), `supported_sections` (list of block type strings), `global_settings_schema` (JSON), `default_config` (JSON).

Validation:
- `slug` must be unique, lowercase, URL-safe (no spaces, only hyphens)
- `default_config` must be valid JSON that passes the `TenantThemeConfig.config` schema validation (verify that the global_settings, layout, and templates keys exist)
- `supported_sections` must only contain block type strings that exist in `WebstoreBlock` records
- `price` must be > 0 if `is_free = false`

**`GET /api/webstore/admin/themes/<id>/`**

Returns the full theme detail including `default_config` and `global_settings_schema`.

**`PUT /api/webstore/admin/themes/<id>/`**

Full update. Same validation as POST. Note: updating `default_config` on a published theme that tenants have installed requires the version bump logic described in Section 3.4.

**`PATCH /api/webstore/admin/themes/<id>/`**

Partial update. Use for toggling `is_published` or updating metadata without touching the config.

**`PATCH /api/webstore/admin/themes/<id>/publish/`**

Shortcut to set `is_published = True`. Validates that the theme has at least one preview image and a valid `default_config` before allowing publication.

**`PATCH /api/webstore/admin/themes/<id>/unpublish/`**

Sets `is_published = False`. Themes can be unpublished even if tenants have installed them — it only prevents new installations; existing tenants keep their config.

**`GET /api/webstore/admin/themes/<id>/tenants/`**

Returns a paginated list of tenants that have installed this theme (any `TenantThemeConfig` record pointing to this theme). Useful for impact analysis before updating the theme.

### 3.2 Block Definition Endpoints

**`GET /api/webstore/admin/blocks/`**

Returns all block type definitions, ordered by `type`. Both published and unpublished.

**`POST /api/webstore/admin/blocks/`**

Creates a new block type definition. Required fields: `type` (must match a registered `react_component_key` in the frontend), `name`, `schema` (JSON — must be a valid block schema).

Validation for `schema`:
- Must be a JSON array
- Each element must have: `id` (string), `type` (must be one of the 17 supported setting types), `label` (string)
- For `type = "select"` or `type = "radio"`: must include an `options` array
- For `type = "range"`: must include `min`, `max`, and `step`

**`PUT /api/webstore/admin/blocks/<id>/`**

Full update. If updating the schema of a published block, the system must log a warning that existing tenant configs using this block may have missing settings (they are handled by the `configMerger` on the frontend).

**`PATCH /api/webstore/admin/blocks/<id>/publish/`**

Marks the block as available for use in tenant theme configs.

### 3.3 Tenant Theme Install Stats

**`GET /api/webstore/admin/stats/`**

Returns platform-wide webstore statistics:
- `total_enabled_webstores` — tenants with `TenantWebstore.is_enabled = True`
- `total_orders_today` — count of `WebstoreOrder` records created today across all tenants
- `top_themes` — list of top 5 most-installed themes with install counts
- `total_revenue_today` — sum of `WebstoreOrder.total` for paid orders today

### 3.4 Theme Versioning

When a SuperAdmin updates a published theme's `default_config`, existing tenant configs might break if they rely on sections or settings that have been removed.

**Strategy:** Add a `version` integer field to `WebstoreTheme` (auto-increments on update). When a SuperAdmin saves changes to a published theme:
1. Increment `version`
2. Log the change to `apps.audit` with the old and new `default_config` (for rollback reference)
3. Do NOT automatically update existing tenant `TenantThemeConfig` records — let them keep their current config
4. The `configMerger` (Phase 6) handles missing settings by filling in schema defaults

**"Force Update" option:** Add a `PATCH /api/webstore/admin/themes/<id>/force-update-tenants/` endpoint that, when called, creates a new DRAFT `TenantThemeConfig` for each tenant using this theme (based on the new `default_config`) and marks it for admin review. This is an irreversible operation — require explicit confirmation.

---

## 4. Frontend: SuperAdmin Theme Management UI

### 4.1 Route Structure

New pages in `frontend/src/app/(superadmin)/webstore/`:

| File | Route | Purpose |
|---|---|---|
| `themes/page.tsx` | `/superadmin/webstore/themes` | Theme list with create button |
| `themes/new/page.tsx` | `/superadmin/webstore/themes/new` | Theme creation form |
| `themes/[id]/page.tsx` | `/superadmin/webstore/themes/<id>` | Theme detail and edit |
| `blocks/page.tsx` | `/superadmin/webstore/blocks` | Block definitions list |
| `blocks/new/page.tsx` | `/superadmin/webstore/blocks/new` | Block creation form |
| `blocks/[id]/page.tsx` | `/superadmin/webstore/blocks/<id>` | Block detail and edit |
| `stats/page.tsx` | `/superadmin/webstore/stats` | Webstore platform stats |

Add "Webstore" to the SuperAdmin sidebar navigation, with sub-items for Themes, Blocks, and Stats.

### 4.2 Theme List Page

A data table with columns: Theme Name, Slug, Category, Status (Published/Draft badge), Price (Free/LKR amount), Install Count, Actions.

Filter controls: Status filter (All / Published / Draft), Category filter dropdown.

Actions per row: Edit, Publish/Unpublish toggle, View Installed Tenants.

"New Theme" button opens the creation form.

### 4.3 Theme Creation / Edit Form

A multi-section form:

**Section 1: Basic Info**
- Name (text input)
- Slug (text input — auto-generated from name, editable)
- Category (select: General, Fashion, Food, Electronics, Home & Garden, Service)
- Short Description (textarea, max 200 chars)
- Long Description (rich text or textarea)

**Section 2: Pricing**
- Free / Paid toggle
- Price (shown if Paid, in LKR)

**Section 3: Preview Images**
- Image URL list (add multiple URLs — for Phase 9, URL input is sufficient; full upload comes in Phase 10)
- Primary image: the first URL in the list

**Section 4: Supported Sections**
- Multi-select checkbox list of all available block types (fetched from `GET /api/webstore/admin/blocks/`)

**Section 5: Global Settings Schema**
- A JSON textarea with syntax highlighting (use a `<textarea>` styled like a code editor — or a lightweight library like `react-simple-code-editor` if already in the project)
- A "Validate JSON" button that checks the JSON is valid
- The textarea shows a JSON schema template as placeholder

**Section 6: Default Config**
- JSON textarea (same as above) for the theme's starting `TenantThemeConfig.config` structure
- "Validate Config" button that checks against the config schema
- Warning: "Changing this on a published theme may affect existing installations"

**Submit:** On save, show success toast. On validation error, show field-level errors. On JSON validation errors, highlight the JSON textarea with the error message.

### 4.4 Block Definitions List and Form

**Block list:** Table with columns: Type (code font), Name, Status badge, Schema (truncated), Actions.

**Block creation form:**
- Type (text input — must match a registered component key in the frontend `BLOCK_REGISTRY`)
- Name (display name)
- Schema JSON editor with:
  - "Add Setting" button that appends a new setting template to the JSON
  - Each setting type has a template with the required fields for that type
  - Validation feedback

**Important note for implementors:** The `react_component_key` must match exactly what is registered in `BLOCK_REGISTRY` (Phase 6). If they don't match, the block renders as a placeholder. Add a warning in the form: "The type must match the key in the frontend block registry."

### 4.5 Webstore Stats Dashboard

A simple dashboard page with metric cards:
- Total Webstores Enabled (count, with "X% of all tenants" subtitle)
- Today's Orders (count)
- Today's Revenue (LKR amount)
- Top 5 Themes (bar chart or simple ordered list)

Refresh button (since this is real-time operational data, not ISR-cached).

---

## 5. Enhanced Merchant Theme Browser

Phase 4 built the basic theme marketplace browser for merchants at `/store/webstore/themes/`. This phase enhances it.

### 5.1 Category Filter and Free/Paid Toggle

Add to the theme browser:
- Horizontal category filter pills: All | Fashion | Food | Electronics | etc.
- "Free" / "Paid" / "All" toggle (3 options)
- Sort: Newest | Popular (by install count) | Name A–Z

These filters are applied client-side if the full theme catalog is small (< 50 themes), or via API query params if larger.

### 5.2 Theme Preview Modal

When a merchant clicks "Preview" on a theme card, open a modal containing:

**Left/top panel:** Theme info — name, description, category, pricing, screenshots carousel (the `preview_image_urls`)

**Right/bottom panel:** A live iFrame preview showing the theme rendering with sample/placeholder data

**iFrame URL:** `/webstore-preview/sample/?theme_id=<id>` — the preview route (Phase 5) must support a `theme_id` query param that loads `WebstoreTheme.default_config` instead of the tenant's active config.

**Backend support needed:** The preview config endpoint must also accept `?theme_id=<id>` to return the theme's `default_config` as a mock `TenantThemeConfig` response. This allows the iFrame to render without requiring the tenant to install the theme.

**Modal size:** Full-screen or at least 90vw × 90vh to give a meaningful preview.

### 5.3 Theme Installation Flow

When a merchant clicks "Use This Theme" on a free theme:
1. Show a confirmation dialog: "Switching themes will create a new draft. Your current published theme remains active until you publish the new one. Continue?"
2. On confirm: `POST /api/webstore/tenants/themes/install/` (Phase 3) with `{theme_id: <id>}`
3. On success: redirect to the Theme Customizer (`/store/webstore/customizer/`)

For paid themes:
1. Check if the current plan includes the premium theme feature
2. If not: show an upgrade prompt (same pattern as the feature gate in Phase 4)
3. If yes (or if the tenant has "purchased" the theme via a plan upgrade): same flow as free theme

**Phase 9 simplification:** The actual payment for premium themes is deferred. For now, premium themes require the tenant to be on a plan that includes `"premium_themes"` in `Plan.features`. The SuperAdmin can toggle this manually.

---

## 6. Security Considerations

### 6.1 SuperAdmin-Only Enforcement

Every `POST`, `PUT`, `PATCH`, and `DELETE` on `/api/webstore/admin/*` must be guarded by the `IsSuperAdmin` permission class. A tenant admin (even a store owner) must never be able to create or modify theme definitions in the marketplace catalog.

### 6.2 JSON Schema Validation

The `schema` and `default_config` fields accept arbitrary JSON. Validate these server-side:
- Must be valid JSON (not just a string)
- `schema` arrays must conform to the setting type constraints
- `default_config` must pass the structural validation (has the required top-level keys)

Reject invalid JSON with a 400 response and specific error messages. Never evaluate or execute the JSON as code.

### 6.3 Slug Uniqueness

Theme slugs are used in URLs and as identifiers. Enforce uniqueness at the database level (unique constraint on `WebstoreTheme.slug`) AND at the serializer validation level. Auto-generate slugs from names but allow manual override.

---

## 7. Verification Checklist

- [ ] SuperAdmin can navigate to `/superadmin/webstore/themes/` and see the theme list
- [ ] SuperAdmin can create a new theme with valid name, category, preview images, and `default_config`
- [ ] Creating a theme with invalid JSON in `default_config` returns a validation error
- [ ] SuperAdmin can publish and unpublish a theme
- [ ] Published theme appears in the merchant's theme browser at `/store/webstore/themes/`
- [ ] Unpublishing a theme removes it from the merchant's browser
- [ ] SuperAdmin can create a new block type definition
- [ ] Creating a block with an invalid schema returns a validation error
- [ ] Merchant can filter themes by category and by free/paid
- [ ] Clicking "Preview" on a theme opens the modal with the iFrame preview
- [ ] The iFrame preview renders the theme's `default_config` with sample data
- [ ] Merchant can install a free theme (creates a draft `TenantThemeConfig`)
- [ ] After installing a theme, the merchant is redirected to the Theme Customizer
- [ ] Installing a premium theme without the right plan shows the upgrade prompt
- [ ] `GET /api/webstore/admin/stats/` returns platform statistics
- [ ] `GET /api/webstore/admin/themes/<id>/tenants/` returns tenants using that theme
- [ ] A staff JWT with role "MANAGER" cannot access `/api/webstore/admin/themes/` (403)
