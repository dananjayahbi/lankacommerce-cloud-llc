# Task 04.03.10 — Build Promotion Auto-Apply in POS

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.10 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | Promotion model (SubPhase 04.02, Task 04.02.07), POS CartPanel component (Phase 03), Zustand cart store (Phase 03) |
| Produces | Updated `frontend/stores/cartStore.ts`, updated CartPanel, `backend/apps/promotions/views/evaluate_views.py`, `backend/apps/promotions/views/validate_code_views.py` |
| Blocked By | Task 04.02.07 (Promotion model and DRF views) |

---

## Objective

The POS terminal must automatically evaluate and apply eligible promotions as the cashier scans items. Without this integration, the cashier would need to memorise every active promotion and manually apply them — an error-prone process that leads to missed discounts, customer complaints, and lost sales. LankaCommerce solves this with a dedicated promotion evaluation engine that runs in the backend, receiving the current cart state and returning all applicable discounts with their computed amounts.

Promotions come in two flavours: auto-apply promotions (no promo code required) and code-based promotions (customer enters a code). The auto-apply logic runs on every cart mutation with a 300ms debounce, giving the cashier a seamless experience where discounts appear in real time as items are scanned. Code-based promotions are validated separately when the operator enters a code in the promo code input row. Both paths converge on the same discount display in the CartPanel, where the customer can see every saving broken down line by line.

---

## Instructions

### Step 1: Create the Promotion Evaluate Endpoint

Create `backend/apps/promotions/views/evaluate_views.py`.

Decorate with `@api_view(["POST"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

**EvaluateSerializer**:

```python
class EvaluateSerializer(serializers.Serializer):
    cart_lines = serializers.ListField(
        child=serializers.DictField(),
        required=True,
    )
    customer_id = serializers.IntegerField(required=False, allow_null=True, default=None)
```

Where each `cart_line` dict contains: `variant_id` (int), `quantity` (int), `unit_price` (str/decimal string), `manual_discount_amount` (str, optional), `category_id` (int, optional).

**View logic in `evaluate_view`**:

1. Validate the serializer. Extract `cart_lines` and `customer_id`.
2. Compute the raw subtotal from cart_lines: `sum(Decimal(line['quantity']) * Decimal(line['unit_price']) for line in cart_lines)`.
3. Fetch active auto-apply promotions:
   ```python
   from django.utils import timezone
   now = timezone.now()
   promotions = Promotion.objects.filter(
       tenant_id=request.user.tenant_id,
       is_active=True,
       deleted_at__isnull=True,
       promo_code__isnull=True,   # Only auto-apply (no code)
       start_date__lte=now,
       end_date__gte=now,
   )
   ```
   If `start_date` or `end_date` are nullable, adjust the query: use `Q(start_date__lte=now) | Q(start_date__isnull=True)` for each date field.
4. Define a list `applied_discounts = []` and `skipped_promotions = []`.
5. Sort promotions by `priority` field (if exists) or by a fixed evaluation order:
   - Customer pricing rules (if `customer_id` is provided).
   - `CATEGORY_PERCENTAGE` promotions.
   - `BOGO` promotions.
   - `CART_PERCENTAGE` and `CART_FIXED` promotions.
6. For each promotion, evaluate conditions and compute discount:

   **Customer-scoped promotion** (has `customer_id`):
   - If no `customer_id` in request, skip with `reason: "No customer linked"`.
   - If the promotion has a `target_customer_group`, check customer belongs to that group via a `customer.groups` lookup.

   **`CATEGORY_PERCENTAGE`**:
   - Filter cart lines where `line['category_id'] == promotion.target_category_id`.
   - If none match: skip with `reason: "No qualifying items in cart"`.
   - Compute `qualifying_subtotal = sum(Decimal(line['quantity']) * Decimal(line['unit_price']) for line in qualifying_lines)`.
   - Discount = `qualifying_subtotal * Decimal(promotion.value) / 100`.
   - Round using `discount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.

   **`BOGO`**:
   - Check total quantity across all cart lines: `total_qty = sum(line['quantity'])`.
   - If `total_qty < promotion.min_quantity`: skip with `reason: f"Need at least {promotion.min_quantity} items, cart has {total_qty}"`.
   - Find the cheapest unit price across all cart lines: `cheapest = min(Decimal(line['unit_price']) for line in cart_lines)`.
   - Free item value = `min(cheapest, Decimal(promotion.value))` if `promotion.value > 0` else `cheapest`.
   - Discount = `free_item_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.

   **`CART_PERCENTAGE`**:
   - Check if `subtotal >= promotion.min_subtotal` (if `min_subtotal` is set).
   - Discount = `subtotal * Decimal(promotion.value) / 100`.
   - Cap at `promotion.max_discount_amount` if set.
   - Round using `ROUND_HALF_UP`.

   **`CART_FIXED`**:
   - Check `subtotal >= promotion.min_subtotal`.
   - Discount = `min(Decimal(promotion.value), subtotal)` — discount cannot exceed subtotal.
   - Round and cap.

7. For each successfully applied promotion, append to `applied_discounts`:
   ```python
   applied_discounts.append({
       "promotion_id": promo.id,
       "promotion_name": promo.name,
       "type": promo.type,
       "computed_amount": str(discount),
       "description": promo.description or "",
   })
   ```
8. For skipped promotions, append to `skipped_promotions`:
   ```python
   skipped_promotions.append({
       "promotion_id": promo.id,
       "promotion_name": promo.name,
       "reason": reason,
   })
   ```
9. Compute `total_discount_amount = sum(Decimal(d['computed_amount']) for d in applied_discounts)`.
10. Return the response:
    ```python
    return JsonResponse({
        "success": True,
        "data": {
            "applied_discounts": applied_discounts,
            "skipped_promotions": skipped_promotions,
            "total_discount_amount": str(total_discount_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
        }
    })
    ```

### Step 2: Create the Promo Code Validation Endpoint

Create `backend/apps/promotions/views/validate_code_views.py`.

Decorate similarly with `@api_view(["POST"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

**ValidateCodeSerializer**:

```python
class ValidateCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=True)
    cart_lines = serializers.ListField(child=serializers.DictField(), required=True)
    customer_id = serializers.IntegerField(required=False, allow_null=True, default=None)
```

**View logic in `validate_code_view`**:

1. Uppercase the submitted code: `code = validated_data['code'].upper()`.
2. Look up the promotion with a case-insensitive query:
   ```python
   promotion = Promotion.objects.filter(
       tenant_id=request.user.tenant_id,
       promo_code__iexact=code,
       is_active=True,
       deleted_at__isnull=True,
   ).first()
   ```
3. If not found, return 404:
   ```python
   return JsonResponse({
       "success": False,
       "error": {
           "code": "PROMO_NOT_FOUND",
           "message": "The promo code you entered is invalid or has expired."
       }
   }, status=404)
   ```
4. Check temporal validity:
   ```python
   now = timezone.now()
   if promotion.start_date and promotion.start_date > now:
       return JsonResponse({"success": False, "error": {"code": "PROMO_NOT_YET_ACTIVE", "message": "This promo code is not yet active."}}, status=422)
   if promotion.end_date and promotion.end_date < now:
       return JsonResponse({"success": False, "error": {"code": "PROMO_EXPIRED", "message": "This promo code has expired."}}, status=422)
   ```
5. Evaluate cart conditions (same logic as Step 1.6). If conditions not met, return 422:
   ```python
   return JsonResponse({
       "success": False,
       "error": {
           "code": "CONDITIONS_NOT_MET",
           "message": "The items in your cart do not meet the requirements for this promo code.",
           "details": {"reason": reason, "promotion_id": promotion.id}
       }
   }, status=422)
   ```
6. If valid, compute the discount (using the same logic as Step 1.6) and return:
   ```python
   return JsonResponse({
       "success": True,
       "data": {
           "promotion_id": promotion.id,
           "promotion_name": promotion.name,
           "type": promotion.type,
           "computed_amount": str(discount_amount),
           "description": promotion.description or "",
       }
   })
   ```

### Step 3: Extend the Zustand Cart Store

Edit `frontend/stores/cartStore.ts`. Add the following state and actions.

**State additions**:

```typescript
appliedPromotions: AppliedDiscount[];
skippedPromotions: SkippedPromotion[];
totalDiscountAmount: number;
appliedPromoCode: ValidatedCode | null;
isEvaluating: boolean;
```

Where:

```typescript
interface AppliedDiscount {
    promotion_id: number;
    promotion_name: string;
    type: string;
    computed_amount: string;
    description: string;
}

interface SkippedPromotion {
    promotion_id: number;
    promotion_name: string;
    reason: string;
}

interface ValidatedCode {
    promotion_id: number;
    promotion_name: string;
    type: string;
    computed_amount: string;
    description: string;
}
```

**Action: `evaluatePromotions`**:

```typescript
evaluatePromotions: async () => {
    const state = get();
    // Guard: empty cart => clear all promotion state
    if (state.cartItems.length === 0) {
        set({
            appliedPromotions: [],
            skippedPromotions: [],
            totalDiscountAmount: 0,
            appliedPromoCode: null,
            isEvaluating: false,
        });
        return;
    }

    set({ isEvaluating: true });

    const lines = state.cartItems.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
        manual_discount_amount: item.manual_discount_amount?.toString() || '0',
        category_id: item.category_id,
    }));

    try {
        const response = await fetch('/api/promotions/evaluate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cart_lines: lines,
                customer_id: state.customerId,
            }),
        });
        const body = await response.json();
        if (body.success) {
            set({
                appliedPromotions: body.data.applied_discounts,
                skippedPromotions: body.data.skipped_promotions,
                totalDiscountAmount: parseFloat(body.data.total_discount_amount) || 0,
                isEvaluating: false,
            });
        } else {
            // Do NOT clear previous state on error — keep showing last known discounts
            console.warn('Promotion evaluation failed:', body.error?.message);
            set({ isEvaluating: false });
        }
    } catch (err) {
        console.warn('Promotion evaluation network error:', err);
        set({ isEvaluating: false });
        // Keep previous promotion state intact
    }
},
```

**Debounce**: Define a module-level debounce utility:

```typescript
let evaluateTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

const debouncedEvaluate = (store: any) => {
    if (evaluateTimeout) clearTimeout(evaluateTimeout);
    evaluateTimeout = setTimeout(() => {
        store.getState().evaluatePromotions();
    }, DEBOUNCE_MS);
};
```

Call `debouncedEvaluate(useStore)` at the end of `addItem`, `removeItem`, `updateQuantity`, `linkCustomer`, and `unlinkCustomer`.

**Action: `applyPromoCode`**:

```typescript
applyPromoCode: async (code: string) => {
    // Clear any pending debounce to avoid race conditions
    if (evaluateTimeout) clearTimeout(evaluateTimeout);

    const state = get();
    set({ isEvaluating: true });

    try {
        const response = await fetch('/api/promotions/validate-code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                cart_lines: state.cartItems.map(item => ({
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price.toString(),
                    category_id: item.category_id,
                })),
                customer_id: state.customerId,
            }),
        });
        const body = await response.json();
        if (body.success) {
            set({
                appliedPromoCode: body.data,
                isEvaluating: false,
                totalDiscountAmount: state.totalDiscountAmount + parseFloat(body.data.computed_amount),
            });
        } else {
            throw new Error(body.error?.message || 'Invalid promo code');
        }
    } catch (err) {
        set({ isEvaluating: false });
        throw err; // Re-throw so UI can catch and show error
    }
},
```

**Action: `removePromoCode`**:

```typescript
removePromoCode: async () => {
    const state = get();
    const codeAmount = parseFloat(state.appliedPromoCode?.computed_amount || '0');
    set({
        appliedPromoCode: null,
        totalDiscountAmount: Math.max(0, state.totalDiscountAmount - codeAmount),
    });
    // Re-evaluate auto promotions after removal
    debouncedEvaluate(useStore);
},
```

**Action: `clearPromotions`**:

```typescript
clearPromotions: () => {
    if (evaluateTimeout) clearTimeout(evaluateTimeout);
    set({
        appliedPromotions: [],
        skippedPromotions: [],
        totalDiscountAmount: 0,
        appliedPromoCode: null,
        isEvaluating: false,
    });
},
```

### Step 4: Update the CartPanel Component

Edit `frontend/components/pos/CartPanel.tsx`. Add these sections between the subtotal row and the total row.

**Promotions Applied Section** (between cart items and subtotal):

- Only render if `appliedPromotions.length > 0`.
- Show a heading "Promotions Applied" in `text-muted` (#64748B) 12px uppercase.
- For each auto-applied promotion, show a row with:
  - Left: promotion name (Inter body, max 40 chars with ellipsis).
  - Right: "- Rs. X.XX" in `#F97316` (orange) with JetBrains Mono.
  - No remove button.

**Skipped Promotions Row** (subtle, only if `skippedPromotions.length > 0`):

- A small italic text: "[N] promotion(s) not applicable" in `#64748B`.
- On hover or click, show a tooltip listing each skipped promotion and its reason.

**Promo Code Input Row**:

- A horizontal flex container with an input field and an "Apply" button.
- Input: ShadCN `Input`, placeholder "Enter promo code", JetBrains Mono font, uppercase transform via `style={{ textTransform: 'uppercase' }}`.
- Button: ShadCN `Button`, label "Apply", `style={{ backgroundColor: '#1B2B3A' }}` (navy). Disabled when input is empty or `isEvaluating` is true.
- Click: call `applyPromoCode(inputValue)`. Catch errors and display inline error text below the input row in `#EF4444` (danger) with JetBrains Mono 12px.
- If `appliedPromoCode` is set, show the promo code chip instead of the input row:
  - Chip: `bg-gray-100` background, JetBrains Mono text, uppercase code, with an × remove button. On remove click: call `removePromoCode()`.

**Discounts Row** (between subtotal and total):

- Only render if `totalDiscountAmount > 0`.
- Left label: "Discounts" in Inter body.
- Right value: `-Rs. X.XX` in `#F97316` (orange), JetBrains Mono, bold.
- If `isEvaluating`, show a pulsing skeleton/blur placeholder instead of the value.

**After quantity change**: In the `updateQuantity` action, after recalculating totals, call `debouncedEvaluate(useStore)`.

---

## Expected Output

- `backend/apps/promotions/views/evaluate_views.py` — POST endpoint computing discounts from active auto-apply promotions.
- `backend/apps/promotions/views/validate_code_views.py` — POST endpoint for promo code validation with descriptive error codes.
- Updated `frontend/stores/cartStore.ts` — `evaluatePromotions()`, `applyPromoCode()`, `removePromoCode()`, `clearPromotions()` with 300ms debounce.
- Updated `frontend/components/pos/CartPanel.tsx` — promotions section, promo code input row, discount display.

---

## Validation

- **Auto-apply on item add**: Add an item that belongs to a category with an active `CATEGORY_PERCENTAGE` promotion. The CartPanel shows the discount within 500ms (300ms debounce + network time) of the item appearing in the list.
- **Auto-apply removal**: Remove the last qualifying item from the cart. The promotion disappears from the "Promotions Applied" section.
- **Promo code valid**: Enter a valid promo code. The code chip appears with an × button. The discount amount appears in the Discounts row.
- **Promo code not found**: Enter an invalid promo code. Inline error "The promo code you entered is invalid or has expired." appears below the input.
- **Promo code expired**: Enter an expired promo code. Inline error "This promo code has expired." appears.
- **Promo conditions not met**: Enter a code for a BOGO promotion but only have 1 item (min_quantity=2). Inline error "The items in your cart do not meet the requirements..." with reason.
- **Remove promo code**: Click the × on an applied promo code chip. The chip disappears, the discount amount decreases by the code's value.
- **Cart cleared**: Remove all items. `clearPromotions()` is called. All promotion state resets.
- **Network failure during evaluation**: Disconnect the network. Add an item. The existing promotion state remains visible (no clearing on error). A warning is logged to console.
- **Multiple promotions stacking**: Add a cart that qualifies for a CART_PERCENTAGE (10% off) and a CATEGORY_PERCENTAGE (5% off socks). Both appear in "Promotions Applied". The total discount is the sum.
- **Evaluating indicator**: While `isEvaluating` is true, the discount value area shows a subtle pulse animation or skeleton placeholder instead of stale values.

---

## Notes

The 300ms debounce on `evaluatePromotions()` is critical for performance. Without it, scanning 10 barcodes in quick succession would fire 10 API calls, overwhelming the server and causing a thundering herd problem on the promotions endpoint. The debounce ensures that only the final cart state triggers the evaluation. However, there is a subtle edge case: if a promo code is applied manually while a debounced auto-evaluation is still pending, the `applyPromoCode` action cancels the pending timeout to prevent the auto-evaluation from overwriting the code-applied state. This cancellation is done by clearing the module-level `evaluateTimeout` variable at the start of `applyPromoCode`.

The evaluation endpoint deliberately does NOT persist discounts to the database. Discounts are computed ephemerally based on the current cart state and applied at sale finalisation (when the sale is tendered). This means the evaluation endpoint is stateless and horizontally scalable — any server replica can compute the same result from the same cart state. The actual discount application to the Sale model happens in the sale finalisation view (Phase 03.02.03), which re-evaluates promotions one final time to ensure consistency.

The `PROMO_NOT_FOUND`, `PROMO_NOT_YET_ACTIVE`, `PROMO_EXPIRED`, and `CONDITIONS_NOT_MET` error codes are designed for the frontend to map to specific UI states without parsing the message string. The frontend should use `error.code` to determine which UI feedback to show: `PROMO_NOT_FOUND` shows a generic "invalid code" message, while `CONDITIONS_NOT_MET` shows a more specific message with the reason from `error.details.reason`.

## Objective

Wire automatic promotion evaluation into the POS terminal cart. Add promo code input.

## Instructions

### Step 1: Promotion Evaluate Endpoint

Create `POST /api/promotions/evaluate/` in `evaluate_views.py`. Authenticate using `JWTAuthentication` and `HasTenantPermission`. Accept a request body containing:

- `cart_lines` — an array of objects, each with `variant_id`, `quantity`, `unit_price`, `manual_discount_amount`, and `category_id`.
- `customer_id` — optional, for customer-specific promotions.

Fetch all active promotions for the tenant: `is_active=True`, `start_date <= now`, and `end_date >= now`.

For each auto-apply promotion (where `promo_code` is null), evaluate conditions:

- **min_subtotal** — reject if cart subtotal is below threshold.
- **Product/category scope** — check whether qualifying cart lines exist.
- **Customer eligibility** — if customer-scoped, check customer matches criteria.

Compute the discount based on promotion type:

- `CART_PERCENTAGE` — subtotal multiplied by `value` divided by 100.
- `CART_FIXED` — minimum of `value` and cart subtotal.
- `CATEGORY_PERCENTAGE` — qualifying lines subtotal multiplied by `value` divided by 100.
- `BOGO` — the cheapest qualifying unit price for every `min_quantity` units.

Return the response envelope:
`{ "success": True, "data": { "applied_discounts": [...], "skipped_promotions": [...], "total_discount_amount": "X.XX" } }`

### Step 2: Promo Code Validation Endpoint

Create `POST /api/promotions/validate-code/` in `validate_code_views.py`. Accept a request body containing:

- `code` — the promo code, uppercased before querying.
- `cart_lines` — same structure as the evaluate endpoint.
- `customer_id` — optional.

Query the promotion by `promo_code` using a case-insensitive lookup. Handle these outcomes:

- If not found: return 404 with `{ "success": False, "error": { "code": "PROMO_NOT_FOUND", "message": "The promo code you entered is invalid or has expired." } }`.
- If found but conditions are not met: return 422 with appropriate error details.
- If valid: return the applied discount information.

### Step 3: Cart Store Updates

Add the following state variables to the Zustand cart store:

- `applied_promotions: AppliedDiscount[]` — array of currently applied auto-promotions.
- `skipped_promotions` — promotions that were evaluated but conditions not met.
- `total_discount_amount` — aggregated discount total.
- `applied_promo_code` — the validated promo code if one is applied.
- `is_evaluating` — boolean flag for loading state.

Add these actions:

- `evaluatePromotions()` — serialises current cart lines, POSTs to `/api/promotions/evaluate/`, and updates state. Debounce by 300ms. Call at the end of every cart mutation.
- `applyPromoCode(code)` — POSTs to `/api/promotions/validate-code/` and merges the result into the store state.
- `removePromoCode(id)` — filters out the specified promo code and re-evaluates.
- `clearPromotions()` — clears all promotion state without making a network call (used when cart becomes empty).

### Step 4: CartPanel Updates

Update the CartPanel component with these new sections:

- **Promotions Applied** — auto-applied discounts shown with a label but without a remove button.
- **Promo Code Input Row** — an input field with an "Apply" button and an inline error message area below.
- **Code-Applied Promo Chips** — promo codes that were manually applied shown as chips with a remove button.
- **Discounts Row** — a line item between "Subtotal" and "Total" displaying the total discount amount in orange (#F97316) with a minus prefix.
