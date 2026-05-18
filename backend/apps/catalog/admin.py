from django.contrib import admin

from .models import (
    Brand,
    Category,
    Product,
    ProductVariant,
    StockMovement,
    StockTakeItem,
    StockTakeSession,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "parent", "sort_order", "created_at")
    list_filter = ("tenant",)
    search_fields = ("name",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "created_at")
    list_filter = ("tenant",)
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "brand", "gender", "tax_rule", "is_archived", "created_at")
    list_filter = ("is_archived", "gender", "tax_rule")
    search_fields = ("name",)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "barcode", "size", "colour", "retail_price", "stock_quantity", "product", "tenant")
    list_select_related = ["product", "tenant"]
    search_fields = ("sku", "barcode")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("reason", "variant", "quantity_delta", "quantity_before", "quantity_after", "actor", "created_at")
    list_filter = ("reason", "tenant")
    readonly_fields = (
        "id", "tenant", "variant", "reason", "quantity_delta", "quantity_before",
        "quantity_after", "actor", "note", "sale_id", "purchase_order_id",
        "stock_take_session_id", "created_at",
    )


class StockTakeItemInline(admin.TabularInline):
    model = StockTakeItem
    extra = 0
    fields = ("variant", "system_quantity", "counted_quantity", "discrepancy", "is_recounted")
    readonly_fields = ("system_quantity", "discrepancy")


@admin.register(StockTakeSession)
class StockTakeSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "status", "initiated_by", "approved_by", "started_at", "completed_at")
    list_filter = ("status", "tenant")
    inlines = [StockTakeItemInline]
