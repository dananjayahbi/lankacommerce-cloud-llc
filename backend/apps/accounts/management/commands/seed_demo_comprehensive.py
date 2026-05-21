"""
Management command: seed_demo_comprehensive

Generates a rich 90-day dataset for a Sri Lankan clothing boutique demo tenant.
Idempotent — skips all seeding if the demo tenant already has more than 100 sales.

Usage:
    python manage.py seed_demo_comprehensive
"""

from __future__ import annotations

import random
import time
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed comprehensive demo data for the Lanka Boutique demo tenant."

    def handle(self, *args, **options) -> None:
        from apps.accounts.models import CustomUser as User, UserRole
        from apps.catalog.models import Category, Product, ProductVariant
        from apps.crm.models import Customer, POStatus, PurchaseOrder, PurchaseOrderLine, Supplier
        from apps.hr.models import CommissionRecord, TimeClock
        from apps.pos.models import (
            Expense,
            ExpenseCategory,
            Return,
            ReturnRefundMethod,
            ReturnStatus,
            Sale,
            SaleLine,
            Shift,
            ShiftStatus,
            SaleStatus,
        )
        from apps.tenants.models import Tenant

        start = time.time()

        # ── Step 1: Idempotency guard ──────────────────────────────────
        # We need the tenant to check, so try to get it first
        demo_tenant_qs = Tenant.objects.filter(slug="lanka-demo")
        if demo_tenant_qs.exists():
            demo_tenant_id = str(demo_tenant_qs.first().id)
            if Sale.objects.filter(tenant_id=demo_tenant_id).count() > 100:
                self.stdout.write(
                    "Demo data already seeded — skipping. Delete demo sales to re-seed."
                )
                return

        # ── Step 2: Demo tenant ────────────────────────────────────────
        tenant, _ = Tenant.objects.update_or_create(
            slug="lanka-demo",
            defaults={
                "name": "Lanka Boutique (Demo)",
                "subscription_status": "ACTIVE",
            },
        )
        self.stdout.write(f"Tenant: {tenant.name} (id={tenant.id})")

        # ── Step 3: Staff users ────────────────────────────────────────
        staff_data = [
            ("Kavindi", "Perera", "owner@lankademo.com", UserRole.OWNER, "1111", Decimal("1.50")),
            ("Chamara", "Bandara", "manager@lankademo.com", UserRole.MANAGER, "2222", Decimal("1.50")),
            ("Dilani", "Senanayake", "cashier1@lankademo.com", UserRole.CASHIER, "3333", Decimal("1.50")),
            ("Ruwani", "Fernando", "cashier2@lankademo.com", UserRole.CASHIER, "4444", Decimal("1.50")),
            ("Asela", "Wickramasinghe", "stock@lankademo.com", UserRole.STOCK_CLERK, "5555", None),
        ]
        staff_users: dict[str, User] = {}
        for first, last, email, role, pin, commission in staff_data:
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "tenant": tenant,
                    "pin_hash": make_password(pin),
                    "commission_rate": commission,
                    "is_active": True,
                },
            )
            staff_users[email] = user
        self.stdout.write(f"Staff created: {len(staff_users)}")

        owner_user = staff_users["owner@lankademo.com"]
        manager_user = staff_users["manager@lankademo.com"]
        cashier1 = staff_users["cashier1@lankademo.com"]
        cashier2 = staff_users["cashier2@lankademo.com"]
        stock_user = staff_users["stock@lankademo.com"]
        cashiers = [cashier1, cashier2]

        # ── Step 4: Product catalogue ──────────────────────────────────
        COLOURS = ["Ivory", "Dusty Rose", "Forest Green", "Midnight Blue", "Terracotta", "Charcoal"]
        SIZES = ["XS", "S", "M", "L", "XL"]

        category_products = [
            ("Sarees", [
                ("Handloom Cotton Saree", Decimal("3500"), Decimal("5250")),
                ("Silk Batik Saree", Decimal("12000"), Decimal("18000")),
                ("Georgette Party Saree", Decimal("8500"), Decimal("12750")),
                ("Daily Wear Saree", Decimal("3500"), Decimal("5250")),
                ("Designer Silk Saree", Decimal("14500"), Decimal("22000")),
                ("Casual Cotton Saree", Decimal("4000"), Decimal("6000")),
            ]),
            ("Kurtis and Tops", [
                ("Embroidered Kurti", Decimal("1800"), Decimal("2700")),
                ("Casual Cotton Top", Decimal("1800"), Decimal("2700")),
                ("Block Print Kurti", Decimal("2500"), Decimal("3750")),
                ("Floral Chiffon Top", Decimal("2200"), Decimal("3300")),
                ("Straight Fit Kurti", Decimal("3000"), Decimal("4500")),
                ("A-Line Tunic", Decimal("2800"), Decimal("4200")),
                ("Linen Short Kurti", Decimal("2200"), Decimal("3300")),
                ("Designer Party Top", Decimal("4200"), Decimal("6500")),
            ]),
            ("Trousers and Palazzo", [
                ("Wide Leg Palazzo", Decimal("2200"), Decimal("3300")),
                ("Cotton Straight Trouser", Decimal("2500"), Decimal("3750")),
                ("Printed Palazzo", Decimal("2800"), Decimal("4200")),
                ("Formal Trouser", Decimal("3500"), Decimal("5500")),
                ("Casual Jogger", Decimal("2200"), Decimal("3300")),
            ]),
            ("Dresses", [
                ("Casual Day Dress", Decimal("3200"), Decimal("4800")),
                ("Wrap Midi Dress", Decimal("4500"), Decimal("6750")),
                ("Floral Maxi Dress", Decimal("5500"), Decimal("8250")),
                ("Bodycon Party Dress", Decimal("5000"), Decimal("7500")),
                ("Shirt Dress", Decimal("3500"), Decimal("5250")),
                ("Evening Gown", Decimal("12000"), Decimal("18000")),
                ("Sundress", Decimal("3200"), Decimal("4800")),
            ]),
            ("Accessories", [
                ("Silk Scarf", Decimal("1500"), Decimal("2250")),
                ("Beaded Clutch Bag", Decimal("2500"), Decimal("4000")),
                ("Embroidered Belt", Decimal("1800"), Decimal("3000")),
                ("Fabric Headband", Decimal("1500"), Decimal("2250")),
            ]),
        ]

        all_variants: list[ProductVariant] = []
        rng = random.Random(42)

        for cat_name, products in category_products:
            cat, _ = Category.objects.update_or_create(
                tenant=tenant,
                name=cat_name,
                defaults={"description": f"Demo {cat_name}"},
            )
            for p_idx, (p_name, cost, retail) in enumerate(products):
                product, _ = Product.objects.update_or_create(
                    tenant=tenant,
                    name=p_name,
                    defaults={
                        "category": cat,
                        "description": f"Demo product: {p_name}",
                    },
                )
                # 2-4 variants per product
                n_variants = rng.randint(2, 4)
                for v_idx in range(n_variants):
                    size = SIZES[v_idx % len(SIZES)]
                    colour = COLOURS[v_idx % len(COLOURS)]
                    sku = f"DEMO-{p_name[:6].upper().replace(' ', '')}-{v_idx}"
                    variant, _ = ProductVariant.objects.update_or_create(
                        tenant=tenant,
                        sku=sku,
                        defaults={
                            "product": product,
                            "size": size,
                            "colour": colour,
                            "cost_price": cost,
                            "retail_price": retail,
                            "stock_quantity": rng.randint(8, 40),
                            "low_stock_threshold": 5,
                        },
                    )
                    all_variants.append(variant)

        self.stdout.write(f"Products and variants created: {len(all_variants)} variants")

        # ── Step 5: Customers ──────────────────────────────────────────
        customer_data = [
            ("Amali Jayasuriya", "0771234001", "1990-03-15"),
            ("Priya Navaratnarajah", "0772234002", "1985-07-22"),
            ("Nimesha Dissanayake", "0773234003", "1992-11-08"),
            ("Sanduni Rathnayake", "0774234004", "1988-04-30"),
            ("Hiruni Wickramasinghe", "0775234005", "1995-01-17"),
            ("Thilini Perera", "0776234006", "1991-09-05"),
            ("Chamali Gunaratne", "0777234007", "1987-12-25"),
            ("Rasika Fernando", "0778234008", "1993-06-14"),
            ("Sumudu Karunaratne", "0779234009", "1989-08-03"),
            ("Dinusha Silva", "0710234010", "1994-02-19"),
        ]
        customers: list[Customer] = []
        for name, phone, bday in customer_data:
            cust, _ = Customer.objects.update_or_create(
                tenant=tenant,
                phone=phone,
                defaults={
                    "name": name,
                    "birthday": date.fromisoformat(bday),
                    "is_active": True,
                },
            )
            customers.append(cust)
        self.stdout.write(f"Customers: {len(customers)}")

        # ── Step 6: Sales across 90 days ──────────────────────────────
        today = date.today()
        start_date = today - timedelta(days=90)

        created_sales: list[Sale] = []
        created_sale_lines: list[SaleLine] = []
        PAYMENT_METHODS = ["CARD", "CASH", "TRANSFER"]

        for day_offset in range(90):
            day = start_date + timedelta(days=day_offset)
            weekday = day.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun

            day_rng = random.Random(day.toordinal())

            if weekday == 6:  # Sunday
                n_sales = day_rng.randint(5, 10)
            elif weekday in (4, 5):  # Fri/Sat
                n_sales = day_rng.randint(18, 28)
            else:
                n_sales = day_rng.randint(8, 15)

            for sale_idx in range(n_sales):
                cashier = cashiers[sale_idx % 2]

                # Create a shift for this sale
                shift_hour = day_rng.randint(9, 18)
                shift_dt = datetime(
                    day.year, day.month, day.day, shift_hour,
                    day_rng.randint(0, 59), tzinfo=timezone.UTC
                )

                shift = Shift.objects.create(
                    tenant_id=str(tenant.id),
                    cashier=cashier,
                    status=ShiftStatus.CLOSED,
                    opened_at=shift_dt,
                    closed_at=shift_dt + timedelta(hours=8),
                    opening_float=Decimal("5000.00"),
                )

                # 40% chance of having a customer
                customer = customers[day_rng.randint(0, len(customers) - 1)] if day_rng.random() < 0.4 else None

                # 1-4 line items
                n_items = day_rng.randint(1, 4)
                selected_variants = day_rng.choices(all_variants, k=n_items)

                subtotal = Decimal("0.00")
                sale_lines_data = []
                for variant in selected_variants:
                    qty = day_rng.randint(1, 3)
                    line_total = variant.retail_price * qty
                    subtotal += line_total
                    sale_lines_data.append((variant, qty, line_total))

                tax_amount = (subtotal * Decimal("0.00")).quantize(Decimal("0.01"))
                total_amount = subtotal + tax_amount
                payment_method = day_rng.choice(PAYMENT_METHODS)

                sale_time = datetime(
                    day.year, day.month, day.day,
                    day_rng.randint(9, 18), day_rng.randint(0, 59),
                    tzinfo=timezone.UTC
                )

                sale = Sale(
                    tenant_id=str(tenant.id),
                    shift=shift,
                    cashier=cashier,
                    customer=customer,
                    subtotal=subtotal,
                    discount_amount=Decimal("0.00"),
                    tax_amount=tax_amount,
                    total_amount=total_amount,
                    payment_method=payment_method,
                    status=SaleStatus.COMPLETED,
                    completed_at=sale_time,
                    created_at=sale_time,
                )
                created_sales.append(sale)
                for variant, qty, line_total in sale_lines_data:
                    created_sale_lines.append(SaleLine(
                        sale=sale,
                        variant=variant,
                        product_name_snapshot=variant.product.name,
                        variant_description_snapshot=f"{variant.size} / {variant.colour}",
                        sku=variant.sku,
                        unit_price=variant.retail_price,
                        quantity=qty,
                        discount_percent=Decimal("0.00"),
                        discount_amount=Decimal("0.00"),
                        line_total_before_discount=line_total,
                        line_total_after_discount=line_total,
                    ))

        # Bulk insert in batches of 100
        BATCH = 100
        for i in range(0, len(created_sales), BATCH):
            Sale.objects.bulk_create(created_sales[i:i + BATCH], ignore_conflicts=True)

        # Re-fetch saved sales to get real PKs for SaleLine FK
        db_sales = list(Sale.objects.filter(tenant_id=str(tenant.id)).order_by("completed_at"))

        self.stdout.write(f"Sales created: {len(db_sales)}")

        # ── Step 7: Returns (~8% of sales) ────────────────────────────
        return_reasons = [
            "Size issue",
            "Colour mismatch",
            "Customer changed mind",
            "Defective item",
        ]
        n_returns = max(1, int(len(db_sales) * 0.08))
        return_rng = random.Random(99)
        return_sales = return_rng.sample(db_sales, min(n_returns, len(db_sales)))

        created_returns: list[Return] = []
        for sale in return_sales:
            days_after = return_rng.randint(1, 5)
            return_date = (sale.completed_at or timezone.now()) + timedelta(days=days_after)
            created_returns.append(Return(
                tenant=tenant,
                original_sale=sale,
                initiated_by=cashier1,
                reason=return_rng.choice(return_reasons),
                refund_method=ReturnRefundMethod.CASH,
                refund_amount=sale.total_amount,
                status=ReturnStatus.COMPLETED,
                created_at=return_date,
            ))
        for i in range(0, len(created_returns), BATCH):
            Return.objects.bulk_create(created_returns[i:i + BATCH], ignore_conflicts=True)
        self.stdout.write(f"Returns: {len(created_returns)}")

        # ── Step 8: Suppliers and Purchase Orders ──────────────────────
        supplier_data = [
            ("Jayasinghe Textiles", "Colombo", "0112345678"),
            ("Kandy Silk House", "Kandy", "0812345678"),
            ("Lanka Threads Pvt Ltd", "Negombo", "0312345678"),
            ("Oriental Fabrics", "Colombo", "0114567890"),
            ("Batik Crafts Direct", "Matara", "0412345678"),
        ]
        suppliers: list[Supplier] = []
        for s_name, s_city, s_phone in supplier_data:
            sup, _ = Supplier.objects.update_or_create(
                tenant=tenant,
                name=s_name,
                defaults={
                    "contact_name": f"Contact at {s_name}",
                    "phone": s_phone,
                    "address": s_city,
                    "is_active": True,
                },
            )
            suppliers.append(sup)

        po_rng = random.Random(7)
        created_pos: list[PurchaseOrder] = []
        created_po_lines: list[PurchaseOrderLine] = []

        for sup in suppliers:
            n_pos = po_rng.randint(2, 3)
            for po_idx in range(n_pos):
                days_ago = po_rng.randint(5, 85)
                po_date = today - timedelta(days=days_ago)
                status = POStatus.RECEIVED if po_idx == 0 else POStatus.DRAFT
                po_total = Decimal("0.00")
                po = PurchaseOrder(
                    tenant=tenant,
                    supplier=sup,
                    created_by=owner_user,
                    expected_delivery_date=po_date + timedelta(days=sup.lead_time_days),
                    status=status,
                    notes=f"Demo PO #{po_idx + 1} for {sup.name}",
                    total_amount=Decimal("0.00"),
                )
                created_pos.append(po)

                n_lines = po_rng.randint(3, 6)
                for variant in po_rng.sample(all_variants, n_lines):
                    qty = po_rng.randint(10, 50)
                    cost = variant.cost_price
                    po_total += cost * qty
                    created_po_lines.append(PurchaseOrderLine(
                        purchase_order=po,
                        variant=variant,
                        product_name_snapshot=variant.product.name,
                        variant_description_snapshot=f"{variant.size} / {variant.colour}",
                        ordered_qty=qty,
                        expected_cost_price=cost,
                        received_qty=qty if status == POStatus.RECEIVED else 0,
                        is_fully_received=(status == POStatus.RECEIVED),
                    ))
                po.total_amount = po_total

        for po in created_pos:
            po.save()
        for i in range(0, len(created_po_lines), BATCH):
            PurchaseOrderLine.objects.bulk_create(created_po_lines[i:i + BATCH], ignore_conflicts=True)
        self.stdout.write(f"POs: {len(created_pos)}, PO lines: {len(created_po_lines)}")

        # ── Step 9: Expenses ──────────────────────────────────────────
        expense_rng = random.Random(13)
        expense_entries = []
        # Monthly: Rent, Electricity
        for month_offset in range(3):
            exp_date = today.replace(day=1) - timedelta(days=30 * month_offset)
            expense_entries.append((ExpenseCategory.RENT, Decimal("85000.00"), exp_date, "Monthly shop rent"))
            elec_amt = Decimal(str(expense_rng.randint(18000, 25000)))
            expense_entries.append((ExpenseCategory.UTILITIES, elec_amt, exp_date, "Electricity bill"))

        # One-off expenses
        expense_entries += [
            (ExpenseCategory.MAINTENANCE, Decimal("3500.00"), today - timedelta(days=45), "Display mannequin repair"),
            (ExpenseCategory.MAINTENANCE, Decimal("8000.00"), today - timedelta(days=32), "Air conditioning service"),
            (ExpenseCategory.MISCELLANEOUS, Decimal("15000.00"), today - timedelta(days=20), "Staff uniform purchase"),
            (ExpenseCategory.MISCELLANEOUS, Decimal("1200.00"), today - timedelta(days=10), "WhatsApp Business Subscription"),
        ]
        # Weekly tailor alteration (every 7 days for 12 weeks)
        for week in range(12):
            week_date = today - timedelta(days=7 * week)
            if start_date <= week_date <= today:
                amt = Decimal(str(expense_rng.randint(2000, 6000)))
                expense_entries.append((ExpenseCategory.MISCELLANEOUS, amt, week_date, "Tailor alteration service"))

        # Also packaging
        expense_entries.append((ExpenseCategory.MISCELLANEOUS, Decimal("9500.00"), today - timedelta(days=60), "Packaging materials"))

        expense_objs = [
            Expense(
                tenant=tenant,
                category=cat,
                amount=amt,
                description=desc,
                expense_date=exp_date,
                recorded_by=owner_user,
            )
            for cat, amt, exp_date, desc in expense_entries
        ]
        Expense.objects.bulk_create(expense_objs, ignore_conflicts=True)
        self.stdout.write(f"Expenses: {len(expense_objs)}")

        # ── Step 10: Commission records ───────────────────────────────
        commission_records: list[CommissionRecord] = []
        for cashier in cashiers:
            rate = cashier.commission_rate or Decimal("1.5")
            cashier_sales = [s for s in db_sales if s.cashier_id == cashier.id]
            for sale in cashier_sales:
                earned = (sale.total_amount * rate / Decimal("100")).quantize(Decimal("0.01"))
                commission_records.append(CommissionRecord(
                    tenant=tenant,
                    sale=sale,
                    user=cashier,
                    base_amount=sale.total_amount,
                    commission_rate=rate,
                    earned_amount=earned,
                    is_paid=False,
                ))

        for i in range(0, len(commission_records), BATCH):
            CommissionRecord.objects.bulk_create(commission_records[i:i + BATCH], ignore_conflicts=True)
        self.stdout.write(f"Commission records: {len(commission_records)}")

        # ── Step 11: Time-clock entries ───────────────────────────────
        tc_rng = random.Random(55)
        time_clocks: list[TimeClock] = []

        # 5-8 random leave days per staff
        leave_days_map: dict[str, set[date]] = {}
        for email, user in staff_users.items():
            n_leave = tc_rng.randint(5, 8)
            leave_days_map[email] = set(
                start_date + timedelta(days=tc_rng.randint(0, 89))
                for _ in range(n_leave)
            )

        for day_offset in range(90):
            day = start_date + timedelta(days=day_offset)
            weekday = day.weekday()

            for email, user in staff_users.items():
                if day in leave_days_map[email]:
                    continue

                # STOCK_CLERK only Tue(1), Thu(3), Sat(5)
                if user.role == UserRole.STOCK_CLERK and weekday not in (1, 3, 5):
                    continue

                # Clock in/out ranges
                if user.role in (UserRole.OWNER, UserRole.MANAGER):
                    in_h = 8
                    in_m = tc_rng.randint(30, 59)
                    out_h = tc_rng.randint(17, 18)
                    out_m = tc_rng.randint(30, 59)
                else:
                    in_h = 9
                    in_m = tc_rng.randint(0, 30)
                    out_h = tc_rng.randint(17, 18)
                    out_m = tc_rng.randint(0, 59)

                clocked_in = datetime(day.year, day.month, day.day, in_h, in_m, tzinfo=timezone.UTC)
                clocked_out = datetime(day.year, day.month, day.day, out_h, out_m, tzinfo=timezone.UTC)

                time_clocks.append(TimeClock(
                    tenant=tenant,
                    user=user,
                    clocked_in_at=clocked_in,
                    clocked_out_at=clocked_out,
                ))

        for i in range(0, len(time_clocks), BATCH):
            TimeClock.objects.bulk_create(time_clocks[i:i + BATCH], ignore_conflicts=True)
        self.stdout.write(f"Time-clock entries: {len(time_clocks)}")

        # ── Step 12: Summary ──────────────────────────────────────────
        elapsed = round(time.time() - start, 2)
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'=' * 50}\n"
                f"Demo seeder complete in {elapsed}s\n"
                f"  Variants:          {len(all_variants)}\n"
                f"  Customers:         {len(customers)}\n"
                f"  Sales:             {len(db_sales)}\n"
                f"  Returns:           {len(created_returns)}\n"
                f"  Suppliers:         {len(suppliers)}\n"
                f"  Purchase Orders:   {len(created_pos)}\n"
                f"  PO Lines:          {len(created_po_lines)}\n"
                f"  Expenses:          {len(expense_objs)}\n"
                f"  Commission records:{len(commission_records)}\n"
                f"  Time-clock entries:{len(time_clocks)}\n"
                f"{'=' * 50}"
            )
        )
