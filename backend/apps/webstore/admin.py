from django.contrib import admin

from .models import (
    TenantThemeConfig,
    TenantWebstore,
    WebstoreBlock,
    WebstoreCollection,
    WebstoreCustomer,
    WebstoreMenu,
    WebstoreOrder,
    WebstorePage,
    WebstoreTheme,
)


@admin.register(WebstoreTheme)
class WebstoreThemeAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "category",
        "version",
        "is_free",
        "is_published",
        "is_default",
        "created_at",
    )
    list_filter = ("category", "is_free", "is_published", "is_default")
    search_fields = ("name", "slug", "author")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-is_default", "-is_free", "name")


@admin.register(WebstoreBlock)
class WebstoreBlockAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "react_component_key",
        "is_premium",
        "is_published",
        "sort_order",
    )
    list_filter = ("is_premium", "is_published")
    search_fields = ("name", "type", "react_component_key")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("sort_order", "name")


@admin.register(TenantWebstore)
class TenantWebstoreAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "is_enabled",
        "customer_accounts",
        "storefront_domain",
        "is_password_protected",
        "created_at",
    )
    list_filter = ("is_enabled", "customer_accounts", "is_password_protected")
    search_fields = ("tenant__name", "tenant__slug", "storefront_domain")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(TenantThemeConfig)
class TenantThemeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "theme",
        "status",
        "published_at",
        "updated_at",
    )
    list_filter = ("status", "theme")
    search_fields = ("tenant__name", "tenant__slug", "theme__name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebstoreMenu)
class WebstoreMenuAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "title",
        "handle",
        "updated_at",
    )
    list_filter = ("tenant",)
    search_fields = ("title", "handle", "tenant__name", "tenant__slug")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebstoreCollection)
class WebstoreCollectionAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "title",
        "handle",
        "collection_type",
        "is_published",
        "created_at",
    )
    list_filter = ("collection_type", "is_published", "sort_order_type")
    search_fields = ("title", "handle", "tenant__name", "tenant__slug")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebstorePage)
class WebstorePageAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "title",
        "handle",
        "is_published",
        "created_at",
    )
    list_filter = ("is_published",)
    search_fields = ("title", "handle", "tenant__name", "tenant__slug")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebstoreCustomer)
class WebstoreCustomerAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "accepts_marketing",
        "created_at",
    )
    list_filter = ("is_active", "accepts_marketing", "tenant")
    search_fields = ("email", "first_name", "last_name", "phone", "tenant__name")
    readonly_fields = ("id", "created_at", "updated_at", "last_login_at")


@admin.register(WebstoreOrder)
class WebstoreOrderAdmin(admin.ModelAdmin):
    list_display = (
        "tenant",
        "order_number",
        "customer_email",
        "status",
        "payment_status",
        "fulfillment_status",
        "total",
        "created_at",
    )
    list_filter = ("status", "payment_status", "fulfillment_status", "payment_gateway")
    search_fields = (
        "order_number",
        "customer_email",
        "tenant__name",
        "tenant__slug",
        "payment_reference",
    )
    readonly_fields = ("id", "created_at", "updated_at")
