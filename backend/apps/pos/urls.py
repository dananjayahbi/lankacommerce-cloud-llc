"""URL patterns for the POS app."""

from django.urls import path

from apps.pos import views

urlpatterns = [
    # sales/hold/ must be listed BEFORE sales/<uuid:id>/ so Django
    # does not attempt to match the literal "hold" as a UUID first.
    path("sales/hold/", views.SaleHoldView.as_view(), name="sale-hold"),
    path("sales/", views.SaleListCreateView.as_view(), name="sale-list-create"),
    path("sales/<uuid:id>/", views.SaleDetailView.as_view(), name="sale-detail"),
    path(
        "sales/<uuid:id>/void/", views.SaleVoidView.as_view(), name="sale-void"
    ),
    path(
        "sales/<uuid:id>/receipt/",
        views.SaleReceiptView.as_view(),
        name="sale-receipt",
    ),
    path(
        "sales/<uuid:id>/send-receipt/",
        views.SendReceiptView.as_view(),
        name="sale-send-receipt",
    ),

    # shifts/current/ must be listed BEFORE shifts/<uuid:id>/ so Django
    # does not attempt to match the literal "current" as a UUID first.
    path(
        "shifts/current/",
        views.ShiftCurrentView.as_view(),
        name="shift-current",
    ),
    path("shifts/", views.ShiftListCreateView.as_view(), name="shift-list-create"),
    path(
        "shifts/<uuid:id>/",
        views.ShiftDetailView.as_view(),
        name="shift-detail",
    ),
    path(
        "shifts/<uuid:id>/close/",
        views.ShiftCloseView.as_view(),
        name="shift-close",
    ),
]
