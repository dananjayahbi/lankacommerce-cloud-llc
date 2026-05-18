# Task 01.01.11 — Configure Django Seed Fixtures

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Low |
| Dependencies | Task_01_01_02 |

## Objective

Create a custom Django management command as a Phase 01 seed placeholder, establish the fixtures directory for future data seeding, and verify that the management command executes successfully against the connected database. This task replaces the Prisma seed script approach from VelvetPOS — all data seeding in LankaCommerce is performed via Django management commands and Django fixture files.

## Instructions

All commands and file paths in this task are relative to the `backend/` directory unless stated otherwise.

### Step 1: Create the Management Command Directory Structure

Django management commands live inside a `management/commands/` directory within a registered Django application. The `apps/core/` application created in Task 01.01.02 is the correct home for cross-cutting utility commands such as the seed placeholder.

Create the required directory structure inside `apps/core/`. Django requires `__init__.py` files at each level to recognise the directories as Python packages:

```
apps/core/management/__init__.py
apps/core/management/commands/__init__.py
```

Create both `__init__.py` files as empty files. On Unix/Linux/macOS, you can run:

```bash
mkdir -p apps/core/management/commands
touch apps/core/management/__init__.py
touch apps/core/management/commands/__init__.py
```

Confirm the directory structure exists before proceeding. Django will not discover management commands if either `__init__.py` file is missing.

### Step 2: Write the seed_phase1 Management Command

Create the file `apps/core/management/commands/seed_phase1.py`. This file implements a custom Django management command that can be invoked via `python manage.py seed_phase1`. Django's management command system requires the file to define a class named `Command` that inherits from `BaseCommand`.

The command should:
1. Verify database connectivity using Django's `connections` interface
2. Print a clear placeholder message confirming the connection and Phase 01 status
3. Exit cleanly with code 0

Create the file with the following content:

```python
from django.core.management.base import BaseCommand
from django.db import connections


class Command(BaseCommand):
    help = 'LankaCommerce Phase 01 seed placeholder — verifies database connectivity.'

    def handle(self, *args, **kwargs):
        # Verify database connectivity using the default connection
        db_conn = connections['default']
        db_conn.ensure_connection()

        self.stdout.write(
            self.style.SUCCESS(
                'LankaCommerce seed command connected to database successfully. '
                'No data seeded at this stage — Phase 01 placeholder.'
            )
        )
```

The `self.style.SUCCESS(...)` wrapper causes the message to be printed in green text in the terminal, consistent with Django's management command output conventions. The `ensure_connection()` call actively opens the database connection and raises a `django.db.OperationalError` if the database is unreachable, providing a meaningful failure message rather than a silent success.

### Step 3: Verify the Management Command Structure

Before running the command, verify that all four required files exist:

- `apps/core/__init__.py` (created by `startapp` in Task 01.01.02)
- `apps/core/apps.py` (with `name = 'apps.core'`)
- `apps/core/management/__init__.py` (created in Step 1)
- `apps/core/management/commands/__init__.py` (created in Step 1)
- `apps/core/management/commands/seed_phase1.py` (created in Step 2)

Run `find apps/core -type f -name "*.py" | sort` and confirm all five files are listed in the output.

### Step 4: Confirm core App Registration in INSTALLED_APPS

Open `config/settings/base.py` and confirm that `'apps.core'` appears in the `INSTALLED_APPS` list. This registration is what causes Django to discover management commands defined inside `apps/core/management/commands/`. If the entry was added in Task 01.01.02, simply confirm its presence. If it is missing, add it now:

```python
INSTALLED_APPS = [
    # ... existing entries ...
    # LankaCommerce apps
    'apps.core',
]
```

### Step 5: Run the Management Command

Execute the seed command from inside `backend/`:

```
poetry run python manage.py seed_phase1
```

Watch the terminal output carefully. The command should print a green success message reading:

```
LankaCommerce seed command connected to database successfully. No data seeded at this stage — Phase 01 placeholder.
```

The command should exit with code 0. If the command fails with `CommandError: Unknown command: 'seed_phase1'`, check that both `__init__.py` files in the management command path are present and that `'apps.core'` is in `INSTALLED_APPS`. If the command fails with a database connection error (`django.db.OperationalError`), verify that the PostgreSQL server is running and that the credentials in `backend/.env` are correct.

### Step 6: Create the Django Fixtures Directory

Create a `fixtures/` directory inside `backend/`:

```bash
mkdir fixtures
touch fixtures/.gitkeep
```

The `fixtures/` directory will hold Django fixture files in JSON or YAML format for loading reference data such as default product categories, currencies, store configurations, and permission groups. These fixtures will be added in later sub-phases as models are defined. The `.gitkeep` placeholder ensures the directory is committed to source control so all team members have the fixtures directory in place when they clone the repository. Remove `.gitkeep` when the first real fixture file is added.

Add a `README.md` inside `fixtures/` to document the directory's purpose:

```markdown
# LankaCommerce Django Fixtures

This directory contains Django fixture files for loading reference and seed data.

Fixtures are added per sub-phase as models are defined. To load a fixture, run:

    poetry run python manage.py loaddata fixtures/<fixture-name>.json

Fixtures must be idempotent — re-running `loaddata` on the same fixture should
produce the same database state. Use `natural_keys` for cross-fixture references.
```

### Step 7: Add the seed Makefile Target

Open `backend/Makefile`. The `seed` target should already be present from Task 01.01.02 (it was stubbed there in anticipation of this task). Verify its content:

```makefile
seed:
	poetry run python manage.py seed_phase1
```

If the target was not added in Task 01.01.02, add it now. Also consider adding a `loaddata` target for loading fixture files:

```makefile
loaddata:
	poetry run python manage.py loaddata $(FIXTURE)
```

This allows loading a specific fixture by running `make loaddata FIXTURE=fixtures/my-fixture.json`.

### Step 8: Verify Django ORM Connectivity in the Command

Confirm that the `seed_phase1` command actively verifies database connectivity rather than just printing a message. The `connections['default'].ensure_connection()` call in Step 2 achieves this. To explicitly test this, temporarily set an incorrect database password in `backend/.env` and run the command — confirm it raises a `django.db.OperationalError` rather than printing the success message. Restore the correct password afterwards. This verification confirms that the command is a genuine connectivity check, not merely a print statement.

## Expected Output

- `apps/core/management/__init__.py` exists (empty)
- `apps/core/management/commands/__init__.py` exists (empty)
- `apps/core/management/commands/seed_phase1.py` exists with the `Command` class inheriting from `BaseCommand`
- `poetry run python manage.py seed_phase1` executes successfully and prints the green success message
- `backend/fixtures/` directory exists with `.gitkeep` and `README.md`
- `backend/Makefile` has a `seed` target that runs the `seed_phase1` command

## Validation

- [ ] `poetry run python manage.py seed_phase1` exits with code 0
- [ ] The terminal output includes the green success message with the connectivity confirmation
- [ ] `apps/core/management/__init__.py` and `apps/core/management/commands/__init__.py` both exist
- [ ] `'apps.core'` is present in `INSTALLED_APPS` in `config/settings/base.py`
- [ ] `backend/fixtures/` directory exists and is committed to source control (via `.gitkeep`)
- [ ] `make seed` (inside `backend/`) successfully runs the seed command

## Notes

The Django management command pattern used here is the idiomatic replacement for Prisma's `seed.ts` script. As LankaCommerce's data models are defined in later sub-phases, the `seed_phase1` command will be extended with actual data insertion logic — or new management commands (such as `seed_products`, `seed_categories`, `seed_demo_store`) will be created for each domain area and orchestrated by a master `seed_all` command. All seed operations must use Django ORM's `get_or_create()` or `update_or_create()` methods to ensure idempotency — re-running the seed must never create duplicate records. Fixture files (`.json` or `.yaml`) are preferred for static reference data (currencies, default categories, permission groups) because they can be loaded with the standard `loaddata` command and are version-controlled alongside the models they populate.
