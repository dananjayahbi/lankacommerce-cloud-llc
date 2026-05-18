# LankaCommerce

LankaCommerce is a full-stack SaaS Tenant ERP for retail. The backend is built with Django REST Framework (Python 3.12+), Django ORM, and PostgreSQL. The frontend is built with Next.js 15+, TypeScript strict mode, Tailwind CSS 4, ShadCN/UI, TanStack Query, and Zustand. The two services communicate over a REST API — there are no Next.js API routes.

## Prerequisites

- Python 3.12 or later
- Node.js 20 or later
- pnpm 9 or later (`npm install -g pnpm`)
- PostgreSQL 15 or later (local or cloud-managed — Supabase, Railway, or Neon are recommended)

## Backend Setup

1. Change into the backend directory: `cd backend`
2. Create and activate a virtual environment: `python -m venv .venv && source .venv/Scripts/activate` (Windows) or `source .venv/bin/activate` (macOS/Linux)
3. Install Python dependencies: `pip install -r requirements.txt`
4. Copy the environment file: `cp backend/.env.example backend/.env` (Windows: `copy backend\.env.example backend\.env`)
5. Fill in the values in `backend/.env` for your local PostgreSQL database
6. Run database migrations: `python manage.py migrate`
7. Verify the setup by running the seed command: `python manage.py seed_phase1`
8. Start the Django development server: `python manage.py runserver` — the API will be available at `http://localhost:8000`
9. Open the Django admin at `http://localhost:8000/admin` and confirm it loads

**Makefile shortcuts:** `make runserver`, `make migrate`, `make seed`, `make lint`, `make format`

## Frontend Setup

1. Change into the frontend directory: `cd frontend`
2. Install Node.js dependencies: `pnpm install`
3. Copy the environment file: `cp frontend/.env.example frontend/.env.local` (Windows: `copy frontend\.env.example frontend\.env.local`)
4. Fill in `NEXT_PUBLIC_API_BASE_URL` with `http://localhost:8000/api` (the Django backend URL)
5. Fill in any other required keys (PayHere, WhatsApp, storage) as needed for your development work
6. Start the Next.js development server: `pnpm dev` — the frontend will be available at `http://localhost:3000`

## Running Both Services

Two terminals are required — one for the Django backend and one for the Next.js frontend.

**Terminal 1 (backend):**
```bash
cd backend
source .venv/Scripts/activate   # Windows (.venv/bin/activate on macOS/Linux)
python manage.py runserver
```

**Terminal 2 (frontend):**
```bash
cd frontend
pnpm dev
```

Alternatively, use the root-level package.json convenience scripts:
- `npm run dev:backend` — start the Django development server
- `npm run dev:frontend` — start the Next.js development server

## Common Backend Commands

| Command | Description |
|---|---|
| `make migrate` | Apply pending migrations |
| `make makemigrations` | Create migrations for model changes |
| `make seed` | Run the Phase 01 seed placeholder |
| `make lint` | Run Ruff linter |
| `make format` | Run Black + isort formatter |
| `make test` | Run Django test suite |
| `make shell` | Open Django interactive shell |

## Common Frontend Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start development server on port 3000 |
| `pnpm build` | Create production build |
| `pnpm lint` | Run ESLint with zero-warnings flag |
| `pnpm format` | Run Prettier formatter |
| `pnpm tsc --noEmit` | Run TypeScript type checker without emitting |

## Architecture Note

All database operations are handled by the Django ORM in the backend. The Next.js frontend has no database access and no API routes — it communicates with the Django REST API exclusively via HTTP. API client helper functions live in `frontend/src/lib/api/`. TanStack Query hooks call these helper functions for all server data fetching.

```
┌─────────────────────────┐        HTTP/REST        ┌──────────────────────────┐
│  Next.js Frontend        │ ──────────────────────> │  Django REST API          │
│  :3000                   │                         │  :8000                    │
│  src/lib/api/            │ <────────────────────── │  Django ORM + PostgreSQL  │
└─────────────────────────┘        JSON responses    └──────────────────────────┘
```
