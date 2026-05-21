from django.contrib import admin

from apps.hr.models import CommissionPayout, CommissionRecord, TimeClock

admin.site.register(CommissionRecord)
admin.site.register(CommissionPayout)
admin.site.register(TimeClock)
