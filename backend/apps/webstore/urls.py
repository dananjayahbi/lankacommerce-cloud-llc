"""
apps/webstore/urls.py

URL configuration for the webstore app.

All views are 501 stubs in Phase 1. Future phases replace them with real
implementations. This file is the single source of truth for all webstore
URL routes.

URL groups:
  1. Public storefront  →  /api/webstore/public/<slug>/...   (no auth)
  2. Tenant admin       →  /api/webstore/...                 (staff JWT)
  3. Customizer         →  /api/webstore/customizer/...      (staff JWT)
  4. SuperAdmin         →  /api/webstore/admin/...           (SUPER_ADMIN JWT)
"""

from django.urls import path

from .views import admin_views, customizer_views, public_views, tenant_views, webhook_views

app_name = "webstore"

# ---------------------------------------------------------------------------
# 1. Public storefront URLs  (no authentication required)
# ---------------------------------------------------------------------------

public_patterns = [
    # Store-level config (theme + store settings, used on every SSR page)
    path(
        "public/<slug:slug>/config/",
        public_views.store_config,
        name="public-store-config",
    ),
    # Products
    path(
        "public/<slug:slug>/products/",
        public_views.product_list,
        name="public-product-list",
    ),
    path(
        "public/<slug:slug>/products/<slug:handle>/",
        public_views.product_detail,
        name="public-product-detail",
    ),
    # Collections
    path(
        "public/<slug:slug>/collections/",
        public_views.collection_list,
        name="public-collection-list",
    ),
    path(
        "public/<slug:slug>/collections/<slug:handle>/",
        public_views.collection_detail,
        name="public-collection-detail",
    ),
    # Static pages
    path(
        "public/<slug:slug>/pages/<slug:handle>/",
        public_views.page_detail,
        name="public-page-detail",
    ),
    # Navigation menus
    path(
        "public/<slug:slug>/menus/<slug:handle>/",
        public_views.menu_detail,
        name="public-menu-detail",
    ),
    # Search
    path(
        "public/<slug:slug>/search/",
        public_views.search,
        name="public-search",
    ),
    # Consumer account
    path(
        "public/<slug:slug>/customers/register/",
        public_views.customer_register,
        name="public-customer-register",
    ),
    path(
        "public/<slug:slug>/customers/login/",
        public_views.customer_login,
        name="public-customer-login",
    ),
    # Consumer orders
    path(
        "public/<slug:slug>/orders/",
        public_views.order_create,
        name="public-order-create",
    ),
    path(
        "public/<slug:slug>/orders/<str:order_number>/",
        public_views.order_status,
        name="public-order-status",
    ),
    # Consumer orders (auth required — consumer JWT in Authorization header)
    path(
        "public/<slug:slug>/customers/orders/",
        public_views.consumer_order_list,
        name="public-consumer-order-list",
    ),
    # Blog (Phase 10)
    path(
        "public/<slug:slug>/blog/",
        public_views.blog_list,
        name="public-blog-list",
    ),
    path(
        "public/<slug:slug>/blog/<slug:handle>/",
        public_views.blog_detail,
        name="public-blog-detail",
    ),
    # Product reviews (Phase 10)
    path(
        "public/<slug:slug>/products/<str:handle>/reviews/",
        public_views.product_reviews,
        name="public-product-reviews",
    ),
    # Analytics page view (Phase 10)
    path(
        "public/<slug:slug>/analytics/pageview/",
        public_views.analytics_pageview,
        name="public-analytics-pageview",
    ),
    # Password verification (Phase 10)
    path(
        "public/<slug:slug>/verify-password/",
        public_views.verify_store_password,
        name="public-verify-store-password",
    ),
    # Custom domain resolution (Phase 10) — no <slug> in path
    path(
        "resolve-domain/",
        public_views.resolve_domain,
        name="public-resolve-domain",
    ),
    # Stripe checkout session (creates order + Stripe session in one step)
    path(
        "public/<slug:slug>/stripe/checkout-session/",
        public_views.stripe_order_checkout_session,
        name="public-stripe-checkout-session",
    ),
]

# ---------------------------------------------------------------------------
# Webhooks  (no auth, CSRF exempt, signature-verified inside view)
# ---------------------------------------------------------------------------

webhook_patterns = [
    path(
        "webhooks/payhere/<slug:slug>/",
        webhook_views.payhere_webhook,
        name="webhook-payhere",
    ),
    path(
        "webhooks/stripe/",
        webhook_views.stripe_webstore_webhook,
        name="webhook-stripe-webstore",
    ),
]

tenant_patterns = [
    # Webstore management
    path("config/", tenant_views.webstore_config, name="tenant-config"),
    path("setup/", tenant_views.webstore_setup, name="tenant-setup"),
    path("settings/", tenant_views.webstore_settings, name="tenant-settings"),
    # Theme store
    path("themes/", tenant_views.theme_list, name="tenant-theme-list"),
    path(
        "themes/<uuid:theme_id>/install/",
        tenant_views.theme_install,
        name="tenant-theme-install",
    ),
    path(
        "themes/<uuid:theme_id>/purchase/",
        tenant_views.theme_purchase,
        name="tenant-theme-purchase",
    ),
    path("my-themes/", tenant_views.my_themes, name="tenant-my-themes"),
    # Block library
    path("blocks/", tenant_views.block_list, name="tenant-block-list"),
    path(
        "blocks/<str:block_type>/schema/",
        tenant_views.block_schema,
        name="tenant-block-schema",
    ),
    # Menus
    path("menus/", tenant_views.menu_list_create, name="tenant-menu-list-create"),
    path(
        "menus/<uuid:menu_id>/",
        tenant_views.menu_detail,
        name="tenant-menu-detail",
    ),
    # Collections
    path(
        "collections/",
        tenant_views.collection_list_create,
        name="tenant-collection-list-create",
    ),
    path(
        "collections/<uuid:collection_id>/",
        tenant_views.collection_detail,
        name="tenant-collection-detail",
    ),
    path(
        "collections/<uuid:collection_id>/products/",
        tenant_views.collection_products,
        name="tenant-collection-products",
    ),
    # Pages
    path("pages/", tenant_views.page_list_create, name="tenant-page-list-create"),
    path(
        "pages/<uuid:page_id>/",
        tenant_views.page_detail,
        name="tenant-page-detail",
    ),
    # Orders (admin view)
    path("orders/", tenant_views.order_list, name="tenant-order-list"),
    path(
        "orders/<uuid:order_id>/",
        tenant_views.order_detail,
        name="tenant-order-detail",
    ),
    path(
        "orders/<uuid:order_id>/status/",
        tenant_views.order_status_update,
        name="tenant-order-status-update",
    ),
    path(
        "orders/<uuid:order_id>/fulfill/",
        tenant_views.order_fulfill,
        name="tenant-order-fulfill",
    ),
    # Customers (admin view)
    path("customers/", tenant_views.customer_list, name="tenant-customer-list"),
    path(
        "customers/<uuid:customer_id>/",
        tenant_views.customer_detail,
        name="tenant-customer-detail",
    ),
    # Blog (Phase 10)
    path("blog/", tenant_views.blog_list_create, name="tenant-blog-list-create"),
    path(
        "blog/<uuid:post_id>/",
        tenant_views.blog_detail,
        name="tenant-blog-detail",
    ),
    path(
        "blog/<uuid:post_id>/publish/",
        tenant_views.blog_publish,
        name="tenant-blog-publish",
    ),
    # Product reviews moderation (Phase 10)
    path("reviews/", tenant_views.review_list, name="tenant-review-list"),
    path(
        "reviews/<uuid:review_id>/approve/",
        tenant_views.review_approve,
        name="tenant-review-approve",
    ),
    path(
        "reviews/<uuid:review_id>/reject/",
        tenant_views.review_reject,
        name="tenant-review-reject",
    ),
    path(
        "reviews/<uuid:review_id>/",
        tenant_views.review_delete,
        name="tenant-review-delete",
    ),
    # Analytics dashboard (Phase 10)
    path(
        "analytics/summary/",
        tenant_views.analytics_summary,
        name="tenant-analytics-summary",
    ),
]

# ---------------------------------------------------------------------------
# 2. Tenant admin URLs  (staff JWT required)
# ---------------------------------------------------------------------------

customizer_patterns = [
    path(
        "customizer/active-config/",
        customizer_views.active_config,
        name="customizer-active-config",
    ),
    path(
        "customizer/draft-config/",
        customizer_views.draft_config,
        name="customizer-draft-config",
    ),
    path(
        "customizer/publish/",
        customizer_views.publish,
        name="customizer-publish",
    ),
    path(
        "customizer/discard-draft/",
        customizer_views.discard_draft,
        name="customizer-discard-draft",
    ),
]

# ---------------------------------------------------------------------------
# 4. SuperAdmin URLs  (SUPER_ADMIN role required)
# ---------------------------------------------------------------------------

superadmin_patterns = [
    # Themes
    path(
        "admin/themes/",
        admin_views.theme_list_create,
        name="admin-theme-list-create",
    ),
    path(
        "admin/themes/<uuid:theme_id>/",
        admin_views.theme_detail,
        name="admin-theme-detail",
    ),
    path(
        "admin/themes/<uuid:theme_id>/publish/",
        admin_views.theme_publish,
        name="admin-theme-publish",
    ),
    path(
        "admin/themes/<uuid:theme_id>/unpublish/",
        admin_views.theme_unpublish,
        name="admin-theme-unpublish",
    ),
    path(
        "admin/themes/<uuid:theme_id>/tenants/",
        admin_views.theme_tenants,
        name="admin-theme-tenants",
    ),
    path(
        "admin/themes/<uuid:theme_id>/force-update-tenants/",
        admin_views.theme_force_update_tenants,
        name="admin-theme-force-update-tenants",
    ),
    # Blocks
    path(
        "admin/blocks/",
        admin_views.block_list_create,
        name="admin-block-list-create",
    ),
    path(
        "admin/blocks/<uuid:block_id>/",
        admin_views.block_detail,
        name="admin-block-detail",
    ),
    path(
        "admin/blocks/<uuid:block_id>/publish/",
        admin_views.block_publish,
        name="admin-block-publish",
    ),
    # Stats
    path(
        "admin/stats/",
        admin_views.webstore_stats,
        name="admin-stats",
    ),
]

# ---------------------------------------------------------------------------
# Combined URL patterns (registered under api/webstore/ in config/urls.py)
# ---------------------------------------------------------------------------

urlpatterns = (
    public_patterns
    + webhook_patterns
    + tenant_patterns
    + customizer_patterns
    + superadmin_patterns
)
