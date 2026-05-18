# Task 02.01.01 — Create Category & Brand Models

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Low |
| Dependencies | Task 01.01.02 (Configure Django & PostgreSQL), Task 01.03.XX (Tenant model established) |

---

## Objective

This task creates the `apps.catalog` Django application and defines the first two catalog data models: `Category` and `Brand`. These models provide the organizational structure that all products will reference. Categories support self-referential nesting to allow multi-level department trees, and both models are fully scoped to the tenant.

---

## Instructions

### Step 1: Create the Catalog Django Application

Navigate to the `backend/` directory in a terminal. Use the Django management command `startapp` with the module path `apps/catalog` to scaffold the new application. This will create the standard Django app directory structure inside `backend/apps/catalog/`, including `models.py`, `views.py`, `admin.py`, `apps.py`, and `migrations/`. Ensure the `migrations/` directory contains an `__init__.py` file so Django recognizes it as a migrations package.

### Step 2: Register the Application

Open `backend/config/settings/base.py` (or the equivalent base settings file established in SubPhase 01.01). Locate the `INSTALLED_APPS` list and add `apps.catalog` as an entry. The app config string should match the `name` attribute defined in `apps/catalog/apps.py`. Also confirm that `django.contrib.postgres` is present in `INSTALLED_APPS`, as it is required for `ArrayField` support later in this sub-phase.

### Step 3: Define the Category Model

Open `backend/apps/catalog/models.py`. At the top of the file, import `uuid` from the Python standard library, import `models` from `django.db`, and import the `Tenant` model from `apps.accounts.models`.

Define the `Category` model by inheriting from `django.db.models.Model`. Add the following fields:

- **id**: A `UUIDField` set as the primary key, with a default of `uuid.uuid4` and `editable=False`.
- **tenant**: A `ForeignKey` to the `Tenant` model with `on_delete=CASCADE` and `related_name='categories'`. Add `db_index=True` to speed up tenant-scoped queries.
- **name**: A `CharField` with a maximum length of 255 characters.
- **description**: An optional `TextField` with `blank=True` and `null=True`.
- **parent**: A self-referential `ForeignKey` back to `'self'` with `on_delete=SET_NULL`, `null=True`, `blank=True`, and `related_name='children'`. This allows categories to be nested in an arbitrary hierarchy.
- **sort_order**: An `IntegerField` with a default of 0. Controls display ordering within a level of the hierarchy.
- **created_at**: A `DateTimeField` with `auto_now_add=True`.
- **updated_at**: A `DateTimeField` with `auto_now=True`.
- **deleted_at**: A `DateTimeField` with `null=True` and `blank=True`. A null value means the record is active; a non-null timestamp indicates the record has been soft-deleted.

In the model's inner `Meta` class, define `unique_together` as a constraint on the pair `['tenant', 'name']` to prevent duplicate category names within the same tenant. Add a human-readable `verbose_name` and `verbose_name_plural`.

Add a `__str__` method that returns the category name.

### Step 4: Define the Brand Model

Immediately after `Category` in `models.py`, define the `Brand` model. It is structurally simpler than `Category` and has the following fields:

- **id**: A `UUIDField` primary key with `uuid.uuid4` default and `editable=False`.
- **tenant**: A `ForeignKey` to `Tenant` with `on_delete=CASCADE`, `db_index=True`, and `related_name='brands'`.
- **name**: A `CharField` with a maximum length of 255 characters.
- **logo_url**: An optional `URLField` with `blank=True` and `null=True`. Stores a link to the brand's logo image.
- **created_at**: A `DateTimeField` with `auto_now_add=True`.
- **updated_at**: A `DateTimeField` with `auto_now=True`.
- **deleted_at**: A `DateTimeField` with `null=True` and `blank=True`.

In the inner `Meta` class, apply `unique_together` on `['tenant', 'name']` to prevent duplicate brand names within a tenant.

Add a `__str__` method returning the brand name.

### Step 5: Register Models in Django Admin

Open `backend/apps/catalog/admin.py`. Import the `Category` and `Brand` models from `models.py`. Register each model using `admin.site.register`. Optionally define a minimal `ModelAdmin` subclass for each to configure list display columns — for example, showing `name`, `tenant`, and `created_at` in the admin list view. For `Category`, also display `parent` and `sort_order` to make the hierarchy visible.

### Step 6: Generate and Apply the Migration

In the `backend/` directory, run the `makemigrations` management command for the `catalog` app, providing the migration name `add_category_and_brand_models` using the `--name` flag. Execute this command via `poetry run`. The migration file will be created at `backend/apps/catalog/migrations/0001_add_category_and_brand_models.py`.

Once the migration file is generated, run the `migrate` management command via `poetry run` to apply it to the PostgreSQL database.

### Step 7: Verify in Django Admin

Start the Django development server and navigate to `http://localhost:8000/admin`. Log in with a superuser account. Confirm that "Categories" and "Brands" appear in the admin under the catalog section. Attempt to create a sample category and brand to verify that database write operations are working correctly. Also create a child category by setting its `parent` field to the first category, and confirm that nesting is stored and retrieved correctly.

### Step 8: Run System Check

Run `poetry run python manage.py check` to execute the full Django system check framework. This validates that all models, settings, and installed apps are correctly configured. Resolve any warnings or errors before proceeding to the next task.

---

## Expected Output

- `backend/apps/catalog/` directory fully scaffolded with all standard Django app files
- `apps.catalog` registered in `INSTALLED_APPS` and `django.contrib.postgres` confirmed present
- `Category` and `Brand` models defined in `backend/apps/catalog/models.py` with all fields, uniqueness constraints, and soft-delete support
- Both models visible and operational in Django Admin at `http://localhost:8000/admin`
- Migration file created at `backend/apps/catalog/migrations/0001_add_category_and_brand_models.py`
- Migration applied to the PostgreSQL database

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors
- [ ] `poetry run python manage.py showmigrations catalog` shows the first migration as applied
- [ ] Category and Brand models appear in the Django Admin interface
- [ ] Creating a category record via admin succeeds and persists to PostgreSQL
- [ ] Attempting to create two categories with the same name under the same tenant raises a database integrity error
- [ ] A category can be created with a `parent` pointing to another category (nesting works)
- [ ] A brand can be created without a `logo_url` (the field is optional)

---

## Notes

- The `apps.catalog` app uses the dotted path `apps.catalog` rather than the bare name `catalog` to avoid namespace conflicts with any future third-party packages that might share the same name.
- If the `Tenant` model import creates a circular import issue, use a string-based lazy reference such as `'accounts.Tenant'` in the ForeignKey definition instead of importing the class directly.
- The `sort_order` field is intentionally a simple integer at this stage. A future task may introduce drag-and-drop reordering with gap-based ordering logic.
- The `deleted_at` field on both models is the sole mechanism for logical deletion. Hard deletion of Category and Brand records via Django Admin should be disabled in a future admin customization task to prevent accidental data loss.
