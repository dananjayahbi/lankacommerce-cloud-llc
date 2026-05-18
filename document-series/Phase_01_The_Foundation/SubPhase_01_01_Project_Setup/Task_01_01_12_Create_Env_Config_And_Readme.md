# Task 01.01.12 — Create Env Config and Readme

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Low |
| Dependencies | Task_01_01_01 |

## Objective

Create two `.env.example` files — one for the Django backend and one for the Next.js frontend — documenting every required environment variable for the LankaCommerce platform, and write a comprehensive `README.md` covering setup prerequisites, installation, and all common development workflows for both services.

## Instructions

### Step 1: Create the Backend .env.example File

Create the file `backend/.env.example`. This file must be committed to source control — confirm it is NOT listed in the root `.gitignore`. It contains no real secrets, only placeholder values and documentation comments. It serves as a complete reference for every environment variable the Django backend requires.

Begin the file with a header comment block:

```
# LankaCommerce — Django Backend Environment Variables
# ─────────────────────────────────────────────────────
# Copy this file to backend/.env and fill in the values for your local environment.
# NEVER commit backend/.env to source control — it is gitignored.
```

Then add the following sections:

**Database section:**

```
# ── Database ─────────────────────────────────────────────────────────────────
# Individual PostgreSQL connection parameters read by python-decouple.
DB_NAME=lanka_commerce_dev
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

**Django core section:**

```
# ── Django Core ───────────────────────────────────────────────────────────────
# Generate SECRET_KEY with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-django-secret-key-here
# Set to True for development, False for production
DEBUG=True
# Comma-separated list of allowed hosts
ALLOWED_HOSTS=localhost,127.0.0.1
# Django settings module — use config.settings.development locally, config.settings.production in production
DJANGO_SETTINGS_MODULE=config.settings.development
```

**CORS section:**

```
# ── CORS ──────────────────────────────────────────────────────────────────────
# URL(s) of the Next.js frontend allowed to make cross-origin requests to this API
# Comma-separated for multiple origins
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**JWT / Authentication section:**

```
# ── Authentication (SimpleJWT) ────────────────────────────────────────────────
# Access token lifetime in minutes (default: 60)
ACCESS_TOKEN_LIFETIME_MINUTES=60
# Refresh token lifetime in days (default: 7)
REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Step 2: Create the Frontend .env.example File

Create the file `frontend/.env.example`. This file must also be committed to source control. Begin with a header:

```
# LankaCommerce — Next.js Frontend Environment Variables
# ─────────────────────────────────────────────────────
# Copy this file to frontend/.env.local and fill in the values for your local environment.
# NEVER commit frontend/.env.local to source control — it is gitignored.
```

Then add the following sections:

**API configuration section:**

```
# ── Django REST API ───────────────────────────────────────────────────────────
# Base URL for the Django backend REST API.
# All frontend API client functions in src/lib/api/ use this as their base URL.
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

**PayHere payment gateway section:**

```
# ── PayHere Payment Gateway ───────────────────────────────────────────────────
# Obtain credentials from the PayHere merchant portal after account approval.
PAYHERE_MERCHANT_ID=your-payhere-merchant-id
# WARNING: This is sensitive — never expose to client-side code. Use server actions or Django for payment processing.
PAYHERE_MERCHANT_SECRET=your-payhere-merchant-secret
# Accepted values: "sandbox" (for testing) or "live" (for production payments)
PAYHERE_MODE=sandbox
```

**WhatsApp Business API section:**

```
# ── WhatsApp Business API (Meta Cloud API) ────────────────────────────────────
# Obtain from Meta for Developers portal after creating a WhatsApp Business account.
# https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
```

**File storage section:**

```
# ── File Storage ──────────────────────────────────────────────────────────────
# Accepted values: "supabase" or "cloudinary"
# Only fill in the credentials for the provider you select.
STORAGE_PROVIDER=supabase

# Supabase Storage (used when STORAGE_PROVIDER=supabase)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Cloudinary (used when STORAGE_PROVIDER=cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

**Email section:**

```
# ── Email (Resend) ────────────────────────────────────────────────────────────
# Obtain from https://resend.com — create an account and generate an API key.
RESEND_API_KEY=re_your-resend-api-key
# Must be a verified sender address in your Resend dashboard before emails can be sent.
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

**Application section:**

```
# ── Application ───────────────────────────────────────────────────────────────
# NEXT_PUBLIC_ prefix makes this variable available to client-side JavaScript.
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=LankaCommerce
```

### Step 3: Verify Both .env.example Files

Read through both `.env.example` files carefully. For `backend/.env.example`, confirm it contains exactly the following variable names: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`, `CORS_ALLOWED_ORIGINS`, `ACCESS_TOKEN_LIFETIME_MINUTES`, `REFRESH_TOKEN_LIFETIME_DAYS` — twelve backend variables in four sections. For `frontend/.env.example`, confirm it contains: `NEXT_PUBLIC_API_BASE_URL`, `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_MODE`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `STORAGE_PROVIDER`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` — seventeen frontend variables in five sections. Scan for any lines that do not match the `KEY=value` format (excluding comment lines beginning with `#`) and correct them.

### Step 4: Create the Root README.md — Overview and Prerequisites

Create `README.md` in the monorepo root directory. The first section should be a top-level heading `# LankaCommerce` followed by a concise description paragraph:

> LankaCommerce is a full-stack SaaS Tenant ERP for retail. The backend is built with Django REST Framework (Python 3.12+), Django ORM, and PostgreSQL. The frontend is built with Next.js 15+, TypeScript strict mode, Tailwind CSS 4, ShadCN/UI, TanStack Query, and Zustand. The two services communicate over a REST API — there are no Next.js API routes.

The **Prerequisites** section should list all required tools as a bullet list:
- Python 3.12 or later
- Poetry (install with `pipx install poetry` or the official installer at `python-poetry.org`)
- Node.js 20 or later
- pnpm 9 or later (`npm install -g pnpm`)
- PostgreSQL 15 or later (local or cloud-managed — Supabase, Railway, or Neon are recommended)

### Step 5: Create README.md — Backend Setup Section

Add a **Backend Setup** section to `README.md` with the following numbered steps:

1. Change into the backend directory: `cd backend`
2. Install Python dependencies: `poetry install`
3. Copy the environment file: `cp backend/.env.example backend/.env` (on Windows: `copy backend\.env.example backend\.env`)
4. Fill in the values in `backend/.env` for your local PostgreSQL database
5. Run database migrations: `poetry run python manage.py migrate`
6. Verify the setup by running the seed command: `poetry run python manage.py seed_phase1`
7. Start the Django development server: `poetry run python manage.py runserver` — the API will be available at `http://localhost:8000`
8. Open the Django admin at `http://localhost:8000/admin` and confirm it loads

Also mention the Makefile shortcuts: `make runserver`, `make migrate`, `make seed`, `make lint`, `make format`.

### Step 6: Create README.md — Frontend Setup Section

Add a **Frontend Setup** section with the following numbered steps:

1. Change into the frontend directory: `cd frontend`
2. Install Node.js dependencies: `pnpm install`
3. Copy the environment file: `cp frontend/.env.example frontend/.env.local` (on Windows: `copy frontend\.env.example frontend\.env.local`)
4. Fill in `NEXT_PUBLIC_API_BASE_URL` with `http://localhost:8000/api` (the Django backend URL)
5. Fill in any other required keys (PayHere, WhatsApp, storage) as needed for your development work
6. Start the Next.js development server: `pnpm dev` — the frontend will be available at `http://localhost:3000`

### Step 7: Create README.md — Running Both Services and Common Workflows

Add a **Running Both Services** section explaining that two terminals are needed — one for the Django backend and one for the Next.js frontend. Alternatively, mention the root-level `package.json` convenience scripts: `npm run dev:backend` and `npm run dev:frontend`.

Add a **Common Backend Commands** section listing:
- `make migrate` — apply pending migrations
- `make makemigrations` — create migrations for model changes
- `make seed` — run the Phase 01 seed placeholder (or actual seed commands in later phases)
- `make lint` — run Ruff linter
- `make format` — run Black + isort formatter
- `make test` — run Django test suite
- `make shell` — open Django interactive shell

Add a **Common Frontend Commands** section listing:
- `pnpm dev` — start development server on port 3000
- `pnpm build` — create production build
- `pnpm lint` — run ESLint with zero-warnings flag
- `pnpm format` — run Prettier formatter
- `pnpm tsc --noEmit` — run TypeScript type checker without emitting

Add a **Architecture Note** section briefly explaining: "All database operations are handled by the Django ORM in the backend. The Next.js frontend has no database access and no API routes — it communicates with the Django REST API exclusively via HTTP. API client helper functions live in `frontend/src/lib/api/`. TanStack Query hooks call these helper functions for all server data fetching."

### Step 8: Final Verification of Both Files

Run `git status` from the monorepo root and confirm that `backend/.env.example`, `frontend/.env.example`, and `README.md` all appear as untracked or modified files ready to be staged. Confirm that `backend/.env` and `frontend/.env.local` do NOT appear in `git status` (they are gitignored). Read through `README.md` from start to finish as though you were a developer who just received access to the repository — confirm that following the instructions sequentially from "Prerequisites" through "Frontend Setup" would bring a developer to a running development environment with both services operational.

## Expected Output

- `backend/.env.example` is committed to source control and documents twelve backend environment variables across four sections
- `frontend/.env.example` is committed to source control and documents seventeen frontend environment variables across five sections
- Neither `backend/.env` nor `frontend/.env.local` appear in `git status` (they are gitignored)
- `README.md` in the monorepo root covers both services, all prerequisites, setup steps, common commands, and an architecture note
- A developer following `README.md` can reach a running two-service development environment without additional guidance

## Validation

- [ ] `backend/.env.example` is tracked by git (not in `.gitignore`) and can be committed
- [ ] `frontend/.env.example` is tracked by git and can be committed
- [ ] `backend/.env` is NOT tracked by git and does not appear in `git status`
- [ ] `frontend/.env.local` is NOT tracked by git and does not appear in `git status`
- [ ] `backend/.env.example` contains all twelve backend variables as listed in Step 3
- [ ] `frontend/.env.example` contains all seventeen frontend variables as listed in Step 3
- [ ] `README.md` contains Backend Setup, Frontend Setup, Running Both Services, Common Backend Commands, Common Frontend Commands, and Architecture Note sections
- [ ] All `KEY=value` lines in both `.env.example` files are syntactically valid

## Notes

The two-file `.env.example` approach reflects the monorepo's split architecture — each service has its own environment configuration that is developed, deployed, and rotated independently. The Django backend `.env` file is never read by the Next.js frontend, and the frontend `.env.local` file is never read by Django. The only connection between the two environments at runtime is the `NEXT_PUBLIC_API_BASE_URL` variable in the frontend, which points to the Django server's address. Both `.env.example` files are living documents — whenever a new integration is added to either service in future sub-phases and requires new environment variables, those variables must be added to the corresponding `.env.example` in the same pull request that introduces the integration code. This is a team convention that should be enforced during pull request review.
