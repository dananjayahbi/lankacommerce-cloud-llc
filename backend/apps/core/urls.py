from django.urls import path

from apps.core.views import AuditLogListView, HealthView

app_name = "core"

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-log-list"),
]
