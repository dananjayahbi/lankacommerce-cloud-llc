# Task 04.02.07 — Build Promotion Service Layer

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.07 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Very High |
| Estimated Effort | 2 days |
| Dependencies | Task 04.02.01 (`Promotion`, `CustomerPricingRule` models migrated); Phase 02 `Category`, `Customer`, `ProductVariant` models in `backend/apps/pos/` and `backend/apps/crm/` |
| Produces | `backend/apps/promotions/services/promotion_service.py`, `backend/apps/promotions/views/evaluate_views.py`, `backend/apps/promotions/views/promotion_views.py` |
| Blocked By | Task 04.02.01 |

---

## Objective

Implement the LankaCommerce promotions evaluation engine — a deterministic, priority-ordered service that examines a cart's contents and returns a structured list of applicable discounts and skipped promotions. The engine supports six promotion types, respects manual cashier discounts, and evaluates customer-specific pricing rules before any automatic promotions. The `EvaluationResult` is designed to feed both the real-time POS cart display (Task 04.02.09) and the `applied_promotions` snapshot stored at sale completion.

---

## Instructions

### Step 1: Define Service-Layer Data Classes

Create `backend/apps/promotions/services/promotion_service.py`. Create the `services/` directory in `backend/apps/promotions/` with an `__init__.py`.

At the top of the file, import: `from dataclasses import dataclass, field`. `from decimal import Decimal, ROUND_HALF_UP`. `from typing import Optional, List`. `from django.db.models import Q`. `from django.utils import timezone`.

Define the following dataclasses:

`@dataclass` `CartLine`: fields `variant_id: str`, `quantity: int`, `unit_price: Decimal`, `manual_discount_amount: Decimal = field(default_factory=lambda: Decimal('0'))`, `category_id: Optional[str] = None`.

`@dataclass` `AppliedDiscount`: fields `promotion_id: str`, `label: str`, `discount_amount: Decimal`, `promotion_type: str`, `affected_lines: List[str] = field(default_factory=list)`.

`@dataclass` `SkippedPromotion`: fields `promotion_id: str`, `label: str`, `reason: str`.

`@dataclass` `EvaluationResult`: fields `applied_discounts: List[AppliedDiscount] = field(default_factory=list)`, `skipped_promotions: List[SkippedPromotion] = field(default_factory=list)`, `total_discount_amount: Decimal = field(default_factory=lambda: Decimal('0'))`.

Using `@dataclass` rather than plain dicts provides type safety, allows attribute access rather than key lookup in service functions, and makes the result easily serialisable for the DRF view (each dataclass can be converted to a dict with `dataclasses.asdict(result)`).

### Step 2: Implement the Promotion Fetcher

Define private function `_fetch_active_promotions(tenant_id: str) -> List`:

`from backend.apps.promotions.models import Promotion, PromotionType`

Query: `Promotion.objects.filter(tenant_id=tenant_id, is_active=True).filter(Q(starts_at__isnull=True) | Q(starts_at__lte=timezone.now())).filter(Q(ends_at__isnull=True) | Q(ends_at__gte=timezone.now())).select_related('target_category')`.

Return `list(qs)`. The result is a Python list of Django model instances evaluated at call time. This list is passed to the type-specific evaluation functions below to avoid repeated database queries.

### Step 3: Implement Customer Pricing Rule Evaluation

Define `_evaluate_customer_pricing(tenant_id: str, cart_lines: List[CartLine], customer_id: Optional[str]) -> tuple`:

Returns `(applied_discounts: List[AppliedDiscount], discounted_variant_ids: set)`.

If `customer_id` is None: return `([], set())`.

Fetch: `from backend.apps.crm.models import Customer`. `customer = Customer.objects.filter(id=customer_id, tenant_id=tenant_id).first()`. If `customer` is None or `customer.tags` is empty: return `([], set())`.

Query pricing rules: `from backend.apps.promotions.models import CustomerPricingRule`. `rules = CustomerPricingRule.objects.filter(tenant_id=tenant_id, is_active=True, customer_tag__in=customer.tags).filter(Q(starts_at__isnull=True)|Q(starts_at__lte=now)).filter(Q(ends_at__isnull=True)|Q(ends_at__gte=now)).select_related('variant')`.

For each rule, for each cart_line where (`rule.variant_id is None` or `rule.variant_id == line.variant_id`) and `rule.price < line.unit_price` and `line.manual_discount_amount == Decimal('0')`:

`savings_per_unit = (line.unit_price - rule.price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`. `discount_amount = savings_per_unit * Decimal(str(line.quantity))`. Create `AppliedDiscount(promotion_id=str(rule.id), label=f"Customer price: Rs.{rule.price}/unit", discount_amount=discount_amount, promotion_type='CUSTOMER_PRICING', affected_lines=[line.variant_id])`.

Collect all affected `variant_id` strings into `discounted_variant_ids`.

Return `(applied_discounts, discounted_variant_ids)`.

### Step 4: Implement Category Percentage Evaluation

Define `_evaluate_category_discounts(cart_lines: List[CartLine], promotions: List, already_discounted_variant_ids: set) -> List[AppliedDiscount]`:

Filter `category_promotions = [p for p in promotions if p.type == 'CATEGORY_PERCENTAGE']`.

For each promotion:
- Find qualifying lines: `qualifying = [l for l in cart_lines if l.category_id == str(promotion.target_category_id) and l.variant_id not in already_discounted_variant_ids and l.manual_discount_amount == Decimal('0')]`.
- If `qualifying` is empty: skip this promotion.
- For each qualifying line, compute line-level discount: `line_discount = (line.unit_price * Decimal(str(line.quantity)) * promotion.value / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.
- Sum line discounts: `total_discount = sum(ld for ld in line_discounts, Decimal('0'))`. Never use float.
- Create one `AppliedDiscount` covering all qualifying lines: `AppliedDiscount(promotion_id=str(promotion.id), label=f"{promotion.name} ({promotion.value}% off)", discount_amount=total_discount, promotion_type='CATEGORY_PERCENTAGE', affected_lines=[l.variant_id for l in qualifying])`.
- Add all qualifying `variant_ids` to `already_discounted_variant_ids`.

Return list of `AppliedDiscount` objects, one per applied category promotion.

### Step 5: Implement BOGO Evaluation

Define `_evaluate_bogo(cart_lines: List[CartLine], promotions: List, already_discounted_variant_ids: set) -> List[AppliedDiscount]`:

Filter `bogo_promos = [p for p in promotions if p.type in ('BOGO', 'MIX_AND_MATCH')]`.

For each promotion:
- Minimum quantity to qualify: `min_qty = promotion.min_quantity or 2`.
- Qualifying lines: all cart lines not in `already_discounted_variant_ids` and with `manual_discount_amount == Decimal('0')`.
- Total quantity across qualifying lines: `total_qty = sum(l.quantity for l in qualifying)`.
- If `total_qty < min_qty`: skip.
- Find the cheapest qualifying line by `unit_price`: `cheapest = min(qualifying, key=lambda l: l.unit_price)`.
- `discount_amount = cheapest.unit_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.
- Guard: `max_possible = sum(l.unit_price * Decimal(str(l.quantity)) for l in qualifying, Decimal('0'))`. If `discount_amount > max_possible`: `discount_amount = max_possible`.
- Create `AppliedDiscount(promotion_id=str(promotion.id), label=promotion.name, discount_amount=discount_amount, promotion_type=promotion.type, affected_lines=[l.variant_id for l in qualifying])`.
- Do NOT add qualifying variants to `already_discounted_variant_ids` — BOGO and MIX_AND_MATCH may stack with category discounts in theory, though in practice the operator configures them to target different categories.

Return the list.

### Step 6: Implement Cart-Level Promotion Evaluation

Define `_evaluate_cart_promotions(cart_lines: List[CartLine], promotions: List, current_subtotal: Decimal, already_applied_promo_ids: set) -> tuple`:

Returns `(applied: List[AppliedDiscount], skipped: List[SkippedPromotion])`.

Filter `cart_promos = [p for p in promotions if p.type in ('CART_PERCENTAGE', 'CART_FIXED') and str(p.id) not in already_applied_promo_ids]`.

If `current_subtotal <= Decimal('0')`: return `([], [])` — no subtotal to discount.

For each cart promotion, compute its potential discount:
- `CART_PERCENTAGE`: `potential = (current_subtotal * p.value / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.
- `CART_FIXED`: `potential = min(p.value, current_subtotal).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.

Sort by potential discount descending. Apply only the first (highest-value) promotion. Mark all others as `SkippedPromotion(reason="A higher-value cart promotion is already applied.")`.

For the applied promotion: `AppliedDiscount(promotion_id=str(p.id), label=promotion.name, discount_amount=potential, promotion_type=p.type, affected_lines=[])` — cart-level promotions have no specific affected lines.

Return `([best_applied], [skipped_others])`.

### Step 7: Implement validate_promo_code

Define exported function `validate_promo_code(tenant_id: str, code: str, cart_lines: List[CartLine]) -> dict`:

1. Normalise: `code = code.strip().upper()`.
2. `now = timezone.now()`.
3. Query: `from backend.apps.promotions.models import Promotion`. `promo = Promotion.objects.filter(tenant_id=tenant_id, type='PROMO_CODE', promo_code__iexact=code, is_active=True).filter(Q(starts_at__isnull=True)|Q(starts_at__lte=now)).filter(Q(ends_at__isnull=True)|Q(ends_at__gte=now)).first()`.
4. If None: return `{ 'valid': False, 'code': 'PROMO_NOT_FOUND', 'message': 'This promo code does not exist or has expired.' }`.
5. Evaluate the promo code's effect: compute `potential = (sum_of_subtotal * promo.value / Decimal('100')).quantize(Decimal('0.01'))` for percentage type, or `min(promo.value, subtotal)` for fixed. If `potential <= Decimal('0')`: return `{ 'valid': False, 'code': 'PROMO_NOT_APPLICABLE', 'message': 'This promo code is not applicable to your current cart.' }`.
6. Create `discount = AppliedDiscount(promotion_id=str(promo.id), label=f"Promo Code: {code}", discount_amount=potential, promotion_type='PROMO_CODE', affected_lines=[])`.
7. Return `{ 'valid': True, 'discount': discount }`.

### Step 8: Implement evaluate_promotions — Main Entry Point

Define exported function `evaluate_promotions(tenant_id: str, cart_lines: List[CartLine], customer_id: Optional[str] = None, applied_promo_code: Optional[str] = None) -> EvaluationResult`:

1. If `cart_lines` is empty: return `EvaluationResult()` immediately.
2. `all_promotions = _fetch_active_promotions(tenant_id)`.
3. `customer_discounts, already_discounted = _evaluate_customer_pricing(tenant_id, cart_lines, customer_id)`.
4. `category_discounts = _evaluate_category_discounts(cart_lines, all_promotions, already_discounted)`. Update `already_discounted` with any new variants from category discounts.
5. `bogo_discounts = _evaluate_bogo(cart_lines, all_promotions, already_discounted)`.
6. Compute `remaining_subtotal = sum of (line.unit_price * Decimal(str(line.quantity)) for line in cart_lines) - sum of all applied discount amounts so far`. Never allow `remaining_subtotal < Decimal('0')`.
7. `already_applied_ids = set of promotion_id strings from steps 3–5`.
8. `cart_applied, cart_skipped = _evaluate_cart_promotions(cart_lines, all_promotions, remaining_subtotal, already_applied_ids)`.
9. If `applied_promo_code` is set: `promo_result = validate_promo_code(tenant_id, applied_promo_code, cart_lines)`. If `promo_result['valid']`: append `promo_result['discount']` to applied discounts. Else: append `SkippedPromotion(promotion_id='promo_code', label=applied_promo_code, reason=promo_result['message'])` to skipped.
10. `all_applied = customer_discounts + category_discounts + bogo_discounts + cart_applied + (promo discounts if valid)`.
11. `total_discount = sum(d.discount_amount for d in all_applied, Decimal('0'))`.
12. Return `EvaluationResult(applied_discounts=all_applied, skipped_promotions=cart_skipped + (promo skip if applicable), total_discount_amount=total_discount)`.

### Step 9: Build the Evaluate DRF View

Create `backend/apps/promotions/views/evaluate_views.py`. Create `views/` directory with `__init__.py`.

Define `PromotionEvaluateView` extending `APIView` with `JWTAuthentication` and `HasTenantPermission`.

**`get` method** — `GET /api/promotions/evaluate/`:
1. Parse `cart_lines_json = request.query_params.get('cart_lines', '[]')`. Parse with `json.loads(cart_lines_json)`. Catch `json.JSONDecodeError` — return 400.
2. Validate each cart line dict with `CartLineSerializer` (a DRF serializer): `variant_id` (CharField), `quantity` (IntegerField, min 1), `unit_price` (DecimalField as string), `manual_discount_amount` (DecimalField as string, optional, default `"0"`), `category_id` (CharField, optional).
3. Convert validated dicts to `CartLine` dataclasses: `cart_lines = [CartLine(variant_id=d['variant_id'], quantity=d['quantity'], unit_price=Decimal(d['unit_price']), manual_discount_amount=Decimal(d.get('manual_discount_amount', '0')), category_id=d.get('category_id')) for d in validated]`.
4. `customer_id = request.query_params.get('customer_id')`.
5. `promo_code = request.query_params.get('promo_code')`.
6. `result = evaluate_promotions(user.tenant_id, cart_lines, customer_id, promo_code)`.
7. Serialise: `import dataclasses; result_dict = dataclasses.asdict(result)`. Convert all `Decimal` values in the dict to strings recursively (a small helper function `_decimals_to_str(d)` handles this).
8. Set response header: `response['Cache-Control'] = 'no-store'`.
9. Return `{ "success": true, "data": result_dict }`.

Register in `backend/apps/promotions/urls.py`: `'evaluate/'` → `PromotionEvaluateView.as_view()`, name `'evaluate'`. Include in `backend/config/urls.py` under `'api/promotions/'`.

### Step 10: Build Promotion CRUD DRF Views

In `backend/apps/promotions/views/promotion_views.py`, define:

`PromotionListCreateView` — `GET/POST /api/promotions/`:
- `GET`: `Promotion.objects.filter(tenant_id=user.tenant_id).order_by('-created_at')`. Return all promotions including inactive ones (operators need to see inactive promotions to re-activate them). Include `target_category` name in the response via `select_related`.
- `POST`: restricted to MANAGER/OWNER. Validate with `CreatePromotionSerializer`. Check promo code uniqueness per tenant (the `UniqueConstraint` on the model handles this at the database level, but validate in the serializer first to return a clean 400 rather than a database integrity error). Return 201.

`PromotionDetailView` — `PATCH/DELETE /api/promotions/{id}/`: restricted to MANAGER/OWNER.
- `PATCH`: partial update via `UpdatePromotionSerializer`. Cannot change `type` on an existing promotion (changing type would invalidate the type-specific fields already stored). Add this rule in `UpdatePromotionSerializer.validate()`: if `type` is present and differs from the existing instance value, raise `ValidationError("Promotion type cannot be changed after creation. Delete and recreate instead.")`.
- `DELETE`: soft delete. Set `is_active=False` and add an `is_archived = True` boolean flag. If the `Promotion` model does not yet have `is_archived`, add it in this task (a migration-free default can be added with `default=False`). Return 204 on success.

Register URLs: `''` → `PromotionListCreateView.as_view()`. `'<uuid:id>/'` → `PromotionDetailView.as_view()`.

---

## Expected Output

- `backend/apps/promotions/services/promotion_service.py` with all dataclasses and six functions: `_fetch_active_promotions`, `_evaluate_customer_pricing`, `_evaluate_category_discounts`, `_evaluate_bogo`, `_evaluate_cart_promotions`, `validate_promo_code`, `evaluate_promotions`.
- `backend/apps/promotions/views/evaluate_views.py` with `PromotionEvaluateView`.
- `backend/apps/promotions/views/promotion_views.py` with `PromotionListCreateView` and `PromotionDetailView`.

---

## Validation

- Cart with two items from Category A, active `CATEGORY_PERCENTAGE` promotion for Category A (15%): evaluate — discount applies only to those two lines; a third line from Category B receives no discount.
- BOGO promotion with `min_quantity=2`, cart with 2 units (unit prices Rs. 200 and Rs. 300): discount equals Rs. 200 (cheapest unit).
- Active `CART_PERCENTAGE` (10%) and `CART_FIXED` (Rs. 50) on a Rs. 400 cart: `CART_FIXED` = Rs. 50, `CART_PERCENTAGE` = Rs. 40. `CART_FIXED` wins (higher discount); `CART_PERCENTAGE` appears in `skipped_promotions`.
- Cart line with `manual_discount_amount > 0`: that line does not appear in any `AppliedDiscount.affected_lines`.
- Invalid promo code `"BADCODE"`: `validate_promo_code` returns `{ 'valid': False, 'code': 'PROMO_NOT_FOUND' }`.
- Expired promotion (past `ends_at`): not included in `_fetch_active_promotions` results.
- Identical cart submitted twice: `evaluate_promotions` returns identical `EvaluationResult` both times (determinism check).
- `EvaluationResult` with no promotions active: `total_discount_amount = Decimal('0')`, both lists empty.

---

## Notes

The `_decimals_to_str(d)` helper in the evaluate view must handle nested structures from `dataclasses.asdict()`. Since `asdict` recursively converts nested dataclasses to dicts and lists to plain lists, the helper can walk the structure with a recursive check: `if isinstance(v, Decimal): return str(v)`, `elif isinstance(v, dict): return {k: _decimals_to_str(val) for k, val in v.items()}`, `elif isinstance(v, list): return [_decimals_to_str(item) for item in v]`.

The `no-store` `Cache-Control` header on the evaluate endpoint is critical. Without it, a shared proxy or CDN might cache the promotion evaluation response for a given cart composition, causing stale discounts when a promotion is activated or deactivated between requests. Since this endpoint is called multiple times per checkout session with potentially changing cart contents, caching must be completely disabled.

The `evaluate_promotions` function is synchronous and completes in a single database round-trip for `_fetch_active_promotions` (one query for all active promotions) plus one query for customer pricing rules. This is intentionally efficient — most evaluation steps operate on the Python list already in memory.
