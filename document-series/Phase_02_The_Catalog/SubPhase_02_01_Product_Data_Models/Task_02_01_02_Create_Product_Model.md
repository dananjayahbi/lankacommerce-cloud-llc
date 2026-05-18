# Task 02.01.02 — Create Product Model

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Task 02.01.01 (Category & Brand models), Task 01.03.XX (Tenant model) |

---

## Objective

This task defines the central `Product` model in `backend/apps/catalog/models.py`. The Product model represents a logical catalog item — a named product line carrying metadata such as gender targeting, tax classification, and archival status. It references `Category` and `Brand` via foreign keys and carries a multi-valued tags array. Two Python `TextChoices` enumeration classes are also introduced in this task to represent gender types and tax rules.

---

## Instructions

### Step 1: Define the GenderType Enumeration

In `backend/apps/catalog/models.py`, before the `Product` class definition, define a `GenderType` class that inherits from `django.db.models.TextChoices`. This enum must declare the following choices: `MEN`, `WOMEN`, `UNISEX`, `KIDS`, and `OTHER`. Each choice has a database value — a short uppercase string — and a human-readable label. Use Django's standard `TextChoices` syntax where the label is provided as a second element in the member definition.

### Step 2: Define the TaxRule Enumeration

Immediately after `GenderType`, define a `TaxRule` class also inheriting from `TextChoices`. It must declare the following choices: `STANDARD_VAT`, `REDUCED_VAT`, `ZERO_RATED`, and `EXEMPT`. These values correspond to the tax classification applied to products sold through the POS terminal in accordance with local tax regulations.

### Step 3: Define the Product Model

Define the `Product` model by inheriting from `django.db.models.Model`. Add the following fields in order:

- **id**: A `UUIDField` set as the primary key, defaulting to `uuid.uuid4`, with `editable=False`.
- **tenant**: A `ForeignKey` to the `Tenant` model with `on_delete=CASCADE`, `db_index=True`, and `related_name='products'`.
- **name**: A `CharField` with a maximum length of 500 characters.
- **description**: An optional `TextField` with `blank=True` and `null=True`.
- **category**: A `ForeignKey` to the `Category` model with `on_delete=PROTECT` and `related_name='products'`. Using `PROTECT` prevents category deletion when products exist under it, enforcing referential integrity.
- **brand**: A `ForeignKey` to the `Brand` model with `on_delete=SET_NULL`, `null=True`, `blank=True`, and `related_name='products'`. This field is optional — products may be unbranded.
- **gender**: A `CharField` with `choices=GenderType.choices`, `max_length=10`, and a default of `GenderType.UNISEX`.
- **tags**: An `ArrayField` wrapping a `CharField` with a maximum length of 100. Set `blank=True` and `default=list` to allow empty tag arrays. Stores searchable keyword tags associated with the product.
- **tax_rule**: A `CharField` with `choices=TaxRule.choices`, `max_length=20`, and a default of `TaxRule.STANDARD_VAT`.
- **is_archived**: A `BooleanField` with a default of `False`. Archived products remain in the database but are excluded from POS search results and active catalog views.
- **created_at**: A `DateTimeField` with `auto_now_add=True`.
- **updated_at**: A `DateTimeField` with `auto_now=True`.
- **deleted_at**: A `DateTimeField` with `null=True` and `blank=True`.

### Step 4: Define Model Meta and Indexes

In the `Product` model's inner `Meta` class, define a `verbose_name` and `verbose_name_plural`. Define a list of `indexes` using `models.Index` objects. Create a composite index on `['tenant', 'category']` to speed up per-tenant category-browsing queries. Create a second composite index on `['tenant', 'is_archived']` to accelerate filtering between active and archived products. Add a third index on `['tenant', 'name']` to support name-based search queries within a tenant.

Add a `__str__` method that returns the product name.

### Step 5: Register Product in Django Admin

Open `backend/apps/catalog/admin.py` and import the `Product` model. Register it with `admin.site.register`. Optionally define a `ProductAdmin` class with `list_display` set to show `name`, `category`, `brand`, `gender`, `tax_rule`, `is_archived`, and `created_at`. Add `list_filter` for `is_archived`, `gender`, and `tax_rule` to enable sidebar filtering in the admin list view. Add `search_fields` on `name` to support keyword search within the admin.

### Step 6: Generate and Apply the Migration

In the `backend/` directory, run the `makemigrations` management command targeting the `catalog` app with the migration name `add_product_model` via `poetry run`. Then run the `migrate` management command to apply the migration to the database.

### Step 7: Verify in Django Admin

Navigate to the Django Admin interface and confirm the "Products" section is visible. Create a test product linked to a previously created category and an optional brand. Confirm that the `gender` and `tax_rule` dropdowns display the correct human-readable labels derived from the `TextChoices` classes. Confirm that saving without a brand succeeds.

---

## Expected Output

- `GenderType` and `TaxRule` `TextChoices` classes defined in `models.py` before the `Product` class
- `Product` model defined in `models.py` with all fields, choices, and meta indexes
- `Product` registered in `backend/apps/catalog/admin.py` with list display and filters
- Migration file created at `backend/apps/catalog/migrations/0002_add_product_model.py`
- Migration applied to PostgreSQL

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors
- [ ] `poetry run python manage.py showmigrations catalog` shows both migrations as applied
- [ ] "Products" section appears in Django Admin
- [ ] Product list and detail views in admin show `gender` and `tax_rule` as human-readable labels
- [ ] Creating a product without a brand succeeds (brand is optional)
- [ ] Attempting to delete a category that has associated products raises a `ProtectedError` from Django
- [ ] The `tags` field accepts an empty list as a valid value and stores it correctly
- [ ] The `is_archived` flag defaults to `False` on newly created products

---

## Notes

- `ArrayField` is a PostgreSQL-specific field and does not work with SQLite. All environments in LankaCommerce must use PostgreSQL. Attempting to run migrations against a SQLite backend will raise an error.
- The `PROTECT` constraint on the category ForeignKey is a deliberate business rule: categories cannot be hard-deleted while they contain products. Soft-deletion via `deleted_at` is the correct mechanism for retiring categories.
- The `is_archived` flag is conceptually distinct from `deleted_at`. Archiving hides a product from sales flows while keeping it accessible in historical reports and admin. Soft deletion removes it from all active views. A product may be archived but not soft-deleted, or soft-deleted but not first archived.
- The `TextChoices` enumerations should be defined at module level in `models.py` rather than as inner classes of `Product`, so they can be imported cleanly by serializers and other modules that need to reference the choice values.
