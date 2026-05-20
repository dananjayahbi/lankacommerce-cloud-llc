"""CRM broadcast view — sends a manual WhatsApp broadcast to filtered customers."""
from __future__ import annotations

from decimal import Decimal

from django.db.models.functions import ExtractMonth
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import HasPermission
from apps.accounts.constants.permissions import PERMISSIONS
from apps.crm.models import Customer, CustomerBroadcast
from apps.pos.services.whatsapp_service import send_whatsapp_text_message


class BroadcastSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)
    filters = serializers.DictField(allow_empty=True, required=False, default=dict)


class BroadcastView(APIView):
    """POST /api/crm/customers/broadcast/"""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_CREATE)]

    def post(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id

        serializer = BroadcastSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": str(serializer.errors),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        filters: dict = data.get("filters", {})

        # Build queryset
        qs = Customer.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
            deleted_at__isnull=True,
        )
        if filters.get("tag"):
            qs = qs.filter(tags__contains=[filters["tag"]])
        if filters.get("spend_min") is not None:
            qs = qs.filter(total_spend__gte=Decimal(str(filters["spend_min"])))
        if filters.get("birthday_month"):
            qs = qs.annotate(bm=ExtractMonth("birthday")).filter(
                bm=filters["birthday_month"]
            )

        count = qs.count()

        if count > 200:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "RECIPIENT_LIMIT_EXCEEDED",
                        "message": (
                            "Recipient count exceeds the 200-recipient limit. "
                            "Refine your filters."
                        ),
                    },
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        if count == 0:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "NO_RECIPIENTS",
                        "message": "No active customers match the selected filters.",
                    },
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # Create broadcast record before sending
        broadcast = CustomerBroadcast.objects.create(
            tenant_id=tenant_id,
            sent_by=request.user,
            message=data["message"],
            filters=filters,
            recipient_count=count,
        )

        sent_count = 0
        for customer in qs.iterator():
            if not customer.phone:
                continue
            result = send_whatsapp_text_message(
                phone=customer.phone,
                message=data["message"],
            )
            if result.get("success"):
                sent_count += 1

        # Update with actual sent count
        CustomerBroadcast.objects.filter(id=broadcast.id).update(
            recipient_count=sent_count
        )

        return Response(
            {
                "success": True,
                "data": {
                    "broadcast_id": str(broadcast.id),
                    "recipient_count": sent_count,
                },
            },
            status=status.HTTP_202_ACCEPTED,
        )
