from django.urls import path

from apps.reports.views.saved_report_views import (
    SavedReportDetailView,
    SavedReportListCreateView,
)
from apps.reports.views.profit_loss_view import ProfitLossView
from apps.reports.views.sales_by_product_view import SalesByProductView
from apps.reports.views.sales_by_staff_view import SalesByStaffView
from apps.reports.views.revenue_trend_view import RevenueTrendView
from apps.reports.views.inventory_valuation_view import InventoryValuationView
from apps.reports.views.stock_movement_view import StockMovementView
from apps.reports.views.customer_analytics_view import CustomerAnalyticsView
from apps.reports.views.staff_performance_view import StaffPerformanceView
from apps.reports.views.return_rate_view import ReturnRateView
from apps.reports.views.daily_summary_cron_view import DailySummaryCronView
from apps.reports.views.store_dashboard_view import StoreDashboardView

urlpatterns = [
    path("saved/", SavedReportListCreateView.as_view(), name="saved-report-list-create"),
    path("saved/<uuid:id>/", SavedReportDetailView.as_view(), name="saved-report-detail"),
    path("profit-loss/", ProfitLossView.as_view(), name="profit-loss"),
    path("sales-by-product/", SalesByProductView.as_view(), name="sales-by-product"),
    path("sales-by-staff/", SalesByStaffView.as_view(), name="sales-by-staff"),
    path("revenue-trend/", RevenueTrendView.as_view(), name="revenue-trend"),
    path("inventory-valuation/", InventoryValuationView.as_view(), name="inventory-valuation"),
    path("stock-movements/", StockMovementView.as_view(), name="stock-movements"),
    path("customers/", CustomerAnalyticsView.as_view(), name="customer-analytics"),
    path("staff-performance/", StaffPerformanceView.as_view(), name="staff-performance"),
    path("returns/", ReturnRateView.as_view(), name="return-rate"),
    path("cron/daily-summary/", DailySummaryCronView.as_view(), name="daily-summary-cron"),
    path("store-dashboard/", StoreDashboardView.as_view(), name="store-dashboard"),
]
