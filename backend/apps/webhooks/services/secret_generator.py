import secrets


def generate_webhook_secret() -> str:
    """Return a 64-character cryptographically secure hex string."""
    return secrets.token_hex(32)
