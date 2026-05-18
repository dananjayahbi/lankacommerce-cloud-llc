from django.contrib import admin

from .models import Invoice, Plan, Subscription, Tenant


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price_monthly", "is_active", "sort_order")
    list_editable = ("is_active", "sort_order")
    ordering = ("sort_order",)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "slug")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("__str__", "status", "next_billing_date")
    list_filter = ("status",)
    raw_id_fields = ("tenant", "plan")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "tenant", "amount", "status", "billing_date")
    list_filter = ("status",)
    search_fields = ("invoice_number",)
    raw_id_fields = ("tenant", "subscription")
