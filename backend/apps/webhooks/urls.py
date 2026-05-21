from django.urls import path

from apps.webhooks.views.endpoint_views import WebhookEndpointDetailView, WebhookEndpointListView
from apps.webhooks.views.test_dispatch_view import WebhookTestDispatchView

urlpatterns = [
    path("endpoints/", WebhookEndpointListView.as_view(), name="webhook-endpoints"),
    path("endpoints/<int:pk>/", WebhookEndpointDetailView.as_view(), name="webhook-endpoint-detail"),
    path("test-dispatch/", WebhookTestDispatchView.as_view(), name="webhook-test-dispatch"),
]
