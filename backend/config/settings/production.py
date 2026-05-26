from .base import *  # noqa: F401, F403

DEBUG = False

# ALLOWED_HOSTS and other production settings will be configured during deployment.

# ─── HTTPS / Security ────────────────────────────────────────────────────────
# Redirect all non-HTTPS traffic to HTTPS.
SECURE_SSL_REDIRECT = True

# Tell browsers to only use HTTPS for 1 year and include subdomains.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Prevent browser from MIME-sniffing a response away from declared content-type.
SECURE_CONTENT_TYPE_NOSNIFF = True

# Session and CSRF cookies are only sent over HTTPS.
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Protect against clickjacking.
X_FRAME_OPTIONS = "DENY"
