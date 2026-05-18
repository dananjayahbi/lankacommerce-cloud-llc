# SubPhase 01.03 — SaaS Infrastructure & Tenant Management

## Metadata

| Field | Value |
|---|---|
| Project | LankaCommerce |
| Phase | 01 — The Foundation |
| SubPhase | 01.03 — SaaS Infrastructure & Tenant Management |
| Prerequisites | SubPhase 01.01 (Monorepo Setup) complete, SubPhase 01.02 (Django Auth + JWT) complete |
| Architecture | Django REST Framework backend (`backend/`) + Next.js 15 App Router frontend (`frontend/`) |
| Estimated Duration | 4–5 days |
| Status | [ ] Not Started |

---

## Objective

SubPhase 01.03 establishes the complete multi-tenant SaaS infrastructure for LankaCommerce. By the end of this sub-phase, the platform is capable of provisioning new retail stores as isolated tenants, managing subscription lifecycle events, and enforcing tenant status policies across the entire Next.js application. The super-admin team gains a dedicated management console built on top of a secure Django API layer, while individual tenant storefronts receive automatic middleware-level protection against suspended or overdue accounts.

This sub-phase divides cleanly into two concerns: the Django backend, which owns all data persistence and business logic, and the Next.js frontend, which owns all user interface concerns. Neither side duplicates the other's responsibility. The backend exposes a stable REST API, and the frontend consumes it. This separation means every action taken through the super-admin UI passes through validated, authorised Django endpoints rather than direct database access.

---

## Architecture Overview

### Django Backend (`backend/`)

All tenant-related data models, business logic, and API endpoints live inside a dedicated Django application registered as `apps.tenants`. This app sits alongside the `apps.accounts` app introduced in SubPhase 01.02 and follows the same project conventions.

The tenants app contains the following modules:

- **models.py** — Defines the Plan, Tenant, Subscription, and Invoice models using Django ORM, with Python TextChoices enums for all status fields.
- **serializers.py** — Provides DRF serializers for read and write operations on each model.
- **views.py** — Contains DRF ViewSets and APIView classes that implement every tenant management operation.
- **urls.py** — Registers all tenant-related URL patterns and connects them to the main project URL configuration.
- **services/tenant_service.py** — Encapsulates all business logic functions for tenant creation, status transitions, and querying, keeping views thin and testable.
- **admin.py** — Registers all tenant models in the Django admin interface with appropriate display and search configurations.
- **management/commands/seed_plans.py** — A Django management command that creates or updates the two subscription plans.
- **management/commands/seed_sample_tenant.py** — A Django management command that provisions a sample tenant for development and testing.

### Next.js Frontend (`frontend/`)

The frontend consumes the Django API using server-side fetch calls within Next.js Server Components, and client-side fetch calls within designated Client Components. The JWT access token obtained during login in SubPhase 01.02 is stored in an HTTP-only cookie and sent as a Bearer token in the Authorization header of every request to the Django API.

The super-admin section of the Next.js application lives in a dedicated route group. Its layout component performs a JWT role check before rendering any protected content. Rather than calling NextAuth's session function, the layout decodes the JWT token from the cookie using the jose library and verifies that the role claim equals SUPER_ADMIN.

---

## Design Tokens

The LankaCommerce design system uses a dark navy and orange palette throughout. The following tokens apply across all super-admin pages and shared components built in this sub-phase.

### Colour Palette

| Token | Value | Usage |
|---|---|---|
| navy | #1B2B3A | Sidebar background, primary headings, secondary buttons |
| orange | #F97316 | Primary buttons, active navigation indicator, interactive accents |
| surface | #FFFFFF | Card backgrounds, modal backgrounds, input backgrounds |
| background | #F1F5F9 | Main content area background (slate-100) |
| border | #E2E8F0 | Card borders, dividers, input borders (slate-200) |
| success | #22C55E | Active tenant status badge |
| warning | #F59E0B | Grace period tenant status badge |
| danger | #EF4444 | Suspended tenant status badge |
| text-primary | #0F172A | Primary body text (slate-900) |
| text-muted | #64748B | Secondary labels, captions, muted tenant status badge |

### Typography

The Inter typeface is used throughout LankaCommerce. There is no display font. Headings use Inter Bold (weight 700). Body text uses Inter Regular (weight 400). Labels and captions use Inter Medium (weight 500). No Playfair Display or any serif font appears anywhere in the application.

### Super Admin Layout Tokens

| Element | Token / Class |
|---|---|
| Sidebar background | navy (#1B2B3A) |
| Sidebar text | text-white |
| Sidebar active item left border | orange (#F97316) |
| Sidebar active item background fill | slightly lighter navy tint |
| Sidebar hover text | orange (#F97316) |
| Main content background | background (#F1F5F9) |
| Wordmark | "LankaCommerce" in Inter Bold, white text |
| Primary action button | orange background, white text |
| Secondary action button | navy background, white text |
| Card background | surface (#FFFFFF) with border (#E2E8F0) |

### Tenant Status Colour Mapping

| Status | Badge Colour | Hex |
|---|---|---|
| ACTIVE | success green | #22C55E |
| GRACE_PERIOD | warning amber | #F59E0B |
| SUSPENDED | danger red | #EF4444 |
| CANCELLED | muted text on light border | text-muted (#64748B) |

---

## Store Settings JSON Schema

Every Tenant record stores a settings JSON object with the following standard keys. These keys are consistent across all tenants and are consumed by the POS terminal and receipt printing modules in later phases.

| Key | Type | Description |
|---|---|---|
| currency | string | ISO 4217 currency code, e.g. LKR |
| timezone | string | IANA timezone identifier, e.g. Asia/Colombo |
| vatRate | number | VAT percentage as a decimal number |
| ssclRate | number | SSCL (Social Security Contribution Levy) percentage |
| receiptFooter | string | Custom text printed at the bottom of receipts |

The default settings object used when provisioning a new tenant pre-fills sensible Sri Lankan defaults where applicable. Individual tenants can override these values after provisioning through their store settings page.

---

## Architectural Differences From the Original VelvetPOS Design

This sub-phase was originally designed for a Prisma-backed Next.js-only monolith. LankaCommerce uses a separate Django REST Framework backend, which introduces the following key differences that developers must understand before beginning any task.

### Data Persistence

All models that were originally defined as Prisma schema blocks are now Django ORM models in `backend/apps/tenants/models.py`. There is no Prisma schema for tenant data. Running migrations means running Django's makemigrations and migrate management commands, not the Prisma migrate command.

### Service Layer

The TypeScript service layer that originally lived in `src/lib/services/tenant.service.ts` is now a Python module at `backend/apps/tenants/services/tenant_service.py`. Business logic such as tenant provisioning, status transitions, and audit logging is implemented in Python and executed server-side within Django views.

### API Endpoints

The Next.js Route Handlers that originally handled tenant CRUD operations are no longer needed for those operations. All tenant API endpoints are implemented as Django DRF views and served by the Django application on port 8000. The Next.js frontend calls these endpoints over HTTP.

### Tenant Status Middleware

The original design used an internal Next.js Route Handler to query Prisma from the Edge Runtime (since Prisma cannot run in the Edge Runtime directly). In LankaCommerce, this constraint still exists — Next.js middleware cannot call Django ORM directly — but the solution is simpler: the middleware simply makes an HTTP fetch call to the Django API endpoint at `GET /api/tenants/{tenant_id}/status/`. This is architecturally equivalent to the original's workaround but uses the actual Django backend instead of a proxy route.

### Seeding

The original `prisma/seed.ts` TypeScript file is replaced by two Django management commands: `seed_plans` and `seed_sample_tenant`, both registered under `apps/tenants/management/commands/`.

### Authentication Guard

The super-admin layout originally called NextAuth's `auth()` function to retrieve the session. In LankaCommerce, the layout reads the JWT access token from the `access_token` cookie, decodes its payload using the jose library, and inspects the `role` claim. If the role does not equal SUPER_ADMIN, the layout redirects to the login page.

---

## Task List

| Task | Title | Backend / Frontend | Est. Time |
|---|---|---|---|
| Task 01.03.01 | Create Tenant and Subscription Models | Backend (Django ORM) | 3 hours |
| Task 01.03.02 | Build Super Admin Layout | Frontend (Next.js) | 2 hours |
| Task 01.03.03 | Build Tenant Management Page | Frontend (Next.js) | 3 hours |
| Task 01.03.04 | Build Tenant Detail Page | Frontend (Next.js) | 3 hours |
| Task 01.03.05 | Build Tenant Provisioning Wizard | Frontend (Next.js) | 4 hours |
| Task 01.03.06 | Create Subscription Plan Models and Seed | Backend (Django) | 2 hours |
| Task 01.03.07 | Build Tenant Service Layer (Django) | Backend (Python) | 3 hours |
| Task 01.03.08 | Build Super Admin Dashboard | Both | 4 hours |
| Task 01.03.09 | Implement Tenant Status Middleware | Frontend (Next.js) | 2 hours |
| Task 01.03.10 | Build Suspension Enforcement UI | Frontend (Next.js) | 2 hours |
| Task 01.03.11 | Build System Health Page | Both | 2 hours |
| Task 01.03.12 | Seed Initial Tenant and Plans | Backend (Django) | 1 hour |

---

## Prerequisites Checklist

Before beginning any task in this sub-phase, confirm the following:

- [ ] SubPhase 01.01 is fully complete: monorepo exists with `backend/` and `frontend/` directories, both running without errors.
- [ ] SubPhase 01.02 is fully complete: Django JWT authentication is functional, CustomUser model is migrated, and login endpoint returns access and refresh tokens.
- [ ] The `apps.accounts` app is registered in Django's INSTALLED_APPS.
- [ ] Django is running on port 8000 without errors.
- [ ] Next.js is running on port 3000 without errors.
- [ ] The jose library is available in the frontend pnpm lockfile.
- [ ] TanStack Query is configured in the frontend (SubPhase 01.01 or 01.02 task).

---

## Validation Criteria

Upon completing all 12 tasks in this sub-phase, the following must be true:

- [ ] Running `poetry run python manage.py migrate` inside `backend/` completes without errors and creates the plans, tenants_tenant, tenants_subscription, and tenants_invoice tables (or equivalent per naming convention).
- [ ] Running `pnpm tsc --noEmit` inside `frontend/` produces zero TypeScript errors.
- [ ] The Django server starts cleanly on port 8000 with no import or configuration errors.
- [ ] The Next.js development server starts cleanly on port 3000.
- [ ] Navigating to the super-admin section without a valid SUPER_ADMIN JWT redirects to `/login`.
- [ ] Navigating to the super-admin section with a valid SUPER_ADMIN JWT renders the navy sidebar and "LankaCommerce" wordmark.
- [ ] The tenant management page lists tenants fetched from the Django API.
- [ ] The provisioning wizard successfully creates a new tenant via POST to the Django API.
- [ ] Suspending a tenant via the detail page calls the Django suspend endpoint and reflects the new status immediately.
- [ ] A request to a store route for a SUSPENDED tenant is redirected to `/suspended`.
- [ ] A request to a store route for a GRACE_PERIOD tenant passes through with the grace period banner visible.
- [ ] Running `poetry run python manage.py seed_plans` creates or updates two Plan records.
- [ ] Running `SEED_SAMPLE_TENANT=true poetry run python manage.py seed_sample_tenant` creates the Dilani Boutique tenant, owner user, and active subscription.
- [ ] The system health page shows the Django API status, database connectivity, and recent audit log entries.

---

## Notes

- The task order in the list is recommended but not strictly enforced. Tasks 01.03.01, 01.03.06, and 01.03.07 are backend-only tasks that can be completed by a backend developer in parallel with the frontend tasks (01.03.02 through 01.03.05).
- Task 01.03.09 (middleware) depends on the Django status endpoint built in Task 01.03.07, so the backend status endpoint should be ready before testing the middleware.
- All Django API responses must include appropriate CORS headers so that the Next.js frontend on port 3000 can call the Django API on port 8000 during development. This was configured as part of SubPhase 01.01 or 01.02.
- Do not hard-code the Django base URL in frontend components. Use the NEXT_PUBLIC_API_URL or DJANGO_API_BASE_URL environment variable, as appropriate for client-side versus server-side usage.
