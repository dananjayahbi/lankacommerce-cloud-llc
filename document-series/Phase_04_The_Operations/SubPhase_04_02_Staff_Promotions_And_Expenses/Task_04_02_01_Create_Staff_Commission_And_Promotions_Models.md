# Task 04.02.01 — Create Staff, Commission and Promotions Models

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.01 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | High |
| Estimated Effort | 1.5 days |
| Dependencies | Phase 01 `User` model in `backend/apps/accounts/`; Phase 03 `Sale`, `Shift`, and `Return` models in `backend/apps/pos/` |
| Produces | Django model migrations for the `hr`, `promotions`, `pos`, and `accounts` apps |
| Blocked By | Nothing — this is the first task of SubPhase 04.02 |

---

## Objective

Define all new Django models, `TextChoices` enums, and field additions required by SubPhase 04.02. This single migration block, spread across four apps, provides the complete data layer for commission tracking, time clocking, promotions, customer pricing rules, expense logging, and cash movement recording. Every subsequent task in this subphase depends on the models defined here being migrated and available in the database.

---

## Instructions

### Step 1: Register New Apps in INSTALLED_APPS

Before writing any models or running any migrations, confirm that both `backend.apps.hr` and `backend.apps.promotions` are listed in the `INSTALLED_APPS` setting in `backend/config/settings.py`. Create the app directories with the standard Django structure: each must have `__init__.py`, `apps.py`, `models.py`, `admin.py`, `serializers.py`, `urls.py`, and a `migrations/` subdirectory with its own `__init__.py`. Also create a `views/` subdirectory in each app with its own `__init__.py`.

If either app is not in `INSTALLED_APPS`, Django will silently ignore the models and the migration commands will produce no output. Verify by running `poetry run python manage.py check` after updating the setting — the check command must complete with no errors before proceeding.

### Step 2: Declare TextChoices Enums

In `backend/apps/promotions/models.py`, define the promotions type enum at the top of the file, before any model class:

`PromotionType(models.TextChoices)` with the following members: `CART_PERCENTAGE = 'CART_PERCENTAGE', 'Cart Percentage'`; `CART_FIXED = 'CART_FIXED', 'Cart Fixed'`; `CATEGORY_PERCENTAGE = 'CATEGORY_PERCENTAGE', 'Category Percentage'`; `BOGO = 'BOGO', 'Buy One Get One'`; `MIX_AND_MATCH = 'MIX_AND_MATCH', 'Mix and Match'`; `PROMO_CODE = 'PROMO_CODE', 'Promo Code'`.

In `backend/apps/pos/models.py`, define two enums after existing imports and before the existing model classes:

`ExpenseCategory(models.TextChoices)` with members: `RENT = 'RENT', 'Rent'`; `SALARIES = 'SALARIES', 'Salaries'`; `UTILITIES = 'UTILITIES', 'Utilities'`; `ADVERTISING = 'ADVERTISING', 'Advertising'`; `MAINTENANCE = 'MAINTENANCE', 'Maintenance'`; `MISCELLANEOUS = 'MISCELLANEOUS', 'Miscellaneous'`; `OTHER = 'OTHER', 'Other'`.

`CashMovementType(models.TextChoices)` with members: `OPENING_FLOAT = 'OPENING_FLOAT', 'Opening Float'`; `PETTY_CASH_OUT = 'PETTY_CASH_OUT', 'Petty Cash Out'`; `MANUAL_IN = 'MANUAL_IN', 'Manual Cash In'`; `MANUAL_OUT = 'MANUAL_OUT', 'Manual Cash Out'`.

### Step 3: Extend the User Model

Open `backend/apps/accounts/models.py`. On the existing `User` model, add two new fields after any existing field declarations but before `class Meta`:

- `commission_rate`: `DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)`. Nullable so that staff who do not earn commission have an explicit `None` rather than a default zero, which would cause the commission service to create zero-amount records.
- `clocked_in_at`: `DateTimeField(null=True, blank=True)`. This is the denormalised current clock-in timestamp on the user record, used for fast checks ("is this user already clocked in?") without querying the `TimeClock` table. The canonical record lives in `TimeClock`; this field is a convenience mirror that is kept in sync atomically by the clock-in and clock-out views.

Both fields must be nullable to preserve all existing `User` records during migration without requiring a default value.

Run:

`poetry run python manage.py makemigrations accounts --name add_commission_rate_clocked_in_at_to_user`

Open the generated migration file and confirm it adds exactly two fields to the `accounts_user` table. Apply it immediately with `poetry run python manage.py migrate accounts`.

### Step 4: Extend the Sale Model

Open `backend/apps/pos/models.py`. On the existing `Sale` model, add:

- `applied_promotions`: `JSONField(null=True, blank=True)`. This stores a JSON array of serialised `AppliedDiscount` snapshot objects at the moment the sale is completed. Using `JSONField` (from `django.db.models`) preserves the discount breakdown as structured data for reporting and audit without requiring a separate junction table. The field is nullable — sales completed before this migration or sales with no promotions applied will have `None`.

Import `JSONField` from `django.db.models` at the top of the file if not already present.

Run:

`poetry run python manage.py makemigrations pos --name add_applied_promotions_to_sale`

Inspect the generated migration. Apply with `poetry run python manage.py migrate pos`.

### Step 5: Define CommissionRecord in backend/apps/hr/models.py

Import `uuid`, `Decimal` (for default validation), `models` from `django.db`, and `settings` if using `AUTH_USER_MODEL`.

Define the `CommissionRecord` model with these fields:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='commission_records')`.
- `sale`: `ForeignKey('pos.Sale', on_delete=models.PROTECT, related_name='commission_record')`. The `related_name` is singular because at most one commission record per salesperson is expected per sale (the salesperson on the sale header, not per line). If per-line commission is ever needed in a future subphase, this constraint can be revisited.
- `user`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='commission_records')`.
- `base_amount`: `DecimalField(max_digits=14, decimal_places=2)`. The sale total or return refund amount that commission was computed against.
- `commission_rate`: `DecimalField(max_digits=5, decimal_places=2)`. A snapshot of the user's commission rate at the time the record was created. This is critical — it must not change retroactively if the user's rate is later updated.
- `earned_amount`: `DecimalField(max_digits=14, decimal_places=2)`. The computed commission amount. May be negative for return reversal records.
- `is_paid`: `BooleanField(default=False)`.
- `commission_payout`: `ForeignKey('CommissionPayout', on_delete=models.SET_NULL, null=True, blank=True, related_name='records')`. Populated when the record is included in a processed payout.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: add `indexes = [models.Index(fields=['tenant', 'user']), models.Index(fields=['sale'])]`. Add `verbose_name = 'Commission Record'`. Add `ordering = ['-created_at']`.

### Step 6: Define CommissionPayout in backend/apps/hr/models.py

Define the `CommissionPayout` model with these fields:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='commission_payouts')`.
- `user`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='commission_payouts')`. The staff member receiving the payout.
- `period_start`: `DateTimeField()`. The beginning of the payout period (inclusive).
- `period_end`: `DateTimeField()`. The end of the payout period (inclusive).
- `total_earned`: `DecimalField(max_digits=14, decimal_places=2)`. The sum of all `CommissionRecord.earned_amount` values included in this payout. May reflect a net of positive and negative records.
- `paid_at`: `DateTimeField(auto_now_add=True)`. Timestamp when the payout record was created.
- `authorized_by`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='authorized_payouts')`. The Manager or Owner who triggered the payout.
- `notes`: `TextField(blank=True)`. Optional memo field for the payout record.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'user'])]`. `ordering = ['-paid_at']`. `verbose_name = 'Commission Payout'`.

### Step 7: Define TimeClock in backend/apps/hr/models.py

Define the `TimeClock` model with these fields:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='time_clocks')`.
- `user`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='time_clocks')`.
- `clocked_in_at`: `DateTimeField()`. The actual clock-in timestamp for this session. This is the canonical record; `User.clocked_in_at` is a mirror updated atomically alongside this.
- `clocked_out_at`: `DateTimeField(null=True, blank=True)`. Null means the session is still open (the user is currently clocked in).
- `shift`: `ForeignKey('pos.Shift', on_delete=models.SET_NULL, null=True, blank=True, related_name='time_clocks')`. Optional link to the POS shift that was open when the staff member clocked in.
- `notes`: `TextField(blank=True)`. Populated on clock-out if the staff member or a manager adds a note.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'user']), models.Index(fields=['shift'])]`. `ordering = ['-clocked_in_at']`. `verbose_name = 'Time Clock Entry'`.

### Step 8: Define Promotion in backend/apps/promotions/models.py

Import `uuid`, `models`, `Q` from `django.db.models`, `UniqueConstraint`, `Index`. Import `PromotionType` (defined in the same file above).

Define the `Promotion` model with these fields:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='promotions')`.
- `name`: `CharField(max_length=255)`. Human-readable name displayed to cashiers and in reports.
- `type`: `CharField(max_length=30, choices=PromotionType.choices)`.
- `value`: `DecimalField(max_digits=10, decimal_places=2)`. The numeric value of the promotion — interpreted as a percentage for percentage types, as a fixed currency amount for fixed types, and as a capped item value for BOGO/MIX_AND_MATCH.
- `promo_code`: `CharField(max_length=50, blank=True, null=True)`. Only populated for `PROMO_CODE` type promotions. Stored in uppercase. The uniqueness constraint (see `Meta`) prevents two active promotions for the same tenant from sharing a code.
- `target_category`: `ForeignKey('pos.Category', on_delete=models.SET_NULL, null=True, blank=True, related_name='promotions')`. Only used for `CATEGORY_PERCENTAGE` type.
- `min_quantity`: `PositiveIntegerField(null=True, blank=True)`. Only used for `BOGO` and `MIX_AND_MATCH` types — the minimum total item count needed to trigger the promotion.
- `starts_at`: `DateTimeField(null=True, blank=True)`. Null means the promotion has no start gate — it is active from its creation.
- `ends_at`: `DateTimeField(null=True, blank=True)`. Null means the promotion has no expiry.
- `is_active`: `BooleanField(default=True)`.
- `description`: `TextField(blank=True)`. Operator notes about the promotion's intent.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'is_active'])]`. `constraints = [UniqueConstraint(fields=['tenant', 'promo_code'], condition=Q(promo_code__isnull=False), name='unique_promo_code_per_tenant')]`. `ordering = ['-created_at']`. `verbose_name = 'Promotion'`.

### Step 9: Define CustomerPricingRule in backend/apps/promotions/models.py

Define the `CustomerPricingRule` model with these fields:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='customer_pricing_rules')`.
- `customer_tag`: `CharField(max_length=100)`. A tag string that is matched against the customer's tag list. Examples: `'wholesale'`, `'vip'`, `'employee'`.
- `variant`: `ForeignKey('pos.ProductVariant', on_delete=models.SET_NULL, null=True, blank=True, related_name='pricing_rules')`. If null, the rule applies to all variants for customers with this tag. If set, the rule applies only to this specific variant.
- `price`: `DecimalField(max_digits=12, decimal_places=2)`. The override price for qualifying customers. The evaluation engine only applies this rule when `rule.price < line.unit_price` — it is never a price-raiser.
- `starts_at`: `DateTimeField(null=True, blank=True)`.
- `ends_at`: `DateTimeField(null=True, blank=True)`.
- `is_active`: `BooleanField(default=True)`.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'customer_tag']), models.Index(fields=['variant'])]`. `verbose_name = 'Customer Pricing Rule'`.

### Step 10: Define Expense in backend/apps/pos/models.py

Define the `Expense` model after the `CashMovementType` enum:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='expenses')`.
- `category`: `CharField(max_length=30, choices=ExpenseCategory.choices)`.
- `amount`: `DecimalField(max_digits=12, decimal_places=2)`. Always positive — a positive value represents money leaving the business.
- `description`: `TextField()`. Required, non-blank description of what the expense was for.
- `receipt_image_url`: `URLField(blank=True, null=True)`. S3 object URL set after a successful presigned PUT upload.
- `recorded_by`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recorded_expenses')`.
- `expense_date`: `DateField()`. The date the expense occurred or was incurred, as entered by the operator. Uses `DateField` (not `DateTimeField`) because expenses are dated to a day, not a specific time.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'expense_date'])]`. `ordering = ['-expense_date', '-created_at']`. `verbose_name = 'Expense'`.

### Step 11: Define CashMovement in backend/apps/pos/models.py

Define the `CashMovement` model:

- `id`: `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `tenant`: `ForeignKey('accounts.Tenant', on_delete=models.PROTECT, related_name='cash_movements')`.
- `shift`: `ForeignKey('Shift', on_delete=models.CASCADE, related_name='cash_movements')`. Using `CASCADE` so that if an orphaned test shift is deleted, its cash movements are also cleaned up. In production, shifts are never deleted.
- `type`: `CharField(max_length=30, choices=CashMovementType.choices)`.
- `amount`: `DecimalField(max_digits=12, decimal_places=2)`. Always stored as a positive number. The `type` field determines whether this is a cash inflow or outflow.
- `reason`: `TextField(blank=True)`. Required for `PETTY_CASH_OUT` at the serializer level; optional for other types.
- `authorized_by`: `ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='authorized_cash_movements')`. Optional reference to a Manager or Owner who authorised the movement. `SET_NULL` so that CashMovement records survive if an authorising user is deleted.
- `created_at`: `DateTimeField(auto_now_add=True)`.

In `class Meta`: `indexes = [models.Index(fields=['tenant', 'shift'])]`. `ordering = ['-created_at']`. `verbose_name = 'Cash Movement'`.

### Step 12: Generate and Apply All Remaining Migrations

Run migration generation for the two new apps and the `pos` app extension, in this order:

`poetry run python manage.py makemigrations hr --name add_commission_timeclock_models`

`poetry run python manage.py makemigrations promotions --name add_promotion_pricing_rule_models`

`poetry run python manage.py makemigrations pos --name add_expense_cash_movement_models`

Review each generated migration file before applying. Confirm that:
- The `hr` migration creates three tables: `hr_commissionrecord`, `hr_commissionpayout`, `hr_timeclock`.
- The `promotions` migration creates two tables: `promotions_promotion`, `promotions_customerpricingrule`.
- The `pos` migration creates two tables: `pos_expense`, `pos_cashmovement`.

Apply all pending migrations in one command:

`poetry run python manage.py migrate`

Confirm with `poetry run python manage.py migrate --check` that zero pending migrations remain.

### Step 13: Register Models in Admin

In `backend/apps/hr/admin.py`, register `CommissionRecord`, `CommissionPayout`, and `TimeClock` using `admin.site.register()`. In `backend/apps/promotions/admin.py`, register `Promotion` and `CustomerPricingRule`. In `backend/apps/pos/admin.py`, add `Expense` and `CashMovement` to the existing registrations. Admin registration is required now so that developers and QA can inspect records through the Django admin interface during integration testing of later tasks.

---

## Expected Output

- Three new models in `backend/apps/hr/models.py`: `CommissionRecord`, `CommissionPayout`, `TimeClock`.
- Two new models in `backend/apps/promotions/models.py`: `Promotion`, `CustomerPricingRule`. Three `TextChoices` enums: `PromotionType` (in `promotions`), `ExpenseCategory` and `CashMovementType` (in `pos`).
- Two new models in `backend/apps/pos/models.py`: `Expense`, `CashMovement`.
- Updated `User` model with `commission_rate` and `clocked_in_at`.
- Updated `Sale` model with `applied_promotions`.
- All migrations generated and applied. Zero pending migrations.

---

## Validation

- Open Django shell with `poetry run python manage.py shell`. Import all new models: `from backend.apps.hr.models import CommissionRecord, CommissionPayout, TimeClock` — no import errors.
- `from backend.apps.promotions.models import Promotion, CustomerPricingRule, PromotionType` — no import errors.
- `from backend.apps.pos.models import Expense, CashMovement, ExpenseCategory, CashMovementType` — no import errors.
- `poetry run python manage.py migrate --check` exits with code 0 (zero pending migrations).
- `CommissionRecord.objects.count()` returns 0 (empty table, not an error).
- `Promotion._meta.get_field('promo_code')` returns the field without error.
- `Promotion._meta.constraints` contains `unique_promo_code_per_tenant` constraint.
- `User._meta.get_field('commission_rate')` returns a `DecimalField`.
- `Sale._meta.get_field('applied_promotions')` returns a `JSONField`.

---

## Notes

The forward reference strings (`'pos.Sale'`, `'pos.Shift'`, `'pos.Category'`, `'pos.ProductVariant'`, `'accounts.Tenant'`) are used in `ForeignKey` declarations within the `hr` and `promotions` apps to avoid circular imports. Django's app registry resolves these strings at startup.

The `clocked_in_at` field on `User` is intentionally denormalised — it is a performance optimisation that allows the clock-in check in `ClockInView` to avoid an additional join. The canonical clock-in record always lives in `TimeClock`. Both must be updated atomically in `with transaction.atomic():` blocks within the clock-in and clock-out views.

The `commission_payout` foreign key on `CommissionRecord` uses `SET_NULL` rather than `CASCADE`. This means that if a `CommissionPayout` is ever manually deleted (e.g., by a developer correcting an error in a staging environment), the individual `CommissionRecord` rows remain intact and can be re-paid. This preserves audit history.
