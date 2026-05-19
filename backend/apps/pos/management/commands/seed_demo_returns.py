"""Management command: seed_demo_returns

Seeds 4 demo return records for the 'dilani' development tenant.
The command is idempotent — if any of the seeded returns already exist it exits.

Returns breakdown:
  - Return A: CASH refund, 1 line, restocked
  - Return B: STORE_CREDIT, 1 line, NOT restocked, creates StoreCredit record
  - Return C: CARD_REVERSAL, partial (qty 1 of 2+), restocked
  - Return D: EXCHANGE, 1 line, restocked

Prerequisites:
  - seed_demo_sales must have been run first.
  - At least 1 cashier and 1 manager user must exist for the tenant.

Usage:
    python manage.py seed_demo_returns
"""

from decimal import ROUND_HALF_UP, Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F

from apps.accounts.models import CustomUser, UserRole
from apps.pos.models import (
    Return,
    ReturnLine,
    ReturnRefundMethod,
    ReturnStatus,
    Sale,
    SaleLine,
    SaleStatus,
    StoreCredit,
)
from apps.tenants.models import Tenant

DEMO_TENANT_SLUG = "dilani"
SEED_REASONS = [
    "SEED_DEMO_CASH_REFUND",
    "SEED_DEMO_STORE_CREDIT",
    "SEED_DEMO_CARD_REVERSAL",
    "SEED_DEMO_EXCHANGE",
]


def _q(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = "Seeds 4 demo returns for the dilani development tenant."

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
        existing = Return.objects.filter(
            tenant=tenant, reason__in=SEED_REASONS
        ).count()
        if existing > 0:
            self.stdout.write(
                self.style.WARNING("Demo returns already seeded — skipping.")
            )
            return

        # ── 3. Resolve users ──────────────────────────────────────────
        cashier = (
            CustomUser.objects.filter(tenant=tenant, role=UserRole.CASHIER)
            .order_by("date_joined")
            .first()
        )
        if not cashier:
            raise CommandError(
                "No cashier user found for the dilani tenant. "
                "Run 'python manage.py seed_demo_sales' first."
            )

        manager = (
            CustomUser.objects.filter(
                tenant=tenant, role__in=[UserRole.MANAGER, UserRole.OWNER]
            )
            .order_by("date_joined")
            .first()
        )
        if not manager:
            raise CommandError(
                "No manager/owner user found for the dilani tenant."
            )

        # ── 4. Resolve demo sales ─────────────────────────────────────
        # Fetch completed sales with their lines preloaded
        completed_sales = list(
            Sale.objects.filter(
                tenant_id=tenant.slug, status=SaleStatus.COMPLETED
            )
            .prefetch_related("lines__variant")
            .order_by("created_at")
        )

        if len(completed_sales) < 4:
            raise CommandError(
                f"Expected at least 4 completed sales; found {len(completed_sales)}. "
                "Run 'python manage.py seed_demo_sales' first."
            )

        # Pick 4 distinct sales
        sale_a = completed_sales[0]
        sale_b = completed_sales[1]

        # For sale_c we want a line with quantity >= 2
        sale_c = None
        for s in completed_sales[2:]:
            for line in s.lines.all():
                if line.quantity >= 2:
                    sale_c = s
                    break
            if sale_c:
                break
        if not sale_c:
            sale_c = completed_sales[2]

        sale_d = completed_sales[3] if completed_sales[3] != sale_c else completed_sales[4]

        with transaction.atomic():
            # ── Return A — Cash Refund, restock ───────────────────────
            self.stdout.write("Creating demo Return A (cash refund)...")
            sale_line_a = sale_a.lines.order_by("created_at").first()
            refund_a = _q(
                Decimal("1") / Decimal(sale_line_a.quantity) * sale_line_a.line_total
            )
            return_a = Return.objects.create(
                tenant=tenant,
                original_sale=sale_a,
                initiated_by=cashier,
                authorized_by=manager,
                refund_method=ReturnRefundMethod.CASH,
                refund_amount=refund_a,
                restock_items=True,
                reason="SEED_DEMO_CASH_REFUND",
                status=ReturnStatus.COMPLETED,
            )
            line_a = ReturnLine.objects.create(
                return_record=return_a,
                original_sale_line=sale_line_a,
                variant=sale_line_a.variant,
                product_name_snapshot=sale_line_a.product_name_snapshot,
                variant_description_snapshot=sale_line_a.variant_description_snapshot,
                quantity=1,
                unit_price=sale_line_a.unit_price,
                line_refund_amount=refund_a,
                is_restocked=False,
            )
            sale_line_a.variant.__class__.objects.filter(
                pk=sale_line_a.variant_id
            ).update(stock_quantity=F("stock_quantity") + 1)
            ReturnLine.objects.filter(pk=line_a.pk).update(is_restocked=True)

            # ── Return B — Store Credit, no restock ───────────────────
            self.stdout.write("Creating demo Return B (store credit)...")
            sale_line_b = sale_b.lines.order_by("created_at").first()
            refund_b = _q(
                Decimal("1") / Decimal(sale_line_b.quantity) * sale_line_b.line_total
            )
            return_b = Return.objects.create(
                tenant=tenant,
                original_sale=sale_b,
                initiated_by=cashier,
                authorized_by=manager,
                refund_method=ReturnRefundMethod.STORE_CREDIT,
                refund_amount=refund_b,
                restock_items=False,
                reason="SEED_DEMO_STORE_CREDIT",
                status=ReturnStatus.COMPLETED,
            )
            ReturnLine.objects.create(
                return_record=return_b,
                original_sale_line=sale_line_b,
                variant=sale_line_b.variant,
                product_name_snapshot=sale_line_b.product_name_snapshot,
                variant_description_snapshot=sale_line_b.variant_description_snapshot,
                quantity=1,
                unit_price=sale_line_b.unit_price,
                line_refund_amount=refund_b,
                is_restocked=False,
            )
            StoreCredit.objects.create(
                tenant=tenant,
                amount=refund_b,
                note=f"Demo store credit — Return {return_b.id}",
            )

            # ── Return C — Card Reversal, partial ─────────────────────
            self.stdout.write("Creating demo Return C (card reversal)...")
            # Find a line with qty >= 2 in sale_c, fall back to first line
            sale_line_c = None
            for line in sale_c.lines.order_by("created_at"):
                if line.quantity >= 2:
                    sale_line_c = line
                    break
            if not sale_line_c:
                sale_line_c = sale_c.lines.order_by("created_at").first()

            refund_c = _q(
                Decimal("1") / Decimal(sale_line_c.quantity) * sale_line_c.line_total
            )
            return_c = Return.objects.create(
                tenant=tenant,
                original_sale=sale_c,
                initiated_by=cashier,
                authorized_by=manager,
                refund_method=ReturnRefundMethod.CARD_REVERSAL,
                refund_amount=refund_c,
                restock_items=True,
                reason="SEED_DEMO_CARD_REVERSAL",
                status=ReturnStatus.COMPLETED,
                card_reversal_reference="DEMO-CARD-REV-9012",
            )
            line_c = ReturnLine.objects.create(
                return_record=return_c,
                original_sale_line=sale_line_c,
                variant=sale_line_c.variant,
                product_name_snapshot=sale_line_c.product_name_snapshot,
                variant_description_snapshot=sale_line_c.variant_description_snapshot,
                quantity=1,
                unit_price=sale_line_c.unit_price,
                line_refund_amount=refund_c,
                is_restocked=False,
            )
            sale_line_c.variant.__class__.objects.filter(
                pk=sale_line_c.variant_id
            ).update(stock_quantity=F("stock_quantity") + 1)
            ReturnLine.objects.filter(pk=line_c.pk).update(is_restocked=True)

            # ── Return D — Exchange ────────────────────────────────────
            self.stdout.write("Creating demo Return D (exchange)...")
            sale_line_d = sale_d.lines.order_by("created_at").first()
            refund_d = _q(
                Decimal("1") / Decimal(sale_line_d.quantity) * sale_line_d.line_total
            )
            return_d = Return.objects.create(
                tenant=tenant,
                original_sale=sale_d,
                initiated_by=cashier,
                authorized_by=manager,
                refund_method=ReturnRefundMethod.EXCHANGE,
                refund_amount=refund_d,
                restock_items=True,
                reason="SEED_DEMO_EXCHANGE",
                status=ReturnStatus.COMPLETED,
            )
            line_d = ReturnLine.objects.create(
                return_record=return_d,
                original_sale_line=sale_line_d,
                variant=sale_line_d.variant,
                product_name_snapshot=sale_line_d.product_name_snapshot,
                variant_description_snapshot=sale_line_d.variant_description_snapshot,
                quantity=1,
                unit_price=sale_line_d.unit_price,
                line_refund_amount=refund_d,
                is_restocked=False,
            )
            sale_line_d.variant.__class__.objects.filter(
                pk=sale_line_d.variant_id
            ).update(stock_quantity=F("stock_quantity") + 1)
            ReturnLine.objects.filter(pk=line_d.pk).update(is_restocked=True)

        # ── 5. Sanity checks ──────────────────────────────────────────
        return_count = Return.objects.filter(
            tenant=tenant, reason__in=SEED_REASONS
        ).count()
        if return_count != 4:
            self.stdout.write(
                self.style.WARNING(
                    f"WARNING: Expected 4 seeded returns, found {return_count}."
                )
            )
        credit_count = StoreCredit.objects.filter(tenant=tenant).count()
        if credit_count < 1:
            self.stdout.write(
                self.style.WARNING("WARNING: Expected at least 1 StoreCredit record.")
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded demo returns: 4 returns "
                "(1 cash, 1 store credit, 1 card reversal, 1 exchange)"
            )
        )
