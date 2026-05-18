from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.tenants.models import Plan


class Command(BaseCommand):
    help = "Seeds the two standard subscription plans into the database. Safe to re-run (idempotent via update_or_create)."

    def handle(self, *args, **options):
        plans = [
            {
                "name": "Basic POS",
                "defaults": {
                    "description": (
                        "Designed for small independent retailers who need reliable "
                        "point-of-sale and inventory tracking without advanced features. "
                        "Includes everything you need to run a modern retail counter at an "
                        "affordable monthly price."
                    ),
                    "price_monthly": Decimal("4999.00"),
                    "features": [
                        "POS Terminal",
                        "Inventory Management",
                        "Sales History",
                        "Basic Reports",
                        "Up to 3 Staff Accounts",
                    ],
                    "is_active": True,
                    "sort_order": 1,
                },
            },
            {
                "name": "Pro POS + WhatsApp",
                "defaults": {
                    "description": (
                        "Built for growing retail businesses that need WhatsApp notifications "
                        "for order updates, customer messaging, multi-staff management, and "
                        "advanced reporting. The complete LankaCommerce experience."
                    ),
                    "price_monthly": Decimal("7999.00"),
                    "features": [
                        "Everything in Basic POS",
                        "WhatsApp Notifications",
                        "Advanced Analytics & Reports",
                        "Unlimited Staff Accounts",
                        "Customer Relationship Management",
                        "Priority Support",
                    ],
                    "is_active": True,
                    "sort_order": 2,
                },
            },
        ]

        for plan_data in plans:
            instance, created = Plan.objects.update_or_create(
                name=plan_data["name"],
                defaults=plan_data["defaults"],
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created plan: {instance.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Updated plan: {instance.name}"))

        self.stdout.write(self.style.SUCCESS("Plan seeding complete. 2 plans processed."))
