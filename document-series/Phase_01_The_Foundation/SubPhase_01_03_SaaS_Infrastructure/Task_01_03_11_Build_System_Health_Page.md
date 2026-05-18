# Task 01.03.11 — Build System Health Page

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Task | 01.03.11 |
| Title | Build System Health Page |
| Working Directory | `backend/` and `frontend/` |
| Prerequisites | Task 01.03.02 (super-admin layout), Task 01.02 (AuditLog model) |
| Estimated Time | 2 hours |
| Status | [ ] Not Started |

---

## Objective

Build the system health dashboard at `/superadmin/health` that gives the platform operator a real-time view of the LankaCommerce platform's operational status. The page shows the Django API health (including database connectivity and response latency), backend version information (Django and Python versions), frontend environment information (Node environment and Next.js version), recent platform audit log entries, and a storage usage placeholder. All health data is fetched server-side from the Django health endpoint, ensuring the page itself serves as a functional end-to-end check of the Django-to-Next.js communication path.

---

## Instructions

### Step 1: Create the Django Health Endpoint

Open `backend/apps/core/views.py` (or create this file if a `core` app does not yet exist — create the app following the same pattern as `apps.tenants`). Define a view class named `HealthView` inheriting from `rest_framework.views.APIView`.

Set `permission_classes` and `authentication_classes` to empty lists. The health endpoint must be publicly accessible without authentication. Its purpose is operational monitoring and it contains no sensitive data.

Inside the `get` method, perform the following checks:

**Database connectivity check**: Using Django's `connection` object from `django.db`, call `connection.ensure_connection()` inside a try-except block. Measure the start and end times using Python's `time.time()` or `time.perf_counter()` to calculate the latency in milliseconds. If the connection succeeds, record `db_status = "connected"` and `db_latency_ms` as the integer latency. If an exception is raised, record `db_status = "unreachable"` and `db_latency_ms = None`. Alternatively, execute a raw SQL query `SELECT 1` using Django's `connection.cursor()` inside a try-except block as a more reliable health check.

**Version information**: Read the Django version using `django.VERSION` (a tuple of version component integers, e.g., `(4, 2, 0)`). Format it as a dot-joined string. Read the Python version using `sys.version_info` or `platform.python_version()`.

Assemble the response dictionary with: `status` ("healthy" or "degraded" based on db_status), `database` (an object with `status` and `latency_ms`), `django_version` (string), `python_version` (string), and `timestamp` (the current UTC ISO datetime string).

If the database is unreachable, return an HTTP 503 Service Unavailable response with the assembled dictionary (so the caller knows the server is running but degraded). If the database is connected, return an HTTP 200 response.

Register the HealthView at `backend/apps/core/urls.py` (create this file if needed) with the path `health/`, resulting in the full URL `GET /api/health/`. Include this URL file in the main project URL configuration.

### Step 2: Create the Health Page File

Create the file `frontend/src/app/(superadmin)/health/page.tsx`. This is a Next.js Server Component — no `"use client"` directive. Export an async function as the default export.

Add the page heading section at the top of the returned JSX: an `h1` element with the text "System Health" in Inter Bold, dark text colour, and a subtitle "Monitor the operational status of the LankaCommerce platform."

### Step 3: Implement the Django API Health Check

Inside the async page function, read the access token from cookies using `cookies()` from `next/headers`.

Perform a server-side `fetch` to the Django health endpoint at the URL constructed from `DJANGO_API_BASE_URL` and `/api/health/`. Do not send any authentication headers — the endpoint is public. Set `cache: "no-store"` so the health check is always live. Record the time before the fetch using `Date.now()` and the time after to compute the round-trip latency from Next.js to Django.

Define a TypeScript interface for the health endpoint response: `status` (string), `database` (object with `status` string and `latency_ms` number or null), `django_version` (string), `python_version` (string), and `timestamp` (string).

Wrap the fetch in a try-catch block. If the fetch itself throws (Django is unreachable), set a flag indicating that the Django backend is entirely unreachable. If the fetch returns HTTP 503, parse the body and treat it as a "degraded" status. If the fetch returns HTTP 200, parse the body as a successful health check.

### Step 4: Build the Database Health Card

Render a white card displaying the database health status. The card has a slate-200 border, `rounded-xl`, and `p-6` padding.

The card heading is "Database" in Inter Bold with a database icon (Lucide's `Database` icon) to the left.

Below the heading, display two pieces of information:

- **Connection Status**: A large status indicator showing either a green circle with "Connected" text or a red circle with "Unreachable" text, based on the `database.status` field from the health response.
- **Query Latency**: A line showing "Latency: Xms" where X is the `database.latency_ms` value. If latency is null (because the database was unreachable), display "Latency: N/A". Colour-code the latency: green for under 10ms, amber for 10–50ms, red for over 50ms.

If the entire Django backend is unreachable (the fetch threw an error), display the card in a full-error state: red border, red heading, and the message "Django API is unreachable. Check that the backend server is running on port 8000."

### Step 5: Build the Backend Application Card

Render a second white card for backend application information. The card heading is "Backend" with a server icon (Lucide's `Server` icon).

Display the following information rows:

- **Framework**: "Django REST Framework"
- **Django Version**: The `django_version` string from the health response.
- **Python Version**: The `python_version` string from the health response.
- **API Status**: The top-level `status` string from the health response ("healthy" or "degraded"), displayed as a green or amber badge respectively.

Each row uses a two-column layout: a muted label on the left and the value on the right.

### Step 6: Build the Frontend Application Card

Render a third white card for frontend application information. The card heading is "Frontend" with a monitor icon (Lucide's `Monitor` icon).

Display the following information rows:

- **Framework**: "Next.js App Router"
- **Next.js Version**: Use a hard-coded string matching the version installed in the project (read from `package.json` or set as a constant). Alternatively, import the version from the installed package if available.
- **Runtime Environment**: The `NODE_ENV` environment variable value (development, production, or test), read via `process.env.NODE_ENV`.
- **Deployment**: The `DEPLOYMENT_ENVIRONMENT` environment variable value if set (e.g., "local", "staging", "production"), or "local" as a default.

### Step 7: Fetch Recent Audit Log Entries

Inside the async page function, perform a second server-side fetch to the Django audit log endpoint. The endpoint is `GET /api/audit-logs/?limit=20`, constructed from `DJANGO_API_BASE_URL`. Set the `Authorization: Bearer [access_token]` header and `cache: "no-store"`.

Define a TypeScript interface for an audit log entry: `id` (string), `actor_email` (string), `action` (string), `entity_type` (string), `entity_id` (string), `created_at` (string).

If the fetch succeeds, parse the response body into an array of audit log entries. If the fetch fails, set the array to an empty list and display a muted "Audit log unavailable" message in the table.

You can run this fetch in parallel with the health check fetch using `Promise.all` to reduce total page load time.

### Step 8: Build the Recent Activity Table

Below the three status cards, render a full-width card for the recent activity log. The card heading is "Recent Platform Activity" in Inter Bold.

Inside the card, render an HTML table with the following columns: Time, Actor, Action, Entity Type, and Entity ID.

For each audit log entry in the fetched array:

- **Time**: Format `created_at` as a relative time string ("3 minutes ago") or a localised short datetime if the entry is older than 24 hours.
- **Actor**: The `actor_email` value in a monospace-style font.
- **Action**: The action string formatted as a human-readable label (replace underscores with spaces, convert to title case).
- **Entity Type**: The `entity_type` string.
- **Entity ID**: A truncated version of the `entity_id` UUID (show only the first 8 characters followed by ellipsis) to keep the table readable.

If the audit log array is empty, show a centred "No recent activity" message in muted text.

### Step 9: Build the Storage Usage Placeholder Card

Render a fourth status card with the heading "Storage" and a hard-drive icon (Lucide's `HardDrive` icon). This card displays a centred placeholder message: "Storage monitoring is not yet available. This panel will show database size, file storage usage, and Redis cache metrics in Phase 5."

Style the placeholder message in muted text (slate-400), italic, and centred.

### Step 10: Arrange Status Cards in a Grid and Recent Activity Below

The final page layout from top to bottom is:

1. Page heading section (h1 and subtitle).
2. A three-column grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) containing the Database card, Backend Application card, and Frontend Application card.
3. The Storage Usage placeholder card (full width below the grid, or a fourth card in a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4` layout if preferred).
4. The Recent Platform Activity table card (full width).

Apply `space-y-6` or `gap-6` between each major section.

---

## Expected Output

After completing this task, the following artifacts exist:

- `backend/apps/core/views.py` with the HealthView class at `GET /api/health/`, returning database status, Django version, Python version, and timestamp.
- `frontend/src/app/(superadmin)/health/page.tsx` — Server Component that fetches health data and renders all status cards.
- The system health page shows three application status cards (database, backend, frontend), a storage placeholder, and a recent audit log table.

---

## Validation

- [ ] Making a GET request to `http://localhost:8000/api/health/` (without authentication) returns HTTP 200 and a JSON body with `status`, `database`, `django_version`, and `python_version`.
- [ ] The `database.latency_ms` value in the health response is a positive integer when the database is connected.
- [ ] Navigating to `/superadmin/health` renders the health page without errors.
- [ ] The Database card shows "Connected" in green when the Django API is running and the database is accessible.
- [ ] The Backend Application card shows the correct Django version string.
- [ ] The Frontend Application card shows "development" for the runtime environment in local development.
- [ ] The Recent Activity table shows the 20 most recent audit log entries (or fewer if there are not 20 yet).
- [ ] Stopping the Django server and reloading the health page shows the "Django API is unreachable" error state in the Database and Backend cards.
- [ ] Running `pnpm tsc --noEmit` produces zero TypeScript errors.

---

## Notes

- The health endpoint is one of the few endpoints in the application that has no authentication requirement. This is a conscious trade-off: operational monitoring systems (uptime checkers, CI health probes) need to call this endpoint without a valid user JWT. The response contains no sensitive business data.
- Running the two fetches (health check and audit log) in parallel using `Promise.all` reduces page latency when both Django endpoints are responsive. If one fails, the other's result is still used — implement the parallel fetch with settled promise handling so that a failure on the audit log fetch does not prevent the health data from rendering.
- The Django health check uses a direct database connection ping rather than calling any ORM model. This is intentional: a health check should test the infrastructure layer directly, not go through the application layer, to avoid masking issues with the ORM or migrations.
- In production, the health page URL should be accessible only to SUPER_ADMIN users (enforced by the super-admin layout's JWT role guard). The underlying Django endpoint at `/api/health/` can remain public for infrastructure monitoring tools.
