# SubPhase 02.01 — Product & Variant Data Models

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | High |
| Dependencies | SubPhase 01.01 (Project Setup), SubPhase 01.02 (Auth & RBAC), SubPhase 01.03 (SaaS Infrastructure) |

---

## Overview

SubPhase 02.01 establishes the complete product and inventory data foundation for LankaCommerce. This sub-phase defines the Django ORM models that represent the product catalog, including categories, brands, products, product variants, stock movements, and stock-take sessions. All models are housed in the `backend/apps/catalog/` Django application and are accessed through the Django REST Framework API layer.

By the end of this sub-phase, the system will have a fully operational product catalog API backed by a well-indexed PostgreSQL schema, a service layer for business logic, validated serializers, file storage integration for product images, and a seeded development dataset.

---

## Data Model Relationships

The catalog data layer is organized around a hierarchy of interconnected models:

- **Category** is a self-referential model, allowing parent-child nesting for department and subcategory organization. Each category belongs to a specific tenant.
- **Brand** is a flat lookup model describing product manufacturers or labels, scoped to a tenant.
- **Product** is the central entity. Each product belongs to one category and optionally one brand. It carries metadata such as gender targeting, tax classification, and archival status. Products have a many-to-one relationship with categories and brands.
- **ProductVariant** is a child of Product and represents a specific, purchasable SKU defined by attributes such as size, color, and pricing. Variants carry stock quantity and pricing information. The `tenant` foreign key is denormalized onto the variant to enable fast barcode-to-variant lookups without a join to the parent product table.
- **StockMovement** is an immutable audit record created whenever a variant's stock quantity changes. It records the reason, actor, quantity delta, and before/after quantities.
- **StockTakeSession** groups a physical stock-count exercise. Each session contains **StockTakeItem** records that link a variant to its system-recorded and physically-counted quantities.

---

## Technical Context

All models reside in `backend/apps/catalog/models.py` within the `apps.catalog` Django application. The application must be registered in the `INSTALLED_APPS` setting of the Django configuration.

**Primary Keys**: Every model uses a `UUIDField` primary key with a default factory of `uuid.uuid4` and `editable=False`.

**Multi-tenancy**: Every model carries a `tenant` ForeignKey to the `Tenant` model (from the accounts app), establishing row-level tenant isolation.

**Monetary Fields**: All price and cost fields use Django's `DecimalField` with `max_digits=14` and `decimal_places=2`. Native Python floats must never be used for monetary arithmetic.

**Array Fields**: Tags on products and image URLs on variants are stored using `ArrayField` from `django.contrib.postgres.fields`. This requires the `django.contrib.postgres` app to be registered and a PostgreSQL backend.

**Enumerations**: Categorical string fields such as gender, tax rule, stock movement reason, and stock-take status are represented using Python `TextChoices` classes. These classes define both the stored database value and the human-readable label.

**Soft Deletion**: Permanent deletion is never performed on catalog records. Instead, a nullable `deleted_at` DateTimeField records the timestamp of logical deletion. All service-layer queries filter on `deleted_at__isnull=True` to exclude soft-deleted records.

**Timestamps**: All models include `created_at` (using `auto_now_add=True`) and `updated_at` (using `auto_now=True`). The `StockMovement` model is an exception: it is append-only and carries only `created_at`.

**Indexes**: Composite database indexes are declared in each model's inner `Meta` class using `models.Index` entries. Uniqueness constraints are expressed via `unique_together` declarations in `Meta` or `UniqueConstraint` objects.

---

## Response Envelope Convention

All API views in this sub-phase follow the standard LankaCommerce JSON response envelope. Every response body is a JSON object containing a boolean `success` field and a `data` field that holds the primary payload. List responses include a `meta` field containing pagination metadata (total count, current page, page size). Error responses include an `error` object with a `code` string and a `message` string.

This envelope is applied uniformly in DRF `APIView` and `ViewSet` response objects returned from `backend/apps/catalog/views.py`. Helper utilities for constructing envelope-compliant responses are defined in the shared core utilities layer established in SubPhase 01.01.

---

## File Storage

Product and variant image uploads are managed through a Python storage abstraction module at `backend/apps/catalog/storage.py`. This module exposes two functions: one for uploading file bytes to a configured cloud provider (Supabase Storage or Cloudinary), and one for deleting files. The active provider is selected by reading the `STORAGE_PROVIDER` environment variable at runtime.

The storage module is exclusively server-side. The Next.js frontend sends multipart form data to a dedicated Django upload endpoint, which reads the file from `request.FILES`, converts it to bytes, and delegates to the storage abstraction. No cloud credentials are ever exposed to the browser.

Image URLs produced by successful uploads are stored in the `image_urls` ArrayField on `ProductVariant`.

---

## Decimal Handling in Django

All monetary calculations in the service layer use Python's `Decimal` type from the standard library `decimal` module. Service functions that compute totals, margins, or valuations always instantiate `Decimal` values explicitly — never by casting from floats. This ensures there are no floating-point precision errors in currency arithmetic. When serializing monetary values in DRF serializers, the `DecimalField` serializer field automatically handles conversion to a JSON-safe string representation with the correct number of decimal places.

---

## Task List

| Task | Title | Complexity |
| --- | --- | --- |
| 02.01.01 | Create Category & Brand Models | Low |
| 02.01.02 | Create Product Model | Medium |
| 02.01.03 | Create ProductVariant Model | Medium |
| 02.01.04 | Create StockMovement Model | Medium |
| 02.01.05 | Create StockTakeSession Models | Medium |
| 02.01.06 | Build Product Service Layer | High |
| 02.01.07 | Build Inventory Service Layer | High |
| 02.01.08 | Build Category & Brand API Routes | Medium |
| 02.01.09 | Build Product & Variant API Routes | Medium |
| 02.01.10 | Setup Product & Variant Validators | Medium |
| 02.01.11 | Setup File Storage Integration | Medium |
| 02.01.12 | Seed Sample Product Catalog | Low |

---

## Validation Criteria

- [ ] `poetry run python manage.py check` completes with no errors or warnings
- [ ] `poetry run python manage.py showmigrations catalog` lists all catalog migrations as applied
- [ ] All catalog models (Category, Brand, Product, ProductVariant, StockMovement, StockTakeSession, StockTakeItem) are visible and editable in Django Admin
- [ ] `GET /api/catalog/products/` returns HTTP 401 when called without a valid JWT token
- [ ] `GET /api/catalog/products/` returns a paginated product list with the standard response envelope when called with a valid JWT
- [ ] `POST /api/catalog/products/` successfully creates a product and its variants within a single atomic transaction
- [ ] Barcode lookup at `GET /api/catalog/variants/barcode/{barcode}/` returns the correct variant and responds within 50 milliseconds
- [ ] Cost price is redacted from variant responses for users who lack the `catalog:view_cost` permission
- [ ] Stock adjustment correctly creates a StockMovement record and updates the variant's `stock_quantity` within the same transaction
- [ ] The seed command `poetry run python manage.py seed_catalog` runs successfully and is idempotent — safe to run multiple times without creating duplicate records
- [ ] Image upload endpoint at `POST /api/catalog/products/{id}/upload-image/` correctly delegates to the configured storage provider and returns a public URL
- [ ] `GET /api/catalog/products/` applies tenant isolation — a product belonging to Tenant A is never returned in a request authenticated as Tenant B
