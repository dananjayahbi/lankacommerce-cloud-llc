"""
Promotion evaluation engine.

Deterministic, priority-ordered discount evaluation for a cart.
Customer pricing rules are evaluated first, then category discounts,
then BOGO, then cart-level promotions, then promo codes.
"""

import dataclasses
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

from django.db.models import Q
from django.utils import timezone


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class CartLine:
    variant_id: str
    quantity: int
    unit_price: Decimal
    manual_discount_amount: Decimal = field(default_factory=lambda: Decimal("0"))
    category_id: Optional[str] = None


@dataclass
class AppliedDiscount:
    promotion_id: str
    label: str
    discount_amount: Decimal
    promotion_type: str
    affected_lines: List[str] = field(default_factory=list)


@dataclass
class SkippedPromotion:
    promotion_id: str
    label: str
    reason: str


@dataclass
class EvaluationResult:
    applied_discounts: List[AppliedDiscount] = field(default_factory=list)
    skipped_promotions: List[SkippedPromotion] = field(default_factory=list)
    total_discount_amount: Decimal = field(default_factory=lambda: Decimal("0"))


# ─── Private helpers ──────────────────────────────────────────────────────────

def _fetch_active_promotions(tenant_id: str) -> List:
    from apps.promotions.models import Promotion

    now = timezone.now()
    qs = (
        Promotion.objects.filter(tenant_id=tenant_id, is_active=True)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .select_related("target_category")
    )
    return list(qs)


def _evaluate_customer_pricing(
    tenant_id: str, cart_lines: List[CartLine], customer_id: Optional[str]
) -> tuple:
    """Returns (applied_discounts, discounted_variant_ids)."""
    if not customer_id:
        return [], set()

    from apps.crm.models import Customer
    from apps.promotions.models import CustomerPricingRule

    customer = Customer.objects.filter(id=customer_id, tenant_id=tenant_id).first()
    if not customer or not customer.tags:
        return [], set()

    now = timezone.now()
    rules = (
        CustomerPricingRule.objects.filter(tenant_id=tenant_id, is_active=True, customer_tag__in=customer.tags)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .select_related("variant")
    )

    applied = []
    discounted_ids: set = set()

    for rule in rules:
        for line in cart_lines:
            if rule.variant_id is not None and str(rule.variant_id) != line.variant_id:
                continue
            if rule.price >= line.unit_price:
                continue
            if line.manual_discount_amount != Decimal("0"):
                continue

            savings_per_unit = (line.unit_price - rule.price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            discount_amount = savings_per_unit * Decimal(str(line.quantity))
            applied.append(
                AppliedDiscount(
                    promotion_id=str(rule.id),
                    label=f"Customer price: Rs.{rule.price}/unit",
                    discount_amount=discount_amount,
                    promotion_type="CUSTOMER_PRICING",
                    affected_lines=[line.variant_id],
                )
            )
            discounted_ids.add(line.variant_id)

    return applied, discounted_ids


def _evaluate_category_discounts(
    cart_lines: List[CartLine], promotions: List, already_discounted_variant_ids: set
) -> List[AppliedDiscount]:
    category_promotions = [p for p in promotions if p.type == "CATEGORY_PERCENTAGE"]
    applied = []

    for promotion in category_promotions:
        qualifying = [
            l for l in cart_lines
            if l.category_id == str(promotion.target_category_id)
            and l.variant_id not in already_discounted_variant_ids
            and l.manual_discount_amount == Decimal("0")
        ]
        if not qualifying:
            continue

        line_discounts = [
            (l.unit_price * Decimal(str(l.quantity)) * promotion.value / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            for l in qualifying
        ]
        total_discount = sum(line_discounts, Decimal("0"))

        applied.append(
            AppliedDiscount(
                promotion_id=str(promotion.id),
                label=f"{promotion.name} ({promotion.value}% off)",
                discount_amount=total_discount,
                promotion_type="CATEGORY_PERCENTAGE",
                affected_lines=[l.variant_id for l in qualifying],
            )
        )
        for l in qualifying:
            already_discounted_variant_ids.add(l.variant_id)

    return applied


def _evaluate_bogo(
    cart_lines: List[CartLine], promotions: List, already_discounted_variant_ids: set
) -> List[AppliedDiscount]:
    bogo_promos = [p for p in promotions if p.type in ("BOGO", "MIX_AND_MATCH")]
    applied = []

    for promotion in bogo_promos:
        min_qty = promotion.min_quantity or 2
        qualifying = [
            l for l in cart_lines
            if l.variant_id not in already_discounted_variant_ids
            and l.manual_discount_amount == Decimal("0")
        ]
        total_qty = sum(l.quantity for l in qualifying)
        if total_qty < min_qty:
            continue

        cheapest = min(qualifying, key=lambda l: l.unit_price)
        discount_amount = cheapest.unit_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        max_possible = sum(
            (l.unit_price * Decimal(str(l.quantity)) for l in qualifying), Decimal("0")
        )
        if discount_amount > max_possible:
            discount_amount = max_possible

        applied.append(
            AppliedDiscount(
                promotion_id=str(promotion.id),
                label=promotion.name,
                discount_amount=discount_amount,
                promotion_type=promotion.type,
                affected_lines=[l.variant_id for l in qualifying],
            )
        )

    return applied


def _evaluate_cart_promotions(
    cart_lines: List[CartLine],
    promotions: List,
    current_subtotal: Decimal,
    already_applied_promo_ids: set,
) -> tuple:
    """Returns (applied, skipped)."""
    cart_promos = [
        p for p in promotions
        if p.type in ("CART_PERCENTAGE", "CART_FIXED")
        and str(p.id) not in already_applied_promo_ids
    ]

    if current_subtotal <= Decimal("0"):
        return [], []

    candidates = []
    for p in cart_promos:
        if p.type == "CART_PERCENTAGE":
            potential = (current_subtotal * p.value / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:  # CART_FIXED
            potential = min(p.value, current_subtotal).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        candidates.append((p, potential))

    if not candidates:
        return [], []

    candidates.sort(key=lambda x: x[1], reverse=True)
    best_promo, best_potential = candidates[0]
    applied = [
        AppliedDiscount(
            promotion_id=str(best_promo.id),
            label=best_promo.name,
            discount_amount=best_potential,
            promotion_type=best_promo.type,
            affected_lines=[],
        )
    ]
    skipped = [
        SkippedPromotion(
            promotion_id=str(p.id),
            label=p.name,
            reason="A higher-value cart promotion is already applied.",
        )
        for p, _ in candidates[1:]
    ]
    return applied, skipped


# ─── Exported functions ───────────────────────────────────────────────────────

def validate_promo_code(tenant_id: str, code: str, cart_lines: List[CartLine]) -> dict:
    from apps.promotions.models import Promotion

    code = code.strip().upper()
    now = timezone.now()

    promo = (
        Promotion.objects.filter(
            tenant_id=tenant_id,
            type="PROMO_CODE",
            promo_code__iexact=code,
            is_active=True,
        )
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .first()
    )

    if not promo:
        return {
            "valid": False,
            "code": "PROMO_NOT_FOUND",
            "message": "This promo code does not exist or has expired.",
        }

    subtotal = sum(
        (l.unit_price * Decimal(str(l.quantity)) for l in cart_lines), Decimal("0")
    )

    if promo.type == "CART_PERCENTAGE":
        potential = (subtotal * promo.value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        potential = min(promo.value, subtotal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if potential <= Decimal("0"):
        return {
            "valid": False,
            "code": "PROMO_NOT_APPLICABLE",
            "message": "This promo code is not applicable to your current cart.",
        }

    discount = AppliedDiscount(
        promotion_id=str(promo.id),
        label=f"Promo Code: {code}",
        discount_amount=potential,
        promotion_type="PROMO_CODE",
        affected_lines=[],
    )
    return {"valid": True, "discount": discount}


def evaluate_promotions(
    tenant_id: str,
    cart_lines: List[CartLine],
    customer_id: Optional[str] = None,
    applied_promo_code: Optional[str] = None,
) -> EvaluationResult:
    if not cart_lines:
        return EvaluationResult()

    all_promotions = _fetch_active_promotions(tenant_id)

    # 1. Customer pricing rules
    customer_discounts, already_discounted = _evaluate_customer_pricing(
        tenant_id, cart_lines, customer_id
    )

    # 2. Category discounts
    category_discounts = _evaluate_category_discounts(
        cart_lines, all_promotions, already_discounted
    )

    # 3. BOGO
    bogo_discounts = _evaluate_bogo(cart_lines, all_promotions, already_discounted)

    # 4. Compute remaining subtotal
    cart_subtotal = sum(
        (l.unit_price * Decimal(str(l.quantity)) for l in cart_lines), Decimal("0")
    )
    applied_so_far = customer_discounts + category_discounts + bogo_discounts
    total_applied_so_far = sum(
        (d.discount_amount for d in applied_so_far), Decimal("0")
    )
    remaining_subtotal = max(Decimal("0"), cart_subtotal - total_applied_so_far)

    already_applied_ids = {d.promotion_id for d in applied_so_far}

    # 5. Cart-level promotions
    cart_applied, cart_skipped = _evaluate_cart_promotions(
        cart_lines, all_promotions, remaining_subtotal, already_applied_ids
    )

    # 6. Promo code
    promo_applied = []
    promo_skipped = []
    if applied_promo_code:
        promo_result = validate_promo_code(tenant_id, applied_promo_code, cart_lines)
        if promo_result["valid"]:
            promo_applied = [promo_result["discount"]]
        else:
            promo_skipped = [
                SkippedPromotion(
                    promotion_id="promo_code",
                    label=applied_promo_code,
                    reason=promo_result["message"],
                )
            ]

    all_applied = applied_so_far + cart_applied + promo_applied
    total_discount = sum((d.discount_amount for d in all_applied), Decimal("0"))

    return EvaluationResult(
        applied_discounts=all_applied,
        skipped_promotions=cart_skipped + promo_skipped,
        total_discount_amount=total_discount,
    )
