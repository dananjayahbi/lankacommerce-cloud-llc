import dataclasses
import json
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework.permissions import IsAuthenticated
from apps.promotions.services.promotion_service import (
    CartLine,
    evaluate_promotions,
)


def _ok(data, status_code=200):
    return Response({"success": True, "data": data}, status=status_code)


def _error(message, status_code=400, code=None):
    payload = {"success": False, "message": message}
    if code:
        payload["code"] = code
    return Response(payload, status=status_code)


def _decimals_to_str(d):
    if isinstance(d, Decimal):
        return str(d)
    if isinstance(d, dict):
        return {k: _decimals_to_str(v) for k, v in d.items()}
    if isinstance(d, list):
        return [_decimals_to_str(item) for item in d]
    return d


class CartLineSerializer(serializers.Serializer):
    variant_id = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    manual_discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=Decimal("0")
    )
    category_id = serializers.CharField(required=False, allow_null=True, default=None)


class PromotionEvaluateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart_lines_raw = request.query_params.get("cart_lines", "[]")
        try:
            cart_lines_data = json.loads(cart_lines_raw)
        except json.JSONDecodeError:
            return _error("Invalid cart_lines JSON.")

        if not isinstance(cart_lines_data, list):
            return _error("cart_lines must be a JSON array.")

        serializer = CartLineSerializer(data=cart_lines_data, many=True)
        if not serializer.is_valid():
            return _error("Invalid cart line data.", status_code=400)

        cart_lines = [
            CartLine(
                variant_id=d["variant_id"],
                quantity=d["quantity"],
                unit_price=Decimal(str(d["unit_price"])),
                manual_discount_amount=Decimal(str(d.get("manual_discount_amount", "0"))),
                category_id=d.get("category_id"),
            )
            for d in serializer.validated_data
        ]

        customer_id = request.query_params.get("customer_id")
        promo_code = request.query_params.get("promo_code")

        result = evaluate_promotions(
            tenant_id=str(request.user.tenant_id),
            cart_lines=cart_lines,
            customer_id=customer_id,
            applied_promo_code=promo_code,
        )

        result_dict = _decimals_to_str(dataclasses.asdict(result))
        response = _ok(result_dict)
        response["Cache-Control"] = "no-store"
        return response
