"""Management command: seed_demo_sales

Seeds 20 demo sales across 5 days for the 'dilani' development tenant.
The command is idempotent — if ≥ 20 completed sales already exist it exits.

Sales breakdown:
  - 12 CASH sales
  -  6 CARD sales
  -  2 SPLIT sales (2 Payment legs each = 22 Payment rows total)

Two shifts are created (one per cashier), each with a ShiftClosure.

Prerequisites:
  - seed_sample_tenant, seed_plans, seed_catalog must have been run first.
  - Two non-owner users must exist for the tenant (cashier role).

Usage:
    python manage.py seed_demo_sales
"""

import random
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import CustomUser, UserRole
from apps.catalog.models import ProductVariant
from apps.pos.models import (
    Payment,
    PaymentLegMethod,
    PaymentMethod,
    Sale,
    SaleLine,
    SaleStatus,
    Shift,
    ShiftClosure,
    ShiftStatus,
)
from apps.tenants.models import Tenant

DEMO_TENANT_SLUG = "dilani"
TARGET_SALES = 20


def _q(amount: Decimal) -> Decimal:
    """Round Decimal to 2dp using ROUND_HALF_UP."""
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = "Seeds 20 demo completed sales for the dilani development tenant."

    def handle(self, *args, **options):
        # ── 1. Resolve tenant ─────────────────────────────────────────
        try:
            tenant = Tenant.objects.get(slug=DEMO_TENANT_SLUG)
        except Tenant.DoesNotExist:
            raise CommandError(
                f"Tenant with slug='{DEMO_TENANT_SLUG}' not found. "
                "Run 'python manage.py seed_sample_tenant' first."
            )

        # ── 2. Idempotency check ──────────────────────────────────────
        existing = Sale.objects.filter(
            tenant_id=tenant.slug, status=SaleStatus.COMPLETED
        ).count()
        if existing >= TARGET_SALES:
            self.stdout.write(
                self.style.WARNING(
                    f"Already {existing} completed sales for '{DEMO_TENANT_SLUG}'. Skipping."
                )
            )
            return

        # ── 3. Resolve / create cashier users ─────────────────────────
        cashiers = list(
            CustomUser.objects.filter(
                tenant=tenant, role=UserRole.CASHIER
            ).order_by("email")[:2]
        )

        # If fewer than 2 cashiers exist, create them
        while len(cashiers) < 2:
            idx = len(cashiers) + 1
            email = f"cashier{idx}@{DEMO_TENANT_SLUG}.example.com"
            user, _ = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "password": make_password("DemoPass123!"),
                    "role": UserRole.CASHIER,
                    "is_active": True,
                    "tenant": tenant,
                },
            )
            cashiers.append(user)

        # ── 4. Resolve product variants ───────────────────────────────
        variants = list(
            ProductVariant.objects.filter(
                product__tenant_id=tenant.slug,
                is_active=True,
            ).select_related("product")[:20]
        )
        if not variants:
            raise CommandError(
                "No active ProductVariants found for the dilani tenant. "
                "Run 'python manage.py seed_catalog' first."
            )

        # ── 5. Set stock on selected variants so sales don't fail checks ─
        variant_ids = [v.id for v in variants]
        ProductVariant.objects.filter(id__in=variant_ids).update(stock_quantity=50)

        # ── 6. Build payment distribution (12 CASH, 6 CARD, 2 SPLIT) ─
        payment_methods = (
            [PaymentMethod.CASH] * 12
            + [PaymentMethod.CARD] * 6
            + [PaymentMethod.SPLIT] * 2
        )
        random.shuffle(payment_methods)

        # ── 7. Create Shifts (one per cashier, closed) ────────────────
        now = timezone.now()
        shifts = []
        for i, cashier in enumerate(cashiers):
            day_offset = i * 2  # shift 1 older, shift 2 more recent
            shift_open = now - timedelta(days=5 - day_offset, hours=8)
            shift_close = shift_open + timedelta(hours=9)

            shift = Shift.objects.create(
                tenant_id=tenant.slug,
                cashier=cashier,
                status=ShiftStatus.CLOSED,
                opening_float=Decimal("5000.00"),
                opened_at=shift_open,
                closed_at=shift_close,
            )
            # Manually set opened_at (auto_now_add bypasses kwargs)
            Shift.objects.filter(pk=shift.pk).update(opened_at=shift_open)
            shifts.append(shift)

        # ── 8. Create sales ───────────────────────────────────────────
        sales: list[Sale] = []
        all_payments: list[Payment] = []
        all_lines: list[SaleLine] = []

        rng = random.Random(42)  # reproducible seed

        for i, method in enumerate(payment_methods):
            cashier = cashiers[i % 2]
            shift = shifts[i % 2]

            # Pick 1–3 random variants
            sale_variants = rng.sample(variants, k=rng.randint(1, 3))
            sale_day = now - timedelta(days=4 - (i % 5), hours=rng.randint(0, 7))

            # Compute totals
            subtotal = Decimal("0.00")
            line_data = []
            for v in sale_variants:
                qty = rng.randint(1, 3)
                unit_price = v.selling_price or Decimal("500.00")
                line_gross = _q(unit_price * qty)
                disc_pct = Decimal("0.00")
                disc_amt = Decimal("0.00")
                line_total = _q(line_gross - disc_amt)
                subtotal += line_total
                line_data.append(
                    dict(
                        variant=v,
                        product_name_snapshot=v.product.name,
                        variant_description_snapshot=v.description or v.sku,
                        sku=v.sku,
                        unit_price=unit_price,
                        quantity=qty,
                        discount_percent=disc_pct,
                        discount_amount=disc_amt,
                        line_total_before_discount=line_gross,
                        line_total_after_discount=line_total,
                    )
                )

            subtotal = _q(subtotal)
            discount_amount = Decimal("0.00")
            tax_amount = _q(subtotal * Decimal("0.15"))
            total_amount = _q(subtotal + tax_amount)

            # Determine payment amounts
            if method == PaymentMethod.CASH:
                # Round cash up to nearest 100
                cash_received = _q(
                    (total_amount / 100).to_integral_value(rounding=ROUND_HALF_UP) * 100
                )
                if cash_received < total_amount:
                    cash_received = total_amount
                change_given = _q(cash_received - total_amount)
            elif method == PaymentMethod.CARD:
                cash_received = total_amount
                change_given = Decimal("0.00")
            else:  # SPLIT
                card_amount = _q(total_amount / 2)
                cash_portion = total_amount - card_amount
                cash_received = _q(
                    (cash_portion / 100).to_integral_value(rounding=ROUND_HALF_UP) * 100
                )
                if cash_received < cash_portion:
                    cash_received = cash_portion
                change_given = _q(cash_received - cash_portion)

            sale = Sale(
                tenant_id=tenant.slug,
                shift=shift,
                cashier=cashier,
                subtotal=subtotal,
                discount_amount=discount_amount,
                tax_amount=tax_amount,
                total_amount=total_amount,
                change_given=change_given,
                payment_method=method,
                status=SaleStatus.COMPLETED,
                completed_at=sale_day,
                created_at=sale_day,
            )
            sales.append(sale)

            for ld in line_data:
                all_lines.append(
                    SaleLine(
                        sale=sale,
                        **ld,
                    )
                )

            # Payment legs
            if method == PaymentMethod.CASH:
                all_payments.append(
                    Payment(
                        sale=sale,
                        method=PaymentLegMethod.CASH,
                        amount=cash_received,
                    )
                )
            elif method == PaymentMethod.CARD:
                all_payments.append(
                    Payment(
                        sale=sale,
                        method=PaymentLegMethod.CARD,
                        amount=total_amount,
                    )
                )
            else:  # SPLIT
                card_a = _q(total_amount / 2)
                cash_p = total_amount - card_a
                all_payments.append(
                    Payment(
                        sale=sale,
                        method=PaymentLegMethod.CARD,
                        amount=card_a,
                    )
                )
                all_payments.append(
                    Payment(
                        sale=sale,
                        method=PaymentLegMethod.CASH,
                        amount=cash_received,
                    )
                )

        # ── 9. Persist everything atomically ──────────────────────────
        with transaction.atomic():
            # bulk_create won't call save() / auto_now; fix timestamps after
            Sale.objects.bulk_create(sales)

            # Fix created_at via update (auto_now_add doesn't accept kwargs)
            for sale_obj in sales:
                Sale.objects.filter(pk=sale_obj.pk).update(
                    created_at=sale_obj.created_at,
                    completed_at=sale_obj.completed_at,
                )

            # Assign sale FK to lines and payments
            for line in all_lines:
                # sale.pk is set after bulk_create
                pass  # sale FK already set via assignment above

            SaleLine.objects.bulk_create(all_lines)
            Payment.objects.bulk_create(all_payments)

            # ── 10. Create ShiftClosure records ───────────────────────
            for shift_obj in shifts:
                shift_sales = [s for s in sales if s.shift_id == shift_obj.id]
                total_sales_amount = sum((s.total_amount for s in shift_sales), Decimal("0.00"))
                total_cash = sum(
                    (p.amount for p in all_payments if p.sale.shift_id == shift_obj.id and p.method == PaymentLegMethod.CASH),
                    Decimal("0.00"),
                )
                total_card = sum(
                    (p.amount for p in all_payments if p.sale.shift_id == shift_obj.id and p.method == PaymentLegMethod.CARD),
                    Decimal("0.00"),
                )
                expected_cash = shift_obj.opening_float + total_cash
                closing_cash = expected_cash  # demo: no variance
                ShiftClosure.objects.get_or_create(
                    shift=shift_obj,
                    defaults=dict(
                        closing_cash_count=closing_cash,
                        expected_cash=expected_cash,
                        cash_difference=_q(closing_cash - expected_cash),
                        total_sales_count=len(shift_sales),
                        total_sales_amount=_q(total_sales_amount),
                        total_cash_amount=_q(total_cash),
                        total_card_amount=_q(total_card),
                        closed_by=shift_obj.cashier,
                    ),
                )

        # ── 11. Verify ────────────────────────────────────────────────
        sale_count = Sale.objects.filter(
            tenant_id=tenant.slug, status=SaleStatus.COMPLETED
        ).count()
        payment_count = Payment.objects.filter(
            sale__tenant_id=tenant.slug
        ).count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {sale_count} completed sales and {payment_count} payment records "
                f"for tenant '{DEMO_TENANT_SLUG}'."
            )
        )
        assert sale_count >= TARGET_SALES, f"Expected {TARGET_SALES} sales, got {sale_count}"
        self.stdout.write(self.style.SUCCESS("seed_demo_sales complete."))
