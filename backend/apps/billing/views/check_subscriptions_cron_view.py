import hmac
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.constants import GRACE_PERIOD_DAYS
from apps.billing.models import Subscription, SubscriptionStatus
from apps.billing.services.email_service import EmailService
from apps.billing.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)


def _ok(data, status=200):
    return Response({"success": True, "data": data}, status=status)


def _error(code, message, status=400):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=status)


class CheckSubscriptionsCronView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        request_secret = (
            request.headers.get("X-CRON-SECRET")
            or request.query_params.get("secret", "")
        )
        cron_secret = getattr(settings, "CRON_SECRET", "")

        if not hmac.compare_digest(request_secret, cron_secret):
            return _error("unauthorized", "Invalid cron secret.", 403)

        trials_expired = 0
        subscriptions_suspended = 0
        emails_sent = 0
        errors = []
        now = timezone.now()

        # --- Transition 1: TRIAL → PAST_DUE ---
        expired_trials = Subscription.objects.filter(
            status=SubscriptionStatus.TRIAL,
            trial_ends_at__lte=now,
        ).select_related("tenant", "plan")

        for sub in expired_trials:
            try:
                sub.status = SubscriptionStatus.PAST_DUE
                sub.save(update_fields=["status", "updated_at"])

                from apps.tenants.models import Tenant
                Tenant.objects.filter(id=sub.tenant_id).update(
                    subscription_status=SubscriptionStatus.PAST_DUE
                )

                # Get tenant admin user for email
                admin_user = (
                    sub.tenant.users.filter(role="OWNER").first()
                    or sub.tenant.users.first()
                )
                if admin_user:
                    EmailService.send_trial_expiring_soon(sub.tenant, admin_user, days_remaining=0)
                    emails_sent += 1

                    # Send overdue email if pending invoice exists
                    pending_invoice = (
                        sub.invoices.filter(status="PENDING").first()
                    )
                    if pending_invoice:
                        EmailService.send_payment_overdue(sub.tenant, admin_user, pending_invoice)
                        emails_sent += 1

                SubscriptionService.log_subscription_event(
                    sub.tenant_id,
                    "TRIAL_EXPIRED",
                    f"Trial expired for {sub.tenant.name}",
                )
                trials_expired += 1
            except Exception as exc:
                logger.exception("Error processing trial expiry for sub %s: %s", sub.id, exc)
                errors.append(str(exc))

        # --- Transition 2: PAST_DUE → SUSPENDED (beyond grace period) ---
        grace_cutoff = now - timedelta(days=GRACE_PERIOD_DAYS)
        past_due_subs = Subscription.objects.filter(
            status=SubscriptionStatus.PAST_DUE,
        ).select_related("tenant", "plan")

        for sub in past_due_subs:
            reference_date = sub.current_period_end or sub.trial_ends_at
            if reference_date is None or reference_date > grace_cutoff:
                continue
            try:
                sub.status = SubscriptionStatus.SUSPENDED
                sub.save(update_fields=["status", "updated_at"])

                from apps.tenants.models import Tenant
                Tenant.objects.filter(id=sub.tenant_id).update(
                    subscription_status=SubscriptionStatus.SUSPENDED
                )

                admin_user = (
                    sub.tenant.users.filter(role="OWNER").first()
                    or sub.tenant.users.first()
                )
                if admin_user:
                    EmailService.send_account_suspended(sub.tenant, admin_user)
                    emails_sent += 1

                SubscriptionService.log_subscription_event(
                    sub.tenant_id,
                    "SUBSCRIPTION_SUSPENDED",
                    f"Subscription suspended for {sub.tenant.name}",
                )
                subscriptions_suspended += 1
            except Exception as exc:
                logger.exception("Error suspending sub %s: %s", sub.id, exc)
                errors.append(str(exc))

        # --- Transition 3 (logging only): aged SUSPENDED subscriptions ---
        aged_cutoff = now - timedelta(days=30)
        aged_suspended = Subscription.objects.filter(
            status=SubscriptionStatus.SUSPENDED,
            updated_at__lte=aged_cutoff,
        )
        for sub in aged_suspended:
            logger.warning(
                "SUSPENDED subscription %s for tenant %s has been suspended for over 30 days. "
                "Manual review recommended.",
                sub.id,
                sub.tenant_id,
            )

        # --- Transition 4 (logging only): CANCELLED at period end ---
        cancelled_at_end = Subscription.objects.filter(
            status=SubscriptionStatus.CANCELLED,
            cancel_at_period_end=True,
            current_period_end__lte=now,
        )
        for sub in cancelled_at_end:
            logger.info(
                "CANCELLED subscription %s for tenant %s has reached period end.",
                sub.id,
                sub.tenant_id,
            )

        return _ok({
            "trials_expired": trials_expired,
            "subscriptions_suspended": subscriptions_suspended,
            "emails_sent": emails_sent,
            "errors": errors,
            "timestamp": str(now),
        })
