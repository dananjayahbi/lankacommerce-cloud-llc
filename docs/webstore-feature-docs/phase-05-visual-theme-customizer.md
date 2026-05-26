# Phase 5: Visual Theme Customizer

**Phase:** 5 of 10  
**Depends on:** Phase 3 (customizer API endpoints), Phase 4 (webstore admin section), Phase 6 (block components — the iFrame preview depends on them being rendered)  
**Unlocks:** Phase 7 (the preview iFrame uses the same ThemeRenderer built for Phase 6/7)  
**Estimated Scope:** Frontend (heavy), minimal backend tweaks

---

## 1. Overview

The Visual Theme Customizer is the most technically complex feature in the entire webstore system. It is a full-screen split-pane editor where the left panel is a React sidebar for configuring the theme, and the right panel is a live preview rendered inside an `<iframe>` element.

The two frames communicate exclusively via the browser's `window.postMessage` API. Every change the merchant makes in the sidebar is immediately reflected in the preview — no page reloads, no full re-renders. This creates the illusion of live, instant editing.

The customizer lives at `/store/webstore/customize` and uses a special full-screen layout that completely suppresses the standard store admin sidebar.

At the end of this phase, a merchant can:
- Open the customizer and see their current live theme rendered in the preview
- Change global settings (colors, typography) and see the preview update instantly
- Add, remove, and reorder sections on the home page
- Edit each section's settings via an auto-generated form
- Switch the preview between the home, product, collection, and cart templates
- Save a draft (auto-saved every 3 seconds)
- Publish the draft to make changes live

---

## 2. Existing Context

### 2.1 The Two-Frame Architecture — Why iFrame?

The industry standard for live theme customizers (Shopify, Squarespace, Webflow) is an iFrame for the preview. This approach has several advantages:
- The preview and the editor sidebar have completely independent DOM trees and CSS scopes — no style bleeding
- The preview renders the full Next.js page (including global CSS, fonts, and theme styles) independently
- The merchant can interact with the preview (scroll, hover) while editing in the sidebar

The alternative (rendering the preview as a React component inside the sidebar page) would be simpler but causes style conflicts between the admin UI's Tailwind classes and the storefront's theme styles.

### 2.2 postMessage Security

When using `postMessage`, always specify the `targetOrigin` explicitly — never use `"*"`. The iFrame's origin is the same subdomain (e.g., `test-business.localhost:3000`) because the preview route is `/webstore-preview/...` on the same domain.

The iFrame should also verify the `event.origin` on messages it receives, rejecting any messages not from the expected parent frame's origin.

### 2.3 Auto-Save Strategy

The customizer's auto-save calls `PATCH /api/webstore/customizer/draft-config/`. This is a debounced call — it fires 3 seconds after the last edit, not on every keystroke. The draft config is also saved immediately when the merchant clicks "Save" explicitly.

This means the backend draft config might lag up to 3 seconds behind what the merchant sees in the UI. The UI must make this clear with a subtle "Saving..." indicator.

### 2.4 State Management

The customizer's entire state lives in a React state object in the parent frame (the sidebar component). The iFrame has its own copy of this state, updated only via postMessage. They are never in sync perfectly — the parent always leads, the iFrame follows.

Do NOT use Zustand or global state for the customizer config — the customizer state is ephemeral and lives only in this component's lifecycle.

---

## 3. File Structure for This Phase

| File | Purpose |
|---|---|
| `frontend/src/app/(store)/store/webstore/customize/layout.tsx` | Full-screen layout — hides the store sidebar |
| `frontend/src/app/(store)/store/webstore/customize/page.tsx` | Main customizer orchestrator component |
| `frontend/src/app/(webstore)/webstore-preview/[...path]/page.tsx` | The iFrame target — renders the theme with draft config |
| `frontend/src/components/webstore/customizer/ThemeCustomizerPanel.tsx` | The left sidebar |
| `frontend/src/components/webstore/customizer/PageSelector.tsx` | Page switcher (Home/Product/Collection/Cart) |
| `frontend/src/components/webstore/customizer/GlobalSettingsPanel.tsx` | Colors and typography tab |
| `frontend/src/components/webstore/customizer/SectionList.tsx` | Drag-and-drop section tree |
| `frontend/src/components/webstore/customizer/SectionItem.tsx` | Individual section row in the tree |
| `frontend/src/components/webstore/customizer/BlockList.tsx` | Nested blocks within a section |
| `frontend/src/components/webstore/customizer/BlockItem.tsx` | Individual block row |
| `frontend/src/components/webstore/customizer/SettingsPanel.tsx` | Dynamic settings form for selected section/block |
| `frontend/src/components/webstore/customizer/settings/ColorInput.tsx` | Color picker input |
| `frontend/src/components/webstore/customizer/settings/ImageInput.tsx` | Image upload input |
| `frontend/src/components/webstore/customizer/settings/RangeInput.tsx` | Slider input |
| `frontend/src/components/webstore/customizer/settings/SelectInput.tsx` | Dropdown input |
| `frontend/src/components/webstore/customizer/settings/ToggleInput.tsx` | Boolean toggle input |
| `frontend/src/components/webstore/customizer/settings/TextInput.tsx` | Text / textarea input |
| `frontend/src/components/webstore/customizer/settings/RichTextInput.tsx` | Embedded rich text editor |
| `frontend/src/components/webstore/customizer/settings/CollectionPicker.tsx` | Collection selection input |
| `frontend/src/components/webstore/customizer/settings/ProductPicker.tsx` | Product selection input |
| `frontend/src/components/webstore/customizer/PreviewFrame.tsx` | iFrame wrapper + postMessage sender |
| `frontend/src/components/webstore/customizer/AddSectionPanel.tsx` | Block library slide-out for adding new sections |
| `frontend/src/lib/webstore/types.ts` | TypeScript types for config, sections, blocks, settings |
| `frontend/src/lib/webstore/postMessageTypes.ts` | TypeScript types for the postMessage protocol |

---

## 4. The Customizer Layout

### 4.1 Full-Screen Layout (`customize/layout.tsx`)

The standard store admin layout includes a sidebar that occupies ~250px of horizontal space. The customizer cannot share this space — it needs 100% of the viewport.

Create a layout file at `customize/layout.tsx` that:
- Does NOT import or render the standard `StoreSidebar` component
- Applies a full-viewport CSS class: `min-h-screen w-full overflow-hidden`
- Provides the top bar with the "Back to Webstore" link, status, and action buttons
- This layout applies only to the `/store/webstore/customize` route because it is placed at that level in the file system

### 4.2 Top Bar

The customizer has a thin top bar (approximately 48px tall) containing:
- Left: back arrow + "Store Admin" link (to `/store/webstore`)
- Center: theme name + "Draft" badge (or "Up to date" if draft matches live)
- Right: "Saving..." / "Saved" indicator, "Discard Changes" button, "Preview Live" link, "Publish" primary button

---

## 5. The Two-Pane Layout (`customize/page.tsx`)

This is the orchestrator. It manages:
1. Fetching the draft config from `GET /api/webstore/customizer/draft-config/`
2. Holding the current in-memory draft state
3. Coordinating between the sidebar (`ThemeCustomizerPanel`) and the preview frame (`PreviewFrame`)
4. Auto-save logic (debounced timer)
5. Publish and discard actions

**Layout dimensions:**
- Left panel (sidebar): fixed width, 320–380px, full height, overflow-y scroll
- Right panel (preview): fills remaining width, full height, contains the iFrame

**Responsive behavior:** The customizer is designed for desktop only (min-width: 1024px). On smaller screens, show a message: "The visual customizer works best on desktop. Please use a larger screen." Do not attempt to make the customizer responsive.

**Initial load sequence:**
1. Fetch draft config from API (show loading skeleton)
2. Once loaded, render the two-pane layout
3. The iFrame starts loading (the preview URL)
4. Once the iFrame signals it is ready (via a `LANKA_READY` postMessage from the iFrame), send `LANKA_INIT` with the full config
5. Show the sidebar content

---

## 6. The ThemeCustomizerPanel (Left Sidebar)

The sidebar has a tabbed or segmented layout with three main views:

### 6.1 Theme Settings Tab
Shows global settings: colors and typography. Contains the `GlobalSettingsPanel.tsx` component.

**Colors section:**
- Primary Color (color picker)
- Secondary Color (color picker)
- Background Color (color picker)
- Text Color (color picker)
- Accent Color (color picker)

**Typography section:**
- Heading Font (font selector — a dropdown with the available web fonts)
- Body Font (font selector)
- Heading Size Scale (range slider 0.8 – 1.4, step 0.05)

**Social Media section:**
- Facebook URL, Instagram URL, TikTok URL, YouTube URL (URL inputs)

Each change fires immediately:
1. Updates the in-memory draft state
2. Sends a `LANKA_UPDATE_GLOBAL` postMessage to the iFrame
3. Starts the auto-save debounce timer

### 6.2 Pages Tab (Section Editor)

Shows the page selector (`PageSelector.tsx`) and the draggable sections list (`SectionList.tsx`).

**PageSelector:** A horizontal set of buttons: Home, Product, Collection, Cart. Switching pages:
1. Updates the `currentPage` state in the parent
2. Sends a `LANKA_NAVIGATE` postMessage to the iFrame
3. The `SectionList` shows the sections for the newly selected page

**SectionList:**
- Renders each section in the current page's template as a draggable row
- Each row shows: drag handle (≡ icon), section type name, expand/collapse arrow, enable/disable toggle, delete button
- Clicking a section row opens the `SettingsPanel` for that section (replaces the section list with the settings form)
- Dragging a row reorders the sections in the template's `order` array

**Add Section button:** At the bottom of the section list. Opens the `AddSectionPanel` slide-out.

**SectionList drag-and-drop implementation:**
- Use `@dnd-kit/sortable` (same library as the menu editor in Phase 4)
- On drag end: update the template's `order` array in the in-memory state
- Send `LANKA_REORDER_SECTIONS` postMessage to the iFrame
- Auto-save the new order

### 6.3 Settings Panel (Section/Block Settings)

When a section is selected, the sidebar shows the `SettingsPanel.tsx` instead of the section list. The settings panel:
- Shows a back button to return to the section list
- Shows the section's name as a heading
- Auto-generates the settings form from the section's block schema
- Below the section-level settings, shows the `BlockList` for nested blocks (if the section supports them)

**The schema-driven form auto-generation:**

The `SettingsPanel` receives the block's schema (array of setting definition objects fetched from `GET /api/webstore/blocks/<type>/schema/` or bundled locally). For each setting in the schema, it renders the appropriate input component:

| Schema `type` | Component | Props |
|---|---|---|
| `text` | `TextInput` | label, placeholder |
| `textarea` | `TextInput` | label, multiline=true |
| `richtext` | `RichTextInput` | label |
| `image` | `ImageInput` | label |
| `url` | `TextInput` | label, type="url" |
| `color` | `ColorInput` | label |
| `select` | `SelectInput` | label, options array |
| `checkbox` | `ToggleInput` | label |
| `range` | `RangeInput` | label, min, max, step, unit |
| `collection` | `CollectionPicker` | label |
| `product` | `ProductPicker` | label |
| `header` | Styled `<h4>` | No input |
| `paragraph` | Styled `<p>` | No input |

Every input change triggers:
1. Update the section's settings in the in-memory draft state
2. Send `LANKA_UPDATE_SECTION` postMessage to the iFrame
3. Start auto-save debounce

---

## 7. The Preview Frame (`PreviewFrame.tsx`)

This component renders an `<iframe>` element pointing to the preview route.

**iFrame URL construction:**
- Template: `/<tenant-slug>/webstore-preview/<page>?preview=draft&ts=<timestamp>`
- The `ts` (timestamp) query param forces the iFrame to reload when the page changes (prevents caching the same URL)
- The preview route is on the same subdomain, so the `src` is relative

**Sending postMessages:**
- `PreviewFrame` exposes a `sendMessage(message)` method (via `useImperativeHandle` or a ref passed from the parent)
- The parent (`customize/page.tsx`) calls this whenever the in-memory state changes
- Messages are sent via `iframeRef.current.contentWindow.postMessage(message, window.location.origin)`

**Receiving messages from the iFrame:**
- The parent must listen for messages from the iFrame (e.g., when the consumer clicks a product in the preview — the iFrame notifies the parent to switch sections)
- Add a `window.addEventListener("message", handler)` in the parent (or in `PreviewFrame`)
- Handle `LANKA_READY` — iFrame signals it has loaded and is ready to receive config
- Handle `LANKA_SECTION_CLICK` — iFrame signals the merchant clicked a section in the preview (should open that section's settings panel automatically)

**Loading state:** While the iFrame is loading, show a loading skeleton overlay on top of the iFrame area. Remove it when `LANKA_READY` is received.

**iFrame resize handling:** The preview pane should support responsive preview modes via a device switcher in the top bar: Desktop, Tablet (768px), Mobile (375px). When switching, change the iFrame's inline width and show horizontal letterboxing to simulate the device size.

---

## 8. The Preview Route (`webstore-preview/[...path]/page.tsx`)

This Next.js page is the iFrame's target. It renders the storefront theme using the draft config instead of the active config.

**Route:** `/webstore-preview/home`, `/webstore-preview/product`, `/webstore-preview/collection`, `/webstore-preview/cart`

**Access control:** This route must only be accessible from within the customizer — not directly by consumers. Protect it by:
1. Checking that the request comes from the same origin (middleware check)
2. Requiring a valid staff JWT in cookies (the merchant is already logged in)
3. Returning 403 for unauthenticated requests

**Data fetching:** This page fetches the DRAFT config from `GET /api/webstore/customizer/draft-config/` on initial render. After that, it receives config updates via postMessage.

**Preview mode flag:** The page receives `?preview=draft` in the URL. When this flag is present:
- Use the draft config (not the active config)
- Add a subtle visual indicator that this is a preview (e.g., a "Preview Mode" badge in the corner — can be removed in the final product)
- Disable all interactive e-commerce features (add to cart does nothing, checkout links show a "not available in preview" toast)

**postMessage Listener:**

When the iFrame page loads, it:
1. Sends `{ type: "LANKA_READY" }` to the parent window
2. Attaches a `message` event listener
3. On receiving `LANKA_INIT`: replace the entire local config state with the received config and re-render
4. On receiving `LANKA_UPDATE_SECTION`: find the section in local config state, merge the updated settings, trigger a re-render of that section only
5. On receiving `LANKA_UPDATE_BLOCK`: find the nested block, merge settings, re-render
6. On receiving `LANKA_REORDER_SECTIONS`: update the `order` array for the current template, re-render
7. On receiving `LANKA_ADD_SECTION`: add the new section to the template, re-render
8. On receiving `LANKA_REMOVE_SECTION`: remove the section, re-render
9. On receiving `LANKA_UPDATE_GLOBAL`: update `global_settings` in local config state, re-render entire layout
10. On receiving `LANKA_NAVIGATE`: this page navigates to the new template's preview URL (or re-renders with the new template)

**Section click detection:** Wrap each rendered section in the preview with an onClick handler that sends `{ type: "LANKA_SECTION_CLICK", payload: { sectionId } }` to the parent. This lets the merchant click a section in the preview to jump directly to its settings.

---

## 9. The Add Section Panel (`AddSectionPanel.tsx`)

A slide-out panel (Sheet component from Shadcn UI) that opens when the merchant clicks "Add Section".

**Content:**
- Search input at the top
- Grid of block type cards (2 columns)
- Each card: preview image, block name, "Premium" badge if applicable, "Unavailable" overlay if the tenant's plan doesn't include premium blocks

**On clicking a block type:**
1. Generate a new UUID for the new section ID
2. Create a new section config object: `{type: selected_type, disabled: false, settings: {}, blocks: {}, block_order: []}`
3. Add it to the in-memory draft state for the current template
4. Send `LANKA_ADD_SECTION` postMessage to the iFrame
5. Close the add section panel
6. Immediately open the settings panel for the new section (so the merchant can configure it)

---

## 10. The postMessage Protocol

All message types must be defined in `frontend/src/lib/webstore/postMessageTypes.ts` as TypeScript discriminated union types. This provides type safety and self-documenting code.

**Messages from Parent (sidebar) → iFrame:**

| Type | Payload | Triggered by |
|---|---|---|
| `LANKA_INIT` | `{ config: FullThemeConfig, page: PageTemplate }` | iFrame sends READY, parent initializes |
| `LANKA_UPDATE_SECTION` | `{ sectionId: string, template: PageTemplate, settings: object }` | Section setting changed |
| `LANKA_UPDATE_BLOCK` | `{ sectionId: string, blockId: string, settings: object }` | Nested block setting changed |
| `LANKA_REORDER_SECTIONS` | `{ template: PageTemplate, order: string[] }` | Sections dragged |
| `LANKA_ADD_SECTION` | `{ template: PageTemplate, sectionId: string, config: SectionConfig }` | New section added |
| `LANKA_REMOVE_SECTION` | `{ template: PageTemplate, sectionId: string }` | Section deleted |
| `LANKA_UPDATE_GLOBAL` | `{ globalSettings: GlobalSettings }` | Global settings changed |
| `LANKA_NAVIGATE` | `{ page: PageTemplate }` | Page selector changed |
| `LANKA_TOGGLE_SECTION` | `{ sectionId: string, disabled: boolean }` | Section enable/disable toggled |

**Messages from iFrame → Parent:**

| Type | Payload | Triggered by |
|---|---|---|
| `LANKA_READY` | `{}` | iFrame has loaded and is ready |
| `LANKA_SECTION_CLICK` | `{ sectionId: string }` | Merchant clicked a section in preview |

---

## 11. TypeScript Types (`types.ts`)

Define all types needed across the customizer and the preview in `frontend/src/lib/webstore/types.ts`. These types must exactly mirror the JSON structure stored in `TenantThemeConfig.config`.

Key types to define (as TypeScript interfaces — no code examples here, but name them):

| Type Name | Represents |
|---|---|
| `PageTemplate` | Union type: `"index" | "product" | "collection" | "cart"` |
| `GlobalSettings` | The global_settings object (colors, typography, layout, social) |
| `SectionConfig` | A single section within a template (type, disabled, settings, blocks, block_order) |
| `BlockConfig` | A nested block within a section (type, settings) |
| `TemplateConfig` | A template's `{sections: {[id]: SectionConfig}, order: string[]}` |
| `ThemeConfig` | The full config object (global_settings, layout, templates) |
| `SettingDefinition` | One entry in a block's schema (id, type, label, default, min, max, options, etc.) |

---

## 12. Auto-Save Implementation Details

The auto-save logic lives in `customize/page.tsx`:

1. Maintain a `hasUnsavedChanges` boolean state
2. Every time the in-memory draft changes, set `hasUnsavedChanges = true` and restart the debounce timer (3 seconds)
3. When the timer fires, call `PATCH /api/webstore/customizer/draft-config/` with the full current config
4. On success: set `hasUnsavedChanges = false`, update the "Saved" indicator
5. On failure: show a persistent error toast and keep `hasUnsavedChanges = true`
6. When the user clicks the explicit "Save" button: cancel the debounce timer and save immediately
7. When the user clicks "Publish": save immediately, then call `POST /api/webstore/customizer/publish/`

**Dirty state warning:** When `hasUnsavedChanges = true` and the user tries to navigate away (click "Back to Webstore" or browser back), show a confirmation dialog: "You have unsaved changes. Are you sure you want to leave? Your changes will be lost." Use the browser's `beforeunload` event AND override the Next.js router's navigation.

---

## 13. Individual Setting Input Components

All setting inputs must:
- Accept a `value` prop (current value)
- Accept an `onChange` callback
- Accept a `definition` prop (the full `SettingDefinition` object for label, constraints, etc.)
- Be fully uncontrolled internally but externally controlled (standard React controlled component pattern)

### ColorInput
- Renders a color swatch (a small div with background-color) + a hex input text field
- Clicking the swatch opens a `<input type="color">` native color picker
- Supports both native browser color picker and manual hex entry
- Debounce the onChange to avoid firing on every slider drag

### ImageInput
- Shows a thumbnail preview of the current image URL
- "Upload Image" button — opens a file picker
- Upload the file to `POST /api/webstore/uploads/` (or the existing catalog upload endpoint)
- Once uploaded, the returned URL is set as the new value
- "Remove" link to clear the image

### CollectionPicker
- Renders a searchable dropdown (Combobox from Shadcn)
- Fetches collections from `GET /api/webstore/collections/` on open
- Shows collection title in the dropdown
- Sets the collection `handle` as the value (not the ID) — the storefront uses handles

### ProductPicker
- Same as CollectionPicker but fetches from the catalog products API
- Sets the product `slug` (handle) as the value

---

## 14. Verification Checklist

- [ ] Navigating to `/store/webstore/customize` shows the full-screen customizer (no store sidebar)
- [ ] The iFrame renders the tenant's active theme on load
- [ ] Changing a global color in the sidebar updates the iFrame within 200ms (no page reload)
- [ ] Dragging sections in the sidebar reorders them in the iFrame instantly
- [ ] Adding a new section via "Add Section" appears in the iFrame immediately
- [ ] Clicking a section in the iFrame opens that section's settings in the sidebar
- [ ] "Saving..." indicator appears 100ms after an edit; "Saved" appears after the API call succeeds
- [ ] Clicking "Publish" makes the changes visible on the actual storefront (verify by opening the storefront in a new tab)
- [ ] Clicking "Discard Changes" prompts for confirmation and then reverts to the last published state
- [ ] The device switcher (Desktop/Tablet/Mobile) changes the iFrame width
- [ ] Navigating away with unsaved changes shows a "You have unsaved changes" warning
- [ ] The preview route (`/webstore-preview/home`) returns 403 when accessed without authentication
- [ ] Setting `collection_handle` in a FeaturedCollection section's settings shows the correct collection in the preview
