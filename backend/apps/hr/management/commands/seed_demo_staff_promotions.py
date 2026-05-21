"""
Management command: seed_demo_staff_promotions

Seeds realistic demo data for SubPhase 04.02 models.
Idempotent — safe to run multiple times.
"""

import calendar
import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.hr.models import CommissionRecord
from apps.promotions.models import Promotion
from apps.pos.models import Sale, Shift, CashMovement, Expense
from apps.catalog.models import Category
from apps.tenants.models import Tenant

User = get_user_model()


def _safe_date(year: int, month: int, day: int) -> datetime.date:
    last_day = calendar.monthrange(year, month)[1]
    return datetime.date(year, month, min(day, last_day))


class Command(BaseCommand):
    help = "Seed demo staff, promotions, expenses, and cash movement data for SubPhase 04.02."

    def handle(self, *args, **options):
        # ── Lookup prerequisite objects ───────────────────────────────────
        demo_tenant = Tenant.objects.filter(slug="demo").first()
        if demo_tenant is None:
            self.stdout.write(self.style.WARNING(
                "Demo tenant not found. Run Phase 01 seed first."
            ))
            return

        cashier_user = User.objects.filter(tenant=demo_tenant, role="CASHIER").first()
        if cashier_user is None:
            self.stdout.write(self.style.WARNING(
                "Demo CASHIER user not found. Run Phase 01 seed first."
            ))
            return

        manager_user = User.objects.filter(
            tenant=demo_tenant, role__in=["MANAGER", "OWNER"]
        ).first()
        if manager_user is None:
            self.stdout.write(self.style.WARNING(
                "Demo MANAGER/OWNER user not found."
            ))
            return

        # ── Idempotency check ─────────────────────────────────────────────
        if CommissionRecord.objects.filter(tenant=demo_tenant, user=cashier_user).exists():
            self.stdout.write("Demo staff/promotions data already seeded — skipping.")
            return

        # ── Commission rate setup ─────────────────────────────────────────
        if cashier_user.commission_rate is None:
            User.objects.filter(id=cashier_user.id).update(
                commission_rate=Decimal("5.00")
            )
            cashier_user.refresh_from_db()

        # ── CommissionRecord entries ──────────────────────────────────────
        demo_sales = list(
            Sale.objects.filter(tenant=demo_tenant, status="COMPLETED").order_by("created_at")[:5]
        )
        commission_records_seeded = 0
        if not demo_sales:
            self.stdout.write(self.style.WARNING(
                "No completed demo sales found. Commission records will not be seeded."
            ))
        else:
            for idx, sale in enumerate(demo_sales):
                earned_amount = (
                    sale.total_amount * Decimal("5") / Decimal("100")
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                is_paid = idx < 2
                _, created = CommissionRecord.objects.get_or_create(
                    tenant=demo_tenant,
                    user=cashier_user,
                    sale=sale,
                    defaults={
                        "earned_amount": earned_amount,
                        "commission_rate": Decimal("5.00"),
                        "is_paid": is_paid,
                    },
                )
                if created:
                    commission_records_seeded += 1

        # ── Promotions ───────────────────────────────────────────────────
        Promotion.objects.get_or_create(
            tenant=demo_tenant,
            name="10% Off Everything",
            defaults={
                "type": "CART_PERCENTAGE",
                "value": Decimal("10.00"),
                "is_active": True,
                "description": "A flat 10% discount applied to every cart — great for clearance periods.",
            },
        )

        Promotion.objects.get_or_create(
            tenant=demo_tenant,
            name="Summer10",
            defaults={
                "type": "PROMO_CODE",
                "promo_code": "SUMMER10",
                "value": Decimal("10.00"),
                "is_active": True,
                "description": "Enter SUMMER10 at checkout for 10% off.",
            },
        )

        first_category = Category.objects.filter(tenant=demo_tenant).first()
        Promotion.objects.get_or_create(
            tenant=demo_tenant,
            name="Category Discount 15%",
            defaults={
                "type": "CATEGORY_PERCENTAGE",
                "value": Decimal("15.00"),
                "target_category": first_category,
                "is_active": True,
                "description": "15% off all products in the selected category.",
            },
        )

        # ── Expenses ─────────────────────────────────────────────────────
        today = datetime.date.today()
        year, month = today.year, today.month

        expenses_data = [
            ("Monthly retail space rent", _safe_date(year, month, 1), "RENT", Decimal("1200.00")),
            ("Electricity and water bill", _safe_date(year, month, 5), "UTILITIES", Decimal("230.00")),
            ("Weekly staff wages", _safe_date(year, month, 15), "SALARIES", Decimal("3500.00")),
            ("Social media promotion boost", _safe_date(year, month, 10), "ADVERTISING", Decimal("150.00")),
            ("Office supplies purchase", _safe_date(year, month, 20), "MISCELLANEOUS", Decimal("45.00")),
        ]

        for description, expense_date, category_val, amount in expenses_data:
            Expense.objects.get_or_create(
                tenant=demo_tenant,
                description=description,
                expense_date=expense_date,
                defaults={
                    "category": category_val,
                    "amount": amount,
                    "recorded_by": manager_user,
                },
            )

        # ── CashMovements ─────────────────────────────────────────────────
        demo_shift = Shift.objects.filter(tenant=demo_tenant).order_by("opened_at").first()
        if demo_shift is None:
            self.stdout.write(self.style.WARNING(
                "No demo shift found. CashMovement records will not be seeded."
            ))
        else:
            CashMovement.objects.get_or_create(
                tenant=demo_tenant,
                shift=demo_shift,
                type="OPENING_FLOAT",
                defaults={
                    "amount": Decimal("200.00"),
                    "reason": "Opening float for demo shift.",
                },
            )
            CashMovement.objects.get_or_create(
                tenant=demo_tenant,
                shift=demo_shift,
                type="PETTY_CASH_OUT",
                defaults={
                    "amount": Decimal("35.00"),
                    "reason": "Purchased coffee supplies for staff room.",
                    "authorized_by": manager_user,
                },
            )

        # ── Summary ───────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS(
            f"Seeded demo staff/promotions data: {commission_records_seeded} CommissionRecords for "
            f"CASHIER, 3 Promotions, 5 Expenses, 2 CashMovements for demo shift."
        ))
        if options.get("verbosity", 1) >= 2:
            self.stdout.write(self.style.SUCCESS(
                f"  CommissionRecords: {commission_records_seeded} created"
            ))
            self.stdout.write(self.style.SUCCESS("  Promotions: 3 seeded (CART_PERCENTAGE, PROMO_CODE, CATEGORY_PERCENTAGE)"))
            self.stdout.write(self.style.SUCCESS("  Expenses: 5 seeded (RENT, UTILITIES, SALARIES, ADVERTISING, MISCELLANEOUS)"))
            self.stdout.write(self.style.SUCCESS("  CashMovements: 2 seeded (OPENING_FLOAT, PETTY_CASH_OUT)"))
