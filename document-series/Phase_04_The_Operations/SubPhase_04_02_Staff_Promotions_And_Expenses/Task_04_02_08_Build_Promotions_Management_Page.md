# Task 04.02.08 — Build Promotions Management Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.08 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | High |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.07 (promotion DRF views in place) |
| Produces | `frontend/app/[tenantSlug]/promotions/page.tsx`, `frontend/app/[tenantSlug]/promotions/components/PromotionsTable.tsx`, `frontend/app/[tenantSlug]/promotions/components/PromotionForm.tsx` |
| Blocked By | Task 04.02.07 |

---

## Objective

Build the promotions management page where Managers and Owners can create, edit, activate, deactivate, and review promotions. The promotion form adapts its visible fields based on the selected `PromotionType`. A live preview card gives the operator confidence in how the promotion will appear to cashiers. Promotions that are soft-deleted are archived, not permanently removed.

---

## Instructions

### Step 1: Build the Promotions List Page

Create `frontend/app/[tenantSlug]/promotions/page.tsx` as a Client Component.

Role guard: `useAuth()` — redirect CASHIER and STOCK_CLERK to `/${tenantSlug}/dashboard` in a `useEffect`.

TanStack Query key `['promotions', tenantSlug]` fetching `GET /api/promotions/`. Return type: `Promotion[]` where `Promotion` is a TypeScript interface mirroring the serialised model fields.

Page layout:
- Inter heading "Promotions" on the left. Subtitle in `text-muted` (#64748B): "X active promotion(s)" — computed as `data?.filter(p => p.is_active).length`.
- "New Promotion" button on the right, `orange` (#F97316) background, opens `CreatePromotionDialog`.
- While loading: ShadCN Skeleton rows inside the table area.
- On error: ShadCN `Alert` with "Failed to load promotions. Please try again."
- On success: render `PromotionsTable` passing `promotions={data}`.

State: `createDialogOpen: boolean`, `editSheetPromotion: Promotion | null`.

### Step 2: Build the PROMOTION_TYPE_LABELS Map

At the top of `frontend/app/[tenantSlug]/promotions/components/PromotionsTable.tsx` (and exported for reuse in `PromotionForm.tsx`), define a `PROMOTION_TYPE_LABELS` constant object:

`CART_PERCENTAGE` → `'Cart % Off'`. `CART_FIXED` → `'Cart Fixed Off'`. `CATEGORY_PERCENTAGE` → `'Category % Off'`. `BOGO` → `'Buy One Get One'`. `MIX_AND_MATCH` → `'Mix & Match'`. `PROMO_CODE` → `'Promo Code'`.

Define `PROMOTION_TYPE_BADGE_CONFIG` object mapping each type to `{ bg: string, text: string }` colour values:
- `CART_PERCENTAGE`, `CART_FIXED`: `{ bg: '#E2E8F0', text: '#1B2B3A' }` (border bg, navy text).
- `CATEGORY_PERCENTAGE`: `{ bg: '#64748B', text: '#FFFFFF' }` (text-muted bg, surface text).
- `BOGO`, `MIX_AND_MATCH`: `{ bg: '#F97316', text: '#FFFFFF' }` (orange bg, surface text).
- `PROMO_CODE`: `{ bg: '#1B2B3A', text: '#FFFFFF' }` (navy bg, surface text).

Never reference colour hex values directly in JSX — always look them up from these config objects.

### Step 3: Build the PromotionsTable

Create `frontend/app/[tenantSlug]/promotions/components/PromotionsTable.tsx`.

**Props**: `promotions: Promotion[]`, `onEdit: (p: Promotion) => void`, `tenantSlug: string`.

ShadCN `Table` with columns: Name, Type, Value, Promo Code, Status, Valid Window, Actions.

Column details:
- "Name": Inter body text, max 40 chars with ellipsis and a `Tooltip` for the full name.
- "Type": badge using `PROMOTION_TYPE_BADGE_CONFIG`. Display `PROMOTION_TYPE_LABELS[p.type]`.
- "Value": formatted based on type — for percentage types, display "X%" (e.g., "10%"); for fixed, display "Rs. X.XX"; for BOGO/MIX_AND_MATCH, display "Buy [min_quantity] get 1".
- "Promo Code": visible only for rows where `p.type === 'PROMO_CODE'`. JetBrains Mono font, uppercase. For other types, render nothing in this cell.
- "Status": ShadCN `Switch` with `checked={p.is_active}`. On change: `useMutation` to `PATCH /api/promotions/${p.id}/` with `{ is_active: !p.is_active }`. Optimistic update in TanStack Query cache. Revert on error with destructive toast.
- "Valid Window": if both `starts_at` and `ends_at` are set, display "DD/MM/YYYY – DD/MM/YYYY". If only one is set, display "From DD/MM/YYYY" or "Until DD/MM/YYYY". If neither is set, display "Always active" in `text-muted` (#64748B).
- "Actions": "Edit" button (variant `'ghost'`) calling `onEdit(p)`.

Sort the table by `created_at` descending (most recent first). Do not add client-side column-sorting controls — the backend ordering is sufficient for this list.

### Step 4: Build the PromotionForm Component

Create `frontend/app/[tenantSlug]/promotions/components/PromotionForm.tsx` as a controlled form component.

**Props**: `defaultValues?: Partial<PromotionFormValues>`, `onSubmit: (data: PromotionFormValues) => void`, `isSubmitting: boolean`, `submitLabel: string`.

React Hook Form with Zod validation. `watch('type')` is used throughout for conditional field rendering.

**Always-visible fields**:
- `name`: ShadCN `Input`, label "Promotion Name", required, max 255 chars.
- `type`: ShadCN `Select` with options from `PROMOTION_TYPE_LABELS`. If `defaultValues.type` is set (edit mode), disable the type selector and show a helper text "Promotion type cannot be changed." styled in `text-muted` (#64748B).
- `value`: ShadCN `Input` type `number`, min 0, step 0.01. Label and helper text adapt per type (see Step 5).
- `description`: ShadCN `Textarea`, label "Description", optional, max 500 chars.
- `starts_at`: ShadCN date picker, label "Starts At", optional.
- `ends_at`: ShadCN date picker, label "Ends At", optional. Zod `refine`: if both `starts_at` and `ends_at` are set, `ends_at` must be after `starts_at`.
- `is_active`: ShadCN `Switch`, label "Active", default `true` for new promotions.

**Conditional fields** (see Step 4a):
- `promo_code`: shown only when `type === 'PROMO_CODE'`.
- `target_category_id`: shown only when `type === 'CATEGORY_PERCENTAGE'`.
- `min_quantity`: shown only when `type === 'BOGO' || type === 'MIX_AND_MATCH'`.

### Step 4a: Implement Type-Aware Conditional Fields

In `PromotionForm.tsx`, use `watch('type')` to control conditional rendering. Wrap each conditional field in a `<div>` with a CSS transition class that animates height from `0` to `auto` for a smooth mount/unmount without jarring layout shifts (use Tailwind `transition-all duration-200` with `overflow-hidden`).

`promo_code` field (visible when `type === 'PROMO_CODE'`): ShadCN `Input`, label "Promo Code", max 50 chars. Apply `toUpperCase()` transformation in the `onChange` handler so the input always displays uppercase. Zod validation: `z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/, "Only uppercase letters, numbers, underscores, and hyphens are allowed.")`.

`target_category_id` field (visible when `type === 'CATEGORY_PERCENTAGE'`): ShadCN `Combobox` (searchable select). Fetches `GET /api/pos/categories/?tenant_slug=${tenantSlug}` via TanStack Query key `['categories-for-promotions', tenantSlug]`. Displays category names as options with their IDs as values. Required when `type === 'CATEGORY_PERCENTAGE'` — add a Zod `refine` checking this.

`min_quantity` field (visible when `type === 'BOGO' || type === 'MIX_AND_MATCH'`): ShadCN `Input` type `number`, label "Minimum Quantity", min 2, integer only. Helper text: "Buy One Get One" → "Minimum cart quantity to trigger the free item"; "Mix & Match" → "Total items across any qualifying products needed for the discount".

### Step 5: Implement the Value Field Label Adaptation

In `PromotionForm.tsx`, compute the value field label and helper text reactively using `watch('type')`:

`CART_PERCENTAGE` → label `"Discount (%)"`, helper `"e.g. 10 for 10% off the cart total"`.
`CATEGORY_PERCENTAGE` → label `"Discount (%)"`, helper `"e.g. 15 for 15% off all items in the selected category"`.
`CART_FIXED` → label `"Discount Amount (Rs.)"`, helper `"Fixed amount subtracted from the cart total"`.
`BOGO` → label `"Free Item Value Cap (Rs.)"`, helper `"Maximum value of the free item. Enter 0 to use the item's actual price"`.
`MIX_AND_MATCH` → label `"Discount Amount (Rs.)"`, helper `"Amount discounted when the minimum quantity is met"`.
`PROMO_CODE` → label `"Discount Value"`, helper `"Enter a percentage (e.g. 10) or a fixed amount — specify the interpretation in the Description field"`.

Define this as a `const VALUE_FIELD_CONFIG: Record<PromotionType, { label: string; helper: string }>` object at module level. Retrieve the correct entry with `VALUE_FIELD_CONFIG[watchedType] ?? VALUE_FIELD_CONFIG['CART_PERCENTAGE']`.

### Step 6: Build the Create Promotion Modal

In `frontend/app/[tenantSlug]/promotions/page.tsx`, define `CreatePromotionDialog` as an inline component or a separate file at `frontend/app/[tenantSlug]/promotions/components/CreatePromotionDialog.tsx`.

Wrap `PromotionForm` in ShadCN `Dialog`. Title "New Promotion".

Before submitting to the server, validate promo code uniqueness client-side when `type === 'PROMO_CODE'`: check the TanStack Query cache `queryClient.getQueryData(['promotions', tenantSlug])` for an existing promotion with `promo_code.toLowerCase() === formData.promo_code.toLowerCase()`. If found, call `setError('promo_code', { message: 'This promo code already exists for your store.' })` and abort the submission — no network request is made.

On submit (after client-side checks): `useMutation` to `POST /api/promotions/`. On success: `queryClient.invalidateQueries(['promotions', tenantSlug])`, close dialog, `toast({ description: "Promotion created successfully." })`. On 400: map server validation errors to form fields. On 403: destructive toast.

### Step 7: Build the Edit Promotion Sheet

In `frontend/app/[tenantSlug]/promotions/page.tsx`, render a ShadCN `Sheet` (right side panel) controlled by `editSheetPromotion` state. Opened by the "Edit" button in `PromotionsTable`.

Pre-populate `PromotionForm` with `defaultValues={editSheetPromotion}`. The `type` field selector is disabled in edit mode (see Step 4).

On submit: `useMutation` to `PATCH /api/promotions/${editSheetPromotion.id}/`. On success: invalidate query, close sheet, `toast({ description: "Promotion updated." })`.

At the bottom of the `Sheet`, add a destructive "Delete Promotion" button separated from the submit button by a horizontal rule. Clicking it opens a ShadCN `AlertDialog` with title "Delete Promotion?" and description "This promotion will be deactivated and archived. Existing sales using this promotion code are not affected." Cancel and "Delete" buttons. On confirm: `useMutation` to `DELETE /api/promotions/${editSheetPromotion.id}/`. On success: invalidate query, close sheet and alert dialog, `toast({ description: "Promotion deleted." })`.

### Step 8: Build the Promotion Preview Card

At the bottom of `PromotionForm.tsx`, render a live preview card that updates as the operator fills in the form. Use `watch(['name', 'type', 'value', 'promo_code'])` to read all relevant fields reactively.

The preview card has a `background` (#F1F5F9) background, `border` (#E2E8F0) border, and Inter typography. It shows how the promotion label will appear to cashiers at the POS terminal. Sample preview text by type:
- `CART_PERCENTAGE`: "[Name] — [value]% off your entire cart."
- `CART_FIXED`: "[Name] — Rs. [value] off your cart."
- `CATEGORY_PERCENTAGE`: "[Name] — [value]% off all [category name] items."
- `BOGO`: "[Name] — Buy [min_quantity], get 1 free (up to Rs. [value])."
- `MIX_AND_MATCH`: "[Name] — Mix any [min_quantity] items and save Rs. [value]."
- `PROMO_CODE`: "Enter code [PROMO_CODE] at checkout to save [value] off your order."

If `name` is empty, show "Your Promotion Name" as a placeholder in `text-muted` (#64748B). The preview uses JetBrains Mono for the promo code string and monetary values; Inter for all other text. The preview card header reads "Preview" in `text-muted` (#64748B) 12px uppercase tracking-wider.

---

## Expected Output

- `frontend/app/[tenantSlug]/promotions/page.tsx` — page with role guard, promotion count subtitle, and "New Promotion" button.
- `frontend/app/[tenantSlug]/promotions/components/PromotionsTable.tsx` — table with type badges, status switch, and edit action.
- `frontend/app/[tenantSlug]/promotions/components/PromotionForm.tsx` — type-adaptive form with conditional fields, adaptive value field, and live preview card.
- Create dialog and edit sheet wired to the DRF CRUD endpoints.

---

## Validation

- Create a `PROMO_CODE` promotion: "Promo Code" input field appears, code stored uppercase in database, `promo_code` column displays in the table for that row.
- Create a `CATEGORY_PERCENTAGE` promotion: Category Combobox appears, selection stores `target_category_id` in the `Promotion` model.
- Change the promotion type selector to `BOGO` in the form: "Minimum Quantity" field appears with correct helper text; if switching from `PROMO_CODE`, the promo code field disappears and its Zod validation is no longer applied (use `refine` only when the field is visible).
- Status Switch toggled in the table: database `is_active` updates; optimistic update flips immediately.
- Duplicate promo code entered in the create modal: inline error appears under the promo code field before any network request is made.
- Open edit sheet for a CART_PERCENTAGE promotion: type selector is disabled with helper text. Changing other fields and saving via PATCH succeeds.
- Delete from edit sheet: AlertDialog confirms; `is_active=False` set in database; promotion disappears from the "active" count in the page subtitle.
- Preview card updates in real time as the operator types the promotion name and adjusts the value.

---

## Notes

The `type` field's `disabled` state in edit mode is enforced at the UI level only — it is also enforced at the API level by `UpdatePromotionSerializer.validate()` (see Task 04.02.07, Step 10). This dual enforcement prevents both accidental UI changes and deliberate API manipulation.

The client-side promo code uniqueness check uses the TanStack Query cache, meaning it works only for promotions already loaded on the page. This is a UX optimisation — the server always performs the authoritative uniqueness check via the `UniqueConstraint` on the model. The client check simply avoids a round-trip in the common case where the code obviously already exists in the loaded list.

The ShadCN `Sheet` component is used for the edit panel rather than a `Dialog` because it allows the operator to compare the existing promotions table (still visible behind the sheet) with the promotion being edited. The sheet slides in from the right, leaving the table partially visible, which helps the manager avoid accidentally creating duplicate promotions.
