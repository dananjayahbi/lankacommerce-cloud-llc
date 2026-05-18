"""Custom exceptions for the catalog app."""


class NotFoundError(Exception):
    """Raised when a requested catalog entity does not exist or is inaccessible."""


class ConflictError(Exception):
    """Raised when a write operation would violate a uniqueness or dependency rule."""


class InsufficientStockError(Exception):
    """Raised when a stock adjustment would result in a negative stock_quantity."""
