"""
Management command: add_tenant_host
====================================
Development-only utility that adds a ``<slug>.localhost`` entry to the system
hosts file so that tenant subdomains resolve to 127.0.0.1 locally.

Usage::

    python manage.py add_tenant_host <slug>

Example::

    python manage.py add_tenant_host lanka-demo

On Windows the hosts file is at::

    C:\\Windows\\System32\\drivers\\etc\\hosts

On Linux / macOS it is::

    /etc/hosts

This command must be run with administrator (Windows) or root (Unix) privileges
to modify the hosts file.  If it is run without sufficient rights it prints the
command you can copy-paste to do it manually.
"""

import platform
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Add a tenant subdomain (slug.localhost → 127.0.0.1) to the local hosts file [dev only]."

    def add_arguments(self, parser):
        parser.add_argument(
            "slug",
            type=str,
            help="Tenant slug to register (e.g. 'testbusiness' → testbusiness.localhost)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            dest="all_tenants",
            help="Add hosts entries for ALL active tenants in the database.",
        )

    def handle(self, *args, **options):
        slugs: list[str] = []

        if options["all_tenants"]:
            slugs = list(
                Tenant.objects.filter(deleted_at__isnull=True).values_list("slug", flat=True)
            )
            if not slugs:
                self.stdout.write(self.style.WARNING("No tenants found in the database."))
                return
        else:
            slugs = [options["slug"]]

        hosts_file = (
            Path("C:/Windows/System32/drivers/etc/hosts")
            if platform.system() == "Windows"
            else Path("/etc/hosts")
        )

        if not hosts_file.exists():
            raise CommandError(f"Hosts file not found at: {hosts_file}")

        try:
            content = hosts_file.read_text(encoding="utf-8")
        except PermissionError:
            self._print_manual_instructions(slugs, hosts_file)
            return

        added: list[str] = []
        already_present: list[str] = []

        new_entries: list[str] = []
        for slug in slugs:
            entry = f"127.0.0.1 {slug}.localhost"
            if entry in content:
                already_present.append(slug)
            else:
                new_entries.append(entry)
                added.append(slug)

        if not new_entries:
            self.stdout.write(
                self.style.WARNING("All requested entries are already present in the hosts file.")
            )
            return

        try:
            with hosts_file.open("a", encoding="utf-8") as fh:
                fh.write("\n# LankaCommerce dev tenants (auto-generated — do not edit)\n")
                for entry in new_entries:
                    fh.write(f"{entry}\n")
        except PermissionError:
            self._print_manual_instructions(
                [s for s in slugs if s not in already_present], hosts_file
            )
            return

        for slug in already_present:
            self.stdout.write(
                self.style.WARNING(f"  '{slug}.localhost' — already in hosts file (skipped)")
            )

        for slug in added:
            self.stdout.write(
                self.style.SUCCESS(
                    f"  '{slug}.localhost' → 127.0.0.1 added to {hosts_file}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. You can now visit http://<slug>.localhost:3000 in your browser."
            )
        )

    # ── helpers ────────────────────────────────────────────────────────────────

    def _print_manual_instructions(self, slugs: list[str], hosts_file: Path) -> None:
        self.stderr.write(
            self.style.ERROR(
                f"\nPermission denied writing to {hosts_file}.\n"
                "Run the command as administrator, or add the entries manually:\n"
            )
        )
        for slug in slugs:
            self.stderr.write(f'  echo "127.0.0.1 {slug}.localhost" >> {hosts_file}')
        self.stderr.write("")
