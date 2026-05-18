"""Provider-agnostic file storage abstraction for the catalog app.

Frontend integration contract
──────────────────────────────
The Next.js frontend NEVER calls Supabase or Cloudinary directly for product
images.  It always sends a multipart POST to the Django upload endpoint:

    POST /api/catalog/products/{id}/upload-image/

Django reads the file from ``request.FILES``, calls ``upload_file()``, and
returns only the resulting public URL to the browser.  Storage credentials
are confined to the Django process environment and never appear in any API
response.
"""

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class UploadOptions:
    """Parameters forwarded to the storage provider during an upload."""

    content_type: str
    max_width: Optional[int] = None
    max_height: Optional[int] = None
    quality: Optional[int] = None


@dataclass
class UploadResult:
    """Result returned by a successful upload operation."""

    public_url: str
    provider: str  # "supabase" or "cloudinary"
    path: str  # storage path / public_id — used when deleting later


# ─────────────────────────────────────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────────────────────────────────────


def _upload_to_supabase(
    file_bytes: bytes,
    path: str,
    options: UploadOptions,
) -> UploadResult:
    """Upload *file_bytes* to Supabase Storage and return the public URL."""
    from supabase import create_client  # type: ignore[import-untyped]

    url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url:
        raise RuntimeError(
            "SUPABASE_URL environment variable is not set. "
            "Add it to backend/.env or the production environment."
        )
    if not service_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY environment variable is not set. "
            "Add it to backend/.env or the production environment."
        )

    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "")
    if not bucket:
        bucket = "product-images"
        logger.warning(
            "SUPABASE_STORAGE_BUCKET is not set — defaulting to 'product-images'."
        )

    client = create_client(url, service_key)
    client.storage.from_(bucket).upload(
        path,
        file_bytes,
        file_options={"content-type": options.content_type},
    )

    # Supabase public URL pattern: <project_url>/storage/v1/object/public/<bucket>/<path>
    public_url = f"{url.rstrip('/')}/storage/v1/object/public/{bucket}/{path}"
    return UploadResult(public_url=public_url, provider="supabase", path=path)


# ─────────────────────────────────────────────────────────────────────────────
# Cloudinary
# ─────────────────────────────────────────────────────────────────────────────


def _upload_to_cloudinary(
    file_bytes: bytes,
    path: str,
    options: UploadOptions,
) -> UploadResult:
    """Upload *file_bytes* to Cloudinary and return the secure URL."""
    import cloudinary  # type: ignore[import-untyped]
    import cloudinary.uploader  # type: ignore[import-untyped]

    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    api_key = os.environ.get("CLOUDINARY_API_KEY", "")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "")

    missing = [
        name
        for name, val in (
            ("CLOUDINARY_CLOUD_NAME", cloud_name),
            ("CLOUDINARY_API_KEY", api_key),
            ("CLOUDINARY_API_SECRET", api_secret),
        )
        if not val
    ]
    if missing:
        raise RuntimeError(
            f"Missing Cloudinary environment variable(s): {', '.join(missing)}. "
            "Add them to backend/.env or the production environment."
        )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )

    upload_kwargs: dict = {
        "public_id": path,
        "resource_type": "image",
    }

    # Optional eager transformations for server-side resizing
    eager_transforms = []
    if options.max_width or options.max_height:
        transform: dict = {"crop": "limit"}
        if options.max_width:
            transform["width"] = options.max_width
        if options.max_height:
            transform["height"] = options.max_height
        if options.quality:
            transform["quality"] = options.quality
        eager_transforms.append(transform)

    if eager_transforms:
        upload_kwargs["eager"] = eager_transforms

    import io

    response = cloudinary.uploader.upload(
        io.BytesIO(file_bytes),
        **upload_kwargs,
    )

    secure_url: str = response["secure_url"]
    stored_public_id: str = response.get("public_id", path)
    return UploadResult(
        public_url=secure_url,
        provider="cloudinary",
        path=stored_public_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

_VALID_PROVIDERS = {"supabase", "cloudinary"}


def _resolve_provider() -> str:
    """Read and validate the STORAGE_PROVIDER environment variable."""
    provider = os.environ.get("STORAGE_PROVIDER", "").strip().lower()
    if provider not in _VALID_PROVIDERS:
        if provider:
            logger.warning(
                "Unrecognised STORAGE_PROVIDER value %r — defaulting to 'supabase'.",
                provider,
            )
        else:
            logger.warning(
                "STORAGE_PROVIDER is not set — defaulting to 'supabase'."
            )
        return "supabase"
    return provider


def upload_file(
    file_bytes: bytes,
    path: str,
    options: UploadOptions,
) -> UploadResult:
    """Upload *file_bytes* to the configured storage provider.

    Views and service functions should always call this function rather than
    the provider-specific ``_upload_to_*`` helpers.  Switching providers is
    then a single environment variable change.

    Args:
        file_bytes: Raw bytes of the file to upload.
        path: Storage path or public ID (e.g. ``"products/<uuid>/photo.jpg"``).
        options: Upload metadata such as MIME type and optional resize hints.

    Returns:
        An :class:`UploadResult` containing the public URL and metadata.
    """
    provider = _resolve_provider()
    if provider == "cloudinary":
        return _upload_to_cloudinary(file_bytes, path, options)
    return _upload_to_supabase(file_bytes, path, options)


def delete_file(path: str, provider: Optional[str] = None) -> None:
    """Delete a previously uploaded file from the storage provider.

    Failures are logged at WARNING level and silently swallowed.  Application
    logic has already removed the URL from the database before this is called;
    if the cloud deletion fails the application continues without error.  A
    periodic reconciliation task should handle orphaned storage files.

    Args:
        path: The storage path or public ID returned by a previous upload.
        provider: Provider name override.  Reads ``STORAGE_PROVIDER`` env var
            when ``None``.
    """
    if provider is None:
        provider = _resolve_provider()

    try:
        if provider == "cloudinary":
            import cloudinary.uploader  # type: ignore[import-untyped]

            cloudinary.uploader.destroy(path, resource_type="image")
        else:
            from supabase import create_client  # type: ignore[import-untyped]

            url = os.environ.get("SUPABASE_URL", "")
            service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
            bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "product-images")
            if url and service_key:
                client = create_client(url, service_key)
                client.storage.from_(bucket).remove([path])
    except Exception as exc:
        logger.warning(
            "Failed to delete file from storage (provider=%r, path=%r): %s",
            provider,
            path,
            exc,
        )
