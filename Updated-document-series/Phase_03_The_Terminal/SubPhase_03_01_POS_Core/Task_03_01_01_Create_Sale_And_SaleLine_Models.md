# Task 03.01.01 — Create Sale And SaleLine Models

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.01 |
| Task Name | Create Sale And SaleLine Models |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Low |
| Dependency | Phase 02 fully complete |
| Output Files | `backend/apps/pos/models.py`, `backend/apps/catalog/models.py` (modified) |

---

## Objective

Create the `Sale` and `SaleLine` Django ORM models, introduce `PaymentMethod` and `SaleStatus` TextChoices inner classes, extend the existing `StockMovementReason` TextChoices in `backend/apps/catalog/models.py` with `SALE` and `VOID_REVERSAL` values, define all necessary database indexes, and run the migration to make these structures available in the database.

---

## Step 1 — Review Existing Models

Open `backend/apps/catalog/models.py` and carefully read through the `ProductVariant` model. Take note of its primary key field name, the foreign key relation to `Product`, and any fields carrying monetary or inventory data — particularly `retail_price`, `stock_quantity`, and `low_stock_threshold`. The `SaleLine` model will reference `ProductVariant` via a `ForeignKey`, so understanding its structure first prevents field-name mismatches.

Next, open `backend/apps/accounts/models.py` and review the `User` model. Note its primary key (which should be a `UUIDField`), the field that stores the user's `tenant_id`, and whether `hashed_pin` is already present. The `Sale` model references `User` three times: for `cashier`, `authorizing_manager`, and `voided_by`. Confirm all three references target the correct model before writing any code.

Finally, locate the `StockMovementReason` TextChoices class in `backend/apps/catalog/models.py`. Take note of the existing values already defined there (likely `PURCHASE`, `ADJUSTMENT`, `RETURN`, and similar). You will be appending two new values to this same class rather than creating a separate class.

---

## Step 2 — Add PaymentMethod TextChoices

In `backend/apps/pos/models.py`, define a `PaymentMethod` Python class that inherits from `models.TextChoices`. This class should contain exactly three values: `CASH` with the database string `"CASH"` and the human-readable label `"Cash"`, `CARD` with the database string `"CARD"` and the label `"Card"`, and `SPLIT` with the database string `"SPLIT"` and the label `"Split"`.

Each sale record will carry exactly one `PaymentMethod` value once payment has been accepted. The `payment_method` field on the `Sale` model must be nullable to allow it to remain unset on sales that are currently in `OPEN` (held) status, where the cashier has not yet proceeded to payment. A nullable `payment_method` on an `OPEN` sale is a valid and expected state — it does not represent corrupted data.

---

## Step 3 — Add SaleStatus TextChoices

In the same `backend/apps/pos/models.py` file, define a `SaleStatus` TextChoices class with three values.

`OPEN` represents a sale that has been created and placed on hold. No payment has been taken. No stock deduction has occurred. The sale exists purely as a saved cart state. `COMPLETED` represents a sale where payment has been accepted and all stock adjustments have been executed atomically within a single database transaction. `VOIDED` represents a completed sale that has been reversed: the associated stock movements have been undone, audit records have been written, and the sale can never re-enter either `OPEN` or `COMPLETED` status. The `VOIDED` state is a terminal state and must be treated as permanent at both the service and API layers.

---

## Step 4 — Extend StockMovementReason

Open `backend/apps/catalog/models.py` and locate the `StockMovementReason` TextChoices class. Without removing or altering any of the existing values, append two new entries.

The first is `SALE` with the database string `"SALE"` and the label `"Sale"`. This value is used when `adjust_stock` is called during `create_sale` to decrement the variant's `stock_quantity`. Every line in a `COMPLETED` sale generates exactly one `StockMovement` record with `reason=SALE`.

The second is `VOID_REVERSAL` with the database string `"VOID_REVERSAL"` and the label `"Void Reversal"`. This value is used when `void_sale` calls `adjust_stock` with a positive quantity delta to restore stock. These two values are symmetrical: every `SALE` stock movement that belongs to a subsequently voided sale will have a corresponding `VOID_REVERSAL` movement of the same absolute magnitude.

---

## Step 5 — Define the Sale Model

In `backend/apps/pos/models.py`, define a `Sale` Django model. The fields must be defined as follows.

The `id` field is a `UUIDField` with `primary_key=True`, `default=uuid.uuid4`, and `editable=False`. Import `uuid` from Python's standard library at the top of the file.

The `tenant_id` field is a `CharField(max_length=50)`. It carries the tenant's identifier without establishing a foreign key relationship to a Tenant model. Tenant isolation for all queries is enforced at the service layer, consistent with the pattern used across the rest of the LankaCommerce codebase.

The `shift` field is a `ForeignKey` pointing to `Shift`. Because `Shift` is defined in the same file but will be written after `Sale` (or before, depending on ordering — resolve the forward-reference issue as described in Task 03.01.02 Step 1), use the string `'Shift'` as the first argument rather than the class itself. Use `on_delete=models.PROTECT` to prevent a shift from being deleted while it has associated sale records.

The `cashier` field is a `ForeignKey` to the `User` model from `backend/apps/accounts/models.py`. Set `related_name='cashier_sales'` and `on_delete=models.PROTECT`. Do not use `on_delete=models.CASCADE` here — deleting a user must not cascade to delete sales records, as these are permanent transaction history.

The `subtotal` field is a `DecimalField(max_digits=12, decimal_places=2)` representing the sum of all line totals after line-level discounts but before any cart-level discount or tax.

The `discount_amount` field is a `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))` representing the cart-level discount amount applied to the entire sale. This is distinct from per-line discounts, which are recorded on each `SaleLine`.

The `tax_amount` field is a `DecimalField(max_digits=12, decimal_places=2)` representing the sum of all per-line tax computations. This value is authoritative and is computed server-side.

The `total_amount` field is a `DecimalField(max_digits=12, decimal_places=2)` representing the final amount charged to the customer: `subtotal - discount_amount + tax_amount`.

The `change_given` field is a `DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)`. This field is null for card-only and split-payment sales, and is populated with the change returned to the customer for cash sales. It is set during the payment completion flow in SubPhase 03.02.

The `authorizing_manager` field is a `ForeignKey` to `User` with `related_name='authorized_sales'`, `null=True`, `blank=True`, and `on_delete=models.SET_NULL`. When the manager's account is deleted, historical sale records should not be deleted or broken — using `SET_NULL` ensures the sale's discount amounts remain visible in history even if the manager record is later removed.

The `payment_method` field is a `CharField(max_length=10, choices=PaymentMethod.choices, null=True, blank=True)`. It is null on `OPEN` (held) sales and populated when payment is completed.

The `status` field is a `CharField(max_length=10, choices=SaleStatus.choices, default=SaleStatus.OPEN)`.

The `voided_by` field is a `ForeignKey` to `User` with `related_name='voided_sales'`, `null=True`, `blank=True`, and `on_delete=models.SET_NULL`. Same reasoning as `authorizing_manager` — uses `SET_NULL` to preserve historical records.

The `voided_at` field is a `DateTimeField(null=True, blank=True)`. Populated atomically when `void_sale` executes.

The `whatsapp_receipt_sent_at` field is a `DateTimeField(null=True, blank=True)`. This field is defined now but will not be written by any Phase 03 code. It is reserved for the WhatsApp receipt delivery feature in SubPhase 03.02. Defining it now avoids a future migration on a table that may contain millions of rows.

The `completed_at` field is a `DateTimeField(null=True, blank=True)`. Populated when the sale transitions from `OPEN` or direct creation to `COMPLETED`.

The `created_at` field is a `DateTimeField(auto_now_add=True)`. Set automatically at record creation.

The `updated_at` field is a `DateTimeField(auto_now=True)`. Updated automatically on every save.

Inside the `Meta` inner class, define compound database indexes using the `indexes` attribute: one index on `['tenant_id', 'status', 'created_at']` to support the primary sale history query (filtered by tenant, optionally by status, ordered by date); one index on `['shift']` to support the shift-level sales aggregation queries; and one index on `['cashier']` to support per-cashier history queries.

---

## Step 6 — Define the SaleLine Model

In the same `backend/apps/pos/models.py` file, define a `SaleLine` model beneath the `Sale` model definition.

The `id` field follows the same pattern: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.

The `sale` field is a `ForeignKey` to `Sale` with `on_delete=models.CASCADE`. When a `Sale` record is deleted, all of its associated `SaleLine` records must be deleted with it. This is the correct behaviour because `SaleLine` records have no independent meaning without their parent sale.

The `variant` field is a `ForeignKey` to `ProductVariant` with `on_delete=models.PROTECT`. This is intentionally set to `PROTECT` rather than `CASCADE` or `SET_NULL`. The intent is that the application must guard against variant deletion when sale line records reference that variant. If a cashier or admin attempts to delete a variant that has at least one `SaleLine` referencing it, the operation must be blocked at the variant deletion endpoint (which you must add a pre-deletion check to in `backend/apps/catalog/views.py` or the variant service). Using `PROTECT` here means the database will enforce this safety net even if the application-layer check is somehow bypassed. This ensures the historical record remains intact indefinitely.

The snapshot fields are critically important for the long-term integrity of sale history. Product data is mutable — product names change, variant descriptions change, and SKUs may be reassigned. The snapshot fields capture the exact state of the product at the precise moment the sale was created.

`product_name_snapshot` is a `CharField(max_length=255)` containing the exact product name at sale creation time. `variant_description_snapshot` is a `CharField(max_length=255)` containing the full human-readable variant descriptor assembled from the variant's attribute values at sale creation time, for example "Navy Blue / Large" or "White / Medium / Cotton". `sku` is a `CharField(max_length=100)` containing the variant's SKU code at sale creation time. These three fields together provide everything needed to render a receipt or display sale history without joining back to the live product catalog.

The financial fields on `SaleLine` track the complete monetary record for one line. `unit_price` is a `DecimalField(max_digits=12, decimal_places=2)` containing the retail price of one unit at sale time. `quantity` is a `PositiveIntegerField()` with a minimum effective value of 1. `discount_percent` is a `DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))` representing the percentage discount applied to this line. `discount_amount` is a `DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))` containing the computed discount: `(discount_percent / 100) × unit_price × quantity`, rounded to two decimal places. `line_total_before_discount` is a `DecimalField(max_digits=12, decimal_places=2)` equal to `unit_price × quantity`. `line_total_after_discount` is a `DecimalField(max_digits=12, decimal_places=2)` equal to `line_total_before_discount - discount_amount`.

The `created_at` field is a `DateTimeField(auto_now_add=True)`.

Inside the `Meta` inner class, define indexes on `['sale']` and `['variant']` to support lookups from both directions.

---

## Step 7 — Create the pos App

If the `backend/apps/pos/` directory does not yet exist, create it as a proper Django application. It must contain at minimum: `__init__.py` (empty), `apps.py` (with a `PosConfig` class setting `name = 'backend.apps.pos'` and `default_auto_field = 'django.db.models.BigAutoField'`), `models.py`, `views.py`, `serializers.py`, and `urls.py`. Also create a `services/` subdirectory with its own `__init__.py` file, which will house `sale_service.py` and `shift_service.py` in later tasks.

After creating the app directory, open `backend/settings.py` and locate the `INSTALLED_APPS` list. Add `'backend.apps.pos'` to the list. Placement within the list is not critical, but placing it after `'backend.apps.catalog'` is logical given the dependency. Ensure the `apps.py` `AppConfig` class is correctly referenced — Django will use it when initialising the application.

---

## Step 8 — Run the Migration

With the app registered and models defined, run the Django migration command for the new `pos` app. The migration should be named descriptively: `add_sale_and_saleline_models`. Execute the migration to apply the schema changes to the database. Confirm via database introspection or the Django shell that the `pos_sale` and `pos_saleline` tables now exist with all expected columns and that the indexes defined in the `Meta` classes are present.

Additionally, because `StockMovementReason` in `backend/apps/catalog/models.py` has been extended with two new values, run `makemigrations` for the `catalog` app as well. Although adding new values to a `TextChoices` class does not always require a schema migration (if the field simply stores strings), it is good practice to let Django evaluate whether any migration is needed. Apply the catalog migration if Django generates one.

After all migrations complete, load Django's interactive shell and confirm that the new TextChoices values are accessible on their respective classes and that creating a test `Sale` instance with minimal required fields raises no errors. There is no equivalent of a Prisma client regeneration step — the models are immediately usable after migration via the Django ORM.

---

## Expected Output

After completing this task, the `backend/apps/pos/` app exists as a properly structured Django application registered in `INSTALLED_APPS`. The `pos_sale` table contains all columns specified above including the `LKC`-prefixed barcode fields reserved for SubPhase 03.02. The `pos_saleline` table contains all snapshot and financial columns. All compound indexes are present in the database. The `StockMovementReason` class in `backend/apps/catalog/models.py` now includes `SALE` and `VOID_REVERSAL`. All migrations have been applied successfully.

---

## Validation

Import the `Sale` and `SaleLine` models in the Django shell and confirm that both are importable without errors. Attempt to create a minimal `Sale` instance (with required fields only) and confirm it saves to the database and returns a UUID primary key. Confirm that `PaymentMethod.choices`, `SaleStatus.choices`, and `StockMovementReason.SALE` and `StockMovementReason.VOID_REVERSAL` are accessible.

---

## Notes

The snapshot field design is a deliberate denormalization. Product data — names, variant descriptions, SKUs — is mutable. An admin may rename a product, merge variants, or reassign SKU codes at any point after a sale is made. If the `SaleLine` referenced live product data at query time, historical receipts and the sale history page would display incorrect information. Do not attempt to reconstruct what was sold by joining back to the live `ProductVariant` at receipt-rendering time. The snapshot fields are the authoritative source for all historical display, including `SaleDetailModal` and receipt reprints.

The `on_delete=models.PROTECT` on `SaleLine.variant` means you must add a guard to the variant deletion endpoint established in Phase 02. Before allowing a `ProductVariant` to be deleted, that endpoint must query `SaleLine.objects.filter(variant_id=variant_id).exists()` and return a 409 conflict response if any sale line references the variant, informing the caller that the variant has associated sale history and cannot be deleted.

Python's `Decimal` from the `decimal` module is used for all backend monetary arithmetic. The `DecimalField` enforces `max_digits=12, decimal_places=2` at the database column level. Never use Python's built-in `float` type for monetary computation — floating-point arithmetic is not suitable for financial figures.
