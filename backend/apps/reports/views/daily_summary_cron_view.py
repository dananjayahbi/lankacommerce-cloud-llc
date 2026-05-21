import hmac
import os
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import DailySummaryLog
from apps.reports.services.daily_summary_email import collect_daily_summary, send_daily_summary
from apps.tenants.models import Tenant

CustomUser = get_user_model()


class DailySummaryCronView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        provided_secret = request.query_params.get("secret", "")
        expected_secret = os.environ.get("CRON_SECRET", "")

        if not expected_secret or not hmac.compare_digest(provided_secret, expected_secret):
            return Response(
                {"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid cron secret."}},
                status=403,
            )

        report_date = date.today() - timedelta(days=1)
        active_tenants = Tenant.objects.filter(status="ACTIVE", deleted_at__isnull=True)

        processed = 0
        sent = 0
        failed = 0
        errors: list[dict] = []

        for tenant in active_tenants:
            processed += 1
            owner_emails = list(
                CustomUser.objects.filter(
                    tenant_id=tenant.id,
                    role="OWNER",
                    is_active=True,
                ).values_list("email", flat=True)
            )

            if not owner_emails:
                continue

            try:
                summary_data = collect_daily_summary(tenant, report_date)
                for email in owner_emails:
                    success, error_msg = send_daily_summary(summary_data, email)
                    DailySummaryLog.objects.create(
                        tenant=tenant,
                        status=DailySummaryLog.Status.SENT if success else DailySummaryLog.Status.FAILED,
                        error_message=error_msg,
                        recipient_email=email,
                    )
                    if success:
                        sent += 1
                    else:
                        failed += 1
                        errors.append(
                            {"tenant": tenant.name, "email": email, "error": error_msg}
                        )
            except Exception as exc:
                failed += 1
                errors.append({"tenant": tenant.name, "email": "N/A", "error": str(exc)})
                DailySummaryLog.objects.create(
                    tenant=tenant,
                    status=DailySummaryLog.Status.FAILED,
                    error_message=str(exc),
                    recipient_email="N/A",
                )

        return Response({
            "success": True,
            "data": {
                "processed": processed,
                "sent": sent,
                "failed": failed,
                "date": report_date.isoformat(),
                "errors": errors if errors else None,
            },
        })
