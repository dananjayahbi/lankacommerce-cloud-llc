"""URL patterns for the audit app."""

from django.urls import path

from apps.audit.views.audit_log_views import AuditLogListView

urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-log-list"),
]
