"""Shared exception classes for the LankaCommerce backend.

These classes are imported by service layers across all apps.  Using a
single canonical location avoids circular imports and keeps the exception
hierarchy consistent.
"""


class NotFoundError(Exception):
    """Raised when a requested entity does not exist or is inaccessible."""


class ConflictError(Exception):
    """Raised when a write operation would violate a uniqueness or state rule."""


class PermissionDeniedError(Exception):
    """Raised when an actor lacks authorisation to perform an operation."""
