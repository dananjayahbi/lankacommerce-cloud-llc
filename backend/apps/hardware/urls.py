from django.urls import path
from apps.hardware.views.printer_views import TestPrintView
from apps.hardware.views.drawer_views import TestDrawerView
from apps.hardware.views.cfd_views import CfdStreamView, CfdUpdateView

urlpatterns = [
    path("test-print/", TestPrintView.as_view(), name="test-print"),
    path("test-drawer/", TestDrawerView.as_view(), name="test-drawer"),
    path("cfd/stream/", CfdStreamView.as_view(), name="cfd-stream"),
    path("cfd/update/", CfdUpdateView.as_view(), name="cfd-update"),
]
