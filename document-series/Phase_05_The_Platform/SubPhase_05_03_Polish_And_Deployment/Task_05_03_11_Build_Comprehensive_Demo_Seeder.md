# Task 05.03.11 — Build Comprehensive Demo Seeder

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.03.11 |
| SubPhase | 05.03 — Production Deployment and Polish |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | All Django models finalized across all apps |
| Produces | `backend/apps/accounts/management/commands/seed_demo_comprehensive.py` |
| Blocked By | All prior tasks |

---

## Objective

Extend the seed data management command to generate a rich 90-day dataset of realistic LankaCommerce demo data, sized to populate all Phase 05 reports, commission charts, and analytics dashboards with meaningful, visually convincing output. The dataset is tailored to a Sri Lankan clothing boutique context: product names, price ranges expressed in LKR, and customer name patterns consistent with Sri Lankan demographics. The seeder runs idempotently — it skips all seed operations if the target demo tenant already has more than 100 sale records.

---

## Instructions

### Step 1: Implement the Idempotency Guard

At the beginning of the seed function's demo data block, query `Sale.objects.filter(tenant__slug='lanka-demo').count()`. If the count exceeds 100, log "Demo data already seeded — skipping. Delete demo sales to re-seed." and return early. The guard threshold is 100 rather than 0 to allow a partially seeded database to be completed by re-running the seed.

### Step 2: Create the Demo Tenant

Use `Tenant.objects.update_or_create(slug='lanka-demo', defaults={'name': 'Lanka Boutique (Demo)', 'subscription_status': 'ACTIVE'})`. Store the resulting tenant's id.

### Step 3: Create Staff Users

Create five staff members using `User.objects.create` with `make_password` for PIN hashing. Users: Kavindi Perera (email owner@lankademo.com, role OWNER, PIN 1111), Chamara Bandara (manager@lankademo.com, MANAGER, PIN 2222), Dilani Senanayake (cashier1@lankademo.com, CASHIER, PIN 3333), Ruwani Fernando (cashier2@lankademo.com, CASHIER, PIN 4444), Asela Wickramasinghe (stock@lankademo.com, STOCK_CLERK, PIN 5555). Use `update_or_create` on email for idempotency.

### Step 4: Create Product Catalogue

Create 30 products across 5 categories using `Product.objects.bulk_create`. Categories: Sarees (6 products, LKR 3,500–22,000), Kurtis and Tops (8 products, LKR 1,800–6,500), Trousers and Palazzo (5 products, LKR 2,200–5,500), Dresses (7 products, LKR 3,200–18,000), Accessories (4 products, LKR 1,500–4,500). For each product, create 2–4 variants with `ProductVariant.objects.bulk_create` using Size (XS, S, M, L, XL) and Colour (Ivory, Dusty Rose, Forest Green, Midnight Blue, Terracotta, Charcoal) axes. Assign `stock_quantity` between 8 and 40. SKU format: `DEMO-[INDEX]-[VARIANT_INDEX]`.

### Step 5: Create Demo Customers

Create 10 customer records using `Customer.objects.bulk_create` with Sri Lankan names and phone numbers: Amali Jayasuriya (0771234001), Priya Navaratnarajah (0772234002), Nimesha Dissanayake (0773234003), Sanduni Rathnayake (0774234004), Hiruni Wickramasinghe (0775234005), Thilini Perera (0776234006), Chamali Gunaratne (0777234007), Rasika Fernando (0778234008), Sumudu Karunaratne (0779234009), Dinusha Silva (0710234010). Assign each a birthdate spread across the year.

### Step 6: Generate 1,000+ Sales Across 90 Days

Iterate over 90 days from today minus 90 days to yesterday. For each day, compute sales count: 8–15 on weekdays, 18–28 on Fridays and Saturdays, 5–10 on Sundays. Use a deterministic pseudo-random generator seeded per day. For each sale: select random cashier from the two CASHIER users; assign customer to 40% of sales; select 1–4 line items from random variants; set sale time between 09:00 and 19:00. Batch inserts using `Sale.objects.bulk_create` and `SaleLine.objects.bulk_create` in batches of 100.

### Step 7: Generate Demo Returns

Select approximately 8% of sales (~80 records) to become return transactions. For each selected sale, create a `Return` record with reason drawn from: "Size issue", "Colour mismatch", "Customer changed mind", "Defective item". Set return date 1–5 days after original sale. Set `refund_amount` to full sale total.

### Step 8: Generate Supplier Records and Purchase Orders

Create 5 suppliers: Jayasinghe Textiles (Colombo), Kandy Silk House (Kandy), Lanka Threads Pvt Ltd (Negombo), Oriental Fabrics (Colombo), Batik Crafts Direct (Matara). For each supplier, create 2–3 PurchaseOrder records across the 90-day window with status alternating between RECEIVED and PENDING. Each PO has 3–6 line items.

### Step 9: Generate Expense Records

Create 12–15 expense records across the 90-day window: Packaging Materials (LKR 5,000–12,000), Display Mannequin Repair (LKR 3,500), Air Conditioning Service (LKR 8,000), Staff Uniform (LKR 15,000), WhatsApp Business Subscription (LKR 1,200), Electricity Bill (LKR 18,000–25,000 monthly), Shop Rent (LKR 85,000 monthly), Tailor Alteration Service (recurring weekly at LKR 2,000–6,000).

### Step 10: Generate Commission Records

For each of the 3 months, create a `CommissionRecord` for each CASHIER user. Commission rate is 1.5% of total sales amount handled by the cashier during the month. Compute by summing sale totals where `cashier_id` matches and sale date falls within the month. Use `CommissionRecord.objects.bulk_create`.

### Step 11: Generate Time-Clock Entries

For all five staff members, create daily `TimeClock` entries for the 90-day window. Weekday shifts: OWNER and MANAGER clock in 08:30–09:15 and out 17:30–18:30. CASHIER users clock in 09:00–09:30 and out 17:00–18:00. STOCK_CLERK works Tuesday, Thursday, and Saturday only. Omit 5–8 random days per staff member to simulate leave. Use `TimeClock.objects.bulk_create` in batches.

### Step 12: Log Completion Statistics

At the end, log a summary: number of products, variants, customers, sales, returns, suppliers, purchase orders, expenses, commission records, and time-clock entries. Also log total elapsed time in seconds.

---

## Expected Output

- `backend/apps/accounts/management/commands/seed_demo_comprehensive.py` — Extended with all 12 seeding steps producing 1,000+ sales across 90 days.
- The seeder runs successfully on a clean demo database in under 60 seconds.
- Subsequent runs on an already-seeded database complete in under 2 seconds with the idempotency guard message.

---

## Validation

- `poetry run python manage.py seed_demo_comprehensive` completes without errors on a clean demo database.
- The idempotency guard prevents double-seeding: running the command twice produces identical record counts.
- Revenue report for the trailing 90-day period shows data in all chart intervals (no empty weeks).
- Commission report shows non-zero commission values for both CASHIER users.
- Staff time-clock report shows attendance for all five users with realistic hours distribution.
- The demo tenant's customer count is exactly 10 and product count is exactly 30.
- Seed completion log shows total runtime under 60 seconds.
- Sales higher on Friday and Saturday than midweek — verifiable in the weekly breakdown report chart.

---

## Notes

Use `bulk_create` with `ignore_conflicts=True` wherever unique constraint violations are possible on seed reruns. The batch size of 100 records per `bulk_create` call is conservative and safe for most PostgreSQL configurations. All LKR amounts should be stored using Python `Decimal` values, consistent with the pattern used throughout the application's service layer. The deterministic pseudo-random generator ensures the same seeder run always produces the same data distribution.
