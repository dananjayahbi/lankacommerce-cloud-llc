from django.contrib import admin

from apps.pos.models import CashMovement, Expense

admin.site.register(Expense)
admin.site.register(CashMovement)
