# SubPhase 05.03 — Production Deployment and Polish

## Metadata

| Field | Value |
|---|---|
| SubPhase ID | 05.03 |
| Name | Production Deployment and Polish |
| Phase | 05 — The Platform |
| Status | Planned |
| Complexity | Very High |
| Task Count | 12 |
| Estimated Effort | 5–7 days |
| Depends On | SubPhase 05.01 (Reporting), SubPhase 05.02 (Billing) |
| Primary Technologies | Django REST Framework, Next.js 15, Sentry, Vercel, python-escpos |

---

## Objective

SubPhase 05.03 is the final sub-phase of the entire LankaCommerce project. Its purpose is to harden, polish, and ship the platform to production. This sub-phase moves the project from a feature-complete state to a production-ready, monitored, and maintainable SaaS product. It covers error monitoring via Sentry, a signed outbound webhook system, a public status page, custom subdomain routing, Vercel deployment configuration, UI polish through loading skeletons and empty states, accessibility compliance, React Error Boundaries, a final code quality audit, a comprehensive 90-day demo seeder, and the definitive project handoff document.

---

## Scope

### In Scope

- Sentry error monitoring with tenant-aware context and source map upload for both Django backend and Next.js frontend.
- Outbound webhook system with HMAC-SHA256 signing, delivery logging, and management UI.
- Public system status page with live connectivity checks.
- Custom subdomain routing via Vercel DNS wildcard CNAME configuration.
- Vercel production deployment configuration and cron job declarations.
- UI loading skeleton components for all data-fetching pages.
- Empty state components for all list views and report pages.
- Accessibility audit covering ARIA labels, focus management, colour contrast, and form labelling.
- React Error Boundary components with Sentry integration.
- Final TypeScript strict-mode and ESLint clean pass.
- Comprehensive demo seeder generating 1,000+ sales across 90 days.
- Final launch checklist and project handoff document.

### Out of Scope

- New feature development beyond what is specified in these twelve tasks.
- Native mobile application deployment.
- Third-party marketplace or ERP integrations.
- Custom white-label theming per tenant beyond the existing design system.
- Redis-based caching layer (deferred to a future operations iteration).

---

## Technical Context

### Django App Structure for This SubPhase

This subphase introduces one new Django application and extends the existing frontend:

**`backend/apps/webhooks/`** — New application containing the `WebhookEndpoint` and `WebhookDelivery` models, the HMAC-signed dispatch service (`dispatch_service.py`), and DRF views for endpoint management.

**`backend/apps/health/`** — New application containing the health check endpoint and system status data sources.

Both apps must be added to `INSTALLED_APPS` in `backend/config/settings.py`.

### Sentry Integration

Sentry is configured on both the Django backend (using `sentry-sdk`) and the Next.js frontend (using `@sentry/nextjs`). The Django backend captures all unhandled exceptions in DRF views and cron jobs. The Next.js frontend captures browser-side errors, React render errors, and performance traces. Both sides tag events with `tenant_id`, `tenant_slug`, `user_id`, and `user_email` for contextual debugging.

### Outbound Webhook System

The webhook system allows tenants to register external HTTPS endpoints that receive signed event notifications when key business actions occur. The dispatch function is fire-and-forget — it does not block the primary transaction. Each dispatch attempt is logged to `WebhookDelivery` for operator review. The HMAC-SHA256 signature in the `X-LankaCommerce-Signature` header allows the receiving server to verify payload authenticity.

### Subdomain Routing

Each tenant's storefront lives at `[slug].lankacommerce.com`. The Next.js middleware reads the hostname, extracts the slug, validates it against the Tenant database, and injects it into downstream request headers. For local development, the middleware accepts an `X-Tenant-Slug` header override.

### Demo Seeder

The comprehensive demo seeder generates 1,000+ sales across 90 days with realistic Sri Lankan boutique data: product names, LKR price ranges, customer names, and weekly shopping patterns. It runs idempotently and completes in under 60 seconds.

---

## Task Breakdown

| Task ID | Task Name | Complexity | Dependencies |
|---|---|---|---|
| 05.03.01 | Configure Sentry Error Monitoring | Medium | None |
| 05.03.02 | Build Outbound Webhook System | High | Webhook models, sale/return services |
| 05.03.03 | Build System Status Page | Medium | Health check endpoint, public middleware |
| 05.03.04 | Configure Custom Subdomain Routing | Medium | Tenant model, middleware |
| 05.03.05 | Build Production Deployment Configuration | Medium | All prior tasks complete |
| 05.03.06 | Build UI Loading Skeletons | Medium | TanStack Query on all pages |
| 05.03.07 | Build Empty State Components | Medium | All list and report pages |
| 05.03.08 | Perform Accessibility Audit and Fixes | High | All UI components |
| 05.03.09 | Build Error Boundary Components | Medium | Sentry configured |
| 05.03.10 | Run Final TypeScript and ESLint Audit | Medium | All prior tasks complete |
| 05.03.11 | Build Comprehensive Demo Seeder | High | All models finalized |
| 05.03.12 | Final Launch Checklist and Handoff | High | All tasks complete |

---

## Validation Criteria

- Sentry receives error events tagged with `tenant_id`, `tenant_slug`, `user_id`, and `user_email` in both development and production.
- Webhook dispatch system sends signed POST requests with HMAC-SHA256 headers and logs every attempt to `WebhookDelivery`.
- Public status page at `/status` loads without authentication and reflects live database health.
- Custom subdomains (`tenant.lankacommerce.com`) extract the tenant slug and attach it via `X-Tenant-Slug` header.
- Vercel deployment via `pnpm run build` completes with zero errors in CI.
- All data-fetching pages show skeleton loaders during the TanStack Query `isLoading` state.
- All list and report pages render an appropriate empty state component when data length is zero.
- All icon-only buttons carry `aria-label` props; all form inputs have associated label elements.
- React Error Boundaries wrap all major page sections and display a styled fallback UI on error.
- `pnpm tsc --noEmit` and `pnpm eslint src/` both exit with zero errors.
- Demo seeder creates 1,000+ sale records across 90 days and completes in under 60 seconds.
- Launch checklist is complete and signed off before the production go-live event.

---

## Files Created or Modified

### New Backend Files

- `backend/apps/webhooks/__init__.py`
- `backend/apps/webhooks/apps.py`
- `backend/apps/webhooks/models.py` — `WebhookEndpoint`, `WebhookDelivery`, `WebhookDeliveryStatus` TextChoices
- `backend/apps/webhooks/serializers.py`
- `backend/apps/webhooks/admin.py`
- `backend/apps/webhooks/urls.py`
- `backend/apps/webhooks/services/dispatch_service.py` — HMAC-SHA256 dispatch with delivery logging
- `backend/apps/webhooks/services/secret_generator.py` — Cryptographic secret generator
- `backend/apps/webhooks/views/endpoint_views.py` — Webhook endpoint CRUD
- `backend/apps/webhooks/views/test_dispatch_view.py` — Test dispatch trigger
- `backend/apps/webhooks/migrations/0001_add_webhook_models.py`
- `backend/apps/health/__init__.py`
- `backend/apps/health/apps.py`
- `backend/apps/health/views/health_check_view.py` — `GET /api/health/`
- `backend/apps/health/urls.py`
- `backend/apps/accounts/management/commands/seed_demo_comprehensive.py` — 90-day demo seeder

### Modified Backend Files

- `backend/config/settings.py` — add `webhooks`, `health` to `INSTALLED_APPS`, add Sentry DSN, webhook settings
- `backend/config/urls.py` — include webhooks and health URLs
- `backend/apps/accounts/models.py` — add `Tenant` slug field if not present

### New Frontend Files

- `frontend/app/(public)/status/page.tsx` — Public system status page
- `frontend/app/[tenantSlug]/settings/webhooks/page.tsx` — Webhook management UI
- `frontend/components/skeletons/TableSkeleton.tsx`
- `frontend/components/skeletons/CardGridSkeleton.tsx`
- `frontend/components/skeletons/ListSkeleton.tsx`
- `frontend/components/skeletons/ChartSkeleton.tsx`
- `frontend/components/skeletons/index.ts`
- `frontend/components/empty-states/EmptyProductList.tsx`
- `frontend/components/empty-states/EmptyCustomerList.tsx`
- `frontend/components/empty-states/EmptyOrderHistory.tsx`
- `frontend/components/empty-states/EmptyReportData.tsx`
- `frontend/components/empty-states/EmptySearchResults.tsx`
- `frontend/components/empty-states/index.ts`
- `frontend/components/ErrorBoundary.tsx`
- `frontend/components/ErrorBoundaryFallback.tsx`
- `frontend/middleware.ts` — Updated with subdomain extraction

### Modified Frontend Files

- `frontend/app/[tenantSlug]/layout.tsx` — Add skip navigation link
- `frontend/components/ui/toaster.tsx` — Add ARIA live region
- All list and report pages — Add skeleton and empty state integration
- All major page sections — Wrap in ErrorBoundary
