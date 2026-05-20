"""Management command: seed_demo_crm
Idempotently seeds demo customers, suppliers, purchase orders, and a broadcast
record for the demo tenant.

Usage:
    python manage.py seed_demo_crm
"""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.catalog.models import ProductVariant
from apps.crm.models import (
    Customer,
    CustomerBroadcast,
    POStatus,
    PurchaseOrder,
    PurchaseOrderLine,
    Supplier,
)
from apps.tenants.models import Tenant

DEMO_TENANT_SLUG = "dilani"


class Command(BaseCommand):
    help = "Seed demo CRM data (customers, suppliers, purchase orders, broadcast record) for the demo tenant."

    def handle(self, *args, **kwargs):
        try:
            demo_tenant = Tenant.objects.get(slug=DEMO_TENANT_SLUG)
        except Tenant.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    f"Tenant with slug='{DEMO_TENANT_SLUG}' not found. "
                    "Run seed_demo first to create the demo tenant."
                )
            )
            return

        # ── Idempotency guard ────────────────────────────────────────────
        if Customer.objects.filter(tenant=demo_tenant, phone="+94770000001").exists():
            self.stdout.write("Demo CRM data already seeded — skipping.")
            return

        # ── 10 Demo Customers ────────────────────────────────────────────
        customers_data = [
            {
                "name": "Amara Perera",
                "phone": "+94770000001",
                "tags": ["VIP", "Regular"],
                "birthday": datetime.date(1990, 3, 17),
                "credit_balance": Decimal("1500.00"),
                "total_spend": Decimal("45000.00"),
                "notes": "Loyal since 2019",
            },
            {
                "name": "Nimal Fernando",
                "phone": "+94770000002",
                "tags": ["Wholesale"],
                "birthday": None,
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
            {
                "name": "Dilani Jayawardena",
                "phone": "+94770000003",
                "tags": ["VIP"],
                "birthday": datetime.date(1985, 6, 21),
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("62000.00"),
                "notes": "",
            },
            {
                "name": "Kasun Dissanayake",
                "phone": "+94770000004",
                "tags": ["Regular"],
                "birthday": datetime.date(1995, 11, 8),
                "credit_balance": Decimal("-500.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
            {
                "name": "Priya Rajapaksa",
                "phone": "+94770000005",
                "tags": ["VIP", "Online"],
                "birthday": datetime.date(1992, 7, 14),
                "credit_balance": Decimal("2000.00"),
                "total_spend": Decimal("38000.00"),
                "notes": "Online orders",
            },
            {
                "name": "Chamara Silva",
                "phone": "+94770000006",
                "tags": ["Regular"],
                "birthday": None,
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
            {
                "name": "Ruwan Bandara",
                "phone": "+94770000007",
                "tags": ["Wholesale"],
                "birthday": datetime.date(1978, 2, 28),
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
            {
                "name": "Sanduni Gunawardena",
                "phone": "+94770000008",
                "tags": ["VIP"],
                "birthday": datetime.date(1998, 9, 3),
                "credit_balance": Decimal("750.00"),
                "total_spend": Decimal("28000.00"),
                "notes": "",
            },
            {
                "name": "Tharindu Wickramasinghe",
                "phone": "+94770000009",
                "tags": ["Regular"],
                "birthday": datetime.date(1988, 12, 25),
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
            {
                "name": "Ishani Mendis",
                "phone": "+94770000010",
                "tags": ["Staff"],
                "birthday": datetime.date(1993, 4, 18),
                "credit_balance": Decimal("0.00"),
                "total_spend": Decimal("0.00"),
                "notes": "",
            },
        ]

        for c in customers_data:
            Customer.objects.create(
                tenant=demo_tenant,
                name=c["name"],
                phone=c["phone"],
                email=None,
                tags=c["tags"],
                birthday=c["birthday"],
                credit_balance=c["credit_balance"],
                total_spend=c["total_spend"],
                notes=c["notes"],
                is_active=True,
            )

        self.stdout.write(f"  Created {len(customers_data)} demo customers.")

        # ── 3 Demo Suppliers ─────────────────────────────────────────────
        suppliers_data = [
            {
                "name": "Colombo Fashion Imports",
                "contact_name": "Ruwan Senanayake",
                "phone": "+94112000001",
                "whatsapp_number": "+94770100001",
                "lead_time_days": 14,
                "email": "contact@colombo-fashion-imports.lk",
            },
            {
                "name": "Lanka Textile Mills",
                "contact_name": "Nirosha Wickrama",
                "phone": "+94112000002",
                "whatsapp_number": "+94770100002",
                "lead_time_days": 7,
                "email": "contact@lanka-textile-mills.lk",
            },
            {
                "name": "FabricCo Wholesale",
                "contact_name": "Saman Rathnayake",
                "phone": "+94112000003",
                "whatsapp_number": "+94770100003",
                "lead_time_days": 10,
                "email": "contact@fabricco-wholesale.lk",
            },
        ]

        created_suppliers = 0
        for s in suppliers_data:
            if not Supplier.objects.filter(tenant=demo_tenant, name=s["name"]).exists():
                Supplier.objects.create(
                    tenant=demo_tenant,
                    name=s["name"],
                    contact_name=s["contact_name"],
                    phone=s["phone"],
                    whatsapp_number=s["whatsapp_number"],
                    lead_time_days=s["lead_time_days"],
                    email=s["email"],
                    address="",
                    notes="",
                    is_active=True,
                )
                created_suppliers += 1

        self.stdout.write(f"  Created {created_suppliers} demo suppliers.")

        # ── Fetch variants for POs ───────────────────────────────────────
        variants = list(ProductVariant.objects.filter(product__tenant=demo_tenant)[:2])
        if len(variants) < 2:
            self.stdout.write(
                self.style.WARNING("Not enough product variants found — skipping PO seed.")
            )
            return

        supplier_ltm = Supplier.objects.get(tenant=demo_tenant, name="Lanka Textile Mills")
        supplier_cfi = Supplier.objects.get(tenant=demo_tenant, name="Colombo Fashion Imports")
        admin_user = CustomUser.objects.filter(tenant=demo_tenant, role="ADMIN").first()

        # ── RECEIVED PO ──────────────────────────────────────────────────
        if not PurchaseOrder.objects.filter(tenant=demo_tenant, notes="Demo PO — Received (seed)").exists():
            po_received = PurchaseOrder.objects.create(
                tenant=demo_tenant,
                supplier=supplier_ltm,
                created_by=admin_user,
                status=POStatus.RECEIVED,
                expected_delivery_date=datetime.date.today(),
                notes="Demo PO — Received (seed)",
                total_amount=Decimal("35000.00"),
            )
            PurchaseOrderLine.objects.create(
                purchase_order=po_received,
                variant=variants[0],
                product_name_snapshot=variants[0].product.name,
                variant_description_snapshot=variants[0].description or "",
                ordered_qty=20,
                expected_cost_price=Decimal("850.00"),
                received_qty=20,
                actual_cost_price=Decimal("840.00"),
                is_fully_received=True,
            )
            PurchaseOrderLine.objects.create(
                purchase_order=po_received,
                variant=variants[1],
                product_name_snapshot=variants[1].product.name,
                variant_description_snapshot=variants[1].description or "",
                ordered_qty=15,
                expected_cost_price=Decimal("1200.00"),
                received_qty=15,
                actual_cost_price=Decimal("1200.00"),
                is_fully_received=True,
            )
            # Seed only — direct stock increment bypasses adjust_stock intentionally.
            # Production code must always call adjust_stock from inventory_service.py.
            ProductVariant.objects.filter(id=variants[0].id).update(
                stock_quantity=F("stock_quantity") + 20
            )
            ProductVariant.objects.filter(id=variants[1].id).update(
                stock_quantity=F("stock_quantity") + 15
            )
            self.stdout.write("  Created RECEIVED demo purchase order.")

        # ── DRAFT PO ─────────────────────────────────────────────────────
        if not PurchaseOrder.objects.filter(tenant=demo_tenant, notes="Demo PO — Draft (seed)").exists():
            po_draft = PurchaseOrder.objects.create(
                tenant=demo_tenant,
                supplier=supplier_cfi,
                created_by=admin_user,
                status=POStatus.DRAFT,
                expected_delivery_date=datetime.date.today() + datetime.timedelta(days=21),
                notes="Demo PO — Draft (seed)",
                total_amount=Decimal("40500.00"),
            )
            PurchaseOrderLine.objects.create(
                purchase_order=po_draft,
                variant=variants[0],
                product_name_snapshot=variants[0].product.name,
                variant_description_snapshot=variants[0].description or "",
                ordered_qty=25,
                expected_cost_price=Decimal("750.00"),
                received_qty=0,
                is_fully_received=False,
            )
            PurchaseOrderLine.objects.create(
                purchase_order=po_draft,
                variant=variants[1],
                product_name_snapshot=variants[1].product.name,
                variant_description_snapshot=variants[1].description or "",
                ordered_qty=18,
                expected_cost_price=Decimal("1025.00"),
                received_qty=0,
                is_fully_received=False,
            )
            self.stdout.write("  Created DRAFT demo purchase order.")

        # ── CustomerBroadcast ────────────────────────────────────────────
        if not CustomerBroadcast.objects.filter(
            tenant=demo_tenant, message__icontains="End of Season Sale"
        ).exists():
            broadcast = CustomerBroadcast.objects.create(
                tenant=demo_tenant,
                sent_by=admin_user,
                message=(
                    "Dear Valued Customer, our End of Season Sale is here! "
                    "Visit us this weekend for up to 40% off selected items. "
                    "Thank you for shopping with us!"
                ),
                filters={"tag": "VIP"},
                recipient_count=8,
            )
            # sent_at has auto_now_add=True — update to a past date for demo realism
            CustomerBroadcast.objects.filter(id=broadcast.id).update(
                sent_at=timezone.now() - datetime.timedelta(days=7)
            )
            self.stdout.write("  Created demo broadcast record.")

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded demo CRM data: 10 customers, 3 suppliers, "
                "2 purchase orders (1 RECEIVED + 1 DRAFT), 1 broadcast record."
            )
        )
