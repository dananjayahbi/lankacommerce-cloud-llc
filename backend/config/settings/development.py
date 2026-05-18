from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# CORS — Allow the Next.js dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Email — console backend for development (prints emails to terminal)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_FROM = "noreply@lankacommerce.dev"

# Frontend URL (used for building password reset links)
FRONTEND_BASE_URL = "http://localhost:3000"
