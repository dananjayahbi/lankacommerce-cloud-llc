# LankaCommerce Django Fixtures

This directory contains Django fixture files for loading reference and seed data.

Fixtures are added per sub-phase as models are defined. To load a fixture, run:

    poetry run python manage.py loaddata fixtures/<fixture-name>.json

Fixtures must be idempotent — re-running `loaddata` on the same fixture should
produce the same database state. Use `natural_keys` for cross-fixture references.
