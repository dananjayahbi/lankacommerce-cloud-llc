from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsManagerOrAbove
from apps.promotions.models import Promotion


def _ok(data, status_code=200):
    return Response({"success": True, "data": data}, status=status_code)


def _error(message, status_code=400, code=None):
    payload = {"success": False, "message": message}
    if code:
        payload["code"] = code
    return Response(payload, status=status_code)


def _serialize_promotion(p) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "type": p.type,
        "value": str(p.value),
        "promo_code": p.promo_code,
        "target_category_id": str(p.target_category_id) if p.target_category_id else None,
        "target_category_name": p.target_category.name if p.target_category else None,
        "min_quantity": p.min_quantity,
        "starts_at": p.starts_at.isoformat() if p.starts_at else None,
        "ends_at": p.ends_at.isoformat() if p.ends_at else None,
        "is_active": p.is_active,
        "is_archived": p.is_archived,
        "description": p.description,
        "created_at": p.created_at.isoformat(),
    }


class CreatePromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = [
            "name", "type", "value", "promo_code", "target_category",
            "min_quantity", "starts_at", "ends_at", "is_active", "description",
        ]

    def validate_promo_code(self, value):
        if value:
            return value.strip().upper()
        return value

    def validate(self, attrs):
        tenant_id = self.context["tenant_id"]
        promo_code = attrs.get("promo_code")
        if promo_code:
            if Promotion.objects.filter(tenant_id=tenant_id, promo_code__iexact=promo_code).exists():
                raise serializers.ValidationError(
                    {"promo_code": "A promotion with this promo code already exists for this tenant."}
                )
        return attrs


class UpdatePromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = [
            "name", "type", "value", "promo_code", "target_category",
            "min_quantity", "starts_at", "ends_at", "is_active", "description",
        ]

    def validate_promo_code(self, value):
        if value:
            return value.strip().upper()
        return value

    def validate(self, attrs):
        if "type" in attrs and attrs["type"] != self.instance.type:
            raise serializers.ValidationError(
                "Promotion type cannot be changed after creation. Delete and recreate instead."
            )
        return attrs


class PromotionListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        promotions = (
            Promotion.objects.filter(tenant_id=request.user.tenant_id)
            .select_related("target_category")
            .order_by("-created_at")
        )
        return _ok([_serialize_promotion(p) for p in promotions])

    def post(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("Permission denied.", status_code=403)

        serializer = CreatePromotionSerializer(
            data=request.data,
            context={"tenant_id": str(request.user.tenant_id)},
        )
        if not serializer.is_valid():
            return _error(serializer.errors, status_code=400)

        promotion = serializer.save(tenant_id=request.user.tenant_id)
        promotion = Promotion.objects.select_related("target_category").get(id=promotion.id)
        try:
            from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS
            create_audit_log(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
                action=AUDIT_ACTIONS["PROMOTION_CREATED"],
                entity_type="promotion",
                entity_id=str(promotion.id),
                new_values={"name": promotion.name, "type": promotion.type},
                ip_address=request.META.get("REMOTE_ADDR"),
                actor_role=getattr(request.user, "role", ""),
            )
        except Exception:
            pass
        return _ok(_serialize_promotion(promotion), status_code=201)


class PromotionDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_promotion(self, request, id):
        return (
            Promotion.objects.filter(id=id, tenant_id=request.user.tenant_id)
            .select_related("target_category")
            .first()
        )

    def patch(self, request, id):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("Permission denied.", status_code=403)

        promotion = self._get_promotion(request, id)
        if not promotion:
            return _error("Promotion not found.", status_code=404)

        serializer = UpdatePromotionSerializer(
            promotion, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return _error(serializer.errors, status_code=400)

        serializer.save()
        promotion.refresh_from_db()
        try:
            from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS
            create_audit_log(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
                action=AUDIT_ACTIONS["PROMOTION_UPDATED"],
                entity_type="promotion",
                entity_id=str(id),
                new_values=request.data if isinstance(request.data, dict) else {},
                ip_address=request.META.get("REMOTE_ADDR"),
                actor_role=getattr(request.user, "role", ""),
            )
        except Exception:
            pass
        return _ok(_serialize_promotion(promotion))

    def delete(self, request, id):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("Permission denied.", status_code=403)

        promotion = self._get_promotion(request, id)
        if not promotion:
            return _error("Promotion not found.", status_code=404)

        promotion.is_active = False
        promotion.is_archived = True
        promotion.save(update_fields=["is_active", "is_archived"])
        try:
            from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS
            create_audit_log(
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
                action=AUDIT_ACTIONS["PROMOTION_ARCHIVED"],
                entity_type="promotion",
                entity_id=str(id),
                new_values={"is_archived": True},
                ip_address=request.META.get("REMOTE_ADDR"),
                actor_role=getattr(request.user, "role", ""),
            )
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)
