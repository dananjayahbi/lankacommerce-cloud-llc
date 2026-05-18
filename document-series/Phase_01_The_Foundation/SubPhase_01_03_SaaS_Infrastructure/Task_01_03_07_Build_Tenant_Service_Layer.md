# Task 01.03.07 — Build Tenant Service Layer (Django)

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.07 |
| Title | Build Tenant Service Layer (Django) |
| Working Directory | `backend/` |
| Prerequisites | Task 01.03.01 (all tenant models defined and migrated), Task 01.02.01 (CustomUser model), AuditLog model from Task 01.02.08 or equivalent |
| Estimated Time | 3 hours |
| Status | [ ] Not Started |

---

## Objective

Centralise all tenant business logic into a dedicated Python service module at `backend/apps/tenants/services/tenant_service.py`. This module acts as the intermediary between the Django ORM and the DRF views, keeping views thin and focused on HTTP concerns (request parsing, response serialisation, error status codes) while the service layer owns data access, validation, and transactional logic. By isolating business logic in a service, the codebase becomes easier to test, easier to read, and prevents duplicate query logic from spreading across multiple view files.

---

## Instructions

### Step 1: Create the Services Directory

Navigate to `backend/apps/tenants/`. Create a subdirectory named `services/`. Inside `services/`, create an `__init__.py` file to mark it as a Python package. Then create the main module file `tenant_service.py` inside `services/`.

At the top of `tenant_service.py`, add all necessary imports: the Tenant, Plan, Subscription, and Invoice models from `apps.tenants.models`; the CustomUser model from `apps.accounts.models`; the AuditLog model from its registered app; Django's `transaction` decorator from `django.db`; `ObjectDoesNotExist` and `IntegrityError` from `django.core.exceptions` and `django.db` respectively; `make_password` from `django.contrib.auth.hashers`; standard library modules `uuid`, `datetime`, and `timezone` from Python's `datetime` module; and the `Decimal` type from `decimal`. Add Python type hint imports (`Optional`, `Tuple`, `List`, `Dict`, `Any`) from the `typing` module.

### Step 2: Define get_all_tenants

Define a function named `get_all_tenants` that accepts the following parameters:

- `search`: an optional string defaulting to None.
- `status`: an optional string defaulting to None.
- `page`: an integer defaulting to 1.
- `limit`: an integer defaulting to 20.

Inside the function, begin with a base queryset that selects all Tenant records where `deleted_at` is null (soft-delete filter). Apply `select_related` with the related subscription and plan if the data model supports it, or use `prefetch_related` for the subscriptions relationship to avoid N+1 queries on the plan name field.

If the `search` parameter is not None and not empty, apply an OR filter using Django's Q objects: filter for records where `name__icontains=search` or `slug__icontains=search`. Attach the Q filter to the queryset using the filter method.

If the `status` parameter is not None and not empty, add a direct `status=status` filter to the queryset.

Apply `order_by("-created_at")` to the queryset so that the most recently created tenants appear first.

Compute the total count of matching records using the queryset's `count()` method before applying pagination (so pagination does not affect the total).

Slice the queryset using Python's list slicing syntax to return only the records for the current page: the start offset is `(page - 1) * limit` and the end offset is `page * limit`.

Return a tuple of `(page_queryset, total_count)`.

### Step 3: Define get_tenant_by_id

Define a function named `get_tenant_by_id` that accepts a single parameter `tenant_id` of type string or UUID.

Inside the function, use a try-except block. In the try block, call `Tenant.objects.select_related()` to eagerly load the related subscription and plan, and use `prefetch_related` to load the related `invoices` (ordered by `billing_date` descending, limited to 10) and `users` (limited to 5, ordered by `created_at`). Filter by `id=tenant_id` and `deleted_at__isnull=True`. Call `.get()` to retrieve the single matching record.

In the except block, catch `Tenant.DoesNotExist` (which is the model-specific form of `ObjectDoesNotExist`) and return None.

Return the retrieved Tenant instance on success.

Note on the prefetch limit: Django's `prefetch_related` does not natively support `LIMIT` on the related queryset in older versions. Use a `Prefetch` object with a custom queryset that includes slicing, or apply the limit in the serializer layer. Document whichever approach is chosen.

### Step 4: Define create_tenant

Define a function named `create_tenant` that accepts the following parameters with type annotations:

- `store_name`: string — the display name of the new store.
- `slug`: string — the unique subdomain identifier.
- `owner_email`: string — email address for the initial OWNER user.
- `hashed_password`: string — the already-hashed password string (hashing must happen in the view layer before calling this function, using Django's `make_password` function).
- `timezone`: string — IANA timezone string.
- `currency`: string — ISO 4217 currency code.
- `vat_rate`: Decimal — the VAT rate.
- `sscl_rate`: Decimal — the SSCL rate.
- `plan_id`: string or UUID — the UUID of the Plan to subscribe the tenant to.

Decorate the entire function body with `@transaction.atomic` to ensure all three database writes (Tenant, User, Subscription) succeed or fail together.

Inside the function:

First, look up the Plan by `plan_id`. If the Plan does not exist, raise a `ValueError` with the message "Plan not found." Verify that `plan.is_active` is True; if not, raise a `ValueError` with the message "Selected plan is not available."

Second, create the Tenant record using `Tenant.objects.create()`. Pass: `name=store_name`, `slug=slug`, `status=TenantStatus.ACTIVE`, and `settings` as a dictionary constructed from the timezone, currency, vat_rate, sscl_rate, and an empty string receiptFooter.

If `Tenant.objects.create()` raises an `IntegrityError` (most likely due to a duplicate slug), catch the error and re-raise it as a `ValueError` with the message "A tenant with this slug already exists."

Third, create the owner CustomUser using `CustomUser.objects.create()`. Pass: `email=owner_email`, `password=hashed_password`, `role="OWNER"`, `is_active=True`, and `tenant=tenant_instance` (the Tenant just created).

Fourth, compute billing dates. Set `current_period_start` to `datetime.now(tz=timezone.utc)`. Set `current_period_end` to `current_period_start` plus 30 days using a `timedelta`. Set `next_billing_date` to the same value as `current_period_end`.

Fifth, create the Subscription record using `Subscription.objects.create()`. Pass: `tenant=tenant_instance`, `plan=plan`, `status=SubscriptionStatus.ACTIVE`, `current_period_start=current_period_start`, `current_period_end=current_period_end`, `next_billing_date=next_billing_date`.

Return the created Tenant instance.

### Step 5: Define update_tenant_status

Define a function named `update_tenant_status` that accepts:

- `tenant_id`: string or UUID.
- `new_status`: string (one of the TenantStatus enum values).
- `actor_id`: string or UUID of the user performing the action (for audit logging).
- `grace_ends_at`: an optional datetime defaulting to None.

Use `@transaction.atomic`.

Inside the function, retrieve the Tenant by ID with `Tenant.objects.select_for_update().get(id=tenant_id, deleted_at__isnull=True)`. The `select_for_update()` acquires a row-level lock during the transaction to prevent concurrent status update races.

Wrap this retrieval in a try-except block. Catch `Tenant.DoesNotExist` and raise a `ValueError` with the message "Tenant not found."

Store the old status string. Set `tenant.status = new_status`. If `grace_ends_at` is provided, set `tenant.grace_ends_at = grace_ends_at`. Call `tenant.save(update_fields=["status", "grace_ends_at", "updated_at"])` to perform a targeted update rather than saving all fields.

Write an AuditLog record capturing: `actor_id`, `action` (a string such as "TENANT_STATUS_CHANGED"), `entity_type` ("Tenant"), `entity_id` (the tenant UUID as a string), `details` (a JSON-serialisable dictionary with `old_status` and `new_status`). Use the AuditLog model as defined in SubPhase 01.02.

Return the updated Tenant instance.

### Step 6: Define Convenience Status Transition Functions

Define three convenience functions that call `update_tenant_status` with the correct status value:

**suspend_tenant**: Accepts `tenant_id` and `actor_id`. Calls `update_tenant_status(tenant_id, TenantStatus.SUSPENDED, actor_id)` and returns the result.

**reactivate_tenant**: Accepts `tenant_id` and `actor_id`. Calls `update_tenant_status(tenant_id, TenantStatus.ACTIVE, actor_id)`. Before calling, verify that the tenant's current status is either SUSPENDED or GRACE_PERIOD. If it is already ACTIVE, raise a `ValueError` with the message "Tenant is already active."

**trigger_grace_period**: Accepts `tenant_id`, `actor_id`, and `grace_days` (integer, defaulting to 14). Computes `grace_ends_at` as `datetime.now(tz=timezone.utc)` plus a `timedelta` of `grace_days` days. Calls `update_tenant_status(tenant_id, TenantStatus.GRACE_PERIOD, actor_id, grace_ends_at=grace_ends_at)` and returns the result.

### Step 7: Define get_active_tenant_by_slug

Define a function named `get_active_tenant_by_slug` that accepts a `slug` string parameter.

Inside the function, query the database for a Tenant record matching the slug, with `deleted_at__isnull=True`. Use Django ORM's `.values("id", "status")` method to retrieve only those two fields rather than fetching the full model instance. This minimal projection reduces database I/O and is intentional: this function is called on every request by the Next.js middleware status check endpoint, so it must be as fast as possible.

Use a try-except block. Call `.get(slug=slug)` on the values queryset. Catch `Tenant.DoesNotExist` and return None.

Return the dictionary with `id` and `status` on success.

### Step 8: Apply Consistent Error Handling

Review all functions defined above and confirm that they follow these error-handling conventions:

- **Missing records**: Always raise `ValueError` with a descriptive message when a model instance is not found. Never return None silently from functions that are expected to always find a record (except for `get_tenant_by_id` and `get_active_tenant_by_slug`, where None is an acceptable and documented return value).
- **Integrity errors**: Catch Django's `IntegrityError` (from `django.db`) for constraint violations such as duplicate slugs and re-raise as `ValueError` with a user-readable message.
- **Transaction rollback**: Because create_tenant and update_tenant_status use `@transaction.atomic`, any uncaught exception within the atomic block will automatically roll back the entire transaction. Do not call `transaction.set_rollback(True)` manually unless you have a specific reason to.

### Step 9: Apply Type Annotations Throughout

Review every function signature in `tenant_service.py` and ensure that all parameters have type annotations and that the return type is declared. Use `Optional[str]` for parameters that can be None. Use `Tuple[QuerySet, int]` for the return type of `get_all_tenants`. Use `Optional[Tenant]` for functions that may return None.

Type annotations are not enforced at runtime by Python, but they serve as documentation and enable type-checking tools to catch potential errors during development.

---

## Expected Output

After completing this task, the following artifacts exist:

- `backend/apps/tenants/services/__init__.py` — empty package marker.
- `backend/apps/tenants/services/tenant_service.py` — the complete service module with seven public functions: `get_all_tenants`, `get_tenant_by_id`, `create_tenant`, `update_tenant_status`, `suspend_tenant`, `reactivate_tenant`, `trigger_grace_period`, and `get_active_tenant_by_slug`.
- All DRF views that previously contained inline queryset logic are refactored to call the appropriate service functions, keeping view methods under approximately 20 lines each.

---

## Validation

- [ ] Importing `tenant_service` from the Django shell raises no errors.
- [ ] Calling `get_all_tenants()` with no arguments returns a tuple of (queryset, count) for all non-deleted tenants.
- [ ] Calling `get_all_tenants(search="Dilani")` returns only tenants whose name or slug contains "dilani" (case-insensitive).
- [ ] Calling `create_tenant(...)` with valid arguments creates Tenant, CustomUser, and Subscription records atomically.
- [ ] Calling `create_tenant(...)` with a duplicate slug raises a `ValueError` and creates no database records (transaction rolled back).
- [ ] Calling `suspend_tenant(tenant_id, actor_id)` changes the tenant's status to SUSPENDED and writes an AuditLog record.
- [ ] Calling `reactivate_tenant(tenant_id, actor_id)` on an already ACTIVE tenant raises a `ValueError`.
- [ ] Calling `trigger_grace_period(tenant_id, actor_id, grace_days=7)` sets `status=GRACE_PERIOD` and sets `grace_ends_at` to approximately 7 days from now.
- [ ] Calling `get_active_tenant_by_slug("dilani")` returns a dictionary with `id` and `status` keys.
- [ ] Calling `get_active_tenant_by_slug("nonexistent")` returns None.

---

## Notes

- The service layer uses `@transaction.atomic` as a function decorator rather than as a context manager. Both approaches are equivalent, but the decorator form is cleaner when the entire function body should be atomic.
- The `select_for_update()` in `update_tenant_status` is a pessimistic locking strategy. For a small-scale SaaS admin operation where concurrent status updates are rare, this is acceptable. If the platform scales to a point where concurrent updates become a concern, consider using an optimistic locking strategy with a `version` field on the Tenant model instead.
- The `get_active_tenant_by_slug` function is specifically optimised for high-frequency calls from the Next.js middleware. If the LankaCommerce platform grows to thousands of requests per second, this function is a candidate for Redis caching with a short TTL (30–60 seconds). The cache invalidation point would be any call to `update_tenant_status`. This caching layer is not implemented in this task but is worth noting for Phase 5.
