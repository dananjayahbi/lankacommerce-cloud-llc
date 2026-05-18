from django.core.management.base import BaseCommand
from django.db import connections


class Command(BaseCommand):
    help = "LankaCommerce Phase 01 seed placeholder — verifies database connectivity."

    def handle(self, *args, **kwargs):
        # Verify database connectivity using the default connection
        db_conn = connections["default"]
        db_conn.ensure_connection()

        self.stdout.write(
            self.style.SUCCESS(
                "LankaCommerce seed command connected to database successfully. "
                "No data seeded at this stage — Phase 01 placeholder."
            )
        )
