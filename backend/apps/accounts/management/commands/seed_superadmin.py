"""
LankaCommerce — Seed Super Admin Account

Django management command for creating the initial Super Admin user.
This command is idempotent: running it when a user with the given email
already exists is a no-op (no error, no overwrite).

Usage:
    .venv/Scripts/python.exe manage.py seed_superadmin

Environment Variables (optional — falls back to defaults if not set):
    SEED_SUPERADMIN_EMAIL       Default: superadmin@lankacommerce.dev
    SEED_SUPERADMIN_PASSWORD    Default: changeme123!

Security Note:
    Always override the default password in production by setting
    SEED_SUPERADMIN_PASSWORD in your environment or .env file.
    The default password is intentionally weak to signal that it must
    be changed.
"""

import os

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.constants.permissions import ALL_PERMISSIONS
from apps.accounts.models import CustomUser


class Command(BaseCommand):
    help = (
        "Seeds the initial Super Admin account for LankaCommerce. "
        "Idempotent: safe to run multiple times."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help=(
                "Email address for the Super Admin account. "
                "Overrides the SEED_SUPERADMIN_EMAIL environment variable."
            ),
        )
        parser.add_argument(
            "--password",
            type=str,
            default=None,
            help=(
                "Password for the Super Admin account. "
                "Overrides the SEED_SUPERADMIN_PASSWORD environment variable. "
                "WARNING: Avoid passing passwords on the command line in production."
            ),
        )

    def handle(self, *args, **options):
        # Resolve email
        email = (
            options.get("email")
            or os.environ.get("SEED_SUPERADMIN_EMAIL")
            or "superadmin@lankacommerce.dev"
        )
        email = email.lower().strip()

        # Resolve password
        password = (
            options.get("password")
            or os.environ.get("SEED_SUPERADMIN_PASSWORD")
            or "changeme123!"
        )

        self.stdout.write(
            self.style.NOTICE(
                f"[seed_superadmin] Checking for existing Super Admin: {email}"
            )
        )

        # Idempotency check — do not overwrite if already exists
        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"[seed_superadmin] Super Admin already exists: {email} — skipping."
                )
            )
            return

        # Create the Super Admin using the custom manager
        try:
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
            )
        except Exception as exc:
            raise CommandError(
                f"[seed_superadmin] Failed to create Super Admin: {exc}"
            ) from exc

        # Assign all known permissions and ensure role is SUPER_ADMIN
        user.permissions_list = ALL_PERMISSIONS
        user.role = "SUPER_ADMIN"
        user.save(update_fields=["permissions_list", "role"])

        self.stdout.write(
            self.style.SUCCESS(
                f"[seed_superadmin] Super Admin created successfully: {email}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "[seed_superadmin] IMPORTANT: Change the default password before "
                "deploying to production.\n"
                "  Set SEED_SUPERADMIN_PASSWORD in your .env file."
            )
        )
