"""
apps/webstore/services/consumer_auth_service.py

Consumer JWT issuance for storefront WebstoreCustomer accounts.

IMPORTANT ISOLATION NOTES:
  - These tokens are COMPLETELY INDEPENDENT from staff (CustomUser) JWTs.
  - They carry role="CONSUMER" — rejected by every staff-only endpoint.
  - They must be stored in the cookie named "consumer_access_token",
    NOT "access_token" (which is reserved for staff).
  - The same SIGNING_KEY (Django's SECRET_KEY) is used for signing, but
    the "role" and "type" claims prevent cross-system token acceptance.

Token lifetimes:
  - Access token:  30 minutes
  - Refresh token: 30 days  (consumers log in infrequently)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone as dt_timezone

import jwt
from django.conf import settings


def _utcnow() -> datetime:
    return datetime.now(tz=dt_timezone.utc)


def issue_consumer_tokens(customer) -> dict:
    """
    Issue an access + refresh JWT pair for a WebstoreCustomer.

    Args:
        customer: WebstoreCustomer instance (must have .id, .email, .tenant.slug)

    Returns:
        {"access": "<jwt>", "refresh": "<jwt>"}

    Security:
        - role="CONSUMER" ensures staff endpoints (which check for staff roles) reject these tokens.
        - type="consumer_access" / "consumer_refresh" adds a second layer of type-gating.
        - The signing key is the Django SECRET_KEY — never transmitted to the browser directly.
    """
    signing_key: str = settings.SIMPLE_JWT["SIGNING_KEY"]
    algorithm: str = settings.SIMPLE_JWT.get("ALGORITHM", "HS256")

    now = _utcnow()
    now_ts = int(now.timestamp())

    access_payload = {
        "sub": str(customer.id),
        "email": customer.email,
        "tenant_slug": customer.tenant.slug,
        "role": "CONSUMER",
        "type": "consumer_access",
        "iat": now_ts,
        "exp": int((now + timedelta(minutes=30)).timestamp()),
        "jti": str(uuid.uuid4()),
    }

    refresh_payload = {
        "sub": str(customer.id),
        "email": customer.email,
        "tenant_slug": customer.tenant.slug,
        "role": "CONSUMER",
        "type": "consumer_refresh",
        "iat": now_ts,
        "exp": int((now + timedelta(days=30)).timestamp()),
        "jti": str(uuid.uuid4()),
    }

    access_token = jwt.encode(access_payload, signing_key, algorithm=algorithm)
    refresh_token = jwt.encode(refresh_payload, signing_key, algorithm=algorithm)

    return {
        "access": access_token,
        "refresh": refresh_token,
    }


def decode_consumer_token(token: str) -> dict:
    """
    Decode and validate a consumer access token.

    Raises:
        jwt.ExpiredSignatureError: if the token has expired.
        jwt.InvalidTokenError: if the token is malformed or has wrong claims.

    Returns:
        The decoded payload dict.

    Security:
        Verifies that role="CONSUMER" and type="consumer_access".
        A staff JWT submitted here will be rejected on the role check.
    """
    signing_key: str = settings.SIMPLE_JWT["SIGNING_KEY"]
    algorithm: str = settings.SIMPLE_JWT.get("ALGORITHM", "HS256")

    payload = jwt.decode(token, signing_key, algorithms=[algorithm])

    if payload.get("role") != "CONSUMER":
        raise jwt.InvalidTokenError("Token is not a consumer token.")
    if payload.get("type") != "consumer_access":
        raise jwt.InvalidTokenError("Token type is not 'consumer_access'.")

    return payload
