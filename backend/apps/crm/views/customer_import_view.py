"""Customer CSV import view."""
from __future__ import annotations

import csv
import io
import re
from datetime import date as date_type
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.permissions import HasPermission
from apps.accounts.constants.permissions import PERMISSIONS
from apps.crm.models import Customer


class CustomerImportView(APIView):
    """POST /api/crm/customers/import/"""

    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CUSTOMERS_CREATE)]

    def post(self, request: Request) -> Response:
        tenant_id = request.user.tenant_id

        # Guard 1 — file presence
        uploaded_file = request.FILES.get("csv")
        if uploaded_file is None:
            return Response(
                {"success": False, "error": {"code": "NO_FILE", "message": "No file provided"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guard 2 — file size
        if uploaded_file.size > 2 * 1024 * 1024:
            return Response(
                {"success": False, "error": {"code": "FILE_TOO_LARGE", "message": "File size exceeds the 2 MB limit"}},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        # Guard 3 — file type
        if not uploaded_file.name.lower().endswith(".csv"):
            return Response(
                {"success": False, "error": {"code": "INVALID_FILE_TYPE", "message": "Only .csv files are accepted"}},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        # Decode
        try:
            content = uploaded_file.read().decode("utf-8")
        except UnicodeDecodeError:
            return Response(
                {"success": False, "error": {"code": "ENCODING_ERROR", "message": "File must be UTF-8 encoded"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            return Response(
                {"success": False, "error": {"code": "EMPTY_FILE", "message": "CSV file is empty or missing headers"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalise headers to lower-case
        normalized_fieldnames = [f.strip().lower() for f in reader.fieldnames]
        reader.fieldnames = normalized_fieldnames

        # Guard 4 — row count
        rows = list(reader)
        if len(rows) > 500:
            return Response(
                {"success": False, "error": {"code": "ROW_LIMIT_EXCEEDED", "message": "Import limit is 500 rows per file"}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        errors: list[dict] = []
        skipped_count = 0
        valid_customers: list[Customer] = []

        for i, row in enumerate(rows):
            row_num = i + 2  # 1-indexed, header is row 1

            # Skip blank rows
            if all(not v.strip() for v in row.values() if v):
                continue

            name = (row.get("name") or "").strip()
            if not name:
                errors.append({"row": row_num, "message": "Name is required"})
                continue
            if len(name) > 100:
                errors.append({"row": row_num, "message": "Name exceeds 100 characters"})
                continue

            phone = (row.get("phone") or "").strip() or None
            email = (row.get("email") or "").strip() or None
            gender_raw = (row.get("gender") or "").strip()
            birthday_raw = (row.get("birthday") or "").strip()
            tags_raw = (row.get("tags") or "").strip()
            notes = (row.get("notes") or "").strip()[:500]

            if email and not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
                errors.append({"row": row_num, "message": f"Invalid email '{email}'"})
                continue

            gender = None
            if gender_raw:
                g = gender_raw.upper()
                if g not in ("MALE", "FEMALE", "OTHER"):
                    errors.append({"row": row_num, "message": f"Invalid gender '{gender_raw}'. Use MALE, FEMALE, or OTHER"})
                    continue
                gender = g

            parsed_birthday = None
            if birthday_raw:
                try:
                    parsed_birthday = date_type.fromisoformat(birthday_raw)
                except ValueError:
                    errors.append({"row": row_num, "message": f"Invalid birthday format '{birthday_raw}'. Use YYYY-MM-DD"})
                    continue

            tags_list = [t.strip().upper() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

            # Phone duplicate check
            if phone and Customer.objects.filter(tenant_id=tenant_id, phone=phone).exists():
                skipped_count += 1
                continue

            valid_customers.append(
                Customer(
                    tenant_id=tenant_id,
                    name=name,
                    phone=phone,
                    email=email,
                    gender=gender,
                    birthday=parsed_birthday,
                    tags=tags_list,
                    notes=notes,
                )
            )

        created = Customer.objects.bulk_create(valid_customers, ignore_conflicts=True)

        return Response(
            {
                "success": True,
                "data": {
                    "imported": len(created),
                    "skipped": skipped_count,
                    "errors": errors,
                },
            },
            status=status.HTTP_200_OK,
        )
