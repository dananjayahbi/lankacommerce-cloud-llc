# Task 04.01.06 — Build Customer CSV Import

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.06 |
| Complexity | Medium |
| Dependencies | 04.01.01 + 04.01.03 |
| Produces | `backend/apps/crm/views/customer_import_view.py`, `frontend/components/customers/ImportCustomersSheet.tsx` |

---

## Objective

Provide staff with a bulk CSV import facility for onboarding customer records. The import parses, validates, deduplicates, and bulk-inserts customer rows, returning a row-level summary of imported, skipped, and rejected records. The import uses Python's built-in `csv` module — no third-party CSV library.

---

## Instructions

### Step 1: Define the Expected CSV Format

The import accepts a UTF-8 encoded CSV file with the first row as a header row. Column headers are matched case-insensitively after stripping surrounding whitespace.

Supported columns:

- `Name` — required; string, 1–100 characters
- `Phone` — optional; stored as entered after stripping leading and trailing whitespace
- `Email` — optional; if present, must be a valid email address format (validated with a simple regex: one or more non-whitespace chars + `@` + domain + `.` + TLD)
- `Gender` — optional; if present, must be one of `MALE`, `FEMALE`, or `OTHER` (case-insensitive)
- `Birthday` — optional; if present, must parse as ISO `YYYY-MM-DD`; any other format is rejected with a row-level error
- `Tags` — optional; comma-separated values within a single cell; each value is stripped of whitespace and normalised to upper-case before storage
- `Notes` — optional; string, max 500 characters; truncated silently to 500 if longer

Empty rows (all cells blank after stripping) are skipped silently and not counted.

### Step 2: Build the Customer Import DRF View

Create `backend/apps/crm/views/customer_import_view.py`. Implement `CustomerImportView` as a DRF `APIView` with `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.

Import at the top: `import csv`, `import io`, `import re`, `from datetime import date as date_type`, `from backend.apps.crm.models import Customer`.

**In the `post(self, request)` method:**

**Guard 1 — File presence:**

`uploaded_file = request.FILES.get('csv')`. If `None`, return 400 with `{ "success": false, "error": { "code": "NO_FILE", "message": "No file provided" } }`.

**Guard 2 — File size:**

If `uploaded_file.size > 2 * 1024 * 1024`, return 413 with `{ "success": false, "error": { "code": "FILE_TOO_LARGE", "message": "File size exceeds the 2 MB limit" } }`.

**Guard 3 — File type:**

If not `uploaded_file.name.lower().endswith('.csv')`, return 415 with `{ "success": false, "error": { "code": "INVALID_FILE_TYPE", "message": "Only .csv files are accepted" } }`.

**Decode and parse:**

`content = uploaded_file.read().decode('utf-8')`. Wrap in `io.StringIO(content)`. Pass to `csv.DictReader`. After construction, normalise all field names (the `reader.fieldnames` list) to lower-case stripped strings by rebuilding the reader with remapped fieldnames:

Construct a mapping `header_map = {h.strip().lower(): h for h in reader.fieldnames}`. The rest of the processing accesses row values via the lower-case key names.

Alternatively, read all rows and re-key each row dict to lower-case before processing.

**Guard 4 — Row count:**

Read all rows into a Python list: `rows = list(reader)`. If `len(rows) > 500`, return 422 with `{ "success": false, "error": { "code": "ROW_LIMIT_EXCEEDED", "message": "Import limit is 500 rows per file" } }`.

**Row-level processing:**

Initialise `errors = []`, `skipped_count = 0`, `valid_customers = []`.

For each row at index `i` (1-based, since row 1 is the header):

1. Extract and strip: `name = row.get('name', '').strip()`.
2. If `name` is empty, append `{ "row": i + 1, "message": "Name is required" }` to `errors` and `continue`.
3. If `name` exceeds 100 characters, append error and `continue`.
4. Validate `email` format if present — use `re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email)`. Append error if invalid.
5. Validate `gender` membership if present — `gender.upper() in ['MALE', 'FEMALE', 'OTHER']`. Append error if not.
6. Validate `birthday` if present — attempt `date_type.fromisoformat(birthday_str)`. If `ValueError` is raised, append `{ "row": i + 1, "message": f"Invalid birthday format '{birthday_str}'. Use YYYY-MM-DD" }` and `continue`.
7. Parse `tags` — `[t.strip().upper() for t in tags_str.split(',') if t.strip()]` — results in an empty list if `tags_str` is empty.
8. Truncate `notes` to 500 characters.

After row-level validation passes, check for phone duplicates: if `phone` is non-empty, call `Customer.objects.filter(tenant_id=tenant_id, phone=phone).exists()`. If `True`, increment `skipped_count` and `continue`.

Append a `Customer(tenant_id=tenant_id, name=name, phone=phone, email=email or None, gender=gender.upper() if gender else None, birthday=parsed_birthday, tags=tags_list, notes=notes)` instance to `valid_customers`.

**Bulk insert:**

`created = Customer.objects.bulk_create(valid_customers, ignore_conflicts=True)`. The return value count may differ from `len(valid_customers)` if the DB-level unique constraint catches remaining duplicates — use `len(created)` as `imported_count`.

**Return:**

`Response({ "success": True, "data": { "imported": imported_count, "skipped": skipped_count, "errors": errors } }, status=200)`.

Register at `POST /api/crm/customers/import/` in `backend/apps/crm/urls.py`.

### Step 3: Build the ImportCustomersSheet Component

Create `frontend/components/customers/ImportCustomersSheet.tsx` as a Client Component.

Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSuccess: () => void`.

**Inside ShadCN `Sheet` (right side):**

Sheet header: "Import Customers" title, "Upload a CSV file to add multiple customers at once." description.

**Description block** (below header, above file input):

A muted text paragraph listing the expected columns: Name (required), Phone, Email, Gender, Birthday (YYYY-MM-DD), Tags (comma-separated), Notes. Row limit: 500 rows per file. File size limit: 2 MB.

**"Download Template" link:**

On click, generate a CSV Blob client-side using the template header string: `"Name,Phone,Email,Gender,Birthday,Tags,Notes\r\n"`. Create a temporary `<a>` element, set `href = URL.createObjectURL(new Blob([template], { type: 'text/csv' }))`, set `download = "customer_import_template.csv"`, programmatically click, then call `URL.revokeObjectURL(href)` to clean up. Use an `onClick` handler on a ShadCN `Button` with `variant="outline"` and a download icon.

**File input:**

ShadCN `Input` with `type="file"` and `accept=".csv"`. Controlled via local state `selectedFile: File | null`. On change, read the file name and update state. Show the selected file name below the input if a file is selected.

**"Import" button:**

Disabled when `selectedFile === null`. Primary style. Shows `Loader2` spinner and "Importing..." text during upload.

**On "Import" click:**

Build a `FormData` object. Append the file: `formData.append('csv', selectedFile)`. Call TanStack Query `useMutation` posting to `/api/crm/customers/import/` with `Content-Type: multipart/form-data` (set automatically by the browser when using `FormData`).

**On success — render result card:**

Replace the file input section with a styled result display:

- Green row: "N customers imported successfully." with a `CheckCircle` icon in `#22C55E`.
- Amber row (only when `skipped > 0`): "N rows skipped (duplicate phone numbers)." with `AlertCircle` icon in `#F59E0B`.
- Red collapsible section (only when `errors.length > 0`): "N rows had errors." — expandable to show a list of `{ row, message }` entries. Use a ShadCN `Collapsible` or a `details`/`summary` element.

Call `onSuccess()` after import so the customer list page refetches and shows the new records. Show a "Close" button.

---

## Expected Output

- `backend/apps/crm/views/customer_import_view.py` — POST handler with parse / validate / deduplicate / bulk-insert pipeline using Python `csv` + `io.StringIO`.
- `frontend/components/customers/ImportCustomersSheet.tsx` — upload Sheet with template download, file input, and result display.
- "Import Customers" button wired on `frontend/app/[tenantSlug]/customers/page.tsx` to open `ImportCustomersSheet`.

---

## Validation

- A valid 10-row CSV returns `{ "imported": 10, "skipped": 0, "errors": [] }`.
- A row with a phone already in the database appears in `skipped_count`, not in `errors`.
- A row with `Birthday = "17-03-1990"` (wrong format) appears in `errors` with a meaningful message.
- A row with a missing `Name` column appears in `errors`.
- A row with an invalid `Email` format appears in `errors`.
- A file exceeding 2 MB returns HTTP 413 before any parsing occurs.
- A file with more than 500 data rows returns HTTP 422.
- The "Download Template" link generates and downloads a `customer_import_template.csv` file.

---

## Notes

- Python's `csv.DictReader` is case-sensitive by default — always normalise header keys to lower-case immediately after constructing the reader to make the import tolerant of `NAME`, `name`, or `Name` column headers.
- The `ignore_conflicts=True` flag in `bulk_create` acts as a database-level final safety net for duplicates that passed the phone check but match on a DB unique constraint. However, the application-level phone duplicate check (Step 2, row processing) is preferred for accuracy because it produces explicit `skipped_count` feedback rather than silently swallowing the row.
- Do not use `chardet` or third-party encoding detection — require UTF-8 input and return a clear error if `UnicodeDecodeError` is raised during `.decode('utf-8')`. Add a try-except around the decode call and return 400 with "File must be UTF-8 encoded."
