# Task 01.01.02 — Configure Django ORM and PostgreSQL

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Medium |
| Dependencies | Task_01_01_01 |

## Objective

Configure Django ORM to connect to the LankaCommerce PostgreSQL database, run Django's initial built-in migrations, verify database connectivity via the Django admin interface, create the core Django application, and add a Makefile for common backend workflow commands.

## Instructions

### Step 1: Confirm Database Dependencies Are Installed

All commands in this task are run from inside the `backend/` directory unless stated otherwise. The `psycopg2-binary` PostgreSQL adapter and `python-decouple` environment variable reader were added in Task 01.01.01. Verify they are listed in `pyproject.toml` under `[tool.poetry.dependencies]` by opening the file. If either package is missing, add it now by running `poetry add psycopg2-binary python-decouple`. Do not use `psycopg2` (without the `-binary` suffix) for local development — the binary distribution bundles all native libraries and requires no system-level compilation, making it significantly easier to set up across different developer machines. The non-binary version is acceptable for production Docker images where the build environment can be controlled precisely, but that distinction is outside the scope of this task.

### Step 2: Configure Django Database Settings

Open `config/settings/base.py`. Locate the `DATABASES` dictionary that Django generated during project initialisation — it will be pre-configured to use SQLite. Replace the entire `DATABASES` block with a PostgreSQL configuration that reads its values from environment variables using `python-decouple`. Add the following import at the top of `base.py` alongside the existing imports:

```python
from decouple import config
```

Then replace the `DATABASES` block with:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

Using individual connection parameters rather than a single `DATABASE_URL` string is the preferred pattern with `python-decouple`, as it makes each credential independently configurable and avoids the need to parse a connection string manually. The `default` argument on `DB_HOST` and `DB_PORT` provides sensible fallback values so that developers running a standard local PostgreSQL installation do not need to set these in their `.env` file unless their configuration differs from the defaults.

While editing `base.py`, also update the `INSTALLED_APPS` list to include Django REST Framework and CORS headers, which were installed in Task 01.01.01 but not yet registered:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
]
```

Add the CORS middleware to the `MIDDLEWARE` list, placing it as high as possible — it must appear before `CommonMiddleware`:

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... remaining middleware ...
]
```

Add a default REST Framework configuration block at the bottom of `base.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
}
```

### Step 3: Configure the Database Connection Credentials

Create a file named `.env` inside the `backend/` directory. This file is read automatically by `python-decouple` when it searches for configuration values. Add the following content, replacing each placeholder with your actual PostgreSQL credentials:

```
DB_NAME=lanka_commerce_dev
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
SECRET_KEY=your-django-secret-key-here-generate-with-openssl
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=config.settings.development
```

Confirm that `backend/.env` is covered by the root-level `.gitignore` entry for `*.env.local` and `**/.env`. If the root `.gitignore` only covers `.env` at the root level, add `backend/.env` as an explicit entry to ensure it is never committed. Secrets must never appear in source control.

### Step 4: Update base.py to Read SECRET_KEY and DEBUG from Environment

While still in `config/settings/base.py`, update the `SECRET_KEY` and `DEBUG` settings to read from environment variables instead of using hardcoded values. Replace the generated `SECRET_KEY = '...'` line with:

```python
SECRET_KEY = config('SECRET_KEY')
```

Replace `DEBUG = True` with:

```python
DEBUG = config('DEBUG', default=False, cast=bool)
```

Also update `ALLOWED_HOSTS` to read from the environment:

```python
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])
```

These changes ensure no sensitive values are hardcoded in source-controlled files. The `base.py` settings file is committed to version control and must contain no credentials.

### Step 5: Run the First Migration

With the database credentials configured and the settings updated, run Django's initial migration to create all built-in database tables. From inside `backend/`, run:

```
poetry run python manage.py migrate
```

Django will apply all migrations for the built-in applications: `admin`, `auth`, `contenttypes`, and `sessions`. Watch the terminal output and confirm each migration line ends with `OK`. The output should list approximately twelve to fifteen migrations depending on the Django version installed. If the command fails with a database connection error, verify that the PostgreSQL server is running and that the credentials in `backend/.env` are correct, that the database named `lanka_commerce_dev` (or your configured `DB_NAME`) exists, and that the user has CREATE TABLE permissions on that database. Create the database if it does not yet exist by running `psql -U your_username -c "CREATE DATABASE lanka_commerce_dev;"` in a separate terminal.

### Step 6: Verify Django Admin Accessibility

Run the Django development server by executing `poetry run python manage.py runserver` from inside `backend/`. Open a browser and navigate to `http://localhost:8000/admin`. Confirm that the Django admin login page loads without any database errors or Python tracebacks. The presence of the admin login form confirms that all `auth` migrations were applied successfully and the database is reachable. You do not need to log in at this stage — simply confirming that the page renders correctly is sufficient. Stop the server with `Ctrl+C`.

### Step 7: Create the Core Application

Create the first custom Django application, named `core`, which will serve as the foundation app for cross-cutting utilities, the seed management command scaffold, and base model abstractions. From inside `backend/`, first create the `apps/` directory if it does not exist: `mkdir -p apps/core`. Then run:

```
poetry run python manage.py startapp core apps/core
```

This creates the Django app files (`models.py`, `views.py`, `apps.py`, `admin.py`, `tests.py`, `migrations/`) inside `apps/core/`. Open `apps/core/apps.py` and confirm the `name` attribute is set to `'apps.core'`. If it was generated as `'core'`, update it to `'apps.core'` to reflect the nested package path.

Open `config/settings/base.py` and add `'apps.core'` to the `INSTALLED_APPS` list under a new comment block:

```python
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    # ... existing entries ...
    # Third-party
    'rest_framework',
    'corsheaders',
    # LankaCommerce apps
    'apps.core',
]
```

Create an `apps/__init__.py` file to make `apps/` a proper Python package:

```
touch apps/__init__.py
```

### Step 8: Add a Makefile for Common Backend Commands

Create a file named `Makefile` in the `backend/` directory. A Makefile provides a standardised, memorable command interface for all developers working on the backend without requiring them to remember the full `poetry run python manage.py ...` invocation each time. Add the following targets:

```makefile
.PHONY: runserver migrate makemigrations shell test seed lint format format-check

runserver:
	poetry run python manage.py runserver

migrate:
	poetry run python manage.py migrate

makemigrations:
	poetry run python manage.py makemigrations

shell:
	poetry run python manage.py shell

test:
	poetry run python manage.py test

seed:
	poetry run python manage.py seed_phase1

lint:
	poetry run ruff check .

format:
	poetry run black . && poetry run isort .

format-check:
	poetry run black --check . && poetry run isort --check-only .
```

The `seed` target references the `seed_phase1` management command that will be created in Task 01.01.11. The `lint`, `format`, and `format-check` targets reference Ruff, Black, and isort, which will be installed in Task 01.01.05. Committing the Makefile now establishes the interface before the tools are in place.

## Expected Output

- `config/settings/base.py` contains a `DATABASES` dictionary configured for PostgreSQL using `python-decouple` for all credentials
- `config/settings/base.py` reads `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` from environment variables
- `rest_framework`, `corsheaders`, and `apps.core` are all listed in `INSTALLED_APPS`
- `backend/.env` exists, is gitignored, and contains valid credentials for the local PostgreSQL database
- `poetry run python manage.py migrate` completes with all migrations applied successfully (exit code 0)
- `http://localhost:8000/admin` renders the Django admin login page without database errors
- `apps/core/` exists with all standard Django app files and `apps.py` using the name `'apps.core'`
- `backend/Makefile` is present with all eight targets

## Validation

- [ ] `poetry run python manage.py migrate` completes with zero errors and all migrations showing `OK`
- [ ] `http://localhost:8000/admin` loads the Django admin login page without errors
- [ ] `config/settings/base.py` contains no hardcoded `SECRET_KEY`, `DEBUG`, or `ALLOWED_HOSTS` values
- [ ] `backend/.env` is gitignored and does not appear in `git status` output
- [ ] `apps/core/apps.py` has `name = 'apps.core'`
- [ ] `'apps.core'` is present in `INSTALLED_APPS` in `base.py`
- [ ] `backend/Makefile` exists and `make runserver` starts the Django server

## Notes

The `python-decouple` library searches for configuration values in the following order: environment variables set in the shell session, values in a `.env` file in the same directory as `manage.py`, and finally the default value passed to the `config()` call. This means that in CI/CD environments, secrets are injected as actual environment variables (not stored in a `.env` file), and the library picks them up transparently without any code changes. The `.env` file approach is exclusively for local development convenience. In production, `DJANGO_SETTINGS_MODULE` should be set to `config.settings.production` via the hosting platform's environment variable configuration.
