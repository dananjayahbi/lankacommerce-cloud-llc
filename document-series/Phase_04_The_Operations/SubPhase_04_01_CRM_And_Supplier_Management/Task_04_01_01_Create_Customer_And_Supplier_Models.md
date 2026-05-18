# Task 04.01.01 — Create Customer and Supplier Models

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.01 |
| Complexity | Medium |
| Dependencies | Phase 03 schema fully migrated |
| Produces | `backend/apps/crm/models.py`, migration `add_customer_supplier_purchase_order_models` |

---

## Objective

Define all Django models for CRM and procurement in a new `backend/apps/crm/` Django application: `Customer`, `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `CustomerBroadcast`, and `BirthdayGreetingLog`. Define `POStatus` and `Gender` TextChoices. Add nullable FK fields `customer` and `salesperson` to the existing `Sale` model in `backend/apps/pos/models.py`. Apply the migration.

---

## Instructions

### Step 1: Register the CRM Django App

Create the `backend/apps/crm/` directory with the following sub-structure:

- `__init__.py`
- `apps.py`
- `models.py`
- `urls.py`
- `validators.py`
- `services/` (with `__init__.py`)
- `views/` (with `__init__.py`)
- `serializers/` (with `__init__.py`)
- `utils/` (with `__init__.py`)
- `management/commands/` (with `__init__.py` at each level)

In `apps.py`, define `CrmConfig` with `name = 'backend.apps.crm'` and `default_auto_field = 'django.db.models.BigAutoField'`. Register `'backend.apps.crm'` in the `INSTALLED_APPS` list in `backend/config/settings.py`. All new model classes for this sub-phase are placed in `backend/apps/crm/models.py`.

### Step 2: Define TextChoices

In `backend/apps/crm/models.py`, define `POStatus(models.TextChoices)` with five values:

- `DRAFT = 'DRAFT', 'Draft'`
- `SENT = 'SENT', 'Sent'`
- `PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', 'Partially Received'`
- `RECEIVED = 'RECEIVED', 'Received'`
- `CANCELLED = 'CANCELLED', 'Cancelled'`

Define `Gender(models.TextChoices)` with three values:

- `MALE = 'MALE', 'Male'`
- `FEMALE = 'FEMALE', 'Female'`
- `OTHER = 'OTHER', 'Other'`

If a `Gender` enum already exists elsewhere in the project (for example, on the `User` model), import and reuse it instead of redefining.

### Step 3: Define the Customer Model

Place `Customer` in `backend/apps/crm/models.py` with the following fields:

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `tenant` — `ForeignKey` to `Tenant`, `on_delete=PROTECT`, `related_name='customers'`
- `name` — `CharField(max_length=255)`
- `phone` — `CharField(max_length=30)` — stored as entered, validated at the serializer layer
- `email` — `CharField(max_length=255, blank=True, null=True)`
- `gender` — `CharField(max_length=10, choices=Gender.choices, blank=True, null=True)`
- `birthday` — `DateField(null=True, blank=True)`
- `tags` — `ArrayField(base_field=CharField(max_length=100), blank=True, default=list)` from `django.contrib.postgres.fields`
- `notes` — `TextField(blank=True)`
- `credit_balance` — `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))` — signed; positive means the store owes the customer
- `total_spend` — `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))`
- `is_active` — `BooleanField(default=True)`
- `deleted_at` — `DateTimeField(null=True, blank=True)`
- `created_at` — `DateTimeField(auto_now_add=True)`
- `updated_at` — `DateTimeField(auto_now=True)`

`Meta` class:

- `indexes = [Index(fields=['tenant']), Index(fields=['tenant', 'phone'])]`
- The composite `(tenant, phone)` index supports duplicate detection during CSV import and POS customer search.
- `ordering = ['-created_at']`

`__str__` should return `f"{self.name} ({self.phone})"`.

### Step 4: Add customer and salesperson to the Sale Model

Open `backend/apps/pos/models.py`. In the existing `Sale` model, add the following three fields:

- `customer` — `ForeignKey('crm.Customer', on_delete=SET_NULL, null=True, blank=True, related_name='sales')`
- `salesperson` — `ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='sales_as_salesperson')`
- `applied_store_credit` — `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))`

All three are nullable to avoid breaking existing sale records. The string reference `'crm.Customer'` in the FK avoids a circular import between the `pos` and `crm` apps.

### Step 5: Define the Supplier Model

Add `Supplier` to `backend/apps/crm/models.py` with the following fields:

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `tenant` — `ForeignKey` to `Tenant`, `on_delete=PROTECT`, `related_name='suppliers'`
- `name` — `CharField(max_length=255)`
- `contact_name` — `CharField(max_length=255, blank=True)`
- `phone` — `CharField(max_length=30)`
- `whatsapp_number` — `CharField(max_length=30, blank=True)` — a separate field because the supplier contact may use a different number for WhatsApp
- `email` — `EmailField(blank=True, null=True)`
- `address` — `TextField(blank=True)`
- `lead_time_days` — `PositiveIntegerField(default=7)`
- `notes` — `TextField(blank=True)`
- `is_active` — `BooleanField(default=True)`
- `created_at` — `DateTimeField(auto_now_add=True)`
- `updated_at` — `DateTimeField(auto_now=True)`

`Meta`: `indexes = [Index(fields=['tenant'])]`, `ordering = ['name']`.

### Step 6: Define the PurchaseOrder Model

Add `PurchaseOrder` to `backend/apps/crm/models.py` with the following fields:

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `tenant` — `ForeignKey` to `Tenant`, `on_delete=PROTECT`, `related_name='purchase_orders'`
- `supplier` — `ForeignKey` to `Supplier`, `on_delete=PROTECT`, `related_name='purchase_orders'`
- `created_by` — `ForeignKey` to `User`, `on_delete=PROTECT`, `related_name='purchase_orders'`
- `expected_delivery_date` — `DateField(null=True, blank=True)`
- `status` — `CharField(max_length=30, choices=POStatus.choices, default=POStatus.DRAFT)`
- `notes` — `TextField(blank=True)`
- `total_amount` — `DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))` — computed and stored by the service, not a derived/computed field
- `created_at` — `DateTimeField(auto_now_add=True)`
- `updated_at` — `DateTimeField(auto_now=True)`

`Meta`: `indexes = [Index(fields=['tenant', 'status'])]`, `ordering = ['-created_at']`.

### Step 7: Define the PurchaseOrderLine Model

Add `PurchaseOrderLine` to `backend/apps/crm/models.py` with the following fields:

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `purchase_order` — `ForeignKey` to `PurchaseOrder`, `on_delete=CASCADE`, `related_name='lines'`
- `variant` — `ForeignKey` to `ProductVariant`, `on_delete=PROTECT`, `related_name='po_lines'`
- `product_name_snapshot` — `CharField(max_length=255)` — captured at creation time; preserves readability if the product is renamed later
- `variant_description_snapshot` — `CharField(max_length=255, blank=True)`
- `ordered_qty` — `PositiveIntegerField()`
- `expected_cost_price` — `DecimalField(max_digits=12, decimal_places=2)`
- `received_qty` — `PositiveIntegerField(default=0)`
- `actual_cost_price` — `DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)` — populated during goods receiving
- `is_fully_received` — `BooleanField(default=False)`
- `created_at` — `DateTimeField(auto_now_add=True)`

`Meta`: `indexes = [Index(fields=['purchase_order'])]`.

### Step 8: Define CustomerBroadcast and BirthdayGreetingLog Models

**`CustomerBroadcast`:**

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `tenant` — `ForeignKey` to `Tenant`, `on_delete=PROTECT`, `related_name='broadcasts'`
- `sent_by` — `ForeignKey` to `User`, `on_delete=PROTECT`, `related_name='broadcasts_sent'`
- `message` — `TextField()`
- `filters` — `JSONField()` — stores the filter snapshot used to select recipients at the time of sending
- `recipient_count` — `PositiveIntegerField(default=0)`
- `sent_at` — `DateTimeField(auto_now_add=True)`

`Meta`: `indexes = [Index(fields=['tenant'])]`, `ordering = ['-sent_at']`.

**`BirthdayGreetingLog`:**

- `id` — `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `tenant` — `ForeignKey` to `Tenant`, `on_delete=PROTECT`, `related_name='birthday_logs'`
- `customer` — `ForeignKey` to `Customer`, `on_delete=CASCADE`, `related_name='birthday_logs'`
- `status` — `CharField(max_length=10, choices=[('SENT', 'Sent'), ('FAILED', 'Failed')])`
- `error_message` — `TextField(blank=True)` — populated only when `status='FAILED'`
- `created_at` — `DateTimeField(auto_now_add=True)`

`Meta`: `indexes = [Index(fields=['tenant', 'created_at'])]`.

### Step 9: Generate and Apply Migrations

Run two separate migration commands:

- `poetry run python manage.py makemigrations crm --name add_customer_supplier_purchase_order_models` — generates the migration for all new models in the `crm` app.
- `poetry run python manage.py makemigrations pos --name add_customer_link_to_sale` — generates the migration for the three new fields on the `Sale` model.

Review both generated migration files in `backend/apps/crm/migrations/` and `backend/apps/pos/migrations/` to confirm the field definitions match expectations. Then apply both with `poetry run python manage.py migrate`.

---

## Expected Output

- `backend/apps/crm/models.py` containing `POStatus`, `Gender`, `Customer`, `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `CustomerBroadcast`, and `BirthdayGreetingLog`.
- `backend/apps/pos/models.py` updated with `customer`, `salesperson`, and `applied_store_credit` on the `Sale` model.
- Migration `backend/apps/crm/migrations/0001_add_customer_supplier_purchase_order_models.py` generated and applied.
- Migration `backend/apps/pos/migrations/XXXX_add_customer_link_to_sale.py` generated and applied.

---

## Validation

- Open the Django shell (`poetry run python manage.py shell`) and import all new models — confirm no `ImportError` or `OperationalError`.
- `from backend.apps.crm.models import Customer, Supplier, PurchaseOrder, PurchaseOrderLine, CustomerBroadcast, BirthdayGreetingLog` should execute without errors.
- `poetry run python manage.py migrate --check` confirms no pending migrations remain.
- Run `Customer.objects.count()` — confirms the table exists and returns an integer.

---

## Notes

- `ArrayField` for the `tags` field requires `django.contrib.postgres` in `INSTALLED_APPS` and a PostgreSQL database, consistent with the project's existing setup.
- The string reference `'crm.Customer'` in `Sale.customer` avoids a circular import between the `pos` and `crm` Django apps — Django resolves cross-app FK strings lazily.
- All `id` fields use `uuid.uuid4` (not `uuid.uuid1`) to ensure unpredictable primary keys and avoid leaking record creation order to clients.
- Import `uuid` from the standard library and `Decimal` from the `decimal` standard library at the top of `models.py` — do not use `float` for any monetary default.
