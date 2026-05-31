"""
Management command: seed_demo_billing

Creates demo billing data (SubscriptionPlans, Subscriptions, Invoices,
PaymentReminders) idempotently via update_or_create.
"""
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.constants import PLAN_FEATURE_ALL
from apps.billing.models import (
    Invoice,
    InvoiceStatus,
    PaymentReminder,
    PaymentReminderChannel,
    PaymentReminderSendStatus,
    PaymentReminderType,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)


DEMO_PLANS = [
    {
        "name": "STARTER",
        "monthly_price": Decimal("1500.00"),
        "annual_price": Decimal("15000.00"),
        "max_users": 5,
        "max_product_variants": 500,
        "description": "Perfect for small shops. Includes core POS and catalog features.",
        "features": [
            "pos_terminal",
            "product_catalog",
            "stock_control",
            "staff_management",
            "reports",
        ],
        "is_active": True,
        "sort_order": 1,
    },
    {
        "name": "GROWTH",
        "monthly_price": Decimal("3500.00"),
        "annual_price": Decimal("35000.00"),
        "max_users": 15,
        "max_product_variants": 5000,
        "description": "For growing businesses. All Starter features plus CRM and promotions.",
        "features": [
            "pos_terminal",
            "product_catalog",
            "stock_control",
            "staff_management",
            "promotions",
            "crm",
            "expense_tracking",
            "reports",
            "whatsapp_reminders",
        ],
        "is_active": True,
        "sort_order": 2,
    },
    {
        "name": "ENTERPRISE",
        "monthly_price": Decimal("8000.00"),
        "annual_price": Decimal("80000.00"),
        "max_users": 9999,
        "max_product_variants": 999999,
        "description": "Full platform access. All features including multi-store and API.",
        "features": PLAN_FEATURE_ALL,
        "is_active": True,
        "sort_order": 3,
    },
]


class Command(BaseCommand):
    help = "Seed demo billing data (plans, subscriptions, invoices, reminders)"

    def handle(self, *args, **options):
        now = timezone.now()

        # ── 1. Upsert SubscriptionPlans ────────────────────────────────────
        plans = {}
        for p in DEMO_PLANS:
            obj, created = SubscriptionPlan.objects.update_or_create(
                name=p["name"],
                defaults={
                    "monthly_price": p["monthly_price"],
                    "annual_price": p["annual_price"],
                    "max_users": p["max_users"],
                    "max_product_variants": p["max_product_variants"],
                    "description": p["description"],
                    "features": p["features"],
                    "is_active": p["is_active"],
                    "sort_order": p["sort_order"],
                },
            )
            plan_key = p["name"].lower()
            plans[plan_key] = obj
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {action} plan: {obj.name}"))

        # ── 2. Demo tenant: Active GROWTH subscription ──────────────────────
        try:
            from apps.tenants.models import Tenant

            demo_tenant, _ = Tenant.objects.update_or_create(
                slug="demo-shop",
                defaults={
                    "name": "Demo Shop",
                    "subscription_status": "ACTIVE",
                    "status": "active",
                },
            )

            period_start = now - timedelta(days=15)
            period_end = now + timedelta(days=15)

            growth_sub, created = Subscription.objects.update_or_create(
                tenant=demo_tenant,
                plan=plans["growth"],
                defaults={
                    "status": SubscriptionStatus.ACTIVE,
                    "current_period_start": period_start,
                    "current_period_end": period_end,
                    "trial_ends_at": period_start,
                },
            )
            self.stdout.write(self.style.SUCCESS(
                f"  {'Created' if created else 'Updated'} GROWTH subscription for demo-shop"
            ))

            # 3 Invoices: 2 PAID, 1 PENDING
            inv_data = [
                {
                    "invoice_number": "INV-SEED-0001",
                    "amount": Decimal("3500.00"),
                    "status": InvoiceStatus.PAID,
                    "billing_period_start": period_start - timedelta(days=60),
                    "billing_period_end": period_start - timedelta(days=30),
                    "due_date": period_start - timedelta(days=30),
                    "paid_at": period_start - timedelta(days=31),
                },
                {
                    "invoice_number": "INV-SEED-0002",
                    "amount": Decimal("3500.00"),
                    "status": InvoiceStatus.PAID,
                    "billing_period_start": period_start - timedelta(days=30),
                    "billing_period_end": period_start,
                    "due_date": period_start,
                    "paid_at": period_start - timedelta(days=1),
                },
                {
                    "invoice_number": "INV-SEED-0003",
                    "amount": Decimal("3500.00"),
                    "status": InvoiceStatus.PENDING,
                    "billing_period_start": period_start,
                    "billing_period_end": period_end,
                    "due_date": period_end,
                    "paid_at": None,
                },
            ]

            invoices = {}
            for inv in inv_data:
                obj, created = Invoice.objects.update_or_create(
                    invoice_number=inv["invoice_number"],
                    defaults={
                        "subscription": growth_sub,
                        "tenant": demo_tenant,
                        **{k: v for k, v in inv.items() if k != "invoice_number"},
                    },
                )
                invoices[inv["invoice_number"]] = obj
                self.stdout.write(
                    f"  {'Created' if created else 'Updated'} invoice {inv['invoice_number']}"
                )

            # Payment reminders for INV-SEED-0003
            inv3 = invoices["INV-SEED-0003"]
            for r_type, r_channel in [
                (PaymentReminderType.THREE_DAY_REMINDER, PaymentReminderChannel.WHATSAPP),
                (PaymentReminderType.DUE_DATE_REMINDER, PaymentReminderChannel.EMAIL),
            ]:
                r, created = PaymentReminder.objects.update_or_create(
                    invoice=inv3,
                    reminder_type=r_type,
                    channel=r_channel,
                    defaults={
                        "tenant": demo_tenant,
                        "send_status": PaymentReminderSendStatus.SENT,
                    },
                )
                self.stdout.write(
                    f"  {'Created' if created else 'Updated'} reminder {r_type} for INV-SEED-0003"
                )

        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"  Could not seed demo tenant: {exc}"))

        # ── 3. Trial Demo Boutique ──────────────────────────────────────────
        try:
            trial_tenant, _ = Tenant.objects.update_or_create(
                slug="trial-boutique",
                defaults={
                    "name": "Trial Demo Boutique",
                    "subscription_status": "TRIAL",
                    "status": "active",
                },
            )
            trial_ends = now + timedelta(days=TRIAL_DAYS)
            Subscription.objects.update_or_create(
                tenant=trial_tenant,
                plan=plans["starter"],
                defaults={
                    "status": SubscriptionStatus.TRIAL,
                    "trial_ends_at": trial_ends,
                },
            )
            self.stdout.write(self.style.SUCCESS("  Seeded trial-boutique (TRIAL/STARTER)"))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"  Could not seed trial boutique: {exc}"))

        # ── 4. Suspended Demo Boutique ──────────────────────────────────────
        try:
            suspended_tenant, _ = Tenant.objects.update_or_create(
                slug="suspended-boutique",
                defaults={
                    "name": "Suspended Demo Boutique",
                    "subscription_status": "SUSPENDED",
                    "status": "suspended",
                },
            )
            Subscription.objects.update_or_create(
                tenant=suspended_tenant,
                plan=plans["growth"],
                defaults={
                    "status": SubscriptionStatus.SUSPENDED,
                    "current_period_end": now - timedelta(days=8),
                },
            )
            self.stdout.write(self.style.SUCCESS("  Seeded suspended-boutique (SUSPENDED/GROWTH)"))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"  Could not seed suspended boutique: {exc}"))

        self.stdout.write(self.style.SUCCESS("\nDone! Demo billing data seeded successfully."))
