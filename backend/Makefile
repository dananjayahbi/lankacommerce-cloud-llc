.PHONY: runserver migrate makemigrations shell test seed seed-superadmin seed-plans seed-catalog loaddata lint format format-check

PYTHON = .venv/Scripts/python
PIP = .venv/Scripts/pip

runserver:
	$(PYTHON) manage.py runserver

migrate:
	$(PYTHON) manage.py migrate

makemigrations:
	$(PYTHON) manage.py makemigrations

shell:
	$(PYTHON) manage.py shell

test:
	$(PYTHON) manage.py test

seed:
	$(PYTHON) manage.py seed_phase1

seed-superadmin:
	$(PYTHON) manage.py seed_superadmin

# Seeds the two standard subscription plans. Safe to re-run (idempotent).
seed-plans:
	$(PYTHON) manage.py seed_plans

# Requires SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in environment.
# Creates Dilani Boutique sample tenant. Safe to re-run (idempotent).
seed-sample-tenant:
	SEED_SAMPLE_TENANT=true $(PYTHON) manage.py seed_sample_tenant

# Run all seed commands in the correct order on a fresh database.
seed-all: seed-superadmin seed-plans seed-sample-tenant

# Seeds 5 categories, 4 brands, 30 products, and their variants for the dev tenant.
# Idempotent — prints a message and exits if seed data already exists.
# Requires: the dev tenant (subdomain='dev') must already exist.
seed-catalog:
	$(PYTHON) manage.py seed_catalog

loaddata:
	$(PYTHON) manage.py loaddata $(FIXTURE)

lint:
	.venv/Scripts/ruff check .

format:
	.venv/Scripts/black . && .venv/Scripts/isort .

format-check:
	.venv/Scripts/black --check . && .venv/Scripts/isort --check-only .
