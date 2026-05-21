from django.contrib import admin

from apps.promotions.models import CustomerPricingRule, Promotion

admin.site.register(Promotion)
admin.site.register(CustomerPricingRule)
