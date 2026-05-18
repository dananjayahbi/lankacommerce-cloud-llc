# Task 05-03-05: Build Production Deployment Configuration

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-05 |
| **Priority** | Critical |
| **Dependencies** | All Phase 01–05 tasks |
| **Estimated Effort** | 6 hours |
| **Status** | Not Started |

## Objective

Shipping LankaCommerce to production requires meticulous configuration of the deployment platform, environment variables, scheduled tasks, and a verified checklist to ensure nothing is missed. Vercel is the deployment configuration, cron jobs for daily tenant operations, and a comprehensive environment variable catalogue are essential for a smooth go-live.

This task delivers three artifacts: a `vercel.json` with build configuration and cron job definitions, an `ENV_VARS_CHECKLIST.md` that catalogues every environment variable across backend and frontend, and a deployment checklist that covers the full release pipeline from code merge to post-deployment smoke tests. Every cron route is protected by a shared `CRON_SECRET` to prevent unauthorized invocation.

## Instructions

1. **Create `vercel.json` in the frontend root.**
   - File location: `frontend/vercel.json`.
   - Structure:
     ```json
     {
       "framework": "nextjs",
       "buildCommand": "pnpm build",
       "outputDirectory": ".next",
       "installCommand": "pnpm install",
       "crons": [
         {
           "path": "/api/crons/daily-summary",
           "schedule": "0 6 * * *"
         },
         {
           "path": "/api/crons/birthday-messages",
           "schedule": "0 8 * * *"
         },
         {
           "path": "/api/crons/payment-reminders",
           "schedule": "0 9 * * *"
         },
         {
           "path": "/api/crons/check-subscriptions",
           "schedule": "30 0 * * *"
         }
       ]
     }
     ```

2. **Create cron job API routes with CRON_SECRET validation.**
   - Create `frontend/app/api/crons/daily-summary/route.ts`:
     - Export `GET` handler.
     - First, validate the `CRON_SECRET`:
       - Read `authHeader = request.headers.get("authorization")`.
       - Use `hmac.compare_digest()` to compare `authHeader` with `Bearer ${process.env.CRON_SECRET}`.
       - If mismatch, return `{"success": false, "error": "Unauthorized"}`, status 401.
     - On success, call the backend daily summary endpoint and return results.
   - Repeat for `birthday-messages/route.ts`, `payment-reminders/route.ts`, and `check-subscriptions/route.ts` with the same CRON_SECRET validation pattern.
   - Each cron route should:
     - Log invocation with timestamp.
     - Call the corresponding Django management command or API endpoint.
     - Return `{"success": true, "data": {"message": "Cron executed successfully"}}`.

3. **Create `ENV_VARS_CHECKLIST.md`.**
   - File location: `frontend/ENV_VARS_CHECKLIST.md`.
   - Organize by category with checkboxes, descriptions, and source (frontend/backend/both).

4. **Database environment variables section.**
   - `DATABASE_URL` — PostgreSQL connection string for Django (`postgres://user:pass@host:5432/lankacommerce`). Source: Backend.
   - `DIRECT_URL` — Direct connection string for migrations (bypasses connection pooler). Source: Backend.

5. **Authentication environment variables section.**
   - `NEXTAUTH_URL` — Canonical URL of the app (e.g., `https://lankacommerce.com`). Source: Frontend.
   - `NEXTAUTH_SECRET` — Random string for encrypting NextAuth tokens. Source: Frontend.
   - `NEXT_PUBLIC_APP_URL` — Public-facing app URL for client-side redirects. Source: Frontend.

6. **Sentry environment variables section.**
   - `NEXT_PUBLIC_SENTRY_DSN` — Public Sentry DSN for frontend error reporting. Source: Frontend.
   - `SENTRY_DSN` — Internal Sentry DSN for backend error reporting. Source: Backend.
   - `SENTRY_AUTH_TOKEN` — Sentry auth token for source map uploads. Source: Frontend (CI/CD only).
   - `SENTRY_ORG` — Sentry organization slug. Source: Frontend (CI/CD only).
   - `SENTRY_PROJECT` — Sentry project slug. Source: Frontend (CI/CD only).

7. **Payment environment variables section.**
   - `PAYHERE_MERCHANT_ID` — PayHere merchant ID for payment processing. Source: Backend.
   - `PAYHERE_MERCHANT_SECRET` — PayHere secret key for signature verification. Source: Backend.
   - `PAYHERE_MODE` — `sandbox` or `live`. Source: Backend.

8. **WhatsApp environment variables section.**
   - `WHATSAPP_API_TOKEN` — WhatsApp Business API permanent access token. Source: Backend.
   - `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business phone number ID. Source: Backend.

9. **Infrastructure environment variables section.**
   - `CRON_SECRET` — Shared secret for authenticating Vercel cron job invocations. Source: Frontend.
   - `ENVIRONMENT` — `development`, `staging`, or `production`. Source: Both.
   - `GIT_SHA` — Current Git commit SHA, set during CI/CD build. Source: Both.
   - `DJANGO_SECRET_KEY` — Django secret key for cryptographic signing. Source: Backend.
   - `DJANGO_ALLOWED_HOSTS` — Comma-separated list of allowed hostnames. Source: Backend.
   - `CORS_ALLOWED_ORIGINS` — Comma-separated list of allowed CORS origins. Source: Backend.

10. **DNS configuration section in ENV_VARS_CHECKLIST.**
    - Wildcard CNAME: `*.lankacommerce.com` → `cname.vercel-dns.com`.
    - Apex domain: `lankacommerce.com` → Vercel-provided IP or CNAME.
    - Custom domain mapping in Vercel dashboard.

11. **Create the deployment checklist section.**
    - **Code Merge**:
      - All feature branches merged to `main`.
      - `CHANGELOG.md` updated with release notes.
      - Version bumped in `package.json` and `pyproject.toml`.
    - **Database Migration**:
      - Run `python manage.py migrate` against staging database.
      - Verify migration output has no errors.
      - Run `python manage.py showmigrations` to confirm all migrations applied.
    - **Seed Data**:
      - Run `python manage.py seed_default_data` (or equivalent).
      - Verify default roles, permissions, and settings exist.
    - **DNS Configuration**:
      - Wildcard CNAME wildcard record propagated (check via `dig *.lankacommerce.com`).
      - SSL/TLS certificates provisioned by Vercel (automatic).
    - **Environment Variables**:
      - All variables from `ENV_VARS_CHECKLIST.md` set in Vercel dashboard.
      - Backend environment variables set in hosting platform (e.g., Railway, Render, or VPS).
    - **Smoke Tests**:
      - Visit `https://lankacommerce.com/status` — health check passes.
      - Visit `https://{test-tenant}.lankacommerce.com` — login page loads.
      - Complete a test sale end-to-end.
      - Process a test return.
      - Verify Sentry error appears in dashboard.
    - **PayHere Key Swap**:
      - Change `PAYHERE_MODE` from `sandbox` to `live`.
      - Update `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` with live credentials.
      - Process a test payment with a real card (small amount, refund immediately).
    - **Sentry Verification**:
      - Trigger test error endpoints.
      - Confirm errors appear in Sentry with correct environment tag.
      - Verify source maps are uploaded and stack traces are readable.

12. **Add Vercel Analytics and Speed Insights (optional).**
    - In `frontend/app/layout.tsx`, add:
      - `import { Analytics } from "@vercel/analytics/react"`.
      - `import { SpeedInsights } from "@vercel/speed-insights/next"`.
      - Render `<Analytics />` and `<SpeedInsights />` in the root layout.

## Expected Output

- `vercel.json` with build config and 4 cron job definitions exists in `frontend/`.
- Each cron API route validates `CRON_SECRET` using `hmac.compare_digest()`.
- `ENV_VARS_CHECKLIST.md` catalogues all 20+ environment variables with descriptions and source.
- Deployment checklist covers code merge, migration, seed, DNS, env vars, smoke tests, PayHere key swap, and Sentry verification.
- Vercel Analytics and Speed Insights are optionally integrated.

## Validation

1. `frontend/vercel.json` exists with valid JSON and all 4 cron entries.
2. Each cron schedule matches the specification (daily-summary 06:00, birthday-messages 08:00, payment-reminders 09:00, check-subscriptions 00:30).
3. `frontend/app/api/crons/daily-summary/route.ts` validates `CRON_SECRET` via `hmac.compare_digest()`.
4. `frontend/app/api/crons/birthday-messages/route.ts` exists with same validation pattern.
5. `frontend/app/api/crons/payment-reminders/route.ts` exists with same validation pattern.
6. `frontend/app/api/crons/check-subscriptions/route.ts` exists with same validation pattern.
7. `frontend/ENV_VARS_CHECKLIST.md` contains all environment variables across all categories.
8. `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `PAYHERE_MERCHANT_SECRET`, `WHATSAPP_API_TOKEN`, and `CRON_SECRET` are all documented.
9. DNS section documents wildcard CNAME `*` → `cname.vercel-dns.com`.
10. Deployment checklist includes all 8 sections (code merge, migration, seed, DNS, env vars, smoke tests, PayHere swap, Sentry).
11. Vercel Analytics (`@vercel/analytics/react`) is imported in root layout.
12. Unauthorized requests to cron routes without `CRON_SECRET` return 401.

## Notes

- The `CRON_SECRET` must be a long, random string (at least 32 characters). Generate it with `openssl rand -hex 32`.
- Vercel cron jobs have a maximum execution time of 60 seconds (Pro plan) or 10 seconds (Hobby plan). Ensure each cron handler completes within the limit.
- For long-running cron tasks (e.g., daily summary with many tenants), consider delegating to a background worker or Django management command via an internal API call.
- The `PAYHERE_MODE` to `sandbox` during development and staging. Only switch to `live` after all payment tests pass.
- The `DIRECT_URL` is only needed if using a connection pooler (e.g., PgBouncer) in transaction mode. It bypasses the pooler for migrations.
- Keep `DJANGO_SECRET_KEY` secure and rotate it periodically. Never commit it to version control.
- Vercel automatically provisions SSL certificates for custom domains via Let's Encrypt. No manual certificate management is needed.
- After deployment, monitor Vercel Function logs for any cold start issues or timeouts.
- Consider setting up a staging environment that mirrors production exactly for pre-release testing.
