# SubPhase 02.02 — Product Management UI

## Metadata

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| Phase        | 02 — The Catalog                                        |
| Sub-Phase    | 02.02 — Product Management UI                           |
| Complexity   | High                                                    |
| Depends On   | SubPhase 02.01 — Product Data Models (fully complete)   |
| Status       | Planned                                                 |
| Total Tasks  | 12                                                      |

---

## Objective

Build all user-facing product and inventory management screens within the tenant dashboard. By the end of this sub-phase, a store OWNER or MANAGER can create, edit, and manage the complete clothing catalog through the browser — from adding the first product through the guided wizard to performing bulk price updates across hundreds of variants. CASHIER roles retain read-only access to the inventory list but are blocked from creation, editing, and management tooling by RBAC permission gates enforced at both the Django API and UI layers.

---

## Scope

### In Scope

- Inventory List page at `/dashboard/[tenantSlug]/inventory` with search, column filters, and a paginated data table
- Multi-step Product Creation Wizard with three steps: Step 1 collects basic product information, Step 2 generates the variant matrix from size and colour axes, Step 3 presents a review summary before final save
- Product Detail page at `/dashboard/[tenantSlug]/inventory/[productId]` with a three-tab layout covering Details, Variants, and Stock History
- Variant Edit Panel implemented as a ShadCN Sheet slide-in drawer within the Product Detail page, requiring no separate route
- Category Management page at `/dashboard/[tenantSlug]/inventory/categories` with a two-level tree and inline editing
- Brand Management page at `/dashboard/[tenantSlug]/inventory/brands` with logo upload and flat list management
- Bulk Price Update tool triggered from the Inventory List floating action bar when one or more product rows are selected
- Barcode label printing sheet generation accessible from both the Variants tab and the Inventory List, supporting 4 cm × 6 cm thermal labels and A4 fallback
- CSV Import interface at `/dashboard/[tenantSlug]/inventory/import` — a three-step flow: upload, column mapping, and preview-and-confirm
- CSV Export feature triggered from the Inventory List "Export" button, respecting active filter state and streaming from the Django backend endpoint
- Product Image Upload component integrated into the Variant Edit Panel and the Variant Matrix table in the wizard
- Product search bar with 300 ms debounce and a collapsible filter bar covering category, brand, gender, and status filtering via URL search params

### Out of Scope

- Stock adjustment forms and stock take session UI — deferred to SubPhase 02.03
- POS cart integration and the checkout screen — deferred to Phase 03
- Purchase order creation and receiving flows — deferred to Phase 04
- Reporting dashboards and sales analytics — deferred to Phase 05
- Supplier management — deferred to a later phase
- Loyalty and promotions engine — not part of Phase 02

---

## Technical Context

All inventory pages live under the App Router path `/dashboard/[tenantSlug]/inventory` and inherit the navy sidebar layout established in Phase 01. The layout shell provides the tenant context via a React context provider, which all child pages consume without additional prop drilling.

Authentication context is provided by the `useAuth()` hook in client components and by the `getAuthFromCookies()` server utility in server components. Both read the JWT stored in an httpOnly cookie named `access_token`. There is no NextAuth session provider — all identity and permission data is decoded directly from the JWT claims. The `tenant_id` claim identifies the current tenant, and the `permissions` array claim drives all RBAC checks throughout this sub-phase.

Data fetching follows the project-wide pattern: all reads use TanStack Query hooks with a staleTime of 30 seconds, and all writes use `useMutation` with query invalidation on success. All API calls target the Django REST Framework backend at the URL configured in the `NEXT_PUBLIC_API_URL` environment variable — no Next.js Route Handlers are used for business data. The Zustand store is used only for transient UI state that must survive route transitions within the wizard (`useProductWizardStore`) and for tracking selected rows in the inventory list for bulk operations. Filter state is never stored in Zustand — URL search params are the single source of truth for all filter values.

Forms throughout this sub-phase use React Hook Form with a Zod resolver. Every form schema is co-located in a `schemas/` directory next to the relevant page or component. Loading states use ShadCN Skeleton components, never spinners. Empty states use a friendly illustration with a descriptive heading and a call-to-action button.

RBAC permission gates are enforced in two places: the Django API (returning 403 for unauthorised requests) and the UI layer (hiding or disabling buttons using the `usePermission` hook from Phase 01). The `product:view_cost_price` permission is the most sensitive — cost price must never be rendered in any component that a CASHIER role can reach, even as a hidden element.

Design tokens in use across this sub-phase:

| Token         | Hex       | Usage                                                              |
| ------------- | --------- | ------------------------------------------------------------------ |
| navy          | #1B2B3A   | Sidebar, primary buttons, headings                                 |
| orange        | #F97316   | Hover highlights on table rows, drag-over states, active accents   |
| border        | #E2E8F0   | Table headers, borders, active filter chips, tab underline         |
| text-muted    | #64748B   | Dividers, input borders, inactive wizard step pills                |
| background    | #F1F5F9   | Page background, card backgrounds                                  |
| surface       | #FFFFFF   | Main content area, table row backgrounds                           |

Typography rules: Inter for all H1–H3 headings and all UI labels and body text, JetBrains Mono for SKUs, barcodes, and prices.

---

## Task List

| Task ID        | Task Name                                      | Complexity | Depends On              |
| -------------- | ---------------------------------------------- | ---------- | ----------------------- |
| Task_02_02_01  | Build Inventory List Page                      | Medium     | SubPhase_02_01 complete |
| Task_02_02_02  | Build Product Creation Wizard Step 1           | Medium     | Task_02_02_01           |
| Task_02_02_03  | Build Product Creation Wizard Step 2 Variants  | High       | Task_02_02_02           |
| Task_02_02_04  | Build Product Detail Page                      | High       | Task_02_02_03           |
| Task_02_02_05  | Build Variant Edit Panel                       | Medium     | Task_02_02_04           |
| Task_02_02_06  | Build Category And Brand Management            | Low        | Task_02_02_01           |
| Task_02_02_07  | Build Bulk Price Update Tool                   | Medium     | Task_02_02_05           |
| Task_02_02_08  | Build Barcode Label Printing                   | Medium     | Task_02_02_04           |
| Task_02_02_09  | Build CSV Import Interface                     | High       | Task_02_02_03           |
| Task_02_02_10  | Build CSV Export Feature                       | Low        | Task_02_02_01           |
| Task_02_02_11  | Build Product Image Upload                     | Medium     | Task_02_02_05           |
| Task_02_02_12  | Build Product Search And Filters               | Medium     | Task_02_02_01           |

---

## Validation Criteria

- The inventory list renders in under one second when the tenant has 100 or more products, measured from route navigation to first contentful paint
- The Product Creation Wizard completes all three steps and persists the product record along with all generated variants to the database in a single atomic transaction executed on the Django backend
- The Variant Matrix Generator produces all Size × Colour combinations automatically when both axes have at least one value defined
- The Product Detail page switches between the Details, Variants, and Stock History tabs without remounting or losing scroll position
- Category CRUD operations all work: creating a new category, renaming an existing one in-place, and soft-deleting a category — with a guard toast shown when deletion is attempted on a category that has associated products
- Brand CRUD operations all work with the same guard behaviour as categories
- Bulk price update applies the new pricing to all variants of every selected product and displays a success toast reporting the count of updated variants
- Barcode label PDF/print view renders 4 cm × 6 cm labels correctly with the brand, product name, SKU, barcode image, size/colour and retail price in the correct positions
- CSV import validates header presence, shows per-row validation errors in the preview table, and allows the user to skip error rows and import only valid ones
- CSV export downloads a file matching the current active filter state without requiring full page reload
- Image upload shows a progress indicator during upload, renders the thumbnail on success, and provides a client-side size validation error for files exceeding 5 MB before any request is made
- Search combined with category, brand, gender, and status filters correctly narrows the product list, and filter state persists on browser back-navigation
- CASHIER role cannot access the product creation wizard route, the category management page, or the brand management page — each returns a permission-denied redirect

---

## Files Created / Modified

### New Route Files (App Router)

| Path                                                                   | Purpose                               |
| ---------------------------------------------------------------------- | ------------------------------------- |
| `src/app/dashboard/[tenantSlug]/inventory/page.tsx`                    | Inventory List page                   |
| `src/app/dashboard/[tenantSlug]/inventory/new/page.tsx`                | Product Creation Wizard (all 3 steps) |
| `src/app/dashboard/[tenantSlug]/inventory/[productId]/page.tsx`        | Product Detail page                   |
| `src/app/dashboard/[tenantSlug]/inventory/categories/page.tsx`         | Category Management page              |
| `src/app/dashboard/[tenantSlug]/inventory/brands/page.tsx`             | Brand Management page                 |
| `src/app/dashboard/[tenantSlug]/inventory/import/page.tsx`             | CSV Import page                       |

### New Component Files

| Path                                                           | Purpose                                    |
| -------------------------------------------------------------- | ------------------------------------------ |
| `src/components/inventory/InventoryTable.tsx`                  | Main product data table                    |
| `src/components/inventory/ProductStatusBadge.tsx`              | Status pill badge                          |
| `src/components/inventory/BulkActionBar.tsx`                   | Floating selection action bar              |
| `src/components/inventory/BulkPriceUpdateDialog.tsx`           | Bulk price update modal                    |
| `src/components/inventory/BarcodeLabelDialog.tsx`              | Barcode label printing dialog              |
| `src/components/inventory/BarcodeLabel.tsx`                    | Single label render component              |
| `src/components/inventory/InventoryFilterBar.tsx`              | Filter controls bar                        |
| `src/components/inventory/ActiveFilterChips.tsx`               | Active filter display row                  |
| `src/components/wizard/WizardProgressBar.tsx`                  | Three-step progress indicator              |
| `src/components/wizard/WizardStep1BasicInfo.tsx`               | Wizard step 1 form                         |
| `src/components/wizard/WizardStep2Variants.tsx`                | Wizard step 2 variant matrix               |
| `src/components/wizard/VariantMatrixTable.tsx`                 | Variant rows table in wizard               |
| `src/components/wizard/SizeChipInput.tsx`                      | Size axis chip input                       |
| `src/components/wizard/ColourChipInput.tsx`                    | Colour axis chip input                     |
| `src/components/product/ProductDetailTabs.tsx`                 | Three-tab layout for product detail        |
| `src/components/product/ProductDetailsCard.tsx`                | Product core fields display card           |
| `src/components/product/VariantsTab.tsx`                       | Variant table within Product Detail        |
| `src/components/product/StockHistoryTab.tsx`                   | Stock movement table                       |
| `src/components/product/VariantEditSheet.tsx`                  | Variant editing slide-in drawer            |
| `src/components/product/ProductImageUpload.tsx`                | Image gallery and upload component         |
| `src/components/product/TagInput.tsx`                          | Tag chip input component                   |
| `src/components/categories/CategoryTree.tsx`                   | Two-level category tree                    |
| `src/components/categories/InlineCategoryForm.tsx`             | Inline new-category form                   |
| `src/components/brands/BrandsTable.tsx`                        | Flat brand list table                      |
| `src/components/brands/BrandEditSheet.tsx`                     | Brand create/edit sheet                    |
| `src/components/csv/CsvUploadZone.tsx`                         | Drag-and-drop CSV upload area              |
| `src/components/csv/ColumnMappingTable.tsx`                    | CSV column mapping step                    |
| `src/components/csv/ImportPreviewTable.tsx`                    | Row-level import preview with status       |

### New Hook and Store Files

| Path                                         | Purpose                                      |
| -------------------------------------------- | -------------------------------------------- |
| `src/hooks/useProducts.ts`                   | TanStack Query hook for product list         |
| `src/hooks/useProduct.ts`                    | TanStack Query hook for single product       |
| `src/hooks/useVariantMutation.ts`            | Mutation hook for variant PATCH              |
| `src/stores/productWizardStore.ts`           | Zustand store for wizard state               |
| `src/stores/inventorySelectionStore.ts`      | Zustand store for row selection              |
| `src/lib/urlUtils.ts`                        | `mergeSearchParams` helper utility           |
| `src/schemas/productSchema.ts`               | Zod schemas for product wizard steps         |
| `src/schemas/variantSchema.ts`               | Zod schema for variant edit form             |
| `src/schemas/bulkPriceSchema.ts`             | Zod schema for bulk price update             |
