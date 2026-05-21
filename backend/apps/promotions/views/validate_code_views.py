"""Promotion promo-code validation endpoint."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.http import JsonResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.promotions.models import Promotion, PromotionType


class ValidateCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    cart_lines = serializers.ListField(child=serializers.DictField(), min_length=1)
    customer_id = serializers.CharField(required=False, allow_null=True, default=None)


def _compute_discount(promotion: Promotion, cart_lines: list[dict]) -> tuple[Decimal | None, str | None]:
    """Return (discount_amount, None) on success or (None, reason) on skip."""
    subtotal = sum(
        Decimal(str(line.get("quantity", 1))) * Decimal(str(line.get("unit_price", "0")))
        for line in cart_lines
    )

    if promotion.type == PromotionType.CART_PERCENTAGE:
        discount = (subtotal * promotion.value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return discount, None

    if promotion.type == PromotionType.CART_FIXED:
        discount = min(promotion.value, subtotal).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return discount, None

    if promotion.type == PromotionType.CATEGORY_PERCENTAGE:
        cat_id = str(promotion.target_category_id) if promotion.target_category_id else None
        qualifying = [
            line for line in cart_lines
            if str(line.get("category_id")) == cat_id
        ]
        if not qualifying:
            return None, "No qualifying items for this category promotion in the cart."
        q_subtotal = sum(
            Decimal(str(line.get("quantity", 1))) * Decimal(str(line.get("unit_price", "0")))
            for line in qualifying
        )
        discount = (q_subtotal * promotion.value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return discount, None

    if promotion.type == PromotionType.BOGO:
        total_qty = sum(int(line.get("quantity", 0)) for line in cart_lines)
        min_qty = promotion.min_quantity or 2
        if total_qty < min_qty:
            return None, f"Need at least {min_qty} items in cart."
        cheapest = min(Decimal(str(line.get("unit_price", "0"))) for line in cart_lines)
        discount = cheapest.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return discount, None

    if promotion.type == PromotionType.PROMO_CODE:
        discount = (subtotal * promotion.value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return discount, None

    return None, f"Promotion type '{promotion.type}' is not supported for code validation."


class ValidateCodeView(APIView):
    """POST /api/promotions/validate-code/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> JsonResponse:
        serializer = ValidateCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return JsonResponse(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(serializer.errors)}},
                status=400,
            )

        data = serializer.validated_data
        code: str = data["code"].upper()
        cart_lines: list[dict] = data["cart_lines"]

        # Lookup promotion
        promotion = Promotion.objects.filter(
            tenant_id=request.user.tenant_id,
            promo_code__iexact=code,
            is_active=True,
            is_archived=False,
        ).first()

        if promotion is None:
            return JsonResponse(
                {
                    "success": False,
                    "error": {
                        "code": "PROMO_NOT_FOUND",
                        "message": "The promo code you entered is invalid or has expired.",
                    },
                },
                status=404,
            )

        # Temporal validity
        now = timezone.now()
        if promotion.starts_at and promotion.starts_at > now:
            return JsonResponse(
                {
                    "success": False,
                    "error": {
                        "code": "PROMO_NOT_YET_ACTIVE",
                        "message": "This promo code is not yet active.",
                    },
                },
                status=422,
            )
        if promotion.ends_at and promotion.ends_at < now:
            return JsonResponse(
                {
                    "success": False,
                    "error": {
                        "code": "PROMO_EXPIRED",
                        "message": "This promo code has expired.",
                    },
                },
                status=422,
            )

        # Evaluate conditions
        discount_amount, reason = _compute_discount(promotion, cart_lines)
        if discount_amount is None:
            return JsonResponse(
                {
                    "success": False,
                    "error": {
                        "code": "CONDITIONS_NOT_MET",
                        "message": "The items in your cart do not meet the requirements for this promo code.",
                        "details": {"reason": reason, "promotion_id": str(promotion.id)},
                    },
                },
                status=422,
            )

        return JsonResponse(
            {
                "success": True,
                "data": {
                    "promotion_id": str(promotion.id),
                    "promotion_name": promotion.name,
                    "type": promotion.type,
                    "computed_amount": str(discount_amount),
                    "description": promotion.description or "",
                },
            }
        )
