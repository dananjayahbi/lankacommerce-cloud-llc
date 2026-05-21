from django.urls import path

from apps.hr.views.commission_views import (
    CommissionPayoutView,
    CommissionSummaryView,
    StaffCommissionDetailView,
)
from apps.hr.views.pin_views import StaffPINView
from apps.hr.views.staff_views import StaffDetailView, StaffListCreateView
from apps.hr.views.timeclock_views import (
    ClockInView,
    ClockOutView,
    TimeClockDetailView,
    TimeClockHistoryView,
)

app_name = "hr"

urlpatterns = [
    path("staff/", StaffListCreateView.as_view(), name="staff-list-create"),
    path("staff/<uuid:id>/", StaffDetailView.as_view(), name="staff-detail"),
    path("staff/<uuid:id>/pin/", StaffPINView.as_view(), name="staff-pin"),
    path("staff/<uuid:id>/commissions/", StaffCommissionDetailView.as_view(), name="staff-commission-detail"),
    path("commissions/", CommissionSummaryView.as_view(), name="commission-summary"),
    path("commissions/payout/", CommissionPayoutView.as_view(), name="commission-payout"),
    path("timeclock/", TimeClockHistoryView.as_view(), name="timeclock-history"),
    path("timeclock/clock-in/", ClockInView.as_view(), name="timeclock-clock-in"),
    path("timeclock/clock-out/", ClockOutView.as_view(), name="timeclock-clock-out"),
    path("timeclock/<uuid:id>/", TimeClockDetailView.as_view(), name="timeclock-detail"),
]
