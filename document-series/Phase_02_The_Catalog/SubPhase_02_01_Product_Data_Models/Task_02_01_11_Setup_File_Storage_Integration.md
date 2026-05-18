# Task 02.01.11 — Setup File Storage Integration

## Metadata

| Property | Value |
| --- | --- |
| Sub-Phase | 02.01 — Product & Variant Data Models |
| Phase | 02 — The Catalog |
| Estimated Complexity | Medium |
| Dependencies | Task 01.01.01 (Django project setup), Task 02.01.09 (product image upload endpoint) |

---

## Objective

This task creates a provider-agnostic file storage abstraction for the LankaCommerce backend. Product and variant images are uploaded through the Django API and stored in one of two supported cloud providers — Supabase Storage or Cloudinary — selected by a runtime environment variable. The storage module is strictly server-side and never exposes credentials or raw upload URLs to the frontend.

---

## Instructions

### Step 1: Install Required Packages

In the `backend/` directory, use Poetry to add both supported storage client packages. Run `poetry add supabase` to add the Supabase Python client library. Run `poetry add cloudinary` to add the Cloudinary Python SDK. Both packages will be recorded in `pyproject.toml` and pinned in `poetry.lock`.

### Step 2: Create the Storage Module

Create the file `backend/apps/catalog/storage.py`. This is a standalone Python module that defines all storage-related data structures and functions. It has no Django model dependencies and no DRF imports — it is a pure Python utility module.

At the top of the file, add a documentation comment block describing the module's purpose and the frontend integration contract: the Next.js frontend never calls Supabase or Cloudinary directly for product images. It always sends a multipart POST to the Django upload endpoint, which handles the cloud interaction server-side and returns only the resulting public URL to the browser.

Import `os` for reading environment variables, `logging` for recording warnings and errors, and `dataclasses` from the Python standard library for defining data structures. Import the Supabase client creation function from the `supabase` package and configure the Cloudinary library from the `cloudinary` package.

### Step 3: Define the UploadOptions Data Structure

Define an `UploadOptions` dataclass using the `@dataclass` decorator. Include the following fields:

- `content_type`: a required string field specifying the MIME type of the file, such as `"image/jpeg"` or `"image/webp"`. This is forwarded to the storage provider to set the correct content type on the stored object.
- `max_width`: an optional integer field with a default of `None`. When provided, instructs the storage provider to resize the image to no wider than this value in pixels.
- `max_height`: an optional integer field with a default of `None`. When provided, instructs the provider to resize to no taller than this value.
- `quality`: an optional integer field with a default of `None`, representing a compression quality value between 1 and 100.

### Step 4: Define the UploadResult Data Structure

Define an `UploadResult` dataclass with the following fields:

- `public_url`: a string containing the publicly accessible URL at which the uploaded file can be retrieved.
- `provider`: a string indicating which storage provider handled the upload. Valid values are `"supabase"` and `"cloudinary"`.
- `path`: a string recording the storage path or public ID under which the file was stored. This value is used when deleting the file later.

### Step 5: Implement the Supabase Upload Function

Define an internal function named `_upload_to_supabase` that accepts `file_bytes`, `path`, and an `UploadOptions` instance. Prefix the name with a single underscore to signal that this is a private implementation detail not intended for direct use by views or services.

Inside this function:

1. Read `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from the process environment using `os.environ.get()`. If either variable is absent or empty, raise a `RuntimeError` with a clear message indicating which variable is missing.
2. Read `SUPABASE_STORAGE_BUCKET` from the environment. Default to `"product-images"` if not set, and log a warning that the default is being used.
3. Initialize the Supabase client using the URL and service key.
4. Call the Supabase storage upload method on the configured bucket, providing the storage path, the file bytes, and the content type from the `UploadOptions`.
5. Construct the public URL by combining the Supabase project URL with the storage public URL path pattern for the bucket and file path.
6. Return an `UploadResult` with the public URL, provider name `"supabase"`, and the given path.

### Step 6: Implement the Cloudinary Upload Function

Define an internal function named `_upload_to_cloudinary` that accepts `file_bytes`, `path`, and an `UploadOptions` instance.

Inside this function:

1. Read `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from the environment. Raise a `RuntimeError` if any of the three required variables are absent.
2. Call the Cloudinary configuration function to set the cloud name, API key, and API secret.
3. Upload the file bytes using the Cloudinary upload API, specifying the `public_id` as the provided path string and `resource_type` as `"image"`.
4. If `max_width` or `max_height` are provided in the `UploadOptions`, include them as eager transformation parameters in the upload call to trigger server-side image resizing during ingestion.
5. Extract the `secure_url` field from the Cloudinary API response.
6. Return an `UploadResult` with the secure URL, provider name `"cloudinary"`, and the `public_id` from the response (which may differ slightly from the input path if Cloudinary appended a version or extension).

### Step 7: Implement the Public Upload Function

Define the exported `upload_file` function that accepts `file_bytes`, `path`, and an `UploadOptions` instance. This is the only function that views and service functions should call — it abstracts away the provider selection.

Inside this function:

1. Read the `STORAGE_PROVIDER` environment variable. Valid values are `"supabase"` and `"cloudinary"`.
2. If the value is absent or is not one of the two valid values, default to `"supabase"`, log a warning at the `WARNING` level including the invalid value that was read, and proceed.
3. If the provider is `"cloudinary"`, call `_upload_to_cloudinary(file_bytes, path, options)` and return its result.
4. Otherwise, call `_upload_to_supabase(file_bytes, path, options)` and return its result.

### Step 8: Implement the Delete Function

Define the exported `delete_file` function that accepts `path` and an optional `provider` argument (defaulting to `None`).

Inside this function:

1. If `provider` is `None`, read it from the `STORAGE_PROVIDER` environment variable using the same defaulting logic as `upload_file`.
2. Wrap the entire deletion call in a broad `try/except` block that catches all exceptions.
3. Inside the try block, call the appropriate provider's deletion API with the given path.
4. In the except block, log a `WARNING` level message that includes the path, the provider, and the exception message. Do not re-raise the exception.

Silent failure is the intentional behavior for deletes. Application logic has already updated the database record to remove the URL before calling `delete_file`. If the cloud deletion fails for any reason (network timeout, provider API error, path not found), the application continues without error. A future periodic reconciliation task will clean up orphaned storage files.

### Step 9: Update Environment Configuration

Open `backend/.env.example` and add the following environment variable declarations with empty values and inline comments explaining each:

- `STORAGE_PROVIDER` — the cloud provider to use for file storage; valid values are `supabase` and `cloudinary`; defaults to `supabase` if absent
- `SUPABASE_URL` — the base HTTPS URL of the Supabase project dashboard
- `SUPABASE_SERVICE_KEY` — the service role secret key; server-side only; never expose to the browser
- `SUPABASE_STORAGE_BUCKET` — the name of the Supabase storage bucket for product images
- `CLOUDINARY_CLOUD_NAME` — the cloud name from the Cloudinary account dashboard
- `CLOUDINARY_API_KEY` — the Cloudinary API key
- `CLOUDINARY_API_SECRET` — the Cloudinary API secret key; server-side only; never expose to the browser

Also update the actual `backend/.env` file with appropriate placeholder values for local development. If a Supabase or Cloudinary development account is available, populate the real credentials.

### Step 10: Confirm Frontend Integration Pattern

The storage module does not require any frontend changes in this task, but the integration contract must be clearly established. The Next.js frontend uploads product images by making a multipart form POST to the Django endpoint at `/api/catalog/products/{id}/upload-image/`. The Django view reads the file from `request.FILES`, reads it into bytes, constructs the storage path, calls `upload_file(...)`, and returns the resulting public URL. The frontend then stores that URL (or the backend stores it on the variant). Under no circumstances should the frontend ever receive Supabase or Cloudinary credentials.

---

## Expected Output

- `backend/apps/catalog/storage.py` created with `UploadOptions`, `UploadResult`, `_upload_to_supabase`, `_upload_to_cloudinary`, `upload_file`, and `delete_file`
- `supabase` and `cloudinary` packages added to `pyproject.toml` and `poetry.lock` via `poetry add`
- `backend/.env.example` updated with all seven storage-related environment variable declarations
- The `upload_file` function correctly routes to the configured provider
- The `delete_file` function silently logs and swallows provider errors

---

## Validation

- [ ] `poetry run python manage.py check` reports no errors after the new packages are installed
- [ ] Calling `upload_file` with `STORAGE_PROVIDER=supabase` routes to `_upload_to_supabase`
- [ ] Calling `upload_file` with `STORAGE_PROVIDER=cloudinary` routes to `_upload_to_cloudinary`
- [ ] Calling `upload_file` with an absent or unrecognized `STORAGE_PROVIDER` defaults to Supabase and logs a `WARNING`
- [ ] `delete_file` does not raise an exception when the cloud provider returns an error
- [ ] `delete_file` logs a `WARNING` message when deletion fails
- [ ] `POST /api/catalog/products/{id}/upload-image/` successfully uploads a JPEG and returns a public URL in the response envelope
- [ ] No storage credentials appear in any API response or in the Django debug toolbar

---

## Notes

- Never commit real credentials to version control. Confirm that `backend/.env` is listed in `backend/.gitignore` and in the repository root `.gitignore`. The `.env.example` file should contain only empty values and comments, never real secrets.
- `SUPABASE_SERVICE_KEY` and `CLOUDINARY_API_SECRET` are service-role secrets with elevated permissions. They must only exist in the Django process environment and must never be logged at any severity level, even in debug mode.
- The `_upload_to_supabase` and `_upload_to_cloudinary` functions are intentionally private (underscore prefix). Views must call `upload_file` rather than the provider-specific functions directly. This ensures that switching providers is always a single environment variable change.
- If image resizing via Cloudinary eager transformations is not needed in the initial release, the `max_width`, `max_height`, and `quality` fields on `UploadOptions` can simply be ignored by `_upload_to_supabase` and treated as optional hints. They are included in the data structure to avoid a breaking interface change when resizing support is added later.
