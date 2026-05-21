# Re-export AuditLog from accounts so that apps.audit.models.AuditLog works.
from apps.accounts.models import AuditLog  # noqa: F401

__all__ = ["AuditLog"]
