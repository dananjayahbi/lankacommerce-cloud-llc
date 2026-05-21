from django.urls import path

from apps.health.views.health_check_view import HealthCheckView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
]
