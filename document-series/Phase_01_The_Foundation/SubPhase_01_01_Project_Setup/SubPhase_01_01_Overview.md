# SubPhase 01.01 — Project Setup & Configuration

## Metadata

| Field | Value |
|---|---|
| Phase | Phase 01 — The Foundation |
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Status | Not Started |
| Dependencies | None |

## Objective

SubPhase 01.01 establishes the complete technical foundation for LankaCommerce. This sub-phase transforms an empty repository into a fully configured, standards-compliant monorepo containing a Django REST Framework backend and a Next.js 15+ frontend with all core tooling, design system tokens, database connectivity, and project structure in place.

The goal is to produce a project skeleton that every subsequent sub-phase can build upon without revisiting foundational decisions. Upon completion, the codebase will enforce TypeScript strict mode on the frontend, Python type safety and linting with Ruff and Black on the backend, a consistent design language through Tailwind CSS tokens and ShadCN components, and professional developer-experience tooling through ESLint, Prettier, and Husky pre-commit hooks on the frontend alongside a backend Makefile for common Python workflow commands.

## Scope

### In Scope

- Initialising a monorepo with two sub-projects: a Django REST Framework backend under `backend/` and a Next.js 15+ frontend under `frontend/`
- Configuring Poetry as the Python package manager for the backend and pnpm as the Node.js package manager for the frontend
- Connecting Django ORM to a managed PostgreSQL database, running initial built-in migrations, and verifying connectivity via the Django admin interface
- Configuring Tailwind CSS 4 with the full LankaCommerce design token set: six brand colours, six semantic colours, custom typography scale, and spacing overrides
- Installing ShadCN/UI and re-skinning the core component set to use LankaCommerce tokens exclusively — no generic grey colours permitted
- Configuring ESLint with Next.js + TypeScript strict rules, Prettier with project-wide formatting standards, and Husky lint-staged pre-commit hooks on the frontend; configuring Ruff and Black for backend Python code quality
- Creating the complete canonical directory structure for both the Django backend (apps, config, tests, fixtures) and the Next.js frontend (routes, components, lib, hooks, stores, types, constants) as defined in `00_Project_Overview.md`
- Configuring `frontend/tsconfig.json` for full strict mode and the `@/` path alias mapped to `./src/`
- Downloading and self-hosting the two project fonts (Inter, JetBrains Mono) via `next/font` with CSS variable exports
- Creating the root and route-group layout shells for `(store)`, `(superadmin)`, and `(auth)` route groups in the Next.js frontend
- Wiring TanStack Query (QueryClientProvider) and Zustand store skeletons into the root frontend layout — TanStack Query will be used to fetch data from the Django REST API
- Creating the Django management command scaffold (`seed_phase1`) as a placeholder for future data seeding via fixtures
- Creating `backend/.env.example` and `frontend/.env.example` with all required environment variable definitions and a comprehensive `README.md`

### Out of Scope

- Defining any Django ORM models or database schema beyond the built-in Django tables (admin, auth, contenttypes, sessions)
- Implementing any business logic, frontend pages, or Django API views
- Configuring Django authentication or SimpleJWT (handled in SubPhase 01.02)
- Implementing any actual page UI, store features, or POS functionality
- Writing any unit, integration, or end-to-end tests
- Seeding any actual data into the database
- Configuring CI/CD pipelines or deployment environments

## Technical Context

LankaCommerce is a SaaS Tenant ERP for retail built on a split architecture: a Django REST Framework backend handles all data models, business logic, authentication, and API endpoints, while a Next.js 15+ frontend with the App Router handles all UI rendering and user interaction. The two services communicate exclusively over HTTP via the Django REST API. There are no Next.js API routes (`src/app/api/` is omitted from the frontend).

The monorepo is structured with `backend/` containing the Django project and `frontend/` containing the Next.js project. The backend uses Poetry for dependency management and a `config/` directory for Django settings organised into base, development, and production layers. The frontend uses pnpm and organises source code under `frontend/src/`.

The design system is implemented through Tailwind CSS 4's configuration layer, where custom CSS custom property variables are defined in the global stylesheet and then referenced inside `tailwind.config.ts` as extend.colors entries. This two-layer approach ensures that the tokens are available both as raw CSS variables (for JavaScript runtime access) and as Tailwind utility classes (for JSX className usage). The twelve LankaCommerce design tokens are listed below.

| Token Name | Hex Value | Intended Usage |
|---|---|---|
| navy | #1B2B3A | Sidebar background, dark surface |
| orange | #F97316 | Primary accent, buttons, active states, CTAs |
| orange-dark | #EA6C05 | Button hover and active states |
| surface | #FFFFFF | Card backgrounds, modals, panels |
| background | #F1F5F9 | App main background (slate-100) |
| border | #E2E8F0 | Borders, dividers (slate-200) |
| success | #22C55E | Success badges, positive indicators |
| warning | #F59E0B | Warning states, low stock |
| danger | #EF4444 | Error states, destructive actions |
| info | #3B82F6 | Info badges, callouts |
| text-primary | #0F172A | Main body text (slate-900) |
| text-muted | #64748B | Secondary, placeholder, helper text (slate-500) |

Typography is provided by two self-hosted font families: Inter (used for all body text, UI elements, and headings at all sizes) and JetBrains Mono (used exclusively for SKUs, barcodes, and machine-readable codes). All fonts are loaded via Next.js's built-in `next/font` module from the `public/fonts/` directory and exposed as CSS custom property variables (`--font-body` and `--font-mono`). There is no separate display or heading font — Inter serves all typographic roles at appropriate weights (400, 600, 700).

ShadCN/UI is installed using the shadcn CLI initialiser, which scaffolds component files directly into `frontend/src/components/ui/`. Each component is then modified to reference the LankaCommerce tokens rather than the default ShadCN CSS variable palette. The visual style is a clean, modern interface with a dark navy sidebar, orange primary accents, a white/near-white content area, and subtle rounded cards — consistent with the LankaCommerce reference design.

## Task List

| Task ID | Task Name | Estimated Complexity | Dependencies |
|---|---|---|---|
| Task_01_01_01 | Initialize_Monorepo_Projects | Medium | None |
| Task_01_01_02 | Configure_Django_ORM_And_PostgreSQL | Medium | Task_01_01_01 |
| Task_01_01_03 | Setup_Tailwind_Design_Tokens | Medium | Task_01_01_01 |
| Task_01_01_04 | Install_ShadCN_And_Theme | Medium | Task_01_01_03 |
| Task_01_01_05 | Configure_Linting_And_Formatting | Low | Task_01_01_01 |
| Task_01_01_06 | Create_Directory_Structure | Low | Task_01_01_01 |
| Task_01_01_07 | Configure_TypeScript_Strict_Mode | Low | Task_01_01_01 |
| Task_01_01_08 | Setup_Fonts_And_Assets | Low | Task_01_01_03 |
| Task_01_01_09 | Create_Global_Layout_Shell | Medium | Task_01_01_04, Task_01_01_08 |
| Task_01_01_10 | Setup_TanStack_Query_And_Zustand | Low | Task_01_01_09 |
| Task_01_01_11 | Configure_Django_Seed_Fixtures | Low | Task_01_01_02 |
| Task_01_01_12 | Create_Env_Config_And_Readme | Low | Task_01_01_01 |

## Validation Criteria

- [ ] Running `poetry run python manage.py runserver` inside `backend/` starts the Django development server without errors on port 8000
- [ ] Running `pnpm dev` inside `frontend/` starts the Next.js development server without errors on port 3000
- [ ] Running `pnpm tsc --noEmit` inside `frontend/` completes with zero errors on the project skeleton
- [ ] Running `pnpm lint` inside `frontend/` completes with zero warnings and zero errors
- [ ] Running `poetry run ruff check .` inside `backend/` completes with zero errors
- [ ] All 12 colour tokens (navy, orange, orange-dark, surface, background, border, success, warning, danger, info, text-primary, text-muted) are available as Tailwind utility classes in IntelliSense
- [ ] The ShadCN Button component's primary variant displays the orange (#F97316) background colour
- [ ] Inter and JetBrains Mono fonts load correctly with no visible layout shift in Chrome DevTools
- [ ] All canonical directories for both the Django backend and Next.js frontend exist in the repository
- [ ] The `@/` path alias resolves correctly in both the TypeScript compiler and the Next.js development server
- [ ] Running `poetry run python manage.py seed_phase1` prints the Phase 01 connectivity confirmation message
- [ ] Both `backend/.env.example` and `frontend/.env.example` are present and document every required environment variable
- [ ] The pre-commit hook on the frontend prevents commits when ESLint or Prettier checks fail

## Files Created / Modified

- All backend directories under `backend/` as defined in `00_Project_Overview.md`
- All frontend directories under `frontend/src/` and `frontend/public/` as defined in `00_Project_Overview.md`
- `backend/config/settings/base.py` — Django base settings with PostgreSQL database configuration
- `backend/config/settings/development.py` — Django development settings
- `backend/config/settings/production.py` — Django production settings skeleton
- `backend/pyproject.toml` — Poetry configuration with Ruff and Black tool settings
- `backend/Makefile` — Common backend workflow commands (migrate, runserver, seed, lint, format)
- `backend/apps/core/management/commands/seed_phase1.py` — Phase 01 seed placeholder command
- `backend/fixtures/` — Empty fixtures directory with `.gitkeep`
- `frontend/tailwind.config.ts` — LankaCommerce colour tokens, font family extensions, and spacing overrides
- `frontend/src/app/globals.css` — CSS custom property declarations for all 12 design tokens
- `frontend/src/app/layout.tsx` — Root layout with font variables and provider wrappers
- `frontend/src/app/(store)/layout.tsx` — Store route group layout shell
- `frontend/src/app/(superadmin)/layout.tsx` — SuperAdmin route group layout shell
- `frontend/src/app/(auth)/layout.tsx` — Auth route group layout shell
- `frontend/src/lib/fonts.ts` — next/font configuration exporting CSS variable names for two fonts
- `frontend/src/components/shared/QueryProvider.tsx` — TanStack Query client provider
- `frontend/src/stores/cartStore.ts` — Zustand cart store skeleton
- `frontend/src/stores/offlineStore.ts` — Zustand offline queue store skeleton
- `frontend/src/stores/uiStore.ts` — Zustand UI state store skeleton
- `frontend/src/components/ui/` — ShadCN component files for Button, Card, Input, Select, Textarea, Table, Badge, Dialog, Sheet, Toast
- `backend/.env.example` — Backend environment variable documentation template
- `frontend/.env.example` — Frontend environment variable documentation template
- `README.md` — Monorepo setup and development guide for both services
