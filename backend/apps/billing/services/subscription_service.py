import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.billing.constants import TRIAL_DAYS
from apps.billing.models import (
    Invoice,
    InvoiceStatus,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)

logger = logging.getLogger(__name__)


class SubscriptionService:

    @staticmethod
    def create_trial_subscription(tenant, plan_name="STARTER"):
        """
        Atomically creates a trial Subscription, a zero-value Invoice,
        and updates the Tenant's subscription_status.
        """
        from apps.tenants.models import Tenant as TenantModel  # avoid circular import

        with transaction.atomic():
            # Find the plan
            try:
                plan = SubscriptionPlan.objects.get(name=plan_name, is_active=True)
            except SubscriptionPlan.DoesNotExist:
                plan = SubscriptionPlan.objects.filter(is_active=True).order_by(
                    "sort_order"
                ).first()
            if plan is None:
                raise ValueError("No active subscription plan available")

            trial_ends = timezone.now() + timedelta(days=TRIAL_DAYS)
            now = timezone.now()

            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=SubscriptionStatus.TRIAL,
                trial_ends_at=trial_ends,
                current_period_start=now,
                current_period_end=trial_ends,
            )

            Invoice.objects.create(
                subscription=subscription,
                tenant=tenant,
                invoice_number="TRIAL-" + str(uuid.uuid4())[:8].upper(),
                amount=Decimal("0.00"),
                status=InvoiceStatus.PAID,
                billing_period_start=now,
                billing_period_end=trial_ends,
                due_date=trial_ends,
            )

            TenantModel.objects.filter(id=tenant.id).update(
                subscription_status=SubscriptionStatus.TRIAL
            )

            return subscription

    @staticmethod
    def get_subscription_for_tenant(tenant_id):
        return (
            Subscription.objects.filter(tenant_id=tenant_id)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )

    @staticmethod
    def log_subscription_event(tenant_id, event_type, description, metadata=None):
        try:
            from apps.audit.models import AuditLog  # noqa
            AuditLog.objects.create(
                tenant_id=tenant_id,
                action=event_type,
                description=description,
                metadata=metadata or {},
            )
        except Exception:
            logger.info("[%s] %s", event_type, description)
