# Task 05-03-01: Configure Sentry Error Monitoring

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-01 |
| **Priority** | High |
| **Dependencies** | Task 01-01-01 (Initialize Next.js Project), Task 01-01-02 (Configure Django + PostgreSQL) |
| **Estimated Effort** | 4 hours |
| **Status** | Not Started |

## Objective

Error monitoring is a critical pillar of any production SaaS platform. LankaCommerce must detect, triage, and resolve issues before they affect tenants. Sentry provides real-time error tracking with context-rich stack traces, performance tracing, and release tracking. Integrating Sentry into both the Django backend and the Next.js frontend ensures that every layer of the stack is observable — from database query failures in DRF views to React rendering errors on the client.

This task covers the full Sentry lifecycle: SDK installation, DSN configuration, environment tagging, tenant-aware context injection, source map uploads for readable stack traces, and a test error endpoint to validate end-to-end delivery. By the end of this task, every unhandled exception, API 5xx response, and frontend runtime error will appear in the Sentry dashboard with tenant, user, and request metadata attached.

## Instructions

1. **Install Sentry SDK for Django backend.**
   - Run `pip install sentry-sdk` in the backend environment.
   - Pin the version in `backend/requirements/production.txt` as `sentry-sdk>=2.0,<3.0`.

2. **Configure Sentry in Django settings.**
   - Open `backend/config/settings.py`.
   - Add the following block after `INSTALLED_APPS` and before `ROOT_URLCONF`:
     - `import sentry_sdk`
     - `from sentry_sdk.integrations.django import DjangoIntegration`
   - Call `sentry_sdk.init()` guarded by `if settings.SENTRY_DSN:`:
     - `dsn = settings.SENTRY_DSN`
     - `environment = settings.ENVIRONMENT` (values: `development`, `staging`, `production`)
     - `traces_sample_rate = 0.5` for production, `1.0` for staging, `0.0` for development
     - `integrations = [DjangoIntegration()]`
     - `send_default_p send_default_pii = True` to attach user info
     - `release = settings.GIT_SHA` (populated during CI/CD build)

3. **Add Sentry DSN and environment to Django settings module.**
   - In `backend/config/settings.py`, define:
     - `SENTRY_DSN = env("SENTRY_DSN", default=None)`
     - `ENVIRONMENT = env("ENVIRONMENT", default="development")`
     - `GIT_SHA = env("GIT_SHA", default="unknown")`

4. **Add Sentry middleware to DRF settings.**
   - In `backend/config/settings.py`, append to `REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]`:
     - The Sentry WSGI middleware is automatically applied by `DjangoIntegration`.
   - Create `backend/apps/accounts/middleware/sentry_middleware.py`:
     - Class `SentryTenantMiddleware` that reads `request.tenant` (set by tenant middleware) and calls `set_sentry_tenant_context()`.
     - Add this middleware to `MIDDLEWARE` in settings after the tenant resolution middleware.

5. **Create the tenant-aware Sentry context service.**
   - Create file `backend/apps/accounts/services/sentry_context.py`.
   - Define function `set_sentry_tenant_context(tenant_id, tenant_slug, user_id, user_email)`:
     - Call `sentry_sdk.set_context("tenant", {"id": tenant_id, "slug": tenant_slug})`.
     - Call `sentry_sdk.set_user({"id": user_id, "email": user_email})`.
   - Call this function inside `SentryTenantMiddleware.process_request()` after tenant and user are resolved.

6. **Install Sentry SDK for Next.js frontend.**
   - Run `pnpm add @sentry/nextjs` from the `frontend/` directory.
   - This installs the Next.js-specific Sentry package with automatic instrumentation for server components, API routes, and client components.

7. **Configure Sentry client config.**
   - Create `frontend/sentry.client.config.ts`:
     - Export default config with:
       - `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN`
       - `environment: process.env.NEXT_PUBLIC_APP_ENV || "development"`
       - `tracesSampleRate: 0.5`
       - `integrations: [new Sentry.BrowserTracing()]`
       - `replaysSessionSampleRate: 0.1`
       - `replaysOnErrorSampleRate: 1.0`

8. **Configure Sentry server config.**
   - Create `frontend/sentry.server.config.ts`:
     - Export default config with:
       - `dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN`
       - `environment: process.env.NEXT_PUBLIC_APP_ENV || "development"`
       - `tracesSampleRate: 0.5`
       - `integrations: [new Sentry.Integrations.Http({ tracing: true })]`

9. **Configure Sentry edge config.**
   - Create `frontend/sentry.edge.config.ts`:
     - Export default config with:
       - `dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN`
       - `environment: process.env.NEXT_PUBLIC_APP_ENV || "development"`

10. **Create a test error endpoint for Django backend.**
    - In `backend/apps/health/views/sentry_test_view.py`:
      - DRF view class `SentryTestView` with authentication classes `[JWTAuthentication]` and permission classes `[HasTenantPermission]`.
      - On `GET`, raise `Exception("Sentry test error from LankaCommerce backend")`.
      - Wrap in `try/except` that logs via `logger.exception()` and re-raises so Sentry captures it.
    - Register URL at `api/sentry/test/` in `backend/config/urls.py`.

11. **Create a test error endpoint for Next.js frontend.**
    - In `frontend/app/api/sentry-test/route.ts`:
      - Export `GET` handler that throws `new Error("Sentry test error from LankaCommerce frontend API")`.
    - In `frontend/app/(dashboard)/_components/sentry_test_button.tsx`:
      - Client component with a button that calls `fetch("/api/sentry-test")` and catches the error.
      - Use `useAuth()` for client-side auth context.

12. **Configure Vercel environment variables for Sentry.**
    - In Vercel dashboard, set:
      - `NEXT_PUBLIC_SENTRY_DSN` — the public DSN (safe to expose).
      - `SENTRY_AUTH_TOKEN` — the internal auth token for source map uploads.
      - `SENTRY_ORG` — Sentry organization slug.
      - `SENTRY_PROJECT` — Sentry project slug.
    - For local development, add these to `frontend/.env.local`.

13. **Configure source map uploads.**
    - The `@sentry/nextjs` package automatically creates a `sentry.properties` file during build.
    - In `next.config.ts`, wrap with `withSentryConfig()` from `@sentry/nextjs`.
    - Ensure `VITE_SENTRY_UPLOAD_SOURCE_MAPS` or Sentry CLI is configured in CI/CD pipeline.
    - Verify that source maps are not publicly accessible by setting `hideSourceMaps: true` in `next.config.ts`.

14. **Verify end-to-end Sentry delivery.**
    - Trigger the Django test endpoint and confirm the error appears in Sentry dashboard with tenant context.
    - Trigger the frontend test endpoint and confirm the error appears with user context.
    - Check that environment tags (`production`, `staging`, `development`) are correctly applied.
    - Verify that stack traces are readable (not minified) thanks to source map uploads.

## Expected Output

- Sentry errors from Django backend appear in Sentry dashboard with tenant slug, user email, and request URL.
- Sentry errors from Next.js frontend appear with browser metadata, user session info, and component trace.
- Source maps are uploaded during Vercel deployment and deployment and stack traces are de-minified.
- Test error endpoints return 500 and the exception is captured by Sentry within seconds.
- Tenant context is automatically attached to every error without manual instrumentation per view.

## Validation

1. `pip list | grep sentry-sdk` shows version `>=2.0` installed in the backend environment.
2. `backend/config/settings.py` contains `sentry_sdk.init()` with DSN, environment, and `DjangoIntegration`.
3. `SENTRY_DSN` is read from environment variables and defaults to `None` safely.
4. `SentryTenantMiddleware` is registered in `MIDDLEWARE` after the tenant resolution middleware.
5. `set_sentry_tenant_context()` is called inside `SentryTenantMiddleware.process_request()`.
6. `frontend/sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` all exist with valid DSN config.
7. `next.config.ts` is wrapped with `withSentryConfig()`.
8. `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN`_AUTH_TOKEN` are set in Vercel environment variables.
9. Triggering `GET /api/sentry/test/` produces a Sentry event with tenant context in the dashboard.
10. Triggering `GET /api/sentry-test` from the frontend produces a Sentry event with user context.
11. Source maps are uploaded during build and stack traces are readable in Sentry.
12. Environment tag correctly reflects `development`, `staging`, or `production`.

## Notes

- The public DSN (`NEXT_PUBLIC_SENTRY_DSN`) is safe to embed in client bundles — it only allows event submission, not read access.
- The `SENTRY_AUTH_TOKEN` must never be exposed client-side; use Vercel environment secrets.
- Set `traces_sample_rate` lower in production (0.1–0.2) to manage performance quota if transaction volume is high.
- Sentry performance tracing can increase bandwidth usage; monitor monthly quota after deployment.
- For local development, set `SENTRY_DSN` to an empty string to disable Sentry entirely.
- If using Docker Compose for local dev, pass `SENTRY_DSN` via the `environment` block in `docker-compose.yml`.
- The `sentry.properties` file generated by `@sentry/nextjs` should be added to `.gitignore` if it contains auth tokens.
- Consider setting up Sentry Alert Rules for critical error types (e.g., database connection failures, payment processing errors).
