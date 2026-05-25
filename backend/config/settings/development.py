from .base import *  # noqa: F401, F403

DEBUG = True

# Allow *.localhost subdomains for tenant dev environments
ALLOWED_HOSTS = ["localhost", "127.0.0.1", ".localhost"]

# CORS — Allow the Next.js dev server and any *.localhost subdomain
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Allow any <slug>.localhost:3000 origin dynamically
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[a-zA-Z0-9\-]+\.localhost(:\d+)?$",
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

# Automatically update the local hosts file when a new tenant self-registers.
# Requires the Django process to run with admin/root privileges; if not, a hint
# message is returned in the API response instead.
DEV_AUTO_UPDATE_HOSTS = True
