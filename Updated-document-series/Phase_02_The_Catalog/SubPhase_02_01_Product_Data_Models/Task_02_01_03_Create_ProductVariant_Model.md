# Task 02.01.03 — Create ProductVariant Model

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Task 02.01.02 (Product model), Task 01.03.XX (Tenant model) |

---

## Objective

This task defines the `ProductVariant` model, which represents a specific, purchasable SKU within a product. Each variant is identified by a unique SKU and optional barcode, carries its own pricing and stock quantity, and stores an ordered list of image URLs. The tenant foreign key is intentionally denormalized onto the variant to enable performant barcode lookups without requiring a join to the parent product table.

---

## Instructions

### Step 1: Define the ProductVariant Model

Open `backend/apps/catalog/models.py` and define a new `ProductVariant` model after the `Product` model.

Add the following fields in order:

- **id**: A `UUIDField` primary key defaulting to `uuid.uuid4` with `editable=False`.
- **product**: A `ForeignKey` to the `Product` model with `on_delete=CASCADE` and `related_name='variants'`. Deleting a product cascades to all its variants.
- **tenant**: A `ForeignKey` to the `Tenant` model with `on_delete=CASCADE`, `db_index=True`, and `related_name='product_variants'`. This is a denormalized copy of the product's tenant foreign key. It is included to allow efficient compound index lookups on `(tenant, barcode)` and `(tenant, sku)` without joining the product table on every barcode scan.
- **sku**: A `CharField` with a maximum length of 100. This is the human-readable stock-keeping unit identifier assigned to each distinct product variant.
- **barcode**: An optional `CharField` with a maximum length of 100, `blank=True`, and `null=True`. Accepts EAN-13, EAN-8, UPC-A, and other common barcode formats.
- **size**: An optional `CharField` with `max_length=50`, `blank=True`, and `null=True`. Stores values such as "S", "M", "L", "XL", "42", or "UK 9".
- **colour**: An optional `CharField` with `max_length=100`, `blank=True`, and `null=True`. Stores the color name or color code for this variant.
- **cost_price**: A `DecimalField` with `max_digits=14` and `decimal_places=2`. This is the purchase or landed cost of the variant. It is never shown to unauthorized users.
- **retail_price**: A `DecimalField` with `max_digits=14` and `decimal_places=2`. This is the standard customer-facing selling price.
- **wholesale_price**: An optional `DecimalField` with `max_digits=14`, `decimal_places=2`, `null=True`, and `blank=True`. The price offered to wholesale buyers.
- **stock_quantity**: An `IntegerField` with a default of 0. Tracks the current on-hand inventory count for this variant.
- **low_stock_threshold**: An `IntegerField` with a default of 5. When `stock_quantity` falls at or below this value, the variant is flagged as low stock in reports and alerts.
- **image_urls**: An `ArrayField` wrapping a `URLField` with `max_length=2000`. Set `blank=True` and `default=list` to allow empty arrays. Stores an ordered list of publicly accessible image URLs for this variant.
- **created_at**: A `DateTimeField` with `auto_now_add=True`.
- **updated_at**: A `DateTimeField` with `auto_now=True`.
- **deleted_at**: A `DateTimeField` with `null=True` and `blank=True`. Used for soft deletion.

### Step 2: Define Uniqueness Constraints and Indexes

In the `ProductVariant` model's inner `Meta` class, define `unique_together` constraints for the pairs `['tenant', 'sku']` and `['tenant', 'barcode']`. These database-level constraints ensure that SKUs are unique within a tenant's dataset and that barcodes are unique within a tenant's dataset.

Additionally, define a `models.Index` on `['tenant', 'barcode']` to create a dedicated compound B-tree index. This index is the primary performance mechanism for the barcode lookup endpoint, which must respond within 50 milliseconds. Define a second `models.Index` on `['tenant', 'sku']` for SKU-based search queries. Define a third `models.Index` on `['product']` to speed up queries that retrieve all variants for a given product.

Set a descriptive `verbose_name` and `verbose_name_plural` in `Meta`.

Add a `__str__` method that returns a descriptive string combining the product name (accessed through the ForeignKey) and the `sku` value.

### Step 3: Register ProductVariant in Django Admin

Open `backend/apps/catalog/admin.py` and import `ProductVariant`. Register it with `admin.site.register`. Optionally define a `ProductVariantAdmin` class that sets `list_display` to include `sku`, `barcode`, `size`, `colour`, `retail_price`, `stock_quantity`, `product`, and `tenant`. Adding `list_select_related = ['product', 'tenant']` to the admin class avoids N+1 query problems when rendering the admin list view, since those fields are accessed via ForeignKeys.

### Step 4: Generate and Apply the Migration

In the `backend/` directory, run `makemigrations catalog --name add_product_variant_model` via `poetry run` to create the migration file. Then run `migrate` to apply it to the database.

### Step 5: Verify with Django Shell

Launch the Django interactive shell via `poetry run python manage.py shell`. Import `ProductVariant` from `apps.catalog.models`. Execute a simple ORM count query to confirm the model table exists and is queryable without errors. Exit the shell.

---

## Expected Output

- `ProductVariant` model defined in `backend/apps/catalog/models.py` with all fields, uniqueness constraints, and composite indexes
- `ProductVariant` registered in `backend/apps/catalog/admin.py`
- Migration file created at `backend/apps/catalog/migrations/0003_add_product_variant_model.py`
- Migration applied to PostgreSQL
- Django shell confirms the model table is accessible

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors
- [ ] `poetry run python manage.py showmigrations catalog` shows all three migrations as applied
- [ ] "Product Variants" section appears in Django Admin
- [ ] Attempting to create two variants with the same `sku` under the same tenant raises a database integrity error
- [ ] Attempting to create two variants with the same `barcode` under the same tenant raises a database integrity error
- [ ] A variant with an empty `image_urls` list saves successfully
- [ ] The Django shell can query `ProductVariant.objects.all()` without errors
- [ ] `cost_price` and `retail_price` store and retrieve decimal values with exactly 2 decimal places

---

## Notes

- The denormalized `tenant` field on `ProductVariant` is an intentional architectural decision to support the performance-critical barcode lookup endpoint. It must always be kept in sync with the parent product's tenant during create operations. The product service layer in Task 02.01.06 is responsible for maintaining this consistency — the `tenant_id` on a new variant is always set to match the product's `tenant_id`, not taken from request input.
- A `null=True` barcode combined with a `unique_together` constraint on `['tenant', 'barcode']` behaves as expected in PostgreSQL: two variants under the same tenant can both have `barcode=null`, because SQL NULL values are not considered equal for the purposes of unique constraint evaluation. This is the desired behavior — not all variants have barcodes.
- The `ArrayField` wrapping `URLField` is valid in PostgreSQL. Django validates each element of the array against the inner field's validators, meaning that each entry in `image_urls` is checked to be a well-formed URL at the application layer.
