import os
from datetime import datetime, timedelta, timezone

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import CustomUser
from apps.tenants.models import Plan, Subscription, SubscriptionStatus, Tenant, TenantStatus


class Command(BaseCommand):
    help = (
        "Seeds a sample tenant (Dilani Boutique) for development and testing. "
        "Requires SEED_SAMPLE_TENANT=true environment variable. Safe to re-run (idempotent)."
    )

    def handle(self, *args, **options):
        # Environment guard
        if os.environ.get("SEED_SAMPLE_TENANT", "") != "true":
            self.stdout.write(
                self.style.WARNING(
                    "SEED_SAMPLE_TENANT is not set to 'true'. Skipping sample tenant seed. "
                    "Set SEED_SAMPLE_TENANT=true to run."
                )
            )
            return

        # Idempotency check
        if Tenant.objects.filter(slug="dilani").exists():
            self.stdout.write(
                self.style.WARNING("Sample tenant 'dilani' already exists. Skipping.")
            )
            return

        # Resolve plan
        try:
            plan = Plan.objects.get(name="Pro POS + WhatsApp")
        except Plan.DoesNotExist:
            raise CommandError(
                "Pro POS + WhatsApp plan not found. Please run 'python manage.py seed_plans' first."
            )

        # Credentials
        owner_email = os.environ.get("SEED_OWNER_EMAIL", "owner@dilani.example.com")
        owner_password_plain = os.environ.get("SEED_OWNER_PASSWORD", "")
        if not owner_password_plain:
            raise CommandError(
                "SEED_OWNER_PASSWORD environment variable is required for seed_sample_tenant."
            )

        hashed_password = make_password(owner_password_plain)
        owner_password_plain = None  # discard plain-text immediately

        # Atomic creation
        now = datetime.now(tz=timezone.utc)
        period_end = now + timedelta(days=30)

        with transaction.atomic():
            tenant = Tenant.objects.create(
                name="Dilani Boutique",
                slug="dilani",
                status=TenantStatus.ACTIVE,
                settings={
                    "currency": "LKR",
                    "timezone": "Asia/Colombo",
                    "vatRate": 18,
                    "ssclRate": 2.5,
                    "receiptFooter": "Thank you for shopping at Dilani Boutique!",
                },
            )

            CustomUser.objects.create(
                email=owner_email,
                password=hashed_password,
                role="OWNER",
                is_active=True,
                tenant=tenant,
            )

            Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=now,
                current_period_end=period_end,
                next_billing_date=period_end,
            )

        self.stdout.write(
            self.style.SUCCESS("Created tenant: Dilani Boutique (slug: dilani)")
        )
        self.stdout.write(
            self.style.SUCCESS(f"Created owner account: {owner_email}")
        )
        self.stdout.write(
            self.style.SUCCESS("Created active Pro subscription for Dilani Boutique")
        )
        self.stdout.write(self.style.SUCCESS("Sample tenant seed complete."))
