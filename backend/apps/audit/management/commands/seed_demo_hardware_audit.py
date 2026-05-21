"""Seed demo hardware config, audit log entries, cash movements, and birthday data."""
import logging
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)

DEMO_ACTOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEMO_ACTOR_2_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


class Command(BaseCommand):
    help = "Seeds demo hardware config, audit logs, cash movements, and birthday data."

    def handle(self, *args, **options):
        from apps.tenants.models import Tenant

        try:
            demo_tenant = Tenant.objects.get(slug="demo")
        except Tenant.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    "Demo tenant (slug='demo') not found. "
                    "Run seed_demo_staff_promotions first."
                )
            )
            return

        # ── Idempotency guard ─────────────────────────────────────
        existing_logs = AuditLog.objects.filter(tenant_id=demo_tenant.id)
        if existing_logs.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"AuditLog entries already exist for tenant '{demo_tenant.slug}' "
                    f"({existing_logs.count()} records). Skipping seed."
                )
            )
            return

        # ── Step 1: Seed Hardware Configuration ───────────────────
        settings = dict(demo_tenant.settings or {})
        settings["hardware"] = {
            "printer_type": "NETWORK",
            "host": "192.168.1.100",
            "port": 9100,
            "cash_drawer_enabled": True,
            "cfd_enabled": True,
            "paper_width": "80mm",
        }
        demo_tenant.settings = settings
        demo_tenant.save(update_fields=["settings"])
        self.stdout.write(
            self.style.SUCCESS("Updated hardware configuration for demo tenant.")
        )

        # ── Step 2: Seed AuditLog Entries ─────────────────────────
        now = timezone.now()
        fourteen_days_ago = now - timedelta(days=14)

        audit_logs = [
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="SALE_COMPLETED",
                entity_type="Sale",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(hours=2),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="SALE_VOIDED",
                entity_type="Sale",
                entity_id=uuid.uuid4(),
                before={"status": "COMPLETED"},
                after={"status": "VOIDED"},
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=1, hours=5),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="RETURN_COMPLETED",
                entity_type="Return",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=2, hours=10),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_2_ID,
                actor_role="MANAGER",
                action="RETURN_COMPLETED",
                entity_type="Return",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=3, hours=14),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="CUSTOMER_CREDIT_ADJUSTED",
                entity_type="Customer",
                entity_id=uuid.uuid4(),
                before={"credit_balance": "0.00"},
                after={"credit_balance": "50.00"},
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=4, hours=9),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_2_ID,
                actor_role="MANAGER",
                action="STAFF_ROLE_CHANGED",
                entity_type="User",
                entity_id=uuid.uuid4(),
                before={"role": "CASHIER"},
                after={"role": "MANAGER"},
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=6, hours=11),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_2_ID,
                actor_role="MANAGER",
                action="PROMOTION_CREATED",
                entity_type="Promotion",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=8, hours=15),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="STOCK_ADJUSTED",
                entity_type="StockMovement",
                entity_id=uuid.uuid4(),
                before={"quantity": 10},
                after={"quantity": 8},
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=10, hours=16),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_ID,
                actor_role="CASHIER",
                action="EXPENSE_CREATED",
                entity_type="Expense",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=12, hours=8),
            ),
            AuditLog(
                tenant_id=demo_tenant.id,
                actor_id=DEMO_ACTOR_2_ID,
                actor_role="MANAGER",
                action="SHIFT_CLOSED",
                entity_type="Shift",
                entity_id=uuid.uuid4(),
                ip_address="127.0.0.1",
                user_agent="LankaCommerce/Seed",
                created_at=fourteen_days_ago + timedelta(days=13, hours=22),
            ),
        ]

        AuditLog.objects.bulk_create(audit_logs)
        audit_count = len(audit_logs)
        self.stdout.write(
            self.style.SUCCESS(f"Created {audit_count} AuditLog entries.")
        )

        # ── Step 3: Seed CashMovement Records ─────────────────────
        from apps.pos.models import CashMovement, Shift

        demo_shift = Shift.objects.filter(tenant=demo_tenant).first()
        cash_count = 0
        if not demo_shift:
            self.stdout.write(
                self.style.WARNING(
                    "No shifts found for demo tenant. Skipping cash movements."
                )
            )
        else:
            existing_movements = CashMovement.objects.filter(shift=demo_shift)
            if existing_movements.exists():
                self.stdout.write(
                    self.style.WARNING(
                        "Cash movements already exist for demo shift. Skipping."
                    )
                )
                cash_count = existing_movements.count()
            else:
                new_movements = CashMovement.objects.bulk_create([
                    CashMovement(
                        shift=demo_shift,
                        tenant=demo_tenant,
                        type="PETTY_CASH_OUT",
                        amount=Decimal("15.00"),
                        reason="Bought paper cups and straws",
                    ),
                    CashMovement(
                        shift=demo_shift,
                        tenant=demo_tenant,
                        type="MANUAL_IN",
                        amount=Decimal("100.00"),
                        reason="Cash float top-up from safe",
                    ),
                ])
                cash_count = len(new_movements)
                self.stdout.write(
                    self.style.SUCCESS(f"Created {cash_count} CashMovement records.")
                )

        # ── Step 4: Seed Customer Birthday Data ───────────────────
        from apps.crm.models import Customer

        demo_customers = Customer.objects.filter(
            tenant=demo_tenant, deleted_at__isnull=True
        )
        customer_count = demo_customers.count()
        demo_customers.update(last_birthday_message_sent_year=None)

        first_customer = demo_customers.first()
        if first_customer:
            today = date.today()
            first_customer.birthday = date(2000, today.month, today.day)
            first_customer.last_birthday_message_sent_year = None
            first_customer.save(
                update_fields=["birthday", "last_birthday_message_sent_year"]
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Set customer '{first_customer.name}' birthday to today "
                    f"({today.isoformat()})."
                )
            )

        # ── Summary ───────────────────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {audit_count} AuditLog entries, {cash_count} CashMovement "
                f"records, updated hardware config, and reset birthday fields for "
                f"{customer_count} customers."
            )
        )
        logger.info(
            "Seed demo hardware audit complete: %d AuditLog, %d CashMovement, "
            "%d customers reset.",
            audit_count,
            cash_count,
            customer_count,
        )
