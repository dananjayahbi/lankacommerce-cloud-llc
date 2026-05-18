# Task 02.01.12 — Seed Sample Product Catalog

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Low |
| Dependencies | Tasks 02.01.01–02.01.05 (all catalog models), Task 01.03.XX (Tenant model, development tenant) |

---

## Objective

This task creates a Django management command that populates the development database with a representative sample product catalog. The seeded dataset includes five categories, four brands, thirty products, and multiple variants per product, giving the full development team realistic data to work with when building and testing the POS terminal, inventory reports, and catalog UI. The command is fully idempotent — running it multiple times against a database that already contains seed data does nothing and exits cleanly.

---

## Instructions

### Step 1: Create the Management Command Directory Structure

Inside `backend/apps/catalog/`, create the directory path `management/commands/`. Both `management/` and `management/commands/` must each contain an `__init__.py` file for Python to treat them as packages and for Django to discover the commands within them. Create the main command file at `backend/apps/catalog/management/commands/seed_catalog.py`.

### Step 2: Define the Management Command Class

Open `seed_catalog.py`. Import `BaseCommand` from `django.core.management.base`. Import `transaction` from `django.db`. Import `Decimal` from the standard `decimal` module for pricing calculations. Import the `Tenant` model from `apps.accounts.models`. Import all relevant catalog models from `apps.catalog.models`: `Category`, `Brand`, `Product`, `GenderType`, `TaxRule`, `ProductVariant`.

Define a `Command` class inheriting from `BaseCommand`. Set the `help` attribute to a descriptive string such as `"Seed the development database with a representative sample product catalog."`. Implement the public `handle(self, *args, **options)` method, which will contain all seeding logic.

### Step 3: Implement the Idempotency Check

At the very start of the `handle` method, locate the development tenant by querying for a `Tenant` record with `subdomain='dev'`. Call `.first()` on the query. If the result is `None`, use `self.stderr.write(self.style.ERROR("No development tenant found with subdomain='dev'. Run the tenant seed first."))` and return immediately.

Next, perform the idempotency check by querying `Category.objects.filter(name="Men's Shirts", tenant=dev_tenant).exists()`. If this returns `True`, write an informational message using `self.stdout.write(self.style.WARNING("Catalog seed data already exists. Skipping."))` and return immediately without making any database changes. The first category in the seed dataset serves as the sentinel value for the idempotency guard.

### Step 4: Define the Sample Category Data

Define the five seed categories as a Python list of dictionaries. Each dictionary has a `name`, an optional `description`, and a `sort_order` integer. The five categories are:

1. **Men's Shirts** (sort_order=1) — formal, casual, and polo shirts for men
2. **Women's Blouses** (sort_order=2) — light-fabric tops and blouses for women
3. **Kids' Wear** (sort_order=3) — clothing for children aged 2 to 12
4. **Footwear** (sort_order=4) — shoes, sandals, and boots for all genders
5. **Accessories** (sort_order=5) — bags, belts, hats, and miscellaneous accessories

### Step 5: Define the Sample Brand Data

Define the four seed brands as a Python list of dictionaries, each with a `name` and `logo_url` set to `None`:

1. **SriThread** — a Sri Lanka-origin fashion brand
2. **TropicWear** — a casual and beachwear brand
3. **PearlLine** — a premium retail brand
4. **ActiveStep** — a sportswear and footwear brand

### Step 6: Define the Sample Product Data

Define thirty sample products as a Python list of dictionaries. Each dictionary specifies a `name`, a `description`, a `category_index` (an integer from 0 to 4 that references the categories list by position), a `brand_index` (0 to 3), a `gender` using a `GenderType` value, a `tags` list of keyword strings, and a `tax_rule` using a `TaxRule` value.

Distribute the thirty products across the five categories — six products per category. Assign brands in a round-robin pattern (cycling 0 through 3) across products to ensure all four brands are represented. Use deterministic gender assignments: products in Men's Shirts use `GenderType.MEN`, Women's Blouses use `GenderType.WOMEN`, Kids' Wear uses `GenderType.KIDS`, Footwear and Accessories use `GenderType.UNISEX`. Use `TaxRule.STANDARD_VAT` for all thirty products in the seed dataset.

### Step 7: Implement the Bulk Creation

Wrap all creation logic in a single `transaction.atomic()` context manager so that the entire seed either commits fully or not at all.

**Create categories**: Instantiate five `Category` model objects (without saving) by iterating over the category data list and creating each with `tenant=dev_tenant`, `name`, `description`, and `sort_order` from the dictionary. Use `Category.objects.bulk_create([...])` to insert all five in a single database round-trip. Store the returned list of created instances for use when creating products.

**Create brands**: Follow the same pattern. Instantiate four `Brand` model objects and use `Brand.objects.bulk_create([...])` to insert all four at once. Store the returned instances.

**Create products and variants**: Iterate over the thirty product data dictionaries. For each product, call `Product.objects.create(...)` with the appropriate `tenant`, `category` (looked up from the created categories list by `category_index`), `brand` (from the created brands list by `brand_index`), `name`, `description`, `gender`, `tags`, and `tax_rule`.

After creating each product, generate variant instances based on the product's category:

- For **Men's Shirts** and **Women's Blouses**: generate eight variants by combining sizes S, M, L, and XL with two color options — White and Blue.
- For **Kids' Wear**: generate five variants for the size ranges 2-4Y, 4-6Y, 6-8Y, 8-10Y, and 10-12Y, each in the color Multicolor.
- For **Footwear**: generate eight variants for UK shoe sizes 5 through 12, with a single color of Black.
- For **Accessories**: generate a single variant per product with a `size` of "One Size" and a color of "Assorted".

For each variant, compute pricing deterministically using a formula based on the product's index in the thirty-product list. Set `cost_price` to a `Decimal` value computed as five hundred plus the product index multiplied by one hundred (so product 0 costs 500.00, product 1 costs 600.00, and so on up to product 29 at 3400.00). Set `retail_price` to `cost_price` multiplied by the `Decimal` value `'1.60'` to apply a 60% markup. Set `wholesale_price` to `cost_price` multiplied by `Decimal('1.20')`. Set `stock_quantity` to 50 for every variant. Do not use Python's built-in `float` type at any point in these calculations — use `Decimal` throughout.

Collect all variant instances for each category in a list and insert them with `ProductVariant.objects.bulk_create([...])` after all products in that group are created.

Track the total counts of created categories, brands, products, and variants in local integer variables that are incremented throughout the loop.

### Step 8: Print a Summary

After the `transaction.atomic()` block commits, write a success summary to `self.stdout` using `self.style.SUCCESS(...)` for green terminal output. The summary should display each of the following on its own line:

- The development tenant's subdomain
- The number of categories created
- The number of brands created
- The number of products created
- The total number of variants created
- A final confirmation message such as "Catalog seed complete."

### Step 9: Add a Makefile Target

Open the `Makefile` in the `backend/` directory (create a `Makefile` if one does not yet exist). Add the following target:

Define a target named `seed-catalog`. Its recipe should be `poetry run python manage.py seed_catalog`. This allows developers to seed the catalog with the concise command `make seed-catalog` from the `backend/` directory.

Also add a brief comment above the target explaining its purpose and idempotency behavior.

### Step 10: Update the README

Open `backend/README.md`. Add a section titled "Seeding Development Data" (or add to an existing "Development Setup" section). Document the following information:

- How to run the seed command: `poetry run python manage.py seed_catalog` or the shorthand `make seed-catalog`
- What data is created: five product categories, four brands, thirty products, and their associated variants
- That the command is idempotent: it prints a message and exits without changes if seed data already exists
- That the development tenant with `subdomain='dev'` must exist before running the seed
- The expected summary output format

---

## Expected Output

- `backend/apps/catalog/management/__init__.py` created
- `backend/apps/catalog/management/commands/__init__.py` created
- `backend/apps/catalog/management/commands/seed_catalog.py` created with the full idempotent seed command
- `Makefile` in `backend/` updated with a `seed-catalog` target
- `backend/README.md` updated with seeding instructions
- Running `poetry run python manage.py seed_catalog` on a clean database creates 5 categories, 4 brands, 30 products, and all associated variants

---

## Validation

- [ ] `poetry run python manage.py seed_catalog` runs without errors on a clean development database
- [ ] The command prints a success summary listing the counts of each record type created
- [ ] Running the command a second time prints "Catalog seed data already exists. Skipping." and makes no database changes
- [ ] Django Admin shows all 5 categories, 4 brands, and 30 products after seeding
- [ ] Every seeded product has at least one variant
- [ ] All variant `retail_price` values are greater than or equal to their `cost_price` values
- [ ] All variant `wholesale_price` values are between `cost_price` and `retail_price`
- [ ] All variant `stock_quantity` values are 50
- [ ] No `float` values are used for any monetary field — all prices are `Decimal` instances
- [ ] `make seed-catalog` runs the management command successfully
- [ ] `poetry run python manage.py check` reports no errors before and after seeding

---

## Notes

- The idempotency check uses the first seed category name ("Men's Shirts") as a sentinel. If the category names in the seed data are changed in a future revision, update the idempotency check to match.
- The fixed pricing formula ensures that automated tests relying on seeded data produce predictable, deterministic outcomes. Never introduce random number generation into seed scripts — it breaks test determinism and makes debugging harder.
- `bulk_create` does not invoke model `save()` methods and does not fire `post_save` signals. If any post-save logic is required — for example, creating an `INITIAL_STOCK` movement record for each seeded variant — it must be called explicitly in the seed script after the bulk create operations complete.
- The seed script targets only the `subdomain='dev'` tenant. Running this command against a production database has no effect, since production databases will not have a tenant with that subdomain. This is a deliberate safety measure.
