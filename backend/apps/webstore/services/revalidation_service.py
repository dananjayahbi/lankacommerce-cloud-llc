"""
apps/webstore/services/revalidation_service.py

Asynchronous on-demand cache revalidation dispatcher.

Notifies the Next.js frontend to flush ISR cache tags after any publishable
mutation in the backend. This is a fire-and-forget call — failure is logged
but NEVER propagates to the caller and NEVER rolls back a DB transaction.

Supported tags (mirroring Next.js fetch() cache tag conventions):
  webstore-<slug>                → full storefront (used on theme publish)
  webstore-config-<slug>         → store config / menus (header + footer)
  webstore-products-<slug>       → product listing pages
  webstore-product-<slug>-<hdl>  → single product detail page
  webstore-collections-<slug>    → collection listing pages
  webstore-pages-<slug>          → static page content
  webstore-blog-<slug>           → blog listing + articles

Usage:
    from apps.webstore.services.revalidation_service import trigger_revalidation

    # After theme publish — flush the entire storefront
    trigger_revalidation(tenant_slug="test-business", tag="webstore-test-business")

    # After a product update — flush only product caches
    trigger_revalidation(tenant_slug="test-business", tag="webstore-products-test-business")
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TIMEOUT_SECONDS = 5


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def trigger_revalidation(tenant_slug: str, tag: str | None = None) -> None:
    """
    Sends a POST request to the Next.js revalidation endpoint to flush the
    cache for the given *tag*.

    If *tag* is None, defaults to ``webstore-<tenant_slug>`` which causes
    the entire storefront to be invalidated.

    This function:
      - Returns immediately on success.
      - Logs a WARNING on HTTP errors (non-2xx responses).
      - Logs an ERROR on network/timeout failures.
      - NEVER raises an exception — callers must not depend on its success.

    Called from:
      - theme_service.publish_draft()             (full revalidation)
      - tenant_views (page, menu, collection)     (scoped revalidation)
      - catalog signal handler                    (product revalidation)
    """
    revalidation_base_url: str | None = getattr(
        settings, "NEXT_REVALIDATION_URL", None
    )
    revalidation_secret: str | None = getattr(
        settings, "REVALIDATION_SECRET", None
    )

    if not revalidation_base_url:
        # Not configured — silently skip. This is expected in CI / test environments.
        logger.debug(
            "NEXT_REVALIDATION_URL is not configured; skipping revalidation for slug=%s",
            tenant_slug,
        )
        return

    if not revalidation_secret:
        logger.warning(
            "REVALIDATION_SECRET is not configured; skipping revalidation for slug=%s",
            tenant_slug,
        )
        return

    effective_tag = tag if tag else f"webstore-{tenant_slug}"
    endpoint = revalidation_base_url.rstrip("/") + "/api/revalidate"

    try:
        response = requests.post(
            endpoint,
            json={"secret": revalidation_secret, "tag": effective_tag},
            timeout=_TIMEOUT_SECONDS,
        )
        if response.ok:
            logger.info(
                "Revalidation dispatched: tag=%s slug=%s status=%s",
                effective_tag,
                tenant_slug,
                response.status_code,
            )
        else:
            logger.warning(
                "Revalidation endpoint returned %s for tag=%s slug=%s — body: %s",
                response.status_code,
                effective_tag,
                tenant_slug,
                response.text[:200],
            )
    except requests.exceptions.Timeout:
        logger.error(
            "Revalidation timed out after %ss for tag=%s slug=%s",
            _TIMEOUT_SECONDS,
            effective_tag,
            tenant_slug,
        )
    except requests.exceptions.RequestException as exc:
        logger.error(
            "Revalidation network error for tag=%s slug=%s: %s",
            effective_tag,
            tenant_slug,
            exc,
        )


def trigger_full_revalidation(tenant_slug: str) -> None:
    """
    Flushes the entire storefront cache for *tenant_slug*.
    Convenience wrapper around ``trigger_revalidation`` for theme publishes.
    """
    trigger_revalidation(tenant_slug, tag=f"webstore-{tenant_slug}")


def trigger_product_revalidation(tenant_slug: str, product_handle: str | None = None) -> None:
    """
    Flushes product-related caches.
    If *product_handle* is provided, also flushes the specific product page.
    """
    trigger_revalidation(tenant_slug, tag=f"webstore-products-{tenant_slug}")
    if product_handle:
        trigger_revalidation(
            tenant_slug,
            tag=f"webstore-product-{tenant_slug}-{product_handle}",
        )


def trigger_collection_revalidation(tenant_slug: str) -> None:
    """Flushes collection caches for *tenant_slug*."""
    trigger_revalidation(tenant_slug, tag=f"webstore-collections-{tenant_slug}")


def trigger_page_revalidation(tenant_slug: str) -> None:
    """Flushes static page caches for *tenant_slug*."""
    trigger_revalidation(tenant_slug, tag=f"webstore-pages-{tenant_slug}")


def trigger_config_revalidation(tenant_slug: str) -> None:
    """
    Flushes header/footer/menu config caches for *tenant_slug*.
    Used after a WebstoreMenu save or delete.
    """
    trigger_revalidation(tenant_slug, tag=f"webstore-config-{tenant_slug}")


def trigger_blog_revalidation(tenant_slug: str) -> None:
    """Flushes blog caches for *tenant_slug*."""
    trigger_revalidation(tenant_slug, tag=f"webstore-blog-{tenant_slug}")
