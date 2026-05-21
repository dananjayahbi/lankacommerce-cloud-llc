import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.billing.models import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class CancelSubscriptionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = []

    def patch(self, request: Request) -> Response:
        if not request.user or not request.user.is_authenticated:
            return _error("unauthorized", "Authentication required.", 401)

        role = getattr(request.user, "role", None)
        if role != "OWNER":
            return _error("forbidden", "Only store Owners can cancel the subscription.", 403)

        tenant_id = getattr(request.user, "tenant_id", None)
        if not tenant_id:
            return _error("no_tenant", "No tenant associated with this user.", 400)

        subscription = (
            Subscription.objects.filter(tenant_id=tenant_id)
            .order_by("-created_at")
            .first()
        )
        if not subscription:
            return _error("no_subscription", "No subscription found.", 404)

        if subscription.status == SubscriptionStatus.CANCELLED:
            return Response(
                {"success": False, "error": {"code": "already_cancelled", "message": "Subscription is already cancelled."}},
                status=409,
            )

        with transaction.atomic():
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = timezone.now()
            subscription.save(update_fields=["status", "cancelled_at", "updated_at"])

            from apps.tenants.models import Tenant
            Tenant.objects.filter(id=tenant_id).update(
                subscription_status=SubscriptionStatus.CANCELLED
            )

        return _ok({
            "subscription_id": str(subscription.id),
            "status": subscription.status,
            "cancelled_at": subscription.cancelled_at.isoformat(),
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        })
