# Task 05.01.01 — Create Saved Report Model

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.01 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Low |
| Estimated Effort | 1 day |
| Dependencies | SP-01.02 (Auth and RBAC — Tenant and User models exist), SP-01.03 (SaaS Infrastructure — DRF configured, JWT auth working) |
| Produces | `backend/apps/reports/models.py` (SavedReport model), `backend/apps/reports/views/saved_report_views.py`, `backend/apps/reports/urls.py` (saved report endpoints), `backend/apps/reports/migrations/0001_add_saved_report_model.py` |
| Blocked By | SP-01.02, SP-01.03 |

---

## Objective

The `SavedReport` model is the persistence layer for user-saved report configurations. Store owners and managers frequently customise report filters — a specific date range, a particular product category, a granularity setting — and want to return to those exact views without reconfiguring the filters each time. Rather than storing rendered report snapshots (which would become stale), the model stores the filter parameters and report type so that when a user loads a saved report, the frontend re-fetches fresh data using the stored configuration. This approach keeps saved reports always current while still providing one-click access to personalised views.

The model lives in the new `reports` Django app under `backend/apps/reports/`. It is deliberately minimal: five data fields plus the standard `created_at`/`updated_at` timestamps. The `filters` field uses Django's `JSONField` to accommodate the evolving shape of report filter parameters without schema migrations. A compound index on (`tenant_id`, `user_id`) ensures fast lookups when the frontend fetches the current user's saved reports list.

---

## Instructions

1. Create the `reports` Django app if it does not already exist:
   ```
   cd backend
   poetry run python manage.py startapp reports
   ```
   Move the generated `reports/` folder into `backend/apps/reports/` if using a nested apps structure.

2. Register the app in `backend/config/settings.py` under `INSTALLED_APPS`:
   ```
   'apps.reports',
   ```

3. Open `backend/apps/reports/models.py` and define the `SavedReport` model:

   ```
   import uuid
   from django.db import models

   class SavedReport(models.Model):
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='saved_reports')
       user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='saved_reports')
       name = models.CharField(max_length=100)
       report_type = models.CharField(max_length=50)
       filters = models.JSONField(null=True, blank=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           indexes = [
               models.Index(fields=['tenant', 'user']),
           ]
           verbose_name = 'Saved Report'
           verbose_name_plural = 'Saved Reports'

       def __str__(self):
           return self.name
   ```

   - `id`: UUID primary key; not editable after creation.
   - `tenant`: ForeignKey to the Tenant model. `CASCADE` delete — if a tenant is removed, its saved reports go with it.
   - `user`: ForeignKey to the User model. `CASCADE` delete — if a user is removed, their saved reports are removed.
   - `name`: Human-readable label, max 100 characters. Not unique — two users can have a report named "Weekly Summary".
   - `report_type`: Plain CharField, not an enum. Accepts values like `profit-loss`, `sales-by-product`, `revenue-trend`, etc. New types added by the frontend do not require a migration.
   - `filters`: JSONField storing arbitrary key-value pairs. Example: `{"from": "2026-01-01", "to": "2026-01-31", "granularity": "monthly"}`. Can be null for reports saved without custom filters.
   - `created_at`: Set automatically on creation.
   - `updated_at`: Set automatically on every save.
   - Compound index on (`tenant`, `user`) accelerates the most common query pattern: "get all saved reports for this user in this tenant".

4. Run the migration:
   ```
   poetry run python manage.py makemigrations reports --name add_saved_report_model
   poetry run python manage.py migrate
   ```

   Verify that the `reports_savedreport` table is created with all columns matching the model definition.

5. Create `backend/apps/reports/serializers.py` with a `SavedReportSerializer`:

   ```
   from rest_framework import serializers
   from apps.reports.models import SavedReport

   class SavedReportSerializer(serializers.ModelSerializer):
       class Meta:
           model = SavedReport
           fields = ['id', 'name', 'report_type', 'filters', 'created_at', 'updated_at']
           read_only_fields = ['id', 'created_at', 'updated_at']

       def validate_name(self, value):
           if not value or not value.strip():
               raise serializers.ValidationError('Report name must not be empty.')
           if len(value) > 100:
               raise serializers.ValidationError('Report name must not exceed 100 characters.')
           return value.strip()

       def validate_report_type(self, value):
           if not value or not value.strip():
               raise serializers.ValidationError('Report type must not be empty.')
           return value.strip()
   ```

   The serializer's `validate_*` methods enforce constraints that are not expressible at the database level (non-empty, max length). The `filters` field is not custom-validated because its structure varies by report type.

6. Create `backend/apps/reports/views/saved_report_views.py`:

   ```
   from rest_framework import status
   from rest_framework.response import Response
   from rest_framework.views import APIView
   from rest_framework.permissions import IsAuthenticated
   from apps.reports.models import SavedReport
   from apps.reports.serializers import SavedReportSerializer
   from apps.tenants.auth import JWTAuthentication, HasTenantPermission

   class SavedReportListCreateView(APIView):
       authentication_classes = [JWTAuthentication]
       permission_classes = [IsAuthenticated, HasTenantPermission]

       def get(self, request):
           reports = SavedReport.objects.filter(
               tenant_id=request.user.tenant_id,
               user_id=request.user.user_id
           ).order_by('-created_at')
           serializer = SavedReportSerializer(reports, many=True)
           return Response({'success': True, 'data': serializer.data})

       def post(self, request):
           serializer = SavedReportSerializer(data=request.data)
           if not serializer.is_valid():
               return Response(
                   {'success': False, 'error': {'code': 'VALIDATION_ERROR', 'message': serializer.errors}},
                   status=status.HTTP_400_BAD_REQUEST
               )
           saved_report = SavedReport.objects.create(
               tenant_id=request.user.tenant_id,
               user_id=request.user.user_id,
               name=serializer.validated_data['name'],
               report_type=serializer.validated_data['report_type'],
               filters=serializer.validated_data.get('filters')
           )
           output_serializer = SavedReportSerializer(saved_report)
           return Response(
               {'success': True, 'data': output_serializer.data},
               status=status.HTTP_201_CREATED
           )
   ```

   - `get`: Queries by `tenant_id` and `user_id` from the JWT payload, ordered by most recently created. Returns a list in a standard response envelope.
   - `post`: Validates the incoming payload with the serializer. On failure, returns 400 with per-field errors. On success, creates the record with `tenant_id` and `user_id` injected from the JWT — the user cannot spoof another tenant or user. Returns 201 with the serialized record.

7. Create `backend/apps/reports/urls.py`:

   ```
   from django.urls import path
   from apps.reports.views.saved_report_views import SavedReportListCreateView

   urlpatterns = [
       path('api/reports/saved/', SavedReportListCreateView.as_view(), name='saved-report-list-create'),
   ]
   ```

8. Include the reports URLs in the project-level `urls.py`:

   ```
   path('', include('apps.reports.urls')),
   ```

9. Run `poetry run python manage.py check` to confirm no import or configuration errors.

---

## Expected Output

- `backend/apps/reports/__init__.py`
- `backend/apps/reports/models.py` (containing `SavedReport` class)
- `backend/apps/reports/migrations/0001_add_saved_report_model.py`
- `backend/apps/reports/serializers.py`
- `backend/apps/reports/views/__init__.py`
- `backend/apps/reports/views/saved_report_views.py`
- `backend/apps/reports/urls.py`

---

## Validation

- [ ] Migration `0001_add_saved_report_model.py` runs cleanly; the `reports_savedreport` table is created with columns: `id`, `tenant_id`, `user_id`, `name`, `report_type`, `filters`, `created_at`, `updated_at`.
- [ ] Compound index exists on (`tenant_id`, `user_id`). Verify via `poetry run python manage.py sqlmigrate reports 0001`.
- [ ] `GET /api/reports/saved/` returns 200 with `{ "success": True, "data": [] }` when no saved reports exist.
- [ ] `POST /api/reports/saved/` with `{ "name": "My Report", "report_type": "profit-loss", "filters": {} }` returns 201 and includes the new report's `id`, `name`, `report_type`, `filters`, `created_at`, `updated_at`.
- [ ] `POST /api/reports/saved/` with `{ "name": "", "report_type": "profit-loss" }` returns 400 with a validation error on `name`.
- [ ] `POST /api/reports/saved/` without a valid JWT token returns 401.
- [ ] `POST /api/reports/saved/` with a name longer than 100 characters returns 400.
- [ ] `GET /api/reports/saved/` returns only reports belonging to the requesting user's tenant — reports from other tenants are never visible.
- [ ] Saving a report with `filters=null` succeeds and stores `NULL` in the database.
- [ ] Deleting a Tenant cascades to delete all associated `SavedReport` records.

---

## Notes

The `report_type` field being a plain `CharField` rather than a `TextChoices` enum is a deliberate trade-off. Adding a new report type on the frontend (for example, a future "Tax Summary" report) does not require a backend migration or code deployment. The cost is the loss of enum validation at the database level; validation shifts to the serializer if desired. For this use case, the flexibility benefit outweighs the strictness cost.

The compound index on (`tenant_id`, `user_id`) covers the primary query pattern, but note that it is not a unique constraint. A user can save multiple reports with the same name and report type — the `name` field is not unique even per user. If uniqueness becomes desirable later, add a `UniqueConstraint(fields=['tenant', 'user', 'name'])` in a migration.

The `filters` JSONField stores raw filter parameters without schema validation. The frontend is responsible for ensuring that the stored filters match the expected shape for the given `report_type`. A future enhancement could add a `validate_filters` method that checks required keys based on `report_type`. For now, the loose schema keeps the model simple and forwards-compatible.
