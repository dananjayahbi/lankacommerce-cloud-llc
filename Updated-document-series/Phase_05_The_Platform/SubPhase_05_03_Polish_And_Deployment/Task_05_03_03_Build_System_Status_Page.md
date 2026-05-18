# Task 05-03-03: Build System Status Page

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-03 |
| **Priority** | Medium |
| **Dependencies** | Task 01-01-02 (Configure Django + PostgreSQL), Task 01-02-01 (Tenant Model) |
| **Estimated Effort** | 5 hours |
| **Status** | Not Started |

## Objective

LankaCommerce tenants and their staff rely on the platform for daily operations. When something goes wrong — a database slowdown, an API timeout, or a third-party service outage — they need immediate visibility into what is affected. A public system status page provides transparency and reduces support burden by proactively communicating service health.

This task builds a lightweight health check API on the Django backend and a public-facing status page on the Next.js frontend. The page displays four component cards (API, Database, WhatsApp, Authentication) with color-coded status indicators, an overall system banner, and 30-second auto-refresh via TanStack Query. The health endpoint is unauthenticated and exempt from middleware auth checks, making it accessible even during authentication service disruptions.

## Instructions

1. **Create the health Django app.**
   - Run `python manage.py startapp health` inside `backend/apps/`.
   - Add `backend.apps.health` to `INSTALLED_APPS` in `backend/config/settings.py`.

2. **Build the health check view.**
   - Create `backend/apps/health/views/health_check_view.py`.
   - Define class `HealthCheckView(APIView)`:
     - **No** authentication classes — this endpoint must be accessible without auth.
     - **No** permission classes — allow any.
   - Implement `get(self, request)`:
     - Record `start_time = time.time()`.
     - Use `from django.db import connection` and `connection.cursor()` to execute `cursor.execute("SELECT 1")`.
     - Compute `latency = round((time.time() - start_time) * 1000, 2)` — latency in milliseconds.
     - On success, return `Response({"status": "ok", "latency": latency, "timestamp": timezone.now().isoformat()})`.
     - On exception, return `Response({"status": "error", "latency": None, "timestamp": timezone.now().isoformat()}, status=503)`.

3. **Register the health check URL.**
   - In `backend/config/urls.py`, add `path("api/health/", HealthCheckView.as_view(), name="health-check")`.
   - Ensure this URL is registered **before** any tenant-prefixed URLs so it is not blocked by tenant resolution middleware.

4. **Exempt `/api/health/` from middleware authentication.**
   - In `backend/apps/accounts/middleware/auth_middleware.py` (or equivalent), add `/api/health/` to the `EXEMPT_URLS` list.
   - The middleware should skip authentication checks if the request path starts with any exempt URL.

5. **Create the public status page route.**
   - Create `frontend/app/(public)/status/page.tsx`:
     - This route is **outside** the dashboard layout — no sidebar, no auth guard.
     - Use `fetch` or a server component to call `GET /api/health/` on initial load.
     - Render the overall status banner and four component cards.

6. **Build the overall status banner.**
   - At the top of the status page, render a full-width banner:
     - **Green** (`#22C55E`): "All Systems Operational" — all components healthy.
     - **Amber** (`#F59E0B`): "Partial Outage" — one or more components degraded.
     - **Red** (`#EF4444`): "Service Disruption" — one or more components down.
   - The banner should have a large icon, bold text, and the current timestamp.

7. **Build the four component status cards.**
   - **API Card**:
     - Status derived from the health check response.
     - Shows latency in milliseconds.
     - Green if `status === "ok"`, Red if `status === "error"`.
   - **Database Card**:
     - Status derived from the health check response (same endpoint).
     - Latency thresholds:
       - **Green** (`#22C55E`): latency < 150ms.
       - **Amber** (`#F59E0B`): latency 150–500ms.
       - **Red** (`#EF4444`): latency > 500ms or error.
     - Shows latency value and threshold indicator.
   - **WhatsApp Card**:
     - Hardcoded status: "External — Third-party".
     - Always shows as **Green** with a note: "Status provided by WhatsApp Business API."
     - No latency displayed.
   - **Authentication Card**:
     - Status derived from a lightweight session check.
     - Call `GET /api/auth/session` (or equivalent) to verify auth service is responsive.
     - Green if session endpoint responds, Red if it times out or errors.

8. **Implement 30-second auto-refresh.**
   - In the client component, use TanStack Query:
     ```tsx
     const { data, error } = useQuery({
       queryKey: ["system-status"],
       queryFn: () => fetch("/api/health/").then((r) => r.json()),
       refetchInterval: 30000,
     });
     ```
   - Show a subtle "Refreshing in 30s..." countdown indicator below the banner.
   - Do not show a loading spinner on refresh — keep the previous data visible until new data arrives.

9. **Exempt `/status` from frontend middleware auth.**
   - In `frontend/middleware.ts`, add `/status` to the public paths list so the middleware does not redirect to login.
   - Also exempt `/api/health` from any tenant-slug redirect logic.

10. **Style the status page with LankaCommerce design tokens.**
    - Use the LankaCommerce design system:
      - Background: `#F1F5F9`
      - Cards: `#FFFFFF` with `#E2E8F0` border
      - Text muted: `#64748B`
      - Primary accent: `#1B2B3A` (navy) for headings
    - Typography: Inter for body, JetBrains Mono for latency values and timestamps.

11. **Add a "Status" link in the public footer.**
    - In the public-facing footer component, add a "System Status" link pointing to `/status`.
    - This link should be visible to all visitors without authentication.

## Expected Output

- `GET /api/health/` returns `{"status": "ok", "latency": 12.34, "timestamp": "2026-05-18T10:00:00Z"}` on success.
- `GET /api/health/` returns HTTP 503 with `{"status": "error", ...}` when the database is unreachable.
- The public status page at `/status` displays four component cards with correct color coding.
- The overall status banner updates dynamically based on component health.
- The page auto-refreshes every 30 seconds without flickering.
- The status page is accessible without authentication, even during auth service outages.

## Validation

1. `backend/apps/health/views/health_check_view.py` exists with `HealthCheckView` class.
2. `HealthCheckView` has no `authentication_classes` and `permission_classes` are empty (allow any).
3. `connection.cursor().execute("SELECT 1")` is used for database health check.
4. Latency is computed in milliseconds and rounded to 2 decimal places.
5. `GET /api/health/` returns HTTP 200 with `status: "ok"` when database is responsive.
6. `GET /api/health/` returns HTTP 503 with `status: "error"` when database is down.
7. `frontend/app/(public)/status/page.tsx` exists outside the dashboard layout.
8. TanStack Query `refetchInterval: 30000` is configured for auto-refresh.
9. `/status` and `/api/health` are exempt from middleware authentication checks.
10. The WhatsApp card shows "External — Third-party" with green status.
11. The database card changes color based on latency thresholds (<150ms green, 150–500ms amber, >500ms red).
12. The overall banner correctly reflects the worst component status.

## Notes

- The health check endpoint must never require authentication — it is designed to be checked during auth outages.
- Keep the health check lightweight. Do not add expensive queries or external service calls beyond `SELECT 1`.
- For WhatsApp, we hardcode "External — Third-party" because we cannot reliably ping the WhatsApp Business API without credentials. A future iteration could use the WhatsApp API's own health endpoint.
- The 30-second refresh interval balances freshness with server load. Adjust if needed based on traffic patterns.
- Consider adding a `Cache-Control: no-cache` header to the health check response to prevent CDN caching.
- For Vercel deployment, ensure the health check endpoint does not count toward function invocation limits by setting a higher `maxDuration` if needed.
- The status page should be indexed by search engines so users can find it by searching "LankaCommerce status".
- Consider adding an incident history or maintenance window feature in a future iteration.
