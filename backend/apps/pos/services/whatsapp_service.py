"""
WhatsApp Business receipt dispatch via the Meta Cloud API v18.0.

This module provides functions to send transactional receipt messages to
customers via WhatsApp. Messages use pre-approved Business Message templates.

Environment variables required (configured in Django settings):
    WHATSAPP_PHONE_NUMBER_ID  — numeric phone number ID from Meta Business Manager
    WHATSAPP_ACCESS_TOKEN     — system user access token from Meta Developer console
    WHATSAPP_TEMPLATE_NAME    — approved template name with 4 placeholders

Usage:
    payload = WhatsAppReceiptPayload(
        store_name="Demo Store",
        sale_reference="ABC12345",
        items_summary="T-Shirt, Jeans",
        total_amount="Rs. 4,500.00",
    )
    result = send_whatsapp_receipt_message("0771234567", sale_id, payload)
"""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger(__name__)

_META_GRAPH_BASE = "https://graph.facebook.com/v18.0"


# ──────────────────────────────────────────────────────────────────
# Data transfer object
# ──────────────────────────────────────────────────────────────────

@dataclass
class WhatsAppReceiptPayload:
    """Pre-formatted strings for the four template variable placeholders."""

    store_name: str
    sale_reference: str       # Short 8-char uppercase sale ID
    items_summary: str        # Compact multi-item text; may be truncated
    total_amount: str         # Pre-formatted, e.g. "Rs. 4,500.00"


# ──────────────────────────────────────────────────────────────────
# format_phone_number
# ──────────────────────────────────────────────────────────────────

def format_phone_number(raw_phone: str) -> str:
    """Convert a raw phone string to E.164 format for the Meta API.

    Handles Sri Lankan numbers (leading 0 → prefix 94) and numbers that
    already include the country code.

    Args:
        raw_phone: Any common phone notation, e.g. "077 123 4567",
                   "+94771234567", "094-771-234-567".

    Returns:
        E.164 formatted string, e.g. "+94771234567".

    Raises:
        ValueError: If the number cannot be normalised to E.164.
    """
    cleaned = re.sub(r"[\s\-\(\)\+]", "", raw_phone)

    if cleaned.startswith("0"):
        cleaned = "94" + cleaned[1:]
    elif not cleaned.startswith("94"):
        pass  # Accept as-is; validation will catch invalid formats

    e164 = "+" + cleaned

    if not re.match(r"^\+[0-9]{7,15}$", e164):
        raise ValueError(
            "Invalid phone number format: the number provided cannot be "
            "converted to a valid E.164 format."
        )

    return e164


# ──────────────────────────────────────────────────────────────────
# format_receipt_template_components
# ──────────────────────────────────────────────────────────────────

def format_receipt_template_components(
    payload: WhatsAppReceiptPayload,
    language_code: str = "en",
) -> list:
    """Build the Meta API ``components`` array for the receipt template.

    Template variable mapping:
        {{1}} → store_name
        {{2}} → sale_reference
        {{3}} → items_summary (truncated to 60 chars)
        {{4}} → total_amount

    Returns:
        List with a single body component dict.
    """
    items_summary = payload.items_summary
    if len(items_summary) > 60:
        items_summary = items_summary[:57] + "\u2026"

    return [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": payload.store_name},
                {"type": "text", "text": payload.sale_reference},
                {"type": "text", "text": items_summary},
                {"type": "text", "text": payload.total_amount},
            ],
        }
    ]


# ──────────────────────────────────────────────────────────────────
# send_whatsapp_receipt_message
# ──────────────────────────────────────────────────────────────────

def send_whatsapp_receipt_message(
    phone_number: str,
    sale_id: str,
    sale_data: WhatsAppReceiptPayload,
) -> dict:
    """Send a receipt WhatsApp message to the customer.

    This function never raises — it catches all errors and returns a
    result dict. A failed dispatch must never block or reverse a sale.

    Args:
        phone_number: Raw phone string (will be normalised to E.164).
        sale_id: String sale UUID for logging context.
        sale_data: Pre-formatted payload for the template variables.

    Returns:
        ``{"success": True}`` on success or
        ``{"success": False, "error": "<human-readable message>"}`` on failure.
    """
    # ── 1. Normalise phone number ──────────────────────────────────
    try:
        e164_phone = format_phone_number(phone_number)
    except ValueError as exc:
        logger.warning(
            "WhatsApp dispatch skipped — invalid phone. sale_id=%s error=%s",
            sale_id,
            exc,
        )
        return {"success": False, "error": f"Invalid phone number: {exc}"}

    # ── 2. Validate settings ───────────────────────────────────────
    phone_number_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None)
    access_token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", None)
    template_name = getattr(settings, "WHATSAPP_TEMPLATE_NAME", None)

    if not all([phone_number_id, access_token, template_name]):
        logger.warning(
            "WhatsApp dispatch skipped — missing configuration. sale_id=%s",
            sale_id,
        )
        return {
            "success": False,
            "error": "WhatsApp is not configured. Missing environment variables.",
        }

    # ── 3. Build request ───────────────────────────────────────────
    url = f"{_META_GRAPH_BASE}/{phone_number_id}/messages"
    components = format_receipt_template_components(sale_data)
    body = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": e164_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en"},
            "components": components,
        },
    }
    body_bytes = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body_bytes,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
        method="POST",
    )

    # ── 4. Execute and handle response ────────────────────────────
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_status = resp.status
            if resp_status in (200, 201):
                return {"success": True}
            resp_body = resp.read().decode("utf-8")
            logger.error(
                "WhatsApp dispatch failed. sale_id=%s status=%s body=%s",
                sale_id,
                resp_status,
                resp_body,
            )
            return {
                "success": False,
                "error": (
                    f"WhatsApp dispatch failed. Meta API returned HTTP "
                    f"status {resp_status}"
                ),
            }
    except urllib.error.HTTPError as exc:
        resp_body = exc.read().decode("utf-8") if exc.fp else ""
        logger.error(
            "WhatsApp dispatch HTTP error. sale_id=%s status=%s body=%s",
            sale_id,
            exc.code,
            resp_body,
        )
        return {
            "success": False,
            "error": (
                f"WhatsApp dispatch failed. Meta API returned HTTP status {exc.code}"
            ),
        }
    except (urllib.error.URLError, OSError) as exc:
        logger.error(
            "WhatsApp dispatch network error. sale_id=%s error=%s",
            sale_id,
            exc,
        )
        return {
            "success": False,
            "error": "WhatsApp dispatch failed due to a network error.",
        }


# ──────────────────────────────────────────────────────────────────
# send_whatsapp_text_message  (plain text, for CRM birthday/broadcast)
# ──────────────────────────────────────────────────────────────────

def send_whatsapp_text_message(phone: str, message: str) -> dict:
    """Send a plain text WhatsApp message.

    Used by the CRM birthday greeter and broadcast sender.
    Returns ``{"success": True}`` or ``{"success": False, "error": "..."}``.
    Never raises.
    """
    try:
        e164_phone = format_phone_number(phone)
    except ValueError as exc:
        return {"success": False, "error": f"Invalid phone number: {exc}"}

    phone_number_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None)
    access_token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", None)

    if not all([phone_number_id, access_token]):
        return {
            "success": False,
            "error": "WhatsApp is not configured. Missing environment variables.",
        }

    url = f"{_META_GRAPH_BASE}/{phone_number_id}/messages"
    body = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": e164_phone,
        "type": "text",
        "text": {"body": message},
    }
    body_bytes = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body_bytes,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201):
                return {"success": True}
            return {"success": False, "error": f"Meta API returned status {resp.status}"}
    except urllib.error.HTTPError as exc:
        return {"success": False, "error": f"Meta API HTTP {exc.code}"}
    except (urllib.error.URLError, OSError) as exc:
        logger.error("WhatsApp text dispatch network error: %s", exc)
        return {"success": False, "error": "Network error sending WhatsApp message."}
