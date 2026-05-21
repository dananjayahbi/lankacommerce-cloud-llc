import logging

from django.shortcuts import get_object_or_404
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import SubscriptionPlan
from apps.billing.serializers.plan_serializers import SubscriptionPlanSerializer

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class PlanDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def get(self, request: Request, id) -> Response:
        plan = get_object_or_404(SubscriptionPlan, id=id)
        serializer = SubscriptionPlanSerializer(plan)
        return _ok(serializer.data)

    def patch(self, request: Request, id) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)
        if getattr(request.user, "role", None) != "SUPER_ADMIN":
            return _error("forbidden", "Only Super Admins can update plans.", 403)

        plan = get_object_or_404(SubscriptionPlan, id=id)
        serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return _ok(serializer.data)
