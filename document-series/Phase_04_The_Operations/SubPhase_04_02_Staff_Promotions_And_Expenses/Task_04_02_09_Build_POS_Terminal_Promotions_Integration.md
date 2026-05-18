# Task 04.02.09 — Build POS Terminal Promotions Integration

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.09 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | High |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.07 (promotion evaluation DRF view); Phase 03 cart Zustand store in `frontend/stores/cartStore.ts`; Phase 03 `CreateSaleView` in `backend/apps/pos/views/sale_views.py` |
| Produces | Updated `frontend/stores/cartStore.ts`, `frontend/app/[tenantSlug]/terminal/components/PromotionLabelList.tsx`, `frontend/app/[tenantSlug]/terminal/components/PromoCodeInput.tsx`, updated `backend/apps/pos/views/sale_views.py` |
| Blocked By | Task 04.02.07 |

---

## Objective

Integrate the promotions evaluation engine into the POS cart flow. Every cart mutation triggers a debounced evaluation request. Applied promotion labels appear as pills beneath the affected line items. A promo code input field is added to the CartPanel footer. On sale completion, the `applied_promotions` snapshot is persisted to the sale record. The promotion state in the cart store is designed to be resilient — transient network failures during evaluation never clear existing promotion pills.

---

## Instructions

### Step 1: Define Shared Promotion Types

Create `frontend/types/promotions.ts`. Export the following TypeScript interfaces that mirror the Python dataclasses from Task 04.02.07:

`AppliedDiscount`: `{ promotion_id: string; label: string; discount_amount: string; promotion_type: string; affected_lines: string[] }`.

`SkippedPromotion`: `{ promotion_id: string; label: string; reason: string }`.

`EvaluationResult`: `{ applied_discounts: AppliedDiscount[]; skipped_promotions: SkippedPromotion[]; total_discount_amount: string }`.

All monetary amounts are `string` (not `number` or `Decimal`) because the API serialises `Decimal` as strings, and the frontend uses `decimal.js` for any arithmetic.

### Step 2: Extend the Cart Store State Type

Open `frontend/stores/cartStore.ts`. Extend the existing cart state interface with these new fields:

`applied_promotions: AppliedDiscount[]` — list of currently applied promotions. Default: `[]`.
`skipped_promotions: SkippedPromotion[]` — list of promotions evaluated but not applied, with reasons. Default: `[]`.
`total_discount_amount: string` — string-formatted Decimal total of all applied discounts. Default: `"0"`.
`applied_promo_code: string | null` — the promo code the cashier has entered, or null. Default: `null`.
`is_evaluating_promotions: boolean` — true while a promotion evaluation request is in-flight. Default: `false`.

Extend the cart actions interface with:
`evaluatePromotions: () => Promise<void>` — triggers the evaluation API call.
`setPromoCode: (code: string | null) => void` — sets `applied_promo_code` and triggers evaluation.

### Step 3: Implement the evaluatePromotions Action

Within the Zustand `create` callback in `cartStore.ts`, implement `evaluatePromotions` as an async function.

Guard: if `get().cart_lines.length === 0`, reset `applied_promotions: []`, `skipped_promotions: []`, `total_discount_amount: "0"`, and return early. Do not make a network request for an empty cart.

Set `is_evaluating_promotions: true`.

Serialise cart lines: build a JSON string from `get().cart_lines` mapping each line to `{ variant_id, quantity, unit_price: line.unit_price.toString(), manual_discount_amount: line.manual_discount_amount?.toString() ?? "0", category_id: line.category_id ?? null }`. Use `encodeURIComponent(JSON.stringify(cartLinesArray))` for the query string value to handle special characters safely.

Build query params: `const params = new URLSearchParams({ cart_lines: serialisedLines })`. Append `customer_id` from `get().customer_id` if non-null. Append `promo_code` from `get().applied_promo_code` if non-null.

Fetch: `const res = await fetch(/api/promotions/evaluate/?${params.toString()}, { method: 'GET', headers: { Authorization: Bearer ${token} } })`. The JWT token should be retrieved from the auth store or cookie.

On success (`res.ok`): `const json = await res.json()`. Update state: `applied_promotions: json.data.applied_discounts`, `skipped_promotions: json.data.skipped_promotions`, `total_discount_amount: json.data.total_discount_amount`, `is_evaluating_promotions: false`.

On network error or non-ok response: `set({ is_evaluating_promotions: false })`. Do NOT clear `applied_promotions` or reset `total_discount_amount` — leave the previous state intact. Log a warning: `console.warn('Promotion evaluation failed:', res.status)`. This ensures that on a transient network failure, cashiers see the last known discount state rather than a blank promotions section, which would be confusing.

### Step 4: Create a Module-Level Debounce Utility

If a `debounce` utility is not already present in `frontend/utils/`, create `frontend/utils/debounce.ts` exporting a simple `debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T` function using `setTimeout`/`clearTimeout`.

Alternatively, if `lodash-es` is already a project dependency, import `debounce` from `lodash-es` in `cartStore.ts`.

Create a module-level constant `debouncedEvaluate` by calling `debounce(evaluatePromotions, 300)` outside the `create` callback (referencing the store's `getState().evaluatePromotions`). This ensures the debounce timer is shared across all cart mutations rather than recreated per call.

### Step 5: Wire evaluatePromotions to All Cart Mutations

In `cartStore.ts`, at the end of each of the following action implementations, call `debouncedEvaluate()` after the synchronous state update:

- `addLine` — called when a product variant is added to the cart.
- `removeLine` — called when a line is removed.
- `updateLineQuantity` — called when quantity changes.
- `applyManualDiscount` — called when the cashier applies a manual discount to a line.
- `clearCart` — call `set({ applied_promotions: [], skipped_promotions: [], total_discount_amount: "0", applied_promo_code: null })` instead (no point evaluating an empty cart).

The cart mutation remains synchronous and immediate. The promotion evaluation is fire-and-forget, asynchronously updating the store when the response arrives.

Implement `setPromoCode` as: `set({ applied_promo_code: code })`, then immediately call `debouncedEvaluate()`. The debounce is intentionally NOT bypassed here — calling `evaluatePromotions()` directly (bypassing the debounce) would be correct from a UX standpoint (the cashier clicked "Apply") but would cause issues if a cart mutation fired 50ms before the Apply button was clicked. Bypassing the debounce in `setPromoCode` by calling `evaluatePromotions()` directly is acceptable if the debounce timer is also cancelled: call `debouncedEvaluate.cancel()` before calling `evaluatePromotions()` directly in `setPromoCode`. This ensures the debounce-in-flight call does not fire after the manual call.

### Step 6: Build PromotionLabelList Component

Create `frontend/app/[tenantSlug]/terminal/components/PromotionLabelList.tsx`.

**Props**: `appliedDiscounts: AppliedDiscount[]` (pre-filtered by the parent to include only discounts affecting the current line's `variant_id`), `isEvaluating: boolean`.

When `isEvaluating` is `true`: render a skeleton placeholder — a single grey pill with an animated pulse in place of the promotion labels, indicating an evaluation is in progress. Use `animate-pulse` from Tailwind. Do not show stale discount pills alongside the skeleton — hide them while evaluation is in-flight.

When `isEvaluating` is `false` and `appliedDiscounts` is non-empty: for each discount, render a pill below the cart line item:
- Background: `#F1F5F9` (background colour).
- Left border (4px solid): `#E2E8F0` (border colour).
- Text in Inter 11px: "[discount.label]" on the left, `−Rs. [discount.discount_amount]` on the right in JetBrains Mono.
- Use `decimal.js` to format `discount.discount_amount`: `new Decimal(discount.discount_amount).toFixed(2)`.

When `isEvaluating` is `false` and `appliedDiscounts` is empty: render nothing (null). Do not show a "no promotions" message at the line level.

### Step 7: Integrate PromotionLabelList into CartLine Rows

Locate the existing `CartLineRow` component in the POS terminal UI (within `frontend/components/pos/CartPanel.tsx` or whichever file renders the per-line cart rows in the Phase 03 implementation).

Below the row's total amount cell (or below the quantity controls), insert:

`<PromotionLabelList appliedDiscounts={cartStore.applied_promotions.filter(d => d.affected_lines.includes(line.variant_id))} isEvaluating={cartStore.is_evaluating_promotions} />`

The `filter` call is inline and cheap since `applied_promotions` is typically a small array (fewer than 10 items in any realistic cart). If performance profiling reveals this is called excessively, memoize with `useMemo`.

### Step 8: Build PromoCodeInput Component

Create `frontend/app/[tenantSlug]/terminal/components/PromoCodeInput.tsx`.

**Props**: none (reads and writes directly from the Zustand cart store via `useCartStore`).

Layout: a horizontal row with a text input and an "Apply" button, compact enough to fit in the CartPanel footer. Below the row, a feedback area (error or success).

Input element: ShadCN `Input`, `placeholder="Promo Code"`, `borderColor: '#E2E8F0'` (border), font-family JetBrains Mono. Uncontrolled local state `inputValue: string`.

"Apply" button: on click:
1. If `inputValue.trim()` is empty, show inline `"Please enter a promo code."` below the input and return.
2. Call `cartStore.setPromoCode(inputValue.trim().toUpperCase())`. This triggers debounce-cancelled evaluation immediately.
3. Clear the input field: `setInputValue('')`.

After evaluation completes (react to `cartStore.is_evaluating_promotions` transitioning from `true` to `false` using a `useEffect`):
- Check if any applied discount has `promotion_type === 'PROMO_CODE'` — if yes, the code was accepted.
- Check if `cartStore.skipped_promotions` has an entry with `promotion_id === 'promo_code'` — if yes, the code was rejected. Show the `reason` string below the input in `#EF4444` red, Inter 13px.

If a promo code is currently applied (`cartStore.applied_promo_code` is non-null and evaluation shows it as applied): show a chip with the promo code value (JetBrains Mono, `#1B2B3A` navy text on `#E2E8F0` border background) and an `×` button. Clicking `×` calls `cartStore.setPromoCode(null)` to clear the code and re-evaluate.

### Step 9: Integrate PromoCodeInput and Discounts Section into CartPanel

In the CartPanel footer (the totals block), make the following additions:

**Above the totals block**: render `<PromoCodeInput />`.

**Between Subtotal and Tax rows**: add a "Discounts" section, conditional on `cartStore.total_discount_amount !== "0"`:

For each `AppliedDiscount` in `cartStore.applied_promotions`: render a row with the `label` in `text-muted` (#64748B) on the left and `−Rs. [discount_amount]` in JetBrains Mono `navy` (#1B2B3A) on the right, with a minus sign prefix.

A bold "Total Discounts" row summing all applied discounts — compute using `decimal.js`: `cartStore.applied_promotions.reduce((acc, d) => acc.plus(new Decimal(d.discount_amount)), new Decimal('0')).toFixed(2)`.

If `cartStore.skipped_promotions.length > 0`: a collapsible "Promotions Not Applied" section below the discounts. Collapsed by default. When expanded, shows each `SkippedPromotion.label` and `reason` in `text-muted` (#64748B) Inter 12px. Use a ShadCN `Collapsible` component for this.

### Step 10: Update the Sale DRF View for applied_promotions Persistence

Open `backend/apps/pos/views/sale_views.py`. Update `CreateSaleSerializer` to accept an additional optional field:

`applied_promotions = serializers.ListField(child=serializers.DictField(), required=False, default=list)`

In `CreateSaleView.post`: when creating the `Sale` record, pass `applied_promotions=validated_data.get('applied_promotions', [])` to `Sale.objects.create(...)`.

In the frontend sale completion call (in `frontend/stores/cartStore.ts` or wherever `POST /api/pos/sales/` is triggered from), include `applied_promotions: cartStore.applied_promotions.map(d => ({ ...d, discount_amount: d.discount_amount }))` in the request body. This converts the `AppliedDiscount` objects to plain dicts that are JSON-serialisable.

---

## Expected Output

- `frontend/types/promotions.ts` with `AppliedDiscount`, `SkippedPromotion`, `EvaluationResult` TypeScript interfaces.
- `frontend/stores/cartStore.ts` updated with promotion state, `evaluatePromotions`, `setPromoCode`, and debounced wiring in all cart mutations.
- `frontend/utils/debounce.ts` (if not already present).
- `frontend/app/[tenantSlug]/terminal/components/PromotionLabelList.tsx`.
- `frontend/app/[tenantSlug]/terminal/components/PromoCodeInput.tsx`.
- Updated CartPanel with `PromoCodeInput`, promotion pills on line items, and discounts section in totals.
- Updated `backend/apps/pos/views/sale_views.py` persisting `applied_promotions`.

---

## Validation

- Add an item from a category covered by an active `CATEGORY_PERCENTAGE` promotion — after 300 ms, a promotion pill appears below that line item; totals show a "Discounts" section.
- Remove the item — promotion pills disappear and totals reset.
- Enter a valid promo code and click Apply — chip appears with × button, discount row appears in totals.
- Enter an invalid promo code — error message in `#EF4444` appears below the input; no cart total change.
- Click × on the promo code chip — code cleared, promotions re-evaluated without the code.
- Simulate a network failure during evaluation (Chrome DevTools offline mode): previous discount pills remain visible; no error is shown to the cashier (only a console warning).
- Complete a sale with an active promotion — `Sale.applied_promotions` in database contains the serialised promotion array. Verify in Django shell: `sale.applied_promotions` is a list with at least one dict containing `promotion_id` and `discount_amount`.
- Cart is cleared (new sale started) — `applied_promotions = []`, `total_discount_amount = "0"`, no pills visible.

---

## Notes

The `total_discount_amount` in the cart store is a string, not a `Decimal` or `number`. Frontend arithmetic using this value must always go through `new Decimal(cartStore.total_discount_amount)` from `decimal.js`. Never parse it with `parseFloat()` — JavaScript float arithmetic is forbidden for monetary values.

The 300 ms debounce is a balance between evaluation freshness and API load. A cashier rapidly entering item quantities (e.g., changing from 1 to 10 by pressing the up arrow 9 times) will only trigger one evaluation request when they stop typing, rather than 9. The skeleton in `PromotionLabelList` provides visual feedback during the debounce window that evaluation is in progress.

The `select_for_update` is not needed in the evaluate view since evaluation is read-only — it only reads `Promotion` and `CustomerPricingRule` records and returns computed discounts. The `no-store` `Cache-Control` header is still critical even though the view uses `GET`, because HTTP caches (including the browser cache) may cache GET responses by default.
