# Task 01.03.09 — Implement Tenant Status Middleware

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.09 |
| Title | Implement Tenant Status Middleware |
| Working Directory | `frontend/` (and `backend/` for the Django status endpoint) |
| Prerequisites | Task 01.02.05 (base auth middleware), Task 01.03.07 (tenant service layer with get_active_tenant_by_slug), Django running on port 8000 |
| Estimated Time | 2 hours |
| Status | [ ] Not Started |

---

## Objective

Extend the existing Next.js middleware to check tenant status on every store-route request. When a tenant's status is SUSPENDED, all requests to that store's routes are redirected to a dedicated suspension page. When the status is GRACE_PERIOD, the request proceeds but carries a header that the store layout reads to display a persistent warning banner. Active tenants pass through without any modification.

The key architectural decision in this task is that the middleware fetches tenant status from the Django API rather than querying the database directly or calling an internal Next.js Route Handler. The middleware runs on Next.js's Edge Runtime, which cannot execute Django ORM code. Making an HTTP call to the Django API is the clean, correct solution — functionally equivalent to the original design's internal Route Handler pattern, but simpler because no proxy layer is needed.

---

## Instructions

### Step 1: Understand the Existing Middleware

Open the existing middleware file at `frontend/src/middleware.ts`. This file was created in Task 01.02.05. It currently handles JWT authentication: it reads the `access_token` cookie, validates that it exists, and redirects unauthenticated users to `/login` for protected routes.

Read through the entire existing middleware logic before making any changes. Understand which routes are already excluded from authentication checks (public routes, static assets, API routes), what the current matcher configuration looks like, and where the tenant status check logically fits within the existing flow.

The tenant status check should only execute after the authentication check passes — there is no point checking tenant status for an unauthenticated user, since they will be redirected to login first.

### Step 2: Create the Django Tenant Status Endpoint

Before modifying the middleware, confirm that the required Django endpoint exists. Open `backend/apps/tenants/views.py` and look for a `TenantStatusView` class or function.

If this view does not yet exist, create it now. Define a `TenantStatusView` class inheriting from `rest_framework.views.APIView`. Set the `authentication_classes` and `permission_classes` to empty lists (no authentication required for this specific endpoint). The rationale: this endpoint only returns a tenant's `id` and `status` — no financial data, no personal data. It accepts only valid UUIDs which are already present in validated JWT tokens. Removing authentication from this single endpoint eliminates a potential circular dependency (the middleware would need a valid token to check tenant status, but status checking is part of determining whether the token-holder can proceed).

The view implements a single `get` method that accepts the tenant `id` from the URL kwargs. It calls `get_active_tenant_by_slug` or queries directly with `Tenant.objects.values("id", "status").get(id=tenant_id, deleted_at__isnull=True)`. On success, return a Response with `{"id": str(tenant.id), "status": tenant.status}`. On a Tenant.DoesNotExist exception, return a Response with HTTP 404 status and a `{"detail": "Tenant not found"}` body.

Open `backend/apps/tenants/urls.py` and register the TenantStatusView at the path `<uuid:tenant_id>/status/`, resulting in the full URL pattern `GET /api/tenants/{tenant_id}/status/`.

### Step 3: Define the Store Route Path Matcher

Inside the Next.js middleware file, define a helper function or a constant that determines whether a given URL pathname is a store route that requires tenant status enforcement.

A store route is any path that is NOT one of the following exclusions:

- Paths starting with `/superadmin` — super-admin pages do not belong to any tenant.
- Paths starting with `/api` — API routes are handled separately.
- Paths starting with `/_next` — Next.js internal assets.
- The exact path `/login` and `/suspended` — authentication and enforcement pages themselves.
- Paths starting with `/favicon` or `/public` — static assets.

The function accepts a pathname string and returns a boolean. Implement it using a series of `startsWith` and strict equality checks.

### Step 4: Resolve the Tenant Identifier

After the authentication check passes, and after confirming the current path is a store route, extract the tenant identifier from the request.

In the current implementation, the primary source of the tenant identifier is the JWT payload. Decode the access token from the `access_token` cookie using `decodeJwt` from the `jose` library (this is a payload-only decode, no signature verification needed in middleware — the Django API verifies signatures on actual data requests). Extract the `tenant_id` claim from the decoded payload.

If the `tenant_id` claim is absent from the JWT (for example, for SUPER_ADMIN users who have no associated tenant), skip the tenant status check and call `NextResponse.next()` immediately. Super-admin users can access the store sections in a future administrative preview feature, but for now, skipping the check for super admins is the safe default.

In production, additionally check the request's hostname. If the hostname is not `localhost`, extract the subdomain from the hostname (the portion before the first dot) and use it as the tenant slug for an alternative lookup path. For the current development phase, rely solely on the JWT claim.

### Step 5: Fetch Tenant Status From the Django API

After resolving the `tenant_id`, fetch the tenant status from the Django API. Construct the status endpoint URL by concatenating the `DJANGO_API_BASE_URL` value (read from `process.env.DJANGO_API_BASE_URL`) with the path `/api/tenants/${tenantId}/status/`.

Use the native `fetch` function available in the Edge Runtime. Set the request `cache` option to `no-store` to prevent any caching of status responses. Do not send any authentication headers — as established in Step 2, this endpoint is intentionally public.

Wrap the fetch call in a try-catch block. If the network request throws an error (Django is unreachable), log the error and allow the request through rather than blocking the user. A status check service outage should degrade gracefully rather than suspending all tenants by default.

If the fetch returns HTTP 404 (tenant not found), treat this as a non-recoverable error for the request and redirect to a `/not-found` page or render the Next.js 404 page.

If the fetch returns HTTP 200, parse the JSON body and extract the `status` string.

### Step 6: Enforce SUSPENDED Status

If the parsed status string equals `"SUSPENDED"`, create a `NextResponse.redirect()` to the `/suspended` URL. Preserve the original `pathname` as a query parameter (`?from=/original-path`) so the suspension page can optionally display context about which page was accessed.

Return the redirect response. The request does not proceed to the route handler.

### Step 7: Enforce GRACE_PERIOD Status

If the parsed status string equals `"GRACE_PERIOD"`, allow the request to continue but attach metadata headers to the response:

- Set the `x-grace-period` header to `"true"` on the response from `NextResponse.next()`.
- If the Django status endpoint returns a `grace_ends_at` field in the response body, set the `x-grace-ends-at` header to the ISO date string value.

The store layout component reads the `x-grace-period` header (from `headers()` in a Server Component) and conditionally renders a warning banner at the top of every store page. This is handled in Task 01.03.10.

### Step 8: Pass Through ACTIVE Status

If the parsed status string equals `"ACTIVE"`, call `NextResponse.next()` without any modifications and return the result.

### Step 9: Update the Middleware Config Matcher

Review the `export const config` object at the bottom of the middleware file. Ensure that the `matcher` array excludes the same paths defined in Step 3: static assets, `_next`, `favicon`, and the `/suspended` path. The `/api` path exclusion from the matcher means Next.js API routes bypass middleware entirely, which is the correct behaviour.

If the exclusion patterns are not already in the matcher, update them now. Use Next.js's recommended negative lookahead pattern in the matcher regex.

### Step 10: Add DJANGO_API_BASE_URL to the Frontend Environment

Open `frontend/.env.local` (or the appropriate environment file for local development). Add the `DJANGO_API_BASE_URL` environment variable with the value `http://localhost:8000` for development.

Open `frontend/.env.example` and document this variable with a comment explaining that it must point to the running Django API server and that it is used by the Next.js middleware and Server Components for server-to-server communication.

Note: `DJANGO_API_BASE_URL` should not have a `NEXT_PUBLIC_` prefix, since it is used only in server-side code (middleware and Server Components). Client Components that need to make API calls should use the `NEXT_PUBLIC_API_URL` variable instead.

---

## Expected Output

After completing this task, the following artifacts exist:

- `backend/apps/tenants/views.py` contains the `TenantStatusView` class registered at `GET /api/tenants/{tenant_id}/status/`.
- `frontend/src/middleware.ts` is updated to perform tenant status enforcement after the existing auth check.
- `frontend/.env.local` and `frontend/.env.example` include the `DJANGO_API_BASE_URL` variable.
- Requests to store routes for SUSPENDED tenants are redirected to `/suspended`.
- Requests to store routes for GRACE_PERIOD tenants proceed with `x-grace-period: true` header.
- Requests to store routes for ACTIVE tenants proceed unchanged.

---

## Validation

- [ ] A request to a store route from a user whose tenant has `status=ACTIVE` is served normally.
- [ ] A request to a store route from a user whose tenant has `status=SUSPENDED` returns a redirect to `/suspended`.
- [ ] A request to a store route from a user whose tenant has `status=GRACE_PERIOD` proceeds and includes the `x-grace-period: true` response header.
- [ ] A request to `/superadmin/tenants` is not affected by the tenant status check (super-admin routes are excluded).
- [ ] A request to `/login` is not affected by the tenant status check.
- [ ] A request to `/suspended` is not redirected in a loop (the `/suspended` path bypasses the middleware check).
- [ ] Making a GET request to `http://localhost:8000/api/tenants/{valid-uuid}/status/` without any authentication headers returns HTTP 200 and a JSON body with `id` and `status`.
- [ ] Making a GET request to `http://localhost:8000/api/tenants/{invalid-uuid}/status/` returns HTTP 404.
- [ ] If the Django server is unreachable, store route requests are allowed through rather than failing with an error.

---

## Notes

- The middleware runs on the Edge Runtime, which supports a subset of Node.js APIs. The native `fetch` function is available, but Node.js-specific modules (such as the `pg` database driver) are not. This is precisely why the middleware must call the Django API over HTTP rather than querying the database directly. This is architecturally identical to the original design's constraint.
- Setting `no-store` cache on the status fetch is important. If the status response is cached for even a few seconds, a tenant that was just suspended could continue to access the application until the cache expires. For a suspension action, immediate enforcement is expected.
- The `DJANGO_API_BASE_URL` environment variable is resolved at the Node.js server level (during Server Component rendering and middleware execution), not in the browser. Never use `DJANGO_API_BASE_URL` in a Client Component.
- In production with subdomain routing (each tenant on `{slug}.lankacommerce.lk`), the tenant identifier can be resolved from the subdomain instead of the JWT. Both sources should be consistent. If they disagree (for example, the subdomain does not match the JWT's tenant_id claim), prefer the JWT and log a security warning.
