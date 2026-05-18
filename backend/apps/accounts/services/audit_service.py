"""
LankaCommerce Audit Logging Service

Provides a structured interface for writing AuditLog records for all
significant auth and system events. All functions are non-blocking:
exceptions are caught and logged to Django's logging framework rather
than propagated to the caller.

Usage:
    from apps.accounts.services.audit_service import audit_service, AUTH_ACTIONS

    audit_service.log(
        action=AUTH_ACTIONS.LOGIN_SUCCESS,
        actor=request.user,
        request=request,
        entity_type="User",
        entity_id=request.user.id,
    )
"""

import logging
from typing import Any
from uuid import UUID

from django.http import HttpRequest

from apps.accounts.models import AuditLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Auth Action Constants
# ---------------------------------------------------------------------------


class AUTH_ACTIONS:
    # Login
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_INACTIVE_ACCOUNT = "LOGIN_INACTIVE_ACCOUNT"

    # PIN
    PIN_LOGIN_SUCCESS = "PIN_LOGIN_SUCCESS"
    PIN_LOGIN_FAILED = "PIN_LOGIN_FAILED"
    PIN_NOT_CONFIGURED = "PIN_NOT_CONFIGURED"
    PIN_SET = "PIN_SET"
    PIN_UPDATED = "PIN_UPDATED"

    # Session
    LOGOUT = "LOGOUT"
    FORCE_LOGOUT = "FORCE_LOGOUT"
    SESSION_EXPIRED = "SESSION_EXPIRED"

    # Password
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS"
    PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"

    # Account
    ACCOUNT_CREATED = "ACCOUNT_CREATED"
    ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED"
    ACCOUNT_REACTIVATED = "ACCOUNT_REACTIVATED"
    ROLE_CHANGED = "ROLE_CHANGED"
    PERMISSIONS_UPDATED = "PERMISSIONS_UPDATED"


# ---------------------------------------------------------------------------
# IP / User-Agent Helpers
# ---------------------------------------------------------------------------


def get_client_ip(request: HttpRequest) -> str | None:
    """
    Extracts the client IP address from the request.

    Checks X-Forwarded-For first (for reverse proxy setups),
    then falls back to REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        return ip if ip else None
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request: HttpRequest) -> str:
    """Extracts the User-Agent header from the request."""
    return request.META.get("HTTP_USER_AGENT", "")


# ---------------------------------------------------------------------------
# Audit Service
# ---------------------------------------------------------------------------


class AuditService:
    """
    Non-blocking audit logging service.

    All methods wrap AuditLog.objects.create() in a try-except so that
    audit failures never cause API errors for the end user.
    """

    def log(
        self,
        *,
        action: str,
        actor=None,
        request: HttpRequest | None = None,
        entity_type: str = "User",
        entity_id: UUID | str | None = None,
        tenant_id: UUID | str | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str = "",
    ) -> AuditLog | None:
        """
        Creates an AuditLog record.

        Parameters
        ----------
        action : str
            Action constant from AUTH_ACTIONS or any string label.
        actor : CustomUser | None
            The user performing the action. May be None for unauthenticated events.
        request : HttpRequest | None
            The Django request object (used to extract IP and User-Agent).
        entity_type : str
            Type of entity affected, e.g. "User", "Product".
        entity_id : UUID | str | None
            ID of the specific entity.
        tenant_id : UUID | str | None
            Tenant context. Inferred from actor.tenant_id if not provided.
        before : dict | None
            State before the action (for updates).
        after : dict | None
            State after the action (for creates/updates).
        ip_address : str | None
            Client IP (auto-extracted from request if not provided).
        user_agent : str
            User-Agent string (auto-extracted from request if not provided).
        """
        try:
            # Extract actor info
            actor_id = getattr(actor, "id", None)
            actor_role = getattr(actor, "role", "")

            # Infer tenant_id from actor if not provided
            if tenant_id is None and actor is not None:
                tenant_id = getattr(actor, "tenant_id", None)

            # Extract request metadata if not provided
            if request is not None:
                if ip_address is None:
                    ip_address = get_client_ip(request)
                if not user_agent:
                    user_agent = get_user_agent(request)

            # Convert UUIDs to string form for JSON serialisability
            entity_id_val = str(entity_id) if entity_id else None
            tenant_id_val = str(tenant_id) if tenant_id else None

            log_entry = AuditLog.objects.create(
                actor_id=actor_id,
                actor_role=actor_role,
                tenant_id=tenant_id_val,
                entity_type=entity_type,
                entity_id=entity_id_val,
                action=action,
                before=before,
                after=after,
                ip_address=ip_address,
                user_agent=user_agent or "",
            )
            return log_entry

        except Exception as exc:
            logger.exception(
                "Failed to write AuditLog for action=%s actor=%s: %s",
                action,
                getattr(actor, "email", "anonymous"),
                exc,
            )
            return None

    def log_login_success(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGIN_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
            after={"email": user.email, "role": user.role},
        )

    def log_login_failed(
        self,
        email: str,
        request: HttpRequest,
        reason: str = "Invalid credentials",
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGIN_FAILED,
            actor=None,
            request=request,
            entity_type="User",
            after={"attempted_email": email, "reason": reason},
        )

    def log_pin_login_success(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PIN_LOGIN_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_pin_login_failed(
        self,
        email: str,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PIN_LOGIN_FAILED,
            actor=None,
            request=request,
            entity_type="User",
            after={"attempted_email": email},
        )

    def log_logout(self, user, request: HttpRequest) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.LOGOUT,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_force_logout(
        self,
        actor,
        target_user,
        request: HttpRequest,
        reason: str = "",
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.FORCE_LOGOUT,
            actor=actor,
            request=request,
            entity_type="User",
            entity_id=target_user.id,
            tenant_id=getattr(target_user, "tenant_id", None),
            after={
                "target_email": target_user.email,
                "target_role": target_user.role,
                "reason": reason,
            },
        )

    def log_password_reset_requested(
        self,
        user,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )

    def log_password_reset_success(
        self,
        user,
        request: HttpRequest,
    ) -> AuditLog | None:
        return self.log(
            action=AUTH_ACTIONS.PASSWORD_RESET_SUCCESS,
            actor=user,
            request=request,
            entity_type="User",
            entity_id=user.id,
        )


# Module-level singleton instance
audit_service = AuditService()
