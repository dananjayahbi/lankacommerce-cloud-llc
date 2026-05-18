# Task 02.01.08 — Build Category & Brand API Routes

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Tasks 02.01.01 and 02.01.06 (Category & Brand models and service layer), Task 01.02 (JWT auth, HasPermission) |

---

## Objective

This task exposes category and brand data through Django REST Framework API views. Four view classes handle listing, creating, retrieving, updating, and soft-deleting categories and brands. URL patterns are registered in the catalog app's URL configuration and included in the project-level URL router. All views enforce JWT authentication and permission-based access control. Responses follow the standard LankaCommerce JSON envelope.

---

## Instructions

### Step 1: Define the Category List and Create View

Open `backend/apps/catalog/views.py`. Add the necessary imports: `APIView` from `rest_framework.views`, the `Response` class and HTTP status constants from `rest_framework`, `JWTAuthentication` from `rest_framework_simplejwt.authentication`, `IsAuthenticated` from `rest_framework.permissions`, and the custom `HasPermission` class from `apps.accounts.permissions`.

Define `CategoryListCreateView` inheriting from `APIView`. Set `authentication_classes` to a list containing `JWTAuthentication`. Set `permission_classes` to a list containing `IsAuthenticated` and `HasPermission`.

Implement a `get` method that performs the following steps:

1. Extracts `tenant_id` from `request.user.tenant_id`. This value is decoded from the verified JWT and is always trustworthy — it must never be read from query parameters or the request body.
2. Checks whether the query parameter `?tree=true` is present. If so, calls `product_service.get_category_tree(tenant_id)` to retrieve a hierarchically ordered structure. Otherwise, calls `product_service.get_all_categories(tenant_id)`.
3. Serializes the result using `CategorySerializer`.
4. Returns a `Response` object following the standard envelope format: a JSON object with `success=True` and `data` holding the serialized list.

Implement a `post` method that performs the following steps:

1. Extracts `tenant_id` and `actor_id` from `request.user`.
2. Instantiates `CreateCategorySerializer` with `request.data` and calls `.is_valid()`. If validation fails, returns a 400 response with the validation errors embedded in the standard envelope.
3. Calls `product_service.create_category(tenant_id, actor_id, serializer.validated_data)`.
4. Catches `ConflictError` raised by the service layer and returns a 409 response with an error message in the standard envelope.
5. On success, returns a 201 response with the created category data.

### Step 2: Define the Category Detail View

Define `CategoryDetailView` inheriting from `APIView` with the same `authentication_classes` and `permission_classes`.

Implement a `get` method that accepts `category_id` from the URL path converter. Calls `product_service.get_category_by_id(tenant_id, category_id)`. Serializes the result using `CategorySerializer` and returns a 200 envelope response.

Implement a `patch` method that validates incoming data using `UpdateCategorySerializer`. On valid data, calls `product_service.update_category(tenant_id, category_id, actor_id, validated_data)`. Returns the updated category in a 200 envelope response. Returns 404 if the category does not exist for the tenant.

Implement a `delete` method that calls `product_service.soft_delete_category(tenant_id, category_id, actor_id)`. On success, returns a 200 response with `success=True` and a `message` field such as "Category deleted successfully." Catches `ConflictError` (raised when the category still contains active products) and returns 409 with an appropriate error message.

### Step 3: Define the Brand List and Create View

Define `BrandListCreateView` inheriting from `APIView` with the same authentication and permission classes. Implement `get` and `post` methods following exactly the same patterns as the category views, but targeting brand service functions (`get_all_brands`, `create_brand`) and brand serializers (`BrandSerializer`, `CreateBrandSerializer`).

The brand list endpoint URL segment is `/api/catalog/brands/`.

### Step 4: Define the Brand Detail View

Define `BrandDetailView` inheriting from `APIView`. Implement `get`, `patch`, and `delete` methods following the same patterns as `CategoryDetailView`, but targeting brand service functions (`get_brand_by_id`, `update_brand`, `soft_delete_brand`) and brand serializers.

The brand detail URL segment is `/api/catalog/brands/{id}/`.

### Step 5: Define URL Patterns for the Catalog App

Create or open `backend/apps/catalog/urls.py`. Import `path` from `django.urls` and import all four view classes: `CategoryListCreateView`, `CategoryDetailView`, `BrandListCreateView`, and `BrandDetailView`.

Define a `urlpatterns` list with the following four entries:

- Map the path `categories/` to `CategoryListCreateView.as_view()`.
- Map the path `categories/<uuid:category_id>/` to `CategoryDetailView.as_view()`.
- Map the path `brands/` to `BrandListCreateView.as_view()`.
- Map the path `brands/<uuid:brand_id>/` to `BrandDetailView.as_view()`.

Use `<uuid:...>` path converters to automatically validate that ID segments in the URL are syntactically valid UUID strings and to receive them as UUID objects in view methods. Malformed ID segments will return a Django 404 response before reaching the view.

### Step 6: Include Catalog URLs in the Project Router

Open `backend/config/urls.py` (the project-level URL configuration established in SubPhase 01.01). Import `include` from `django.urls` if it is not already present. Add a new `path` entry that maps the prefix `api/catalog/` to `include('apps.catalog.urls')`. After this change, all catalog endpoints become accessible under the `/api/catalog/` root path.

### Step 7: Apply Granular Permission Strings

Review the permission strings used in the `HasPermission` class checks within the category and brand views. Read operations (GET on both list and detail views) should require the `catalog:view` permission string. Write and delete operations (POST, PATCH, DELETE) should require the `catalog:manage_categories` or `catalog:manage_brands` permission strings respectively. These permission strings must match the permission definitions established in SubPhase 01.02.

Consult the `HasPermission` class documentation or implementation to understand how permission strings are passed. Typically, `HasPermission` is instantiated or configured with a required permission string per view or per HTTP method.

### Step 8: Verify Authentication and Tenant Isolation

Start the Django development server. Use a REST client to send a `GET` request to `/api/catalog/categories/` without an `Authorization` header. Confirm that the response is HTTP 401 with the standard error envelope containing an appropriate error code.

Then authenticate as a user belonging to Tenant A and request the category list. Confirm the response contains only Tenant A's categories. Authenticate as a user from Tenant B and confirm the response never includes Tenant A's categories.

---

## Expected Output

- `CategoryListCreateView`, `CategoryDetailView`, `BrandListCreateView`, and `BrandDetailView` defined in `backend/apps/catalog/views.py`
- URL patterns for all four views defined in `backend/apps/catalog/urls.py`
- Catalog URLs included in `backend/config/urls.py` under the `api/catalog/` prefix
- All views return 401 for unauthenticated requests and enforce tenant isolation

---

## Validation

- [ ] `GET /api/catalog/categories/` returns 401 without a valid JWT
- [ ] `GET /api/catalog/categories/` returns a category list with the standard response envelope when authenticated
- [ ] `POST /api/catalog/categories/` returns 201 on valid data
- [ ] `POST /api/catalog/categories/` returns 409 when a category with the same name already exists under the tenant
- [ ] `PATCH /api/catalog/categories/{id}/` returns 200 on valid partial update data
- [ ] `DELETE /api/catalog/categories/{id}/` soft-deletes the category — the record remains in the database with `deleted_at` set
- [ ] `DELETE /api/catalog/categories/{id}/` returns 409 if the category has active products
- [ ] Brand endpoints behave identically to category endpoints
- [ ] A UUID path segment containing an invalid format returns 404 from Django's path converter
- [ ] Authenticated user from Tenant A cannot see Tenant B's categories or brands

---

## Notes

- The `HasPermission` class from `apps.accounts.permissions` is the only mechanism for permission enforcement in catalog views. Do not use Django's built-in `DjangoModelPermissions` class, as it does not integrate with the role-based permission system established in SubPhase 01.02.
- `tenant_id` is always sourced from `request.user.tenant_id`, which is decoded from the verified and signed JWT. It is never trusted from `request.data` or `request.query_params` — doing so would allow cross-tenant data access.
- All error responses must follow the standard envelope format: a JSON object with `success=False` and an `error` object containing a `code` string (such as `"DUPLICATE_CATEGORY"`) and a `message` string. Do not return raw DRF error dictionaries.
- Keep view methods as thin as possible. The view's only responsibilities are: authenticate the request, extract inputs, call the service layer, serialize the output, and return an envelope response. Business logic belongs exclusively in service functions.
