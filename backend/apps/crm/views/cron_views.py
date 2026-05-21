"""CRM cron views — executed by an external scheduler, not end users."""
from __future__ import annotations

import datetime
import hmac

import pytz
from django.conf import settings
from django.db.models.functions import ExtractDay, ExtractMonth
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.crm.models import BirthdayGreetingLog, Customer
from apps.pos.services.whatsapp_service import send_whatsapp_text_message


class BirthdayGreetingCronView(APIView):
    """GET /api/crm/cron/birthday-greetings/

    Secured by CRON_SECRET bearer token (not JWT). Intended to be called
    once daily by an external scheduler (e.g. Vercel Cron, crontab).
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        # ── 1. Authenticate via CRON_SECRET ───────────────────────
        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split(" ")
        if len(parts) < 2:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Missing or malformed Authorization header",
                    },
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token = parts[1]
        cron_secret = getattr(settings, "CRON_SECRET", "")
        if not cron_secret or not hmac.compare_digest(token, cron_secret):
            return Response(
                {
                    "success": False,
                    "error": {"code": "UNAUTHORIZED", "message": "Invalid CRON_SECRET"},
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 2. Determine today's date in Asia/Colombo ─────────────
        colombo_tz = pytz.timezone("Asia/Colombo")
        today = datetime.datetime.now(tz=colombo_tz)

        # ── 3. Query matching customers ───────────────────────────
        customers = list(
            Customer.objects.select_related("tenant")
            .annotate(
                birthday_month=ExtractMonth("birthday"),
                birthday_day=ExtractDay("birthday"),
            )
            .filter(
                birthday_month=today.month,
                birthday_day=today.day,
                is_active=True,
                deleted_at__isnull=True,
            )
            .exclude(last_birthday_message_sent_year=today.year)
        )

        sent_count = 0
        failed_count = 0

        for customer in customers:
            # Build greeting
            template = (
                customer.tenant.settings.get("birthday_message")
                if isinstance(getattr(customer.tenant, "settings", None), dict)
                else None
            )
            if not template:
                template = (
                    "Happy Birthday [name]! Thank you for being a valued customer "
                    "at [store_name]. We hope to see you soon!"
                )
            first_name = customer.name.split()[0] if customer.name else ""
            store_name = customer.tenant.name if customer.tenant else ""
            greeting = template.replace("[name]", first_name).replace(
                "[store_name]", store_name
            )

            # Send and log
            if not customer.phone:
                BirthdayGreetingLog.objects.create(
                    tenant=customer.tenant,
                    customer=customer,
                    status="FAILED",
                    error_message="Customer has no phone number.",
                )
                failed_count += 1
                continue

            try:
                result = send_whatsapp_text_message(phone=customer.phone, message=greeting)
                if result.get("success"):
                    BirthdayGreetingLog.objects.create(
                        tenant=customer.tenant,
                        customer=customer,
                        status="SENT",
                    )
                    Customer.objects.filter(id=customer.id).update(
                        last_birthday_message_sent_year=today.year
                    )
                    sent_count += 1
                else:
                    raise Exception(result.get("error", "Unknown WhatsApp error"))
            except Exception as exc:  # noqa: BLE001
                BirthdayGreetingLog.objects.create(
                    tenant=customer.tenant,
                    customer=customer,
                    status="FAILED",
                    error_message=str(exc),
                )
                failed_count += 1

        return Response(
            {
                "success": True,
                "data": {
                    "processed": len(customers),
                    "sent": sent_count,
                    "failed": failed_count,
                },
            },
            status=status.HTTP_200_OK,
        )
