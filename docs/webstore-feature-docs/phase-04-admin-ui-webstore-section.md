# Phase 4: Admin UI — Webstore Management Section

**Phase:** 4 of 10  
**Depends on:** Phase 3 (tenant admin API must be functional)  
**Unlocks:** Phase 5 (Customizer) builds on the webstore section infrastructure created here  
**Estimated Scope:** Frontend only (Next.js admin pages)

---

## 1. Overview

This phase builds the webstore management section inside the existing store admin dashboard. It creates a new set of pages under `/store/webstore/` that allow store owners to:

- Activate and configure their webstore for the first time (guided setup wizard)
- Manage navigation menus (drag-and-drop editor)
- Manage product collections (manual and automated)
- Create and edit static pages (rich text editor)
- View webstore orders
- Configure global webstore settings (SEO, domain, checkout behavior)
- Browse and install themes from the theme marketplace

This phase does NOT include the visual theme customizer (that is Phase 5). The customizer gets its own full-screen page. This phase includes everything else: the management hub, data management pages (menus, collections, pages), and the settings panel.

---

## 2. Existing Frontend Context

### 2.1 Store Admin Architecture

The store admin lives in `frontend/src/app/(store)/`. Inside it is a `store/` directory containing all admin pages. The layout is `frontend/src/app/(store)/layout.tsx` (or a nested layout).

Key existing patterns to follow:
- All pages under `(store)/store/` require authentication (enforced by `src/middleware.ts`)
- The store sidebar (`StoreSidebar.tsx` in `src/components/`) provides navigation
- Pages use the existing `PageHeader` component for titles and breadcrumbs (look in `src/components/` for this)
- Data fetching uses standard `fetch()` calls with the `access_token` cookie forwarded, or a custom API client (look for `src/lib/api.ts` or equivalent)
- Form handling uses React Hook Form + Zod validation
- UI components come from the Shadcn UI component library (already installed: Button, Input, Label, Card, Dialog, Table, Badge, etc.)
- Toast notifications use Sonner (already installed as `sonner`)

### 2.2 Permission Gating Pattern

Look at how existing pages check permissions. In the middleware and page components, `can("permission.string")` is used to conditionally render UI. Add the webstore permissions added in Phase 1 to the permissions checking pattern.

### 2.3 Existing Navigation Sidebar

The `StoreSidebar.tsx` component renders navigation items. Each navigation group has items with icons, labels, and href paths. Add a "Webstore" group to the sidebar, containing the webstore sub-pages, gated by `can("webstore.access")`.

The webstore sidebar group should appear after "Promotions" and before "Reports" in the existing ordering.

### 2.4 API Client Pattern

Study how existing pages call backend APIs. There is likely a helper (e.g., `fetchWithAuth()`) that attaches the JWT from cookies. All new webstore pages should use this same pattern, calling the Django backend at `process.env.NEXT_PUBLIC_API_URL` (check the existing env variable names used in the codebase).

---

## 3. File Structure for This Phase

All new files are under `frontend/src/app/(store)/store/webstore/`:

| File | Purpose |
|---|---|
| `page.tsx` | Webstore hub / overview dashboard |
| `settings/page.tsx` | Global webstore settings (SEO, domain, checkout, customer accounts) |
| `themes/page.tsx` | Theme marketplace browser (install themes) |
| `menus/page.tsx` | Navigation menu list |
| `menus/[id]/page.tsx` | Individual menu editor (drag-and-drop tree) |
| `menus/new/page.tsx` | Create new menu |
| `collections/page.tsx` | Collections list |
| `collections/[id]/page.tsx` | Edit collection (manual or automated) |
| `collections/new/page.tsx` | Create collection |
| `pages/page.tsx` | Static pages list |
| `pages/[id]/page.tsx` | Edit page (rich text editor) |
| `pages/new/page.tsx` | Create page |
| `orders/page.tsx` | Webstore orders list |
| `orders/[id]/page.tsx` | Order detail + fulfillment actions |
| `customers/page.tsx` | Consumer customers list |
| `customers/[id]/page.tsx` | Customer detail |

Supporting component files:

| File | Purpose |
|---|---|
| `src/components/webstore/admin/WebstoreSetupWizard.tsx` | First-time activation wizard |
| `src/components/webstore/admin/MenuItemTree.tsx` | Recursive drag-and-drop menu tree |
| `src/components/webstore/admin/CollectionProductPicker.tsx` | Product picker for manual collections |
| `src/components/webstore/admin/CollectionRuleEditor.tsx` | Rule builder for automated collections |
| `src/components/webstore/admin/RichTextEditor.tsx` | Rich text editor component (wraps Tiptap or similar) |
| `src/components/webstore/admin/ThemeCard.tsx` | Theme display card for the theme browser |
| `src/components/webstore/admin/WebstoreOrderRow.tsx` | Order row component for the orders table |

---

## 4. Feature Gate: Upgrade Prompt

If the current tenant's plan does NOT include the webstore feature, every page under `/store/webstore/` must show an upgrade prompt instead of the actual page content.

This should be a reusable component (`WebstoreUpgradePrompt.tsx`) shown as the page content when the feature is not available. It should:
- Display the webstore feature description (what they'll get by upgrading)
- Show a "Upgrade Plan" CTA button that links to the billing/plan page (`/store/billing/` or equivalent)
- Use the tenant's branding colors (from the existing store theme)
- Not show any webstore-specific UI at all — the user should not see partially rendered content

**Detection:** The frontend determines webstore availability by checking either:
1. The user's permissions list includes `"webstore.access"` — if added in Phase 1 only for webstore-enabled tenants, this is sufficient
2. Or by calling `GET /api/webstore/config/` and checking the response — use this if the permissions approach is insufficient

Add the feature availability check to the `/store/webstore/` layout so it applies to all sub-pages without repeating the check in each page.

---

## 5. The Webstore Hub Page (`page.tsx`)

**Route:** `/store/webstore/`

This is the first page the merchant sees when clicking "Webstore" in the sidebar. Its behavior depends on whether the webstore has been set up:

### 5.1 First-Time State (No TenantWebstore Record)

Show the `WebstoreSetupWizard` component (see Section 7). Do not show the hub dashboard at all — replace the entire page content with the wizard.

### 5.2 Active Webstore State

Show the overview dashboard with:

**Status Card:**
- Webstore status: Live (green badge) or Offline (gray badge), based on `TenantWebstore.is_enabled`
- A toggle button to enable/disable the webstore immediately
- Storefront URL displayed as a clickable link: `https://<slug>.lankacommerce.com/`
- If custom domain is set: show that instead

**Quick Stats row (4 cards):**
- Total webstore orders (count from last 30 days)
- Webstore revenue (sum of totals from last 30 days)
- Total active collections
- Total published pages

**Quick Action buttons:**
- "Open Visual Customizer" → `/store/webstore/customize`
- "Manage Products" → `/store/inventory` (existing page)
- "View Orders" → `/store/webstore/orders`
- "Store Settings" → `/store/webstore/settings`

**Active Theme Card:**
- Shows the current live theme name and version
- Preview image (small thumbnail)
- "Change Theme" link → `/store/webstore/themes`
- "Edit Live Design" link → `/store/webstore/customize`

---

## 6. Settings Page (`settings/page.tsx`)

**Route:** `/store/webstore/settings`

A form page with multiple settings sections. Use a tab layout or section headers within a single scrollable page.

### 6.1 General Section
- Webstore Title (maps to `TenantWebstore.seo_title`)
- Webstore Description (maps to `TenantWebstore.seo_description`)
- Social Sharing Image (image upload field; maps to `TenantWebstore.social_image_url`)
- Enable/Disable Webstore toggle

### 6.2 Domain Section
- Current URL: display the auto-generated subdomain URL
- Custom Domain field: text input for `storefront_domain`
- Explanatory note: "To use a custom domain, point your CNAME record to storefront.lankacommerce.com"
- Domain verification status indicator (if a custom domain is entered)

### 6.3 Store Password Section
- "Password protect my store" toggle
- Password input field (shown when toggle is on)
- Confirm password field
- Explanatory note: "Visitors will be prompted for this password before viewing your store"

### 6.4 Checkout Settings Section
- Customer Accounts setting: radio buttons for Disabled / Optional / Required
- "Require login to add to cart": toggle
- "Allow order notes": toggle
- "Show shipping calculator in cart": toggle

**Form behavior:**
- Use a single form with all sections, or one form per section with individual "Save" buttons
- Show success toast on save
- Show error toast with the API error message on failure
- Warn if the user tries to navigate away with unsaved changes (use `beforeunload` or the Next.js router event)

---

## 7. First-Time Setup Wizard (`WebstoreSetupWizard.tsx`)

A multi-step guided flow for merchants activating their webstore for the first time.

**Step 1 — Choose a Theme:**
- Display a grid of available themes (from `GET /api/webstore/themes/`)
- Each theme shows a preview image, name, and "Free" or "Premium" badge
- Merchant selects one theme (visual radio button on the card)
- Default selection: the platform's default theme
- "Continue" button advances to Step 2

**Step 2 — Basic Info:**
- "Webstore Title" field — pre-filled with the tenant's business name
- "Webstore Description" field
- "Continue" button advances to Step 3

**Step 3 — Review & Launch:**
- Summary card: chosen theme, entered title and description
- Large "Launch Webstore" CTA button
- Small print: "You can customize the design and add content after launching"
- Clicking "Launch Webstore" calls `POST /api/webstore/setup/` with the selected theme and info

**After successful setup:**
- Show a success animation or confirmation message
- Redirect to the Webstore hub page
- Show a post-setup checklist or tips toast: "Your webstore is live! Here's what to do next: 1. Customize your design, 2. Add products to a collection, 3. Set up your navigation menu"

**Error handling:** If the API call fails, show the error message inline in Step 3 and allow the merchant to retry.

---

## 8. Navigation Menu Editor

### 8.1 Menu List Page (`menus/page.tsx`)

Displays all menus in a simple list with: Title, Handle, Item Count, Last Updated. Two action buttons per row: "Edit" and "Delete". A "Create Menu" button in the page header.

### 8.2 Menu Editor Page (`menus/[id]/page.tsx` and `menus/new/page.tsx`)

This is the most complex page in this phase. It features a drag-and-drop tree editor for menu items.

**Page layout:**
- Left: the menu tree (drag-and-drop reorderable)
- Right: properties panel (shown when a menu item is selected)

**The `MenuItemTree.tsx` component:**
- Renders a recursive tree of menu items
- Each item shows: drag handle, item icon (based on type), title, type badge
- Items can be dragged to reorder (within the same level)
- Items can be nested under other items (drag onto another item) to create dropdown submenus
- Maximum nesting depth: 2 levels (items can have children but not grandchildren)
- Each item has: Edit pencil icon (opens the properties panel), Delete X icon

**When an item is selected (properties panel):**
- Title field
- Link type selector: Collection, Product, Page, URL
- Resource picker (shown when type is not "URL"): a searchable dropdown that fetches available collections/products/pages
- URL field (shown when type is "URL")
- "Open in new tab" toggle (for external URLs)

**"Add Item" button:** Opens a slide-out panel or a dialog to select the item type and resource.

**Save behavior:** The entire menu tree is serialized and sent as `PUT /api/webstore/menus/<id>/` when the merchant clicks "Save". Use optimistic UI — show saved state immediately, then confirm or roll back on API response.

**Library recommendation for drag-and-drop:** Use `@dnd-kit/core` and `@dnd-kit/sortable` — these are already the intended libraries based on the Phase 5 customizer design. Check if they are already in `package.json`; if not, they need to be installed.

---

## 9. Collections Management

### 9.1 Collections List Page (`collections/page.tsx`)

Table of collections with: Title, Handle, Type (Manual/Automated), Product Count, Published status, Created date. Actions: Edit, Delete. "Create Collection" button in header.

### 9.2 Collection Editor (`collections/[id]/page.tsx` and `collections/new/page.tsx`)

**Form fields:**
- Title (required)
- Handle (auto-generated from title, editable)
- Description (textarea)
- Cover Image (image upload)
- Collection Type: Manual / Automated (radio buttons)

**Manual collection additional UI:**
- Product picker component (`CollectionProductPicker.tsx`): a searchable modal/drawer that lists existing catalog products. Merchant checks products to add. Shows selected products in a reorderable list.
- "Remove" button on each selected product

**Automated collection additional UI:**
- Rule builder component (`CollectionRuleEditor.tsx`)
- "Add Rule" button that adds a new rule row
- Each rule row: Field selector (tag, vendor, product_type, price, category) + Relation selector (equals, contains, greater_than, less_than) + Value input
- Conjunction selector at the top: "Products must match ALL conditions" / "Products must match ANY condition"
- Live preview section: shows the first 6 matching products as thumbnails (calls `GET /api/webstore/collections/<id>/` with the current rules applied)

**SEO Section:**
- SEO Title, SEO Description

**Publish toggle:** Is Published / Unpublished

---

## 10. Pages Management

### 10.1 Pages List Page (`pages/page.tsx`)

Simple table: Title, Handle, Published status, Last Updated. Actions: Edit, Delete. "Create Page" button.

### 10.2 Page Editor (`pages/[id]/page.tsx` and `pages/new/page.tsx`)

**Form fields:**
- Title (required; auto-generates the handle)
- Handle (editable)
- Content (rich text editor — see below)
- Published toggle

**SEO section:**
- SEO Title, SEO Description

**Rich Text Editor (`RichTextEditor.tsx`):**
- A WYSIWYG editor that outputs sanitized HTML stored in `body_html`
- Required features: Bold, Italic, Underline, Headings (H1-H3), Unordered list, Ordered list, Link insertion, Image insertion, Blockquote, Horizontal rule
- Recommended library: **Tiptap** (based on ProseMirror) — it is a React-native rich text editor with a headless architecture that works well with Tailwind CSS. Install as `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`.
- The editor must output HTML compatible with what the backend expects in `body_html`
- The editor content must be sanitized client-side as well (do not allow `<script>` tags to be inserted via paste operations)

---

## 11. Theme Marketplace Browser (`themes/page.tsx`)

**Route:** `/store/webstore/themes/`

A grid of theme cards. Each card shows:
- Preview image (large, shows the homepage screenshot)
- Theme name and version
- Author
- Category badge
- Free / Paid label
- "Installed" badge if the tenant already has this theme installed
- "Install" / "Preview" action buttons

**Filtering bar:**
- Category filter (all categories from ThemeCategory enum)
- Free/Paid filter toggle
- Sort by: Newest, Popular, Name

**Theme preview modal:**
- Opens when "Preview" is clicked
- Shows a full-resolution preview image or an iFrame preview of the theme with sample data
- "Install Theme" button inside the modal
- Close button

**Install flow:**
1. Merchant clicks "Install"
2. A confirmation dialog: "This will create a draft of [Theme Name]. You can customize it before publishing." with "Install" and "Cancel" buttons.
3. On confirm: `POST /api/webstore/themes/<theme_id>/install/`
4. On success: redirect to `/store/webstore/customize` to start editing the new draft
5. On error (e.g., already has a draft): show the error message with an option to discard the existing draft first

---

## 12. Orders Management

### 12.1 Orders List Page (`orders/page.tsx`)

**Route:** `/store/webstore/orders/`

A table of webstore orders with: Order Number, Customer Email, Date, Status badge (colored), Payment Status badge, Fulfillment Status badge, Total Amount. Click to open the order detail.

**Filters:** Status filter, Payment Status filter, Date range picker.

**Pagination:** Standard page-based pagination with the existing pagination component used elsewhere in the store admin.

### 12.2 Order Detail Page (`orders/[id]/page.tsx`)

Shows full order information:
- Order header: order number, date, status badges
- Customer info: name, email, phone
- Line items table: product image, name, variant, SKU, quantity, unit price, line total
- Order totals: subtotal, shipping, discount, tax, total
- Shipping address
- Payment info: gateway, reference number, status
- Order timeline / activity log

**Actions:**
- "Mark as Fulfilled" button (sets fulfillment_status to fulfilled) — `PATCH /api/webstore/orders/<id>/status/`
- "Cancel Order" button — opens a confirmation dialog
- "Add Tracking" input field
- Print/PDF export button

---

## 13. Sidebar Navigation Update

Update the store sidebar to include the new Webstore section. The sidebar component is located in `frontend/src/components/` — find `StoreSidebar.tsx` or equivalent.

**New navigation group — "Webstore":**
Shown only when `can("webstore.access")` is true.

| Item | Icon | Route |
|---|---|---|
| Overview | Store icon | `/store/webstore` |
| Customize | Paintbrush icon | `/store/webstore/customize` |
| Themes | Palette icon | `/store/webstore/themes` |
| Menus | Menu icon | `/store/webstore/menus` |
| Collections | Layers icon | `/store/webstore/collections` |
| Pages | File text icon | `/store/webstore/pages` |
| Orders | ShoppingBag icon | `/store/webstore/orders` |
| Settings | Settings icon | `/store/webstore/settings` |

Use Lucide icons (already installed in the project).

---

## 14. Verification Checklist

- [ ] Merchant without webstore plan sees upgrade prompt on all `/store/webstore/*` pages
- [ ] Merchant with webstore plan but no setup sees the setup wizard on the hub page
- [ ] Completing the setup wizard creates the webstore and navigates to the hub dashboard
- [ ] The hub dashboard shows the correct webstore status and quick stats
- [ ] Creating a menu, adding items (including nested items), saving, and reloading persists the menu
- [ ] Creating a manual collection, adding products via the picker, and saving shows the products on the collection page
- [ ] Creating an automated collection with a tag rule shows matching products in the preview
- [ ] Creating a page with rich text content, saving, and reloading shows the correct content
- [ ] The theme marketplace shows available themes; clicking "Install" creates a draft and redirects to the customizer
- [ ] The orders list shows webstore orders; clicking an order shows the full detail
- [ ] The Webstore nav group appears in the sidebar for eligible users and is hidden for others
- [ ] Navigating away from an unsaved form triggers a "you have unsaved changes" warning
