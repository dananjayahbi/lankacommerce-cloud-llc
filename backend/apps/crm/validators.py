"""Phone number validation utilities for CRM."""
from __future__ import annotations

import re

PHONE_REGEX = re.compile(r"^(\+94\d{9}|07\d{8})$")


def validate_phone(value: str) -> str:
    """Strip and validate a Sri Lankan phone number.

    Accepts:
    - International format: +94 followed by exactly 9 digits
    - Local format: 07 followed by exactly 8 digits (10 total)

    Raises ValueError on invalid format. Returns the stripped value on success.
    """
    stripped = value.strip()
    if not PHONE_REGEX.match(stripped):
        raise ValueError(
            "Phone number must be in +94XXXXXXXXX or 07XXXXXXXX format"
        )
    return stripped
