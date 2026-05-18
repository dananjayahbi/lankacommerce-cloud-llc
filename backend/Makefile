.PHONY: runserver migrate makemigrations shell test seed seed-superadmin loaddata lint format format-check

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

loaddata:
	$(PYTHON) manage.py loaddata $(FIXTURE)

lint:
	.venv/Scripts/ruff check .

format:
	.venv/Scripts/black . && .venv/Scripts/isort .

format-check:
	.venv/Scripts/black --check . && .venv/Scripts/isort --check-only .
