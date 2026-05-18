from django.urls import path

from apps.notifications.views import (
    MarkAllReadView,
    MarkNotificationReadView,
    NotificationListView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("read-all/", MarkAllReadView.as_view(), name="read-all"),
    path("<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="read"),
]
