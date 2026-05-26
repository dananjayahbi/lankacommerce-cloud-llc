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

from .views import admin_views, customizer_views, public_views, tenant_views

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
]

# ---------------------------------------------------------------------------
# 2. Tenant admin URLs  (staff JWT required)
# ---------------------------------------------------------------------------

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
]

# ---------------------------------------------------------------------------
# 3. Customizer URLs  (staff JWT required)
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
]

# ---------------------------------------------------------------------------
# Combined URL patterns (registered under api/webstore/ in config/urls.py)
# ---------------------------------------------------------------------------

urlpatterns = (
    public_patterns
    + tenant_patterns
    + customizer_patterns
    + superadmin_patterns
)
