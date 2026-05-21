from django.urls import path

from apps.promotions.views.evaluate_views import PromotionEvaluateView
from apps.promotions.views.promotion_views import PromotionDetailView, PromotionListCreateView

app_name = "promotions"

urlpatterns = [
    path("", PromotionListCreateView.as_view(), name="list-create"),
    path("evaluate/", PromotionEvaluateView.as_view(), name="evaluate"),
    path("<uuid:id>/", PromotionDetailView.as_view(), name="detail"),
]
